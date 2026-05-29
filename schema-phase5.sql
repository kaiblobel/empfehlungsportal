-- ============================================================
-- Empfehlungsportal · Phase 5 · Empfänger 2.0 + Anrufwunsch
-- ============================================================
-- Spalten + erweiterte/neue RPC-Funktionen (alle SECURITY DEFINER,
-- bleiben kompatibel mit Phase-4-RLS-Hardening).
-- ============================================================

-- 1. Spalten ergänzen
alter table empfehlungen add column if not exists empfehler_nachricht text;
alter table empfehlungen add column if not exists anrufwunsch         text;
alter table empfehlungen add column if not exists anrufwunsch_at      timestamp;


-- 2. get_empfehlung_public erweitern (zusätzlich empfehler_name + empfehler_nachricht)
drop function if exists get_empfehlung_public(text);

create or replace function get_empfehlung_public(p_token text)
returns table (
  id uuid,
  empfaenger_name text,
  berater_id uuid,
  typ text,
  empfehler_name text,
  empfehler_nachricht text,
  anrufwunsch text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, empfaenger_name, berater_id, typ,
         empfehler_name, empfehler_nachricht, anrufwunsch
  from empfehlungen
  where link_token = p_token
  limit 1;
$$;

grant execute on function get_empfehlung_public(text) to anon;


-- 3. Neue RPC: mark_anrufwunsch_rpc (idempotent)
--    Setzt anrufwunsch + status='anrufwunsch' + interessiert=true
--    (damit der bestehende Telegram-Trigger feuert)

create or replace function mark_anrufwunsch_rpc(p_token text, p_slot text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update empfehlungen
     set anrufwunsch    = p_slot,
         anrufwunsch_at = now(),
         status         = 'anrufwunsch',
         interessiert   = true,
         interessiert_at = coalesce(interessiert_at, now())
   where link_token = p_token
     and (anrufwunsch is null);
end;
$$;

grant execute on function mark_anrufwunsch_rpc(text, text) to anon;
