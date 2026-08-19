-- Phase 295 · Die Teamübersicht zeigt das ganze Büro
--
-- AUSGEFÜHRT am 19.08.2026 auf kkseqhmfubzfyloffkwe.
-- Danach geprüft: team_empfehlungen, team_kidz, team_promoter und
-- team_praemien filtern weiterhin eng über mein_team(); ein Aufruf ohne
-- Anmeldung liefert bei allen drei umgestellten Funktionen nichts.
--
-- Die Teamübersicht ist zum Anspornen gebaut. Sie filterte aber über dieselbe
-- enge Regel wie die Präsenz: jeder sah nur sich und die Leute unter sich.
-- Josephine, Max und David sahen genau eine Zeile, die eigene. Eine
-- Teamübersicht mit einem einzigen Namen spornt niemanden an.
--
-- Umgestellt werden GENAU DREI Funktionen, alle drei zeigen Zahlen und
-- Aktivitäten, keine Personendaten:
--
--   team_activity_secure  wer hat wann eine Empfehlung, einen Promoter oder
--                         einen Kunden gewonnen (nur Berater­name und Zeitpunkt)
--   team_metrics          aktive Promoter, Klicks, Empfehlungen, Kunden je Berater
--   team_bestand          Zählungen je Berater (auch Prämien nur als ANZAHL,
--                         keine Beträge)
--
-- UNANGETASTET bleiben die Funktionen mit echten Personendaten. Sie hängen an
-- mein_team(), und mein_team() wird hier bewusst NICHT geändert:
--
--   team_empfehlungen   enthält Kundennamen
--   team_kidz           enthält Name, E-Mail, Telefon von Teilnehmern
--   team_promoter       enthält Name, E-Mail, Telefon von Promotern
--   team_praemien       enthält Promoternamen
--   kpi_trend_daily_team
--
-- Wer wie viele Empfehlungen geschrieben hat, ist eine Leistungszahl und darf
-- das Team anspornen. Wie die Kunden dahinter heißen, geht nur den zuständigen
-- Berater etwas an. Eine Umstellung von mein_team() hätte beides auf einmal
-- geöffnet, deshalb der Umweg über die einzelnen Funktionen.
--
-- Grundlage ist team_wurzel() aus Phase 294: alle mit derselben Spitze.

begin;

-- ---------------------------------------------------------------------------
-- 1) Aktivitäten
-- Unverändert bis auf die CTE "sichtbar". Die Prüfungen auf Anmeldung,
-- aktives Beraterkonto und erlaubten Zeitraum bleiben, wie sie waren.
-- ---------------------------------------------------------------------------
create or replace function public.team_activity_secure(p_days integer default 30)
returns table(berater_id uuid, berater_name text, berater_foto text, event text, event_at timestamp without time zone)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_current_berater uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  v_current_berater := public.current_berater_id();
  if v_current_berater is null or not exists (
    select 1 from public.berater b
    where b.id = v_current_berater and b.ist_aktiv
  ) then
    raise exception 'Kein aktives Beraterkonto verknüpft' using errcode = '42501';
  end if;

  if p_days not in (7, 30, 90) then
    raise exception 'Ungültiger Zeitraum' using errcode = '22023';
  end if;

  return query
  with sichtbar as (
    select b.id
      from public.berater b
     where b.ist_aktiv
       and public.team_wurzel(b.id) is not distinct from public.team_wurzel(v_current_berater)
  )
  select events.berater_id, events.berater_name, events.berater_foto, events.event, events.event_at
  from (
    select b.id, b.name, b.foto_url, 'empfehlung'::text, e.created_at
    from public.empfehlungen e
    join public.berater b on b.id = e.berater_id and b.ist_aktiv and not b.ist_test
    where e.created_at >= (now() - make_interval(days => p_days))::timestamp
      and not e.ist_test
      and b.id in (select id from sichtbar)

    union all

    select b.id, b.name, b.foto_url, 'promoter'::text, em.created_at
    from public.empfehler em
    join public.berater b on b.id = em.berater_id and b.ist_aktiv and not b.ist_test
    where em.created_at >= (now() - make_interval(days => p_days))::timestamp
      and not em.ist_test
      and b.id in (select id from sichtbar)

    union all

    select b.id, b.name, b.foto_url, 'kunde'::text, p.earned_at::timestamp
    from public.praemien p
    join public.berater b on b.id = p.berater_id and b.ist_aktiv and not b.ist_test
    where p.earned_at >= (now() - make_interval(days => p_days))
      and not p.ist_test
      and b.id in (select id from sichtbar)
  ) events(berater_id, berater_name, berater_foto, event, event_at)
  order by events.event_at desc
  limit 100;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2) Kennzahlen je Berater
