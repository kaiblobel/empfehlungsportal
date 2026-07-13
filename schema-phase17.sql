-- ============================================================
-- Phase 17 / Build-Phase 71 · Promoter-Feed: Link-Nachverfolgung
-- ------------------------------------------------------------
-- Erweitert get_empfehler_empfehlungen(p_code) additiv um
-- link_geoeffnet, link_geoeffnet_at, link_token, damit der Promoter
-- (und darüber der Berater) im öffentlichen Dashboard empfehler.html?code=…
-- sieht, welche seiner generierten Empfehlungslinks schon geöffnet wurden.
--
-- WICHTIG (Datenschutz): empfaenger_telefon bleibt bewusst AUSSERHALB des
-- Returns — anon-Zugriff (nur per ratbarem Code geschützt) darf keine
-- Telefonnummern preisgeben.
--
-- Bereits per Supabase-MCP auf der Live-DB angewandt (Migration
-- phase71_get_empfehler_empfehlungen_add_link_fields). Diese Datei
-- dokumentiert den Stand fürs Repo. Idempotent (drop if exists + create).
-- ============================================================

drop function if exists public.get_empfehler_empfehlungen(text);

create function public.get_empfehler_empfehlungen(p_code text)
returns table(
  id uuid,
  empfaenger_name text,
  status text,
  anrufwunsch text,
  vorlage_slug text,
  created_at timestamp without time zone,
  link_geoeffnet boolean,
  link_geoeffnet_at timestamp without time zone,
  link_token text
)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select e.id, e.empfaenger_name, coalesce(e.status, 'offen') as status,
         e.anrufwunsch, e.vorlage_slug, e.created_at,
         coalesce(e.link_geoeffnet, false) as link_geoeffnet,
         e.link_geoeffnet_at, e.link_token
  from empfehlungen e join empfehler em on em.id = e.empfehler_id
  where em.code = p_code
  order by e.created_at desc;
$function$;

grant execute on function public.get_empfehler_empfehlungen(text) to anon, authenticated;
