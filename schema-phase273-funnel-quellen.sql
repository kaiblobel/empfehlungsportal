-- Phase 273 · Ein neuer Funnel ist eine Zeile, kein Veroeffentlichen
--
-- Vorher stand ein Funnelname an fuenf Stellen: in create_lead_public, in
-- der Empfehlungsliste, in der Detailansicht, auf dem Ueberblick und im
-- Stylesheet. Wer einen neuen Funnel anschloss, musste alle finden.
--
-- Jetzt steht das an einer Stelle. Ein neuer Funnel:
--   insert into funnel_quellen (quelle, anzeige, ton, sortierung)
--   values ('mein-neuer-check', 'Mein neuer Check', '#2E6E7A', 80);
-- Danach traegt lead.php auf dem Webspace denselben Namen in
-- $PORTAL_QUELLE, und der Lead laeuft. Kein Deploy noetig.
--
-- aktiv=false weist neue Leads ab, ohne die alten zu verlieren: so laesst
-- sich ein Funnel stilllegen, ohne seine Geschichte zu loeschen.

create table if not exists funnel_quellen (
  quelle      text primary key,
  anzeige     text not null,
  ton         text not null default '#5E939E',
  aktiv       boolean not null default true,
  sortierung  integer not null default 100,
  angelegt_am timestamptz not null default now()
);

comment on table funnel_quellen is
  'Die Funnel-Seiten, die Leads ins Portal geben. quelle = technischer Name (steht in lead.php), anzeige = was der Berater liest, ton = Farbe der Marke in der Liste. aktiv=false weist neue Leads ab, ohne die alten zu verlieren.';

insert into funnel_quellen (quelle, anzeige, ton, sortierung) values
  ('av-depot-check',            'Altersvorsorgedepot',  '#0B4650', 10),
  ('depot-check',               'Depot-Krisencheck',    '#5E939E', 20),
  ('restschuldcheck',           'Restschuld-Check',     '#2E6E7A', 30),
  ('vermoegensstrategie-check', 'Vermögensstrategie',   '#8F7809', 40),
  ('finanzcheck',               'Finanzcheck',          '#13191D', 50),
  ('reform2027',                'reform2027',           '#9CC0C7', 60),
  ('karriere',                  'Karriere',             '#8F7809', 70)
on conflict (quelle) do nothing;

alter table funnel_quellen enable row level security;

drop policy if exists "funnel_quellen lesen alle" on funnel_quellen;
create policy "funnel_quellen lesen alle" on funnel_quellen
  for select using (true);

drop policy if exists "funnel_quellen schreiben nur admin" on funnel_quellen;
create policy "funnel_quellen schreiben nur admin" on funnel_quellen
  for all using (is_current_berater_admin()) with check (is_current_berater_admin());

-- Die Aufnahme prueft gegen die Tabelle statt gegen eine Liste im Code.
create or replace function create_lead_public(
  p_name text,
  p_email text default null,
  p_telefon text default null,
  p_quelle text default 'unbekannt',
  p_nachricht text default null,
  p_berater_slug text default null,
  p_vorlage_slug text default 'allgemein',
  p_ist_test boolean default false
) returns table (id uuid, link_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_berater uuid;
  v_name text := nullif(btrim(p_name), '');
  v_email text := nullif(btrim(lower(p_email)), '');
  v_telefon text := nullif(btrim(p_telefon), '');
  v_quelle text := nullif(btrim(lower(p_quelle)), '');
  v_bekannt boolean;
begin
  if v_name is null then
    raise exception 'Ein Lead ohne Namen wird nicht angelegt';
  end if;
  if v_email is null and v_telefon is null then
    raise exception 'Ein Lead braucht mindestens eine E-Mail oder eine Telefonnummer';
  end if;

  select exists(select 1 from funnel_quellen f where f.quelle = v_quelle and f.aktiv)
    into v_bekannt;
  if not v_bekannt then
    raise exception 'Unbekannte oder abgeschaltete Quelle: %', coalesce(v_quelle, '(leer)');
  end if;

  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:].]+\.[^@[:space:]]+$' then
    raise exception 'Die E-Mail-Adresse ist unbrauchbar';
  end if;

  select b.id into v_berater from berater b
   where p_berater_slug is not null and lower(b.slug) = lower(p_berater_slug)
   limit 1;

  return query
  insert into empfehlungen (
    berater_id, empfaenger_name, empfaenger_email, empfaenger_telefon,
    nachricht, typ, quelle, vorlage_slug, status, ist_test
  ) values (
    v_berater, v_name, v_email, v_telefon,
    nullif(btrim(p_nachricht), ''), 'funnel', v_quelle, p_vorlage_slug, 'offen', p_ist_test
  )
  returning empfehlungen.id, empfehlungen.link_token;
end;
$$;

revoke execute on function create_lead_public(text,text,text,text,text,text,text,boolean) from public;
grant execute on function create_lead_public(text,text,text,text,text,text,text,boolean) to anon, authenticated;
