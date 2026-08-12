-- Phase 211 · Neuigkeiten-Zähler im Menü
--
-- Bisher sah man erst beim Öffnen einer Seite, ob etwas passiert ist. Kommt
-- eine Empfehlung rein oder meldet sich jemand fürs Sommerfest an, gab es kein
-- Signal. Ab jetzt steht am Menüpunkt eine Zahl, wie man es von Outlook kennt.
--
-- Der Gelesen-Stand liegt in der Datenbank, nicht im Browser: Was am Rechner
-- gesehen wurde, ist auch auf dem Handy gesehen.
--
-- Zwei Regeln, die den Zähler brauchbar machen:
--   * Testdaten zählen nicht (Phase 208). Ein Probelauf ist keine Neuigkeit.
--   * Der Zähler zeigt, was auf der Zielseite auch zu finden ist: bei
--     Empfehlungen die eigenen, bei KIDZ die eigenen und beim Admin alle,
--     genau wie die Leseregeln dort.

create table if not exists public.gesehen_bis (
  berater_id uuid not null references public.berater(id) on delete cascade,
  bereich    text not null check (bereich in ('empfehlungen', 'kidz_gewinnspiel', 'kidz_elternabend')),
  gesehen_at timestamptz not null default now(),
  primary key (berater_id, bereich)
);

comment on table public.gesehen_bis is
  'Je Berater und Bereich der Zeitpunkt des letzten Blicks. Grundlage der Neuigkeiten-Zähler im Menü (Phase 211).';

alter table public.gesehen_bis enable row level security;

drop policy if exists "gesehen_bis eigene" on public.gesehen_bis;
create policy "gesehen_bis eigene" on public.gesehen_bis
  for all
  using (berater_id = public.current_berater_id())
  with check (berater_id = public.current_berater_id());

/* ------------------------------------------------------------------ *
 * Alle Zähler in einem Aufruf
 *
 * Einer statt drei: Das Menü wird bei jedem Seitenwechsel neu gebaut,
 * und es gibt siebzehn Seiten mit Menü.
 * ------------------------------------------------------------------ */

create or replace function public.neuigkeiten()
returns table(bereich text, anzahl integer)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_berater  uuid;
  v_ist_admin boolean;
begin
  v_berater := public.current_berater_id();
  if v_berater is null then
    return;
  end if;
  v_ist_admin := public.is_current_berater_admin();

  return query
  with stand as (
    select g.bereich, g.gesehen_at
      from public.gesehen_bis g
     where g.berater_id = v_berater
  )
  -- Empfehlungen: immer nur die eigenen. Wer noch nie hingesehen hat,
  -- bekommt 0 statt der ganzen Historie.
  select 'empfehlungen'::text,
         coalesce((
           select count(*)::int from public.empfehlungen e
            where e.berater_id = v_berater
              and not e.ist_test
              and e.created_at > (select s.gesehen_at from stand s where s.bereich = 'empfehlungen')
         ), 0)

  union all
  -- KIDZ: die eigenen, beim Admin alle. Dieselbe Sicht wie auf der Seite.
  select 'kidz_gewinnspiel'::text,
         coalesce((
           select count(*)::int from public.kidz_gewinnspiel_teilnahmen k
            where (k.berater_id = v_berater or v_ist_admin)
              and not k.ist_test
              and k.created_at > (select s.gesehen_at from stand s where s.bereich = 'kidz_gewinnspiel')
         ), 0)

  union all
  select 'kidz_elternabend'::text,
         coalesce((
           select count(*)::int from public.kidz_elternabend_anmeldungen a
            where (a.berater_id = v_berater or v_ist_admin)
              and not a.ist_test
              and a.created_at > (select s.gesehen_at from stand s where s.bereich = 'kidz_elternabend')
         ), 0);
end;
$function$;

comment on function public.neuigkeiten() is
  'Zählt je Bereich, was seit dem letzten Blick dazugekommen ist. Ohne Testdaten, in derselben Sicht wie die Zielseite.';

/* ------------------------------------------------------------------ *
 * Gesehen setzen
 * ------------------------------------------------------------------ */

create or replace function public.als_gesehen_markieren(p_bereich text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_berater uuid;
begin
  v_berater := public.current_berater_id();
  if v_berater is null then
    return;
  end if;

  if p_bereich not in ('empfehlungen', 'kidz_gewinnspiel', 'kidz_elternabend') then
    raise exception 'Unbekannter Bereich: %', p_bereich using errcode = '22023';
  end if;

  insert into public.gesehen_bis (berater_id, bereich, gesehen_at)
  values (v_berater, p_bereich, now())
  on conflict (berater_id, bereich)
    do update set gesehen_at = now();
end;
$function$;

comment on function public.als_gesehen_markieren(text) is
  'Setzt den Gelesen-Stand des angemeldeten Beraters für einen Bereich auf jetzt.';

/* ------------------------------------------------------------------ *
 * Rechte
 *
 * Lehre aus Phase 198: Supabase vergibt EXECUTE beim Anlegen automatisch
 * an anon; ein revoke from public entfernt das NICHT.
 * ------------------------------------------------------------------ */

revoke execute on function public.neuigkeiten() from anon, public;
revoke execute on function public.als_gesehen_markieren(text) from anon, public;

grant execute on function public.neuigkeiten() to authenticated;
grant execute on function public.als_gesehen_markieren(text) to authenticated;
