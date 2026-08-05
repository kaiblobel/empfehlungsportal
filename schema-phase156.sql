-- =====================================================================
-- Phase 156 · QR-Selbstanmeldung fuer Promoter
--
-- VORBEREITET, NICHT ANGEWENDET.
-- Vor Aktivierung muessen derselbe starke Zufallswert als
-- PROMOTER_REGISTRATION_SECRET in Vercel und sein SHA-256-Hash unter
-- private.integration_secrets.name = 'promoter_self_registration'
-- hinterlegt sein. Der Rohwert gehoert niemals in dieses Repository.
-- =====================================================================

alter table public.empfehler
  add column if not exists self_registered_at timestamptz,
  add column if not exists self_registration_source text,
  add column if not exists consent_at timestamptz;

-- Die Teilindizes betreffen nur neue Selbstanmeldungen. Historische Dubletten
-- blockieren die Migration deshalb nicht. Gleichzeitig schliessen die beiden
-- Indizes parallele Doppelanmeldungen mit derselben E-Mail oder Nummer.
create unique index if not exists empfehler_self_registered_email_unique
  on public.empfehler (berater_id, lower(trim(email)))
  where self_registered_at is not null and nullif(trim(email), '') is not null;

create unique index if not exists empfehler_self_registered_phone_unique
  on public.empfehler (berater_id, regexp_replace(telefon, '\D', '', 'g'))
  where self_registered_at is not null and nullif(trim(telefon), '') is not null;

