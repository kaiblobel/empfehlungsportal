-- ============================================================
-- Phase 18 / Build-Phase 72 · Bugfix: Empfehlung löschen
-- ------------------------------------------------------------
-- Symptom: Rechtsklick > Löschen (Phase 70) zeigte "gelöscht", aber die
-- Empfehlung kam beim Neuladen zurück.
-- Ursache: RLS auf `empfehlungen` hatte INSERT/SELECT/UPDATE-Policies, aber
-- KEINE DELETE-Policy. Bei aktivem RLS blockiert Postgres das DELETE still
-- (0 Zeilen betroffen, KEIN Fehler) → PostgREST meldet Erfolg, es passiert nichts.
-- Fix: DELETE-Policy analog zu "empfehlung scoped select/update" — ein
-- eingeloggter Berater darf seine eigenen Empfehlungen löschen.
--
-- Bereits per Supabase-MCP live angewandt (Migration
-- phase72_empfehlungen_delete_policy). Diese Datei dokumentiert den Stand.
-- ============================================================

create policy "empfehlung scoped delete" on public.empfehlungen
  for delete to authenticated
  using (berater_id = (select current_berater_id()));
