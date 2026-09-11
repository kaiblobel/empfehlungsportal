// Einstiegsseite für Promoter: Team-Logo statt Initialen-Platzhalter (11.09.2026).
//
// Im Kopf stand ein Kreis mit den Initialen des Beraters (data-bb="initialen"),
// im Fuß nur Text. Kai wollte an beiden Stellen das Team-Wachsbleiche-Logo. Das
// Team-Logo passt für jeden Partner, Initialen zeigten nur ein Kürzel.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('promoter-start.html');
// Kommentare ausblenden: der erklärende Kommentar nennt die alte Regel beim Namen.
const css = read('css/promoter-start.css').replace(/\/\*[\s\S]*?\*\//g, '');

assert.doesNotMatch(html, /class="ps-mark" data-bb="initialen"/, 'Initialen-Platzhalter im Kopf ist zurück');
assert.match(html, /<img class="ps-mark ps-mark-logo" src="\/assets\/images\/team-wachsbleiche-marke-96\.webp"/);
assert.match(html, /class="ps-footer-marke"[\s\S]*?team-wachsbleiche-marke-160\.webp[\s\S]*?Deutsche Vermögensberatung/);

// Die alte Regel traf jedes letzte span im Fuß, auch das Namens-span im <strong>.
assert.doesNotMatch(css, /\.ps-footer span:last-child/, '"& Team" rutschte damit in eine eigene Zeile');
assert.match(css, /\.ps-footer > :last-child \{ display: flex/);
assert.match(css, /\.ps-footer-marke img \{[^}]*border-radius: 50%/);

for (const [datei, max] of [['team-wachsbleiche-marke-96.webp', 10], ['team-wachsbleiche-marke-160.webp', 20]]) {
  const kb = statSync(new URL(`../assets/images/${datei}`, import.meta.url)).size / 1024;
  assert.ok(kb > 1 && kb < max, `${datei}: ${kb.toFixed(1)} KB`);
}

console.log('promoter-start-logo: OK');
