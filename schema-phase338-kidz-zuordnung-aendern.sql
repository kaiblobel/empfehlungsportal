-- Phase 338: Die Zuordnung eines Kontakts von Hand aendern
--
-- Nach dem Sommerfest liegen 225 Kontakte in der Liste, 170 davon beim
-- Vorgabeberater. Das ist kein Zufall: 115 kamen ueber den allgemeinen Link
-- ohne Beraterauswahl, 56 ueber den QR-Code am Fest, und die 44 nacherfassten
-- Papierzettel wurden beim Abtippen alle demselben Konto zugeordnet. Nur 9
-- Anmeldungen kamen ueber einen persoenlichen Beraterlink.
--
-- Wer wen kennt, weiss nur das Team. Deshalb geht Kai die Liste im Meeting
-- durch und ordnet jeden Namen von Hand zu. Dafuer fehlte bisher der Weg:
-- berater_id ist im Browser nicht aenderbar, das Aenderungsrecht auf der
-- Tabelle ist spaltenweise vergeben und diese Spalte steht bewusst nicht darin.
--
-- Ein Spaltenrecht waere hier die falsche Antwort: Damit koennte sich jeder
-- Berater fremde Kontakte zuschreiben. Stattdessen eine Funktion, die mit den
-- Rechten ihres Besitzers laeuft und selbst prueft, wer sie aufruft.
--
-- Nur Administratoren. Umverteilen ist eine Fuehrungsaufgabe, kein
-- Selbstbedienungsknopf.
--
-- Geschrieben wird ausschliesslich berater_id. empfehler_id bleibt stehen:
-- Wer die Person eingeladen hat, ist Geschichte und wird von einer spaeteren
-- Umverteilung nicht ueberschrieben. Sonst verliert man genau die Information,
-- die den Promotern ihre Arbeit zurechnet.
--
-- Promoter werden nicht angenommen. Sie stehen in derselben Auswahlliste wie
-- die Berater (list_kidz_berater_public), aber ein Promoter laedt ein, er
-- betreut nicht. Der Slug wird deshalb ausschliesslich gegen public.berater
-- aufgeloest.

begin;

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
  v_neuer_berater uuid;
  v_name text;
  v_slug text := lower(trim(coalesce(p_berater_slug, '')));
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'KIDZ assignment requires an authenticated advisor';
  end if;

  -- Kernregel: nur Administratoren.
  if not (select public.is_current_berater_admin()) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if not exists (
    select 1 from public.kidz_gewinnspiel_teilnahmen t where t.id = p_participation_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Nur aktive Berater, keine Promoter.
  select b.id, b.name into v_neuer_berater, v_name
    from public.berater b
   where lower(b.slug) = v_slug and b.ist_aktiv
   limit 1;

  if v_neuer_berater is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_advisor');
  end if;

  update public.kidz_gewinnspiel_teilnahmen
     set berater_id = v_neuer_berater
   where id = p_participation_id;

  return jsonb_build_object('ok', true, 'berater', v_name);
end;
$$;

revoke execute on function public.set_kidz_gewinnspiel_berater(uuid, text)
  from public, anon, service_role;
grant execute on function public.set_kidz_gewinnspiel_berater(uuid, text)
  to authenticated;

comment on function public.set_kidz_gewinnspiel_berater(uuid, text) is
  'Ordnet eine Gewinnspiel-Teilnahme einem anderen Berater zu. Nur fuer Administratoren. Schreibt allein berater_id, empfehler_id bleibt unangetastet.';

commit;
