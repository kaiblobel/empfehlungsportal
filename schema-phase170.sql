-- Phase 170: Kontakt-Coach im privaten Potenzialbuch
--
-- Nur vom Berater bestaetigte Inhalte werden gespeichert. Sprachaufnahmen und
-- Rohtranskripte gehoeren ausdruecklich nicht in die Datenbank.

alter table public.potenziale
  add column if not exists kontaktbild jsonb not null default '{}'::jsonb,
  add column if not exists kontaktbild_aktualisiert_at timestamptz,
  add column if not exists gespraechsvorbereitung jsonb not null default '{}'::jsonb,
  add column if not exists gespraechsvorbereitung_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'potenziale_kontaktbild_objekt') then
    alter table public.potenziale add constraint potenziale_kontaktbild_objekt check (
      jsonb_typeof(kontaktbild) = 'object' and pg_column_size(kontaktbild) <= 32768
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'potenziale_gespraechsvorbereitung_objekt') then
    alter table public.potenziale add constraint potenziale_gespraechsvorbereitung_objekt check (
      jsonb_typeof(gespraechsvorbereitung) = 'object'
      and pg_column_size(gespraechsvorbereitung) <= 32768
    );
  end if;
end $$;

comment on column public.potenziale.kontaktbild is
  'Vom Berater geprueftes Kontaktbild. Fakten, Vermutungen und Unsicherheiten bleiben getrennt.';
comment on column public.potenziale.gespraechsvorbereitung is
  'Vom Berater erzeugter Gespraechskompass. Kein Kundenstatus und keine Empfehlung.';

-- RLS und FORCE RLS aus Phase 167 bleiben unveraendert. Explizite Rechte
-- verhindern, dass neue Standardrechte den privaten Bereich oeffnen.
alter table public.potenziale enable row level security;
alter table public.potenziale force row level security;
revoke all on table public.potenziale from public, anon, authenticated;
grant select, insert, update, delete on table public.potenziale to authenticated;
