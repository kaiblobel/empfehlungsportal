-- =====================================================================
-- Phase 186 · KIDZ-Promoterzuordnung
--
-- ARBEITSFASSUNG ZUR ABNAHME. NOCH NICHT LIVE ANGEWENDET.
-- Die öffentliche Auswahl kann neben Beratern auch namentliche Promoter
-- enthalten. Gespeichert werden sowohl der zuständige Berater als auch
-- der tatsächlich ausgewählte Promoter. Öffentliche Promoter-Codes werden
-- dabei nicht preisgegeben.
-- =====================================================================

-- Claudius wird als internes Zuordnungsziel vorbereitet. Ohne E-Mail und
-- Auth-Verknüpfung entsteht noch kein Login, KIDZ-Kontakte können aber
-- bereits eindeutig seinem Bestand zugeordnet werden.
insert into public.berater (name, slug, rolle, ist_aktiv, ist_admin)
select 'Claudius Tusche', 'claudius-tusche', 'Vermögensberater', true, false
where not exists (
  select 1 from public.berater where lower(slug) = 'claudius-tusche'
);

do $$
declare
  v_sven uuid;
  v_claudius uuid;
begin
  select id into v_sven
    from public.berater
   where lower(slug) = 'sven-augustin'
     and ist_aktiv
   limit 1;
  select id into v_claudius
    from public.berater
   where lower(slug) = 'claudius-tusche'
     and ist_aktiv
   limit 1;

  if v_sven is null or v_claudius is null then
    raise exception 'KIDZ promoter advisor mapping is incomplete';
  end if;

  update public.empfehler
     set berater_id = v_sven
   where lower(trim(name)) = 'anika bibrach';
  if not found then
    insert into public.empfehler (code, name, berater_id, code_version)
    values (private.generate_empfehler_code('Anika Bibrach'), 'Anika Bibrach', v_sven, 2);
  end if;

  update public.empfehler
     set berater_id = v_claudius
   where lower(trim(name)) = 'david stamm';
  if not found then
    insert into public.empfehler (code, name, berater_id, code_version)
    values (private.generate_empfehler_code('David Stamm'), 'David Stamm', v_claudius, 2);
  end if;
end;
$$;

