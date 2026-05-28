-- ============================================================
-- Empfehlungsportal · Phase 4 · Härtung & Hot-Lead-Loop
-- ============================================================
-- Reihenfolge ist wichtig:
--   Teil A: RPCs + EXECUTE (additiv, ohne Production-Risiko)
--   Teil B: Drop alte permissive Public-Policies (nach Frontend-Deploy)
--   Teil C: Notification-Trigger (nach Edge-Function-Deploy)
-- ============================================================


-- ========== TEIL A: SECURITY-DEFINER-RPCs ====================

-- 1. Lesefunktion: liefert nur, was die Empfänger-Seite braucht
create or replace function get_empfehlung_public(p_token text)
returns table (
  id uuid,
  empfaenger_name text,
  berater_id uuid,
  typ text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, empfaenger_name, berater_id, typ
  from empfehlungen
  where link_token = p_token
  limit 1;
$$;

-- 2. Link-geöffnet markieren (Trigger zählt link_klicks weiter)
create or replace function mark_link_geoeffnet_rpc(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update empfehlungen
     set link_geoeffnet = true,
         link_geoeffnet_at = now()
   where link_token = p_token;
end;
$$;

-- 3. Interesse bekunden (idempotent: setzt nur, wenn noch nicht gesetzt)
create or replace function mark_interessiert_rpc(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update empfehlungen
     set interessiert = true,
         interessiert_at = now()
   where link_token = p_token
     and (interessiert is not true);
end;
$$;

-- 4. Austragen (Opt-out)
create or replace function mark_ausgetragen_rpc(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update empfehlungen
     set ausgetragen = true,
         ausgetragen_at = now()
   where link_token = p_token;
end;
$$;

-- Public-Zugriff (Anon-Key) auf die RPC-Funktionen
grant execute on function get_empfehlung_public(text)       to anon;
grant execute on function mark_link_geoeffnet_rpc(text)     to anon;
grant execute on function mark_interessiert_rpc(text)       to anon;
grant execute on function mark_ausgetragen_rpc(text)        to anon;


-- ========== TEIL B: ALTE PERMISSIVE POLICIES DROPPEN =========
-- (NACH Frontend-Deploy einspielen — sonst breakt Phase 1!)
--
-- drop policy if exists "empfehlung select by token" on empfehlungen;
-- drop policy if exists "empfehlung update by token" on empfehlungen;
-- INSERT-Policy bleibt (für createEmpfehlung() aus Empfehler-Flow)


-- ========== TEIL C: NOTIFICATION-TRIGGER =====================
-- (NACH Edge-Function-Deploy einspielen, Edge-URL einsetzen)
--
-- create extension if not exists pg_net;
--
-- create or replace function notify_interesse()
-- returns trigger as $$
-- begin
--   perform net.http_post(
--     url := '<EDGE_FUNCTION_URL>',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <ANON_KEY>'
--     ),
--     body := jsonb_build_object(
--       'id', NEW.id,
--       'name', NEW.empfaenger_name,
--       'telefon', NEW.empfaenger_telefon,
--       'token', NEW.link_token
--     )
--   );
--   return NEW;
-- end;
-- $$ language plpgsql security definer;
--
-- drop trigger if exists trg_notify_interesse on empfehlungen;
-- create trigger trg_notify_interesse
--   after update of interessiert on empfehlungen
--   for each row
--   when (NEW.interessiert = true and OLD.interessiert is distinct from true)
--   execute function notify_interesse();
