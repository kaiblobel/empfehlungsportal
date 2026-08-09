-- Phase 167: Potenzialbuch
--
-- Privater Arbeitsbereich fuer potenzielle Kontakte. Potenziale sind keine
-- Empfehlungen und beruehren weder Promoter, Praemien noch Portal-Kennzahlen.

create table if not exists public.potenziale (
  id uuid primary key default gen_random_uuid(),
  berater_id uuid not null references public.berater(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  telefon text,
  email text,
  ziel text not null default 'kunde' check (ziel in ('kunde', 'partner')),
  kreis text,
  status text not null default 'offen' check (status in (
    'offen', 'angesprochen', 'im_gespraech', 'termin', 'uebernommen', 'kein_interesse'
  )),
  notiz text,
  naechster_kontakt_am date,
  zuletzt_angesprochen_at timestamptz,
  cockpit_uebernommen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint potenziale_kontakt_laenge check (
    (telefon is null or char_length(telefon) <= 50)
    and (email is null or char_length(email) <= 254)
    and (kreis is null or char_length(kreis) <= 100)
    and (notiz is null or char_length(notiz) <= 4000)
  )
);

comment on table public.potenziale is
  'Privates Potenzialbuch je Berater. Keine Empfehlung, kein Promoter und keine Praemienquelle.';

create index if not exists potenziale_berater_status_idx
  on public.potenziale (berater_id, status, updated_at desc);
create index if not exists potenziale_berater_naechster_kontakt_idx
  on public.potenziale (berater_id, naechster_kontakt_am)
  where naechster_kontakt_am is not null;

alter table public.potenziale enable row level security;
alter table public.potenziale force row level security;

revoke all on table public.potenziale from public, anon, authenticated;
grant select, insert, update, delete on table public.potenziale to authenticated;

drop policy if exists "potenziale eigene lesen" on public.potenziale;
create policy "potenziale eigene lesen"
  on public.potenziale for select to authenticated
  using (berater_id = (select public.current_berater_id()));

drop policy if exists "potenziale eigene anlegen" on public.potenziale;
create policy "potenziale eigene anlegen"
  on public.potenziale for insert to authenticated
  with check (berater_id = (select public.current_berater_id()));

drop policy if exists "potenziale eigene aendern" on public.potenziale;
create policy "potenziale eigene aendern"
  on public.potenziale for update to authenticated
  using (berater_id = (select public.current_berater_id()))
  with check (berater_id = (select public.current_berater_id()));

drop policy if exists "potenziale eigene loeschen" on public.potenziale;
create policy "potenziale eigene loeschen"
  on public.potenziale for delete to authenticated
  using (berater_id = (select public.current_berater_id()));

create or replace function public.touch_potenziale_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists potenziale_touch_updated_at on public.potenziale;
create trigger potenziale_touch_updated_at
before update on public.potenziale
for each row execute function public.touch_potenziale_updated_at();
