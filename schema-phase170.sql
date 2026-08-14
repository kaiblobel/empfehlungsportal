-- ============================================================================
-- Phase 170 · Team-Sichtbarkeit entlang der Führungslinie
-- Status: LIVE ANGEWANDT AM 2026-08-10 (Migration phase170_team_sichtbarkeit)
--
-- Bisher sah jeder eingeloggte Berater in Teamübersicht (team_metrics,
-- team_activity_secure) und Hub-Stream (team_activity, team_presence) ALLE
-- aktiven Berater. Ab jetzt gilt: Jeder sieht nur sich selbst plus alle
-- Berater, die in der Führungslinie unter ihm hängen (rekursiv). Admins
-- (ist_admin) sehen weiterhin das gesamte Team.
--
-- Führungslinie (Stand 2026-08-10):
--   Kai Blobel (Admin, Wurzel)
--   ├── Josephine Bürger        → sieht nur sich
--   └── Sven Augustin           → sieht sich, Sandro, Max
--       └── Sandro Wernicke     → sieht sich und Max
--           └── Max Kudlek      → sieht nur sich
-- ============================================================================

-- 1) Führungskraft-Zuordnung am Berater. NULL = oberste Ebene.
alter table public.berater
  add column if not exists fuehrungskraft_id uuid references public.berater(id) on delete set null;

create index if not exists berater_fuehrungskraft_idx
  on public.berater (fuehrungskraft_id);

comment on column public.berater.fuehrungskraft_id is
  'Direkte Führungskraft (berater.id). Bestimmt die Team-Sichtbarkeit: jeder sieht sich plus alle rekursiv Unterstellten.';

-- 2) Interner Helfer: welche Berater-IDs darf p_berater sehen?
--    Eigener Knoten + alle rekursiv Unterstellten; Admins sehen alle.
--    "union" (statt "union all") macht die Rekursion zyklen-sicher.
--    Kein EXECUTE für Clients — wird nur innerhalb der SECURITY-DEFINER-
--    Teamfunktionen aufgerufen. Liefert für NULL/unbekannte IDs nichts.
create or replace function public.team_sichtbare_berater(p_berater uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive team(id) as (
    select b.id from public.berater b where b.id = p_berater
    union
    select b.id
    from public.berater b
    join team t on b.fuehrungskraft_id = t.id
  )
  select id from team
  union
  select b.id
  from public.berater b
  where exists (
    select 1 from public.berater me
    where me.id = p_berater and me.ist_admin
  );
$$;

revoke execute on function public.team_sichtbare_berater(uuid) from public, anon, authenticated;

comment on function public.team_sichtbare_berater(uuid) is
  'Interner Helfer: sichtbare Berater-IDs entlang der Führungslinie (eigener Ast nach unten, Admins alles). Nicht direkt für Clients ausführbar.';

-- 3) Teamübersicht · Kennzahlen — jetzt auf den sichtbaren Ast begrenzt.
create or replace function public.team_metrics(p_days integer default 30)
returns table(
  berater_id uuid,
  berater_name text,
  berater_rolle text,
  berater_foto text,
  last_seen timestamptz,
  aktive_promoter integer,
  link_klicks integer,
  empfehlungen integer,
  kunden integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_current_berater uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  v_current_berater := public.current_berater_id();
  if v_current_berater is null or not exists (
    select 1
    from public.berater b
    where b.id = v_current_berater
      and b.ist_aktiv
  ) then
    raise exception 'Kein aktives Beraterkonto verknüpft' using errcode = '42501';
  end if;

  if p_days not in (7, 30, 90) then
    raise exception 'Ungültiger Zeitraum' using errcode = '22023';
  end if;

  return query
  with sichtbar as (
    select s.id from public.team_sichtbare_berater(v_current_berater) as s(id)
  ),
  cohort as (
    select
      e.berater_id,
      count(distinct coalesce(
        e.empfehler_id::text,
        nullif(lower(btrim(e.empfehler_name)), '')
      ))::integer as aktive_promoter,
      coalesce(sum(e.link_klicks), 0)::integer as link_klicks,
      count(*)::integer as empfehlungen,
      count(*) filter (where e.status = 'kunde')::integer as kunden
    from public.empfehlungen e
    where e.created_at >= (now() - make_interval(days => p_days))::timestamp
      and e.berater_id in (select id from sichtbar)
    group by e.berater_id
  )
  select
    b.id,
    b.name,
    b.rolle,
    b.foto_url,
    b.last_seen,
    coalesce(c.aktive_promoter, 0),
    coalesce(c.link_klicks, 0),
    coalesce(c.empfehlungen, 0),
    coalesce(c.kunden, 0)
  from public.berater b
  left join cohort c on c.berater_id = b.id
  where b.ist_aktiv
    and b.id in (select id from sichtbar)
  order by lower(b.name);
end;
$$;

revoke execute on function public.team_metrics(integer) from public, anon;
grant execute on function public.team_metrics(integer) to authenticated;

comment on function public.team_metrics(integer) is
  'Datensparsame Teamkennzahlen, begrenzt auf die eigene Führungslinie (Admins: ganzes Team). Keine Personen- oder Kontaktdaten von Kunden und Promotern.';

-- 4) Teamübersicht · Aktivität — gleiche Begrenzung.
create or replace function public.team_activity_secure(p_days integer default 30)
returns table(
  berater_id uuid,
  berater_name text,
  berater_foto text,
  event text,
  event_at timestamp
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_current_berater uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  v_current_berater := public.current_berater_id();
  if v_current_berater is null or not exists (
    select 1
    from public.berater b
    where b.id = v_current_berater
      and b.ist_aktiv
  ) then
    raise exception 'Kein aktives Beraterkonto verknüpft' using errcode = '42501';
  end if;

  if p_days not in (7, 30, 90) then
    raise exception 'Ungültiger Zeitraum' using errcode = '22023';
  end if;

  return query
  with sichtbar as (
    select s.id from public.team_sichtbare_berater(v_current_berater) as s(id)
  )
  select events.berater_id, events.berater_name, events.berater_foto, events.event, events.event_at
  from (
    select b.id, b.name, b.foto_url, 'empfehlung'::text, e.created_at
    from public.empfehlungen e
    join public.berater b on b.id = e.berater_id and b.ist_aktiv
    where e.created_at >= (now() - make_interval(days => p_days))::timestamp
      and b.id in (select id from sichtbar)

    union all

    select b.id, b.name, b.foto_url, 'promoter'::text, em.created_at
    from public.empfehler em
    join public.berater b on b.id = em.berater_id and b.ist_aktiv
    where em.created_at >= (now() - make_interval(days => p_days))::timestamp
      and b.id in (select id from sichtbar)

    union all

    select b.id, b.name, b.foto_url, 'kunde'::text, p.earned_at::timestamp
    from public.praemien p
    join public.berater b on b.id = p.berater_id and b.ist_aktiv
    where p.earned_at >= (now() - make_interval(days => p_days))
      and b.id in (select id from sichtbar)
  ) events(berater_id, berater_name, berater_foto, event, event_at)
  order by events.event_at desc
  limit 100;
end;
$$;

revoke execute on function public.team_activity_secure(integer) from public, anon;
grant execute on function public.team_activity_secure(integer) to authenticated;

comment on function public.team_activity_secure(integer) is
  'Datensparsame Teamaktivität, begrenzt auf die eigene Führungslinie (Admins: ganzes Team). Keine Kunden-, Promoter- oder Kontaktdaten.';

-- 5) Hub · Team-Stream — gleiche Begrenzung. Ohne verknüpftes Beraterkonto
--    (current_berater_id() = NULL) ist das Ergebnis leer.
create or replace function public.team_activity(p_days int default 14)
returns table(berater_name text, berater_foto text, event text, event_at timestamp)
language sql security definer set search_path = public, pg_temp as $$
  with sichtbar as (
    select s.id from public.team_sichtbare_berater(public.current_berater_id()) as s(id)
  )
  select b.name, b.foto_url, 'empfehlung'::text, e.created_at
  from empfehlungen e join berater b on b.id = e.berater_id
  where e.created_at >= (now() - make_interval(days => p_days))::timestamp
    and b.id in (select id from sichtbar)
  union all
  select b.name, b.foto_url, 'promoter'::text, em.created_at
  from empfehler em join berater b on b.id = em.berater_id
  where em.created_at >= (now() - make_interval(days => p_days))::timestamp
    and b.id in (select id from sichtbar)
  union all
  select b.name, b.foto_url, 'kunde'::text, p.earned_at::timestamp
  from praemien p join berater b on b.id = p.berater_id
  where p.earned_at >= (now() - make_interval(days => p_days))
    and b.id in (select id from sichtbar)
  order by 4 desc
  limit 40;
