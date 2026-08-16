-- Phase 248 · Eigene Bilder je Berater für die Präsentation
--
-- Die neue Präsentation zeigt zwei Fotos, die es bisher nur von Kai gab: ein
-- Bild aus dem eigenen Büro im Einstieg und ein Teambild beim Karriere-Thema.
-- Fest verdrahtet würde auf der Seite jedes Partners Kais Büro stehen.
--
-- Deshalb drei neue Felder am Berater. Bleiben sie leer, fällt die Seite auf
-- das Portrait zurück (foto_url hat jeder) und die Bildzeile entfällt.
-- Nichts wird überschrieben, die Spalten kommen additiv dazu.

alter table public.berater add column if not exists buero_foto_url  text;
alter table public.berater add column if not exists team_foto_url   text;
alter table public.berater add column if not exists buero_bildzeile text;

comment on column public.berater.buero_foto_url  is 'Foto aus dem eigenen Büro, Hochformat, für den Einstieg der Präsentation. Leer = Portrait als Rückfall.';
comment on column public.berater.team_foto_url   is 'Team- oder Bürobild für das Karriere-Thema. Leer = Karte ohne Bild.';
comment on column public.berater.buero_bildzeile is 'Kurze Bildunterschrift zum Bürofoto, z. B. „Büro Cottbus". Leer = keine Zeile.';

-- Die öffentlichen Leser geben nur ausgewählte Spalten heraus. Ohne diese
-- Erweiterung kämen die neuen Felder nie beim Besucher an.
--
-- Postgres lässt die Rückgabe einer bestehenden Funktion nicht erweitern,
-- deshalb erst weg, dann neu. Läuft in einer Transaktion, es gibt also keinen
-- Moment, in dem die Seite ohne Berater-Daten dasteht.
drop function if exists public.get_berater_public(text);
drop function if exists public.get_berater_public_by_id(uuid);

create or replace function public.get_berater_public(p_slug text)
returns table(
  id uuid, name text, rolle text, foto_url text, bookings_url text,
  whatsapp text, telefon text, email text, slug text,
  impressum_url text, datenschutz_url text,
  buero_foto_url text, team_foto_url text, buero_bildzeile text
)
language sql
security definer
set search_path to 'public'
as $function$
  select id, name, rolle, foto_url, bookings_url, whatsapp, telefon, email, slug,
         impressum_url, datenschutz_url,
         buero_foto_url, team_foto_url, buero_bildzeile
  from public.berater where lower(slug) = lower(p_slug) and ist_aktiv limit 1;
$function$;

create or replace function public.get_berater_public_by_id(p_id uuid)
returns table(
  id uuid, name text, rolle text, foto_url text, bookings_url text,
  whatsapp text, telefon text, email text, slug text,
  impressum_url text, datenschutz_url text,
  buero_foto_url text, team_foto_url text, buero_bildzeile text
)
language sql
security definer
set search_path to 'public'
as $function$
  select id, name, rolle, foto_url, bookings_url, whatsapp, telefon, email, slug,
         impressum_url, datenschutz_url,
         buero_foto_url, team_foto_url, buero_bildzeile
  from public.berater where id = p_id and ist_aktiv limit 1;
$function$;

-- Beim Löschen gehen die Ausführungsrechte mit verloren. Ohne diese Zeilen
-- könnten anonyme Besucher die Berater-Daten nicht mehr lesen und jede
-- Kundenseite stünde ohne Namen und Foto da.
grant execute on function public.get_berater_public(text)        to anon, authenticated, service_role;
grant execute on function public.get_berater_public_by_id(uuid)  to anon, authenticated, service_role;
