-- =====================================================================
-- ZZ-DEMO-DATEN für die Vorführung am 12.08.2026
-- ---------------------------------------------------------------------
-- Legt je aktivem Berater 5 Promoter und 10 Empfehlungen ("Testkunden")
-- an. ALLES ist mehrfach als Test gekennzeichnet und damit gefahrlos
-- löschbar, ohne echte Promoter oder Leads zu berühren:
--
--   1. Name endet auf " (Test)"
--   2. Promoter-Code beginnt mit "zz-test-"
--   3. Notiz-Feld beginnt mit "ZZ-DEMO 2026-08-12"
--   4. E-Mail-Domain @zz-testdaten.invalid (kann nie existieren)
--   5. Telefon aus dem offiziellen Testrufnummernblock +49 30 23125 xxxx
--
-- Entfernen: zz-demo-daten-entfernen.sql ausführen.
--
-- WICHTIG: Der Trigger empfehlungen_check_stufe_insert wird für den
-- Einfügevorgang stillgelegt. Er würde sonst je Kunden-Datensatz eine
-- echte E-Mail über Resend an die erfundenen Adressen schicken. Die
-- Prämien werden danach ohne Mailversand direkt erzeugt.
-- =====================================================================

begin;

alter table public.empfehlungen disable trigger empfehlungen_check_stufe_insert;

-- ---------------------------------------------------------------------
-- 1) Promoter: 5 je Berater
-- ---------------------------------------------------------------------
with berater_liste as (
  select id as berater_id,
         (row_number() over (order by created_at))::int as b_idx
    from public.berater
   where ist_aktiv is true
),
roh as (
  select b.berater_id,
         (((b.b_idx - 1) * 5) + p_idx)::int as lfd
    from berater_liste b
    cross join generate_series(1, 5) as p_idx
),
namen as (
  select r.berater_id,
         r.lfd,
         (array['Andrea','Bernd','Christin','Dirk','Elena','Frank',
                'Gesa','Holger','Ines','Jörg','Katrin','Lars'])[((r.lfd - 1) % 12) + 1] as vorname,
         (array['Wolter','Kaltenbach','Mahler','Ostermann','Fichtner',
                'Lindner','Brunner','Ziegler','Wagner','Hempel'])[((r.lfd - 1) % 10) + 1] as nachname
    from roh r
)
insert into public.empfehler (code, name, email, telefon, berater_id, notiz, created_at, code_version)
select
  'zz-test-' || lower(translate(vorname, 'äöüÄÖÜ', 'aouAOU')) || '-'
             || lower(translate(nachname, 'äöüÄÖÜ', 'aouAOU'))
             || '-' || substr(md5(random()::text || lfd::text), 1, 10),
  vorname || ' ' || nachname || ' (Test)',
  lower(translate(vorname, 'äöüÄÖÜ', 'aouAOU')) || '.'
    || lower(translate(nachname, 'äöüÄÖÜ', 'aouAOU')) || '@zz-testdaten.invalid',
  '+493023125' || lpad((1000 + lfd)::text, 4, '0'),
  berater_id,
  'ZZ-DEMO 2026-08-12 · Testdatensatz für die Vorführung, jederzeit löschbar',
  now() - make_interval(days => 16, hours => lfd),
  2
from namen;

