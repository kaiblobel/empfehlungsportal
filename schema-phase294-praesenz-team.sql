-- Phase 294 · Die Online-Anzeige zeigt wieder das ganze Team
--
-- AUSGEFÜHRT am 19.08.2026 auf kkseqhmfubzfyloffkwe, in zwei Schritten:
-- erst team_wurzel allein und einzeln geprüft, dann team_presence.
-- Gegengeprobt: ein Aufruf ohne angemeldeten Berater liefert null Zeilen.
--
-- Bis dahin filterte team_presence() über team_sichtbare_berater(): jeder sah
-- nur sich und die Leute UNTER sich. Für eine Agenturleiterin ohne eigene
-- Mannschaft heißt das: eine Liste mit einem einzigen Namen, dem eigenen.
-- Als Anzeige, wer gerade im Portal arbeitet, ist das wertlos.
--
-- team_sichtbare_berater() bleibt unangetastet. Sie steuert die Sicht auf
-- KENNZAHLEN, und dort ist die enge Regel richtig: Ein Agenturleiter hat die
-- Zahlen der ganzen Direktion nichts anzugehen. Wer gerade angemeldet ist,
-- ist dagegen keine schützenswerte Zahl, sondern eine Arbeitsinformation.
--
-- Neue Regel für die Präsenz: alle mit derselben Spitze. Bei einer zweiten
-- Regionaldirektion im selben Portal bleiben die Teams damit getrennt, ohne
-- dass jemand etwas umstellen müsste.

begin;

-- Die oberste Führungskraft über einem Berater. Wer selbst an der Spitze
-- steht, ist seine eigene Wurzel.
--
-- Die Tiefe ist auf 20 begrenzt. Trüge sich jemand versehentlich selbst oder
-- im Kreis als Führungskraft ein, liefe die Rekursion sonst endlos und legte
-- mit ihr jede Seite lahm, die die Präsenz lädt.
create or replace function public.team_wurzel(p_berater uuid)
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  with recursive kette(id, fuehrungskraft_id, tiefe) as (
    select b.id, b.fuehrungskraft_id, 0
      from public.berater b
     where b.id = p_berater
    union all
    select b.id, b.fuehrungskraft_id, k.tiefe + 1
      from public.berater b
      join kette k on b.id = k.fuehrungskraft_id
     where k.tiefe < 20
  )
  select id from kette order by tiefe desc limit 1;
$function$;

grant execute on function public.team_wurzel(uuid) to authenticated;

-- Dieselbe Rückgabe wie bisher, nur die Filterzeile ist neu.
create or replace function public.team_presence()
returns table(berater_name text, berater_foto text, last_seen timestamptz, heute_empfehlungen int, heute_promoter int)
language sql
security definer
set search_path = public, pg_temp
as $$
  select b.name, b.foto_url, b.last_seen,
    (select count(*)::int from empfehlungen e where e.berater_id = b.id and e.created_at::date = current_date),
    (select count(*)::int from empfehler em where em.berater_id = b.id and em.created_at::date = current_date)
  from berater b
  where b.ist_aktiv
    -- Ohne die erste Zeile bekäme ein Aufruf ohne angemeldeten Berater
    -- (team_wurzel liefert dann null) alle Berater zu sehen, deren Wurzel
    -- ebenfalls null ist: null is not distinct from null ist wahr.
    and public.current_berater_id() is not null
    and public.team_wurzel(b.id) is not distinct from public.team_wurzel(public.current_berater_id())
  order by b.last_seen desc nulls last, b.name;
$$;

grant execute on function public.team_presence() to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- DANACH PRÜFEN: Jeder aktive Berater muss dieselbe Anzahl sehen, solange
-- alle unter einer Spitze hängen.
--
--   select b.name,
--          (select count(*) from public.berater x
--            where x.ist_aktiv
--              and public.team_wurzel(x.id) = public.team_wurzel(b.id)) as sieht
--     from public.berater b where b.ist_aktiv order by b.name;
--
-- Erwartet: bei allen dieselbe Zahl. Steht irgendwo eine 1, hat der Betreffende
-- keine Führungskraft eingetragen und bildet ein eigenes Team.
-- ---------------------------------------------------------------------------
