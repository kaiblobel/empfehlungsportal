-- Phase 208 (Teil B) · Testdaten zählen nicht mit, sind aber sichtbar
--
-- Der Grundsatz:
--
--   Zahlen  -> Testdaten sind draußen. Eine Kennzahl, in der Testdaten
--              stecken, ist keine Kennzahl.
--   Listen  -> Testdaten sind drin, aber gekennzeichnet. Ein Datensatz,
--              den man angelegt hat und dann nicht wiederfindet, ist
--              schlimmer als einer, der markiert dasteht.
--
-- Eine Ausnahme, die den wichtigsten Testfall überhaupt betrifft: Wenn man
-- die Strecke mit einem ECHTEN Promoter durchspielt und die entstandene
-- Empfehlung als Test markiert, dann soll der Promoter auf seiner eigenen
-- Seite trotzdem sehen, was er gerade ausgelöst hat. Deshalb gilt für die
-- Promotersicht: eine Testempfehlung zählt beim Testpromoter mit und beim
-- echten Promoter nicht.

/* ------------------------------------------------------------------ *
 * 1) Kennzahlen des Beraters: Testdaten raus
 * ------------------------------------------------------------------ */

create or replace function public.snapshot_kpis_today()
returns setof public.kpi_snapshots
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.kpi_snapshots (
    day, berater_id, aktive_empfehler, link_klicks,
    empfehlungen_gesamt, kunden, geoeffnet, interessiert, anrufwunsch
  )
  SELECT
    CURRENT_DATE,
    b.id,
    (SELECT COUNT(*) FROM public.empfehler e WHERE e.berater_id = b.id AND NOT e.ist_test),
    (SELECT COALESCE(SUM(f.link_klicks),0) FROM public.empfehlungen f WHERE f.berater_id = b.id AND NOT f.ist_test),
    (SELECT COUNT(*) FROM public.empfehlungen f WHERE f.berater_id = b.id AND NOT f.ist_test),
    (SELECT COUNT(*) FROM public.empfehlungen f WHERE f.berater_id = b.id AND NOT f.ist_test AND f.status='kunde'),
    (SELECT COUNT(*) FROM public.empfehlungen f WHERE f.berater_id = b.id AND NOT f.ist_test AND f.link_geoeffnet = true),
    (SELECT COUNT(*) FROM public.empfehlungen f WHERE f.berater_id = b.id AND NOT f.ist_test AND f.interessiert = true),
    (SELECT COUNT(*) FROM public.empfehlungen f WHERE f.berater_id = b.id AND NOT f.ist_test AND f.status='anrufwunsch')
  FROM public.berater b
  WHERE b.ist_aktiv AND NOT b.ist_test
  ON CONFLICT (day, berater_id) DO UPDATE
    SET aktive_empfehler    = EXCLUDED.aktive_empfehler,
        link_klicks         = EXCLUDED.link_klicks,
        empfehlungen_gesamt = EXCLUDED.empfehlungen_gesamt,
        kunden              = EXCLUDED.kunden,
        geoeffnet           = EXCLUDED.geoeffnet,
        interessiert        = EXCLUDED.interessiert,
        anrufwunsch         = EXCLUDED.anrufwunsch
  RETURNING *;
END;
$function$;

create or replace function public.team_bestand(p_days integer default 30)
returns table(berater_id uuid, promoter_gesamt integer, promoter_aktiv integer,
              promoter_selbst_angemeldet integer, empfehlungen_gesamt integer,
              empfehlungen_offen integer, empfehlungen_kontaktiert integer,
              empfehlungen_termin integer, empfehlungen_kunde integer,
              empfehlungen_kein_interesse integer, anrufwuensche integer,
              praemien_offen integer, praemien_ausgezahlt integer,
              kidz_anmeldungen integer)
language sql
stable security definer
set search_path to ''
as $function$
  with sichtbar as (select public.mein_team() as id),
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

create or replace function public.team_metrics(p_days integer default 30)
returns table(berater_id uuid, berater_name text, berater_rolle text, berater_foto text,
              last_seen timestamp with time zone, aktive_promoter integer,
              link_klicks integer, empfehlungen integer, kunden integer)
language plpgsql
stable security definer
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

