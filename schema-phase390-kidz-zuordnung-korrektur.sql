-- Phase 390: KIDZ-Sommerfest, Zuordnung bestaetigen und Kontaktdaten korrigieren
--
-- Kais Wunsch vom 15.09.2026: Wer sich online ohne Berater angemeldet hat, liegt beim
-- Vorgabeberater Kai und sieht dort genauso aus wie seine echten Kontakte. "Dass ich mir
-- erstmal meine echten zuordnen kann ... und jetzt haben wir entsprechend den Rest, die
-- wir dann aufteilen." Dazu: Name und E-Mail "manuell aendern ... nachhaltig, dass das
-- auch wirklich geaendert ist".
--
-- Kais Entscheidungen:
--   * "Gehoert zu mir" darf jeder Berater fuer sich druecken, solange die Zuordnung offen
--     ist (oder die Anmeldung schon seine ist).
--   * Korrigieren darf, wer die Anmeldung sieht (Admin immer, eigener Berater, bei offener
--     Teamsicht jeder Berater). Gleiche Regel wie bei den Anrufnotizen.
--
-- Die Datenbank kann nicht nachtraeglich unterscheiden, ob jemand Kai gewaehlt hat oder
-- nur beim Vorgabeberater gelandet ist. Deshalb startet alles bei Kai ohne Umhaengen als
-- offen, Kai bestaetigt seine echten selbst.
--
-- Die Korrektur laeuft ueber api/kidz-nacherfassung.js: Nur der Server kennt den
-- geheimen Wert fuer den Dublettenschluessel (contact_key). Aendert sich die E-Mail,
-- muss der Schluessel neu gebildet werden, sonst erkennt das Portal keine Dubletten mehr.

begin;

-- 1. Zuordnung bestaetigt -----------------------------------------------------------
alter table public.kidz_gewinnspiel_teilnahmen
  add column if not exists zuordnung_bestaetigt_am timestamptz,
  add column if not exists zuordnung_bestaetigt_von uuid references public.berater(id) on delete set null;

comment on column public.kidz_gewinnspiel_teilnahmen.zuordnung_bestaetigt_am is
  'Phase 390: Wann die Zuordnung bestaetigt wurde. Leer = Zuordnung offen (beim Vorgabeberater gelandet, noch nicht bestaetigt oder umgehaengt).';

-- Startstand: Wer bei einem anderen Berater liegt, hat ihn bewusst gewaehlt oder wurde
-- bewusst umgehaengt. Offen bleibt nur, was ohne Umhaengen beim Vorgabeberater liegt.
update public.kidz_gewinnspiel_teilnahmen t
   set zuordnung_bestaetigt_am = coalesce(t.zugeordnet_am, t.created_at),
       zuordnung_bestaetigt_von = t.zugeordnet_von
 where t.zuordnung_bestaetigt_am is null
   and (t.zugeordnet_am is not null
        or t.berater_id is distinct from (
          select b.id from public.berater b where lower(b.slug) = 'kai-blobel' limit 1));

