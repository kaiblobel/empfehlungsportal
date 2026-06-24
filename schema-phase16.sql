-- Phase 16 · Auszahl-Workflow + Beleg
-- Erweitert praemien um Auszahl-Details + vergibt eine laufende Beleg-Nr beim Auszahlen.
-- Angewendet via Supabase MCP apply_migration (phase16_praemien_auszahlung_beleg).

alter table praemien
  add column if not exists betrag numeric,
  add column if not exists auszahlungsart text,        -- Ueberweisung|PayPal|Gutschein|Bar|Sachleistung|Spende
  add column if not exists empfaenger_adresse text,
  add column if not exists beleg_nr text;

-- Zahlt eine Praemie aus: Status + Details setzen, laufende Beleg-Nr (pro Berater/Jahr) vergeben.
create or replace function auszahlen_praemie(
  p_id uuid,
  p_betrag numeric,
  p_art text,
  p_variante text,
  p_adresse text,
  p_notiz text,
  p_datum date
) returns praemien
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row praemien;
  v_jahr text;
  v_nr int;
  v_beleg text;
begin
  select * into v_row from praemien where id = p_id;
  if not found then raise exception 'Praemie nicht gefunden'; end if;
  if not (v_row.berater_id = current_berater_id() or is_current_berater_admin()) then
    raise exception 'Kein Zugriff';
  end if;

  v_beleg := v_row.beleg_nr;
  if v_beleg is null then
    v_jahr := to_char(coalesce(p_datum, current_date), 'YYYY');
    select count(*) + 1 into v_nr
      from praemien
      where berater_id = v_row.berater_id and beleg_nr like 'EMP-' || v_jahr || '-%';
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
$$;
