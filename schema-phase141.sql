-- ============================================================================
-- Phase 141 · Sichere Teamkennzahlen
-- Status: LIVE ANGEWANDT AM 2026-08-05
--
-- Liefert ausschließlich aggregierte Kennzahlen je aktivem Berater. Keine
-- Kunden-, Promoter- oder Kontaktdaten verlassen die Funktion. Der Zeitraum
-- beschreibt eine Kohorte: Empfehlungen, die in den letzten 7, 30 oder 90
-- Tagen entstanden sind, und deren heutiger Stand.
--
-- SECURITY DEFINER ist erforderlich, weil normale Berater per RLS nur ihre
-- eigenen Datensätze sehen. Der Zugriff wird deshalb innerhalb der Funktion
-- ausdrücklich auf eingeloggte, aktive und verknüpfte Beraterkonten begrenzt.
-- ============================================================================

create index if not exists empfehlungen_berater_created_idx
  on public.empfehlungen (berater_id, created_at desc);

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
  with cohort as (
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
  order by lower(b.name);
end;
$$;

revoke execute on function public.team_metrics(integer) from public, anon;
grant execute on function public.team_metrics(integer) to authenticated;

comment on function public.team_metrics(integer) is
  'Datensparsame Teamkennzahlen für verknüpfte aktive Berater. Keine Personen- oder Kontaktdaten von Kunden und Promotern.';

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
  select events.berater_id, events.berater_name, events.berater_foto, events.event, events.event_at
  from (
    select b.id, b.name, b.foto_url, 'empfehlung'::text, e.created_at
    from public.empfehlungen e
    join public.berater b on b.id = e.berater_id and b.ist_aktiv
    where e.created_at >= (now() - make_interval(days => p_days))::timestamp

    union all

    select b.id, b.name, b.foto_url, 'promoter'::text, em.created_at
    from public.empfehler em
    join public.berater b on b.id = em.berater_id and b.ist_aktiv
    where em.created_at >= (now() - make_interval(days => p_days))::timestamp

    union all

    select b.id, b.name, b.foto_url, 'kunde'::text, p.earned_at::timestamp
    from public.praemien p
    join public.berater b on b.id = p.berater_id and b.ist_aktiv
    where p.earned_at >= (now() - make_interval(days => p_days))
  ) events(berater_id, berater_name, berater_foto, event, event_at)
  order by events.event_at desc
  limit 100;
end;
$$;

revoke execute on function public.team_activity_secure(integer) from public, anon;
grant execute on function public.team_activity_secure(integer) to authenticated;

comment on function public.team_activity_secure(integer) is
  'Datensparsame Teamaktivität mit Berater-ID für verknüpfte aktive Berater. Keine Kunden-, Promoter- oder Kontaktdaten.';

-- Rückbau ohne Datenverlust:
-- drop function if exists public.team_activity_secure(integer);
-- drop function if exists public.team_metrics(integer);
-- drop index if exists public.empfehlungen_berater_created_idx;
