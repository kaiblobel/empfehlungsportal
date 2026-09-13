/**
 * Sommerfest auf der KIDZ-Elternseite.
 *
 * Bis 06.09.2026 stand hier der Termin, damit Eltern, die direkt auf /kidz/konzept landen, das Fest
 * nicht verpassen. Seit 13.09.2026 (Kais Wunsch) ist es ein Rückblick: Das Fest bleibt als Beleg sichtbar,
 * dass KIDZ echte Familien zusammenbringt, lädt aber nicht mehr zu Termin oder Gewinnspiel ein.
 */

import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css] = await Promise.all([
  read('kidz-konzept.html'),
  read('css/kidz-konzept.css'),
]);

/* --- Der Abschnitt ist da und steht vor dem Konzepttext --- */

const eventIndex = html.indexOf('id="sommerfest"');
const ideaIndex = html.indexOf('id="saeulen"');
assert.ok(eventIndex >= 0, 'Auf der KIDZ-Elternseite fehlt der Sommerfest-Rückblick.');
assert.ok(eventIndex < ideaIndex, 'Der Rückblick steht vor den drei Grundlagen.');

/* --- Rückblick statt Termin --- */

const block = html.slice(eventIndex, html.indexOf('</aside>', eventIndex));
assert.match(block, /Rückblick · 6\. September 2026/);
assert.match(block, /Danke an über 700 Gäste/);
assert.match(block, /class="summer-facts"/);
assert.match(block, /href="\/kidz\/sommerfest\?quelle=direkt#sommerfest"/);
assert.match(block, /href="\/kidz\/sommerfest\?quelle=direkt#gewinnspiel"/);
const foto = await stat(new URL('../assets/images/kidz-fest-01.webp', import.meta.url));
assert.ok(foto.size > 10_000, 'Das Foto vom Fest fehlt.');

// Nach dem Fest lädt nichts mehr zum Termin oder zum Gewinnspiel ein.
assert.doesNotMatch(html, /Eintritt frei/);
assert.doesNotMatch(html, /10 bis 15 Uhr/);
assert.doesNotMatch(html, /gewinnspiel\?quelle=direkt#anmeldung/);
assert.doesNotMatch(html, /ohne Anmeldung einfach vorbeikommen/);
assert.doesNotMatch(html, /Nächster Termin für Familien/);

/* --- Auch über das Menü erreichbar --- */

assert.match(html, /<a class="nav-event" href="#sommerfest">Rückblick<\/a>/);
assert.match(html, /<a href="#sommerfest">Rückblick Sommerfest<\/a>/);

/* --- Gestaltung --- */

assert.match(css, /\.summer-facts/);
assert.match(css, /\.desktop-nav a\.nav-event/);
assert.match(css, /\.fest-foto/);

console.log('kidz-konzept-sommerfest: OK');
