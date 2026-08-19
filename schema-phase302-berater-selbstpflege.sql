-- =====================================================================
-- Phase 302 · Jeder Berater pflegt sein Profil selbst
--
-- Bisher konnte NUR der Admin Beraterdaten ändern (berater.html). Ein
-- normaler Berater darf seine eigene Zeile per RLS nur LESEN
-- ("berater self read", Phase 109). Jede Telefonnummer und jedes neue
-- Foto lief damit über Kai.
--
-- Diese Phase gibt die Selbstpflege frei, aber NICHT über ein
-- UPDATE-Recht auf der Tabelle: RLS kann keine einzelnen Spalten sperren,
-- ein Berater könnte sich sonst per Konsole selbst zum Admin machen oder
-- den Slug eines Kollegen übernehmen. Stattdessen genau eine Funktion mit
-- fester Feldliste — dasselbe Muster wie get_berater_public (Phase 291).
--
-- SELBST PFLEGBAR (zwölf Felder):
--   name, rolle, telefon, whatsapp, bookings_url, adresse,
--   impressum_url, datenschutz_url, foto_url,
--   buero_foto_url, team_foto_url, buero_bildzeile
--
-- GESPERRT (bleibt Admin, kommt in der Signatur gar nicht erst vor):
--   slug          — hängt an allen Kundenlinks und an list_kidz_berater_public
--   email         — hängt am Login
--   ist_admin     — sonst macht sich jeder selbst zum Verwalter
--   ist_test      — entscheidet, ob Daten in Auswertungen zählen
--   ist_aktiv     — entscheidet, ob die Kundenseite überhaupt ausgeliefert wird
--   fuehrungskraft_id — Teamlinie, gehört der Führung
--   auth_user_id, id, cockpit_advisor_id
--
-- Die Zeilenwahl passiert IN der Funktion über auth.uid(), nie über einen
-- Parameter. Damit ist Fremdzugriff strukturell ausgeschlossen: es gibt
-- keinen Weg, eine andere Zeile anzusprechen.
--
-- security definer + set search_path sind Pflicht. Ohne definer greift die
-- RLS und die Funktion darf nichts schreiben; ohne festen search_path
-- könnte ein untergeschobenes Schema die Tabelle austauschen.
--
-- Idempotent (create or replace). Keine Datenzeile wird angefasst.
-- =====================================================================

