-- Phase 319: Die Cockpit-Bruecke erkennt Berater an der festen Kennung
--
-- ANLASS (01.09.2026, gefunden beim ersten echten Durchklicken mit einem
-- zweiten Konto): `cockpit_empfehlungen` ordnete Berater ueber NAME ODER
-- E-MAIL zu. Im Cockpit wurde ein Testkonto angelegt, das Kais DVAG-Adresse
-- trug. Da diese Adresse im Portal Kais Beraterkonto ist, bekam das Testkonto
-- prompt Kais 12 Empfehlungen im Verlauf angezeigt.
--
-- Beim Namen war die Falle bereits abgesichert (das Cockpit prueft ueber
-- `ist_beratername_eindeutig`, ob der Name nur einmal vorkommt). Bei der
-- E-Mail-Adresse gab es keine solche Pruefung: sie galt als eindeutig, ist es
-- aber nur so lange, wie niemand zwei Cockpit-Konten mit derselben Adresse
-- fuehrt.
--
-- NEU: Zugeordnet wird ueber `berater.cockpit_advisor_id`. Die gibt es seit
-- Phase 299, sie ist die eigentliche Verbindung zwischen den beiden Systemen
-- und war an dieser Stelle nur nie benutzt worden. Gemessen am 01.09.2026:
-- 7 Berater, 7 verschiedene Kennungen, keiner ohne, alle 18 Empfehlungen
-- zuordenbar.
--
-- Merksatz: Eine Bruecke, die Menschen an Namen und Adressen erkennt,
-- verwechselt irgendwann zwei. Eine Kennung ist eindeutig oder gar nicht da.
--
-- Ohne Treffer gibt es nichts zurueck. Fail-closed, wie bisher auch bei
-- falschem Tor-Wort.

drop function if exists public.cockpit_empfehlungen(text, text, text);

create or replace function public.cockpit_empfehlungen(
  p_secret text,
  p_cockpit_advisor_id uuid
)
returns table (
  id uuid,
  empfehler_name text,
  empfaenger_name text,
  status text,
  created_at timestamp without time zone
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.cockpit_secret_ok(p_secret) then
    return;
  end if;

  if p_cockpit_advisor_id is null then
    return;
  end if;

  return query
    select e.id, e.empfehler_name, e.empfaenger_name, e.status, e.created_at
    from public.empfehlungen e
    join public.berater b on b.id = e.berater_id
    where b.cockpit_advisor_id = p_cockpit_advisor_id
    order by e.created_at desc
    limit 200;
end;
$function$;

comment on function public.cockpit_empfehlungen(text, uuid) is
  'Empfehlungen eines Beraters fuer den Cockpit-Verlauf. Zuordnung ueber die feste Kennung cockpit_advisor_id, nicht mehr ueber Name oder E-Mail (Phase 319, 01.09.2026).';
