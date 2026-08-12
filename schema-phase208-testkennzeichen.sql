-- Phase 208 · Testdaten sind als Test gekennzeichnet
--
-- Bisher war "Test oder echt?" eine Frage der Namensgebung. Wer einen Promoter
-- "Holger Hempel (Test)" nannte, hoffte, dass es später jemand liest. Beim
-- Aufräumen der Demo-Welt am 12.08. musste jeder Datensatz von Hand beurteilt
-- werden, und Kais Testberater war nur am Namen erkennbar.
--
-- Ab jetzt trägt jeder Datensatz ein Kennzeichen, das die Datenbank selbst
-- pflegt und weitergibt:
--
--   1. Ein Testberater macht alles zu Test, was ihm gehört.
--   2. Ein Testpromoter macht seine Empfehlungen und Prämien zu Test.
--   3. Eine einzelne Empfehlung kann als Test markiert werden, ohne dass der
--      Promoter dafür ein Testpromoter sein muss.
--
-- Daraus folgen drei Zusagen:
--
--   * Testdaten zählen in keiner Kennzahl des Beraters mit.
--   * Testdaten lösen keine Mail, keine Push-Nachricht und keinen Telegram-
--     Ruf aus. Das war bisher reine Disziplin.
--   * Testdaten lassen sich mit einem Befehl sichern und entfernen.
--
-- Nichts an bestehenden Daten ändert sich: die Spalte kommt mit false.

/* ------------------------------------------------------------------ *
 * 1) Das Kennzeichen
 * ------------------------------------------------------------------ */

alter table public.berater
  add column if not exists ist_test boolean not null default false;
alter table public.empfehler
  add column if not exists ist_test boolean not null default false;
alter table public.empfehlungen
  add column if not exists ist_test boolean not null default false;
alter table public.praemien
  add column if not exists ist_test boolean not null default false;
alter table public.kidz_gewinnspiel_teilnahmen
  add column if not exists ist_test boolean not null default false;
alter table public.kidz_elternabend_anmeldungen
  add column if not exists ist_test boolean not null default false;
alter table public.potenziale
  add column if not exists ist_test boolean not null default false;

comment on column public.berater.ist_test is
  'Testkonto. Alles, was diesem Berater gehört, gilt als Testdatensatz.';
comment on column public.empfehler.ist_test is
  'Testpromoter. Seine Empfehlungen und Prämien gelten als Testdatensatz.';
comment on column public.empfehlungen.ist_test is
  'Testempfehlung. Zählt in keiner Kennzahl des Beraters, löst keine Benachrichtigung aus.';
comment on column public.praemien.ist_test is
  'Testprämie. Entsteht automatisch aus einem Testpromoter.';

/* ------------------------------------------------------------------ *
 * 2) Vererbung beim Anlegen
 *
 * Die Trigger heißen bewusst so, dass sie alphabetisch zuletzt laufen:
 * empfehlungen_zz_set_berater setzt die berater_id, und die brauchen wir.
 * ------------------------------------------------------------------ */

create or replace function public.erbe_testkennzeichen()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.ist_test then
    return new;  -- ausdrücklich als Test angelegt, bleibt so
  end if;

  if tg_table_name = 'empfehler' then
    select b.ist_test into new.ist_test
      from public.berater b where b.id = new.berater_id;

  elsif tg_table_name = 'empfehlungen' then
    select coalesce(
             (select e.ist_test from public.empfehler e where e.id = new.empfehler_id),
             false)
        or coalesce(
             (select b.ist_test from public.berater b where b.id = new.berater_id),
             false)
      into new.ist_test;

  elsif tg_table_name = 'praemien' then
    select coalesce(
             (select e.ist_test from public.empfehler e where e.id = new.empfehler_id),
             false)
        or coalesce(
             (select b.ist_test from public.berater b where b.id = new.berater_id),
             false)
      into new.ist_test;

  else
    -- kidz_*, potenziale: hängen direkt am Berater
    select b.ist_test into new.ist_test
      from public.berater b where b.id = new.berater_id;
  end if;

  new.ist_test := coalesce(new.ist_test, false);
  return new;
