-- Phase 15 · Prämien-Tracking
-- Hält fest, welche definierte Belohnungsstufe ein Empfehler verdient hat
-- (Stufe erreicht = Anzahl gewonnener Kunden >= Stufe) und ob sie ausgezahlt ist.
-- Angewendet via Supabase MCP apply_migration (phase15_praemien_tracking).

create table if not exists praemien (
  id uuid primary key default gen_random_uuid(),
  empfehler_id uuid not null references empfehler(id) on delete cascade,
  berater_id uuid references berater(id) on delete set null,
  stufe int not null,
  titel text not null,
  wert_label text,
  status text not null default 'offen',          -- offen | ausgezahlt | verzichtet
  variante text,                                  -- z. B. "Apple Watch" bei Wahl-Prämien
  notiz text,
  earned_at timestamp default now(),
  ausgezahlt_at timestamp,
  unique (empfehler_id, stufe)
);

alter table praemien drop constraint if exists praemien_status_chk;
alter table praemien add constraint praemien_status_chk
  check (status in ('offen','ausgezahlt','verzichtet'));

create index if not exists idx_praemien_berater on praemien(berater_id);
create index if not exists idx_praemien_status on praemien(status);

alter table praemien enable row level security;

drop policy if exists praemien_select on praemien;
create policy praemien_select on praemien for select
  using (berater_id = current_berater_id() or is_current_berater_admin());

drop policy if exists praemien_write on praemien;
create policy praemien_write on praemien for all
  using (berater_id = current_berater_id() or is_current_berater_admin())
  with check (berater_id = current_berater_id() or is_current_berater_admin());

-- Materialisiert verdiente Prämien (Status 'offen') für EINEN Empfehler.
create or replace function sync_praemien_for_empfehler(p_empfehler_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_berater uuid;
  v_kunden int;
begin
  select berater_id into v_berater from empfehler where id = p_empfehler_id;
  select count(*) into v_kunden from empfehlungen
    where empfehler_id = p_empfehler_id and status = 'kunde';

  insert into praemien (empfehler_id, berater_id, stufe, titel, wert_label)
  select p_empfehler_id, v_berater, bs.stufe, bs.titel, bs.wert_label
  from belohnungs_stufen bs
  where bs.berater_id = v_berater
    and bs.stufe <= v_kunden
    and not exists (
      select 1 from praemien p
      where p.empfehler_id = p_empfehler_id and p.stufe = bs.stufe
    );
end;
$$;

-- Materialisiert für alle Empfehler des aktuellen Beraters (Admin: alle). Vom Dashboard aufrufbar.
create or replace function sync_praemien()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record;
begin
  for r in
    select e.id from empfehler e
    where e.berater_id = current_berater_id() or is_current_berater_admin()
  loop
    perform sync_praemien_for_empfehler(r.id);
  end loop;
end;
$$;

-- Trigger: sobald eine Empfehlung auf 'kunde' wechselt, frisch verdiente Prämien anlegen.
create or replace function trg_empfehlung_kunde_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = 'kunde' and (old.status is distinct from 'kunde') and new.empfehler_id is not null then
    perform sync_praemien_for_empfehler(new.empfehler_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_empfehlung_kunde on empfehlungen;
create trigger trg_empfehlung_kunde
  after update on empfehlungen
  for each row execute function trg_empfehlung_kunde_sync();
