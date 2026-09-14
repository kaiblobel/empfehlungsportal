-- Phase 388: Anrufnotizen fuer die Teilnehmer des KIDZ-Sommerfests
--
-- Kais Auftrag vom 14.09.2026: "bei jedem Teilnehmer eine zusaetzliche
-- Notizfunktion ... wir wollen die diese Woche anfangen durchzurufen ... mit
-- angerufen, erreicht etc., aber nicht zu umfangreich ... nachhaltig, sonst sieht
-- da keiner mehr durch."
--
-- Jeder Anruf ist ein eigener Eintrag mit einem von fuenf Ergebnissen, einem
-- optionalen kurzen Satz und bei Rueckruf oder Termin einem Datum. Eintraege
-- werden nie ueberschrieben, es kommt immer ein neuer dazu. So bleibt der Verlauf
-- ehrlich, auch wenn mehrere Leute dieselbe Familie anrufen.
--
-- Wer darf eintragen? Kais Regel: wer die Anmeldung sieht. Ist der Schalter der
-- Teamsicht aus, sieht jeder Berater nur seine eigenen Kontakte und traegt nur
-- dort ein. Ist er an, sieht jeder alle und kann bei jedem eintragen.
-- Administratoren immer. Die Datenbank prueft das selbst, die Seite zeigt nur an.
--
-- Loeschen darf nur ein Admin. Wird eine Anmeldung geloescht (Loeschwunsch,
-- Dublette, Ablauf der Aufbewahrungsfrist), verschwinden ihre Eintraege mit.
--
-- Der Name der eintragenden Person wird beim Eintragen mitgeschrieben: Berater
-- ohne Admin-Recht duerfen die Tabelle berater nicht lesen und saehen sonst bei
-- fremden Eintraegen keinen Namen.

begin;

-- 1. Die Eintraege ---------------------------------------------------------------
create table if not exists public.kidz_kontaktnotizen (
  id                uuid primary key default gen_random_uuid(),
  teilnahme_id      uuid not null references public.kidz_gewinnspiel_teilnahmen(id) on delete cascade,
  event_key         text not null,
  ergebnis          text not null
    check (ergebnis in ('nicht_erreicht', 'rueckruf', 'termin', 'kein_interesse', 'gesprochen')),
  notiz             text check (notiz is null or char_length(notiz) <= 500),
  faellig_am        date,
  erstellt_von      uuid references public.berater(id) on delete set null,
  erstellt_von_name text not null,
  erstellt_am       timestamptz not null default now(),
  -- Rueckruf und Termin brauchen ein Datum, alle anderen tragen keins.
  constraint kidz_kontaktnotizen_datum_passt check (
    (ergebnis in ('rueckruf', 'termin') and faellig_am is not null)
    or (ergebnis not in ('rueckruf', 'termin') and faellig_am is null)
  )
);

comment on table public.kidz_kontaktnotizen is
  'Anrufnotizen zu KIDZ-Gewinnspiel-Teilnahmen (Phase 388). Nur anhaengen, nie ueberschreiben. Sehen und eintragen darf, wer die Anmeldung sieht; loeschen nur Admins. Faellt mit der Anmeldung weg.';

create index if not exists kidz_kontaktnotizen_teilnahme_idx
  on public.kidz_kontaktnotizen (teilnahme_id, erstellt_am desc);
create index if not exists kidz_kontaktnotizen_event_idx
  on public.kidz_kontaktnotizen (event_key, erstellt_am desc);

alter table public.kidz_kontaktnotizen enable row level security;

-- Aus dem Browser nur Lesen und (fuer Admins) Loeschen. Eintragen laeuft allein
-- ueber die Funktion unten, Aendern gibt es nicht.
revoke all on public.kidz_kontaktnotizen from public, anon, authenticated;
grant select, delete on public.kidz_kontaktnotizen to authenticated;

-- Sehen: genau die, die die Anmeldung sehen. Die Unterabfrage laeuft mit den
-- Rechten des Aufrufers, dadurch gelten die Leseregeln der Teilnahmen samt
-- Schalter, ohne sie hier ein zweites Mal nachzubauen.
drop policy if exists kidz_kontaktnotizen_select on public.kidz_kontaktnotizen;
create policy kidz_kontaktnotizen_select
  on public.kidz_kontaktnotizen for select
  to authenticated
  using (
    exists (
      select 1 from public.kidz_gewinnspiel_teilnahmen t
       where t.id = teilnahme_id
    )
  );

drop policy if exists kidz_kontaktnotizen_admin_delete on public.kidz_kontaktnotizen;
create policy kidz_kontaktnotizen_admin_delete
  on public.kidz_kontaktnotizen for delete
  to authenticated
  using ((select public.is_current_berater_admin()));

-- 2. Eintragen -------------------------------------------------------------------
create or replace function public.add_kidz_kontaktnotiz(
  p_teilnahme_id uuid,
  p_ergebnis text,
  p_notiz text,
  p_faellig_am date
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
  v_berater uuid;
  v_name text;
  v_notiz text := nullif(trim(coalesce(p_notiz, '')), '');
  v_faellig date;
  v_id uuid;
  v_am timestamptz;
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ call notes require an authenticated advisor';
  end if;

  v_actor := (select public.current_berater_id());
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  v_is_admin := coalesce((select public.is_current_berater_admin()), false);

  select t.event_key, t.berater_id into v_event, v_berater
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_teilnahme_id;

  -- Kernregel: eintragen darf, wer die Anmeldung sieht. Admins immer, sonst der
  -- zugeordnete Berater oder jeder, solange die Teamsicht an ist. Ohne Recht
  -- verraet die Antwort nicht, ob es die Anmeldung gibt.
  if not (v_is_admin or (v_event is not null and (v_berater = v_actor or public.kidz_team_sicht_offen(v_event)))) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_event is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if coalesce(p_ergebnis, '') not in ('nicht_erreicht', 'rueckruf', 'termin', 'kein_interesse', 'gesprochen') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_result');
  end if;

  if p_ergebnis in ('rueckruf', 'termin') then
    if p_faellig_am is null then
      return jsonb_build_object('ok', false, 'reason', 'date_required');
    end if;
    v_faellig := p_faellig_am;
  end if;

  if v_notiz is not null and char_length(v_notiz) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'note_too_long');
  end if;

  select b.name into v_name from public.berater b where b.id = v_actor;

  insert into public.kidz_kontaktnotizen
    (teilnahme_id, event_key, ergebnis, notiz, faellig_am, erstellt_von, erstellt_von_name)
  values
    (p_teilnahme_id, v_event, p_ergebnis, v_notiz, v_faellig, v_actor, coalesce(v_name, 'Berater'))
  returning id, erstellt_am into v_id, v_am;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'erstellt_am', v_am,
    'erstellt_von_name', coalesce(v_name, 'Berater'),
    'faellig_am', v_faellig
  );
end;
$$;

revoke execute on function public.add_kidz_kontaktnotiz(uuid, text, text, date)
  from public, anon, service_role;
grant execute on function public.add_kidz_kontaktnotiz(uuid, text, text, date)
  to authenticated;

comment on function public.add_kidz_kontaktnotiz(uuid, text, text, date) is
  'Haengt eine Anrufnotiz an eine KIDZ-Gewinnspiel-Teilnahme an. Erlaubt fuer Admins, den zugeordneten Berater und bei offener Teamsicht fuer jeden Berater. Schreibt nur in kidz_kontaktnotizen.';

commit;
