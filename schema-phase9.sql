-- ============================================================
-- Empfehlungsportal · Phase 9 · Erfolgsgeschichten (Empfänger-Seite)
-- ============================================================

create table if not exists erfolgsgeschichten (
  id uuid primary key default gen_random_uuid(),
  vorlage_slug text references vorlagen(slug),  -- NULL = für alle Themen
  titel text not null,
  vorher text not null,
  nachher text not null,
  key_metric text,
  sort_order int default 0,
  aktiv boolean default true,
  created_at timestamp default now()
);

alter table erfolgsgeschichten enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'erfolgsgeschichten public read' and tablename = 'erfolgsgeschichten') then
    create policy "erfolgsgeschichten public read" on erfolgsgeschichten for select using (aktiv = true);
  end if;
end $$;

-- 3 Platzhalter-Seeds (Kai ersetzt sie später mit echten Daten via Supabase-Dashboard)
insert into erfolgsgeschichten (vorlage_slug, titel, vorher, nachher, key_metric, sort_order)
values
(null, 'Familie mit zwei Kindern',
 'Riester-Zulagen wurden seit Jahren nicht beantragt.',
 'Volle staatliche Förderung jetzt aktiv — rückwirkend.',
 '+ 532 € pro Jahr', 1),
(null, 'Häuslebauer im Sauerland',
 'Anschlussfinanzierung zu Standard-Konditionen.',
 'Optimierte Struktur mit besserer Zinsbindung.',
 '~ 18.400 € weniger Zinslast', 2),
(null, 'Selbstständiger Berater',
 'Keine Altersvorsorge mit Steuerhebel.',
 'Basisrente mit voller Absetzbarkeit aufgesetzt.',
 '4.200 € Steuervorteil im ersten Jahr', 3)
on conflict do nothing;
