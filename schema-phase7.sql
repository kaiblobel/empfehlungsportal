-- ============================================================
-- Empfehlungsportal · Phase 7 · Empfehler-System + Belohnungen
-- ============================================================

-- 1. Empfehler (Promoter)
create table if not exists empfehler (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  email text,
  telefon text,
  created_at timestamp default now()
);

-- 2. Belohnungs-Stufen
create table if not exists belohnungs_stufen (
  stufe int primary key,
  titel text not null,
  beschreibung text not null,
  icon text,
  wert_label text,
  highlight boolean default false,
  sort_order int default 0
);

-- 3. FK in empfehlungen
alter table empfehlungen add column if not exists empfehler_id uuid references empfehler(id);

-- 4. RLS
alter table empfehler enable row level security;
alter table belohnungs_stufen enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'stufen public read' and tablename = 'belohnungs_stufen') then
    create policy "stufen public read" on belohnungs_stufen for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'empfehler auth select all' and tablename = 'empfehler') then
    create policy "empfehler auth select all" on empfehler for select using (auth.role() = 'authenticated');
  end if;
end $$;

-- 5. RPCs

-- Erstelle Empfehler (gibt Code zurück)
create or replace function create_empfehler(p_name text, p_email text, p_telefon text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_slug text;
  v_suffix text;
  v_code text;
  v_count int;
begin
  -- WICHTIG: erst lowercase, DANN regex (sonst hackt regex Großbuchstaben weg)
  v_slug := lower(unaccent_string(p_name));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'empfehler'; end if;

  -- 4-stelliger Suffix
  v_suffix := substr(md5(gen_random_uuid()::text), 1, 4);
  v_code := v_slug || '-' || v_suffix;

  insert into empfehler (code, name, email, telefon)
  values (v_code, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_telefon), ''));

  return v_code;
end;
$$;

-- Hilfsfunktion (Umlaut-Entfernung) — Fallback wenn unaccent nicht da
create or replace function unaccent_string(p text) returns text language sql immutable as $$
  select translate(
    p,
    'ÄÖÜäöüß',
    'AOUaous'
  );
$$;

grant execute on function create_empfehler(text, text, text) to anon;

-- Empfehler nach Code lesen
create or replace function get_empfehler_by_code(p_code text)
returns table (id uuid, code text, name text, created_at timestamp)
language sql security definer set search_path = public, pg_temp
as $$
  select id, code, name, created_at
  from empfehler
  where code = p_code
  limit 1;
$$;

grant execute on function get_empfehler_by_code(text) to anon;

-- Stats (Empfehlungen + Zählung pro Status + aktuelle Stufe)
create or replace function get_empfehler_stats(p_code text)
returns table (
  empfehler_id uuid,
  name text,
  code text,
  gesamt int,
  offen int,
  anrufwunsch int,
  kontaktiert int,
  kunde int,
  kein_interesse int,
  aktuelle_stufe int
)
language sql security definer set search_path = public, pg_temp
as $$
  with e as (select id, name, code from empfehler where code = p_code),
  s as (
    select
      e.id as eid,
      count(*) filter (where empfehlungen.id is not null)::int as gesamt,
      count(*) filter (where coalesce(empfehlungen.status,'offen') = 'offen')::int as offen,
      count(*) filter (where empfehlungen.status = 'anrufwunsch')::int as anrufwunsch,
      count(*) filter (where empfehlungen.status = 'kontaktiert')::int as kontaktiert,
      count(*) filter (where empfehlungen.status = 'kunde')::int as kunde,
      count(*) filter (where empfehlungen.status = 'kein_interesse')::int as kein_interesse
    from e
    left join empfehlungen on empfehlungen.empfehler_id = e.id
    group by e.id
  )
  select e.id, e.name, e.code, s.gesamt, s.offen, s.anrufwunsch, s.kontaktiert, s.kunde, s.kein_interesse, s.kunde as aktuelle_stufe
  from e join s on s.eid = e.id;
$$;

grant execute on function get_empfehler_stats(text) to anon;

-- Empfehlungen eines Empfehlers
create or replace function get_empfehler_empfehlungen(p_code text)
returns table (
  id uuid,
  empfaenger_name text,
  status text,
  anrufwunsch text,
  vorlage_slug text,
  created_at timestamp
)
language sql security definer set search_path = public, pg_temp
as $$
  select e.id, e.empfaenger_name, coalesce(e.status, 'offen') as status,
         e.anrufwunsch, e.vorlage_slug, e.created_at
  from empfehlungen e
  join empfehler em on em.id = e.empfehler_id
  where em.code = p_code
  order by e.created_at desc;
$$;

grant execute on function get_empfehler_empfehlungen(text) to anon;

-- 6. Seeds Belohnungs-Stufen (KIWUS 1:1)
insert into belohnungs_stufen (stufe, titel, beschreibung, icon, wert_label, highlight, sort_order)
values
(1, 'Standardvergütung + Kundenlos',
 '100 € als Wunschgutschein, PayPal-Auszahlung oder Spende deiner Wahl. Mit jeder Empfehlung wächst deine Gewinnchance.',
 '🎟️', 'bis 20.000 €', false, 1),
(2, 'Restaurantbesuch deiner Wahl',
 'Du und eine Begleitperson genießen einen Restaurantbesuch nach Wahl.',
 '🍽️', '150 €', false, 2),
(3, 'Standardvergütung + weiteres Los',
 'Wieder 100 € als Wunschgutschein, PayPal oder Spende, plus weitere Lostickets.',
 '🎟️', '100 €', false, 3),
(5, 'Weber-Grill oder Apple Watch',
 'Wähle zwischen einem Weber Gasgrill oder einer Apple Watch Series 10.',
 '🍖', '449–545 €', false, 4),
(7, 'Goldbarren Geiger Original – 5 g',
 '5 Gramm Feingold im hochwertigen Barren mit Pearl-Finish-Oberfläche und geprägtem Relief.',
 '🥇', 'ca. 380 €', false, 5),
(10, 'iPad Air',
 'Das iPad Air – eines der vielseitigsten Tablets auf dem Markt.',
 '📱', '699 €', false, 6),
(15, 'Mallorca-Urlaub',
 'Auf meine Kosten – mit einer Begleitperson nach Mallorca, Sonne inklusive.',
 '✈️', '2.000 €', true, 7)
on conflict (stufe) do nothing;
