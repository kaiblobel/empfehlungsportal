-- =====================================================================
-- Phase 161 · Mandantenschutz bei öffentlichen Empfehlungen
-- LIVE ANGEWENDET AM 06.08.2026.
-- Migration: phase161_lock_promoter_advisor
--
-- Ein Promoter gehört immer genau zu dem Berater, der in public.empfehler
-- hinterlegt ist. Eine abweichende p_berater_id wird nicht still korrigiert,
-- sondern abgewiesen. So kann auch ein manipulierter öffentlicher Aufruf
-- keine Empfehlung in ein fremdes Beraterkonto schreiben.
-- =====================================================================

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
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_name text := nullif(btrim(coalesce(p_empfaenger_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_empfaenger_telefon, '')), '');
  v_berater uuid;
  v_promoter_berater uuid;
begin
  perform private.rate_limit_check('create_empfehlung', 20, interval '1 hour');

  if v_name is null or v_phone is null then
    raise invalid_parameter_value using message = 'Name und Telefon sind erforderlich';
  end if;

  if p_empfehler_id is not null then
    select e.berater_id
      into v_promoter_berater
      from public.empfehler e
      join public.berater b on b.id = e.berater_id and b.ist_aktiv
     where e.id = p_empfehler_id
     limit 1;

    if v_promoter_berater is null then
      raise invalid_parameter_value using message = 'Promoter ist unbekannt oder keinem aktiven Berater zugeordnet';
    end if;

    if p_berater_id is not null and p_berater_id <> v_promoter_berater then
      raise insufficient_privilege using message = 'Promoter und Berater passen nicht zusammen';
    end if;

    v_berater := v_promoter_berater;
  else
    select b.id
      into v_berater
      from public.berater b
     where b.id = p_berater_id and b.ist_aktiv
     limit 1;

    if v_berater is null then
      v_berater := 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';
    end if;
  end if;

  return query
  insert into public.empfehlungen (
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

revoke execute on function public.create_empfehlung_public(
  text, text, text, text, text, text, text, uuid, uuid, text, text, text, boolean, text, text
) from public;

grant execute on function public.create_empfehlung_public(
  text, text, text, text, text, text, text, uuid, uuid, text, text, text, boolean, text, text
) to anon, authenticated, service_role;

-- Gegenprobe nach dem Einspielen:
-- Ein Aufruf mit p_empfehler_id von Berater A und p_berater_id von Berater B
-- muss mit "Promoter und Berater passen nicht zusammen" abbrechen.

-- Rollback auf den vorherigen Funktionsstand:
-- schema-phase107.sql Abschnitt "create_empfehlung_public" erneut anwenden.
-- =====================================================================
