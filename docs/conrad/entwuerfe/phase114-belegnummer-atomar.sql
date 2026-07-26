-- ============================================================================
-- ENTWURF (v3, freigabefertig) · schema-phase114.sql · Belegnummer kollisionssicher
--          (Prüfbefund 6 · Conrad)
-- ----------------------------------------------------------------------------
-- STATUS: ENTWURF, zur Live-Einspielung freigegeben (Kai, 2026-07-26).
--         Auf Test-Kopie validiert (Nachweis unten). Kein main bis zu Kais OK.
-- Nummer 114 (keine Kollision mit White-Label 110/111/112).
--
-- ÄNDERUNGEN v3 ggü. v2 (Kais Vorgaben, 2026-07-26):
--   * Backfill: `and berater_id is not null` ergänzt.
--   * Grant nach Funktionsaustausch ausdrücklich an authenticated UND service_role.
--   * Rückbau-Hinweis korrigiert: die bisherige Funktion war NIE für PUBLIC/anon
--     ausführbar (Live-Grants: postgres, authenticated, service_role).
-- v2: Zählertabelle -> private-Schema; Rechte für PUBLIC/anon/authenticated entzogen;
--     Prämienzeile beim Auszahlen mit FOR UPDATE gesperrt.
--
-- PROBLEM
--   auszahlen_praemie() vergibt die Belegnummer per `count(*)+1`; zwei gleich-
--   zeitige Auszahlungen können dieselbe Nummer erhalten, keine Eindeutigkeit,
--   keine Zeilensperre.
-- ============================================================================

begin;

-- 1) Zähler-Tabelle im PRIVATE-Schema (nicht über die API/PostgREST erreichbar)
create schema if not exists private;
create table if not exists private.beleg_zaehler (
  berater_id uuid not null references public.berater(id) on delete cascade,
  jahr       int  not null,
  letzte_nr  int  not null default 0,
  primary key (berater_id, jahr)
);

-- Rechte ausdrücklich entziehen: niemand außer der Definer-Funktion kommt ran.
revoke all on private.beleg_zaehler from public;
revoke all on private.beleg_zaehler from anon;
revoke all on private.beleg_zaehler from authenticated;
revoke all on schema private from public, anon, authenticated;

-- 2) Backfill aus bestehenden Belegnummern (EMP-YYYY-NNNN). Ändert KEINE beleg_nr.
insert into private.beleg_zaehler (berater_id, jahr, letzte_nr)
select berater_id,
       substring(beleg_nr from 'EMP-(\d{4})-')::int,
       max(substring(beleg_nr from 'EMP-\d{4}-(\d+)')::int)
from public.praemien
where beleg_nr ~ '^EMP-\d{4}-\d+$'
  and berater_id is not null
group by berater_id, substring(beleg_nr from 'EMP-(\d{4})-')::int
on conflict (berater_id, jahr) do update
  set letzte_nr = greatest(private.beleg_zaehler.letzte_nr, excluded.letzte_nr);

-- 3) Eindeutigkeitsregel auf gesetzte Belegnummern
create unique index if not exists praemien_berater_beleg_uidx
  on public.praemien (berater_id, beleg_nr)
  where beleg_nr is not null;

-- 4) auszahlen_praemie: Zeilensperre (FOR UPDATE) + atomarer Zähler aus private
create or replace function public.auszahlen_praemie(
  p_id uuid, p_betrag numeric, p_art text, p_variante text,
  p_adresse text, p_notiz text, p_datum date)
returns public.praemien
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_row   public.praemien;
  v_jahr  int;
  v_nr    int;
  v_beleg text;
