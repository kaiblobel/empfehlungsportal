-- =====================================================================
-- Phase 107 · Serverseitiges Rate-Limiting (IP-basiert, in der Datenbank)
--
-- Warum in der DB und nicht in Vercel: die missbrauchsrelevanten Aufrufe
-- (create_empfehlung_public, mark_interessiert_rpc, get_empfehler_*) gehen
-- vom Browser DIREKT an Supabase (öffentlicher Key) — an Vercel vorbei.
-- Ein Limit greift nur dann für ALLE, wenn es in den SECURITY-DEFINER-
-- Funktionen selbst sitzt. Die echte Client-IP kommt zuverlässig über den
-- Cloudflare-Header `cf-connecting-ip` (per Diagnose bestätigt).
--
-- Fällt die IP mal weg (z. B. interne/Trigger-Aufrufe ohne Request-Header),
-- wird NICHT geblockt — kein Fehlalarm für legitime Systempfade.
--
-- Idempotent; ändert keine Funktions-Signaturen.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Infrastruktur: Zähler-Tabelle + IP-Ermittlung + Prüf-Helfer (privat)
-- ---------------------------------------------------------------------
create table if not exists private.rate_counter (
  bucket       text        not null,
  ip           text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, ip, window_start)
);
alter table private.rate_counter enable row level security;
revoke all on table private.rate_counter from public, anon, authenticated;

-- Client-IP aus den durchgereichten Request-Headern (Cloudflare zuerst,
-- dann erstes Glied von x-forwarded-for). NULL, wenn keine Header da sind.
create or replace function private.client_ip()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_headers json;
  v_ip text;
begin
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if v_headers is null then
    return null;
  end if;
  v_ip := v_headers ->> 'cf-connecting-ip';
  if v_ip is null or v_ip = '' then
    v_ip := split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1);
  end if;
  return nullif(btrim(v_ip), '');
end;
$$;
revoke execute on function private.client_ip() from public, anon, authenticated, service_role;

