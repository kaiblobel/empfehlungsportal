-- Phase 345 (11.09.2026): Unfertige Themen sind für Empfehlungen gesperrt.
--
-- vorlagen.in_arbeit gibt es seit Phase 22, war aber nur eine Markierung in der
-- Themen-Verwaltung ("für deine Kontakte ändert sich nichts") und stand bei allen
-- Zeilen auf true. Jetzt ist es die Sperre: Ein Thema mit in_arbeit kann niemand
-- wählen, und wer einen alten Link darauf öffnet, landet auf der allgemeinen
-- Seite (api/share.js). Freigegeben sind nur Themen mit fertiger eigener Seite.
-- Allgemein ist nie gesperrt, es ist der Rückfall.
--
-- Eingespielt am 11.09.2026 in zwei Schritten (Daten, dann Funktion).

-- 1) Sicherung und Daten
create table if not exists public.vorlagen_sicherung_2026_09_11 as select * from public.vorlagen;
alter table public.vorlagen_sicherung_2026_09_11 enable row level security;
revoke all on public.vorlagen_sicherung_2026_09_11 from anon, authenticated;
update public.vorlagen set in_arbeit = false where slug in ('allgemein', 'baufi', 'kinder');
update public.vorlagen set in_arbeit = true where slug not in ('allgemein', 'baufi', 'kinder');

-- 2) create_empfehlung_public: gesperrtes oder unbekanntes Thema wird Allgemein.
--    Signatur, security definer, search_path und Rechte bleiben (create or replace,
--    kein drop). Alles andere ist unverändert gegenüber dem Live-Stand vom 11.09.
create or replace function public.create_empfehlung_public(
  p_empfaenger_name text,
  p_empfaenger_telefon text,
  p_empfehler_name text default null::text,
  p_empfehler_nachricht text default null::text,
  p_nachricht text default null::text,
  p_typ text default 'direkt'::text,
  p_vorlage_slug text default 'allgemein'::text,
  p_empfehler_id uuid default null::uuid,
  p_berater_id uuid default null::uuid,
  p_empfaenger_beruf text default null::text,
  p_empfaenger_verbindung text default null::text,
  p_empfaenger_kontext text default null::text,
  p_empfehler_vorinformiert boolean default false,
  p_beste_erreichbarkeit text default null::text,
  p_bevorzugter_kanal text default null::text
)
returns table(id uuid, link_token text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_name text := nullif(btrim(coalesce(p_empfaenger_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_empfaenger_telefon, '')), '');
  v_thema text := lower(left(coalesce(nullif(btrim(coalesce(p_vorlage_slug, '')), ''), 'allgemein'), 60));
  v_berater uuid;
  v_promoter_berater uuid;
begin
  perform private.rate_limit_check('create_empfehlung', 20, interval '1 hour');

  if v_name is null or v_phone is null then
    raise invalid_parameter_value using message = 'Name und Telefon sind erforderlich';
  end if;

  -- Phase 345: nur freigegebene Themen. Gesperrt oder unbekannt heißt Allgemein.
  if v_thema <> 'allgemein' and not exists (
    select 1 from public.vorlagen v
     where v.slug = v_thema and coalesce(v.aktiv, false) and not v.in_arbeit
  ) then
    v_thema := 'allgemein';
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
    v_thema,
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
