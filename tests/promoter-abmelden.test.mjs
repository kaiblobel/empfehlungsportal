// Abmelden im Promoterbereich (Kais Wunsch vom 11.09.2026).
//
// Der Zugang eines Promoters ist ein Code, den der Browser speichert
// (empfehler_code). Vorher löschte ihn nichts: Wer einmal drin war, blieb auf
// dem Gerät für immer angemeldet, und ein zweiter Promoter kam dort nicht
// mehr hinein. Abmelden vergisst den Code und alles, was zu diesem Zugang auf
// dem Gerät liegt, und führt zur Anmeldung per Einmal-Link.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('empfehler.html');
const js = read('js/empfehler-mobile.js');
const start = read('js/promoter-start.js');

// Der Knopf ist sichtbar, nicht in den zugeklappten Einstellungen versteckt.
assert.match(html, /<footer class="footer">[\s\S]*id="logoutButton"[\s\S]*<\/footer>/, 'Abmelden gehört sichtbar in den Fuß');

// Er vergisst den Code und alle Einträge, die den Code im Namen tragen.
assert.match(js, /function abmelden\(\)/);
assert.match(js, /\$\('#logoutButton'\)\?\.addEventListener\('click', abmelden\)/);
assert.match(js, /key === 'empfehler_code'/);
assert.match(js, /key\.includes\(code\)/);

// Er ersetzt den Verlaufseintrag, damit "Zurück" nicht in den Bereich führt,
// und landet auf der Anmeldung.
assert.match(js, /location\.replace\(/);
assert.match(js, /#vorhandener-bereich|hash = 'vorhandener-bereich'/);

// Die Einstiegsseite öffnet dann gleich das Fenster für den Einmal-Link.
assert.match(start, /window\.location\.hash === '#vorhandener-bereich' && !existingCode/);

// Funktionsprobe der Aufräumregel mit einem nachgebauten Speicher.
const speicher = new Map([
  ['empfehler_code', 'abc-123'],
  ['empfehler_mobile_draft_abc-123', '{}'],
  ['bb_berater_v4_code_abc-123', '{}'],
  ['empfehler_mobile_draft_anderer', '{}'],
  ['bb_berater_v4_me', '{}'],
]);
const regel = js.match(/const gehoertZumZugang = \(key\) => ([^;]+);/);
assert.ok(regel, 'Aufräumregel gehoertZumZugang nicht gefunden');
// eslint-disable-next-line no-new-func
const trifft = new Function('key', 'code', `return ${regel[1]};`);
const weg = [...speicher.keys()].filter((key) => trifft(key, 'abc-123'));
assert.deepEqual(weg.sort(), ['bb_berater_v4_code_abc-123', 'empfehler_code', 'empfehler_mobile_draft_abc-123'].sort());

console.log('promoter-abmelden: OK');
