-- Phase 192 · Prämien und Stufen-Mail als EINE Fachlogik
--
-- Befund (Prüfung 12.08.2026, Live-Stand main 8675006 / Vercel 1d771db):
--
--   sync_praemien_for_empfehler() sucht die Belohnungsstufen mit
--   "where bs.berater_id = v_berater". In belohnungs_stufen liegen aber nur
--   15 Zeilen, und die tragen alle Kais berater_id. Für jeden anderen Berater
--   findet die Funktion nichts und legt still keine Prämie an.
--
--   check_stufe_erreicht() sucht dagegen "where stufe = v_count" OHNE
--   berater_id. Sie findet also Kais Stufe und verschickt die Glückwunsch-Mail
--   an den Promoter. Ergebnis für einen fremden Berater: der Promoter bekommt
--   die Mail "Stufe erreicht", im Portal steht aber keine Prämie.
--
-- Hintergrund: Phase 53 hatte Programm-Inhalte je Berater geklont, Phase 57 hat
-- das zurückgenommen — die Inhalte sind seither geteilt und nur der Admin
-- pflegt sie. Die Prämien-Funktion ist bei der alten Logik stehen geblieben.
--
-- Diese Migration ist rein additiv/ersetzend auf Funktionsebene. Sie ändert
-- KEINE Tabelle, KEINE Zeile und KEINE Policy. Bestehende Prämien bleiben
-- unberührt; die Funktionen sind durch "not exists" idempotent.
--
-- NICHT ANGEWANDT. Freigabe durch Kai steht aus.

begin;

-- ---------------------------------------------------------------------------
-- 1) Ein Helfer, der die maßgeblichen Stufen eines Beraters liefert.
--    Eigene Stufen, wenn der Berater welche gepflegt hat (Phase 53).
--    Sonst das geteilte Set des Admins (Entscheidung aus Phase 57).
--    Genau EINE Stelle, an der diese Frage beantwortet wird — damit
--    Prämienerzeugung und Stufen-Mail nie wieder auseinanderlaufen können.
-- ---------------------------------------------------------------------------
create or replace function private.belohnungs_stufen_fuer(p_berater uuid)
returns setof public.belohnungs_stufen
language sql
stable
security definer
set search_path to ''
as $$
  select bs.*
    from public.belohnungs_stufen bs
   where bs.berater_id = p_berater
   union all
  select bs.*
    from public.belohnungs_stufen bs
   where not exists (
           select 1 from public.belohnungs_stufen b2 where b2.berater_id = p_berater
         )
     and bs.berater_id = (
           select b.id from public.berater b
            where b.ist_admin
            order by b.created_at nulls last, b.name
            limit 1
         );
$$;

revoke all on function private.belohnungs_stufen_fuer(uuid) from public;

comment on function private.belohnungs_stufen_fuer(uuid) is
  'Maßgebliche Belohnungsstufen eines Beraters: eigene, sonst das geteilte Admin-Set (Phase 57/192).';

-- ---------------------------------------------------------------------------
-- 2) Prämien-Abgleich über den Helfer statt über den harten berater_id-Filter.
-- ---------------------------------------------------------------------------
create or replace function public.sync_praemien_for_empfehler(p_empfehler_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_berater uuid;
  v_kunden int;
begin
  select berater_id into v_berater from empfehler where id = p_empfehler_id;
  if v_berater is null then
    return;
  end if;

  select count(*) into v_kunden from empfehlungen
    where empfehler_id = p_empfehler_id and status = 'kunde';

  insert into praemien (empfehler_id, berater_id, stufe, titel, wert_label)
  select p_empfehler_id, v_berater, bs.stufe, bs.titel, bs.wert_label
  from private.belohnungs_stufen_fuer(v_berater) bs
  where bs.stufe <= v_kunden
    and not exists (
      select 1 from praemien p
      where p.empfehler_id = p_empfehler_id and p.stufe = bs.stufe
    );
end;
$$;

-- Der Prämien-Abgleich hat für anonyme Besucher keinen Zweck. Bisher war er
-- für anon ausführbar — ohne Nutzen, aber als unnötige Angriffsfläche.
revoke execute on function public.sync_praemien_for_empfehler(uuid) from anon;

-- ---------------------------------------------------------------------------
-- 3) Stufen-Mail und Prämie gehören zusammen.
--    Die Mail geht erst raus, nachdem die Prämie im Portal steht — und nur,
--    wenn im maßgeblichen Stufen-Set des ZUSTÄNDIGEN Beraters eine Stufe für
--    diese Kundenzahl hinterlegt ist.
-- ---------------------------------------------------------------------------
create or replace function public.check_stufe_erreicht()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
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

  -- Erst die Prämie im Portal, dann die Zusage an den Promoter.
  -- Deckt auch den INSERT-Fall ab: trg_empfehlung_kunde hängt nur an UPDATE,
  -- eine direkt als "kunde" angelegte Empfehlung erzeugte bisher nie eine Prämie.
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
$$;

commit;

-- ---------------------------------------------------------------------------
-- Gegenprobe nach dem Anwenden (reines Lesen, ändert nichts):
--
--   select b.name as berater, e.name as promoter,
--          (select count(*) from empfehlungen f
--            where f.empfehler_id = e.id and f.status = 'kunde') as kunden,
--          (select count(*) from praemien p where p.empfehler_id = e.id) as praemien
--     from empfehler e join berater b on b.id = e.berater_id
--    where exists (select 1 from empfehlungen f
--                   where f.empfehler_id = e.id and f.status = 'kunde')
--    order by b.name, e.name;
--
-- Erwartung: je Promoter so viele Prämien wie Kunden (bis zur höchsten
-- hinterlegten Stufe), unabhängig davon, welchem Berater er gehört.
--
-- Rückweg: die drei Funktionen sind ersetzbar. Der Ausgangsstand steht in
-- docs/PRUEFUNG-2026-08-12.md unter "Rückweg".
-- ---------------------------------------------------------------------------