end;
$$;

comment on function public.erbe_testkennzeichen() is
  'Reicht das Testkennzeichen beim Anlegen vom Berater bzw. Promoter an den neuen Datensatz weiter.';

drop trigger if exists empfehler_zzz_erbe_test on public.empfehler;
create trigger empfehler_zzz_erbe_test
  before insert on public.empfehler
  for each row execute function public.erbe_testkennzeichen();

drop trigger if exists empfehlungen_zzz_erbe_test on public.empfehlungen;
create trigger empfehlungen_zzz_erbe_test
  before insert on public.empfehlungen
  for each row execute function public.erbe_testkennzeichen();

drop trigger if exists praemien_zzz_erbe_test on public.praemien;
create trigger praemien_zzz_erbe_test
  before insert on public.praemien
  for each row execute function public.erbe_testkennzeichen();

drop trigger if exists kidz_gewinnspiel_zzz_erbe_test on public.kidz_gewinnspiel_teilnahmen;
create trigger kidz_gewinnspiel_zzz_erbe_test
  before insert on public.kidz_gewinnspiel_teilnahmen
  for each row execute function public.erbe_testkennzeichen();

drop trigger if exists kidz_elternabend_zzz_erbe_test on public.kidz_elternabend_anmeldungen;
create trigger kidz_elternabend_zzz_erbe_test
  before insert on public.kidz_elternabend_anmeldungen
  for each row execute function public.erbe_testkennzeichen();

drop trigger if exists potenziale_zzz_erbe_test on public.potenziale;
create trigger potenziale_zzz_erbe_test
  before insert on public.potenziale
  for each row execute function public.erbe_testkennzeichen();

/* ------------------------------------------------------------------ *
 * 3) Nachziehen, wenn ein Berater oder Promoter nachträglich
 *    zum Testfall erklärt wird
 *
 * Der praktische Fall: erst getestet, dann gemerkt, dass es Test war.
 * Das Kennzeichen zieht dann nach unten durch, damit ein einziger
 * Handgriff reicht.
 * ------------------------------------------------------------------ */

create or replace function public.ziehe_testkennzeichen_nach()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_table_name = 'berater' then
    update public.empfehler   set ist_test = new.ist_test where berater_id = new.id;
    update public.empfehlungen set ist_test = new.ist_test where berater_id = new.id;
    update public.praemien    set ist_test = new.ist_test where berater_id = new.id;
    update public.kidz_gewinnspiel_teilnahmen set ist_test = new.ist_test where berater_id = new.id;
    update public.kidz_elternabend_anmeldungen set ist_test = new.ist_test where berater_id = new.id;
    update public.potenziale  set ist_test = new.ist_test where berater_id = new.id;
  else
    update public.empfehlungen set ist_test = new.ist_test where empfehler_id = new.id;
    update public.praemien     set ist_test = new.ist_test where empfehler_id = new.id;
  end if;
  return new;
end;
$$;

comment on function public.ziehe_testkennzeichen_nach() is
  'Zieht eine nachträgliche Änderung des Testkennzeichens an alle abhängigen Datensätze durch.';

drop trigger if exists berater_zzz_ziehe_test_nach on public.berater;
create trigger berater_zzz_ziehe_test_nach
  after update of ist_test on public.berater
  for each row when (old.ist_test is distinct from new.ist_test)
  execute function public.ziehe_testkennzeichen_nach();

drop trigger if exists empfehler_zzz_ziehe_test_nach on public.empfehler;
create trigger empfehler_zzz_ziehe_test_nach
  after update of ist_test on public.empfehler
  for each row when (old.ist_test is distinct from new.ist_test)
  execute function public.ziehe_testkennzeichen_nach();

/* ------------------------------------------------------------------ *
 * 4) Keine echten Benachrichtigungen aus Testdaten
 *
 * Bisher stand in der Anleitung "vor jedem Test prüfen, welche Mails
 * ausgelöst werden könnten". Das ist jetzt verdrahtet.
 * ------------------------------------------------------------------ */

