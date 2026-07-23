-- =====================================================================
-- Phase 106 · Härtung: Sicherheit & Stabilität (Top-3)
--
-- Enthält drei zusammenhängende Blöcke:
--   TOP-1  RLS-Löcher schließen  (kritisch)
--   TOP-2  Booking-Zuordnung deterministisch  (Mehrberater/Prämien)
--   TOP-3c create_empfehlung_public: Server-Validierung & Längen-Caps
--
-- Idempotent formuliert (mehrfaches Ausführen ist unschädlich).
-- Ändert KEINE Signaturen → keine Client-Anpassung nötig.
-- =====================================================================


-- ---------------------------------------------------------------------
-- TOP-1 · RLS-Löcher schließen
-- ---------------------------------------------------------------------

-- (1a) KRITISCH: Anon durfte per öffentlichem Key BELIEBIG in empfehlungen
-- schreiben ("empfehlung public insert", with_check = true) — inkl. frei
-- erfundener status='kunde'-Zeilen, die über den Trigger echte Prämien
-- auslösen. Der legitime Anlege-Weg läuft ausschließlich über die
-- SECURITY-DEFINER-RPC create_empfehlung_public (umgeht RLS ohnehin),
-- diese Policy ist reine Altlast → entfernen.
drop policy if exists "empfehlung public insert" on public.empfehlungen;

-- (1b) KRITISCH: "berater public read" (SELECT to public using true) gab
-- JEDEM anonymen Aufruf ALLE Spalten ALLER Berater zurück (E-Mail, Telefon,
-- auth_user_id, bookings_url …). Öffentliches Branding läuft über die
-- begrenzten RPCs get_berater_public / get_berater_public_by_id (SECURITY
-- DEFINER, von RLS unberührt). Also: Direktzugriff auf authenticated
-- eingrenzen — das Dashboard liest weiter, Anon nicht mehr.
drop policy if exists "berater public read" on public.berater;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'berater'
      and policyname = 'berater auth read'
  ) then
    create policy "berater auth read" on public.berater
      for select to authenticated using (true);
  end if;
end $$;

-- (1c) Defense-in-depth: heikle SECURITY-DEFINER-Funktionen brauchen keine
-- anon/public-Ausführbarkeit (interne Prüfungen blocken anon zwar schon,
-- aber die Grant-Fläche gehört verkleinert). authenticated behält Zugriff.
revoke execute on function public.auszahlen_praemie(uuid, numeric, text, text, text, text, date) from anon, public;
grant  execute on function public.auszahlen_praemie(uuid, numeric, text, text, text, text, date) to authenticated;

revoke execute on function public.sync_praemien() from anon, public;
grant  execute on function public.sync_praemien() to authenticated;

revoke execute on function public.admin_set_berater_password(uuid, text) from anon, public;
grant  execute on function public.admin_set_berater_password(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- TOP-2 · Booking-Zuordnung deterministisch (Mehrberater-Schutz)
--
-- Bisher: Telefon-Fallback nahm bei mehreren Treffern still den zuletzt
-- gestarteten (order by ... desc limit 1) → bei zwei Promotern mit gleicher
-- Empfänger-Nummer konnte der Termin/die Prämie beim FALSCHEN Promoter
-- landen. Neu: Telefon-Fallback ordnet nur zu, wenn GENAU EIN Kandidat
-- passt; sonst wird NICHT geraten (return false → Event bleibt unzugeordnet
-- und kann manuell verbucht werden). Der eindeutige external_id-Match bleibt
-- unverändert. Signatur/Grants identisch.
-- ---------------------------------------------------------------------
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
  v_candidate_count int;
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

  -- Primär: eindeutiger Match über die externe Termin-ID.
  select id
    into v_empfehlung_id
    from public.empfehlungen
   where booking_external_id = left(trim(p_external_id), 180)
   limit 1;

  -- Fallback nur bei 'created' + Telefon: GENAU EIN Kandidat, sonst nicht raten.
  if v_empfehlung_id is null and v_event = 'created' and p_customer_phone is not null then
    v_phone := private.normalize_de_phone(p_customer_phone);

    select count(*)
      into v_candidate_count
      from public.empfehlungen
     where private.normalize_de_phone(empfaenger_telefon) = v_phone
       and booking_started_at >= now() - interval '30 days'
       and coalesce(ausgetragen, false) = false
       and (booking_external_id is null or booking_state = 'cancelled');

    if v_candidate_count = 1 then
      select id
        into v_empfehlung_id
        from public.empfehlungen
       where private.normalize_de_phone(empfaenger_telefon) = v_phone
         and booking_started_at >= now() - interval '30 days'
         and coalesce(ausgetragen, false) = false
         and (booking_external_id is null or booking_state = 'cancelled')
       limit 1;
    end if;
    -- v_candidate_count <> 1  → mehrdeutig oder keiner → v_empfehlung_id bleibt null
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
           booking_service_name = coalesce(
             left(nullif(trim(coalesce(p_service_name, '')), ''), 160),
             booking_service_name
           )
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
grant  execute on function public.record_booking_event_rpc(text, text, text, text, timestamptz, text) to anon;


-- ---------------------------------------------------------------------
-- TOP-3c · create_empfehlung_public: Pflichtfeld-Prüfung, Berater-Absicherung
--          und Längen-Caps auf allen Textfeldern (Spam-/Überlastbremse,
--          wirkt auch bei direktem RPC-Aufruf). Signatur unverändert.
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
  -- Pflichtfelder: ohne Name + Telefon kein Lead (verhindert Leer-/Spam-Zeilen).
  if v_name is null or v_phone is null then
    raise invalid_parameter_value using message = 'Name und Telefon sind erforderlich';
  end if;

  -- Berater-Zuordnung absichern: nur ein existierender, aktiver Berater;
  -- sonst Kai-Fallback (wie in create_empfehler). Verhindert Fehl-Attribution
  -- über einen manipulierten p_berater_id.
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
