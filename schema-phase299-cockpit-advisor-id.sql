-- =====================================================================
-- Phase 299 · Cockpit-Anker an der Beratertabelle
--
-- Warum: Dieselbe Person kann im Berater-Cockpit unter einer anderen
-- E-Mail eingeloggt sein als hier im Portal. Die Zuordnung liegt bisher
-- als handgepflegtes JSON in der Cockpit-Datenbank
-- (integration_config → 'empfehlungsportal_berater_map', gelesen in
-- src/lib/empfehlungsportal.ts). Sie gehört an die Person, nicht in eine
-- Konfigurationszeile eines anderen Projekts.
--
-- Diese Phase legt nur das Feld an und macht es in der Beraterverwaltung
-- pflegbar. Am Cockpit ändert sich NICHTS, die Zuordnung dort läuft
-- unverändert über das JSON weiter.
--
-- Ausdrücklich NICHT Teil dieser Spalte:
--   * get_berater_public / get_berater_public_by_id geben sie nicht aus —
--     Kundenseiten haben mit einer internen Cockpit-Kennung nichts zu tun.
--   * berater_self_update (Phase 300) nimmt sie nicht in die Whitelist auf —
--     reines Adminfeld, ein Berater darf seine Zuordnung nicht umhängen.
--
-- Idempotent. Keine Datenzeile wird angefasst.
-- =====================================================================

alter table public.berater
  add column if not exists cockpit_advisor_id uuid;

comment on column public.berater.cockpit_advisor_id is
  'advisors.id aus dem Berater-Cockpit. Ordnet diesen Portal-Berater der '
  'gleichen Person im Cockpit zu, auch wenn dort eine andere E-Mail am '
  'Login hängt. Nur von Admins pflegbar, nicht öffentlich sichtbar.';

-- Teil-Index statt unique constraint: mehrere Berater OHNE Zuordnung
-- (NULL) müssen nebeneinander bestehen können. Ein unique constraint
-- ließe das zwar in Postgres auch zu, der Teil-Index sagt die Absicht
-- aber deutlicher und bleibt schlank.
create unique index if not exists berater_cockpit_advisor_id_uidx
  on public.berater (cockpit_advisor_id)
  where cockpit_advisor_id is not null;

-- ---------------------------------------------------------------------
-- KONTROLLE nach dem Einspielen:
--
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema='public' and table_name='berater'
--      and column_name='cockpit_advisor_id';
--
-- Und: get_berater_public darf weiterhin genau 15 Spalten liefern,
-- die neue ist NICHT dabei.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- ROLLBACK (nur Metadaten, aber Achtung: löscht gepflegte Zuordnungen):
--
--   drop index if exists public.berater_cockpit_advisor_id_uidx;
--   alter table public.berater drop column if exists cockpit_advisor_id;
--
-- Vorher sichern, falls schon Zuordnungen eingetragen sind:
--   select slug, cockpit_advisor_id from public.berater
--    where cockpit_advisor_id is not null;
-- ---------------------------------------------------------------------
