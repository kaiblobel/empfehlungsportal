-- Phase 96 · Freiwillige persoenliche Promoter-Botschaft (Standard-Satz pro Promoter)
-- Angewendet live via Supabase-MCP (Projekt kkseqhmfubzfyloffkwe) am 2026-07-22.
-- Diese Datei ist die versionierte Kopie.
--
-- Modell "BEIDES": empfehlungen.empfehler_nachricht (pro Empfaenger, existiert bereits)
-- ueberschreibt empfehler.standard_nachricht (pro Promoter, hier neu). Rueckfall-Kette
-- in der Anzeige: Empfaenger-Satz -> Promoter-Standard -> neutraler Satz. Nie leer.

-- 1. Standard-Botschaft pro Promoter
alter table public.empfehler add column if not exists standard_nachricht text;
alter table public.empfehler add column if not exists standard_nachricht_at timestamptz;

-- 2. Anon-faehige Schreib-RPC: Promoter schreibt seinen Satz via eigenem Code.
--    Laengenlimit serverseitig (240). Anzeige per textContent (kein XSS).
--    Restrisiko bekannt: Auth allein ueber den ~16-Bit-Code, wie update_empfehlung_kontext.
create or replace function public.update_empfehler_standard_nachricht(p_code text, p_text text)
returns void
language sql
security definer
set search_path to 'public','pg_temp'
as $$
  update public.empfehler set
    standard_nachricht = nullif(left(coalesce(p_text,''), 240), ''),
    standard_nachricht_at = now()
  where code = p_code;
$$;
grant execute on function public.update_empfehler_standard_nachricht(text, text) to anon, authenticated;

-- 3. get_empfehler_by_code um standard_nachricht erweitern (Prefill im Promoter-Dashboard)
drop function if exists public.get_empfehler_by_code(text);
create function public.get_empfehler_by_code(p_code text)
returns table(id uuid, code text, name text, berater_id uuid, created_at timestamp without time zone, ziel_stufe integer, standard_nachricht text)
language sql security definer set search_path to 'public','pg_temp'
as $$
  select id, code, name, berater_id, created_at, ziel_stufe, standard_nachricht
  from public.empfehler where code = p_code limit 1;
$$;
grant execute on function public.get_empfehler_by_code(text) to anon, authenticated;

-- 4. get_empfehlung_public um Promoter-Standard-Satz erweitern (left join empfehler)
drop function if exists public.get_empfehlung_public(text);
create function public.get_empfehlung_public(p_token text)
returns table(id uuid, empfaenger_name text, berater_id uuid, typ text, empfehler_name text, empfehler_nachricht text, anrufwunsch text, vorlage_slug text, empfehler_standard_nachricht text)
language sql security definer set search_path to 'public','pg_temp'
as $$
  select e.id, e.empfaenger_name, e.berater_id, e.typ,
         e.empfehler_name, e.empfehler_nachricht, e.anrufwunsch, e.vorlage_slug,
         em.standard_nachricht as empfehler_standard_nachricht
  from empfehlungen e
  left join empfehler em on em.id = e.empfehler_id
  where e.link_token = p_token limit 1;
$$;
grant execute on function public.get_empfehlung_public(text) to anon, authenticated;
