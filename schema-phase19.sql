-- ============================================================
-- Phase 19 / Build-Phase 74 · Promoter löschen (nur leere)
-- ------------------------------------------------------------
-- Die `empfehler`-Tabelle hatte nur eine SELECT-Policy (Anlegen läuft über
-- den anon-RPC create_empfehler). Fürs Löschen aus dem Berater-Dashboard
-- (Rechtsklick > Löschen) diese SECURITY-DEFINER-Funktion:
--   * nur eigene Promoter (berater_id = current_berater_id())
--   * NUR wenn KEINE Empfehlungen daran hängen (empfehlungen.empfehler_id
--     ist NO ACTION = geschützt). Prämien + stufe_notifications eines leeren
--     Promoters cascaden automatisch.
-- Rückgabe: 'deleted' | 'has_empfehlungen' | 'forbidden' | 'not_found'
--
-- Bereits per Supabase-MCP live (Migration phase74_delete_empfehler_rpc).
-- Anlegen nutzt weiterhin den bestehenden RPC create_empfehler.
-- ============================================================

create or replace function public.delete_empfehler(p_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_berater uuid;
  v_cnt int;
begin
  select berater_id into v_berater from empfehler where id = p_id;
  if v_berater is null then return 'not_found'; end if;
  if v_berater is distinct from current_berater_id() then return 'forbidden'; end if;

  select count(*) into v_cnt from empfehlungen where empfehler_id = p_id;
  if v_cnt > 0 then return 'has_empfehlungen'; end if;

  delete from empfehler where id = p_id;
  return 'deleted';
end;
$$;

revoke execute on function public.delete_empfehler(uuid) from anon;
grant execute on function public.delete_empfehler(uuid) to authenticated;
