-- ============================================================
-- Empfehlungsportal · Phase 6 · Themen-Vorlagen
-- ============================================================

-- 1. Tabelle vorlagen
create table if not exists vorlagen (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titel text not null,
  icon text,
  headline text not null,
  subtext text not null,
  hero_bild_url text,
  quickcheck_url text default 'https://finanzcheck.kaiblobel.de/',
  vorteil_1_titel text, vorteil_1_text text,
  vorteil_2_titel text, vorteil_2_text text,
  vorteil_3_titel text, vorteil_3_text text,
  cta_text text default 'Mein Potenzial jetzt checken →',
  aktiv boolean default true,
  sort_order integer default 0,
  created_at timestamp default now()
);

-- 2. RLS: öffentlich lesbar (nur aktive)
alter table vorlagen enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'vorlagen public read' and tablename = 'vorlagen') then
    create policy "vorlagen public read" on vorlagen for select using (aktiv = true);
  end if;
end $$;

-- 3. Spalte vorlage_slug in empfehlungen
alter table empfehlungen add column if not exists vorlage_slug text default 'allgemein';

-- 4. RPC erweitern: get_empfehlung_public liefert jetzt auch vorlage_slug
drop function if exists get_empfehlung_public(text);

create or replace function get_empfehlung_public(p_token text)
returns table (
  id uuid, empfaenger_name text, berater_id uuid, typ text,
  empfehler_name text, empfehler_nachricht text, anrufwunsch text,
  vorlage_slug text
)
language sql security definer set search_path = public, pg_temp
as $$
  select id, empfaenger_name, berater_id, typ,
         empfehler_name, empfehler_nachricht, anrufwunsch, vorlage_slug
  from empfehlungen where link_token = p_token limit 1;
$$;

grant execute on function get_empfehlung_public(text) to anon;

-- 5. Seed: 6 Standard-Vorlagen
insert into vorlagen
(slug, titel, icon, headline, subtext, hero_bild_url, quickcheck_url,
 vorteil_1_titel, vorteil_1_text,
 vorteil_2_titel, vorteil_2_text,
 vorteil_3_titel, vorteil_3_text,
 cta_text, sort_order)
values
('allgemein', 'Allgemein', '🎯',
 'Deine finanzielle Situation. Klar gemacht.',
 'In einem offenen Gespräch schauen wir gemeinsam, was in deiner Situation möglich ist. Ohne Druck, ohne Verpflichtung.',
 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
 'https://finanzcheck.kaiblobel.de/',
 'Keine Kaltakquise', 'Du wurdest empfohlen — jemand dem du vertraust, hat bewusst an dich gedacht.',
 'Konkrete Zahlen',   'Kein allgemeines Gespräch. Wir schauen was in deiner Situation wirklich möglich ist.',
 'Du entscheidest',   'Kein Druck, keine Verpflichtung. Du bestimmst ob und wie es weitergeht.',
 'Mein Potenzial jetzt checken →', 0),

('baufi', 'Baufinanzierung', '🏠',
 'Dein Weg zum Eigenheim. Sicher finanziert.',
 'Ob Neubau, Kauf oder Anschlussfinanzierung — wir finden gemeinsam die optimale Strategie für dein Vorhaben.',
 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
 'https://baufi.kaiblobel.de/',
 'Beste Konditionen',     'Zugang zu über 400 Bankpartnern — wir finden die optimale Finanzierung für dich.',
 'Komplette Begleitung',  'Von der ersten Idee bis zur Schlüsselübergabe. Wir begleiten jeden Schritt.',
 'Keine versteckten Kosten', 'Transparente Beratung ohne Überraschungen. Du weißt immer wo du stehst.',
 'Meine Baufi-Möglichkeiten prüfen →', 1),

('foerderungen', 'Staatliche Förderungen', '💶',
 'Förderungen die dir zustehen. Endlich genutzt.',
 'Viele Menschen verschenken Jahr für Jahr hunderte Euro an staatlichen Zulagen. Wir holen das gemeinsam zurück.',
 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
 'https://finanzcheck.kaiblobel.de/',
 'Riester & VWL',         'Staatliche Zulagen die viele Jahr für Jahr ungenutzt lassen. Wir ändern das.',
 'Arbeitgeberzuschüsse',  'Geld das dir dein Arbeitgeber zahlen würde — wenn du es beantragst.',
 'Sofort wirksam',        'Die meisten Förderungen lassen sich rückwirkend noch für dieses Jahr sichern.',
 'Meine Förderungen berechnen →', 2),

('selbstaendige', 'Selbständige', '💼',
 'Selbständig. Abgesichert. Vorgesorgt.',
 'Als Selbständiger hast du keine automatische Absicherung. Wir bauen gemeinsam ein stabiles Fundament.',
 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80',
 'https://finanzcheck.kaiblobel.de/',
 'Basisrente',         'Bis zu 100% der Beiträge steuerlich absetzen — der größte Hebel für Selbständige.',
 'Berufsunfähigkeit',  'Dein wichtigstes Kapital bist du selbst. Wir sichern deine Arbeitskraft ab.',
 'Liquidität erhalten', 'Vorsorge die zu deinen Cashflows passt — flexibel und planbar.',
 'Meine Situation als Selbständiger prüfen →', 3),

('investment', 'Geldanlage & Investment', '📈',
 'Dein Geld arbeitet. Oder es sollte.',
 'Sparbuch und Tagesgeld verlieren real an Wert. Wir bauen gemeinsam eine Strategie die wirklich wächst.',
 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
 'https://finanzcheck.kaiblobel.de/',
 'Staatlich gefördert', 'Investments mit Steuervorteilen und Förderungen — mehr Rendite durch smarte Struktur.',
 'Langfristig denken',  'Vermögensaufbau der zu deinem Leben passt — nicht zu einem Produkt.',
 'Risiko verstehen',    'Wir erklären was wirklich Risiko bedeutet — und was nicht. Auf Augenhöhe.',
 'Meine Anlagemöglichkeiten prüfen →', 4),

('absicherung', 'Absicherung & Familie', '🛡️',
 'Was wirklich wichtig ist. Abgesichert.',
 'Familie, Gesundheit, Arbeitskraft — wir schauen gemeinsam was wirklich geschützt sein muss und was nicht.',
 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
 'https://finanzcheck.kaiblobel.de/',
 'Berufsunfähigkeit', 'Die wichtigste Versicherung die die meisten nicht haben. Wir klären ob du sie brauchst.',
 'Familie absichern', 'Was passiert mit deiner Familie wenn du ausfällst? Wir geben Antworten.',
 'Nur was nötig ist', 'Keine Überversicherung. Wir streichen was unnötig ist und sichern was wirklich zählt.',
 'Meine Absicherung prüfen →', 5)
on conflict (slug) do nothing;
