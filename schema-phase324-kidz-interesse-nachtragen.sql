-- Phase 324: Das Haekchen fuer KIDZ for Future im Beraterbereich nachtragen
--
-- Phase 321 hat im Dashboard einen Knopf ergaenzt, der das Interesse an
-- KIDZ for Future an einer bestehenden Anmeldung setzt. Der Knopf schrieb die
-- Spalte direkt aus dem Browser und lief in eine Fehlermeldung: Das
-- Aenderungsrecht auf kidz_gewinnspiel_teilnahmen ist spaltenweise vergeben
-- (schema-phase172.sql:55, 174:28, 200:41), und elternabend_interesse steht
-- nicht darin. Die Schaetzung stand darin, deshalb ging sie und das Haekchen
-- nicht.
--
-- Der kurze Weg waere
--   grant update (elternabend_interesse) ... to authenticated;
-- Der wird bewusst NICHT gegangen. Die Spalte ist eine Einwilligung
-- (schema-phase172.sql:44-45). Mit einem Spaltenrecht koennte der Browser sie
-- frei schreiben, in jede Richtung, und der einzige Schutz waere die
-- Oberflaeche. Ein Schutz, der nur in der Oberflaeche sitzt, ist keiner.
--
-- Stattdessen das Muster von record_kidz_gewinnspiel_onsite
-- (schema-phase200.sql:174-330): eine Funktion, die das Spaltenrecht nicht
-- braucht, weil sie mit den Rechten ihres Besitzers laeuft, und die dafuer
-- selbst prueft, wer sie aufruft.
--
-- Was die Funktion darf:
--   * ausschliesslich elternabend_interesse schreiben. Name, Kontaktweg,
--     Zuordnung und Schaetzung bleiben ausser Reichweite.
--   * nur an Teilnahmen, die dem aufrufenden Berater zugeordnet sind.
--     Administratoren duerfen an allen.
--
-- Warum sie auch das Entfernen erlaubt, anders als das oeffentliche Formular:
-- Die Regel "nie zuruecknehmen" aus Phase 321 schuetzt vor Fremden, die eine
-- E-Mail-Adresse kennen und das Formular absenden. Hier steht ein angemeldeter
-- Berater vor der Person, die es ihm gerade sagt. Sagt jemand "doch nicht",
-- muss das eintragbar sein; ein Widerruf ist ohnehin jederzeit moeglich.

begin;

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

  select t.berater_id into v_berater
    from public.kidz_gewinnspiel_teilnahmen t
   where t.id = p_participation_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Kernregel: nur fuer die eigenen Teilnahmen, Administratoren fuer alle.
  if not v_is_admin and v_berater is distinct from v_actor_berater then
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

comment on function public.set_kidz_gewinnspiel_interesse(uuid, boolean) is
  'Setzt die Einwilligung zu KIDZ for Future an einer bestehenden Teilnahme. Nur fuer den zugeordneten Berater, Administratoren fuer alle. Kein Spaltenrecht im Browser noetig.';

commit;