create or replace function public.notify_interesse_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_token TEXT;
BEGIN
  -- Phase 208: Testdaten lösen keine Push-Nachricht aus.
  IF NEW.ist_test THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_token FROM public.app_secrets WHERE key = 'INTERNAL_FUNCTION_TOKEN';

  PERFORM net.http_post(
    url := 'https://kkseqhmfubzfyloffkwe.supabase.co/functions/v1/notify-interesse',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Token', COALESCE(v_token, '')
    ),
    body := jsonb_build_object(
      'id', NEW.id,
      'name', NEW.empfaenger_name,
      'telefon', NEW.empfaenger_telefon,
      'token', NEW.link_token
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_interesse_trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

create or replace function public.notify_promoter_created_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_token text;
begin
  if new.self_registered_at is null then
    return new;
  end if;

  -- Phase 208: Testdaten lösen keine Push-Nachricht aus.
  if new.ist_test then
    return new;
  end if;

  select value into v_token
    from public.app_secrets
   where key = 'INTERNAL_FUNCTION_TOKEN';

  perform net.http_post(
    url := 'https://kkseqhmfubzfyloffkwe.supabase.co/functions/v1/notify-promoter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Token', coalesce(v_token, '')
    ),
    body := jsonb_build_object('id', new.id)
  );
  return new;
exception when others then
  raise warning 'notify_promoter_created_trigger failed: %', sqlerrm;
  return new;
end;
$function$;

-- Die Stufenlogik läuft bei Testdaten weiter (damit man sie überhaupt testen
-- kann), nur die Glückwunsch-Mail an den Promoter geht nicht raus. Im
-- Protokoll steht dann 'test' statt 'email'.
create or replace function public.check_stufe_erreicht()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
DECLARE
  v_count   INTEGER;
  v_berater UUID;
  v_stufe   RECORD;
  v_url     TEXT;
  v_base    TEXT;
  v_token   TEXT;
BEGIN
  IF NEW.status != 'kunde' OR NEW.empfehler_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'kunde' THEN
    RETURN NEW;
  END IF;

  SELECT berater_id INTO v_berater FROM public.empfehler WHERE id = NEW.empfehler_id;
  IF v_berater IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.empfehlungen
  WHERE empfehler_id = NEW.empfehler_id AND status = 'kunde';

  PERFORM public.sync_praemien_for_empfehler(NEW.empfehler_id);

  SELECT * INTO v_stufe
    FROM private.belohnungs_stufen_fuer(v_berater) bs
   WHERE bs.stufe = v_count
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.stufe_notifications WHERE empfehler_id = NEW.empfehler_id AND stufe = v_count) THEN
    RETURN NEW;
  END IF;

  -- Phase 208: Testdaten bekommen einen Protokolleintrag, aber keine Mail.
  IF NEW.ist_test THEN
    INSERT INTO public.stufe_notifications (empfehler_id, stufe, channel)
    VALUES (NEW.empfehler_id, v_count, 'test')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.stufe_notifications (empfehler_id, stufe, channel)
  VALUES (NEW.empfehler_id, v_count, 'email')
  ON CONFLICT DO NOTHING;

  SELECT value INTO v_base FROM public.app_secrets WHERE key = 'SUPABASE_URL';
  IF v_base IS NULL THEN
    v_base := 'https://kkseqhmfubzfyloffkwe.supabase.co';
  END IF;
  v_url := v_base || '/functions/v1/notify-stufe';

  SELECT value INTO v_token FROM public.app_secrets WHERE key = 'INTERNAL_FUNCTION_TOKEN';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Token', COALESCE(v_token, '')
    ),
    body := jsonb_build_object(
      'empfehler_id', NEW.empfehler_id,
      'stufe', v_count,
      'empfehlung_id', NEW.id
    )
  );

  RETURN NEW;
END;
$function$;

