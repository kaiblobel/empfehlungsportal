-- ============================================================
-- Empfehlungsportal · Phase 8 · Belohnungs-Bilder
-- ============================================================

alter table belohnungs_stufen add column if not exists bild_url text;

-- Lokal gehostete Hersteller- bzw. Editorial-Pressefotos
-- (in assets/images/programm/ abgelegt)

update belohnungs_stufen set bild_url = '/assets/images/programm/kundenlos.jpg'   where stufe = 1;
update belohnungs_stufen set bild_url = '/assets/images/programm/restaurant.jpg'  where stufe = 2;
update belohnungs_stufen set bild_url = '/assets/images/programm/standard.jpg'    where stufe = 3;
update belohnungs_stufen set bild_url = '/assets/images/programm/applewatch.jpg'  where stufe = 5;
update belohnungs_stufen set bild_url = '/assets/images/programm/goldbarren.jpg'  where stufe = 7;
update belohnungs_stufen set bild_url = '/assets/images/programm/ipad.jpg'        where stufe = 10;
update belohnungs_stufen set bild_url = '/assets/images/programm/mallorca.jpg'    where stufe = 15;
