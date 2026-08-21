-- =====================================================================
-- Phase 303 · Das Büro als eigener Datensatz
--
-- Warum: Gemeinsame Angaben stehen heute siebenfach einzeln in der
-- Beratertabelle. Alle sieben Berater tragen wörtlich dieselbe Anschrift
-- "An der Wachsbleiche 1a · 03046 Cottbus". Ein Büroumzug wäre sieben
-- Änderungen, und wer eine vergisst, hat eine falsche Adresse auf einer
-- Kundenseite stehen.
--
-- Diese Phase legt NUR die Tabelle, eine Zeile und die Verknüpfung an.
-- An den Kundenseiten ändert sich nichts: Erst Phase 304 lässt
-- get_berater_public fehlende Beraterangaben von hier erben.
--
-- Alle Werte sind belegt, nichts geraten. Was nicht belegt ist, bleibt
-- leer (siehe Kommentare am insert).
--
-- Idempotent. Die eine Zeile wird über die Bezeichnung erkannt und nicht
-- doppelt angelegt.
-- =====================================================================

create table if not exists public.buero (
  id                uuid primary key default gen_random_uuid(),
  bezeichnung       text not null,
  wortmarke         text,
  telefon           text,
  email             text,
  adresse           text,
  bookings_url      text,
  website_url       text,
  impressum_url     text,
  datenschutz_url   text,
  emblem_url        text,
  buero_foto_url    text,
  team_foto_url     text,
  buero_bildzeile   text,
  created_at        timestamptz default now()
);

comment on table public.buero is
  'Gemeinsame Angaben einer Regionaldirektion (Phase 303). Ab Phase 304 '
  'erben Kundenseiten von hier, wenn beim Berater ein Feld leer ist. '
  'ACHTUNG: telefon und impressum_url stehen hier, werden aber bewusst '
  'NICHT vererbt — Begründung in schema-phase304-vererbung.sql.';

create unique index if not exists buero_bezeichnung_uidx
  on public.buero (bezeichnung);

alter table public.berater
  add column if not exists buero_id uuid references public.buero(id);

comment on column public.berater.buero_id is
  'Zu welchem Büro gehört dieser Berater. Quelle für geerbte Angaben ab Phase 304.';

-- ---------------------------------------------------------------------
-- Zeilenschutz: lesen dürfen alle Angemeldeten, schreiben nur Admins.
-- KEINE anon-Regel — der öffentliche Weg läuft ab Phase 304 über
-- get_berater_public (SECURITY DEFINER), nicht über direkten Zugriff.
-- ---------------------------------------------------------------------
alter table public.buero enable row level security;

-- Supabase gibt einer neuen Tabelle von sich aus Rechte für anon. Der
-- Zeilenschutz filtert dann zwar alles weg, aber der anonyme Aufruf bekommt
-- eine leere Liste statt einer Abweisung. Bei public.berater ist das Leserecht
-- seit Phase 106 ganz entzogen; hier wird es genauso gehalten, damit eine
-- später versehentlich ergänzte Regel nichts freigeben kann.
revoke all on table public.buero from anon;

drop policy if exists "buero auth read"    on public.buero;
drop policy if exists "buero admin insert" on public.buero;
drop policy if exists "buero admin update" on public.buero;
drop policy if exists "buero admin delete" on public.buero;

create policy "buero auth read" on public.buero
  for select to authenticated using (true);

create policy "buero admin insert" on public.buero
  for insert to authenticated with check ((select public.is_current_berater_admin()));

create policy "buero admin update" on public.buero
  for update to authenticated
  using ((select public.is_current_berater_admin()))
  with check ((select public.is_current_berater_admin()));

create policy "buero admin delete" on public.buero
  for delete to authenticated using ((select public.is_current_berater_admin()));

-- ---------------------------------------------------------------------
-- Die eine Zeile. Jeder Wert hat eine Quelle:
--   bezeichnung, wortmarke, adresse → Branding.md (Büro- und Markenebene);
--     die Anschrift steht zusätzlich wörtlich in allen sieben Beraterzeilen
--   telefon        → Impressum team/reform2027/impressum/index.html:26
--   impressum_url,
--   datenschutz_url → dashboard/index.html:46-48 (Fußzeile der Anmeldeseite)
--   bookings_url   → Kais Beraterzeile, Kalender der Regionaldirektion
--   emblem_url     → dashboard/index.html:25-26 (Marke auf der Anmeldeseite)
--
-- BEWUSST LEER, weil nicht belegt — nicht raten, sondern nachtragen,
-- sobald es die Angabe wirklich gibt:
--   email           eine zentrale Büroadresse getrennt von kai.blobel@dvag.de
--   website_url     eine eigene Büro-Adresse im Netz
--   buero_foto_url  \
--   team_foto_url    > bei allen sieben Beratern ebenfalls leer
--   buero_bildzeile /
-- ---------------------------------------------------------------------
insert into public.buero (
  bezeichnung, wortmarke, telefon, adresse,
  bookings_url, impressum_url, datenschutz_url, emblem_url
) values (
  'Regionaldirektion Kai Blobel & Team',
  'Kai Blobel',
  '+49 355 49497303',
  'An der Wachsbleiche 1a · 03046 Cottbus',
  'https://outlook.office.com/book/RegionaldirektionKaiBlobel@dvag02.onmicrosoft.com/s/vIk8AVAbE0CCK6qZpumyTA2?ismsaljsauthenabled=true',
  'https://www.dvag.de/kai.blobel/impressum.html',
  'https://www.dvag.de/kai.blobel/datenschutz.html',
  '/assets/images/team-wachsbleiche-marke-96.webp'
)
on conflict (bezeichnung) do nothing;

-- Alle Berater, die noch keinem Büro zugeordnet sind, hängen an diese Zeile.
update public.berater b
   set buero_id = (select id from public.buero
                    where bezeichnung = 'Regionaldirektion Kai Blobel & Team')
 where b.buero_id is null;

-- ---------------------------------------------------------------------
-- KONTROLLE nach dem Einspielen:
--
--   select count(*) from public.buero;                          -- 1
--   select count(*) from public.berater where buero_id is null; -- 0
--
-- Und die Zählprobe, die sich NICHT ändern darf:
--   select count(*) from public.list_kidz_berater_public();     -- 10
--   select count(*) from public.get_berater_public('kai-blobel'); -- 1, 15 Spalten
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- ROLLBACK (in dieser Reihenfolge, sonst hält der Fremdschlüssel dagegen):
--
--   alter table public.berater drop column if exists buero_id;
--   drop table if exists public.buero;
-- ---------------------------------------------------------------------
