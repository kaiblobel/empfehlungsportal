-- Phase 342 · Die Hausschrift DVAG-Type nur fuer angemeldete Berater (10.09.2026)
--
-- Die Schriftdateien sind lizenziertes Firmenmaterial. Dieses Repo ist oeffentlich,
-- deshalb liegen sie nicht im Projekt, sondern gesperrt in dieser Tabelle. Abrufbar
-- nur ueber hausschrift_datei(), und nur, wenn die Anmeldung zu einem Berater
-- gehoert (current_berater_id). Gelesen von js/hausschrift.js.
--
-- DIE DATEN STEHEN NICHT HIER. Die drei Schnitte (lt, rg, bd) wurden am 10.09.2026
-- einmalig eingespielt, Quelle: kds/referenz/dvag-design-system/assets/fonts.
-- Nach einer Wiederherstellung neu einspielen; die Pruefsumme steht in der Spalte
-- sha256. Fehlt die Schrift, laeuft die Seite in Inter weiter, ohne Fehler.
--
-- Live angewendet als Migration phase342_hausschrift.

create table if not exists public.hausschrift (
  datei text primary key
    check (datei in ('dvagtype_lt.woff2', 'dvagtype_rg.woff2', 'dvagtype_bd.woff2')),
  inhalt bytea not null,
  sha256 text not null,
  eingespielt_am timestamptz not null default now()
);

alter table public.hausschrift enable row level security;
-- Keine Leseregel: direkter Zugriff ist fuer niemanden vorgesehen.
revoke all on table public.hausschrift from public, anon, authenticated;

create or replace function public.hausschrift_datei(p_datei text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select encode(h.inhalt, 'base64')
  from public.hausschrift h
  where h.datei = p_datei
    and public.current_berater_id() is not null;
$$;

revoke all on function public.hausschrift_datei(text) from public, anon;
grant execute on function public.hausschrift_datei(text) to authenticated;

comment on table public.hausschrift is
  'Phase 342: Hausschrift DVAG-Type (lizenziert). Nur ueber hausschrift_datei() fuer Berater. Quelle der Dateien: kds/referenz/dvag-design-system/assets/fonts.';