-- Der Vercel-Endpunkt uebergibt nur einen HMAC des Client-Schluessels. Damit
-- landen weder die echte IP noch ein vom Browser frei waehlbarer Rate-Key in
-- der Datenbank. Die bestehende Zaehler-Tabelle kann weiterverwendet werden.
create or replace function private.rate_limit_check_key(
  p_bucket text,
  p_key text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secs double precision;
  v_win timestamptz;
  v_hits integer;
begin
  if coalesce(p_key, '') !~ '^[0-9a-f]{64}$'
     or nullif(trim(coalesce(p_bucket, '')), '') is null
     or coalesce(p_limit, 0) < 1
     or p_window is null
     or p_window <= interval '0 seconds' then
    raise invalid_parameter_value using message = 'Invalid rate limit input';
  end if;

  v_secs := extract(epoch from p_window);
  v_win := to_timestamp(floor(extract(epoch from clock_timestamp()) / v_secs) * v_secs);

  insert into private.rate_counter (bucket, ip, window_start, hits)
       values (p_bucket, p_key, v_win, 1)
  on conflict (bucket, ip, window_start)
    do update set hits = private.rate_counter.hits + 1
  returning hits into v_hits;

  if v_hits > p_limit then
    raise sqlstate 'P0001' using message = 'Zu viele Anfragen in kurzer Zeit. Bitte einen Moment warten.';
  end if;

  if random() < 0.02 then
    delete from private.rate_counter
     where window_start < clock_timestamp() - interval '25 hours';
  end if;
end;
$$;
revoke execute on function private.rate_limit_check_key(text, text, integer, interval)
  from public, anon, authenticated, service_role;

-- Die bisherige Anlage bleibt fuer den Berater erhalten, ist aber nicht mehr
-- anonym aufrufbar und kann nicht mehr still auf Kais Konto zurueckfallen.
create or replace function public.create_empfehler(
  p_name text,
  p_email text,
  p_telefon text,
  p_berater_slug text default null::text
)
returns text
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_code text;
  v_berater uuid;
  v_actor uuid;
begin
  v_actor := public.current_berater_id();
  if v_actor is null then
    raise insufficient_privilege using message = 'Berater login required';
  end if;

  if nullif(trim(coalesce(p_berater_slug, '')), '') is not null then
    select id into v_berater
      from public.berater
     where lower(slug) = lower(trim(p_berater_slug))
       and ist_aktiv
     limit 1;
  else
    v_berater := v_actor;
  end if;

  if v_berater is null then
    raise invalid_parameter_value using message = 'Unknown advisor';
  end if;
  if v_berater <> v_actor and not public.is_current_berater_admin() then
    raise insufficient_privilege using message = 'Advisor scope mismatch';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise invalid_parameter_value using message = 'Invalid promoter name';
  end if;

  v_code := private.generate_empfehler_code(p_name);
  insert into public.empfehler (code, name, email, telefon, berater_id, code_version)
  values (
    v_code,
    left(trim(p_name), 100),
    nullif(lower(trim(p_email)), ''),
    nullif(trim(p_telefon), ''),
    v_berater,
    2
  );
  return v_code;
end;
$function$;
revoke execute on function public.create_empfehler(text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_empfehler(text, text, text, text)
  to authenticated;

-- Dieser RPC ist nur technisch anon-erreichbar. Ohne das ausschliesslich im
-- Vercel-Endpunkt vorhandene Secret kommt er nicht bis zur Datenpruefung.
create or replace function public.register_empfehler_public(
  p_secret text,
  p_name text,
  p_email text,
  p_telefon text,
  p_berater_slug text,
  p_source text,
  p_rate_key text,
  p_contact_key text,
  p_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_berater uuid;
  v_name text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 100);
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_telefon text := nullif(trim(coalesce(p_telefon, '')), '');
  v_phone_digits text;
  v_source text := lower(trim(coalesce(p_source, 'direkt')));
  v_code text;
  v_exists boolean := false;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'promoter_self_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'Promoter registration authentication failed';
  end if;

  perform private.rate_limit_check_key('promoter_registration_hour', p_rate_key, 5, interval '1 hour');
  perform private.rate_limit_check_key('promoter_registration_day', p_rate_key, 15, interval '24 hours');
  perform private.rate_limit_check_key('promoter_contact_day', p_contact_key, 3, interval '24 hours');

  if p_consent is not true
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or v_source not in ('praesentation', 'aufsteller', 'direkt', 'portal') then
    raise invalid_parameter_value using message = 'Invalid promoter registration';
  end if;

  if v_email is not null and (length(v_email) > 180 or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    raise invalid_parameter_value using message = 'Invalid promoter email';
  end if;
  v_phone_digits := regexp_replace(coalesce(v_telefon, ''), '\D', '', 'g');
  if v_telefon is not null and length(v_phone_digits) not between 8 and 15 then
    raise invalid_parameter_value using message = 'Invalid promoter phone';
  end if;
  if v_email is null and v_telefon is null then
    raise invalid_parameter_value using message = 'Promoter contact required';
  end if;

  select id into v_berater
    from public.berater
   where lower(slug) = lower(trim(coalesce(p_berater_slug, '')))
     and ist_aktiv
   limit 1;
  if v_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;

  select exists (
    select 1
      from public.empfehler e
     where e.berater_id = v_berater
       and (
         (v_email is not null and lower(trim(e.email)) = v_email)
         or
         (v_telefon is not null and regexp_replace(coalesce(e.telefon, ''), '\D', '', 'g') = v_phone_digits)
       )
  ) into v_exists;

  if v_exists then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end if;

  v_code := private.generate_empfehler_code(v_name);
  begin
    insert into public.empfehler (
      code, name, email, telefon, berater_id, code_version,
      self_registered_at, self_registration_source, consent_at
    ) values (
      v_code, v_name, v_email, v_telefon, v_berater, 2,
      clock_timestamp(), v_source, clock_timestamp()
    );
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end;

  return jsonb_build_object('ok', true, 'code', v_code);
end;
$$;
revoke execute on function public.register_empfehler_public(
  text, text, text, text, text, text, text, text, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.register_empfehler_public(
  text, text, text, text, text, text, text, text, boolean
) to anon;

-- Aktivierung nach Freigabe, bewusst ohne Rohwert im Repo:
-- insert into private.integration_secrets (name, secret_hash)
-- values ('promoter_self_registration', '<sha256-von-PROMOTER_REGISTRATION_SECRET>')
-- on conflict (name) do update set secret_hash = excluded.secret_hash, created_at = now();