-- 2. Umhaengen bestaetigt die Zuordnung gleich mit ------------------------------------
create or replace function public.set_kidz_gewinnspiel_berater(
  p_participation_id uuid,
  p_berater_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_admin boolean;
  v_event text;
  v_neuer_berater uuid;
  v_name text;
  v_slug text := lower(trim(coalesce(p_berater_slug, '')));
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ assignment requires an authenticated advisor';
  end if;

  v_actor := (select public.current_berater_id());
  v_is_admin := coalesce((select public.is_current_berater_admin()), false);
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select t.event_key into v_event
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_participation_id;

  if not (v_is_admin or (v_event is not null and public.kidz_team_sicht_offen(v_event))) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_event is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select b.id, b.name into v_neuer_berater, v_name
    from public.berater b
   where lower(b.slug) = v_slug and b.ist_aktiv
   limit 1;

  if v_neuer_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;

  -- Phase 390: Wer bewusst einem Berater zuordnet, bestaetigt damit die Zuordnung.
  update public.kidz_gewinnspiel_teilnahmen
     set berater_id = v_neuer_berater,
         zugeordnet_von = v_actor,
         zugeordnet_am = now(),
         zuordnung_bestaetigt_am = now(),
         zuordnung_bestaetigt_von = v_actor
   where id = p_participation_id;

  return jsonb_build_object('ok', true, 'berater', v_name, 'berater_id', v_neuer_berater);
end;
$$;

revoke execute on function public.set_kidz_gewinnspiel_berater(uuid, text)
  from public, anon, service_role;
grant execute on function public.set_kidz_gewinnspiel_berater(uuid, text)
  to authenticated;

-- 3. "Gehoert zu mir" -----------------------------------------------------------------
create or replace function public.bestaetige_kidz_zuordnung(p_teilnahme_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_admin boolean;
  v_event text;
  v_berater uuid;
  v_bestaetigt timestamptz;
  v_name text;
  v_slug text;
  v_fremd text;
  v_zeilen integer;
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ assignment requires an authenticated advisor';
  end if;

  v_actor := (select public.current_berater_id());
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  v_is_admin := coalesce((select public.is_current_berater_admin()), false);

  select t.event_key, t.berater_id, t.zuordnung_bestaetigt_am
    into v_event, v_berater, v_bestaetigt
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_teilnahme_id;

  -- Sehen ist Voraussetzung: Admin, eigene Anmeldung oder offene Teamsicht.
  if not (v_is_admin or (v_event is not null and (v_berater = v_actor or public.kidz_team_sicht_offen(v_event)))) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_event is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Eine bestaetigte Anmeldung eines anderen Beraters nimmt niemand per Knopf weg.
  if v_bestaetigt is not null and v_berater is distinct from v_actor then
    select b.name into v_fremd from public.berater b where b.id = v_berater;
    return jsonb_build_object('ok', false, 'reason', 'already_confirmed', 'berater', v_fremd);
  end if;

  select b.name, b.slug into v_name, v_slug
    from public.berater b
   where b.id = v_actor and b.ist_aktiv;
  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- Die Bedingung steht noch einmal im update: Druecken zwei gleichzeitig, gewinnt einer.
  update public.kidz_gewinnspiel_teilnahmen
     set berater_id = v_actor,
         zugeordnet_von = case when berater_id is distinct from v_actor then v_actor else zugeordnet_von end,
         zugeordnet_am = case when berater_id is distinct from v_actor then now() else zugeordnet_am end,
         zuordnung_bestaetigt_am = now(),
         zuordnung_bestaetigt_von = v_actor
   where id = p_teilnahme_id
     and (zuordnung_bestaetigt_am is null or berater_id = v_actor);
  get diagnostics v_zeilen = row_count;

  if v_zeilen = 0 then
    return jsonb_build_object('ok', false, 'reason', 'already_confirmed');
  end if;

  return jsonb_build_object('ok', true, 'berater', v_name, 'slug', v_slug, 'berater_id', v_actor);
end;
$$;

revoke execute on function public.bestaetige_kidz_zuordnung(uuid)
  from public, anon, service_role;
grant execute on function public.bestaetige_kidz_zuordnung(uuid)
  to authenticated;

comment on function public.bestaetige_kidz_zuordnung(uuid) is
  'Phase 390: "Gehoert zu mir". Setzt den angemeldeten Berater und bestaetigt die Zuordnung. Erlaubt, wer die Anmeldung sieht, solange sie offen oder schon die eigene ist.';

-- 4. Korrekturen, nachvollziehbar ------------------------------------------------------
create table if not exists public.kidz_teilnahme_korrekturen (
  id                 uuid primary key default gen_random_uuid(),
  teilnahme_id       uuid not null references public.kidz_gewinnspiel_teilnahmen(id) on delete cascade,
  event_key          text not null,
  feld               text not null check (feld in ('name', 'email', 'telefon')),
  alter_wert         text,
  neuer_wert         text,
  geaendert_von      uuid references public.berater(id) on delete set null,
  geaendert_von_name text not null,
  geaendert_am       timestamptz not null default now()
);

create index if not exists kidz_teilnahme_korrekturen_teilnahme_idx
  on public.kidz_teilnahme_korrekturen (teilnahme_id, geaendert_am desc);

comment on table public.kidz_teilnahme_korrekturen is
  'Phase 390: Protokoll jeder Korrektur an Name, E-Mail oder Mobilnummer einer KIDZ-Anmeldung. Faellt mit der Anmeldung weg. Schreiben nur ueber korrigiere_kidz_teilnahme.';

alter table public.kidz_teilnahme_korrekturen enable row level security;

revoke all on public.kidz_teilnahme_korrekturen from public, anon, authenticated;
grant select, delete on public.kidz_teilnahme_korrekturen to authenticated;

-- Sehen haengt an der Sichtbarkeit der Anmeldung selbst, samt Schalter.
drop policy if exists kidz_teilnahme_korrekturen_select on public.kidz_teilnahme_korrekturen;
create policy kidz_teilnahme_korrekturen_select
  on public.kidz_teilnahme_korrekturen for select
  to authenticated
  using (exists (
    select 1
      from public.kidz_gewinnspiel_teilnahmen t
     where t.id = teilnahme_id
  ));

drop policy if exists kidz_teilnahme_korrekturen_admin_delete on public.kidz_teilnahme_korrekturen;
create policy kidz_teilnahme_korrekturen_admin_delete
  on public.kidz_teilnahme_korrekturen for delete
  to authenticated
  using ((select public.is_current_berater_admin()));

create or replace function public.korrigiere_kidz_teilnahme(
  p_secret text,
  p_teilnahme_id uuid,
  p_name text,
  p_email text,
  p_telefon text,
  p_contact_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_hash text;
  v_actor uuid;
  v_actor_name text;
  v_is_admin boolean;
  v_event text;
  v_berater uuid;
  v_alt_name text;
  v_alt_email text;
  v_alt_telefon text;
  v_name text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 100);
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_telefon text := nullif(trim(coalesce(p_telefon, '')), '');
  v_digits text;
  v_geaendert text[] := '{}';
begin
  -- Nur der Server kennt den geheimen Wert. Direkt aus dem Browser geht es nicht,
  -- weil dort kein gueltiger Dublettenschluessel gebildet werden kann.
  select secret_hash into v_secret_hash
    from private.integration_secrets where name = 'kidz_giveaway_registration';

  if v_secret_hash is null
     or encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') <> v_secret_hash then
    raise insufficient_privilege using message = 'KIDZ correction authentication failed';
  end if;

  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ correction requires an authenticated advisor';
  end if;

  v_actor := (select public.current_berater_id());
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  v_is_admin := coalesce((select public.is_current_berater_admin()), false);

  select t.event_key, t.berater_id, t.name, t.email, t.telefon
    into v_event, v_berater, v_alt_name, v_alt_email, v_alt_telefon
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_teilnahme_id;

  -- Kais Regel: korrigieren darf, wer die Anmeldung sieht.
  if not (v_is_admin or (v_event is not null and (v_berater = v_actor or public.kidz_team_sicht_offen(v_event)))) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- Der Server bildet den Schluessel fuer das Sommerfest. Andere Feste gibt es hier nicht.
  if v_event is null or v_event <> 'kidz-sommerfest-2026' then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;
  if v_email is not null and (length(v_email) > 180 or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_contact');
  end if;
  v_digits := regexp_replace(coalesce(v_telefon, ''), '\D', '', 'g');
  if v_telefon is not null and length(v_digits) not between 8 and 15 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_contact');
  end if;
  if v_email is null and v_telefon is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_contact');
  end if;
  if coalesce(p_contact_key, '') !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message = 'Invalid KIDZ contact key';
  end if;

  -- Gehoert die neue E-Mail oder Nummer schon zu einer anderen Anmeldung? Dann nicht.
  if exists (
    select 1
      from public.kidz_gewinnspiel_teilnahmen t
     where t.event_key = v_event
       and t.id <> p_teilnahme_id
       and ( t.contact_key = p_contact_key
          or (v_email is not null and lower(t.email) = v_email)
          or (v_digits <> '' and regexp_replace(coalesce(t.telefon, ''), '\D', '', 'g') = v_digits) )
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end if;

  if v_name is distinct from v_alt_name then v_geaendert := array_append(v_geaendert, 'name'); end if;
  if v_email is distinct from v_alt_email then v_geaendert := array_append(v_geaendert, 'email'); end if;
  if v_telefon is distinct from v_alt_telefon then v_geaendert := array_append(v_geaendert, 'telefon'); end if;

  if cardinality(v_geaendert) = 0 then
    return jsonb_build_object('ok', true, 'unchanged', true,
      'name', v_alt_name, 'email', v_alt_email, 'telefon', v_alt_telefon);
  end if;

  begin
    update public.kidz_gewinnspiel_teilnahmen
       set name = v_name,
           email = v_email,
           telefon = v_telefon,
           contact_key = p_contact_key
     where id = p_teilnahme_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_exists');
  end;

  select b.name into v_actor_name from public.berater b where b.id = v_actor;

  insert into public.kidz_teilnahme_korrekturen
    (teilnahme_id, event_key, feld, alter_wert, neuer_wert, geaendert_von, geaendert_von_name)
  select p_teilnahme_id, v_event, f.feld, f.alt, f.neu, v_actor, coalesce(v_actor_name, 'Berater')
    from (values
      ('name', v_alt_name, v_name),
      ('email', v_alt_email, v_email),
      ('telefon', v_alt_telefon, v_telefon)
    ) as f(feld, alt, neu)
   where f.feld = any (v_geaendert);

  return jsonb_build_object('ok', true, 'unchanged', false, 'geaendert', to_jsonb(v_geaendert),
    'name', v_name, 'email', v_email, 'telefon', v_telefon);
end;
$$;

revoke execute on function public.korrigiere_kidz_teilnahme(text, uuid, text, text, text, text)
  from public, anon, service_role;
grant execute on function public.korrigiere_kidz_teilnahme(text, uuid, text, text, text, text)
  to authenticated;

comment on function public.korrigiere_kidz_teilnahme(text, uuid, text, text, text, text) is
  'Phase 390: Korrigiert Name, E-Mail oder Mobilnummer einer KIDZ-Anmeldung samt Dublettenschluessel und protokolliert alte und neue Werte. Nur ueber den Server (geheimer Wert), erlaubt fuer alle, die die Anmeldung sehen.';

commit;
