-- =====================================================================
-- Phase 12 · anon-fähiger Insert-RPC für Empfehlungen
-- Angewandt am 2026-06-22 via Supabase MCP (Migration phase12_create_empfehlung_public_rpc).
--
-- Grund: createEmpfehlung machte .insert().select() (return=representation).
-- empfehlungen hat KEINE anon-SELECT-Policy (nur authenticated, scoped via
-- current_berater_id()) → PostgREST lehnt das Representation für nicht
-- eingeloggte Promoter mit HTTP 401 ab ("Speichern fehlgeschlagen").
-- SECURITY DEFINER umgeht das sauber und gibt link_token zurück.
-- Die BEFORE-INSERT-Trigger (auto_link_empfehler, set_empfehlung_berater_id)
-- feuern weiterhin.
-- =====================================================================

create or replace function create_empfehlung_public(
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
set search_path = public
as $$
begin
  return query
  insert into empfehlungen (
    empfaenger_name, empfaenger_telefon, empfehler_name, empfehler_nachricht,
    nachricht, typ, vorlage_slug, empfehler_id, berater_id,
    empfaenger_beruf, empfaenger_verbindung, empfaenger_kontext,
    empfehler_vorinformiert, beste_erreichbarkeit, bevorzugter_kanal
  ) values (
    p_empfaenger_name, p_empfaenger_telefon, p_empfehler_name, p_empfehler_nachricht,
    p_nachricht, coalesce(p_typ, 'direkt'), coalesce(p_vorlage_slug, 'allgemein'),
    p_empfehler_id, p_berater_id,
    p_empfaenger_beruf, p_empfaenger_verbindung, p_empfaenger_kontext,
    coalesce(p_empfehler_vorinformiert, false), p_beste_erreichbarkeit, p_bevorzugter_kanal
  )
  returning empfehlungen.id, empfehlungen.link_token;
end;
$$;

grant execute on function create_empfehlung_public(
  text, text, text, text, text, text, text, uuid, uuid, text, text, text, boolean, text, text
) to anon, authenticated;
