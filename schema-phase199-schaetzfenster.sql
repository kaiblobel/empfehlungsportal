-- Phase 199, Nachzug: Das Schaetzfenster gilt auch in der Datenbank
-- Anzuwenden als phase_199_kidz_schaetzfenster.
--
-- Der Umfang des XXL-Balls wird erst am Veranstaltungstag gemessen. Wer vorher
-- schaetzt, hat den Ball nie gesehen. Die oeffentliche Anmeldung nimmt eine
-- Schaetzung deshalb ausschliesslich am 6. September 2026 entgegen.
--
-- Die Serverfunktion /api/kidz-register verwirft eine zu frueh mitgeschickte
-- Schaetzung bereits stillschweigend. Diese Pruefung ist die zweite Schranke:
-- Sie greift, wenn jemand den Datenbankweg direkt anspricht.
--
-- Die Nacherfassung der Papierzettel (record_kidz_gewinnspiel_onsite) ist
-- bewusst NICHT betroffen. Die Zettel werden am Veranstaltungstag von Hand
-- ausgefuellt und danach abgetippt; dort muss die Schaetzung jederzeit rein.

begin;

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
  p_consent boolean,
  p_schaetzung_cm smallint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_berater uuid;
  v_empfehler uuid;
  v_name text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 100);
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_telefon text := nullif(trim(coalesce(p_telefon, '')), '');
  v_phone_digits text;
  v_source text := lower(trim(coalesce(p_source, 'direkt')));
  v_reference text;
  v_schaetzfenster constant tstzrange := tstzrange(
    timestamptz '2026-09-06 00:00:00+02', timestamptz '2026-09-07 00:00:00+02', '[)');
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
     or p_conditions_version not in ('2026-08-11-v1', '2026-08-11-v2', '2026-08-11-v3', '2026-08-12-v4', '2026-08-12-v5')
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or (p_schaetzung_cm is not null and p_schaetzung_cm not between 10 and 999)
     or v_source not in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt') then
    raise invalid_parameter_value using message = 'Invalid KIDZ giveaway registration';
  end if;

  -- Schaetzfenster: nur am Veranstaltungstag.
  if p_schaetzung_cm is not null and not (v_schaetzfenster @> clock_timestamp()) then
    raise invalid_parameter_value using message = 'KIDZ guess accepted on event day only';
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

  select e.berater_id, e.empfehler_id
    into v_berater, v_empfehler
    from public.kidz_gewinnspiel_einladende e
   where lower(e.key) = lower(trim(coalesce(p_berater_slug, '')))
     and e.ist_aktiv
   limit 1;

  if v_berater is null then
    select id into v_berater
      from public.berater
     where lower(slug) = lower(trim(coalesce(p_berater_slug, '')))
       and ist_aktiv
     limit 1;
  end if;
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
      reference, event_key, berater_id, empfehler_id, name, email, telefon, source,
      elternabend_interesse, conditions_version, contact_key, consent_at,
      schaetzung_cm, schaetzung_am
    ) values (
      v_reference, p_event_key, v_berater, v_empfehler, v_name, v_email, v_telefon, v_source,
      coalesce(p_elternabend_interesse, false), p_conditions_version, p_contact_key, clock_timestamp(),
      p_schaetzung_cm, case when p_schaetzung_cm is null then null else clock_timestamp() end
    );
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end;

  return jsonb_build_object('ok', true, 'reference', v_reference);
end;
$$;

commit;