create table if not exists public.kidz_gewinnspiel_einladende (
  key text primary key,
  name text not null,
  berater_id uuid not null references public.berater(id),
  empfehler_id uuid not null unique references public.empfehler(id),
  ist_aktiv boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  constraint kidz_gewinnspiel_einladende_key check (key ~ '^promoter-[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint kidz_gewinnspiel_einladende_name check (length(trim(name)) between 2 and 100)
);

comment on table public.kidz_gewinnspiel_einladende is
  'Kontrollierte öffentliche KIDZ-Auswahl namentlicher Promoter ohne Preisgabe ihrer Empfehlungsportal-Codes.';

alter table public.kidz_gewinnspiel_einladende enable row level security;
alter table public.kidz_gewinnspiel_einladende force row level security;
revoke all on table public.kidz_gewinnspiel_einladende from public, anon, authenticated;

insert into public.kidz_gewinnspiel_einladende (key, name, berater_id, empfehler_id, ist_aktiv)
select 'promoter-anika-bibrach', 'Anika Bibrach', b.id, e.id, true
  from public.berater b
  join public.empfehler e on e.berater_id = b.id and lower(trim(e.name)) = 'anika bibrach'
 where lower(b.slug) = 'sven-augustin'
on conflict (key) do update
  set name = excluded.name,
      berater_id = excluded.berater_id,
      empfehler_id = excluded.empfehler_id,
      ist_aktiv = true;

insert into public.kidz_gewinnspiel_einladende (key, name, berater_id, empfehler_id, ist_aktiv)
select 'promoter-david-stamm', 'David Stamm', b.id, e.id, true
  from public.berater b
  join public.empfehler e on e.berater_id = b.id and lower(trim(e.name)) = 'david stamm'
 where lower(b.slug) = 'claudius-tusche'
on conflict (key) do update
  set name = excluded.name,
      berater_id = excluded.berater_id,
      empfehler_id = excluded.empfehler_id,
      ist_aktiv = true;

alter table public.kidz_gewinnspiel_teilnahmen
  add column if not exists empfehler_id uuid references public.empfehler(id) on delete set null;

create index if not exists kidz_gewinnspiel_empfehler_event_created_idx
  on public.kidz_gewinnspiel_teilnahmen (empfehler_id, event_key, created_at desc)
  where empfehler_id is not null;

comment on column public.kidz_gewinnspiel_teilnahmen.empfehler_id is
  'Optionaler namentlicher Promoter aus der öffentlichen KIDZ-Einladungsauswahl.';

create or replace function public.list_kidz_berater_public()
returns table(name text, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select auswahl.name, auswahl.slug
    from (
      select left(trim(b.name), 100) as name,
             left(lower(trim(b.slug)), 80) as slug,
             1 as sort_group
        from public.berater b
       where b.ist_aktiv is true
         and nullif(trim(b.name), '') is not null
         and b.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      union all
      select left(trim(e.name), 100) as name,
             left(lower(trim(e.key)), 80) as slug,
             2 as sort_group
        from public.kidz_gewinnspiel_einladende e
       where e.ist_aktiv is true
    ) auswahl
   order by auswahl.sort_group, auswahl.name;
$$;
revoke execute on function public.list_kidz_berater_public()
  from public, anon, authenticated, service_role;
grant execute on function public.list_kidz_berater_public()
  to anon, authenticated;

create or replace function public.register_kidz_gewinnspiel_public(
  p_secret text,
  p_event_key text,
  p_berater_slug text,
  p_name text,
  p_email text,
  p_telefon text,
  p_source text,
  p_elternabend_interesse boolean,
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
  v_reference text;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'kidz_giveaway_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'KIDZ giveaway registration authentication failed';
  end if;

  perform private.rate_limit_check_key('kidz_giveaway_hour', p_rate_key, 5, interval '1 hour');
  perform private.rate_limit_check_key('kidz_giveaway_day', p_rate_key, 15, interval '24 hours');
  perform private.rate_limit_check_key('kidz_giveaway_contact_day', p_contact_key, 3, interval '24 hours');

  if p_consent is not true
     or p_event_key <> 'kidz-sommerfest-2026'
     or p_conditions_version not in ('2026-08-11-v1', '2026-08-11-v2', '2026-08-11-v3')
     or length(v_name) < 2
     or coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$'
     or v_source not in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt') then
    raise invalid_parameter_value using message = 'Invalid KIDZ giveaway registration';
  end if;

  if v_email is not null and (length(v_email) > 180 or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    raise invalid_parameter_value using message = 'Invalid participant email';
  end if;
  v_phone_digits := regexp_replace(coalesce(v_telefon, ''), '\D', '', 'g');
  if v_telefon is not null and length(v_phone_digits) not between 8 and 15 then
    raise invalid_parameter_value using message = 'Invalid participant phone';
  end if;
  if v_email is null and v_telefon is null then
    raise invalid_parameter_value using message = 'Participant contact required';
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

  if exists (
    select 1 from public.kidz_gewinnspiel_teilnahmen
     where event_key = p_event_key and contact_key = p_contact_key
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end if;

  v_reference := 'KIDZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  begin
    insert into public.kidz_gewinnspiel_teilnahmen (
      reference, event_key, berater_id, empfehler_id, name, email, telefon, source,
      elternabend_interesse, conditions_version, contact_key, consent_at
    ) values (
      v_reference, p_event_key, v_berater, v_empfehler, v_name, v_email, v_telefon, v_source,
      coalesce(p_elternabend_interesse, false), p_conditions_version, p_contact_key, clock_timestamp()
    );
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end;

  return jsonb_build_object('ok', true, 'reference', v_reference);
end;
$$;

revoke execute on function public.register_kidz_gewinnspiel_public(
  text, text, text, text, text, text, text, boolean, text, text, text, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.register_kidz_gewinnspiel_public(
  text, text, text, text, text, text, text, boolean, text, text, text, boolean
) to anon;
