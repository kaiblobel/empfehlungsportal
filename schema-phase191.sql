-- =====================================================================
-- Phase 191 · Exklusiver KIDZ-Elternabend
--
-- LIVE ANGEWENDET AM 12.08.2026 ALS phase_191_kidz_elternabend.
-- Eigene Vormerkliste mit Berater-/Promoterzuordnung, RLS und Realtime.
-- Gewinnspielteilnahmen und deren Daten bleiben vollständig getrennt.
-- =====================================================================

begin;

-- Sichtbare Namenskorrektur bei unveränderter Zuordnung und stabilem Schlüssel.
do $$
declare
  v_sven uuid;
begin
  select id into v_sven
    from public.berater
   where lower(slug) = 'sven-augustin'
     and ist_aktiv
   limit 1;

  if v_sven is null then
    raise exception 'KIDZ advisor Sven Augustin is missing';
  end if;

  update public.empfehler
     set name = 'Anika Biebrach'
   where berater_id = v_sven
     and lower(trim(name)) in ('anika bibrach', 'anika biebrach');

  update public.kidz_gewinnspiel_einladende
     set name = 'Anika Biebrach',
         berater_id = v_sven
   where key = 'promoter-anika-bibrach';
end;
$$;

create table if not exists public.kidz_elternabend_anmeldungen (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  event_key text not null,
  berater_id uuid not null references public.berater(id),
  empfehler_id uuid references public.empfehler(id) on delete set null,
  name text not null,
  email text,
  telefon text,
  source text not null,
  time_preference text not null default 'flexibel',
  question text,
  status text not null default 'vorgemerkt',
  scheduled_for timestamptz,
  conditions_version text not null,
  contact_key text not null,
  consent_at timestamptz not null default clock_timestamp(),
  contacted_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  delete_after date not null default ((current_date + interval '18 months')::date),
  constraint kidz_elternabend_name_check check (length(trim(name)) between 2 and 100),
  constraint kidz_elternabend_contact_check check (email is not null or telefon is not null),
  constraint kidz_elternabend_source_check check (source in (
    'elternabend-qr', 'kidz-station', 'berater-einladung', 'sommerfest-danke',
    'facebook', 'instagram', 'whatsapp', 'direkt'
  )),
  constraint kidz_elternabend_time_check check (time_preference in (
    'werktag-abends', 'samstag-vormittags', 'flexibel'
  )),
  constraint kidz_elternabend_status_check check (status in (
    'vorgemerkt', 'eingeladen', 'bestaetigt', 'teilgenommen', 'abgesagt'
  )),
  constraint kidz_elternabend_question_check check (question is null or length(question) <= 500),
  constraint kidz_elternabend_contact_unique unique (event_key, contact_key)
);

comment on table public.kidz_elternabend_anmeldungen is
  'Separate Vormerkliste für den exklusiven KIDZ-Elternabend. Keine Gewinnspiel- oder Kundendatenstrecke.';
comment on column public.kidz_elternabend_anmeldungen.delete_after is
  'Spätester Prüf- und Löschzeitpunkt. Eine frühere Löschung nach Zweckerfüllung oder Widerruf bleibt möglich.';

create index if not exists kidz_elternabend_berater_created_idx
  on public.kidz_elternabend_anmeldungen (berater_id, created_at desc);
create index if not exists kidz_elternabend_empfehler_created_idx
  on public.kidz_elternabend_anmeldungen (empfehler_id, created_at desc)
  where empfehler_id is not null;
create index if not exists kidz_elternabend_status_created_idx
  on public.kidz_elternabend_anmeldungen (status, created_at desc);

alter table public.kidz_elternabend_anmeldungen enable row level security;
alter table public.kidz_elternabend_anmeldungen force row level security;
revoke all on table public.kidz_elternabend_anmeldungen from public, anon, authenticated;
grant select on table public.kidz_elternabend_anmeldungen to authenticated;
grant update (status, scheduled_for, contacted_at)
  on table public.kidz_elternabend_anmeldungen to authenticated;

drop policy if exists kidz_elternabend_berater_select on public.kidz_elternabend_anmeldungen;
create policy kidz_elternabend_berater_select
  on public.kidz_elternabend_anmeldungen for select
  to authenticated
  using (berater_id = public.current_berater_id() or public.is_current_berater_admin());