$$;

-- 6) Hub · Team-Präsenz — gleiche Begrenzung.
create or replace function public.team_presence()
returns table(berater_name text, berater_foto text, last_seen timestamptz, heute_empfehlungen int, heute_promoter int)
language sql security definer set search_path = public, pg_temp as $$
  select b.name, b.foto_url, b.last_seen,
    (select count(*)::int from empfehlungen e where e.berater_id = b.id and e.created_at::date = current_date),
    (select count(*)::int from empfehler em where em.berater_id = b.id and em.created_at::date = current_date)
  from berater b
  where b.ist_aktiv
    and b.id in (select s.id from public.team_sichtbare_berater(public.current_berater_id()) as s(id))
  order by b.last_seen desc nulls last, b.name;
$$;

-- 7) Führungslinie eintragen (Stand 2026-08-10, feste IDs der Live-DB).
update public.berater set fuehrungskraft_id = null
  where id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'; -- Kai Blobel (Wurzel)
update public.berater set fuehrungskraft_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'
  where id = '9f0826bf-8f5c-4396-ac10-1d9b70a418ab'; -- Josephine Bürger → Kai
update public.berater set fuehrungskraft_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'
  where id = 'a3bb2fe3-0bab-4f19-a131-166359fa2e71'; -- Sven Augustin → Kai
update public.berater set fuehrungskraft_id = 'a3bb2fe3-0bab-4f19-a131-166359fa2e71'
  where id = 'bdf54ecc-c8d3-4746-a0c7-ada373eb778c'; -- Sandro Wernicke → Sven
update public.berater set fuehrungskraft_id = 'bdf54ecc-c8d3-4746-a0c7-ada373eb778c'
  where id = '7b176742-7b1a-4555-ba90-c5f6041fe4e1'; -- Max Kudlek → Sandro

-- ----------------------------------------------------------------------------
-- Rückbau ohne Datenverlust (stellt die alte "jeder sieht alle"-Sicht her):
--   Funktionen team_metrics / team_activity_secure aus schema-phase141.sql,
--   team_activity / team_presence aus schema-phase23.sql erneut anwenden,
--   dann: drop function if exists public.team_sichtbare_berater(uuid);
--   Die Spalte fuehrungskraft_id kann gefahrlos stehen bleiben.
-- ============================================================================
