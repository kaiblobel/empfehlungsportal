-- ============================================================
-- Phase 21 / Build-Phase 77 · Programm verwalten (Editoren)
-- ------------------------------------------------------------
-- In-App-Editoren für Belohnungen (belohnungs_stufen) + Erfolgsgeschichten
-- (erfolgsgeschichten). Beide Tabellen haben bereits die passende RLS:
--   * public SELECT (belohnungs_stufen: true; erfolgsgeschichten: aktiv=true)
--   * INSERT/UPDATE/DELETE nur is_current_berater_admin()
-- Die Editoren schreiben daher DIREKT per authenticated Client (admin-gated).
--
-- Einzige Ergänzung: der Admin muss im Editor auch INAKTIVE Erfolgsgeschichten
-- sehen (public SELECT ist nur aktiv=true). Zusatz-Policy gibt dem Admin alle Zeilen.
--
-- Bereits per Supabase-MCP live (Migration phase77_erfolg_admin_select_all).
-- Rollback-only verifiziert: Admin insert/update/delete ok, inaktive sichtbar,
-- Nicht-Admin insert -> RLS-Fehler 42501.
-- ============================================================

create policy "erfolg admin select all" on public.erfolgsgeschichten
  for select to authenticated using (is_current_berater_admin());