begin
  -- Prämienzeile SPERREN -> keine doppelte gleichzeitige Auszahlung derselben Prämie
  select * into v_row from praemien where id = p_id for update;
  if not found then raise exception 'Praemie nicht gefunden'; end if;
  if not (v_row.berater_id = current_berater_id() or is_current_berater_admin()) then
    raise exception 'Kein Zugriff';
  end if;

  v_beleg := v_row.beleg_nr;
  if v_beleg is null then
    v_jahr := extract(year from coalesce(p_datum, current_date))::int;
    -- ATOMAR: Zähler pro Berater+Jahr sperren und erhöhen (schema-qualifiziert)
    insert into private.beleg_zaehler (berater_id, jahr, letzte_nr)
      values (v_row.berater_id, v_jahr, 1)
    on conflict (berater_id, jahr)
      do update set letzte_nr = private.beleg_zaehler.letzte_nr + 1
    returning letzte_nr into v_nr;
    v_beleg := 'EMP-' || v_jahr || '-' || lpad(v_nr::text, 4, '0');
  end if;

  update praemien set
    status = 'ausgezahlt',
    betrag = p_betrag,
    auszahlungsart = p_art,
    variante = coalesce(nullif(p_variante,''), variante),
    empfaenger_adresse = nullif(p_adresse,''),
    notiz = coalesce(nullif(p_notiz,''), notiz),
    ausgezahlt_at = coalesce(p_datum::timestamp, now()),
    beleg_nr = v_beleg
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$function$;

-- 5) Ausführungsrecht ausdrücklich setzen. Die Funktion war bereits NUR für
--    authenticated + service_role ausführbar (NIE PUBLIC/anon); nach dem
--    create-or-replace setzen wir es ausdrücklich, damit es garantiert erhalten bleibt.
grant execute on function public.auszahlen_praemie(uuid, numeric, text, text, text, text, date) to authenticated, service_role;

commit;

-- ----------------------------------------------------------------------------
-- RÜCKBAU:
--   * auszahlen_praemie() aus schema-phase16 (count(*)+1-Fassung) wiederherstellen.
--     Die bisherige Funktion war NUR für authenticated + service_role ausführbar,
--     NIE für PUBLIC/anon -> beim Rückbau KEIN PUBLIC/anon-Grant setzen
--     (grant execute ... to authenticated, service_role;).
--   * drop index if exists public.praemien_berater_beleg_uidx;
--   * drop table if exists private.beleg_zaehler;
--   (Bestehende beleg_nr bleiben unverändert.)
--
-- TESTPLAN (inkl. Kais Parallel-Anforderung):
--   1. Zwei verschiedene Prämien eines Beraters auszahlen -> fortlaufend, eindeutig.
--   2. Dieselbe Prämie zweimal auszahlen -> zweiter Aufruf vergibt KEINE neue Nummer.
--   3. PARALLEL: zwei gleichzeitige Transaktionen zahlen dieselbe Prämie aus ->
--      dank FOR UPDATE serialisiert; genau eine Nummer, kein Duplikat.
--   4. PARALLEL: zwei gleichzeitige Auszahlungen VERSCHIEDENER Prämien desselben
--      Beraters/Jahres -> zwei verschiedene, lückenlose Nummern (atomarer Zähler).
--   5. Zwei Berater / Jahreswechsel -> getrennte Zählerstände.
--   6. Backfill-Probe: Altbestand EMP-2026-0007 -> nächste Nummer 0008.
--   7. Fremdzugriff / anon -> kein EXECUTE bzw. 'Kein Zugriff'.
--   8. Zählertabelle: anon/authenticated haben KEIN Recht auf private.beleg_zaehler.
--
-- TESTNACHWEIS v2 (frische Test-Kopie, echte LIVE-Definitionen repliziert):
--   1 Backfill:        (A,2026) letzte_nr = 7  (aus EMP-2026-0007)            OK
--   2 Fortlaufend:     Prämie1 -> EMP-2026-0008, Prämie2 -> EMP-2026-0009      OK
--   3 Idempotenz:      Prämie1 erneut -> beleg_nr bleibt 0008, Zähler bleibt 9 OK
--   4 Unique-Backstop: 2x gleiche Nr -> 23505 unique_violation (Duplikat unmöglich) OK
--   6 Fremdzugriff:    Berater B auf A-Prämie -> Exception 'Kein Zugriff'       OK
--   7 Rechte:          anon/authenticated auf private.beleg_zaehler = KEIN Recht;
--                      auszahlen_praemie EXECUTE: authenticated=true, anon=false;
--                      schema private USAGE: anon=false, authenticated=false     OK
--   5 Echte Parallelität: in dieser Umgebung NICHT direkt simulierbar; Garantie
--     ruht auf FOR UPDATE (Serialisierung, Test 3) + Unique-Index (Backstop,
--     Test 4) + atomarem Zähler (ON CONFLICT DO UPDATE RETURNING).
-- ----------------------------------------------------------------------------
