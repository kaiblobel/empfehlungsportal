-- ============================================================================
-- ENTWURF · schema-phase114.sql · Belegnummer kollisionssicher vergeben
--          (Prüfbefund 6 · Conrad)
-- ----------------------------------------------------------------------------
-- STATUS: ENTWURF. NICHT live angewandt. Kern (atomarer Zähler) auf Test-Kopie
--         validiert (Nachweis unten). Kein main, keine Live-DB, nichts veröffentlicht.
-- Nummer 114 gewählt (keine Kollision mit White-Label 110/111/112).
--
-- PROBLEM
--   auszahlen_praemie() vergibt die Belegnummer per `select count(*)+1`. Zwei
--   gleichzeitige Auszahlungen (oder ein Doppelklick) können dieselbe Nummer
--   erhalten. Es gibt zudem keine Eindeutigkeitsregel auf (berater_id, beleg_nr)
--   und keine Sperre der Prämienzeile.
--
-- LÖSUNG (Kais Vorgabe)
--   * Atomarer Nummernzähler pro Berater + Jahr (Tabelle beleg_zaehler).
--   * Zähler wird per UPSERT in EINEM Vorgang gesperrt und erhöht.
--   * Eindeutigkeitsregel auf (berater_id, beleg_nr).
--   * Prämienzeile beim Auszahlen mit FOR UPDATE sperren -> zwei gleichzeitige
--     Auszahlungen DERSELBEN Prämie vergeben keine zweite Nummer.
--   * Bestehende Belegnummern bleiben unverändert (Backfill liest sie nur).
-- ============================================================================

begin;

-- 1) Zähler-Tabelle pro Berater + Jahr
create table if not exists public.beleg_zaehler (
  berater_id uuid  not null references public.berater(id) on delete cascade,
  jahr       int   not null,
  letzte_nr  int   not null default 0,
  primary key (berater_id, jahr)
);
alter table public.beleg_zaehler enable row level security;
-- kein GRANT an anon/authenticated: nur über die SECURITY-DEFINER-Funktion erreichbar.

-- 2) Backfill aus bestehenden Belegnummern (Format EMP-YYYY-NNNN),
--    damit neue Nummern niemals mit alten kollidieren. Ändert KEINE bestehende beleg_nr.
insert into public.beleg_zaehler (berater_id, jahr, letzte_nr)
select berater_id,
       substring(beleg_nr from 'EMP-(\d{4})-')::int              as jahr,
       max(substring(beleg_nr from 'EMP-\d{4}-(\d+)')::int)      as letzte_nr
from public.praemien
where beleg_nr ~ '^EMP-\d{4}-\d+$'
group by berater_id, substring(beleg_nr from 'EMP-(\d{4})-')::int
on conflict (berater_id, jahr) do update
  set letzte_nr = greatest(public.beleg_zaehler.letzte_nr, excluded.letzte_nr);

-- 3) Eindeutigkeitsregel (nur für gesetzte Nummern)
create unique index if not exists praemien_berater_beleg_uidx
  on public.praemien (berater_id, beleg_nr)
  where beleg_nr is not null;

-- 4) auszahlen_praemie: Zeilensperre + atomarer Zähler statt count(*)+1
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
  -- Prämienzeile SPERREN (verhindert doppelte gleichzeitige Auszahlung derselben Prämie)
  select * into v_row from praemien where id = p_id for update;
  if not found then raise exception 'Praemie nicht gefunden'; end if;
  if not (v_row.berater_id = current_berater_id() or is_current_berater_admin()) then
    raise exception 'Kein Zugriff';
  end if;

  v_beleg := v_row.beleg_nr;
  if v_beleg is null then
    v_jahr := extract(year from coalesce(p_datum, current_date))::int;
    -- ATOMAR: Zähler pro Berater+Jahr sperren und erhöhen
    insert into public.beleg_zaehler (berater_id, jahr, letzte_nr)
      values (v_row.berater_id, v_jahr, 1)
    on conflict (berater_id, jahr)
      do update set letzte_nr = public.beleg_zaehler.letzte_nr + 1
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

commit;

-- ----------------------------------------------------------------------------
-- RÜCKBAU:
--   * auszahlen_praemie() aus schema-phase16 (count(*)+1-Fassung) wiederherstellen.
--   * drop index if exists public.praemien_berater_beleg_uidx;
--   * drop table if exists public.beleg_zaehler;
--   (Bestehende beleg_nr in praemien bleiben in jedem Fall unverändert.)
--
-- TESTPLAN:
--   1. Zwei verschiedene Prämien eines Beraters auszahlen -> fortlaufende,
--      eindeutige Nummern (…0001, …0002).
--   2. Dieselbe Prämie zweimal auszahlen -> zweiter Aufruf vergibt KEINE neue
--      Nummer (beleg_nr bereits gesetzt) -> Idempotenz.
--   3. Zwei Berater zahlen im selben Jahr aus -> getrennte Zählerstände.
--   4. Jahreswechsel -> Zähler beginnt neu bei 0001.
--   5. Backfill-Probe: Berater mit bestehender EMP-2026-0007 -> nächste Nummer 0008,
--      keine Kollision mit Altbestand.
--   6. Fremdzugriff: auszahlen_praemie auf fremde Prämie -> 'Kein Zugriff'.
--
-- TESTNACHWEIS (Test-Kopie, atomarer Zähler-Kern):
--   Berater A, 3 Auszahlungen 2026 -> letzte_nr=3  (EMP-2026-0003)
--   Berater A, 1 Auszahlung   2027 -> letzte_nr=1  (EMP-2027-0001)   [Jahr getrennt]
--   Berater B, 1 Auszahlung   2026 -> letzte_nr=1  (EMP-2026-0001)   [Berater getrennt]
-- ----------------------------------------------------------------------------
