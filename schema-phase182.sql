-- Phase 182: Geschützte KIDZ-Teilnehmerverwaltung
-- Manuelles Löschen nur durch Administratoren, anonymes Löschprotokoll
-- und automatische Datenbereinigung nach Ende der Aufbewahrungsfrist.
-- LIVE ANGEWENDET AM 11.08.2026 ALS phase_182_kidz_teilnehmerverwaltung.

create table if not exists public.kidz_gewinnspiel_loeschprotokoll (
  id bigint generated always as identity primary key,
  event_key text not null,
  reference_hash text not null,
  reason text not null,
  deletion_source text not null,
  had_ticket boolean not null default false,
  deleted_by uuid,
  deleted_at timestamptz not null default clock_timestamp(),
  constraint kidz_loeschprotokoll_reference_hash check (reference_hash ~ '^[0-9a-f]{64}$'),
  constraint kidz_loeschprotokoll_reason check (reason in ('test', 'duplicate', 'erasure_request', 'retention_expired')),
  constraint kidz_loeschprotokoll_source check (deletion_source in ('manual', 'automatic')),
  constraint kidz_loeschprotokoll_actor check (
    (deletion_source = 'manual' and deleted_by is not null)
    or (deletion_source = 'automatic' and deleted_by is null)
  )
);

comment on table public.kidz_gewinnspiel_loeschprotokoll is
  'Anonymes Prüfprotokoll gelöschter KIDZ-Teilnahmen. Enthält keine Namen, Kontaktwege, Referenzen oder Losnummern.';

alter table public.kidz_gewinnspiel_loeschprotokoll enable row level security;
alter table public.kidz_gewinnspiel_loeschprotokoll force row level security;
revoke all on table public.kidz_gewinnspiel_loeschprotokoll from public, anon, authenticated;
grant insert on table public.kidz_gewinnspiel_loeschprotokoll to authenticated;

drop policy if exists kidz_loeschprotokoll_admin_insert on public.kidz_gewinnspiel_loeschprotokoll;
create policy kidz_loeschprotokoll_admin_insert
  on public.kidz_gewinnspiel_loeschprotokoll for insert
  to authenticated
  with check (
    public.is_current_berater_admin()
    and deletion_source = 'manual'
    and deleted_by = (select auth.uid())
  );

drop policy if exists kidz_gewinnspiel_berater_delete on public.kidz_gewinnspiel_teilnahmen;
drop policy if exists kidz_gewinnspiel_admin_delete on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_admin_delete
  on public.kidz_gewinnspiel_teilnahmen for delete
  to authenticated
  using ((select public.is_current_berater_admin()));

create or replace function public.delete_kidz_gewinnspiel_participation(
  p_participation_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry record;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not (select public.is_current_berater_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_reason is null or p_reason not in ('test', 'duplicate', 'erasure_request') then
    raise exception 'invalid_deletion_reason' using errcode = '22023';
  end if;

  select id, event_key, reference, ticket_number
    into v_entry
    from public.kidz_gewinnspiel_teilnahmen
   where id = p_participation_id
     and event_key = 'kidz-sommerfest-2026'
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  insert into public.kidz_gewinnspiel_loeschprotokoll (
    event_key,
    reference_hash,
    reason,
    deletion_source,
    had_ticket,
    deleted_by
  ) values (
    v_entry.event_key,
    encode(extensions.digest(v_entry.reference, 'sha256'), 'hex'),
    p_reason,
    'manual',
    v_entry.ticket_number is not null,
    (select auth.uid())
  );

  delete from public.kidz_gewinnspiel_teilnahmen
   where id = v_entry.id;

  if not found then
    raise exception 'participant_delete_failed' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'had_ticket', v_entry.ticket_number is not null
  );
end;
$$;

revoke execute on function public.delete_kidz_gewinnspiel_participation(uuid, text)
  from public, anon;
grant execute on function public.delete_kidz_gewinnspiel_participation(uuid, text)
  to authenticated;

create or replace function public.cleanup_kidz_gewinnspiel_expired()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted integer := 0;
begin
  insert into public.kidz_gewinnspiel_loeschprotokoll (
    event_key,
    reference_hash,
    reason,
    deletion_source,
    had_ticket,
    deleted_by
  )
  select
    event_key,
    encode(extensions.digest(reference, 'sha256'), 'hex'),
    'retention_expired',
    'automatic',
    ticket_number is not null,
    null
  from public.kidz_gewinnspiel_teilnahmen
  where event_key = 'kidz-sommerfest-2026'
    and created_at < timestamptz '2027-01-01 00:00:00+01';

  delete from public.kidz_gewinnspiel_teilnahmen
  where event_key = 'kidz-sommerfest-2026'
    and created_at < timestamptz '2027-01-01 00:00:00+01';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.cleanup_kidz_gewinnspiel_expired()
  from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'kidz-gewinnspiel-aufbewahrungsfrist';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'kidz-gewinnspiel-aufbewahrungsfrist',
    '15 3 1 1 *',
    'select public.cleanup_kidz_gewinnspiel_expired();'
  );
end;
$$;
