-- =====================================================================
-- Phase 314 · Anika Biebrach wieder in der KIDZ-Auswahl
--
-- Sie stand seit Phase 186 in der Tabelle und wurde in Phase 200 nur
-- stillgelegt, nicht geloescht. Genau dafuer war das gedacht: Der
-- Schluessel bleibt stabil, ihr alter Einladungslink und der QR-Code
-- gelten sofort wieder, bereits erfasste Anmeldungen bleiben zugeordnet.
--
-- Der Promoter-Code steht bewusst nicht in dieser Datei. Er existiert
-- unveraendert weiter; Codes sind Zugangsschluessel und gehoeren nicht
-- ins Repository.
-- =====================================================================

begin;

do $$
declare
  v_sven uuid;
  v_berater uuid;
  v_empfehler uuid;
begin
  select id into v_sven
    from public.berater
   where lower(slug) = 'sven-augustin'
     and ist_aktiv
   limit 1;

  if v_sven is null then
    raise exception 'KIDZ advisor Sven Augustin is missing';
  end if;

  select berater_id, empfehler_id into v_berater, v_empfehler
    from public.kidz_gewinnspiel_einladende
   where key = 'promoter-anika-bibrach';

  if v_berater is null then
    raise exception 'KIDZ promoter promoter-anika-bibrach is missing';
  end if;

  -- Ohne diese Pruefung koennten ihre Anmeldungen still im falschen
  -- Dashboard landen: Die Sichtbarkeit haengt allein an berater_id.
  if v_berater <> v_sven then
    raise exception 'KIDZ promoter promoter-anika-bibrach points to the wrong advisor';
  end if;

  update public.empfehler
     set name = 'Anika Biebrach'
   where id = v_empfehler
     and name is distinct from 'Anika Biebrach';

  update public.kidz_gewinnspiel_einladende
     set name = 'Anika Biebrach',
         ist_aktiv = true
   where key = 'promoter-anika-bibrach';
end;
$$;

commit;

-- Rauchtest nach dem Anwenden:
--   select key, name, ist_aktiv from public.kidz_gewinnspiel_einladende order by name;
--   -> vier aktive Promoter, Anika Biebrach zuerst
--   select count(*) from public.list_kidz_berater_public(); -- 10
