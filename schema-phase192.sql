-- Phase 192: Ballschaetzung, Nacherfassung der Papierzettel und neue KIDZ-Promoter
-- NOCH NICHT ANGEWENDET. Anzuwenden als phase_192_kidz_schaetzung_nacherfassung.
--
-- Reihenfolge: Diese Migration MUSS vor der Veroeffentlichung des neuen Codes laufen.
-- Sie laesst die bisherige Fassung 2026-08-12-v4 weiter zu, der alte Stand bleibt also
-- waehrend des Uebergangs funktionsfaehig.
--
-- Hintergrund: Der Hauptgewinn wird nicht mehr ausgelost, sondern erschaetzt. Wer den
-- Umfang des XXL-Balls am genauesten schaetzt, gewinnt Platz 1 (Survival Event).
-- Anmelden geht online oder vor Ort auf dem Gewinnspiel-Flyer; Papierzettel werden
-- vom Team ueber record_kidz_gewinnspiel_onsite in dieselbe Liste nachgetragen.

begin;

-- 1. Schaetzung an der Teilnahme -------------------------------------------------

alter table public.kidz_gewinnspiel_teilnahmen
  add column if not exists schaetzung_cm smallint,
  add column if not exists schaetzung_am timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.kidz_gewinnspiel_teilnahmen'::regclass
       and conname = 'kidz_gewinnspiel_schaetzung'
  ) then
    alter table public.kidz_gewinnspiel_teilnahmen
      add constraint kidz_gewinnspiel_schaetzung
      check (schaetzung_cm is null or (schaetzung_cm between 10 and 999));
  end if;
end $$;

comment on column public.kidz_gewinnspiel_teilnahmen.schaetzung_cm is
  'Geschaetzter Umfang des XXL-Balls in Zentimetern. Entscheidet ueber Platz 1. Freiwillig, kann vor Ort nachgetragen werden.';
comment on column public.kidz_gewinnspiel_teilnahmen.schaetzung_am is
  'Zeitpunkt der letzten Aenderung der Schaetzung.';

-- Berater duerfen die Schaetzung ihrer eigenen Teilnahmen nachtragen.
-- Das vorhandene Aenderungsrecht ist bewusst spaltenweise vergeben.
grant update (schaetzung_cm, schaetzung_am)
  on table public.kidz_gewinnspiel_teilnahmen to authenticated;

-- 2. Oeffentliche Anmeldung: Schaetzung und Fassung 5 ----------------------------
-- Die alte Signatur wird ersetzt. Der neue Parameter hat einen Vorgabewert, damit ein
-- Aufruf ohne Schaetzung weiterhin funktioniert und kein Ausfallfenster entsteht.

drop function if exists public.register_kidz_gewinnspiel_public(
  text, text, text, text, text, text, text, boolean, text, text, text, boolean
);

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

revoke execute on function public.register_kidz_gewinnspiel_public(
  text, text, text, text, text, text, text, boolean, text, text, text, boolean, smallint
) from public, anon, authenticated, service_role;
grant execute on function public.register_kidz_gewinnspiel_public(
  text, text, text, text, text, text, text, boolean, text, text, text, boolean, smallint
) to anon;

-- 3. Nacherfassung der Papierzettel ----------------------------------------------
-- Aufruf ausschliesslich ueber /api/kidz-nacherfassung: die Serverfunktion kennt das
-- Registrierungsgeheimnis und bildet den Dublettenschluessel zeichengleich zur
-- oeffentlichen Anmeldung. Das Berater-Token wird durchgereicht, deshalb bleibt die
-- Datenbank die Rechteinstanz.