-- ---------------------------------------------------------------------------
create or replace function public.team_metrics(p_days integer default 30)
returns table(berater_id uuid, berater_name text, berater_rolle text, berater_foto text, last_seen timestamp with time zone, aktive_promoter integer, link_klicks integer, empfehlungen integer, kunden integer)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_current_berater uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  v_current_berater := public.current_berater_id();
  if v_current_berater is null or not exists (
    select 1 from public.berater b
    where b.id = v_current_berater and b.ist_aktiv
  ) then
    raise exception 'Kein aktives Beraterkonto verknüpft' using errcode = '42501';
  end if;

  if p_days not in (7, 30, 90) then
    raise exception 'Ungültiger Zeitraum' using errcode = '22023';
  end if;

  return query
  with sichtbar as (
    select b.id
      from public.berater b
     where b.ist_aktiv
       and public.team_wurzel(b.id) is not distinct from public.team_wurzel(v_current_berater)
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
      and not e.ist_test
      and e.berater_id in (select id from sichtbar)
    group by e.berater_id
  )
  select
    b.id, b.name, b.rolle, b.foto_url, b.last_seen,
    coalesce(c.aktive_promoter, 0),
    coalesce(c.link_klicks, 0),
    coalesce(c.empfehlungen, 0),
    coalesce(c.kunden, 0)
  from public.berater b
  left join cohort c on c.berater_id = b.id
  where b.ist_aktiv
    and not b.ist_test
    and b.id in (select id from sichtbar)
  order by lower(b.name);
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3) Bestandszahlen je Berater
-- Hier stand "select public.mein_team()". mein_team() bleibt bestehen und eng,
-- weil die Funktionen mit Personendaten daran hängen; team_bestand bekommt die
-- weite Regel direkt.
-- ---------------------------------------------------------------------------
create or replace function public.team_bestand(p_days integer default 30)
returns table(berater_id uuid, promoter_gesamt integer, promoter_aktiv integer, promoter_selbst_angemeldet integer, empfehlungen_gesamt integer, empfehlungen_offen integer, empfehlungen_kontaktiert integer, empfehlungen_termin integer, empfehlungen_kunde integer, empfehlungen_kein_interesse integer, anrufwuensche integer, praemien_offen integer, praemien_ausgezahlt integer, kidz_anmeldungen integer)
language sql
stable
security definer
set search_path to ''
as $function$
  with sichtbar as (
    select b.id
      from public.berater b
     where b.ist_aktiv
       and public.current_berater_id() is not null
       and public.team_wurzel(b.id) is not distinct from public.team_wurzel(public.current_berater_id())
  ),
  tage as (select greatest(1, least(coalesce(p_days, 30), 365)) as n)
  select
    b.id,
    (select count(*)::int from public.empfehler e where e.berater_id = b.id and not e.ist_test),
    (select count(*)::int from public.empfehler e
      where e.berater_id = b.id and not e.ist_test
        and exists (select 1 from public.empfehlungen f where f.empfehler_id = e.id and not f.ist_test)),
    (select count(*)::int from public.empfehler e
      where e.berater_id = b.id and not e.ist_test and e.self_registered_at is not null),
    (select count(*)::int from public.empfehlungen f
      where f.berater_id = b.id and not f.ist_test
        and f.created_at >= (now() - make_interval(days => (select n from tage)))::timestamp),
    (select count(*)::int from public.empfehlungen f
      where f.berater_id = b.id and not f.ist_test and coalesce(f.status,'offen') = 'offen'
        and f.created_at >= (now() - make_interval(days => (select n from tage)))::timestamp),
    (select count(*)::int from public.empfehlungen f
      where f.berater_id = b.id and not f.ist_test and f.status = 'kontaktiert'
        and f.created_at >= (now() - make_interval(days => (select n from tage)))::timestamp),
    (select count(*)::int from public.empfehlungen f
      where f.berater_id = b.id and not f.ist_test and f.status = 'termin'
        and f.created_at >= (now() - make_interval(days => (select n from tage)))::timestamp),
    (select count(*)::int from public.empfehlungen f
      where f.berater_id = b.id and not f.ist_test and f.status = 'kunde'
        and f.created_at >= (now() - make_interval(days => (select n from tage)))::timestamp),
    (select count(*)::int from public.empfehlungen f
      where f.berater_id = b.id and not f.ist_test and f.status = 'kein_interesse'
        and f.created_at >= (now() - make_interval(days => (select n from tage)))::timestamp),
    (select count(*)::int from public.empfehlungen f
      where f.berater_id = b.id and not f.ist_test and f.anrufwunsch is not null
        and f.created_at >= (now() - make_interval(days => (select n from tage)))::timestamp),
    (select count(*)::int from public.praemien p
      where p.berater_id = b.id and not p.ist_test and coalesce(p.status,'offen') <> 'ausgezahlt'),
    (select count(*)::int from public.praemien p
      where p.berater_id = b.id and not p.ist_test and p.status = 'ausgezahlt'),
    (select count(*)::int from public.kidz_gewinnspiel_teilnahmen k
      where k.berater_id = b.id and not k.ist_test)
  from public.berater b
  where b.ist_aktiv
    and not b.ist_test
    and b.id in (select id from sichtbar)
  order by lower(b.name);
$function$;

grant execute on function public.team_activity_secure(integer) to authenticated;
grant execute on function public.team_metrics(integer)         to authenticated;
grant execute on function public.team_bestand(integer)         to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- DANACH PRÜFEN: Die vier Funktionen mit Personendaten müssen weiterhin eng
-- filtern. Erwartet wird bei allen vieren "true".
--
--   select p.proname, pg_get_functiondef(p.oid) like '%mein_team()%' as noch_eng
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('team_empfehlungen','team_kidz','team_promoter','team_praemien');
-- ---------------------------------------------------------------------------