drop policy if exists kidz_elternabend_berater_update on public.kidz_elternabend_anmeldungen;
create policy kidz_elternabend_berater_update
  on public.kidz_elternabend_anmeldungen for update
  to authenticated
  using (berater_id = public.current_berater_id() or public.is_current_berater_admin())
  with check (berater_id = public.current_berater_id() or public.is_current_berater_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'kidz_elternabend_anmeldungen'
     ) then
    execute 'alter publication supabase_realtime add table public.kidz_elternabend_anmeldungen';
  end if;
end;
$$;

create or replace function public.register_kidz_elternabend_public(
  p_secret text,
  p_event_key text,
  p_berater_slug text,
  p_name text,
  p_email text,
  p_telefon text,
  p_source text,
  p_time_preference text,
  p_question text,
  p_conditions_version text,
  p_rate_key text,
  p_contact_key text,
  p_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_berater uuid;
  v_empfehler uuid;
  v_name text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 100);
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_telefon text := nullif(trim(coalesce(p_telefon, '')), '');
  v_phone_digits text;
  v_source text := lower(trim(coalesce(p_source, 'direkt')));
  v_time_preference text := lower(trim(coalesce(p_time_preference, 'flexibel')));
  v_question text := nullif(left(regexp_replace(trim(coalesce(p_question, '')), '\s+', ' ', 'g'), 500), '');
  v_reference text;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'kidz_parent_evening_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'KIDZ parent evening authentication failed';
  end if;

  perform private.rate_limit_check_key('kidz_parent_evening_hour', p_rate_key, 5, interval '1 hour');
  perform private.rate_limit_check_key('kidz_parent_evening_day', p_rate_key, 12, interval '24 hours');
  perform private.rate_limit_check_key('kidz_parent_evening_contact_day', p_contact_key, 2, interval '24 hours');

  if p_consent is not true
     or p_event_key <> 'kidz-elternabend-warteliste-2026'
     or p_conditions_version <> '2026-08-12-v1'
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or v_source not in (
       'elternabend-qr', 'kidz-station', 'berater-einladung', 'sommerfest-danke',
       'facebook', 'instagram', 'whatsapp', 'direkt'
     )
     or v_time_preference not in ('werktag-abends', 'samstag-vormittags', 'flexibel') then
    raise invalid_parameter_value using message = 'Invalid KIDZ parent evening registration';
  end if;

  if v_email is not null and (length(v_email) > 180 or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    raise invalid_parameter_value using message = 'Invalid parent evening email';
  end if;
  v_phone_digits := regexp_replace(coalesce(v_telefon, ''), '\D', '', 'g');
  if v_telefon is not null and length(v_phone_digits) not between 8 and 15 then
    raise invalid_parameter_value using message = 'Invalid parent evening phone';
  end if;
  if v_email is null and v_telefon is null then
    raise invalid_parameter_value using message = 'Parent evening contact required';
  end if;

  select e.berater_id, e.empfehler_id
    into v_berater, v_empfehler
    from public.kidz_gewinnspiel_einladende e
   where lower(e.key) = lower(trim(coalesce(p_berater_slug, '')))
     and e.ist_aktiv
   limit 1;

  if v_berater is null then
    select id into v_berater
      from public.berater
     where lower(slug) = lower(trim(coalesce(p_berater_slug, '')))
       and ist_aktiv
     limit 1;
  end if;
  if v_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;

  v_reference := 'KIDZ-EA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  begin
    insert into public.kidz_elternabend_anmeldungen (
      reference, event_key, berater_id, empfehler_id, name, email, telefon, source,
      time_preference, question, conditions_version, contact_key, consent_at
    ) values (
      v_reference, p_event_key, v_berater, v_empfehler, v_name, v_email, v_telefon, v_source,
      v_time_preference, v_question, p_conditions_version, p_contact_key, clock_timestamp()
    );
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end;

  return jsonb_build_object('ok', true, 'reference', v_reference);
end;
$$;

revoke execute on function public.register_kidz_elternabend_public(
  text, text, text, text, text, text, text, text, text, text, text, text, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.register_kidz_elternabend_public(
  text, text, text, text, text, text, text, text, text, text, text, text, boolean
) to anon;

-- Produktiv wurde ein eigenes neu erzeugtes Geheimnis getrennt vom Gewinnspiel hinterlegt:
-- insert into private.integration_secrets (name, secret_hash)
-- values ('kidz_parent_evening_registration', '<sha256-von-KIDZ_PARENT_EVENING_REGISTRATION_SECRET>')
-- on conflict (name) do update set secret_hash = excluded.secret_hash, created_at = now();

commit;
