-- ============================================================
-- Phase 25 · Promoter reicht Kontext einer versendeten Empfehlung nach
-- ============================================================
-- Der Empfehlungsgeber kann auf seinem Link (empfehler.html?code=…) eine
-- bereits versendete Empfehlung öffnen und Zusatzinfos für den Berater
-- ergänzen (Beruf, Verbindung, Kontext, Erreichbarkeit, Kanal, vorinformiert,
-- persönliche Nachricht). Nur EIGENE Empfehlungen, nur diese Kontextfelder.
-- Angewandt live via Supabase-MCP (Projekt kkseqhmfubzfyloffkwe).

create or replace function public.update_empfehlung_kontext(
  p_code text, p_id uuid,
  p_beruf text, p_verbindung text, p_kontext text,
  p_erreichbarkeit text, p_kanal text, p_vorinformiert boolean, p_nachricht text
) returns void
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  update public.empfehlungen set
    empfaenger_beruf = p_beruf,
    empfaenger_verbindung = p_verbindung,
    empfaenger_kontext = p_kontext,
    beste_erreichbarkeit = p_erreichbarkeit,
    bevorzugter_kanal = p_kanal,
    empfehler_vorinformiert = coalesce(p_vorinformiert, false),
    empfehler_nachricht = p_nachricht
  where id = p_id
    and empfehler_id = (select id from public.empfehler where code = p_code);
$$;
grant execute on function public.update_empfehlung_kontext(text, uuid, text, text, text, text, text, boolean, text) to anon, authenticated;

-- get_empfehler_empfehlungen um die Kontextfelder erweitern (Prefill des Edit-Panels)
drop function if exists public.get_empfehler_empfehlungen(text);
create function public.get_empfehler_empfehlungen(p_code text)
returns table(
  id uuid, empfaenger_name text, status text, anrufwunsch text, vorlage_slug text,
  created_at timestamp without time zone, link_geoeffnet boolean,
  link_geoeffnet_at timestamp without time zone, link_token text,
  empfaenger_beruf text, empfaenger_verbindung text, empfaenger_kontext text,
  beste_erreichbarkeit text, bevorzugter_kanal text, empfehler_vorinformiert boolean,
  empfehler_nachricht text
)
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  select e.id, e.empfaenger_name, coalesce(e.status, 'offen') as status,
         e.anrufwunsch, e.vorlage_slug, e.created_at,
         coalesce(e.link_geoeffnet, false) as link_geoeffnet,
         e.link_geoeffnet_at, e.link_token,
         e.empfaenger_beruf, e.empfaenger_verbindung, e.empfaenger_kontext,
         e.beste_erreichbarkeit, e.bevorzugter_kanal,
         coalesce(e.empfehler_vorinformiert, false) as empfehler_vorinformiert,
         e.empfehler_nachricht
  from empfehlungen e join empfehler em on em.id = e.empfehler_id
  where em.code = p_code
  order by e.created_at desc;
$$;
grant execute on function public.get_empfehler_empfehlungen(text) to anon, authenticated;
