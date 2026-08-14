-- =====================================================================
-- ZZ-DEMO-DATEN wieder entfernen
-- ---------------------------------------------------------------------
-- Löscht ausschließlich die Datensätze aus zz-demo-daten-anlegen.sql.
-- Erkennungsmerkmal ist die Notiz "ZZ-DEMO 2026-08-12". Echte Promoter
-- und echte Empfehlungen tragen diese Notiz nicht und bleiben unberührt.
--
-- Nach dem Löschen wird die Kennzahlen-Historie neu aufgesetzt, damit
-- die Kurve nicht den künstlichen Einbruch der Demo zeigt.
-- =====================================================================

begin;

-- Kontrollblick vor dem Löschen (Ergebnis erscheint im SQL-Editor)
select 'wird geloescht: promoter'    as was, count(*) from public.empfehler    where notiz like 'ZZ-DEMO 2026-08-12%'
union all
select 'wird geloescht: empfehlungen',        count(*) from public.empfehlungen where notiz like 'ZZ-DEMO 2026-08-12%'
union all
select 'bleibt stehen: echte promoter',       count(*) from public.empfehler    where notiz is null or notiz not like 'ZZ-DEMO 2026-08-12%'
union all
select 'bleibt stehen: echte empfehlungen',   count(*) from public.empfehlungen where notiz is null or notiz not like 'ZZ-DEMO 2026-08-12%';

delete from public.stufe_notifications
 where empfehler_id in (select id from public.empfehler where notiz like 'ZZ-DEMO 2026-08-12%');

delete from public.praemien
 where empfehler_id in (select id from public.empfehler where notiz like 'ZZ-DEMO 2026-08-12%');

delete from public.empfehlungen
 where notiz like 'ZZ-DEMO 2026-08-12%';

delete from public.empfehler
 where notiz like 'ZZ-DEMO 2026-08-12%';

-- Kennzahlen-Historie sauber neu starten
delete from public.kpi_snapshots;
select public.snapshot_kpis_today();

commit;

-- Ergebnis prüfen
select 'promoter' as tabelle, count(*) from public.empfehler
union all select 'empfehlungen', count(*) from public.empfehlungen
union all select 'praemien',     count(*) from public.praemien;
