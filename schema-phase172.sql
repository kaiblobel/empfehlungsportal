-- =====================================================================
-- Phase 172 · KIDZ-Sommerfest-Gewinnspiel mit eigener Datenhaltung
--
-- LIVE ANGEWENDET AM 11.08.2026 ALS phase_172_kidz_gewinnspiel.
-- Gewinnspielteilnahmen werden bewusst weder als Promoter noch als
-- Empfehlungen gespeichert. Das Geheimnis gehört niemals ins Repository.
-- =====================================================================

create table if not exists public.kidz_gewinnspiel_teilnahmen (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  event_key text not null,
  berater_id uuid not null references public.berater(id),
  name text not null,
  email text,
  telefon text,
  source text not null,
  elternabend_interesse boolean not null default false,
  conditions_version text not null,
  contact_key text not null,
  consent_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  checked_in_at timestamptz,
  winner_rank smallint,
  notified_at timestamptz,
  constraint kidz_gewinnspiel_event_key check (event_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint kidz_gewinnspiel_name check (length(trim(name)) between 2 and 100),
  constraint kidz_gewinnspiel_contact check (nullif(trim(email), '') is not null or nullif(trim(telefon), '') is not null),
  constraint kidz_gewinnspiel_source check (source in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'direkt')),
  constraint kidz_gewinnspiel_contact_key check (contact_key ~ '^[0-9a-f]{64}$'),
  constraint kidz_gewinnspiel_winner_rank check (winner_rank is null or winner_rank between 1 and 999)
);

create unique index if not exists kidz_gewinnspiel_event_contact_unique
  on public.kidz_gewinnspiel_teilnahmen (event_key, contact_key);
create index if not exists kidz_gewinnspiel_berater_event_created_idx
  on public.kidz_gewinnspiel_teilnahmen (berater_id, event_key, created_at desc);
create index if not exists kidz_gewinnspiel_elternabend_idx
  on public.kidz_gewinnspiel_teilnahmen (berater_id, event_key, elternabend_interesse)
  where elternabend_interesse is true;

comment on table public.kidz_gewinnspiel_teilnahmen is
  'Getrennte volljaehrige Teilnehmende am KIDZ-Gewinnspiel. Keine Kinderprofile, keine Promoter und keine Empfehlungen.';
comment on column public.kidz_gewinnspiel_teilnahmen.elternabend_interesse is
  'Freiwillige, getrennte Einwilligung fuer eine einmalige Information zum KIDZ-Elternabend.';
comment on column public.kidz_gewinnspiel_teilnahmen.contact_key is
  'Serverseitiger HMAC fuer Dublettenpruefung. Keine IP-Adresse und kein Klartext-Kontakt.';
comment on column public.kidz_gewinnspiel_teilnahmen.berater_id is
  'Freiwillig ausgewaehlter oder per Einladungslink vorbelegter Berater. Ohne Auswahl wird Kai Blobel zugeordnet.';

alter table public.kidz_gewinnspiel_teilnahmen enable row level security;
alter table public.kidz_gewinnspiel_teilnahmen force row level security;
revoke all on table public.kidz_gewinnspiel_teilnahmen from public, anon, authenticated;
grant select, delete on table public.kidz_gewinnspiel_teilnahmen to authenticated;
grant update (checked_in_at, winner_rank, notified_at)
  on table public.kidz_gewinnspiel_teilnahmen to authenticated;

drop policy if exists kidz_gewinnspiel_berater_select on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_berater_select
  on public.kidz_gewinnspiel_teilnahmen for select
  to authenticated
  using (berater_id = public.current_berater_id() or public.is_current_berater_admin());

drop policy if exists kidz_gewinnspiel_berater_update on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_berater_update
  on public.kidz_gewinnspiel_teilnahmen for update
  to authenticated
  using (berater_id = public.current_berater_id() or public.is_current_berater_admin())
  with check (berater_id = public.current_berater_id() or public.is_current_berater_admin());

drop policy if exists kidz_gewinnspiel_berater_delete on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_berater_delete
  on public.kidz_gewinnspiel_teilnahmen for delete
  to authenticated
  using (berater_id = public.current_berater_id() or public.is_current_berater_admin());

create or replace function public.list_kidz_berater_public()
returns table(name text, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select left(trim(b.name), 100), left(lower(trim(b.slug)), 80)
    from public.berater b
   where b.ist_aktiv is true
     and nullif(trim(b.name), '') is not null
     and b.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
   order by b.name;
$$;
revoke execute on function public.list_kidz_berater_public()
  from public, anon, authenticated, service_role;
grant execute on function public.list_kidz_berater_public()
  to anon, authenticated;

create or replace function public.register_kidz_gewinnspiel_public(
  p_secret text,
  p_event_key text,
  p_berater_slug text,
  p_name text,
  p_email text,
  p_telefon text,
  p_source text,
  p_elternabend_interesse boolean,
  p_conditions_version text,
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
  v_reference text;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'kidz_giveaway_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'KIDZ giveaway registration authentication failed';
  end if;

  perform private.rate_limit_check_key('kidz_giveaway_hour', p_rate_key, 5, interval '1 hour');
  perform private.rate_limit_check_key('kidz_giveaway_day', p_rate_key, 15, interval '24 hours');
  perform private.rate_limit_check_key('kidz_giveaway_contact_day', p_contact_key, 3, interval '24 hours');

  if p_consent is not true
     or p_event_key <> 'kidz-sommerfest-2026'
     or p_conditions_version <> '2026-08-11-v1'
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or v_source not in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'direkt') then
    raise invalid_parameter_value using message = 'Invalid KIDZ giveaway registration';
  end if;

  if v_email is not null and (length(v_email) > 180 or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    raise invalid_parameter_value using message = 'Invalid participant email';
  end if;
  v_phone_digits := regexp_replace(coalesce(v_telefon, ''), '\D', '', 'g');
  if v_telefon is not null and length(v_phone_digits) not between 8 and 15 then
    raise invalid_parameter_value using message = 'Invalid participant phone';
  end if;
  if v_email is null and v_telefon is null then
    raise invalid_parameter_value using message = 'Participant contact required';
  end if;

  select id into v_berater
    from public.berater
   where lower(slug) = lower(trim(coalesce(p_berater_slug, '')))
     and ist_aktiv
   limit 1;
  if v_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;

  if exists (
    select 1 from public.kidz_gewinnspiel_teilnahmen
     where event_key = p_event_key and contact_key = p_contact_key
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end if;

  v_reference := 'KIDZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  begin
    insert into public.kidz_gewinnspiel_teilnahmen (
      reference, event_key, berater_id, name, email, telefon, source,
      elternabend_interesse, conditions_version, contact_key, consent_at
    ) values (
      v_reference, p_event_key, v_berater, v_name, v_email, v_telefon, v_source,
      coalesce(p_elternabend_interesse, false), p_conditions_version, p_contact_key, clock_timestamp()
    );
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end;

  return jsonb_build_object('ok', true, 'reference', v_reference);
end;
$$;

revoke execute on function public.register_kidz_gewinnspiel_public(
  text, text, text, text, text, text, text, boolean, text, text, text, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.register_kidz_gewinnspiel_public(
  text, text, text, text, text, text, text, boolean, text, text, text, boolean
) to anon;

-- Produktiv nach Kais Freigabe hinterlegt, ohne Rohwert im Repo:
-- insert into private.integration_secrets (name, secret_hash)
-- values ('kidz_giveaway_registration', '<sha256-von-KIDZ_GIVEAWAY_REGISTRATION_SECRET>')
-- on conflict (name) do update set secret_hash = excluded.secret_hash, created_at = now();
