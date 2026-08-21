-- =====================================================================
-- Phase 304 · Kundenseiten erben fehlende Angaben vom Büro
--
-- Seit Phase 303 gibt es public.buero. Diese Phase lässt die beiden
-- öffentlichen Lesefunktionen fehlende Beraterangaben von dort holen:
--   coalesce(nullif(btrim(b.feld), ''), o.feld)
-- Ein eigener Wert schlägt den Bürowert immer. Nur wo beim Berater
-- nichts steht, greift das Büro.
--
-- ---------------------------------------------------------------------
-- WAS GEERBT WIRD (sechs Felder):
--   adresse, datenschutz_url, bookings_url,
--   buero_foto_url, team_foto_url, buero_bildzeile
--
-- WAS NICHT GEERBT WIRD — und warum. Bitte nicht "vervollständigen":
--
--   whatsapp   persönlicher Anschluss. Ein Kunde auf der Seite von
--              Berater X darf nicht bei Berater Y klingeln. Genau
--              deshalb fiel in Phase 298 der Spalten-Standardwert weg.
--   telefon    dito. Die Bürorufnummer steht zwar in public.buero, sie
--              gehört aber nicht automatisch auf eine fremde
--              Beraterseite.
--   impressum_url
--              Das DVAG-Impressum nennt Kai persönlich mit Anschrift,
--              Rufnummer und drei personengebundenen Registernummern
--              nach §34d, §34f und §34i GewO. Auf der Kundenseite eines
--              anderen Beraters wäre diese Angabe schlicht falsch. Ein
--              fehlendes Impressum fällt auf und wird nachgetragen;
--              ein falsches fällt niemandem auf.
--   email      persönlich, gleiche Linie wie Telefon.
--   name, rolle, foto_url, slug, id
--              Identität. Wird nie geteilt.
--
--   datenschutz_url WIRD dagegen geerbt: verantwortliche Stelle ist die
--              DVAG AG Frankfurt, im Dokument steht kein Beratername,
--              es ist bei jedem Vermögensberater identisch.
--   bookings_url WIRD geerbt: der zentrale Kalender heißt
--              "Regionaldirektion Kai Blobel & Team", der Kunde sieht
--              also, dass er beim Büro bucht. Übergang, bis jeder
--              Berater einen eigenen Link hat.
-- ---------------------------------------------------------------------
--
-- Zusätzlich liefert jede Funktion je geerbtem Feld ein
-- Herkunftskennzeichen ('berater' oder 'buero'). Die Kundenseiten lesen
-- benannt und ignorieren die Zusatzspalten; gebraucht werden sie in der
-- Selbstpflege-Maske, damit dort ein geerbter Wert nicht versehentlich
-- als eigener festgeschrieben wird.
--
-- ACHTUNG beim Einspielen: Die Rückgabe bekommt sechs Spalten dazu,
-- deshalb geht kein "create or replace" — Postgres lässt den Rückgabetyp
-- einer bestehenden Funktion nicht ändern. Es muss drop + create sein,
-- und zwar in EINER Transaktion, sonst fehlt die Funktion für einen
-- Moment und Kundenseiten laufen ins Leere. Die Ausführungsrechte
-- verschwinden mit dem drop und werden unten neu gesetzt (Stand vorher:
-- PUBLIC, anon, authenticated, service_role).
--
-- security definer und set search_path sind Pflicht: ohne definer greift
-- die RLS auf public.berater und anonyme Besucher sehen gar nichts mehr.
-- =====================================================================

begin;

drop function if exists public.get_berater_public(text);
drop function if exists public.get_berater_public_by_id(uuid);

