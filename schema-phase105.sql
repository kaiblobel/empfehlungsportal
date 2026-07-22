-- =====================================================================
-- Phase 105 · Zuverlaessiges Empfaenger- und Bookings-Tracking
--
-- Die Aktivierung erfolgt erst zusammen mit BOOKINGS_WEBHOOK_SECRET in
-- Vercel und dem passenden SHA-256-Hash in private.integration_secrets.
-- Der Rohwert des Secrets gehoert niemals in dieses Repository.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.integration_secrets (
  name text primary key,
  secret_hash text not null check (length(secret_hash) = 64),
  created_at timestamptz not null default now()
);
alter table private.integration_secrets enable row level security;
revoke all on table private.integration_secrets from public, anon, authenticated;

alter table public.empfehlungen
  add column if not exists booking_state text,
  add column if not exists booking_started_at timestamp without time zone,
  add column if not exists booking_confirmed_at timestamp without time zone,
  add column if not exists booking_updated_at timestamp without time zone,
  add column if not exists booking_cancelled_at timestamp without time zone,
  add column if not exists booking_start_at timestamptz,
  add column if not exists booking_external_id text,
  add column if not exists booking_service_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'empfehlungen_booking_state_check'
      and conrelid = 'public.empfehlungen'::regclass
  ) then
    alter table public.empfehlungen
      add constraint empfehlungen_booking_state_check
      check (booking_state is null or booking_state in ('started', 'confirmed', 'cancelled'));
  end if;
end $$;

create unique index if not exists empfehlungen_booking_external_id_uidx
  on public.empfehlungen (booking_external_id)
  where booking_external_id is not null;

create or replace function private.normalize_de_phone(p_phone text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  with cleaned as (
    select regexp_replace(p_phone, '[^0-9]', '', 'g') as digits
  )
  select case
    when digits like '00%' then substring(digits from 3)
    when digits like '0%' then '49' || substring(digits from 2)
    else digits
  end
  from cleaned;
$$;
revoke execute on function private.normalize_de_phone(text) from public, anon, authenticated, service_role;

create or replace function public.mark_booking_started_rpc(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.empfehlungen
     set link_geoeffnet = true,
         link_geoeffnet_at = coalesce(link_geoeffnet_at, now())
   where link_token = p_token
     and coalesce(ausgetragen, false) = false
     and coalesce(link_geoeffnet, false) = false;

  update public.empfehlungen
     set booking_started_at = case
           when booking_state = 'cancelled' then now()
           else coalesce(booking_started_at, now())
         end,
         booking_state = case
           when booking_state = 'confirmed' then booking_state
           else 'started'
         end,
         booking_cancelled_at = case
           when booking_state = 'cancelled' then null
           else booking_cancelled_at
         end,
         booking_external_id = case
           when booking_state = 'cancelled' then null
           else booking_external_id
         end
   where link_token = p_token
     and coalesce(ausgetragen, false) = false;
end;
$$;
revoke execute on function public.mark_booking_started_rpc(text) from public, anon, authenticated, service_role;
grant execute on function public.mark_booking_started_rpc(text) to anon, authenticated;

create or replace function public.record_booking_event_rpc(
  p_secret text,
  p_event text,
  p_external_id text,
  p_customer_phone text default null,
  p_start_at timestamptz default null,
  p_service_name text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_empfehlung_id uuid;
  v_event text := lower(trim(coalesce(p_event, '')));
  v_phone text;
begin
  select secret_hash
    into v_secret_hash
    from private.integration_secrets
   where name = 'bookings_power_automate';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'Bookings authentication failed';
  end if;

  if v_event not in ('created', 'updated', 'cancelled')
     or nullif(trim(coalesce(p_external_id, '')), '') is null then
    raise invalid_parameter_value using message = 'Invalid Bookings event';
  end if;

  select id
    into v_empfehlung_id
    from public.empfehlungen
   where booking_external_id = left(trim(p_external_id), 180)
   limit 1;

  if v_empfehlung_id is null and v_event = 'created' and p_customer_phone is not null then
    v_phone := private.normalize_de_phone(p_customer_phone);
    select id
      into v_empfehlung_id
      from public.empfehlungen
     where private.normalize_de_phone(empfaenger_telefon) = v_phone
       and booking_started_at >= now() - interval '30 days'
       and coalesce(ausgetragen, false) = false
       and (booking_external_id is null or booking_state = 'cancelled')
     order by booking_started_at desc
     limit 1;
  end if;

  if v_empfehlung_id is null then
    return false;
  end if;

  if v_event = 'created' then
    update public.empfehlungen
       set booking_state = 'confirmed',
           booking_confirmed_at = coalesce(booking_confirmed_at, now()),
           booking_updated_at = now(),
           booking_cancelled_at = null,
           booking_start_at = p_start_at,
           booking_external_id = left(trim(p_external_id), 180),
           booking_service_name = left(nullif(trim(coalesce(p_service_name, '')), ''), 160),
           status = case when status = 'kunde' then status else 'anrufwunsch' end,
           anrufwunsch = case when status = 'kunde' then anrufwunsch else 'Termin im Kalender vereinbart' end,
           anrufwunsch_at = case when status = 'kunde' then anrufwunsch_at else coalesce(anrufwunsch_at, now()) end,
           interessiert = true,
           interessiert_at = coalesce(interessiert_at, now())
     where id = v_empfehlung_id;
  elsif v_event = 'updated' then
    update public.empfehlungen
       set booking_state = 'confirmed',
           booking_updated_at = now(),
           booking_start_at = coalesce(p_start_at, booking_start_at),
           booking_service_name = coalesce(left(nullif(trim(coalesce(p_service_name, '')), ''), 160), booking_service_name)
     where id = v_empfehlung_id;
  else
    update public.empfehlungen
       set booking_state = 'cancelled',
           booking_cancelled_at = now(),
           booking_updated_at = now(),
           status = case
             when status = 'anrufwunsch' and anrufwunsch = 'Termin im Kalender vereinbart' then 'offen'
             else status
           end,
           anrufwunsch = case
             when status = 'anrufwunsch' and anrufwunsch = 'Termin im Kalender vereinbart' then null
             else anrufwunsch
           end
     where id = v_empfehlung_id;
  end if;

  return true;
end;
$$;
revoke execute on function public.record_booking_event_rpc(text, text, text, text, timestamptz, text) from public, anon, authenticated, service_role;
grant execute on function public.record_booking_event_rpc(text, text, text, text, timestamptz, text) to anon;

drop function if exists public.get_empfehler_empfehlungen(text);
create function public.get_empfehler_empfehlungen(p_code text)
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
language sql
security definer
set search_path = ''
as $$
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
$$;
revoke execute on function public.get_empfehler_empfehlungen(text) from public, anon, authenticated, service_role;
grant execute on function public.get_empfehler_empfehlungen(text) to anon, authenticated;
