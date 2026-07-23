-- =====================================================================
-- Phase 108 · Promoter-Code-Entropie erhöhen — vollständig rückwärtskompatibel
--
-- Problem: Promoter-Codes = Namens-Slug + nur 4 Hex-Zeichen (~65k Kombis).
-- Zwei Generatoren erzeugen sie:
--   1) public.create_empfehler()      — manuelle Anlage (md5(gen_random_uuid))
--   2) public.auto_link_empfehler()   — BEFORE-INSERT-Trigger auf empfehlungen
--                                        (legt Empfehler automatisch an; md5(random()) — noch schwächer)
-- Beide werden hier auf EINEN starken, krypto-zufälligen Generator umgestellt.
--
-- Rückwärtskompatibilität (Kernpunkte):
--   * Ein einziges Feld `code` bleibt. Alte 4-Zeichen-Codes bleiben UNVERÄNDERT gültig.
--   * Die Lese-RPCs (get_empfehler_by_code/_stats/_empfehlungen) matchen EXAKT auf
--     den String und brauchen daher KEINE Änderung — lange wie kurze Codes
--     funktionieren automatisch. Sie werden hier bewusst NICHT angefasst.
--   * `empfehler.code` hat bereits einen UNIQUE-Index (empfehler_code_key);
--     der Generator prüft zusätzlich aktiv auf Kollision (Loop bis eindeutig).
--   * Keine Client-/URL-/QR-/UX-Änderung. Bestehende Links bleiben gültig.
--
-- Neu: optionales Metrikfeld `code_version` (1 = Alt/schwach, 2 = neu/stark)
-- rein zum Monitoring — keine Leselogik hängt daran.
--
-- Idempotent; keine Funktions-Signaturen geändert.
-- ENTWURF — erst nach Freigabe live einspielen.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Metrikspalte (Monitoring). Bestandszeilen werden automatisch 1.
-- ---------------------------------------------------------------------
alter table public.empfehler
  add column if not exists code_version smallint not null default 1;


-- ---------------------------------------------------------------------
-- 2) Gemeinsamer starker Code-Generator (privat, nur von den Definer-
--    Funktionen aufrufbar). Format: <namens-slug>-<14 Zeichen Zufall>.
--    Slug bleibt für Wiedererkennung/Look; die Sicherheit steckt komplett
--    im 14-stelligen krypto-zufälligen Suffix aus einem eindeutigen
--    Alphabet (ohne 0/1/o/i/l) → ~59 Bit statt vorher ~16 Bit.
-- ---------------------------------------------------------------------
create or replace function private.generate_empfehler_code(p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';  -- 31 Zeichen, keine Verwechsler
  v_len      constant int  := 31;
  v_slug   text;
  v_suffix text;
  v_code   text;
  v_bytes  bytea;
  i        int;
  v_try    int := 0;
begin
  -- Slug aus dem Namen (kosmetisch, wie bisher).
  v_slug := lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  v_slug := substring(v_slug from 1 for 40);
  if v_slug = '' then
    v_slug := 'promoter';
  end if;

  loop
    v_try := v_try + 1;
    v_bytes := extensions.gen_random_bytes(14);
    v_suffix := '';
    for i in 0..13 loop
      v_suffix := v_suffix || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % v_len), 1);
    end loop;
    v_code := v_slug || '-' || v_suffix;

    exit when not exists (select 1 from public.empfehler where code = v_code);

    -- Praktisch nie erreicht; nach mehreren Kollisionen Suffix verlängern.
    if v_try >= 10 then
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % v_len), 1);
      exit when not exists (select 1 from public.empfehler where code = v_code);
    end if;
  end loop;

  return v_code;
end;
$$;
revoke execute on function private.generate_empfehler_code(text) from public, anon, authenticated, service_role;


-- ---------------------------------------------------------------------
-- 3) Generator-Pfad A: create_empfehler (manuelle Anlage)
--    Nur die Code-Erzeugung wird ersetzt; Berater-Auflösung/Insert bleiben.
-- ---------------------------------------------------------------------
create or replace function public.create_empfehler(p_name text, p_email text, p_telefon text, p_berater_slug text default null::text)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_code    text;
  v_berater uuid;
begin
  v_code := private.generate_empfehler_code(p_name);

  if p_berater_slug is not null and p_berater_slug <> '' then
    select id into v_berater from public.berater
    where lower(slug) = lower(p_berater_slug) and ist_aktiv limit 1;
  end if;
  if v_berater is null then
    v_berater := 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'; -- Kai-Fallback
  end if;

  insert into public.empfehler (code, name, email, telefon, berater_id, code_version)
  values (v_code, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_telefon), ''), v_berater, 2);

  return v_code;
end;
$function$;
-- Grants bleiben wie gehabt (create or replace erhält sie); zur Sicherheit erneut:
grant execute on function public.create_empfehler(text, text, text, text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4) Generator-Pfad B: auto_link_empfehler (BEFORE-INSERT-Trigger auf empfehlungen)
--    Matching-Logik unverändert; nur der neu erzeugte Code wird stark + code_version=2.
--    Der Trigger selbst (empfehlungen_auto_link_empfehler) bleibt bestehen.
-- ---------------------------------------------------------------------
create or replace function public.auto_link_empfehler()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id    uuid;
  v_code  text;
  v_clean text;
begin
  if new.empfehler_id is not null then return new; end if;
  if new.empfehler_name is null or trim(new.empfehler_name) = '' then return new; end if;

  v_clean := trim(new.empfehler_name);

  -- Match: case-insensitive Name + gleicher Berater (oder NULL)
  select id into v_id from public.empfehler
  where lower(trim(name)) = lower(v_clean)
    and (berater_id = new.berater_id or berater_id is null or new.berater_id is null)
  order by (berater_id = new.berater_id) desc nulls last, created_at desc
  limit 1;

  if v_id is null then
    v_code := private.generate_empfehler_code(v_clean);
    insert into public.empfehler (name, code, berater_id, code_version)
    values (v_clean, v_code, new.berater_id, 2)
    returning id into v_id;
  end if;

  new.empfehler_id := v_id;
  return new;
end;
$function$;


-- ---------------------------------------------------------------------
-- 5) Lese-RPCs: BEWUSST UNVERÄNDERT.
--    get_empfehler_by_code / get_empfehler_stats / get_empfehler_empfehlungen
--    machen `where code = p_code` (exakter String-Match) + haben das in Phase 107
--    ergänzte Rate-Limit. Lange und kurze Codes funktionieren dort ohne Änderung.
--    Kein Eingriff nötig → kein Risiko, die gerade gehärteten Funktionen erneut anzufassen.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- Monitoring (nach dem Einspielen):
--   select code_version, count(*) from public.empfehler group by 1 order by 1;
--   -> zeigt Alt-(1) vs. Neu-(2)-Codes.
-- ---------------------------------------------------------------------
