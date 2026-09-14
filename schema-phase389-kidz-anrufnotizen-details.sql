-- Phase 389: Anrufnotizen KIDZ-Sommerfest, zweite Stufe
--
-- Kais Wuensche vom 14.09.2026 nach dem ersten Tag: "Interesse KIDZ4future oder Persoenliches
-- Gespraech und Anfang der Woche oder Ende der Woche ... wir wollen 2 Termine anbieten
-- alternativ" und "das Kontaktgespraech mit rein". Dazu von mir vorgeschlagen und von Kai mit
-- "alle Punkte passen" freigegeben: Uhrzeit beim Termin, "Bitte nicht mehr anrufen" und der
-- Widerruf der Einwilligung zu KIDZ for Future direkt am Telefon.
--
-- Nur neue Felder mit leeren Vorgaben. Vorhandene Eintraege bleiben gueltig, die Seite v1.403
-- funktioniert weiter: Die Funktion bekommt fuer alle neuen Angaben Vorgabewerte.
--
-- Einwilligung: Laut Teilnahmebedingungen ist fuer das Gewinnspiel "keine Werbeeinwilligung
-- erforderlich". Einwilligung besteht nur bei gesetztem Haekchen KIDZ for Future
-- (elternabend_interesse). Die Seite zeigt das im Anruf-Fenster an. Ein Widerruf am Telefon
-- nimmt das Haekchen zurueck. Widerrufen darf, wer eintragen darf: Ein Widerruf muss beachtet
-- werden, egal wer den Anruf fuehrt. Das Setzen einer Einwilligung geht hier bewusst NICHT.

begin;

-- 1. Neue Felder -----------------------------------------------------------------
alter table public.kidz_kontaktnotizen
  add column if not exists anliegen text,
  add column if not exists terminwunsch text,
  add column if not exists termin_uhrzeit time,
  add column if not exists keine_anrufe boolean not null default false,
  add column if not exists kff_widerrufen boolean not null default false;

alter table public.kidz_kontaktnotizen
  drop constraint if exists kidz_kontaktnotizen_anliegen_gueltig,
  drop constraint if exists kidz_kontaktnotizen_terminwunsch_gueltig,
  drop constraint if exists kidz_kontaktnotizen_details_nur_erreicht,
  drop constraint if exists kidz_kontaktnotizen_uhrzeit_passt,
  drop constraint if exists kidz_kontaktnotizen_sperre_passt;

alter table public.kidz_kontaktnotizen
  add constraint kidz_kontaktnotizen_anliegen_gueltig
    check (anliegen is null or anliegen in ('kff', 'gespraech', 'beides')),
  add constraint kidz_kontaktnotizen_terminwunsch_gueltig
    check (terminwunsch is null or terminwunsch in ('anfang', 'ende')),
  -- Wer nicht erreicht wurde, hat weder Anliegen noch Wunsch noch Widerruf geaeussert.
  add constraint kidz_kontaktnotizen_details_nur_erreicht
    check (ergebnis <> 'nicht_erreicht' or (anliegen is null and terminwunsch is null and not kff_widerrufen)),
  add constraint kidz_kontaktnotizen_uhrzeit_passt
    check (termin_uhrzeit is null or ergebnis in ('termin', 'rueckruf')),
  add constraint kidz_kontaktnotizen_sperre_passt
    check (not keine_anrufe or ergebnis = 'kein_interesse');

-- 2. Eintragen, erweitert --------------------------------------------------------
-- Alte Fassung mit vier Angaben entfernen, sonst gaebe es zwei Funktionen gleichen Namens
-- und die Schnittstelle koennte nicht sicher waehlen. Die neue nimmt vier Angaben weiterhin an.
drop function if exists public.add_kidz_kontaktnotiz(uuid, text, text, date);

create or replace function public.add_kidz_kontaktnotiz(
  p_teilnahme_id uuid,
  p_ergebnis text,
  p_notiz text,
  p_faellig_am date,
  p_anliegen text default null,
  p_terminwunsch text default null,
  p_termin_uhrzeit time default null,
  p_keine_anrufe boolean default false,
  p_kff_widerruf boolean default false
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
  v_anliegen text;
  v_wunsch text;
  v_uhrzeit time;
  v_sperre boolean := false;
  v_widerruf boolean := false;
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

  -- Kernregel unveraendert: eintragen darf, wer die Anmeldung sieht.
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
    v_uhrzeit := p_termin_uhrzeit;
  end if;

  if p_ergebnis = 'termin' and p_termin_uhrzeit is null then
    return jsonb_build_object('ok', false, 'reason', 'time_required');
  end if;

  if p_anliegen is not null and p_anliegen not in ('kff', 'gespraech', 'beides') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_details');
  end if;
  if p_terminwunsch is not null and p_terminwunsch not in ('anfang', 'ende') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_details');
  end if;

  -- Wer nicht erreicht wurde, hat nichts geaeussert: Angaben werden dann verworfen.
  if p_ergebnis <> 'nicht_erreicht' then
    v_anliegen := p_anliegen;
    v_wunsch := p_terminwunsch;
    v_widerruf := coalesce(p_kff_widerruf, false);
  end if;
  if p_ergebnis = 'kein_interesse' then
    v_sperre := coalesce(p_keine_anrufe, false);
  end if;

  if v_notiz is not null and char_length(v_notiz) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'note_too_long');
  end if;

  select b.name into v_name from public.berater b where b.id = v_actor;

  insert into public.kidz_kontaktnotizen
    (teilnahme_id, event_key, ergebnis, notiz, faellig_am, erstellt_von, erstellt_von_name,
     anliegen, terminwunsch, termin_uhrzeit, keine_anrufe, kff_widerrufen)
  values
    (p_teilnahme_id, v_event, p_ergebnis, v_notiz, v_faellig, v_actor, coalesce(v_name, 'Berater'),
     v_anliegen, v_wunsch, v_uhrzeit, v_sperre, v_widerruf)
  returning id, erstellt_am into v_id, v_am;

  -- Widerruf der Einwilligung zu KIDZ for Future: nur zuruecknehmen, nie setzen.
  if v_widerruf then
    update public.kidz_gewinnspiel_teilnahmen
       set elternabend_interesse = false
     where id = p_teilnahme_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'erstellt_am', v_am,
    'erstellt_von_name', coalesce(v_name, 'Berater'),
    'faellig_am', v_faellig,
    'termin_uhrzeit', v_uhrzeit,
    'anliegen', v_anliegen,
    'terminwunsch', v_wunsch,
    'keine_anrufe', v_sperre,
    'kff_widerrufen', v_widerruf
  );
end;
$$;

revoke execute on function public.add_kidz_kontaktnotiz(uuid, text, text, date, text, text, time, boolean, boolean)
  from public, anon, service_role;
grant execute on function public.add_kidz_kontaktnotiz(uuid, text, text, date, text, text, time, boolean, boolean)
  to authenticated;

comment on function public.add_kidz_kontaktnotiz(uuid, text, text, date, text, text, time, boolean, boolean) is
  'Haengt eine Anrufnotiz an eine KIDZ-Gewinnspiel-Teilnahme an (Phase 389: Anliegen, Terminwunsch, Uhrzeit, Anrufsperre, Widerruf KIDZ for Future). Erlaubt fuer Admins, den zugeordneten Berater und bei offener Teamsicht fuer jeden Berater. Ein Widerruf setzt elternabend_interesse auf false, setzt es aber nie auf true.';

commit;
