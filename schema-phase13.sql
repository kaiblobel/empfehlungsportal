-- =====================================================================
-- Phase 13 · Berater-Verwaltung nur für Admin (Kai)
-- Angewandt am 2026-06-22 via Supabase MCP (Migration phase13_berater_admin_only).
-- Vorher: jeder eingeloggte Berater durfte Berater anlegen/ändern/löschen
-- (Policies check=true/qual=true). Jetzt nur noch Admin.
-- =====================================================================

-- 1) Admin-Flag
alter table berater add column if not exists ist_admin boolean not null default false;
update berater set ist_admin = true where id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48'; -- Kai Blobel

-- 2) Helper: ist der eingeloggte Berater Admin?
create or replace function is_current_berater_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select ist_admin from berater where id = current_berater_id()), false);
$$;
revoke execute on function is_current_berater_admin() from anon;

-- 3) Schreibrechte auf berater nur für Admin (public read bleibt für Branding)
drop policy if exists "berater authenticated insert" on berater;
drop policy if exists "berater authenticated update" on berater;
drop policy if exists "berater authenticated delete" on berater;
create policy "berater admin insert" on berater for insert to authenticated
  with check (is_current_berater_admin());
create policy "berater admin update" on berater for update to authenticated
  using (is_current_berater_admin()) with check (is_current_berater_admin());
create policy "berater admin delete" on berater for delete to authenticated
  using (is_current_berater_admin());
