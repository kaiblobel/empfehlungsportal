-- =====================================================================
-- Phase 14 · Inhalte wieder GETEILT + nur Admin + Impressum/Datenschutz pro Berater
-- Angewandt 2026-06-22 via Supabase MCP (phase14_shared_content_admin_and_impressum).
-- Dreht Phase 53 ('pro Berater eigene Inhalte') zurück: EIN gemeinsames
-- Empfehlungsprogramm (Kais Set), nur Admin (Kai) editiert.
-- =====================================================================

-- 1) Geklonte Nicht-Admin-Inhalte entfernen -> Kais Set = geteiltes Set
delete from vorlagen           where berater_id <> 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';
delete from belohnungs_stufen  where berater_id <> 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';
delete from erfolgsgeschichten where berater_id <> 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';

-- 2) Auto-Klon-Trigger + Funktion entfernen (Inhalte sind jetzt geteilt)
drop trigger if exists clone_content_on_berater_insert on berater;
drop function if exists trg_clone_default_content();
drop function if exists clone_default_content(uuid);

-- 3) Content-Schreibrechte: nur Admin (public read bleibt)
drop policy if exists "vorlagen auth insert" on vorlagen;
drop policy if exists "vorlagen auth update" on vorlagen;
drop policy if exists "vorlagen auth delete" on vorlagen;
create policy "vorlagen admin insert" on vorlagen for insert to authenticated with check (is_current_berater_admin());
create policy "vorlagen admin update" on vorlagen for update to authenticated using (is_current_berater_admin()) with check (is_current_berater_admin());
create policy "vorlagen admin delete" on vorlagen for delete to authenticated using (is_current_berater_admin());

drop policy if exists "belohn auth insert" on belohnungs_stufen;
drop policy if exists "belohn auth update" on belohnungs_stufen;
drop policy if exists "belohn auth delete" on belohnungs_stufen;
create policy "belohn admin insert" on belohnungs_stufen for insert to authenticated with check (is_current_berater_admin());
create policy "belohn admin update" on belohnungs_stufen for update to authenticated using (is_current_berater_admin()) with check (is_current_berater_admin());
create policy "belohn admin delete" on belohnungs_stufen for delete to authenticated using (is_current_berater_admin());

drop policy if exists "erfolg auth insert" on erfolgsgeschichten;
drop policy if exists "erfolg auth update" on erfolgsgeschichten;
drop policy if exists "erfolg auth delete" on erfolgsgeschichten;
create policy "erfolg admin insert" on erfolgsgeschichten for insert to authenticated with check (is_current_berater_admin());
create policy "erfolg admin update" on erfolgsgeschichten for update to authenticated using (is_current_berater_admin()) with check (is_current_berater_admin());
create policy "erfolg admin delete" on erfolgsgeschichten for delete to authenticated using (is_current_berater_admin());

-- 4) Impressum/Datenschutz pro Berater (URLs)
alter table berater add column if not exists impressum_url text;
alter table berater add column if not exists datenschutz_url text;
update berater set
  impressum_url   = 'https://www.dvag.de/kai.blobel/impressum.html',
  datenschutz_url = 'https://www.dvag.de/kai.blobel/datenschutz.html'
where id = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';

-- 5) Public-RPCs um die neuen Felder erweitern (DROP+CREATE wegen Rückgabetyp)
drop function if exists get_berater_public(text);
create function get_berater_public(p_slug text)
returns table(id uuid, name text, rolle text, foto_url text, bookings_url text, whatsapp text, telefon text, email text, slug text, impressum_url text, datenschutz_url text)
language sql security definer set search_path to 'public'
as $$
  select id, name, rolle, foto_url, bookings_url, whatsapp, telefon, email, slug, impressum_url, datenschutz_url
  from public.berater where lower(slug) = lower(p_slug) and ist_aktiv limit 1;
$$;

drop function if exists get_berater_public_by_id(uuid);
create function get_berater_public_by_id(p_id uuid)
returns table(id uuid, name text, rolle text, foto_url text, bookings_url text, whatsapp text, telefon text, email text, slug text, impressum_url text, datenschutz_url text)
language sql security definer set search_path to 'public'
as $$
  select id, name, rolle, foto_url, bookings_url, whatsapp, telefon, email, slug, impressum_url, datenschutz_url
  from public.berater where id = p_id and ist_aktiv limit 1;
$$;
-- Hinweis: neue Funktionen haben Default-EXECUTE für PUBLIC (anon kann lesen) — gewollt.
