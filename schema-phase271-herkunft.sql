-- Phase 271 · Man sieht, woher ein Kontakt kommt
--
-- Die Team-Ansicht der Empfehlungen kannte die beiden Spalten nicht, die in
-- Phase 270 dazugekommen sind. Ergebnis: Jeder Lead aus einem Funnel stand
-- dort als "Promoter: nicht angegeben" statt mit seiner Herkunft.
--
-- Aenderung: zwei Spalten mehr im Rueckgabewert, sonst unveraendert.
-- Die Rechte bleiben wie in Phase 198 festgelegt (anon darf das nicht).

drop function if exists public.team_empfehlungen(integer, integer);
create function public.team_empfehlungen(p_days integer default 30, p_limit integer default 200)
returns table(id uuid, empfaenger_name text, status text, interessiert boolean,
              anrufwunsch text, empfehler_name text, berater_id uuid,
              berater_name text, angelegt_am timestamp with time zone,
              ist_test boolean, typ text, quelle text)
language sql
stable security definer
set search_path to ''
as $function$
  select e.id, e.empfaenger_name, coalesce(e.status, 'offen'),
         coalesce(e.interessiert, false), e.anrufwunsch, e.empfehler_name,
         e.berater_id, b.name,
         (e.created_at at time zone 'UTC'),
         e.ist_test, e.typ, e.quelle
    from public.empfehlungen e
    join public.berater b on b.id = e.berater_id
   where e.berater_id in (select public.mein_team())
     and e.created_at >= (now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365))))::timestamp
   order by e.created_at desc
   limit greatest(1, least(coalesce(p_limit, 200), 1000));
$function$;

revoke execute on function public.team_empfehlungen(integer, integer) from anon, public;
grant execute on function public.team_empfehlungen(integer, integer) to authenticated;
