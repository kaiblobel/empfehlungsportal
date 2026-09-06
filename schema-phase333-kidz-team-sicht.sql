-- Phase 333: Am Festtag sieht jeder Berater alle Anmeldungen des Sommerfests
--
-- Bis hierher sah ein Berater nur die Anmeldungen, die ihm zugeordnet sind.
-- Am Stand fuehrt das ins Leere: Wer spontan kommt oder sich ohne Beraterauswahl
-- angemeldet hat, landet beim Vorgabeberater (api/kidz-register.js:13) und ist
-- fuer alle anderen unsichtbar. Von 108 Anmeldungen lagen 64 dort. Der Berater
-- am Stand konnte also weder nachsehen, ob jemand schon angemeldet ist, noch
-- ihm den Ballumfang eintragen.
--
-- Nichts wegnehmen, nur ergaenzen: Die bestehenden Regeln bleiben unveraendert,
-- hier kommen zwei dazu. Mehrere Regeln werden mit ODER verknuepft, die enge
-- Sicht auf alles Uebrige bleibt also bestehen.
--
-- Die Freigabe ist doppelt begrenzt:
--   * auf event_key = 'kidz-sommerfest-2026'. Kuenftige Aktionen starten wieder
--     mit der engen Sicht, ohne dass jemand daran denken muss.
--   * auf Personen mit aktivem Beraterkonto (current_berater_id() is not null).
--
-- Was ausdruecklich NICHT geoeffnet wird: das Loeschen. Die Regel
-- kidz_gewinnspiel_admin_delete bleibt unangetastet, sie haengt weiter am
-- Admin-Recht. Am Stand wird eingetragen, nicht entfernt.
--
-- Was ein Berater schreiben darf, begrenzen weiterhin die spaltenweisen Rechte
-- (schema-phase172.sql:55, 174:28, 200:41): Schaetzung, Begleitpersonen,
-- Check-in, Los und Gewinnrang. Name, Kontaktweg und Zuordnung bleiben
-- unerreichbar, auch fuer den, der die Anmeldung jetzt sehen kann.

begin;

-- 1. Sehen ---------------------------------------------------------------------
drop policy if exists kidz_gewinnspiel_team_select_sommerfest
  on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_team_select_sommerfest
  on public.kidz_gewinnspiel_teilnahmen for select
  to authenticated
  using (
    public.current_berater_id() is not null
    and event_key = 'kidz-sommerfest-2026'
  );

-- 2. Schaetzung eintragen ------------------------------------------------------
-- using entscheidet, welche Zeilen angefasst werden duerfen, with check, wie sie
-- danach aussehen duerfen. Beides gleich: Die Zeile muss vorher und nachher zum
-- Sommerfest gehoeren. Damit kann niemand eine Anmeldung aus diesem Fest
-- heraus in ein anderes Ereignis schreiben.
drop policy if exists kidz_gewinnspiel_team_update_sommerfest
  on public.kidz_gewinnspiel_teilnahmen;
create policy kidz_gewinnspiel_team_update_sommerfest
  on public.kidz_gewinnspiel_teilnahmen for update
  to authenticated
  using (
    public.current_berater_id() is not null
    and event_key = 'kidz-sommerfest-2026'
  )
  with check (
    public.current_berater_id() is not null
    and event_key = 'kidz-sommerfest-2026'
  );

-- 3. Das Haekchen fuer KIDZ for Future -----------------------------------------
-- Wortgleich mit schema-phase324-kidz-interesse-nachtragen.sql, geaendert ist
-- allein die Kernregel: Beim Sommerfest darf jeder Berater, sonst weiterhin nur
-- der zugeordnete und Administratoren.
create or replace function public.set_kidz_gewinnspiel_interesse(
  p_participation_id uuid,
  p_interesse boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_berater uuid;
  v_is_admin boolean;
  v_berater uuid;
  v_event text;
  v_neu boolean := coalesce(p_interesse, false);
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ interest update requires an authenticated advisor';
  end if;

  v_actor_berater := (select public.current_berater_id());
  v_is_admin := (select public.is_current_berater_admin());
  if v_actor_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'no_advisor_account');
  end if;

  select t.berater_id, t.event_key into v_berater, v_event
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_participation_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Kernregel: beim Sommerfest darf jeder Berater, sonst nur der zugeordnete
  -- und Administratoren.
  if v_event <> 'kidz-sommerfest-2026'
     and not v_is_admin
     and v_berater is distinct from v_actor_berater then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  update public.kidz_gewinnspiel_teilnahmen
     set elternabend_interesse = v_neu
   where id = p_participation_id;

  return jsonb_build_object('ok', true, 'interesse', v_neu);
end;
$$;

revoke execute on function public.set_kidz_gewinnspiel_interesse(uuid, boolean)
  from public, anon, service_role;
grant execute on function public.set_kidz_gewinnspiel_interesse(uuid, boolean)
  to authenticated;

commit;