-- ---------------------------------------------------------------------
-- 2) Empfehlungen: 10 je Berater, verteilt 4/3/2/1/0 auf die 5 Promoter
--    Der Statusmix ergibt einen realistischen Trichter samt Prämienstufe.
-- ---------------------------------------------------------------------
with berater_liste as (
  select id as berater_id,
         (row_number() over (order by created_at))::int as b_idx
    from public.berater
   where ist_aktiv is true
),
promoter_liste as (
  select e.id as empfehler_id, e.name as empfehler_name, e.berater_id,
         (row_number() over (partition by e.berater_id order by e.created_at))::int as p_idx
    from public.empfehler e
   where e.notiz like 'ZZ-DEMO 2026-08-12%'
),
roh as (
  select b.berater_id,
         b.b_idx,
         e_idx::int as e_idx,
         (((b.b_idx - 1) * 10) + e_idx)::int as lfd,
         case when e_idx <= 4 then 1
              when e_idx <= 7 then 2
              when e_idx <= 9 then 3
              else 4 end as ziel_promoter,
         (now() - make_interval(days  => round(14 - (e_idx - 1) * 1.4)::int,
                                hours => b.b_idx * 3)) as ts
    from berater_liste b
    cross join generate_series(1, 10) as e_idx
),
namen as (
  select r.*,
         (array['Alina','Bastian','Carolin','Daniel','Emilia','Fabian',
                'Greta','Henrik','Isabel','Jonas','Klara','Lukas'])[((r.lfd - 1) % 12) + 1] as vorname,
         (array['Brandt','Eichhorn','Gierke','Lehmann','Pohlmann'])[((r.lfd - 1) % 5) + 1] as nachname,
         (array['allgemein','baufi','foerderungen','selbstaendige',
                'investment','absicherung','karriere','kinder'])[((r.e_idx - 1 + r.b_idx) % 8) + 1] as thema
    from roh r
)
insert into public.empfehlungen (
  berater_id, empfehler_id, empfehler_name,
  empfaenger_name, empfaenger_telefon, vorlage_slug,
  status, link_geoeffnet, link_geoeffnet_at, link_klicks,
  interessiert, interessiert_at, anrufwunsch, anrufwunsch_at,
  empfehler_vorinformiert, notiz, created_at
)
select
  n.berater_id,
  p.empfehler_id,
  p.empfehler_name,
  n.vorname || ' ' || n.nachname || ' (Test)',
  '+493023125' || lpad((2000 + n.lfd)::text, 4, '0'),
  n.thema,
  case n.e_idx when 1 then 'kunde' when 2 then 'kunde'
               when 3 then 'anrufwunsch'
               when 4 then 'kontaktiert' when 5 then 'kontaktiert' when 6 then 'kontaktiert'
               when 10 then 'kein_interesse'
               else 'offen' end,
  n.e_idx <> 9,
  case when n.e_idx <> 9 then n.ts + interval '4 hours' end,
  case when n.e_idx <= 2 then 4 when n.e_idx <= 5 then 2 when n.e_idx = 9 then 0 else 1 end,
  n.e_idx <= 5,
  case when n.e_idx <= 5 then n.ts + interval '6 hours' end,
  case when n.e_idx = 3 then 'vormittags' end,
  case when n.e_idx = 3 then n.ts + interval '7 hours' end,
  true,
  'ZZ-DEMO 2026-08-12',
  n.ts
from namen n
join promoter_liste p
  on p.berater_id = n.berater_id and p.p_idx = n.ziel_promoter;

alter table public.empfehlungen enable trigger empfehlungen_check_stufe_insert;

-- ---------------------------------------------------------------------
-- 3) Prämien für die Demo-Promoter erzeugen (ohne Mailversand)
--
-- ACHTUNG, bekannter Live-Fehler: sync_praemien_for_empfehler findet nur
-- Belohnungsstufen mit passender berater_id. Die Stufen existieren aber
-- ausschließlich unter Kais berater_id. Für alle anderen Berater legt die
-- Funktion deshalb nichts an, auch bei echten Kunden nicht. Solange das
-- nicht behoben ist, werden die Prämien hier direkt eingefügt.
-- ---------------------------------------------------------------------
select public.sync_praemien_for_empfehler(e.id)
  from public.empfehler e
 where e.notiz like 'ZZ-DEMO 2026-08-12%'
   and exists (select 1 from public.empfehlungen x
                where x.empfehler_id = e.id and x.status = 'kunde');

insert into public.praemien (empfehler_id, berater_id, stufe, titel, wert_label, status, earned_at)
select e.id, e.berater_id, bs.stufe, bs.titel, bs.wert_label, 'offen', now()
  from public.empfehler e
  cross join (select stufe, titel, wert_label from public.belohnungs_stufen where stufe <= 2) bs
 where e.notiz like 'ZZ-DEMO 2026-08-12%'
   and (select count(*) from public.empfehlungen x
         where x.empfehler_id = e.id and x.status = 'kunde') >= bs.stufe
   and not exists (select 1 from public.praemien p
                    where p.empfehler_id = e.id and p.stufe = bs.stufe);

-- ---------------------------------------------------------------------
-- 4) Kennzahlen-Verlauf der letzten 15 Tage nachbilden,
--    damit Entwicklung und Trendpfeile in der Vorführung etwas zeigen.
-- ---------------------------------------------------------------------
delete from public.kpi_snapshots;

insert into public.kpi_snapshots
  (day, aktive_empfehler, link_klicks, empfehlungen_gesamt, kunden, geoeffnet, interessiert, anrufwunsch)
select d.tag,
       (select count(*) from public.empfehler  e where e.created_at < d.tag + 1),
       (select coalesce(sum(x.link_klicks), 0) from public.empfehlungen x where x.created_at < d.tag + 1),
       (select count(*) from public.empfehlungen x where x.created_at < d.tag + 1),
       (select count(*) from public.empfehlungen x where x.created_at < d.tag + 1 and x.status = 'kunde'),
       (select count(*) from public.empfehlungen x where x.created_at < d.tag + 1 and x.link_geoeffnet),
       (select count(*) from public.empfehlungen x where x.created_at < d.tag + 1 and x.interessiert),
       (select count(*) from public.empfehlungen x where x.created_at < d.tag + 1 and x.anrufwunsch is not null)
  from (select generate_series(current_date - 14, current_date, interval '1 day')::date as tag) d;

commit;
