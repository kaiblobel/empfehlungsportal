-- Phase 359: Jeder Berater sieht die Sommerfest-Anmeldungen noch einmal, bis Montag
--
-- Kais Auftrag vom 11.09.2026: "die KIDZ Sommerfestteilnehmer bis Montag wieder
-- fuer alle Berater freigeben, so dass jeder wieder alle sieht". Anlass ist die
-- Nacharbeit nach dem Fest: 170 der 225 Kontakte liegen noch beim
-- Vorgabeberater, die Zuordnung laeuft im Team (Phase 338).
--
-- Freigegeben wird nur das Sehen, wie in Phase 333 Regel 1. Nicht wieder
-- geoeffnet werden das Schreiben an fremden Anmeldungen, das Haekchen fuer
-- KIDZ for Future und das Loeschen. Das bleibt so, wie Phase 336 es
-- zurueckgesetzt hat.
--
-- Die Freigabe ist dreifach begrenzt:
--   * auf event_key = 'kidz-sommerfest-2026'
--   * auf Personen mit Beraterkonto (current_berater_id() is not null)
--   * zeitlich: bis Montag, 14.09.2026, 24 Uhr. Danach greift die Regel nicht
--     mehr, ohne dass jemand daran denken muss. Aufgeraeumt wird sie bei der
--     naechsten Migration an dieser Tabelle.

begin;

drop policy if exists kidz_gewinnspiel_team_select_befristet
  on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_team_select_befristet
  on public.kidz_gewinnspiel_teilnahmen for select
  to authenticated
  using (
    public.current_berater_id() is not null
    and event_key = 'kidz-sommerfest-2026'
    and now() < timestamptz '2026-09-15 00:00:00+02'
  );

commit;