create or replace function public.team_activity_secure(p_days integer default 30)
returns table(berater_id uuid, berater_name text, berater_foto text,
              event text, event_at timestamp without time zone)
language plpgsql
stable security definer
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
    select s.id from public.team_sichtbare_berater(v_current_berater) as s(id)
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

/* ------------------------------------------------------------------ *
 * 2) Sicht des Promoters auf sich selbst
 *
 * Hier gilt die Ausnahme: beim Testpromoter zählt alles, beim echten
 * Promoter zählen nur echte Empfehlungen.
 * ------------------------------------------------------------------ */

create or replace function public.empfehler_score(p_empfehler_id uuid)
returns table(gesamt integer, kunden integer, interessiert integer, conversion_pct integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_promoter_ist_test BOOLEAN;
BEGIN
  SELECT e.ist_test INTO v_promoter_ist_test
    FROM public.empfehler e WHERE e.id = p_empfehler_id;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::INTEGER AS g,
      COUNT(*) FILTER (WHERE status = 'kunde')::INTEGER AS k,
      COUNT(*) FILTER (WHERE empfehlungen.interessiert = true)::INTEGER AS i
    FROM public.empfehlungen
    WHERE empfehler_id = p_empfehler_id
      AND (NOT empfehlungen.ist_test OR COALESCE(v_promoter_ist_test, false))
  )
  SELECT
    s.g, s.k, s.i,
    CASE WHEN s.g > 0 THEN (100 * s.k / s.g)::INTEGER ELSE 0 END
  FROM stats s;
END;
$function$;

create or replace function public.get_empfehler_stats(p_code text)
returns table(empfehler_id uuid, name text, code text, gesamt integer, offen integer,
              anrufwunsch integer, kontaktiert integer, kunde integer,
              kein_interesse integer, aktuelle_stufe integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
#variable_conflict use_column
begin
  perform private.rate_limit_check('promoter_read', 60, interval '10 minutes');
  return query
  with e as (select id, name, code, ist_test from empfehler where code = p_code),
  s as (
    select e.id as eid,
      count(*) filter (where empfehlungen.id is not null)::int as gesamt,
      count(*) filter (where coalesce(empfehlungen.status,'offen') = 'offen')::int as offen,
      count(*) filter (where empfehlungen.status = 'anrufwunsch')::int as anrufwunsch,
      count(*) filter (where empfehlungen.status = 'kontaktiert')::int as kontaktiert,
      count(*) filter (where empfehlungen.status = 'kunde')::int as kunde,
      count(*) filter (where empfehlungen.status = 'kein_interesse')::int as kein_interesse
    from e left join empfehlungen
      on empfehlungen.empfehler_id = e.id
     and (not empfehlungen.ist_test or e.ist_test)
    group by e.id
  )
  select e.id, e.name, e.code, s.gesamt, s.offen, s.anrufwunsch, s.kontaktiert,
         s.kunde, s.kein_interesse, s.kunde as aktuelle_stufe
  from e join s on s.eid = e.id;
end;
$function$;

/* ------------------------------------------------------------------ *
 * 3) Listen der Führungssicht: Kennzeichen mitliefern statt filtern
 * ------------------------------------------------------------------ */

drop function if exists public.team_promoter(integer);
create function public.team_promoter(p_limit integer default 200)
returns table(id uuid, name text, code text, email text, telefon text,
              berater_id uuid, berater_name text, angelegt_am timestamp with time zone,
              selbst_angemeldet boolean, empfehlungen integer, kunden integer,
              ist_test boolean)
language sql
stable security definer
set search_path to ''
as $function$
  select e.id, e.name, e.code, e.email, e.telefon,
         e.berater_id, b.name,
         coalesce(e.self_registered_at, e.created_at at time zone 'UTC'),
         e.self_registered_at is not null,
         (select count(*)::int from public.empfehlungen f
           where f.empfehler_id = e.id and (not f.ist_test or e.ist_test)),
         (select count(*)::int from public.empfehlungen f
           where f.empfehler_id = e.id and f.status = 'kunde' and (not f.ist_test or e.ist_test)),
         e.ist_test
    from public.empfehler e
    join public.berater b on b.id = e.berater_id
   where e.berater_id in (select public.mein_team())
   order by coalesce(e.self_registered_at, e.created_at at time zone 'UTC') desc
   limit greatest(1, least(coalesce(p_limit, 200), 1000));
$function$;

drop function if exists public.team_empfehlungen(integer, integer);
create function public.team_empfehlungen(p_days integer default 30, p_limit integer default 200)
returns table(id uuid, empfaenger_name text, status text, interessiert boolean,
              anrufwunsch text, empfehler_name text, berater_id uuid,
              berater_name text, angelegt_am timestamp with time zone,
              ist_test boolean)
language sql
stable security definer
set search_path to ''
as $function$
  select e.id, e.empfaenger_name, coalesce(e.status, 'offen'),
         coalesce(e.interessiert, false), e.anrufwunsch, e.empfehler_name,
         e.berater_id, b.name,
         (e.created_at at time zone 'UTC'),
         e.ist_test
    from public.empfehlungen e
    join public.berater b on b.id = e.berater_id
   where e.berater_id in (select public.mein_team())
     and e.created_at >= (now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365))))::timestamp
   order by e.created_at desc
   limit greatest(1, least(coalesce(p_limit, 200), 1000));
