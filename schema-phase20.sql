-- ============================================================
-- Phase 20 / Build-Phase 76 · Admin setzt Berater-Passwort
-- ------------------------------------------------------------
-- Der Admin (is_current_berater_admin) kann das Passwort jedes Beraters
-- neu setzen (z. B. bei Passwort-Vergessen, ohne fehleranfällige Magic-Links).
-- Bcrypt via pgcrypto (Schema `extensions`), direkt in auth.users — dieselbe
-- Methode, mit der die Berater-Logins ohnehin per SQL angelegt werden.
-- GoTrue-Login (signInWithPassword) akzeptiert den bcrypt-Hash.
--
-- Absicherung: streng serverseitig über is_current_berater_admin() — NICHT nur UI.
-- Kein service_role im Browser nötig. Rückgabe: 'ok'|'forbidden'|'too_short'|'no_login'.
--
-- Das Selbst-Ändern durch den Berater läuft über das offizielle
-- supabase.auth.updateUser({password}) im Frontend (kein SQL nötig).
--
-- Bereits per Supabase-MCP live (Migration phase76_admin_set_berater_password).
-- Rollback-only getestet: ok + gültiger bcrypt-Hash, forbidden (Nicht-Admin), too_short.
-- ============================================================

create or replace function public.admin_set_berater_password(p_berater_id uuid, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions, auth, pg_temp
as $$
declare v_uid uuid;
begin
  if not public.is_current_berater_admin() then return 'forbidden'; end if;
  if length(coalesce(p_password, '')) < 8 then return 'too_short'; end if;

  select auth_user_id into v_uid from public.berater where id = p_berater_id;
  if v_uid is null then return 'no_login'; end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_uid;
  return 'ok';
end $$;

revoke execute on function public.admin_set_berater_password(uuid, text) from anon, public;
grant  execute on function public.admin_set_berater_password(uuid, text) to authenticated;
