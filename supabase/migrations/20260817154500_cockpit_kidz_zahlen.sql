-- Zahlen der KIDZ-Seiten fuer die Reichweite-Uebersicht in KAI.
--
-- Warum: Die KIDZ-Seite zaehlt in dieser Datenbank (kidz_seitenaufrufe_tag) und nicht
-- ueber den Tag-Manager. In KAI. stand sie deshalb mit null Aufrufen, obwohl sie am
-- 17.08.2026 die aktivste Seite ueberhaupt war: 211 Aufrufe seit dem 13.08.,
-- 21 Anmeldungen, 59 Personen. Die beste GA-gezaehlte Seite lag bei 82 Aufrufen.
--
-- Gibt ausschliesslich Zahlen zurueck. Keine Namen, keine Kontaktdaten, keine Kennungen -
-- die Uebersicht braucht sie nicht, und was nicht herausgeht, kann nicht verloren gehen.
--
-- Gleiche Bauart wie cockpit_neue_promoter: Tor-Wort per private.cockpit_secret_ok.
-- Gelesen wird von kai-hub ueber src/lib/analytics/kidz.ts, ueber dieselbe Bruecke wie
-- die Promoter-Meldung.

create or replace function public.cockpit_kidz_zahlen(
  p_secret text,
  p_tage   integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ergebnis jsonb;
  ab       date;
begin
  if not private.cockpit_secret_ok(p_secret) then
    return null;
  end if;

  ab := current_date - greatest(coalesce(p_tage, 7), 1) + 1;

  select jsonb_build_object(
    'aufrufe_zeitraum', (
      select coalesce(sum(aufrufe), 0) from kidz_seitenaufrufe_tag where tag >= ab
    ),
    'aufrufe_vorzeitraum', (
      select coalesce(sum(aufrufe), 0) from kidz_seitenaufrufe_tag
      where tag >= ab - greatest(coalesce(p_tage, 7), 1) and tag < ab
    ),
    'aufrufe_gesamt', (
      select coalesce(sum(aufrufe), 0) from kidz_seitenaufrufe_tag
    ),
    'erster_tag', (
      select min(tag) from kidz_seitenaufrufe_tag
    ),
    -- Testeintraege zaehlen nicht mit. Sonst sieht eine Probeanmeldung wie ein Erfolg aus.
    'anmeldungen', (
      select count(*) from kidz_gewinnspiel_teilnahmen where coalesce(ist_test, false) = false
    ),
    'personen', (
      select count(*) + coalesce(sum(coalesce(begleitpersonen, 0)), 0)
      from kidz_gewinnspiel_teilnahmen where coalesce(ist_test, false) = false
    ),
    'anmeldungen_zeitraum', (
      select count(*) from kidz_gewinnspiel_teilnahmen
      where coalesce(ist_test, false) = false and created_at >= ab
    ),
    'elternabend_anmeldungen', (
      select count(*) from kidz_elternabend_anmeldungen
    )
  ) into ergebnis;

  return ergebnis;
end;
$function$;

comment on function public.cockpit_kidz_zahlen(text, integer) is
  'Nur Zahlen zu den KIDZ-Seiten fuer die Reichweite-Uebersicht in KAI. Keine Personendaten.';

revoke all on function public.cockpit_kidz_zahlen(text, integer) from public;
grant execute on function public.cockpit_kidz_zahlen(text, integer) to anon, authenticated;
