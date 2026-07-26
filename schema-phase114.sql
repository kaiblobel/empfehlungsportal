-- ============================================================================
-- schema-phase114.sql · Phase 114 · Belegnummern kollisionssicher vergeben
--          (Sicherheits-/Integritäts-Befund 6)
-- ----------------------------------------------------------------------------
-- STATUS: LIVE angewandt am 2026-07-26 (Supabase-Migration
--         "phase114_belegnummer_atomar"). Version v1.141.
--
-- PROBLEM
--   auszahlen_praemie() vergab die Belegnummer per `count(*)+1`; zwei gleich-
--   zeitige Auszahlungen konnten dieselbe Nummer erhalten, es fehlte eine
--   Eindeutigkeitsregel und eine Zeilensperre.
--
-- LÖSUNG
--   * Atomarer Nummernzähler pro Berater + Jahr (Tabelle im private-Schema).
--   * Zähler wird per UPSERT in EINEM Vorgang gesperrt und erhöht.
--   * Eindeutigkeitsregel auf (berater_id, beleg_nr).
--   * Prämienzeile beim Auszahlen mit FOR UPDATE gesperrt.
--   * Bestehende Belegnummern bleiben unverändert (Backfill liest sie nur).
-- ============================================================================

-- 1) Zähler-Tabelle im PRIVATE-Schema (nicht über die API erreichbar)
create schema if not exists private;
create table if not exists private.beleg_zaehler (
  berater_id uuid not null references public.berater(id) on delete cascade,
  jahr int not null,
  letzte_nr int not null default 0,
  primary key (berater_id, jahr)
);
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
  on public.praemien (berater_id, beleg_nr) where beleg_nr is not null;

-- 4) auszahlen_praemie: Zeilensperre (FOR UPDATE) + atomarer Zähler aus private
create or replace function public.auszahlen_praemie(
  p_id uuid, p_betrag numeric, p_art text, p_variante text,
  p_adresse text, p_notiz text, p_datum date)
returns public.praemien
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_row public.praemien;
  v_jahr int;
  v_nr int;
  v_beleg text;
begin
  select * into v_row from praemien where id = p_id for update;
  if not found then raise exception 'Praemie nicht gefunden'; end if;
  if not (v_row.berater_id = current_berater_id() or is_current_berater_admin()) then
    raise exception 'Kein Zugriff';
  end if;
  v_beleg := v_row.beleg_nr;
  if v_beleg is null then
    v_jahr := extract(year from coalesce(p_datum, current_date))::int;
    insert into private.beleg_zaehler (berater_id, jahr, letzte_nr)
      values (v_row.berater_id, v_jahr, 1)
    on conflict (berater_id, jahr)
      do update set letzte_nr = private.beleg_zaehler.letzte_nr + 1
    returning letzte_nr into v_nr;
    v_beleg := 'EMP-' || v_jahr || '-' || lpad(v_nr::text, 4, '0');
  end if;
  update praemien set
    status = 'ausgezahlt', betrag = p_betrag, auszahlungsart = p_art,
    variante = coalesce(nullif(p_variante,''), variante),
    empfaenger_adresse = nullif(p_adresse,''),
    notiz = coalesce(nullif(p_notiz,''), notiz),
    ausgezahlt_at = coalesce(p_datum::timestamp, now()), beleg_nr = v_beleg
  where id = p_id returning * into v_row;
  return v_row;
end;
$function$;

-- 5) Ausführungsrecht ausdrücklich setzen (Funktion war NIE PUBLIC/anon).
grant execute on function public.auszahlen_praemie(uuid, numeric, text, text, text, text, date) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- LIVE-VERIFIKATION (2026-07-26, Funktionstests in zurückgerollten Transaktionen):
--   Altbestand unverändert (4 Prämien); Backfill-Zähler 2026->1.
--   Fortlaufend/eindeutig: EMP-2026-0001, EMP-2026-0002.
--   Idempotenz: erneute Auszahlung derselben Prämie -> gleiche Nummer.
--   Fremdzugriff: fremder Berater -> 'Kein Zugriff'.
--   Rechte: anon EXECUTE=nein, authenticated/service_role=ja;
--           private.beleg_zaehler für anon/authenticated NICHT zugänglich.
--   Keine Testreste; keine externen Benachrichtigungen ausgelöst.
--
-- RÜCKBAU:
--   * auszahlen_praemie() aus schema-phase16 (count(*)+1) wiederherstellen;
--     Grant to authenticated, service_role (NIE PUBLIC/anon).
--   * drop index if exists public.praemien_berater_beleg_uidx;
--   * drop table if exists private.beleg_zaehler;
--   (Bestehende beleg_nr bleiben unverändert.)
-- ============================================================================
