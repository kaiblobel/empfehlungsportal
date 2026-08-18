-- Phase 291 · Jeder Berater bringt seine eigene Anschrift mit
--
-- AUSGEFÜHRT am 18.08.2026 auf kkseqhmfubzfyloffkwe.
-- Danach als anonymer Besucher gegengeprüft: beide Funktionen liefern die
-- Spalte, security definer und search_path stehen, die Ausführungsrechte für
-- anon, authenticated und service_role sind wieder gesetzt. Die Beraterauswahl
-- der KIDZ-Anmeldeseiten (list_kidz_berater_public) liefert unverändert ihre
-- Einträge. Kais Anschrift ist eingetragen, die der Partner stehen aus.
--
-- Auf den Kundenseiten steht die Anschrift bisher fest im HTML:
-- „An der Wachsbleiche 1a · 03046 Cottbus". Auf der Seite eines Partners aus
-- einer anderen Stadt ist das eine falsche Absenderangabe, und zwar nicht als
-- Schönheitsfehler, sondern als Impressumsangabe.
--
-- Deshalb ein Feld am Berater. Bleibt es leer, entfällt die Zeile ganz. Es
-- fällt bewusst NICHT auf eine andere Anschrift zurück: lieber keine Angabe
-- als eine fremde.
--
-- ACHTUNG BEIM AUSFÜHREN
-- Die beiden Lesefunktionen müssen gelöscht und neu angelegt werden, weil
-- Postgres die Rückgabeliste einer bestehenden Funktion nicht erweitern lässt
-- (ERROR: cannot change return type of existing function). Beim Löschen gehen
-- Ausführungsrechte, security definer und search_path mit verloren. Fehlt eine
-- dieser Zeilen danach, steht auf JEDER Kundenseite still wieder Kai, ohne
-- Fehlermeldung. Deshalb läuft alles in einer Transaktion.
--
-- Der Supabase-SQL-Editor öffnet von sich aus schon eine Transaktion. Das
-- „begin" darunter meldet dann eine Warnung („there is already a transaction
-- in progress"). Die ist harmlos. Beim Ausführen über psql oder die
-- Management-API ist die Klammer dagegen nötig.

begin;

alter table public.berater add column if not exists adresse text;

comment on column public.berater.adresse is
  'Geschäftsanschrift in einer Zeile, z. B. „An der Wachsbleiche 1a · 03046 Cottbus". Leer = die Zeile entfällt, es wird nie eine fremde Anschrift gezeigt.';

-- Die öffentlichen Leser geben nur ausgewählte Spalten heraus. Ohne diese
-- Erweiterung käme das neue Feld nie beim Besucher an.
--
-- Die neue Spalte steht in beiden Listen HINTEN. Reihenfolge und Schreibweise
-- müssen zwischen „returns table" und „select" zeichengenau übereinstimmen:
-- Bei zwei benachbarten text-Spalten meldet Postgres eine Vertauschung nicht,
-- die Werte kämen dann still falsch an.
drop function if exists public.get_berater_public(text);
drop function if exists public.get_berater_public_by_id(uuid);

create or replace function public.get_berater_public(p_slug text)
returns table(
  id uuid, name text, rolle text, foto_url text, bookings_url text,
  whatsapp text, telefon text, email text, slug text,
  impressum_url text, datenschutz_url text,
  buero_foto_url text, team_foto_url text, buero_bildzeile text,
  adresse text
)
language sql
security definer
set search_path to 'public'
as $function$
  select id, name, rolle, foto_url, bookings_url, whatsapp, telefon, email, slug,
         impressum_url, datenschutz_url,
         buero_foto_url, team_foto_url, buero_bildzeile,
         adresse
  from public.berater where lower(slug) = lower(p_slug) and ist_aktiv limit 1;
$function$;

create or replace function public.get_berater_public_by_id(p_id uuid)
returns table(
  id uuid, name text, rolle text, foto_url text, bookings_url text,
  whatsapp text, telefon text, email text, slug text,
  impressum_url text, datenschutz_url text,
  buero_foto_url text, team_foto_url text, buero_bildzeile text,
  adresse text
)
language sql
security definer
set search_path to 'public'
as $function$
  select id, name, rolle, foto_url, bookings_url, whatsapp, telefon, email, slug,
         impressum_url, datenschutz_url,
         buero_foto_url, team_foto_url, buero_bildzeile,
         adresse
  from public.berater where id = p_id and ist_aktiv limit 1;
$function$;

-- Beim Löschen gehen die Ausführungsrechte mit verloren. Ohne diese Zeilen
-- könnten anonyme Besucher die Berater-Daten nicht mehr lesen und jede
-- Kundenseite stünde ohne Namen und Foto da.
grant execute on function public.get_berater_public(text)        to anon, authenticated, service_role;
grant execute on function public.get_berater_public_by_id(uuid)  to anon, authenticated, service_role;

commit;

-- ---------------------------------------------------------------------------
-- DANACH PRÜFEN, und zwar als anonymer Besucher, nicht als Angemeldeter.
-- Ein Aufruf als Admin sieht auch dann gut aus, wenn die Rechte fehlen.
--
--   select * from public.get_berater_public('kai-blobel');
--
-- Erwartet: eine Zeile mit einer Spalte „adresse" (zunächst leer).
-- Kommt „function not found in schema cache" oder null Zeilen, fehlt eine der
-- Zeilen oben. Dann NICHT weitermachen, sondern das Skript erneut ausführen.
--
-- Der schnellste Gegencheck im Browser: /promoter-start.html mit einem
-- gültigen Berater-Kürzel öffnen. Diese Seite ist die einzige, die bei einem
-- Rechteproblem sichtbar meckert; alle anderen zeigen still wieder Kai.
--
-- Anschließend die Anschriften pflegen (Beraterkonten → Berater aufklappen),
-- BEVOR eine Kundenseite die Zeile anzeigt. Sonst bleibt sie überall leer und
-- niemand merkt, dass nur die Pflege fehlt.
-- ---------------------------------------------------------------------------