create function public.get_berater_public(p_slug text)
returns table (
  id uuid, name text, rolle text, foto_url text, bookings_url text,
  whatsapp text, telefon text, email text, slug text,
  impressum_url text, datenschutz_url text,
  buero_foto_url text, team_foto_url text, buero_bildzeile text,
  adresse text,
  -- Herkunft je geerbtem Feld
  bookings_url_quelle text, datenschutz_url_quelle text,
  buero_foto_url_quelle text, team_foto_url_quelle text,
  buero_bildzeile_quelle text, adresse_quelle text
)
language sql
security definer
set search_path to 'public'
as $function$
  select b.id, b.name, b.rolle, b.foto_url,
         coalesce(nullif(btrim(b.bookings_url), ''),    o.bookings_url)    as bookings_url,
         b.whatsapp,                 -- nicht vererbt: persönlicher Anschluss
         b.telefon,                  -- nicht vererbt: persönlicher Anschluss
         b.email,                    -- nicht vererbt: persönlich
         b.slug,
         b.impressum_url,            -- nicht vererbt: nennt eine bestimmte Person
         coalesce(nullif(btrim(b.datenschutz_url), ''), o.datenschutz_url) as datenschutz_url,
         coalesce(nullif(btrim(b.buero_foto_url), ''),  o.buero_foto_url)  as buero_foto_url,
         coalesce(nullif(btrim(b.team_foto_url), ''),   o.team_foto_url)   as team_foto_url,
         coalesce(nullif(btrim(b.buero_bildzeile), ''), o.buero_bildzeile) as buero_bildzeile,
         coalesce(nullif(btrim(b.adresse), ''),         o.adresse)         as adresse,
         case when nullif(btrim(b.bookings_url), '')    is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.datenschutz_url), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_foto_url), '')  is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.team_foto_url), '')   is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_bildzeile), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.adresse), '')         is not null then 'berater' else 'buero' end
    from public.berater b
    left join public.buero o on o.id = b.buero_id
   where lower(b.slug) = lower(p_slug) and b.ist_aktiv
   limit 1;
$function$;

create function public.get_berater_public_by_id(p_id uuid)
returns table (
  id uuid, name text, rolle text, foto_url text, bookings_url text,
  whatsapp text, telefon text, email text, slug text,
  impressum_url text, datenschutz_url text,
  buero_foto_url text, team_foto_url text, buero_bildzeile text,
  adresse text,
  bookings_url_quelle text, datenschutz_url_quelle text,
  buero_foto_url_quelle text, team_foto_url_quelle text,
  buero_bildzeile_quelle text, adresse_quelle text
)
language sql
security definer
set search_path to 'public'
as $function$
  select b.id, b.name, b.rolle, b.foto_url,
         coalesce(nullif(btrim(b.bookings_url), ''),    o.bookings_url)    as bookings_url,
         b.whatsapp, b.telefon, b.email, b.slug,
         b.impressum_url,
         coalesce(nullif(btrim(b.datenschutz_url), ''), o.datenschutz_url) as datenschutz_url,
         coalesce(nullif(btrim(b.buero_foto_url), ''),  o.buero_foto_url)  as buero_foto_url,
         coalesce(nullif(btrim(b.team_foto_url), ''),   o.team_foto_url)   as team_foto_url,
         coalesce(nullif(btrim(b.buero_bildzeile), ''), o.buero_bildzeile) as buero_bildzeile,
         coalesce(nullif(btrim(b.adresse), ''),         o.adresse)         as adresse,
         case when nullif(btrim(b.bookings_url), '')    is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.datenschutz_url), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_foto_url), '')  is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.team_foto_url), '')   is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_bildzeile), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.adresse), '')         is not null then 'berater' else 'buero' end
    from public.berater b
    left join public.buero o on o.id = b.buero_id
   where b.id = p_id and b.ist_aktiv
   limit 1;
$function$;

-- Rechte wie vor dem drop.
grant execute on function public.get_berater_public(text)       to public, anon, authenticated, service_role;
grant execute on function public.get_berater_public_by_id(uuid) to public, anon, authenticated, service_role;

commit;

-- ---------------------------------------------------------------------
-- KONTROLLE nach dem Einspielen:
--
--   select prosecdef, proconfig from pg_proc
--    where proname in ('get_berater_public','get_berater_public_by_id');
--   → prosecdef true, proconfig {search_path=public}
--
--   select adresse, adresse_quelle, datenschutz_url, datenschutz_url_quelle,
--          impressum_url, telefon, whatsapp
--     from public.get_berater_public('max-kudlek');
--   → Datenschutz kommt vom Büro, Impressum bleibt leer,
--     Telefon und WhatsApp bleiben die eigenen.
--
--   select count(*) from public.list_kidz_berater_public();   -- 10
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- ROLLBACK: die Fassung aus Phase 291 wiederherstellen, ebenfalls als
-- drop + create in einer Transaktion, danach dieselben grants. Die
-- Vorlage steht in schema-phase291-berater-adresse.sql, Abschnitt
-- get_berater_public / get_berater_public_by_id.
-- ---------------------------------------------------------------------
