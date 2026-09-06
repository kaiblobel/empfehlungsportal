-- Phase 336: Anmeldeschluss, und die Sicht wieder eng
--
-- Das Sommerfest ist vorbei. Zwei Dinge werden zurueckgestellt.
--
-- 1. Die oeffentliche Anmeldung schliesst.
--
-- Bis hierher gab es keinen Anmeldeschluss: Die Strecke waere technisch bis in
-- den Dezember weitergelaufen. Der Schluss stand nur im Rechtstext der Seite,
-- und genau deshalb kamen nach 15 Uhr noch acht Anmeldungen herein. Der
-- Zeitpunkt hier ist der versprochene: "Jede gueltige Anmeldung bis zum
-- 6. September 2026 um 15 Uhr nimmt automatisch einmal an der Verlosung teil."
-- Code und Versprechen sagen jetzt dasselbe.
--
-- Die Schranke steht vor den Ratenzaehlern, damit nach dem Schluss nicht einmal
-- mehr Zaehlerstaende mitgeschrieben werden. Sie schliesst auch das Nachtragen
-- ueber die oeffentliche Seite (Phase 321): Niemand kann seine Schaetzung noch
-- aendern.
--
-- NICHT betroffen ist record_kidz_gewinnspiel_onsite. Die Papierzettel vom Fest
-- werden noch abgetippt, dieser Weg muss offen bleiben. Das ist kein Versehen,
-- sondern die Bedingung, unter der geschlossen wird.
--
-- 2. Die erweiterte Sicht der Berater faellt weg.
--
-- Am Festtag sah jeder Berater alle Anmeldungen, damit er am Stand nachsehen
-- konnte (Phase 333). Das war fuer den Tag gedacht. Jetzt gilt wieder: jeder
-- sieht seine eigenen, Administratoren sehen alles. Dafuer reichen die
-- bestehenden Regeln aus schema-phase172.sql, die beiden Zusatzregeln kommen
-- ersatzlos weg.
--
-- set_kidz_gewinnspiel_interesse geht auf die Fassung von Phase 324 zurueck:
-- nur die eigenen Anmeldungen, Administratoren alle. Die Sonderregel fuers
-- Sommerfest entfaellt.

begin;

-- 1. Anmeldeschluss ------------------------------------------------------------
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
  v_anmeldeschluss constant timestamptz := timestamptz '2026-09-06 15:00:00+02';
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

  -- Anmeldeschluss. Steht vor den Zaehlern, damit nach dem Schluss nichts mehr
  -- mitgeschrieben wird.
  if clock_timestamp() >= v_anmeldeschluss then
    return jsonb_build_object('ok', false, 'reason', 'closed');
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

-- 2. Die Sicht wieder eng ------------------------------------------------------
drop policy if exists kidz_gewinnspiel_team_select_sommerfest
  on public.kidz_gewinnspiel_teilnahmen;
drop policy if exists kidz_gewinnspiel_team_update_sommerfest
  on public.kidz_gewinnspiel_teilnahmen;

-- 3. Das Haekchen wieder nur an eigenen Anmeldungen ----------------------------
create or replace function public.set_kidz_gewinnspiel_interesse(
  p_participation_id uuid,
  p_interesse boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_berater uuid;
  v_is_admin boolean;
  v_berater uuid;
  v_neu boolean := coalesce(p_interesse, false);
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ interest update requires an authenticated advisor';
  end if;

  v_actor_berater := (select public.current_berater_id());
  v_is_admin := (select public.is_current_berater_admin());
  if v_actor_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'no_advisor_account');
  end if;

  select t.berater_id into v_berater
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_participation_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Kernregel: nur fuer die eigenen Teilnahmen, Administratoren fuer alle.
  if not v_is_admin and v_berater is distinct from v_actor_berater then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  update public.kidz_gewinnspiel_teilnahmen
     set elternabend_interesse = v_neu
   where id = p_participation_id;

  return jsonb_build_object('ok', true, 'interesse', v_neu);
end;
$$;

revoke execute on function public.set_kidz_gewinnspiel_interesse(uuid, boolean)
  from public, anon, service_role;
grant execute on function public.set_kidz_gewinnspiel_interesse(uuid, boolean)
  to authenticated;

comment on function public.set_kidz_gewinnspiel_interesse(uuid, boolean) is
  'Setzt die Einwilligung zu KIDZ for Future an einer bestehenden Teilnahme. Nur fuer den zugeordneten Berater, Administratoren fuer alle. Kein Spaltenrecht im Browser noetig.';

revoke execute on function public.set_kidz_gewinnspiel_interesse(uuid, boolean)
  from public, anon, service_role;
grant execute on function public.set_kidz_gewinnspiel_interesse(uuid, boolean)
  to authenticated;

commit;
