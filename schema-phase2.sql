-- ============================================================
-- Empfehlungsportal · Phase 2 · Schema-Erweiterungen
-- ============================================================
-- Idempotent: kann beliebig oft ausgefuehrt werden.
-- Reihenfolge: Spalten -> Trigger -> RLS-Policies
-- ============================================================

-- 1. Spalten ergänzen ----------------------------------------
alter table empfehlungen add column if not exists status      text default 'offen';
alter table empfehlungen add column if not exists notiz       text;
alter table empfehlungen add column if not exists link_klicks integer default 0;
-- Status-Werte: 'offen' | 'kontaktiert' | 'kunde' | 'kein_interesse'


-- 2. Trigger: link_klicks automatisch hochzählen --------------
-- Phase-1-Code ruft beim Mount der Empfänger-Seite immer
-- `update empfehlungen set link_geoeffnet=true ...` auf.
-- Der Trigger inkrementiert pro Update den Klick-Zähler.

create or replace function increment_link_klicks()
returns trigger as $$
begin
  NEW.link_klicks = COALESCE(OLD.link_klicks, 0) + 1;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_link_klicks_inc on empfehlungen;
create trigger trg_link_klicks_inc
  before update of link_geoeffnet on empfehlungen
  for each row
  when (NEW.link_geoeffnet = true)
  execute function increment_link_klicks();


-- 3. RLS-Policies für authentifizierten Dashboard-Zugriff -----
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'empfehlung auth select all' and tablename = 'empfehlungen') then
    create policy "empfehlung auth select all" on empfehlungen for select
      using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'empfehlung auth update' and tablename = 'empfehlungen') then
    create policy "empfehlung auth update" on empfehlungen for update
      using (auth.role() = 'authenticated');
  end if;
end $$;
