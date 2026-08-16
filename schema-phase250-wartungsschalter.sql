-- Phase 250 · Wartungsschalter für den Partnerbereich
-- Angewendet am 16.08.2026 auf kkseqhmfubzfyloffkwe.
--
-- Genau eine Zeile. Der Schalter steuert nur den eingeloggten Beraterbereich
-- (Hub, Dashboard, Team, Prämien, Vorlagen, Beraterkonten). Kundenseiten,
-- Empfehlungslinks, Promoterbereich, KIDZ und die Baufinanzierung laufen
-- unabhängig davon weiter.
--
-- Umgelegt wird in dashboard/settings.html, gelesen von js/wartung.js.

create table if not exists public.portal_wartung (
  id            boolean primary key default true,
  aktiv         boolean not null default false,
  titel         text not null default 'Wir bauen gerade am Portal',
  text          text not null default 'Am Empfehlungsportal wird gerade gearbeitet. Deine Empfehlungslinks laufen normal weiter, nur der Beraterbereich ist kurz zu. Melde dich später noch einmal an.',
  seit          timestamptz,
  geaendert_von uuid references public.berater(id) on delete set null,
  geaendert_am  timestamptz not null default now(),
  constraint portal_wartung_nur_eine_zeile check (id)
);

comment on table public.portal_wartung is
  'Einzeiliger Wartungsschalter für den Beraterbereich (Phase 250). Nur Admins schalten, alle lesen. Kundenseiten sind nicht betroffen.';

insert into public.portal_wartung (id) values (true) on conflict (id) do nothing;

alter table public.portal_wartung enable row level security;

-- Lesen muss jeder dürfen, auch ohne Anmeldung: der Wartungsschirm wird
-- eingeblendet, bevor eine Sitzung feststeht.
drop policy if exists "wartung public read" on public.portal_wartung;
create policy "wartung public read"
  on public.portal_wartung for select
  to public
  using (true);

-- Umlegen darf nur ein Admin.
drop policy if exists "wartung admin update" on public.portal_wartung;
create policy "wartung admin update"
  on public.portal_wartung for update
  to authenticated
  using (is_current_berater_admin())
  with check (is_current_berater_admin());