create or replace function public.record_kidz_gewinnspiel_onsite(
  p_secret text,
  p_event_key text,
  p_berater_slug text,
  p_name text,
  p_email text,
  p_telefon text,
  p_schaetzung_cm smallint,
  p_elternabend_interesse boolean,
  p_conditions_version text,
  p_contact_key text,
  p_contact_key_alt text,
  p_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_actor_berater uuid;
  v_is_admin boolean;
  v_berater uuid;
  v_empfehler uuid;
  v_name text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 100);
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_telefon text := nullif(trim(coalesce(p_telefon, '')), '');
  v_phone_digits text;
  v_slug text := nullif(lower(trim(coalesce(p_berater_slug, ''))), '');
  v_source constant text := 'flyer';
  v_existing record;
  v_reference text;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'kidz_giveaway_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'KIDZ onsite capture authentication failed';
  end if;

  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ onsite capture requires an authenticated advisor';
  end if;

  v_actor_berater := (select public.current_berater_id());
  v_is_admin := (select public.is_current_berater_admin());
  if v_actor_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'no_advisor_account');
  end if;

  -- Grosszuegige Bremse gegen einen ausser Kontrolle geratenen Massenimport.
  -- Der Schluessel muss ein Hex-Hash sein, das verlangt die Zaehlfunktion.
  perform private.rate_limit_check_key(
    'kidz_onsite_day',
    encode(extensions.digest('kidz-onsite:' || v_actor_berater::text, 'sha256'), 'hex'),
    300, interval '24 hours');

  if p_consent is not true
     or p_event_key <> 'kidz-sommerfest-2026'
     or p_conditions_version <> '2026-08-12-v5'
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or (p_contact_key_alt is not null and p_contact_key_alt !~ '^[0-9a-f]{64}$')
     or (p_schaetzung_cm is not null and p_schaetzung_cm not between 10 and 999) then
    raise invalid_parameter_value using message = 'Invalid KIDZ onsite capture';
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

  -- Zuordnung: ohne Angabe erfasst der Berater fuer sich selbst.
  if v_slug is null then
    v_berater := v_actor_berater;
  else
    select e.berater_id, e.empfehler_id
      into v_berater, v_empfehler
      from public.kidz_gewinnspiel_einladende e
     where lower(e.key) = v_slug and e.ist_aktiv
     limit 1;

    if v_berater is null then
      select id into v_berater
        from public.berater
       where lower(slug) = v_slug and ist_aktiv
       limit 1;
    end if;
    if v_berater is null then
      return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
    end if;
  end if;

  -- Kernregel: nur fuer sich selbst, Administratoren fuer jeden.
  if not v_is_admin and v_berater <> v_actor_berater then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- Dublettenpruefung: Schluessel, Ersatzschluessel und Klartext.
  select t.reference, t.berater_id
    into v_existing
    from public.kidz_gewinnspiel_teilnahmen t
   where t.event_key = p_event_key
     and ( t.contact_key = p_contact_key
        or (p_contact_key_alt is not null and t.contact_key = p_contact_key_alt)
        or (v_email is not null and lower(t.email) = v_email)
        or (v_phone_digits <> '' and regexp_replace(coalesce(t.telefon, ''), '\D', '', 'g') = v_phone_digits) )
   limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_exists',
      'reference', case when v_is_admin or v_existing.berater_id = v_actor_berater
                        then v_existing.reference end);
  end if;

  v_reference := 'KIDZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  begin
    insert into public.kidz_gewinnspiel_teilnahmen (
      reference, event_key, berater_id, empfehler_id, name, email, telefon, source,
      elternabend_interesse, conditions_version, contact_key, consent_at,
      schaetzung_cm, schaetzung_am
    ) values (
      v_reference, p_event_key, v_berater, v_empfehler, v_name, v_email, v_telefon, v_source,
      coalesce(p_elternabend_interesse, false), p_conditions_version, p_contact_key,
      timestamptz '2026-09-06 12:00:00+02',
      p_schaetzung_cm, case when p_schaetzung_cm is null then null else clock_timestamp() end
    );
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end;

  return jsonb_build_object('ok', true, 'reference', v_reference);
end;
$$;

comment on function public.record_kidz_gewinnspiel_onsite(
  text, text, text, text, text, text, smallint, boolean, text, text, text, boolean) is
  'Nacherfassung der Papierzettel vom KIDZ-Sommerfest. Nur fuer angemeldete Berater und nur ueber die Serverfunktion, die den Dublettenschluessel bildet. consent_at ist der Veranstaltungstag, created_at der Erfassungszeitpunkt.';

revoke execute on function public.record_kidz_gewinnspiel_onsite(
  text, text, text, text, text, text, smallint, boolean, text, text, text, boolean
) from public, anon, service_role;
grant execute on function public.record_kidz_gewinnspiel_onsite(
  text, text, text, text, text, text, smallint, boolean, text, text, text, boolean
) to authenticated;

-- 4. KIDZ-Einladende aktualisieren -----------------------------------------------
-- Anika Biebrach wird nur deaktiviert, nicht geloescht: So verschwindet sie sofort aus
-- der oeffentlichen Auswahl, eine spaete Anmeldung ueber ihren alten Link bleibt aber
-- zuordenbar. Sie hat keine Teilnahmen und keine Empfehlungen.

update public.kidz_gewinnspiel_einladende
   set ist_aktiv = false
 where key = 'promoter-anika-bibrach';

-- Anja Scholz ist bereits als Promoter vorhanden, allerdings mit verungluecktem Namen.
-- Der Promoter-Code bleibt unveraendert, damit ein bereits geteilter Link weiter gilt.
update public.empfehler
   set name = 'Anja Scholz'
 where code = 'anjasscholz-646f';

-- Sandra Röhrens gibt es noch nicht. Der Promoter-Code wird erzeugt und steht bewusst
-- nicht in dieser Datei: Codes sind Zugangsschluessel und gehoeren nicht ins Repository.
insert into public.empfehler (code, name, berater_id)
select 'sandra-roehrens-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 14),
       'Sandra Röhrens', b.id
  from public.berater b
 where b.slug = 'claudius-tusche'
   and not exists (
     select 1 from public.empfehler e
      where e.name = 'Sandra Röhrens' and e.berater_id = b.id);

insert into public.kidz_gewinnspiel_einladende (key, name, berater_id, empfehler_id, ist_aktiv)
select 'promoter-anja-scholz', 'Anja Scholz', e.berater_id, e.id, true
  from public.empfehler e
 where e.name = 'Anja Scholz'
   and e.berater_id = (select id from public.berater where slug = 'sven-augustin')
 limit 1
on conflict (key) do update
  set name = excluded.name,
      berater_id = excluded.berater_id,
      empfehler_id = excluded.empfehler_id,
      ist_aktiv = true;

insert into public.kidz_gewinnspiel_einladende (key, name, berater_id, empfehler_id, ist_aktiv)
select 'promoter-sandra-roehrens', 'Sandra Röhrens', e.berater_id, e.id, true
  from public.empfehler e
 where e.name = 'Sandra Röhrens'
   and e.berater_id = (select id from public.berater where slug = 'claudius-tusche')
 limit 1
on conflict (key) do update
  set name = excluded.name,
      berater_id = excluded.berater_id,
      empfehler_id = excluded.empfehler_id,
      ist_aktiv = true;

commit;
