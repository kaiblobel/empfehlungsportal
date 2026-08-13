-- =====================================================================
-- Phase 212 · Datensparsamer Aufrufzaehler fuer das KIDZ-Sommerfest
--
-- LIVE ANGEWENDET AM 13.08.2026 ALS phase212_kidz_aufrufzaehler.
-- Es werden nur Tageszaehler gespeichert. Keine IP-Adresse, keine Browser-
-- kennung und kein einzelner Aufruf wird dauerhaft abgelegt.
-- =====================================================================

create table if not exists public.kidz_seitenaufrufe_tag (
  event_key text not null,
  page_key text not null,
  berater_id uuid not null references public.berater(id),
  source text not null,
  tag date not null,
  aufrufe bigint not null default 1,
  aktualisiert_am timestamptz not null default clock_timestamp(),
  primary key (event_key, page_key, berater_id, source, tag),
  constraint kidz_seitenaufrufe_event_key check (event_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint kidz_seitenaufrufe_page_key check (page_key in ('sommerfest')),
  constraint kidz_seitenaufrufe_source check (source in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt')),
  constraint kidz_seitenaufrufe_positiv check (aufrufe > 0)
);

comment on table public.kidz_seitenaufrufe_tag is
  'Datensparsame Tageszaehler fuer KIDZ-Seiten. Keine Einzelaufrufe, IP-Adressen oder Browserkennungen.';

alter table public.kidz_seitenaufrufe_tag enable row level security;
alter table public.kidz_seitenaufrufe_tag force row level security;
revoke all on table public.kidz_seitenaufrufe_tag from public, anon, authenticated;
grant select on table public.kidz_seitenaufrufe_tag to authenticated;

drop policy if exists kidz_seitenaufrufe_berater_select on public.kidz_seitenaufrufe_tag;
create policy kidz_seitenaufrufe_berater_select
  on public.kidz_seitenaufrufe_tag for select
  to authenticated
  using (berater_id = public.current_berater_id() or public.is_current_berater_admin());

create or replace function public.record_kidz_pageview_public(
  p_secret text,
  p_event_key text,
  p_page_key text,
  p_berater_slug text,
  p_source text,
  p_rate_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_berater uuid;
  v_ist_test boolean;
  v_source text := lower(trim(coalesce(p_source, 'direkt')));
  v_tag date := timezone('Europe/Berlin', clock_timestamp())::date;
begin
  select secret_hash into v_secret_hash
    from private.integration_secrets
   where name = 'kidz_giveaway_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'KIDZ pageview authentication failed';
  end if;

  if p_event_key <> 'kidz-sommerfest-2026'
     or p_page_key <> 'sommerfest'
     or coalesce(p_rate_key, '') !~ '^[0-9a-f]{64}$'
     or v_source not in ('vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt') then
    raise invalid_parameter_value using message = 'Invalid KIDZ pageview';
  end if;

  perform private.rate_limit_check_key('kidz_pageview_hour', p_rate_key, 240, interval '1 hour');
  perform private.rate_limit_check_key('kidz_pageview_day', p_rate_key, 1000, interval '24 hours');

  select id, ist_test into v_berater, v_ist_test
    from public.berater
   where lower(slug) = lower(trim(coalesce(p_berater_slug, '')))
     and ist_aktiv
   limit 1;
  if v_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;
  if coalesce(v_ist_test, false) then
    return jsonb_build_object('ok', true, 'ignored', 'test_advisor');
  end if;

  insert into public.kidz_seitenaufrufe_tag (
    event_key, page_key, berater_id, source, tag, aufrufe, aktualisiert_am
  ) values (
    p_event_key, p_page_key, v_berater, v_source, v_tag, 1, clock_timestamp()
  )
  on conflict (event_key, page_key, berater_id, source, tag)
  do update set
    aufrufe = public.kidz_seitenaufrufe_tag.aufrufe + 1,
    aktualisiert_am = clock_timestamp();

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.record_kidz_pageview_public(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_kidz_pageview_public(text, text, text, text, text, text)
  to anon;
