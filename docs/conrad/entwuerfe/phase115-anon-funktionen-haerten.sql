-- ============================================================================
-- ENTWURF · schema-phase115.sql · Anonyme Ausführ-Rechte auf interne/
--          aggregierte Funktionen entfernen (Prüfbefund 7 · Conrad)
-- ----------------------------------------------------------------------------
-- STATUS: ENTWURF. NICHT live angewandt. Auf Supabase-Test-Kopie validiert
--         (Testnachweis unten). Kein main, keine Live-DB, nichts veröffentlicht.
-- Nummer 115 gewählt, damit keine Kollision mit White-Label (110/111/112).
--
-- PROBLEM
--   Mehrere SECURITY-DEFINER-Funktionen sind für PUBLIC/anon ausführbar,
--   obwohl sie aggregierte oder interne Daten liefern und KEINEN Empfänger-
--   Token/Code-Bezug haben. Anonyme können damit Kennzahlen, Team-Präsenz und
--   Promoter-Scores abrufen bzw. den KPI-Tagessnapshot auslösen.
--   Codex-Erstbefund: kpi_trend, kpi_trend_daily.
--   Conrad-Ergänzung:  team_activity, team_presence, empfehler_score,
--                      snapshot_kpis_today, delete_empfehler.
--   (delete_empfehler ist intern gegen fremde Löschung geschützt — der anon-
--    Grant ist überflüssig, wird aus Prinzip der geringsten Rechte entfernt.)
--
-- NICHT betroffen (bewusst): die token-/code-/secret-gescopten Empfänger- und
--   Promoter-Funktionen (get_empfehlung_public, create_empfehlung_public,
--   mark_*_rpc, get_empfehler_by_code, get_berater_public*, cockpit_*,
--   record_booking_event_rpc, …) behalten anon — das ist der öffentliche Flow.
--
-- OFFEN, bewusst NICHT hier gelöst:
--   * create_empfehler(): anonym UND ohne Rate-Limit (Promoter-Spam-Fläche)
--     und mit Kai-Fallback. Kai-Fallback -> White-Label Phase 111.
--     Rate-Limit -> eigener kleiner Punkt.
--   * Organisationsbezogene Trennung der Kennzahlen -> Multi-Org-Konzept.
-- ============================================================================

begin;

revoke execute on function public.kpi_trend(integer)          from public, anon;
revoke execute on function public.kpi_trend_daily(integer)    from public, anon;
revoke execute on function public.team_activity(integer)      from public, anon;
revoke execute on function public.team_presence()             from public, anon;
revoke execute on function public.empfehler_score(uuid)       from public, anon;
revoke execute on function public.snapshot_kpis_today()       from public, anon;
revoke execute on function public.delete_empfehler(uuid)      from public, anon;

-- authenticated + service_role behalten ihr EXECUTE unverändert.
-- pg_cron (snapshot_kpis_today) läuft als Owner-/Cron-Rolle, nicht anon -> unberührt.

commit;

-- ----------------------------------------------------------------------------
-- RÜCKBAU (nur im Notfall; stellt den unsichereren Ausgangszustand wieder her):
--   grant execute on function public.kpi_trend(integer)       to public;
--   grant execute on function public.kpi_trend_daily(integer) to public;
--   grant execute on function public.team_activity(integer)   to anon, public;
--   grant execute on function public.team_presence()          to anon, public;
--   grant execute on function public.empfehler_score(uuid)    to public;
--   grant execute on function public.snapshot_kpis_today()    to public;
--   grant execute on function public.delete_empfehler(uuid)   to public;
--
-- TESTPLAN (Gegenproben):
--   1. anon darf KEINE der 7 Funktionen mehr ausführen.
--   2. authenticated (eingeloggter Berater) darf ALLE 7 weiter ausführen.
--   3. Gegenprobe: get_empfehlung_public / get_berater_public /
--      mark_interessiert_rpc bleiben für anon erlaubt (Empfänger-Flow unverändert).
--   4. Teamdashboard lädt als eingeloggter Berater weiter
--      (hub.js: kpi_trend / kpi_trend_daily; supabase.js: team_activity / team_presence).
--
-- TESTNACHWEIS (Supabase-Test-Kopie zwtqtuozbnqnzlergoyq, has_function_privilege):
--   funktion                      anon_darf  auth_darf
--   kpi_trend(integer)            false      true
--   kpi_trend_daily(integer)      false      true
--   team_activity(integer)        false      true
--   team_presence()               false      true
--   empfehler_score(uuid)         false      true
--   snapshot_kpis_today()         false      true
--   delete_empfehler(uuid)        false      true
--   -- Gegenprobe (unberührt):
--   get_empfehlung_public(text)   true       true
--   get_berater_public(text)      true       true
--   mark_interessiert_rpc(text)   true       true
-- ----------------------------------------------------------------------------
