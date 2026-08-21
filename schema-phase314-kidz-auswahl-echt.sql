-- =====================================================================
-- Phase 314 - Anika Biebrach in der KIDZ-Auswahl, David Stamm entdoppelt
--
-- LIVE ANGEWENDET AM 21.08.2026 ALS phase_314_kidz_promoter_anlage
-- UND phase_314b_david_stamm_ist_berater.
--
-- Befund vom 21.08.2026: In der Datenbank standen nur zwei Promoter,
-- Anja Scholz und Sandra Roehrens. Anika Biebrach fehlte vollstaendig,
-- stand aber trotzdem nicht in der Auswahl, waehrend David Stamm dort
-- doppelt auftauchen konnte. Grund ist, dass die Seite die promoter-
-- Eintraege aus dem Markup zumischt, wenn die Datenbank sie nicht liefert.
-- Anika war nie angelegt: Die Anweisung aus Phase 186 war an einen bereits
-- vorhandenen empfehler-Datensatz gebunden, den es fuer sie nie gab, und
-- lief still ins Leere.
--
-- David Stamm braucht keine Promoter-Zeile. Er ist seit dem 12.08.2026
-- selbst Berater und steht damit ohnehin in der Auswahl. Eine zweite Zeile
-- haette ihn doppelt sichtbar gemacht und seine Anmeldungen einem anderen
-- Berater zugeordnet. Die im ersten Anlauf dieser Phase angelegten
-- Datensaetze wurden noch am selben Tag ungenutzt wieder entfernt.
--
-- Der Zugangscode wird erzeugt und steht bewusst NICHT in dieser Datei,
-- denn Codes sind Zugangsschluessel und gehoeren nicht ins Repository.
-- =====================================================================

begin;

insert into public.empfehler (code, name, berater_id)
select 'anika-biebrach-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 14),
       'Anika Biebrach', b.id
  from public.berater b
 where b.slug = 'sven-augustin'
   and not exists (
     select 1 from public.empfehler e
      where e.name = 'Anika Biebrach' and e.berater_id = b.id);

insert into public.kidz_gewinnspiel_einladende (key, name, berater_id, empfehler_id, ist_aktiv)
select 'promoter-anika-bibrach', 'Anika Biebrach', e.berater_id, e.id, true
  from public.empfehler e
 where e.name = 'Anika Biebrach'
   and e.berater_id = (select id from public.berater where slug = 'sven-augustin')
 limit 1
on conflict (key) do update
  set name = excluded.name,
      berater_id = excluded.berater_id,
      empfehler_id = excluded.empfehler_id,
      ist_aktiv = true;

-- David Stamm gehoert nur einmal in die Auswahl, naemlich als Berater.
-- Geloescht wird ausschliesslich eine Zeile ohne jede Verwendung.
delete from public.kidz_gewinnspiel_einladende
 where key = 'promoter-david-stamm'
   and not exists (
     select 1 from public.kidz_gewinnspiel_teilnahmen t
      where t.empfehler_id = kidz_gewinnspiel_einladende.empfehler_id)
   and not exists (
     select 1 from public.kidz_elternabend_anmeldungen a
      where a.empfehler_id = kidz_gewinnspiel_einladende.empfehler_id);

-- Nicht raten, sondern abbrechen. Die Sichtbarkeit einer Anmeldung haengt
-- allein an berater_id: Ein falscher Wert legt sie still im fremden
-- Dashboard ab, ohne dass es jemand merkt.
do $$
begin
  if not exists (
    select 1
      from public.kidz_gewinnspiel_einladende e
      join public.berater b on b.id = e.berater_id
     where e.key = 'promoter-anika-bibrach'
       and e.ist_aktiv
       and b.slug = 'sven-augustin') then
    raise exception 'promoter-anika-bibrach is missing or assigned to the wrong advisor';
  end if;

  if exists (select 1 from public.kidz_gewinnspiel_einladende where key = 'promoter-david-stamm') then
    raise exception 'promoter-david-stamm is still present';
  end if;
end;
$$;

commit;

-- Rauchtest nach dem Anwenden:
--   select name, slug from public.list_kidz_berater_public();
--   -> jeder Name genau einmal, Anika Biebrach als erster Promoter
--   select count(*) from public.list_kidz_berater_public(); -- 10
