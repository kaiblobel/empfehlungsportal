-- ============================================================
-- Phase 22 / Build-Phase 78 · Themen-Status + Promoter-Profil
-- ------------------------------------------------------------
-- (A) Themen-Seiten „In Arbeit"-Marker: neues Flag vorlagen.in_arbeit — NUR fürs
--     Admin-CMS (Badge/Toggle). KEIN Einfluss auf die Kundenansicht (getVorlagen
--     filtert weiterhin nur aktiv, nicht in_arbeit). Alle aktuellen Themen = in Arbeit.
-- (B) Promoter-Profil: empfehler bekommt adresse/motive/notiz. Neue UPDATE-Policy,
--     damit der Berater seine eigenen Promoter bearbeiten darf (spiegelt die
--     bestehende Select-Policy berater_id = (select current_berater_id())).
--
-- Bereits per Supabase-MCP live (Migration phase78_themen_status_promoter_felder).
-- Rollback-only verifiziert: eigener Berater update -> 1 Zeile, fremder -> 0 Zeilen.
-- ============================================================

alter table public.vorlagen add column if not exists in_arbeit boolean not null default false;
update public.vorlagen set in_arbeit = true;

alter table public.empfehler add column if not exists adresse text;
alter table public.empfehler add column if not exists motive text;
alter table public.empfehler add column if not exists notiz text;

create policy "empfehler scoped update" on public.empfehler
  for update to authenticated
  using (berater_id = (select current_berater_id()))
  with check (berater_id = (select current_berater_id()));
