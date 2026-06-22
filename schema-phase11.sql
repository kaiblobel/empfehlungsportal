-- =====================================================================
-- Phase 11 · Inhalte pro Berater (Multi-Tenant Content)
-- Angewandt am 2026-06-22 via Supabase MCP (Migration phase11_multitenant_content).
-- Jeder Berater pflegt eigene vorlagen / belohnungs_stufen / erfolgsgeschichten.
-- =====================================================================

-- 1) Constraints: slug nur noch pro Berater eindeutig, belohnungs_stufen PK
--    composite, FK auf vorlagen.slug lösen (Zuordnung künftig per berater_id+slug)
alter table erfolgsgeschichten drop constraint if exists erfolgsgeschichten_vorlage_slug_fkey;

alter table vorlagen drop constraint if exists vorlagen_slug_key;
alter table vorlagen add constraint vorlagen_berater_slug_key unique (berater_id, slug);

alter table belohnungs_stufen drop constraint if exists belohnungs_stufen_pkey;
alter table belohnungs_stufen add constraint belohnungs_stufen_pkey primary key (berater_id, stufe);

-- 2) RLS pro Berater: public read bleibt; authenticated darf nur eigene schreiben
alter table vorlagen enable row level security;
drop policy if exists "vorlagen auth update" on vorlagen;
drop policy if exists "vorlagen auth insert" on vorlagen;
drop policy if exists "vorlagen auth delete" on vorlagen;
create policy "vorlagen auth insert" on vorlagen for insert to authenticated
  with check (berater_id = current_berater_id());
create policy "vorlagen auth update" on vorlagen for update to authenticated
  using (berater_id = current_berater_id()) with check (berater_id = current_berater_id());
create policy "vorlagen auth delete" on vorlagen for delete to authenticated
  using (berater_id = current_berater_id());

alter table belohnungs_stufen enable row level security;
drop policy if exists "belohn auth insert" on belohnungs_stufen;
drop policy if exists "belohn auth update" on belohnungs_stufen;
drop policy if exists "belohn auth delete" on belohnungs_stufen;
create policy "belohn auth insert" on belohnungs_stufen for insert to authenticated
  with check (berater_id = current_berater_id());
create policy "belohn auth update" on belohnungs_stufen for update to authenticated
  using (berater_id = current_berater_id()) with check (berater_id = current_berater_id());
create policy "belohn auth delete" on belohnungs_stufen for delete to authenticated
  using (berater_id = current_berater_id());

alter table erfolgsgeschichten enable row level security;
drop policy if exists "erfolg auth insert" on erfolgsgeschichten;
drop policy if exists "erfolg auth update" on erfolgsgeschichten;
drop policy if exists "erfolg auth delete" on erfolgsgeschichten;
create policy "erfolg auth insert" on erfolgsgeschichten for insert to authenticated
  with check (berater_id = current_berater_id());
create policy "erfolg auth update" on erfolgsgeschichten for update to authenticated
  using (berater_id = current_berater_id()) with check (berater_id = current_berater_id());
create policy "erfolg auth delete" on erfolgsgeschichten for delete to authenticated
  using (berater_id = current_berater_id());

-- 3) Seeding-Funktion: klont das Startset vom Template-Berater (Kai) auf ein Ziel
create or replace function clone_default_content(p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template uuid := 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';
begin
  if p_target is null or p_target = v_template then
    return;
  end if;

  if not exists (select 1 from vorlagen where berater_id = p_target) then
    insert into vorlagen (slug, titel, icon, headline, subtext, hero_bild_url, quickcheck_url,
      vorteil_1_titel, vorteil_1_text, vorteil_2_titel, vorteil_2_text, vorteil_3_titel, vorteil_3_text,
      cta_text, aktiv, sort_order, berater_id)
    select slug, titel, icon, headline, subtext, hero_bild_url, quickcheck_url,
      vorteil_1_titel, vorteil_1_text, vorteil_2_titel, vorteil_2_text, vorteil_3_titel, vorteil_3_text,
      cta_text, aktiv, sort_order, p_target
    from vorlagen where berater_id = v_template;
  end if;

  if not exists (select 1 from belohnungs_stufen where berater_id = p_target) then
    insert into belohnungs_stufen (stufe, titel, beschreibung, icon, wert_label, highlight, sort_order, bild_url, kategorien, berater_id)
    select stufe, titel, beschreibung, icon, wert_label, highlight, sort_order, bild_url, kategorien, p_target
    from belohnungs_stufen where berater_id = v_template;
  end if;

  if not exists (select 1 from erfolgsgeschichten where berater_id = p_target) then
    insert into erfolgsgeschichten (vorlage_slug, titel, vorher, nachher, key_metric, sort_order, aktiv, berater_id)
    select vorlage_slug, titel, vorher, nachher, key_metric, sort_order, aktiv, p_target
    from erfolgsgeschichten where berater_id = v_template;
  end if;
end;
$$;

revoke execute on function clone_default_content(uuid) from anon;

-- 4) Trigger: neuer Berater bekommt automatisch das Startset
create or replace function trg_clone_default_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform clone_default_content(new.id);
  return new;
end;
$$;

drop trigger if exists clone_content_on_berater_insert on berater;
create trigger clone_content_on_berater_insert
  after insert on berater
  for each row execute function trg_clone_default_content();

-- 5) Einmalig: bestehenden 2. Berater (Sven) mit Startset befüllen
select clone_default_content('a3bb2fe3-0bab-4f19-a131-166359fa2e71');
