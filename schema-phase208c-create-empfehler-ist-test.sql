-- Phase 208 (Teil C) · Beim Anlegen eines Promoters das Testkennzeichen setzen
--
-- Der Trigger aus Teil A vererbt das Kennzeichen von einem Testberater nach
-- unten. Für den häufigeren Fall fehlte noch der Weg: ein ganz normaler
-- Berater legt einen Promoter an und will ihn nur ausprobieren.
--
-- Die alte Signatur wird ersetzt statt überladen. Bestehende Aufrufe mit vier
-- Parametern bleiben gültig, weil der neue Parameter einen Vorgabewert hat.

drop function if exists public.create_empfehler(text, text, text, text);

create function public.create_empfehler(
  p_name text,
  p_email text,
  p_telefon text,
  p_berater_slug text default null::text,
  p_ist_test boolean default false
)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_code text;
  v_berater uuid;
  v_actor uuid;
begin
  v_actor := public.current_berater_id();
  if v_actor is null then
    raise insufficient_privilege using message = 'Berater login required';
  end if;

  if nullif(trim(coalesce(p_berater_slug, '')), '') is not null then
    select id into v_berater
      from public.berater
     where lower(slug) = lower(trim(p_berater_slug))
       and ist_aktiv
     limit 1;
  else
    v_berater := v_actor;
  end if;

  if v_berater is null then
    raise invalid_parameter_value using message = 'Unknown advisor';
  end if;
  if v_berater <> v_actor and not public.is_current_berater_admin() then
    raise insufficient_privilege using message = 'Advisor scope mismatch';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise invalid_parameter_value using message = 'Invalid promoter name';
  end if;

  v_code := private.generate_empfehler_code(p_name);
  -- Phase 208: ist_test kann beim Anlegen gesetzt werden; ist der Berater
  -- selbst ein Testkonto, ergänzt der Trigger es ohnehin.
  insert into public.empfehler (code, name, email, telefon, berater_id, code_version, ist_test)
  values (
    v_code,
    left(trim(p_name), 100),
    nullif(lower(trim(p_email)), ''),
    nullif(trim(p_telefon), ''),
    v_berater,
    2,
    coalesce(p_ist_test, false)
  );
  return v_code;
end;
$function$;

-- Lehre aus Phase 198: Supabase vergibt EXECUTE beim Anlegen automatisch an
-- anon; ein revoke from public entfernt das NICHT.
revoke execute on function public.create_empfehler(text, text, text, text, boolean) from anon, public;
grant execute on function public.create_empfehler(text, text, text, text, boolean) to authenticated;
