-- =====================================================================
-- Phase 305 · Das Büroprofil öffentlich lesbar machen (nur die Fußzeilen-Felder)
--
-- Warum: Die KIDZ-Seiten tragen Bezeichnung, Anschrift, Rufnummer und
-- E-Mail fest im HTML. Sie sollen aus dem Büroprofil kommen, damit die
-- Angaben an einer Stelle stehen. Die Tabelle public.buero ist für
-- anonyme Zugriffe aber gesperrt (Phase 303), und das bleibt auch so.
-- Deshalb dieselbe Bauart wie bei get_berater_public: eine Funktion mit
-- fester Feldliste, die stellvertretend liest.
--
-- Herausgegeben werden NUR Angaben, die ohnehin auf jeder dieser Seiten
-- stehen. Interne Felder der Tabelle (id, created_at, Bilder) bleiben
-- drin.
--
-- Die Seiten sind bewusst beraterunabhängig: Bei Gewinnspiel und
-- Sommerfest ist die Angabe die des Veranstalters, und Veranstalter ist
-- die Regionaldirektion, nicht der einzelne Berater. Bei kidz-konzept ist
-- es eine Kontaktangabe des Büros. Keine dieser Seiten löst heute einen
-- Berater auf, keine hat ein data-bb-Feld.
--
-- Solange es genau ein Büro gibt, liefert die Funktion dieses. Kommt ein
-- zweites dazu, gibt sie nichts zurück, bis sie um einen Parameter
-- erweitert wird — lieber eine leere Fußzeile (die Seiten behalten dann
-- ihren HTML-Text) als die Anschrift des falschen Büros.
--
-- Idempotent.
-- =====================================================================

-- Die Kontaktadresse, die heute schon auf kidz-konzept.html steht und im
-- Impressum als Kontakt genannt ist.
update public.buero
   set email = 'Kai.Blobel@dvag.de'
 where bezeichnung = 'Regionaldirektion Kai Blobel & Team'
   and email is null;

-- Schreibweise der Rufnummer: so, wie Kunden sie erwarten und wie sie
-- heute auf kidz-konzept steht. Der tel:-Link wird daraus im Browser
-- gebildet (js/berater-brand.js, rufnummer()) und ergibt +4935549497303.
update public.buero
   set telefon = '0355 49497303'
 where bezeichnung = 'Regionaldirektion Kai Blobel & Team';

create or replace function public.get_buero_public()
returns table (
  bezeichnung text, wortmarke text, adresse text,
  telefon text, email text, website_url text,
  impressum_url text, datenschutz_url text, emblem_url text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select o.bezeichnung, o.wortmarke, o.adresse,
         o.telefon, o.email, o.website_url,
         o.impressum_url, o.datenschutz_url, o.emblem_url
    from public.buero o
   -- Nur solange die Zuordnung eindeutig ist. Siehe Kopf.
   where (select count(*) from public.buero) = 1;
$function$;

revoke all on function public.get_buero_public() from public;
grant execute on function public.get_buero_public() to anon, authenticated, service_role;

comment on function public.get_buero_public() is
  'Öffentliche Büroangaben für Fußzeilen (Phase 305). Liest stellvertretend '
  'aus public.buero, die selbst für anon gesperrt ist. Liefert nur, solange '
  'genau ein Büro existiert.';

-- ---------------------------------------------------------------------
-- KONTROLLE nach dem Einspielen:
--
--   select * from public.get_buero_public();
--   → eine Zeile, telefon = '0355 49497303', email gefüllt
--
--   Anonym (mit dem öffentlichen Schlüssel):
--     POST /rest/v1/rpc/get_buero_public   → liefert die Zeile
--     GET  /rest/v1/buero?select=*         → muss weiterhin abweisen
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- ROLLBACK:
--   drop function if exists public.get_buero_public();
-- Die beiden updates oben sind Datenpflege und werden nicht zurückgesetzt.
-- ---------------------------------------------------------------------
