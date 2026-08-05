-- =====================================================================
-- Phase 157 · Hinweis bei neuem Promoter
--
-- VORBEREITET, NICHT ANGEWENDET.
-- Erst nach Deployment der Edge Function notify-promoter anwenden.
-- =====================================================================

create or replace function public.notify_promoter_created_trigger()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_token text;
begin
  if new.self_registered_at is null then
    return new;
  end if;

  select value into v_token
    from public.app_secrets
   where key = 'INTERNAL_FUNCTION_TOKEN';

  perform net.http_post(
    url := 'https://kkseqhmfubzfyloffkwe.supabase.co/functions/v1/notify-promoter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Token', coalesce(v_token, '')
    ),
    body := jsonb_build_object('id', new.id)
  );
  return new;
exception when others then
  raise warning 'notify_promoter_created_trigger failed: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notify_promoter_created_trigger()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_notify_promoter_created on public.empfehler;
create trigger trg_notify_promoter_created
  after insert on public.empfehler
  for each row
  when (new.self_registered_at is not null)
  execute function public.notify_promoter_created_trigger();

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'empfehler'
  ) then
    alter publication supabase_realtime add table public.empfehler;
  end if;
end;
$$;

-- Rollback:
-- drop trigger if exists trg_notify_promoter_created on public.empfehler;
-- drop function if exists public.notify_promoter_created_trigger();
-- alter publication supabase_realtime drop table public.empfehler;
