// Der Abschnitt „Empfehlen gehört zum Alltag" und die fünf Einstiegswege.
//
// Drei Dinge sind hier schon einmal schiefgegangen und werden deshalb
// festgehalten:
//
//  1. Der Titel auf der dunklen Themenkachel war unsichtbar. Nicht weil die
//     Farbe fehlte, sondern weil die allgemeine Regel im Stylesheet hinter der
//     Sonderregel stand: gleiche Spezifität, und die spätere gewinnt. Auf der
//     Ink-Fläche stand damit wieder Ink.
//  2. Der Moosschriftzug an der Bürowand war oben angeschnitten, weil das Bild
//     auf eine feste Höhe gestellt war.
//  3. Die fünf Wege sind dieselben Stellen wie auf der Karriereseite. Wer sie
//     hier anders beschreibt, erzeugt zwei Fassungen derselben Sache.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css] = await Promise.all([
  read('programm.html'),
  read('css/praesentation.css'),
]);

// --- 1) Reihenfolge im Stylesheet: erst die Grundform, dann die Sonderfälle ---
const basis = css.indexOf('.thema-kachel strong{');
const ink = css.indexOf('.thema-kachel-ink strong{');
assert.ok(basis > -1 && ink > -1, 'die beiden Regeln für den Kacheltitel fehlen');
assert.ok(
  basis < ink,
  'Die allgemeine Regel .thema-kachel strong steht hinter .thema-kachel-ink strong. '
    + 'Beide sind gleich spezifisch, also gewinnt die spätere — und der Titel auf der '
    + 'dunklen Kachel bekommt wieder Ink auf Ink.',
);
assert.match(css, /\.thema-kachel-ink strong\{color:#fff;\}/);

// --- 2) Das Teambild behält sein Seitenverhältnis ---
assert.match(html, /team-wand-schriftzug\.webp|team-wand-schriftzug\.jpg/,
  'das auf den Schriftzug zugeschnittene Bild fehlt');
assert.match(css, /\.alltag-weg-bild\{[^}]*aspect-ratio:/,
  'ohne Seitenverhältnis wird der Schriftzug wieder angeschnitten');
assert.doesNotMatch(css, /\.alltag-weg-bild\{[^}]*height:\d+px/,
  'eine feste Bildhöhe schneidet den Schriftzug oben ab');

// --- 3) Die fünf Wege, mit denselben Sätzen wie auf der Karriereseite ---
const WEGE = [
  ['finanzcoach', 'Finanzcoach', 'Quereinstieg mit Begleitung und unternehmerischer Perspektive.'],
  ['finanzspezialist', 'Finanzspezialist:in', 'Fachkarriere in Festanstellung mit klarer Spezialisierung.'],
  ['ausbildung', 'Ausbildung', 'Anerkannter IHK-Beruf und drei Jahre vollständig begleitet.'],
  ['nebenberuf', 'Nebenberuflicher Einstieg', 'Erst ausprobieren, dann bewusst über den nächsten Schritt entscheiden.'],
  ['backoffice', 'Backoffice', 'Organisation, Prozesse und Kundenservice zuverlässig steuern.'],
];
const auf = html.match(/<div class="wege-auf"[\s\S]*?\n        <\/div>/);
assert.ok(auf, 'der Aufklappbereich mit den fünf Wegen fehlt');
for (const [datei, name, satz] of WEGE) {
  assert.match(auf[0], new RegExp(`wege-icons/${datei}\\.svg`), `Symbol für ${name} fehlt`);
  assert.match(auf[0], new RegExp(`<strong>${name}</strong>`), `${name} fehlt`);
  assert.ok(auf[0].includes(satz), `der Satz zu ${name} weicht von der Karriereseite ab`);
}

// --- Er liegt unter beiden Karten, nicht in der schmalen rechten Spalte ---
assert.match(css, /\.wege-auf\{[\s\S]*?grid-column:1 \/ -1;/);
assert.match(html, /<div class="wege-auf" id="alltagDetails" hidden>/,
  'zugeklappt starten, sonst steht die Liste im Termin schon offen da');

// --- Die dunkle Karte trägt ein Bild, damit sie nicht als leere Fläche steht ---
assert.match(css, /\.alltag-karte-kern\{[\s\S]*?url\('\/assets\/images\//);

console.log('praesentation-alltag-wege: OK');