$function$;

drop function if exists public.team_praemien();
create function public.team_praemien()
returns table(id uuid, stufe integer, titel text, wert_label text, status text,
              promoter_name text, berater_id uuid, berater_name text,
              verdient_am timestamp with time zone, ist_test boolean)
language sql
stable security definer
set search_path to ''
as $function$
  select p.id, p.stufe, p.titel, p.wert_label, p.status,
         e.name, p.berater_id, b.name, p.earned_at, p.ist_test
    from public.praemien p
    join public.berater b on b.id = p.berater_id
    left join public.empfehler e on e.id = p.empfehler_id
   where p.berater_id in (select public.mein_team())
   order by p.earned_at desc nulls last
   limit 500;
$function$;

drop function if exists public.team_kidz();
create function public.team_kidz()
returns table(id uuid, name text, email text, telefon text, event_key text,
              berater_id uuid, berater_name text, angemeldet_am timestamp with time zone,
              ist_test boolean)
language sql
stable security definer
set search_path to ''
as $function$
  select t.id, t.name, t.email, t.telefon, t.event_key,
         t.berater_id, b.name, t.created_at, t.ist_test
    from public.kidz_gewinnspiel_teilnahmen t
    join public.berater b on b.id = t.berater_id
   where t.berater_id in (select public.mein_team())
   order by t.created_at desc
   limit 1000;
$function$;

/* ------------------------------------------------------------------ *
 * 4) Bestand ansehen und aufräumen
 * ------------------------------------------------------------------ */

create or replace function public.testdaten_bestand()
returns table(bereich text, anzahl integer)
language sql
stable security definer
set search_path to ''
as $function$
  select 'berater',      (select count(*)::int from public.berater where ist_test)
  union all
  select 'promoter',     (select count(*)::int from public.empfehler where ist_test)
  union all
  select 'empfehlungen', (select count(*)::int from public.empfehlungen where ist_test)
  union all
  select 'praemien',     (select count(*)::int from public.praemien where ist_test)
  union all
  select 'kidz',         (select count(*)::int from public.kidz_gewinnspiel_teilnahmen where ist_test)
                       + (select count(*)::int from public.kidz_elternabend_anmeldungen where ist_test)
  union all
  select 'potenziale',   (select count(*)::int from public.potenziale where ist_test);
$function$;

comment on function public.testdaten_bestand() is
  'Zeigt, wie viele Testdatensätze es je Bereich gibt. Für alle Angemeldeten lesbar.';

