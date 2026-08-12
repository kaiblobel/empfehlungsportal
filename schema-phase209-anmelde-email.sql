-- Phase 209 · Die Anmeldeadresse sichtbar machen, wo sie abweicht
--
-- Im Portal gibt es zwei E-Mail-Felder mit zwei Aufgaben:
--
--   public.berater.email  Geschäftsadresse. Die sehen Kunden: Kontaktlink auf
--                         den öffentlichen Seiten, Prämienbeleg.
--   auth.users.email      Anmeldeadresse. Damit meldet man sich an.
--
-- Verbunden sind sie über berater.auth_user_id, nicht über die Adresse. Sie
-- dürfen also auseinandergehen, und bei Kai tun sie das: in der Karte steht
-- kai.blobel@dvag.de, angemeldet wird er mit kai@blobel.de. Bei allen anderen
-- sind sie gleich, weil "Login anlegen" das Konto mit der Karten-Adresse
-- erzeugt; Kais Konto ist das älteste und von Hand entstanden.
--
-- In der Beraterliste stand bisher nur die Karten-Adresse. Dadurch sah es aus,
-- als wäre das auch die Anmeldung.
--
-- Diese Funktion ist der ERSTE lesende Zugriff auf auth.users im Portal
-- (admin_set_berater_password aus Phase 20 schreibt nur). Deshalb eng:
--   * nur für Admins,
--   * nur Konten, die an einem Berater hängen,
--   * und nur, wenn die Adresse tatsächlich abweicht. Was nicht abweicht,
--     verlässt die Datenbank gar nicht erst.

create or replace function public.berater_login_emails()
returns table(berater_id uuid, login_email text)
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
begin
  if not public.is_current_berater_admin() then
    return;
  end if;

  return query
  select b.id, u.email::text
    from public.berater b
    join auth.users u on u.id = b.auth_user_id
   where b.auth_user_id is not null
     -- Groß- und Kleinschreibung ist keine Abweichung: Supabase legt die
     -- Anmeldeadresse klein ab, in der Karte steht sie oft anders geschrieben.
     and lower(btrim(coalesce(u.email, ''))) is distinct from lower(btrim(coalesce(b.email, '')));
end;
$function$;

comment on function public.berater_login_emails() is
  'Liefert je Berater die Anmeldeadresse aus auth.users, aber nur wenn sie von berater.email abweicht. Nur für Admins.';

-- Lehre aus Phase 198: Supabase vergibt EXECUTE beim Anlegen automatisch an
-- anon; ein revoke from public entfernt das NICHT.
revoke execute on function public.berater_login_emails() from anon, public;
grant execute on function public.berater_login_emails() to authenticated;
