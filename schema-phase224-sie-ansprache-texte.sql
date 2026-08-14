-- Phase 224 · Sie-Ansprache für die Texte, die aus der Datenbank kommen
--
-- NICHT AUSGEFÜHRT. Bewusst.
--
-- Die Tabellen `vorlagen` und `belohnungs_stufen` liefern Text direkt auf die
-- öffentlichen Seiten (Themenkarten auf programm.html und im Empfehlungsformular,
-- die Belohnungsreise auf programm.html und im Empfehlungsbereich). Diese
-- Datenbank bedient die aktuell laufende Live-Seite mit. Wer das hier einspielt,
-- ändert die Live-Texte sofort, unabhängig davon, ob die neue Fassung des Codes
-- schon veröffentlicht ist.
--
-- Deshalb: erst die Vorschau freigeben, dann veröffentlichen, dann das hier
-- einspielen. Reihenfolge einhalten, sonst siezt der Code und die Datenbank duzt
-- weiter oder umgekehrt.
--
-- Vorher sichern:
--   SELECT slug, titel, headline, subtext FROM vorlagen;
--   SELECT stufe, titel, beschreibung FROM belohnungs_stufen;

BEGIN;

-- --- Themenwelten -----------------------------------------------------------

UPDATE vorlagen SET
  headline = 'Was liegt bei Ihnen gerade rum?',
  subtext  = 'Die meisten verschenken jeden Monat Geld, ohne es zu merken: bei Steuer, Förderung oder Verträgen, die längst besser gingen. In einem kurzen Gespräch finden wir, wo das bei Ihnen der Fall ist.'
WHERE slug = 'allgemein';

UPDATE vorlagen SET
  subtext = 'Ob Neubau, Kauf oder Anschlussfinanzierung: Eine Finanzierung begleitet Sie oft über Jahrzehnte. Gut, wenn vorher jemand mit Ihnen ruhig auf die ganze Laufzeit schaut, nicht nur auf den ersten Zins.'
WHERE slug = 'baufi';

UPDATE vorlagen SET
  headline = 'Rechnen Sie Ihre Förderung selbst nach.',
  subtext  = 'Riester, vermögenswirksame Leistungen, Arbeitnehmer-Sparzulage: Es gibt einige Töpfe vom Staat und vom Arbeitgeber. Welche davon für Sie infrage kommen, hängt von Ihrer Situation ab. Genau das schauen wir uns in Ruhe gemeinsam an.'
WHERE slug = 'foerderungen';

UPDATE vorlagen SET
  headline = 'Was Ihr Geld über die Jahre tun kann.',
  subtext  = 'Auf dem Konto verliert Ihr Geld still und leise an Kaufkraft. Sie müssen kein Finanzprofi sein, um das zu ändern. Wir schauen gemeinsam, was zu Ihrem Leben passt.'
WHERE slug = 'investment';

UPDATE vorlagen SET
  subtext = 'Eine berufliche Perspektive, die mehr Sinn, mehr Selbstbestimmung und finanzielle Freiheit bringt. Hier könnte Ihr Weg neu beginnen.'
WHERE slug = 'karriere';

UPDATE vorlagen SET
  titel    = 'Für Ihre Kinder',
  headline = 'Früh starten. Später danken sie es Ihnen.'
WHERE slug = 'kinder';

UPDATE vorlagen SET
  subtext = 'Als Selbständiger haben Sie keine automatische Absicherung. Wir bauen gemeinsam ein stabiles Fundament.'
WHERE slug = 'selbstaendige';

-- --- Belohnungsstufen -------------------------------------------------------

UPDATE belohnungs_stufen SET
  beschreibung = replace(beschreibung, 'Spende deiner Wahl', 'Spende Ihrer Wahl')
WHERE beschreibung LIKE '%Spende deiner Wahl%';

UPDATE belohnungs_stufen SET
  titel        = 'Restaurantbesuch Ihrer Wahl',
  beschreibung = 'Sie und eine Begleitperson genießen einen Restaurantbesuch nach Wahl.'
WHERE stufe = 2;

COMMIT;

-- Gegenprobe: muss danach 0 Zeilen liefern.
--
-- SELECT 'vorlagen' AS tabelle, slug AS schluessel FROM vorlagen
--  WHERE aktiv = true
--    AND (COALESCE(titel,'') || ' ' || COALESCE(headline,'') || ' ' || COALESCE(subtext,''))
--        ~* '\m(du|dich|dir|dein|deine|deinen|deinem|deiner|deines|euch|euer|eure)\M'
-- UNION ALL
-- SELECT 'belohnungs_stufen', stufe::text FROM belohnungs_stufen
--  WHERE (COALESCE(titel,'') || ' ' || COALESCE(beschreibung,''))
--        ~* '\m(du|dich|dir|dein|deine|deinen|deinem|deiner|deines|euch|euer|eure)\M';
