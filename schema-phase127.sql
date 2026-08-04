-- ============================================================================
-- schema-phase127.sql · Phase 127 · Die 15 Stufen wirklich anlegen
-- ----------------------------------------------------------------------------
-- STATUS: ENTWURF — NICHT ANGEWANDT. Erst nach Kais Freigabe ausführen.
--
-- PROBLEM
--   Die Kundenseite leitet aus den Lücken zwischen den vorhandenen Zeilen
--   zusätzliche 100-€-Stufen ab (4, 6, 8, 9, 11–14). In belohnungs_stufen
--   existieren aber nur 1, 2, 3, 5, 7, 10, 15.
--   sync_praemien_for_empfehler() erzeugt Prämien ausschließlich aus echten
--   Zeilen. Ein Promoter mit vier gewonnenen Kunden sieht auf der Seite also
--   einen Bonus, der in den Auszahlungen nie erscheint.
--   Zusätzlich fehlt bei Stufe 1 das wert_label, obwohl die Seite 100 € nennt.
--
-- LÖSUNG
--   Die Datenbank ist die Wahrheit: alle 15 Stufen als echte Zeilen, mit
--   gepflegtem wert_label und einem ehrlichen highlight-Kennzeichen. Die
--   Oberfläche erfindet danach nichts mehr.
--
-- AUSWIRKUNGSANALYSE (lesend gefahren am 2026-08-04, ohne Kundennamen)
--   Promoter mit mindestens einem gewonnenen Kunden ...... 7
--   höchste Kundenzahl eines Promoters ................... 3
--   bestehende Prämien (davon offen) ..................... 11 (9)
--   zusätzliche Prämien durch diese Migration ............ 0
--   zusätzlicher Gegenwert ............................... 0 €
--   Grund: die neuen Stufen beginnen bei 4, niemand hat bisher mehr als
--   3 Kunden. Die Rückwirkung ist heute folgenlos — mit jedem weiteren
--   gewonnenen Kunden kann sich das ändern.
--
-- GELTUNGSBEREICH
--   Nur der Datensatz von Kai Blobel. Die übrigen Berater haben keine eigenen
--   Zeilen und bekommen diesen Satz über getBelohnungsStufenPublic() als
--   geteilte Grundlage (siehe eineZeileProSchluessel in js/supabase.js).
-- ============================================================================

begin;

-- 1 · Die acht fehlenden Geldbonus-Stufen anlegen -----------------------------
insert into public.belohnungs_stufen
  (berater_id, stufe, titel, beschreibung, icon, wert_label, highlight, sort_order, bild_url, kategorien)
select
  'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'::uuid,
  s.stufe,
  'Empfehlungs-Bonus',
  '100 € als Wunschgutschein, PayPal-Auszahlung oder Spende deiner Wahl.',
  '🎟️',
  '100 €',
  false,
  s.stufe,
  '/assets/images/programm/standard.jpg',
  '{geld,spende}'::text[]
from (values (4),(6),(8),(9),(11),(12),(13),(14)) as s(stufe)
on conflict (berater_id, stufe) do nothing;

-- 2 · Fehlenden Wert bei Stufe 1 nachtragen ----------------------------------
update public.belohnungs_stufen
   set wert_label = '100 €'
 where berater_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'
   and stufe = 1
   and wert_label is null;

-- 3 · Meilensteine ehrlich kennzeichnen --------------------------------------
-- Die Oberfläche unterscheidet danach über highlight, nicht mehr über einen
-- Titel-Treffer auf /bonus/i.
update public.belohnungs_stufen
   set highlight = (stufe in (2, 5, 7, 10, 15))
 where berater_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';

-- 4 · Sortierung an die Stufe angleichen -------------------------------------
update public.belohnungs_stufen
   set sort_order = stufe
 where berater_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';

commit;

-- ----------------------------------------------------------------------------
-- GEGENPROBEN nach dem Anwenden
-- ----------------------------------------------------------------------------
-- select count(*) from belohnungs_stufen
--  where berater_id='b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';                 -- 15
-- select count(*) from belohnungs_stufen
--  where berater_id='b3cbf981-ea3e-4e6d-a993-2fe158ca0d48' and highlight;   --  5
-- select count(*) from belohnungs_stufen
--  where berater_id='b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'
--    and wert_label is null;                                                --  0

-- ============================================================================
-- ROLLBACK — stellt den Stand von vor der Migration wieder her (2026-08-04)
-- ============================================================================
/*
begin;

delete from public.belohnungs_stufen
 where berater_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'
   and stufe in (4, 6, 8, 9, 11, 12, 13, 14);

update public.belohnungs_stufen set wert_label = null
 where berater_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48' and stufe = 1;

update public.belohnungs_stufen set highlight = (stufe = 15)
 where berater_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';

update public.belohnungs_stufen set sort_order = v.sort_order
  from (values (1,1),(2,2),(3,3),(5,4),(7,5),(10,6),(15,7)) as v(stufe, sort_order)
 where belohnungs_stufen.berater_id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'
   and belohnungs_stufen.stufe = v.stufe;

commit;
*/
