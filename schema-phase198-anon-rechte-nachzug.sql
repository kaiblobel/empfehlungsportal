-- Phase 198 · Nachzug zu 192 bis 197: anonyme Rechte entziehen
--
-- Beim Anlegen einer Funktion im Schema public vergibt Supabase automatisch
-- EXECUTE an anon und authenticated. Ein "revoke all ... from public" entfernt
-- davon nur das PUBLIC-Recht, nicht das ausdrücklich an anon vergebene. Genau
-- das war in den Migrationen 192 bis 197 der Denkfehler: die revoke-Zeilen
-- sahen richtig aus und haben nichts bewirkt.
--
-- Folge: team_promoter, team_empfehlungen, team_praemien und team_kidz waren
-- für angemeldete Berater gesperrt, aber für anonyme Aufrufer offen. Genau
-- verkehrt herum. snapshot_kpis_today, das Daten schreibt, war ebenfalls für
-- anon aufrufbar.
--
-- Ausgenutzt werden konnte davon nichts: alle diese Funktionen hängen an
-- mein_team() beziehungsweise current_berater_id(), und die sind ohne
-- Anmeldung leer. Aber eine Zusage, die nur wegen einer zweiten Schranke hält,
-- ist keine Zusage.
--
-- ANGEWANDT am 12.08.2026.

begin;

revoke execute on function public.mein_team() from anon, public;
revoke execute on function public.team_bestand(integer) from anon, public;
revoke execute on function public.kpi_trend_daily_team(integer) from anon, public;
grant execute on function public.mein_team() to authenticated, service_role;
grant execute on function public.team_bestand(integer) to authenticated;
grant execute on function public.kpi_trend_daily_team(integer) to authenticated;

revoke execute on function public.team_promoter(integer) from anon, public;
revoke execute on function public.team_empfehlungen(integer, integer) from anon, public;
revoke execute on function public.team_praemien() from anon, public;
revoke execute on function public.team_kidz() from anon, public;

revoke execute on function public.snapshot_kpis_today() from anon, public;
grant execute on function public.snapshot_kpis_today() to authenticated, service_role;

revoke execute on function public.sync_praemien_for_empfehler(uuid) from anon, public;
grant execute on function public.sync_praemien_for_empfehler(uuid) to authenticated, service_role;

revoke execute on function public.pruefe_fuehrungslinie() from anon, authenticated, public;

commit;

-- Gegenprobe (reines Lesen):
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_darf,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as angemeldet_darf
--   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--   where n.nspname='public' and p.proname like 'team\_%' or p.proname in
--         ('mein_team','snapshot_kpis_today','sync_praemien_for_empfehler');
--
-- Erwartung: anon_darf ueberall false.
