-- Phase 363: Instagram und Facebook des Büros auf den Kundenseiten
--
-- Kais Wunsch vom 11.09.2026: Auf der Empfängerseite „Allgemein" stehen im Fuß
-- Instagram und Facebook, und zwar die Profile von Team Wachsbleiche, wie auf
-- der KIDZ-Anmeldeseite (Phase 358).
--
-- Die Adressen gehören ins Büroprofil, nicht in die Seite. Die Seite dient allen
-- Beratern, und eine zweite Direktion im selben Portal hätte andere Profile.
-- Deshalb zwei Spalten an public.buero, und die beiden Lesefunktionen, über die
-- jede Kundenseite ihren Berater lädt, geben sie vom Büro des Beraters mit.
-- Eine eigene Abfrage braucht die Seite damit nicht.
--
-- Nicht get_buero_public: die liefert nur, solange es genau ein Büro gibt.
--
-- Nur https-Adressen. Die Seite setzt den Wert als Link, ein javascript:- oder
-- http-Wert hätte dort nichts zu suchen. Die Seite prüft das zusätzlich.
--
-- Die Werte selbst stehen nicht in dieser Datei. Welche Profile ein Büro hat,
-- sind Daten, keine Struktur (eingetragen am 12.09.2026, siehe Changelog).
--
-- Die Rückgabeliste der Lesefunktionen ändert sich, also löschen und neu
-- anlegen, in einer Transaktion. Dabei gehen Rechte, security definer und
-- search_path verloren, wenn man sie nicht wieder hinschreibt
-- (tests/berater-lesefunktionen.test.mjs).

begin;

alter table public.buero
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

alter table public.buero drop constraint if exists buero_instagram_https;
alter table public.buero add constraint buero_instagram_https
  check (instagram_url is null or instagram_url ~ '^https://');
alter table public.buero drop constraint if exists buero_facebook_https;
alter table public.buero add constraint buero_facebook_https
  check (facebook_url is null or facebook_url ~ '^https://');

drop function if exists public.get_berater_public(text);
drop function if exists public.get_berater_public_by_id(uuid);

create or replace function public.get_berater_public(p_slug text)
returns table(id uuid, name text, rolle text, foto_url text, bookings_url text, whatsapp text, telefon text, email text, slug text, impressum_url text, datenschutz_url text, buero_foto_url text, team_foto_url text, buero_bildzeile text, adresse text, bookings_url_quelle text, datenschutz_url_quelle text, buero_foto_url_quelle text, team_foto_url_quelle text, buero_bildzeile_quelle text, adresse_quelle text, instagram_url text, facebook_url text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select b.id, b.name, b.rolle, b.foto_url,
         coalesce(nullif(btrim(b.bookings_url), ''),    o.bookings_url),
         b.whatsapp, b.telefon, b.email, b.slug, b.impressum_url,
         coalesce(nullif(btrim(b.datenschutz_url), ''), o.datenschutz_url),
         coalesce(nullif(btrim(b.buero_foto_url), ''),  o.buero_foto_url),
         coalesce(nullif(btrim(b.team_foto_url), ''),   o.team_foto_url),
         coalesce(nullif(btrim(b.buero_bildzeile), ''), o.buero_bildzeile),
         coalesce(nullif(btrim(b.adresse), ''),         o.adresse),
         case when nullif(btrim(b.bookings_url), '')    is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.datenschutz_url), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_foto_url), '')  is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.team_foto_url), '')   is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_bildzeile), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.adresse), '')         is not null then 'berater' else 'buero' end,
         o.instagram_url,
         o.facebook_url
    from public.berater b
    left join public.buero o on o.id = b.buero_id
   where lower(b.slug) = lower(p_slug) and b.ist_aktiv limit 1;
$function$;

create or replace function public.get_berater_public_by_id(p_id uuid)
returns table(id uuid, name text, rolle text, foto_url text, bookings_url text, whatsapp text, telefon text, email text, slug text, impressum_url text, datenschutz_url text, buero_foto_url text, team_foto_url text, buero_bildzeile text, adresse text, bookings_url_quelle text, datenschutz_url_quelle text, buero_foto_url_quelle text, team_foto_url_quelle text, buero_bildzeile_quelle text, adresse_quelle text, instagram_url text, facebook_url text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select b.id, b.name, b.rolle, b.foto_url,
         coalesce(nullif(btrim(b.bookings_url), ''),    o.bookings_url),
         b.whatsapp, b.telefon, b.email, b.slug, b.impressum_url,
         coalesce(nullif(btrim(b.datenschutz_url), ''), o.datenschutz_url),
         coalesce(nullif(btrim(b.buero_foto_url), ''),  o.buero_foto_url),
         coalesce(nullif(btrim(b.team_foto_url), ''),   o.team_foto_url),
         coalesce(nullif(btrim(b.buero_bildzeile), ''), o.buero_bildzeile),
         coalesce(nullif(btrim(b.adresse), ''),         o.adresse),
         case when nullif(btrim(b.bookings_url), '')    is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.datenschutz_url), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_foto_url), '')  is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.team_foto_url), '')   is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.buero_bildzeile), '') is not null then 'berater' else 'buero' end,
         case when nullif(btrim(b.adresse), '')         is not null then 'berater' else 'buero' end,
         o.instagram_url,
         o.facebook_url
    from public.berater b
    left join public.buero o on o.id = b.buero_id
   where b.id = p_id and b.ist_aktiv limit 1;
$function$;

grant execute on function public.get_berater_public(text) to anon, authenticated, service_role;
grant execute on function public.get_berater_public_by_id(uuid) to anon, authenticated, service_role;

commit;
