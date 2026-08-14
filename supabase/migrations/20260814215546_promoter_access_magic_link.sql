-- Sicherer Zugang fuer bestehende Empfehler.
-- Gespeichert wird nur der SHA-256-Hash des Einmal-Codes.

create table if not exists private.empfehler_access_tokens (
  id uuid primary key default gen_random_uuid(),
  empfehler_id uuid not null references public.empfehler(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  sent_at timestamptz,
  used_at timestamptz,
  check (expires_at > created_at)
);

alter table private.empfehler_access_tokens enable row level security;
revoke all on table private.empfehler_access_tokens from public, anon, authenticated, service_role;

create index if not exists empfehler_access_tokens_empfehler_idx
  on private.empfehler_access_tokens (empfehler_id, created_at desc);
create index if not exists empfehler_access_tokens_expiry_idx
  on private.empfehler_access_tokens (expires_at) where used_at is null;

create or replace function public.request_empfehler_access(
  p_secret text,
  p_email text,
  p_berater_slug text,
  p_rate_key text,
  p_contact_key text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_berater_id uuid;
  v_berater_name text;
  v_empfehler_id uuid;
  v_empfehler_name text;
  v_access_id uuid;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'promoter_self_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'Promoter access authentication failed';
  end if;

  perform private.rate_limit_check_key('promoter_access_hour', p_rate_key, 5, interval '1 hour');
  perform private.rate_limit_check_key('promoter_access_day', p_rate_key, 15, interval '24 hours');
  perform private.rate_limit_check_key('promoter_access_contact_day', p_contact_key, 3, interval '24 hours');

  if length(v_email) > 180
     or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$'
     or coalesce(p_berater_slug, '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise invalid_parameter_value using message = 'Invalid promoter access request';
  end if;

  select b.id, b.name into v_berater_id, v_berater_name
    from public.berater b
   where lower(b.slug) = lower(trim(p_berater_slug)) and b.ist_aktiv
   limit 1;

  if v_berater_id is null then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  select e.id, e.name into v_empfehler_id, v_empfehler_name
    from public.empfehler e
   where e.berater_id = v_berater_id
     and lower(trim(coalesce(e.email, ''))) = v_email
   order by e.self_registered_at desc nulls last, e.created_at desc, e.id
   limit 1;

  if v_empfehler_id is null then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  delete from private.empfehler_access_tokens
   where expires_at < clock_timestamp() - interval '24 hours';

  insert into private.empfehler_access_tokens (empfehler_id, token_hash, expires_at)
  values (v_empfehler_id, p_token_hash, clock_timestamp() + interval '15 minutes')
  returning id into v_access_id;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'access_id', v_access_id,
    'email', v_email,
    'name', v_empfehler_name,
    'berater_name', v_berater_name
  );
end;
$$;

revoke execute on function public.request_empfehler_access(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.request_empfehler_access(text, text, text, text, text, text)
  to service_role;

create or replace function public.mark_empfehler_access_sent(p_access_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update private.empfehler_access_tokens
     set sent_at = coalesce(sent_at, clock_timestamp())
   where id = p_access_id and used_at is null and expires_at > clock_timestamp()
  returning true;
$$;

revoke execute on function public.mark_empfehler_access_sent(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_empfehler_access_sent(uuid) to service_role;

create or replace function public.consume_empfehler_access(p_secret text, p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_empfehler_id uuid;
  v_code text;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'promoter_self_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'Promoter access authentication failed';
  end if;

  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false);
  end if;

  update private.empfehler_access_tokens
     set used_at = clock_timestamp()
   where token_hash = p_token_hash
     and used_at is null
     and expires_at > clock_timestamp()
  returning empfehler_id into v_empfehler_id;

  if v_empfehler_id is null then
    return jsonb_build_object('ok', false);
  end if;

  select e.code into v_code from public.empfehler e where e.id = v_empfehler_id;
  if nullif(trim(coalesce(v_code, '')), '') is null then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object('ok', true, 'code', v_code);
end;
$$;

revoke execute on function public.consume_empfehler_access(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_empfehler_access(text, text) to service_role;
