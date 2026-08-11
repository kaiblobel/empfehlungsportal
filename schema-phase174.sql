-- =====================================================================
-- Phase 174 · KIDZ-Vor-Ort-Los
--
-- Online-Anmeldungen sind nur Vormerkungen. Eine Teilnahme entsteht erst,
-- wenn vor Ort genau ein nummeriertes Los ausgegeben und in die physische
-- Lostrommel eingeworfen wird. Bestehende Vormerkungen bleiben erhalten.
-- =====================================================================

alter table public.kidz_gewinnspiel_teilnahmen
  add column if not exists ticket_number text,
  add column if not exists ticket_issued_at timestamptz;

alter table public.kidz_gewinnspiel_teilnahmen
  drop constraint if exists kidz_gewinnspiel_ticket_number;
alter table public.kidz_gewinnspiel_teilnahmen
  add constraint kidz_gewinnspiel_ticket_number
  check (ticket_number is null or ticket_number ~ '^[A-Z0-9]{1,12}$');

create unique index if not exists kidz_gewinnspiel_event_ticket_unique
  on public.kidz_gewinnspiel_teilnahmen (event_key, ticket_number)
  where ticket_number is not null;

comment on column public.kidz_gewinnspiel_teilnahmen.ticket_number is
  'Nummer des vor Ort ausgegebenen Doppelloses. Ein Los pro volljaehriger Person und Veranstaltung.';
comment on column public.kidz_gewinnspiel_teilnahmen.ticket_issued_at is
  'Zeitpunkt der persoenlichen Losausgabe. Erst der Einwurf des Papierabschnitts in die Lostrommel begruendet die Teilnahme.';

grant update (ticket_number, ticket_issued_at)
  on table public.kidz_gewinnspiel_teilnahmen to authenticated;

create or replace function public.enforce_kidz_ticket_once()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.ticket_number is not null
     and (
       new.ticket_number is distinct from old.ticket_number
       or new.ticket_issued_at is distinct from old.ticket_issued_at
     ) then
    raise check_violation using message = 'KIDZ ticket already issued';
  end if;

  if old.ticket_number is null and new.ticket_number is not null then
    new.ticket_number := upper(regexp_replace(trim(new.ticket_number), '\s+', '', 'g'));
    if new.ticket_number !~ '^[A-Z0-9]{1,12}$' then
      raise check_violation using message = 'Invalid KIDZ ticket number';
    end if;
    new.ticket_issued_at := clock_timestamp();
    new.checked_in_at := new.ticket_issued_at;
  elsif old.ticket_number is null and new.ticket_issued_at is not null then
    raise check_violation using message = 'KIDZ ticket timestamp requires ticket number';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_kidz_ticket_once()
  from public, anon, authenticated, service_role;

drop trigger if exists enforce_kidz_ticket_once
  on public.kidz_gewinnspiel_teilnahmen;
create trigger enforce_kidz_ticket_once
before update of ticket_number, ticket_issued_at
on public.kidz_gewinnspiel_teilnahmen
for each row execute function public.enforce_kidz_ticket_once();

alter table public.kidz_gewinnspiel_teilnahmen
  drop constraint if exists kidz_gewinnspiel_source;
alter table public.kidz_gewinnspiel_teilnahmen
  add constraint kidz_gewinnspiel_source
  check (source in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt'));

create or replace function public.issue_kidz_gewinnspiel_ticket(
  p_participation_id uuid,
  p_ticket_number text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket_number text := upper(regexp_replace(trim(coalesce(p_ticket_number, '')), '\s+', '', 'g'));
  v_entry record;
  v_issued_at timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_ticket_number !~ '^[A-Z0-9]{1,12}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_ticket');
  end if;

  select id, berater_id, ticket_number
    into v_entry
    from public.kidz_gewinnspiel_teilnahmen
   where id = p_participation_id
     and event_key = 'kidz-sommerfest-2026'
   for update;

  if not found
     or not (
       v_entry.berater_id = public.current_berater_id()
       or public.is_current_berater_admin()
     ) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_entry.ticket_number is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_issued');
  end if;

  begin
    update public.kidz_gewinnspiel_teilnahmen
       set ticket_number = v_ticket_number,
           ticket_issued_at = clock_timestamp(),
           checked_in_at = clock_timestamp()
     where id = v_entry.id
     returning ticket_issued_at into v_issued_at;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'ticket_exists');
  end;

  return jsonb_build_object(
    'ok', true,
    'ticket_number', v_ticket_number,
    'ticket_issued_at', v_issued_at
  );
end;
$$;

revoke execute on function public.issue_kidz_gewinnspiel_ticket(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.issue_kidz_gewinnspiel_ticket(uuid, text)
  to authenticated;

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
     or p_conditions_version not in ('2026-08-11-v1', '2026-08-11-v2')
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or v_source not in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt') then
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