-- Fixed-Window-Zähler. Erhöht den Treffer für (bucket, ip, Fenster) und wirft
-- bei Überschreitung. Räumt gelegentlich alte Fenster weg (billig, selten).
create or replace function private.rate_limit_check(p_bucket text, p_limit int, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip   text;
  v_secs double precision;
  v_win  timestamptz;
  v_hits integer;
begin
  v_ip := private.client_ip();
  if v_ip is null then
    return;  -- ohne IP nicht drosseln (interne/Trigger-Aufrufe)
  end if;

  v_secs := extract(epoch from p_window);
  v_win  := to_timestamp(floor(extract(epoch from clock_timestamp()) / v_secs) * v_secs);

  insert into private.rate_counter (bucket, ip, window_start, hits)
       values (p_bucket, v_ip, v_win, 1)
  on conflict (bucket, ip, window_start)
    do update set hits = private.rate_counter.hits + 1
  returning hits into v_hits;

  if v_hits > p_limit then
    raise sqlstate 'P0001' using message = 'Zu viele Anfragen in kurzer Zeit. Bitte einen Moment warten.';
  end if;

  if random() < 0.02 then
    delete from private.rate_counter where window_start < clock_timestamp() - interval '2 hours';
  end if;
end;
$$;
revoke execute on function private.rate_limit_check(text, int, interval) from public, anon, authenticated, service_role;


-- ---------------------------------------------------------------------
-- Guard 1 · create_empfehlung_public  (Spam-Bremse)
--   Limit: 20 neue Empfehlungen pro IP und Stunde.
--   (Nur der rate_limit-Aufruf kommt hinzu; Rest = Phase-106-Stand.)
-- ---------------------------------------------------------------------
create or replace function public.create_empfehlung_public(
  p_empfaenger_name text,
  p_empfaenger_telefon text,
  p_empfehler_name text default null,
  p_empfehler_nachricht text default null,
  p_nachricht text default null,
  p_typ text default 'direkt',
  p_vorlage_slug text default 'allgemein',
  p_empfehler_id uuid default null,
  p_berater_id uuid default null,
  p_empfaenger_beruf text default null,
  p_empfaenger_verbindung text default null,
  p_empfaenger_kontext text default null,
  p_empfehler_vorinformiert boolean default false,
  p_beste_erreichbarkeit text default null,
  p_bevorzugter_kanal text default null
)
returns table(id uuid, link_token text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name  text := nullif(btrim(coalesce(p_empfaenger_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_empfaenger_telefon, '')), '');
  v_berater uuid;
begin
  perform private.rate_limit_check('create_empfehlung', 20, interval '1 hour');

  if v_name is null or v_phone is null then
    raise invalid_parameter_value using message = 'Name und Telefon sind erforderlich';
  end if;

  select b.id into v_berater
    from public.berater b
   where b.id = p_berater_id and b.ist_aktiv
   limit 1;
  if v_berater is null then
    v_berater := 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';
  end if;

  return query
  insert into empfehlungen (
    empfaenger_name, empfaenger_telefon, empfehler_name, empfehler_nachricht,
    nachricht, typ, vorlage_slug, empfehler_id, berater_id,
    empfaenger_beruf, empfaenger_verbindung, empfaenger_kontext,
    empfehler_vorinformiert, beste_erreichbarkeit, bevorzugter_kanal
  ) values (
    left(v_name, 120),
    left(v_phone, 40),
    left(nullif(btrim(coalesce(p_empfehler_name, '')), ''), 120),
    left(nullif(btrim(coalesce(p_empfehler_nachricht, '')), ''), 1000),
    left(nullif(coalesce(p_nachricht, ''), ''), 2000),
    left(coalesce(nullif(btrim(coalesce(p_typ, '')), ''), 'direkt'), 40),
    left(coalesce(nullif(btrim(coalesce(p_vorlage_slug, '')), ''), 'allgemein'), 60),
    p_empfehler_id,
    v_berater,
    left(nullif(btrim(coalesce(p_empfaenger_beruf, '')), ''), 160),
    left(nullif(btrim(coalesce(p_empfaenger_verbindung, '')), ''), 160),
    left(nullif(btrim(coalesce(p_empfaenger_kontext, '')), ''), 2000),
    coalesce(p_empfehler_vorinformiert, false),
    left(nullif(btrim(coalesce(p_beste_erreichbarkeit, '')), ''), 160),
    left(nullif(btrim(coalesce(p_bevorzugter_kanal, '')), ''), 160)
  )
  returning empfehlungen.id, empfehlungen.link_token;
end;
$function$;
grant execute on function public.create_empfehlung_public(
  text, text, text, text, text, text, text, uuid, uuid, text, text, text, boolean, text, text
) to anon, authenticated;


-- ---------------------------------------------------------------------
-- Guard 2 · mark_interessiert_rpc  (Telegram-Flooding bremsen)
--   Limit: 40 pro IP und Stunde.
-- ---------------------------------------------------------------------
create or replace function public.mark_interessiert_rpc(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  perform private.rate_limit_check('mark_interessiert', 40, interval '1 hour');
  update empfehlungen set interessiert = true, interessiert_at = now()
  where link_token = p_token and (interessiert is not true);
end;
$$;


-- ---------------------------------------------------------------------
-- Guard 3 · Promoter-Lese-RPCs  (Enumeration/Code-Rateversuche bremsen)
--   Gemeinsamer Zähler 'promoter_read': 60 pro IP je 10 Minuten.
--   (Ein Dashboard-Load = 3 Aufrufe; 60/10min lässt ~20 Loads/10min zu.)
--   Bodies unverändert übernommen, nur Sprache→plpgsql + rate_limit_check.
-- ---------------------------------------------------------------------
create or replace function public.get_empfehler_by_code(p_code text)
returns table(id uuid, code text, name text, berater_id uuid,
              created_at timestamp without time zone, ziel_stufe integer, standard_nachricht text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  perform private.rate_limit_check('promoter_read', 60, interval '10 minutes');
  return query
    select e.id, e.code, e.name, e.berater_id, e.created_at, e.ziel_stufe, e.standard_nachricht
      from public.empfehler e
     where e.code = p_code
     limit 1;
end;
$$;
grant execute on function public.get_empfehler_by_code(text) to anon, authenticated;

create or replace function public.get_empfehler_stats(p_code text)
returns table(empfehler_id uuid, name text, code text, gesamt integer, offen integer,
              anrufwunsch integer, kontaktiert integer, kunde integer,
              kein_interesse integer, aktuelle_stufe integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
#variable_conflict use_column
begin
  perform private.rate_limit_check('promoter_read', 60, interval '10 minutes');
  return query
  with e as (select id, name, code from empfehler where code = p_code),
  s as (
    select e.id as eid,
      count(*) filter (where empfehlungen.id is not null)::int as gesamt,
      count(*) filter (where coalesce(empfehlungen.status,'offen') = 'offen')::int as offen,
      count(*) filter (where empfehlungen.status = 'anrufwunsch')::int as anrufwunsch,
      count(*) filter (where empfehlungen.status = 'kontaktiert')::int as kontaktiert,
      count(*) filter (where empfehlungen.status = 'kunde')::int as kunde,
      count(*) filter (where empfehlungen.status = 'kein_interesse')::int as kein_interesse
    from e left join empfehlungen on empfehlungen.empfehler_id = e.id
    group by e.id
  )
  select e.id, e.name, e.code, s.gesamt, s.offen, s.anrufwunsch, s.kontaktiert,
         s.kunde, s.kein_interesse, s.kunde as aktuelle_stufe
  from e join s on s.eid = e.id;
end;
$$;
grant execute on function public.get_empfehler_stats(text) to anon, authenticated;

create or replace function public.get_empfehler_empfehlungen(p_code text)
returns table(
  id uuid, empfaenger_name text, status text, anrufwunsch text, vorlage_slug text,
  created_at timestamp without time zone, link_geoeffnet boolean,
  link_geoeffnet_at timestamp without time zone, link_token text,
  empfaenger_beruf text, empfaenger_verbindung text, empfaenger_kontext text,
  beste_erreichbarkeit text, bevorzugter_kanal text, empfehler_vorinformiert boolean,
  empfehler_nachricht text, booking_state text, booking_started_at timestamp without time zone,
  booking_confirmed_at timestamp without time zone, booking_updated_at timestamp without time zone,
  booking_cancelled_at timestamp without time zone, booking_start_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.rate_limit_check('promoter_read', 60, interval '10 minutes');
  return query
    select e.id, e.empfaenger_name, coalesce(e.status, 'offen') as status,
           e.anrufwunsch, e.vorlage_slug, e.created_at,
           coalesce(e.link_geoeffnet, false) as link_geoeffnet,
           e.link_geoeffnet_at, e.link_token,
           e.empfaenger_beruf, e.empfaenger_verbindung, e.empfaenger_kontext,
           e.beste_erreichbarkeit, e.bevorzugter_kanal,
           coalesce(e.empfehler_vorinformiert, false) as empfehler_vorinformiert,
           e.empfehler_nachricht, e.booking_state, e.booking_started_at,
           e.booking_confirmed_at, e.booking_updated_at, e.booking_cancelled_at,
           e.booking_start_at
      from public.empfehlungen e
      join public.empfehler em on em.id = e.empfehler_id
     where em.code = p_code
     order by e.created_at desc;
end;
$$;
grant execute on function public.get_empfehler_empfehlungen(text) to anon, authenticated;
