-- =====================================================================
-- Phase 109 · Berater-Tabelle datensparsam lesen
--
-- Bisher: Policy "berater auth read" (SELECT, authenticated, USING true) →
-- JEDER eingeloggte Berater konnte ALLE Berater-Zeilen lesen (Name, E-Mail,
-- Telefon der Kollegen). Ziel: normale Berater sehen nur ihre EIGENE Zeile,
-- Admins weiterhin alle (für die Team-/Verwaltungsübersicht).
--
-- Sicher, weil kein anderer Pfad die breite Leseregel braucht:
--   * Dashboard-Header liest die eigene Zeile über auth_user_id = auth.uid()
--     (js/dashboard.js getCurrentBerater) → von der neuen Regel gedeckt.
--   * Team-Ansicht (team_activity/team_presence), current_berater_id() und
--     is_current_berater_admin() sind SECURITY DEFINER → umgehen RLS,
--     bleiben unverändert.
--   * Kunden-Branding läuft über get_berater_public* (SECURITY DEFINER).
--   * Admin-Verwaltung (listBerater) bleibt über die Admin-Policy voll.
--   * getBerater(id) ist toter Client-Code (kein Aufrufer).
--
-- Keine Signatur-, Client- oder Datenänderung — nur zwei RLS-Policies.
-- Idempotent. ENTWURF — erst nach Freigabe einspielen.
-- =====================================================================

-- Alte, zu weite Leseregel entfernen (gab allen Berater-Rollen alle Zeilen).
drop policy if exists "berater auth read" on public.berater;

-- Für Wiederholbarkeit: neue Policies vorab entfernen, falls schon vorhanden.
drop policy if exists "berater self read"      on public.berater;
drop policy if exists "berater admin read all" on public.berater;

-- Normale Berater: NUR die eigene Zeile.
--   auth_user_id = auth.uid()  → genau der Datensatz des eingeloggten Logins.
--   (select auth.uid())        → einmal pro Query ausgewertet (InitPlan, Performance).
create policy "berater self read" on public.berater
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

-- Admins: ALLE Zeilen (für Team-/Verwaltungsübersicht).
--   is_current_berater_admin() ist SECURITY DEFINER (liest berater.ist_admin
--   des eigenen Datensatzes) → keine RLS-Rekursion; (select ...) = InitPlan.
--   Permissive SELECT-Policies werden mit ODER kombiniert: eigene Zeile ODER Admin.
create policy "berater admin read all" on public.berater
  for select
  to authenticated
  using ((select public.is_current_berater_admin()));

-- ---------------------------------------------------------------------
-- ROLLBACK (falls nötig, sofort und ohne Datenrisiko — nur Metadaten):
--
--   drop policy if exists "berater self read"      on public.berater;
--   drop policy if exists "berater admin read all" on public.berater;
--   create policy "berater auth read" on public.berater
--     for select to authenticated using (true);
-- ---------------------------------------------------------------------
