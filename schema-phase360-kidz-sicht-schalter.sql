-- Phase 360: Kais Schalter fuer die Teamsicht beim KIDZ-Sommerfest
--
-- Kais Wunsch vom 11.09.2026: ein Schalter fuer ihn als Admin. Aus heisst,
-- jeder Berater sieht nur seine eigenen Teilnehmer. An heisst, jeder Berater
-- sieht alle und kann sie zuordnen, "weil jeder Berater mit seinen Promotern
-- die Teilnehmer durchgeht und ggf. dann zuordnet".
--
-- Ersetzt die befristete Leseregel aus Phase 359. Der Schalter startet auf
-- "an", damit sich fuer das Team heute nichts aendert, und bleibt so, bis Kai
-- ihn umlegt. Keine automatische Frist mehr (Kais Entscheidung).
--
-- Was der Schalter oeffnet: Sehen und Zuordnen. Was er nicht oeffnet: das
-- Schreiben an fremden Anmeldungen (Schaetzung, Begleitpersonen), das Haekchen
-- fuer KIDZ for Future und das Loeschen. Das bleibt beim zugeordneten Berater
-- beziehungsweise bei Administratoren.
--
-- Der Schalter ist ein echtes Schloss, keine Anzeige: Leseregel und
-- Zuordnungsfunktion fragen ihn selbst ab. Wer im Browser etwas umbaut, sieht
-- trotzdem nur, was die Datenbank herausgibt.
--
-- Je Fest eine Zeile. Fehlt die Zeile, gilt die enge Sicht. Kuenftige Feste
-- starten damit eng, ohne dass jemand daran denken muss.
--
-- Umgehaengt wird nachvollziehbar: zugeordnet_von und zugeordnet_am halten
-- fest, wer zuletzt zugeordnet hat. Die Seite zeigt sie nicht an, sie stehen
-- fuer Rueckfragen in der Datenbank. Lesbar sind sie fuer den, der die Zeile
-- sehen darf (Leserecht auf die ganze Tabelle), schreiben kann sie nur die
-- Zuordnungsfunktion.

begin;

-- 1. Der Schalter ----------------------------------------------------------------
create table if not exists public.kidz_team_sicht (
  event_key     text primary key,
  alle_sehen    boolean not null default false,
  geaendert_von uuid references public.berater(id) on delete set null,
  geaendert_am  timestamptz not null default now()
);

comment on table public.kidz_team_sicht is
  'Teamsicht je KIDZ-Fest (Phase 360). alle_sehen = true: jeder Berater sieht alle Anmeldungen des Fests und darf sie zuordnen. Nur Admins schalten. Keine Zeile = enge Sicht.';

insert into public.kidz_team_sicht (event_key, alle_sehen)
values ('kidz-sommerfest-2026', true)
on conflict (event_key) do nothing;

alter table public.kidz_team_sicht enable row level security;

revoke all on public.kidz_team_sicht from public, anon, authenticated;
grant select on public.kidz_team_sicht to authenticated;
grant update (alle_sehen) on public.kidz_team_sicht to authenticated;

drop policy if exists kidz_team_sicht_berater_select on public.kidz_team_sicht;
create policy kidz_team_sicht_berater_select
  on public.kidz_team_sicht for select
  to authenticated
  using ((select public.current_berater_id()) is not null);

-- Umlegen darf nur ein Admin. Anlegen und Loeschen gibt es im Browser nicht.
drop policy if exists kidz_team_sicht_admin_update on public.kidz_team_sicht;
create policy kidz_team_sicht_admin_update
  on public.kidz_team_sicht for update
  to authenticated
  using ((select public.is_current_berater_admin()))
  with check ((select public.is_current_berater_admin()));

-- Wer wann umgelegt hat, schreibt die Datenbank selbst.
create or replace function public.kidz_team_sicht_stempel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.geaendert_von := public.current_berater_id();
  new.geaendert_am := now();
  return new;
end;
$$;

drop trigger if exists kidz_team_sicht_stempel on public.kidz_team_sicht;
create trigger kidz_team_sicht_stempel
  before update on public.kidz_team_sicht
  for each row execute function public.kidz_team_sicht_stempel();

