-- ============================================================================
-- schema-phase115.sql · Phase 115 · Anonyme Ausführ-Rechte auf interne/
--          aggregierte Funktionen entfernen (Sicherheits-Befund 7)
-- ----------------------------------------------------------------------------
-- STATUS: LIVE angewandt am 2026-07-26 (Supabase-Migration
--         "phase115_anon_funktionen_haerten"). Version v1.140.
--
-- PROBLEM
--   Mehrere SECURITY-DEFINER-Funktionen waren für PUBLIC/anon ausführbar,
--   obwohl sie aggregierte/interne Daten liefern und keinen Empfänger-Token-
--   Bezug haben. Anonyme konnten Kennzahlen, Team-Präsenz und Promoter-Scores
--   abrufen bzw. den KPI-Tagessnapshot auslösen.
--
-- NICHT betroffen (bewusst): die token-/code-/secret-gescopten Empfänger- und
--   Promoter-Funktionen behalten anon (öffentlicher Flow).
-- ============================================================================

revoke execute on function public.kpi_trend(integer)       from public, anon;
revoke execute on function public.kpi_trend_daily(integer) from public, anon;
revoke execute on function public.team_activity(integer)   from public, anon;
revoke execute on function public.team_presence()          from public, anon;
revoke execute on function public.empfehler_score(uuid)    from public, anon;
revoke execute on function public.snapshot_kpis_today()    from public, anon;
revoke execute on function public.delete_empfehler(uuid)   from public, anon;

-- authenticated + service_role + postgres (cron) behalten ihr EXECUTE.

-- ----------------------------------------------------------------------------
-- LIVE-GEGENPROBEN (2026-07-26, has_function_privilege auf der Live-DB):
--   Alle 7 Funktionen:  anon = false, authenticated = true, postgres (cron) = true
--   Öffentlicher Flow (unberührt): get_empfehlung_public, get_berater_public,
--     mark_interessiert_rpc, create_empfehlung_public -> anon = true
--   Tageslauf: cron-Job "kpi-daily-snapshot" (00:05 Uhr, Rolle postgres) unberührt.
--
-- RÜCKBAU (Notfall, stellt den unsichereren Zustand wieder her):
--   grant execute on function public.kpi_trend(integer)       to public;
--   grant execute on function public.kpi_trend_daily(integer) to public;
--   grant execute on function public.team_activity(integer)   to anon, public;
--   grant execute on function public.team_presence()          to anon, public;
--   grant execute on function public.empfehler_score(uuid)    to public;
--   grant execute on function public.snapshot_kpis_today()    to public;
--   grant execute on function public.delete_empfehler(uuid)   to public;
-- ============================================================================