create or replace function public.berater_self_update(
  p_name              text,
  p_rolle             text,
  p_telefon           text,
  p_whatsapp          text,
  p_bookings_url      text,
  p_adresse           text,
  p_impressum_url     text,
  p_datenschutz_url   text,
  p_foto_url          text,
  p_buero_foto_url    text,
  p_team_foto_url     text,
  p_buero_bildzeile   text
) returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid       uuid := auth.uid();
  -- Leere Eingaben sollen NULL werden, nicht ''. Sonst steht in der
  -- Datenbank ein leerer Text, und die Kundenseiten prüfen überall auf
  -- NULL, um ein Feld auszublenden.
  v_name      text := nullif(btrim(coalesce(p_name, '')), '');
  v_rolle     text := nullif(btrim(coalesce(p_rolle, '')), '');
  v_telefon   text := nullif(btrim(coalesce(p_telefon, '')), '');
  v_whatsapp  text := nullif(btrim(coalesce(p_whatsapp, '')), '');
  v_booking   text := nullif(btrim(coalesce(p_bookings_url, '')), '');
  v_adresse   text := nullif(btrim(coalesce(p_adresse, '')), '');
  v_impr      text := nullif(btrim(coalesce(p_impressum_url, '')), '');
  v_dsgvo     text := nullif(btrim(coalesce(p_datenschutz_url, '')), '');
  v_foto      text := nullif(btrim(coalesce(p_foto_url, '')), '');
  v_buerofoto text := nullif(btrim(coalesce(p_buero_foto_url, '')), '');
  v_teamfoto  text := nullif(btrim(coalesce(p_team_foto_url, '')), '');
  v_bildzeile text := nullif(btrim(coalesce(p_buero_bildzeile, '')), '');
  v_treffer   int;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet.';
  end if;

  -- Der Name steht im Kopf jeder Kundenseite UND entscheidet mit darüber,
  -- ob ein Berater in der KIDZ-Auswahl auftaucht (list_kidz_berater_public
  -- verlangt einen nicht leeren Namen). Ein leeres Feld würde den Berater
  -- dort still verschwinden lassen.
  if v_name is null then
    raise exception 'Ohne Namen geht es nicht: er steht auf jeder Kundenseite.';
  end if;

  -- Adressen müssen aufrufbar sein. Ein Berater tippt hier schnell
  -- "www.example.de" ohne Vorsatz, und der Link zeigt dann relativ ins
  -- eigene Portal statt nach außen.
  if v_booking is not null and v_booking !~* '^https?://' then
    raise exception 'Der Terminlink muss mit http:// oder https:// beginnen.';
  end if;
  if v_impr is not null and v_impr !~* '^https?://' then
    raise exception 'Der Impressum-Link muss mit http:// oder https:// beginnen.';
  end if;
  if v_dsgvo is not null and v_dsgvo !~* '^https?://' then
    raise exception 'Der Datenschutz-Link muss mit http:// oder https:// beginnen.';
  end if;

  -- Bilder: entweder eine Datei aus dem eigenen Bilderfach (dort landet der
  -- Upload aus der Oberfläche) oder ein mitgeliefertes Bild aus /assets/.
  -- Beide Formen sind im Bestand vorhanden: vier Berater haben einen
  -- /assets/-Pfad, drei eine Storage-Adresse. Eine fremde Adresse wäre ein
  -- offenes Tor: Wer sie über die Konsole setzt, lädt auf einer Kundenseite
  -- ein beliebiges fremdes Bild nach.
  if v_foto is not null
     and v_foto !~ '^https://kkseqhmfubzfyloffkwe\.supabase\.co/storage/v1/object/public/berater-fotos/'
     and v_foto !~ '^/assets/' then
    raise exception 'Das Profilbild muss aus dem Portal stammen (Upload oder /assets/).';
  end if;
  if v_buerofoto is not null
     and v_buerofoto !~ '^https://kkseqhmfubzfyloffkwe\.supabase\.co/storage/v1/object/public/berater-fotos/'
     and v_buerofoto !~ '^/assets/' then
    raise exception 'Das Bürofoto muss aus dem Portal stammen (Upload oder /assets/).';
  end if;
  if v_teamfoto is not null
     and v_teamfoto !~ '^https://kkseqhmfubzfyloffkwe\.supabase\.co/storage/v1/object/public/berater-fotos/'
     and v_teamfoto !~ '^/assets/' then
    raise exception 'Das Teamfoto muss aus dem Portal stammen (Upload oder /assets/).';
  end if;

  update public.berater
     set name            = v_name,
         rolle           = v_rolle,
         telefon         = v_telefon,
         whatsapp        = v_whatsapp,
         bookings_url    = v_booking,
         adresse         = v_adresse,
         impressum_url   = v_impr,
         datenschutz_url = v_dsgvo,
         foto_url        = v_foto,
         buero_foto_url  = v_buerofoto,
         team_foto_url   = v_teamfoto,
         buero_bildzeile = v_bildzeile
   -- Hier und nirgends sonst wird entschieden, WESSEN Zeile geschrieben
   -- wird. Kein Parameter, keine Übergabe von außen.
   where auth_user_id = v_uid;

  get diagnostics v_treffer = row_count;
  if v_treffer = 0 then
    raise exception 'Zu diesem Login gehört kein Berater-Datensatz.';
  end if;
end;
$function$;

revoke all on function public.berater_self_update(
  text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon;

grant execute on function public.berater_self_update(
  text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

comment on function public.berater_self_update(
  text, text, text, text, text, text, text, text, text, text, text, text
) is
  'Selbstpflege des eigenen Berater-Profils (Phase 302). Schreibt zwölf '
  'Felder, immer nur auf die Zeile mit auth_user_id = auth.uid(). Slug, '
  'E-Mail, Rechte-Kennzeichen und die Cockpit-Kennung sind bewusst nicht '
  'dabei, die bleiben beim Admin.';

-- ---------------------------------------------------------------------
-- KONTROLLE nach dem Einspielen:
--
--   select proname, pg_get_function_identity_arguments(oid), prosecdef
--     from pg_proc where proname = 'berater_self_update';
--   → prosecdef muss true sein (security definer).
--
--   select proconfig from pg_proc where proname = 'berater_self_update';
--   → muss {search_path=public} enthalten.
--
-- Und die Zählprobe, die nach jedem Speichern gleich bleiben muss:
--   select count(*) from public.list_kidz_berater_public();   -- 9
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- ROLLBACK (die Selbstpflege fällt weg, sonst ändert sich nichts —
-- die Admin-Verwaltung läuft unabhängig davon weiter):
--
--   drop function if exists public.berater_self_update(
--     text, text, text, text, text, text, text, text, text, text, text, text);
-- ---------------------------------------------------------------------
