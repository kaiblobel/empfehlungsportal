-- ============================================================
-- Phase 24 · Ziel je Promoter (gewählte Belohnung/Stufe)
-- ============================================================
-- Der Kunde (Promoter) kann auf seinem individuellen Link
-- (empfehler.html?code=…) eine Belohnung als ZIEL wählen.
-- Gespeichert am Promoter als Stufennummer (= benötigte Anzahl Kunden).
-- Keine Änderung an der Prämien-/Auszahlungslogik (bleibt an status='kunde').
-- Angewandt live via Supabase-MCP (Projekt kkseqhmfubzfyloffkwe).

alter table public.empfehler add column if not exists ziel_stufe int;

-- get_empfehler_by_code um ziel_stufe erweitern (Return-Type-Änderung → drop + create + re-grant)
drop function if exists public.get_empfehler_by_code(text);
create function public.get_empfehler_by_code(p_code text)
returns table(id uuid, code text, name text, berater_id uuid, created_at timestamp without time zone, ziel_stufe int)
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  select id, code, name, berater_id, created_at, ziel_stufe
  from public.empfehler where code = p_code limit 1;
$$;
grant execute on function public.get_empfehler_by_code(text) to anon, authenticated;

-- Ziel setzen/entfernen (keyed per Code = gleiches Vertrauensmodell wie create_empfehlung_public)
create or replace function public.set_empfehler_ziel(p_code text, p_stufe int)
returns void
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  update public.empfehler set ziel_stufe = p_stufe where code = p_code;
$$;
grant execute on function public.set_empfehler_ziel(text, int) to anon, authenticated;