create or replace function public.testdaten_entfernen(p_bestaetigung text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_stempel   text := to_char(now(), 'YYYYMMDDHH24MISS');
  v_tabelle   text := 'backup_testdaten_' || v_stempel;
  v_bericht   jsonb;
  v_konten    jsonb;
begin
  if not public.is_current_berater_admin() then
    raise exception 'Nur ein Admin darf Testdaten entfernen' using errcode = '42501';
  end if;

  if p_bestaetigung is distinct from 'TESTDATEN ENTFERNEN' then
    raise exception 'Zur Sicherheit muss die Bestätigung genau "TESTDATEN ENTFERNEN" lauten'
      using errcode = '22023';
  end if;

  -- Erst sichern. Ohne Sicherung wird nichts gelöscht.
  execute format(
    'create table archiv.%I as
       select ''berater''::text as bereich, to_jsonb(t) as daten from public.berater t where t.ist_test
       union all select ''empfehler'', to_jsonb(t) from public.empfehler t where t.ist_test
       union all select ''empfehlungen'', to_jsonb(t) from public.empfehlungen t where t.ist_test
       union all select ''praemien'', to_jsonb(t) from public.praemien t where t.ist_test
       union all select ''kidz_gewinnspiel'', to_jsonb(t) from public.kidz_gewinnspiel_teilnahmen t where t.ist_test
       union all select ''kidz_elternabend'', to_jsonb(t) from public.kidz_elternabend_anmeldungen t where t.ist_test
       union all select ''potenziale'', to_jsonb(t) from public.potenziale t where t.ist_test',
    v_tabelle);

  -- Auth-Konten der Testberater merken: die kann diese Funktion nicht
  -- entfernen, das geht nur über die Verwaltungsschnittstelle.
  select coalesce(jsonb_agg(jsonb_build_object('name', b.name, 'auth_user_id', b.auth_user_id)), '[]'::jsonb)
    into v_konten
    from public.berater b
   where b.ist_test and b.auth_user_id is not null;

  select jsonb_build_object(
    'gesichert_in', 'archiv.' || v_tabelle,
    'berater',      (select count(*) from public.berater where ist_test),
    'promoter',     (select count(*) from public.empfehler where ist_test),
    'empfehlungen', (select count(*) from public.empfehlungen where ist_test),
    'praemien',     (select count(*) from public.praemien where ist_test),
    'kidz',         (select count(*) from public.kidz_gewinnspiel_teilnahmen where ist_test)
                  + (select count(*) from public.kidz_elternabend_anmeldungen where ist_test),
    'potenziale',   (select count(*) from public.potenziale where ist_test),
    'offene_auth_konten', v_konten
  ) into v_bericht;

  -- Reihenfolge nach den Fremdschlüsseln: von unten nach oben.
  delete from public.stufe_notifications
   where empfehler_id in (select id from public.empfehler where ist_test);
  delete from public.praemien where ist_test;
  delete from public.empfehlungen where ist_test;
  delete from public.empfehler where ist_test;
  delete from public.kidz_gewinnspiel_teilnahmen where ist_test;
  delete from public.kidz_elternabend_anmeldungen where ist_test;
  delete from public.potenziale where ist_test;
  delete from public.kpi_snapshots
   where berater_id in (select id from public.berater where ist_test);
  delete from public.belohnungs_stufen
   where berater_id in (select id from public.berater where ist_test);
  delete from public.berater where ist_test;

  return v_bericht;
end;
$function$;

comment on function public.testdaten_entfernen(text) is
  'Sichert alle Testdatensätze nach archiv.backup_testdaten_<Zeitstempel> und löscht sie. Nur Admin, Bestätigung nötig. Auth-Konten von Testberatern bleiben stehen und werden im Bericht genannt.';

/* ------------------------------------------------------------------ *
 * 5) Rechte
 *
 * Lehre aus Phase 198: Supabase vergibt EXECUTE beim Anlegen automatisch
 * an anon; ein revoke from public entfernt das NICHT.
 * ------------------------------------------------------------------ */

revoke execute on function public.team_promoter(integer) from anon, public;
revoke execute on function public.team_empfehlungen(integer, integer) from anon, public;
revoke execute on function public.team_praemien() from anon, public;
revoke execute on function public.team_kidz() from anon, public;
revoke execute on function public.testdaten_bestand() from anon, public;
revoke execute on function public.testdaten_entfernen(text) from anon, public;
revoke execute on function public.erbe_testkennzeichen() from anon, public, authenticated;
revoke execute on function public.ziehe_testkennzeichen_nach() from anon, public, authenticated;

grant execute on function public.team_promoter(integer) to authenticated;
grant execute on function public.team_empfehlungen(integer, integer) to authenticated;
grant execute on function public.team_praemien() to authenticated;
grant execute on function public.team_kidz() to authenticated;
grant execute on function public.testdaten_bestand() to authenticated;
grant execute on function public.testdaten_entfernen(text) to authenticated;

