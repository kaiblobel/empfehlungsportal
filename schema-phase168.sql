-- Phase 168: Kontaktstaerke im privaten Potenzialbuch
--
-- Additive Erweiterung nur an public.potenziale. Bestehende Kontakte bleiben
-- erhalten. Empfehlungen, Promoter, Praemien und Kennzahlen werden nicht beruehrt.

alter table public.potenziale
  add column if not exists kreise text[] not null default '{}'::text[],
  add column if not exists beziehungsnaehe text not null default 'bekannt',
  add column if not exists kontakthaeufigkeit text not null default 'selten',
  add column if not exists direkt_erreichbar boolean not null default false,
  add column if not exists kontaktstaerke_override text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'potenziale_kreise_erlaubt') then
    alter table public.potenziale add constraint potenziale_kreise_erlaubt check (
      cardinality(kreise) <= 12
      and kreise <@ array[
        'familie','enger_freundeskreis','freunde','schulzeit','ausbildung_studium',
        'arbeit_aktuell','arbeit_frueher','nachbarschaft','verein_hobby','alltag',
        'fluechtige_bekanntschaft','sonstiges'
      ]::text[]
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'potenziale_beziehungsnaehe_erlaubt') then
    alter table public.potenziale add constraint potenziale_beziehungsnaehe_erlaubt
      check (beziehungsnaehe in ('fluechtig','bekannt','gut_bekannt','eng_vertraut'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'potenziale_kontakthaeufigkeit_erlaubt') then
    alter table public.potenziale add constraint potenziale_kontakthaeufigkeit_erlaubt
      check (kontakthaeufigkeit in ('kein_kontakt','selten','gelegentlich','regelmaessig'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'potenziale_kontaktstaerke_override_erlaubt') then
    alter table public.potenziale add constraint potenziale_kontaktstaerke_override_erlaubt
      check (kontaktstaerke_override is null or kontaktstaerke_override in ('kalt','lauwarm','warm','heiss','sehr_heiss'));
  end if;
end $$;

-- Bisherige freie Umfeld-Angaben werden, soweit eindeutig, einem Standardkreis
-- zugeordnet. Das freie Feld kreis bleibt unveraendert erhalten.
update public.potenziale
set kreise = case
  when lower(kreis) like '%famil%' then array['familie']
  when lower(kreis) like '%freund%' then array['freunde']
  when lower(kreis) like '%schul%' then array['schulzeit']
  when lower(kreis) like '%ausbild%' or lower(kreis) like '%stud%' then array['ausbildung_studium']
  when lower(kreis) like '%früh%' or lower(kreis) like '%frueh%' or lower(kreis) like '%ehemalig%' then array['arbeit_frueher']
  when lower(kreis) like '%kolleg%' or lower(kreis) like '%arbeit%' then array['arbeit_aktuell']
  when lower(kreis) like '%nachbar%' then array['nachbarschaft']
  when lower(kreis) like '%verein%' or lower(kreis) like '%sport%' or lower(kreis) like '%hobby%' then array['verein_hobby']
  when lower(kreis) like '%tank%' or lower(kreis) like '%alltag%' then array['alltag']
  when lower(kreis) like '%bekannt%' then array['fluechtige_bekanntschaft']
  else array['sonstiges']
end
where cardinality(kreise) = 0 and nullif(btrim(kreis), '') is not null;

create index if not exists potenziale_kreise_idx on public.potenziale using gin (kreise);

comment on column public.potenziale.kreise is 'Mehrfachauswahl der Beziehungskreise. Keine Empfehlungsquelle.';
comment on column public.potenziale.kontaktstaerke_override is 'Optionale manuelle Korrektur der im Browser berechneten Beziehungsstaerke.';

-- Projektweite Standardrechte koennen neue Tabellenrechte erweitern. Deshalb
-- bleibt die API-Rolle ausdruecklich auf die vier benoetigten CRUD-Rechte begrenzt.
revoke all on table public.potenziale from public, anon, authenticated;
grant select, insert, update, delete on table public.potenziale to authenticated;
