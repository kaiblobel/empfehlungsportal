-- Phase 322: Die Bremse pro Anschluss passt zum Festgelaende
--
-- Die Anmeldung zaehlte 5 Versuche je Stunde und 15 je Tag pro Internetanschluss.
-- Das ist eine sinnvolle Bremse, solange sich Leute einzeln von zu Hause
-- anmelden. Auf dem Festgelaende ist es eine Falle: Wer ueber dasselbe WLAN oder
-- denselben Mobilfunk-Knoten geht, teilt sich eine Adresse. Ab der sechsten
-- Anmeldung in einer Stunde haetten alle weiteren "Zu viele Anfragen" bekommen,
-- und niemand am Stand haette verstanden, warum.
--
-- Am 6. September kommt hinzu, dass die 97 vorab Angemeldeten ihre Schaetzung
-- nachtragen (Phase 321). Jeder Nachtrag ist eine weitere Anfrage an derselben
-- Adresse.
--
-- Neu: 60 je Stunde und 300 je Tag pro Anschluss.
--
-- Was NICHT gelockert wird, weil es der eigentliche Schutz ist:
--   * Der Bot-Schutz von Cloudflare sitzt vor jeder Anmeldung.
--   * Die Grenze von 3 Versuchen je Kontakt und Tag bleibt. Sie verhindert das,
--     was man wirklich verhindern will: dass eine Person hundert Anmeldungen
--     absetzt. Die Bremse pro Anschluss kann das ohnehin nicht, sie trifft nur
--     alle, die zufaellig denselben Weg ins Netz nehmen.
--
-- Sonst ist die Funktion Zeichen fuer Zeichen die aus Phase 321.

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
  p_schaetzung_cm smallint default null,
  p_begleitpersonen smallint default null
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
  v_vorhanden_id uuid;
  v_alte_schaetzung smallint;
  v_altes_interesse boolean;
  v_schaetzung_neu boolean;
  v_interesse_neu boolean;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets where name = 'kidz_giveaway_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'KIDZ giveaway registration authentication failed';
  end if;

  perform private.rate_limit_check_key('kidz_giveaway_hour', p_rate_key, 60, interval '1 hour');
  perform private.rate_limit_check_key('kidz_giveaway_day', p_rate_key, 300, interval '24 hours');
  perform private.rate_limit_check_key('kidz_giveaway_contact_day', p_contact_key, 3, interval '24 hours');

  if p_consent is not true
     or p_event_key <> 'kidz-sommerfest-2026'
     or p_conditions_version not in ('2026-08-11-v1', '2026-08-11-v2', '2026-08-11-v3', '2026-08-12-v4', '2026-08-12-v5')
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or (p_schaetzung_cm is not null and p_schaetzung_cm not between 10 and 999)
     or (p_begleitpersonen is not null and p_begleitpersonen not between 0 and 20)
     or v_source not in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt') then
    raise invalid_parameter_value using message = 'Invalid KIDZ giveaway registration';
  end if;

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

  select e.berater_id, e.empfehler_id into v_berater, v_empfehler
    from public.kidz_gewinnspiel_einladende e
   where lower(e.key) = lower(trim(coalesce(p_berater_slug, ''))) and e.ist_aktiv
   limit 1;

  if v_berater is null then
    select id into v_berater from public.berater
     where lower(slug) = lower(trim(coalesce(p_berater_slug, ''))) and ist_aktiv limit 1;
  end if;
  if v_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;

  -- Vorhandene Anmeldung: ergaenzen statt ablehnen.
  select t.id, t.schaetzung_cm, t.elternabend_interesse, t.reference
    into v_vorhanden_id, v_alte_schaetzung, v_altes_interesse, v_reference
    from public.kidz_gewinnspiel_teilnahmen t
   where t.event_key = p_event_key and t.contact_key = p_contact_key
   limit 1;

  if v_vorhanden_id is not null then
    v_schaetzung_neu := (p_schaetzung_cm is not null and v_alte_schaetzung is null);
    v_interesse_neu := (coalesce(p_elternabend_interesse, false) and not coalesce(v_altes_interesse, false));

    if v_schaetzung_neu or v_interesse_neu then
      update public.kidz_gewinnspiel_teilnahmen
         set schaetzung_cm = case when v_schaetzung_neu then p_schaetzung_cm else schaetzung_cm end,
             schaetzung_am = case when v_schaetzung_neu then clock_timestamp() else schaetzung_am end,
             elternabend_interesse = elternabend_interesse or coalesce(p_elternabend_interesse, false)
       where id = v_vorhanden_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'reference', v_reference,
      'updated', true,
      'guessAdded', v_schaetzung_neu,
      'interestAdded', v_interesse_neu,
      'guessKept', (p_schaetzung_cm is not null and v_alte_schaetzung is not null)
    );
  end if;

  v_reference := 'KIDZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  begin
    insert into public.kidz_gewinnspiel_teilnahmen (
      reference, event_key, berater_id, empfehler_id, name, email, telefon, source,
      elternabend_interesse, conditions_version, contact_key, consent_at,
      schaetzung_cm, schaetzung_am, begleitpersonen
    ) values (
      v_reference, p_event_key, v_berater, v_empfehler, v_name, v_email, v_telefon, v_source,
      coalesce(p_elternabend_interesse, false), p_conditions_version, p_contact_key, clock_timestamp(),
      p_schaetzung_cm, case when p_schaetzung_cm is null then null else clock_timestamp() end,
      p_begleitpersonen
    );
  exception when unique_violation then
    -- Zwei Anfragen gleichzeitig, etwa bei einem Doppelklick. Die erste hat den
    -- Eintrag samt Schaetzung angelegt, hier ist nichts mehr zu ergaenzen.
    select t.reference into v_reference
      from public.kidz_gewinnspiel_teilnahmen t
     where t.event_key = p_event_key and t.contact_key = p_contact_key
     limit 1;
    return jsonb_build_object('ok', true, 'reference', v_reference, 'updated', true,
                              'guessAdded', false, 'interestAdded', false, 'guessKept', false);
  end;

  return jsonb_build_object('ok', true, 'reference', v_reference);
end;
$$;

commit;