-- 2. Die Abfrage fuer Regel und Funktionen --------------------------------------
create or replace function public.kidz_team_sicht_offen(p_event_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.alle_sehen from public.kidz_team_sicht s where s.event_key = p_event_key),
    false
  );
$$;

revoke execute on function public.kidz_team_sicht_offen(text) from public, anon;
grant execute on function public.kidz_team_sicht_offen(text) to authenticated;

-- 3. Sehen -----------------------------------------------------------------------
drop policy if exists kidz_gewinnspiel_team_select_befristet
  on public.kidz_gewinnspiel_teilnahmen;
drop policy if exists kidz_gewinnspiel_team_select_schalter
  on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_team_select_schalter
  on public.kidz_gewinnspiel_teilnahmen for select
  to authenticated
  using (
    public.current_berater_id() is not null
    and public.kidz_team_sicht_offen(event_key)
  );

-- 4. Zuordnen, nachvollziehbar ---------------------------------------------------
alter table public.kidz_gewinnspiel_teilnahmen
  add column if not exists zugeordnet_von uuid references public.berater(id) on delete set null,
  add column if not exists zugeordnet_am timestamptz;

create or replace function public.set_kidz_gewinnspiel_berater(
  p_participation_id uuid,
  p_berater_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_admin boolean;
  v_event text;
  v_neuer_berater uuid;
  v_name text;
  v_slug text := lower(trim(coalesce(p_berater_slug, '')));
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ assignment requires an authenticated advisor';
  end if;

  v_actor := (select public.current_berater_id());
  v_is_admin := coalesce((select public.is_current_berater_admin()), false);
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select t.event_key into v_event
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_participation_id;

  -- Kernregel: Administratoren immer, alle anderen nur bei offener Teamsicht.
  -- Ohne Admin-Recht verraet die Antwort nicht, ob es die Anmeldung gibt.
  if not (v_is_admin or (v_event is not null and public.kidz_team_sicht_offen(v_event))) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_event is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Nur aktive Berater, keine Promoter.
  select b.id, b.name into v_neuer_berater, v_name
    from public.berater b
   where lower(b.slug) = v_slug and b.ist_aktiv
   limit 1;

  if v_neuer_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;

  -- Geschrieben werden allein Zuordnung und Stempel. Wer eingeladen hat,
  -- bleibt stehen.
  update public.kidz_gewinnspiel_teilnahmen
     set berater_id = v_neuer_berater,
         zugeordnet_von = v_actor,
         zugeordnet_am = now()
   where id = p_participation_id;

  return jsonb_build_object('ok', true, 'berater', v_name, 'berater_id', v_neuer_berater);
end;
$$;

revoke execute on function public.set_kidz_gewinnspiel_berater(uuid, text)
  from public, anon, service_role;
grant execute on function public.set_kidz_gewinnspiel_berater(uuid, text)
  to authenticated;

comment on function public.set_kidz_gewinnspiel_berater(uuid, text) is
  'Ordnet eine Gewinnspiel-Teilnahme einem anderen Berater zu. Administratoren immer, andere Berater nur bei offener Teamsicht (kidz_team_sicht). Schreibt berater_id und den Stempel, empfehler_id bleibt unangetastet.';

-- 5. Namen fuer fremde Anmeldungen -----------------------------------------------
-- Ein Berater ohne Admin-Recht darf die Tabelle berater nicht lesen. Bei
-- fremden Anmeldungen stuende deshalb kein Name. Herausgegeben werden nur
-- Name und Kuerzel derer, die bei einem offenen Fest Anmeldungen haben.
create or replace function public.kidz_team_berater()
returns table (id uuid, name text, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.name, b.slug
    from public.berater b
   where (select public.current_berater_id()) is not null
     and exists (
       select 1
         from public.kidz_gewinnspiel_teilnahmen t
        where t.berater_id = b.id
          and public.kidz_team_sicht_offen(t.event_key)
     );
$$;

revoke execute on function public.kidz_team_berater() from public, anon;
grant execute on function public.kidz_team_berater() to authenticated;

commit;
