/**
 * Sommerfest-Hinweis auf der KIDZ-Elternseite.
 *
 * Die Kundenseite zeigt das Kinder-Sommerfest prominent. Wer über Suche, QR
 * oder einen geteilten Link direkt auf /kidz/konzept landet, kam an dem Termin
 * bisher vorbei. Dieser Test hält fest, dass der Hinweis dort steht, früh steht
 * und auf beide Wege führt: Sommerfest-Seite und Gewinnspiel-Anmeldung.
 */

import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css] = await Promise.all([
  read('kidz-konzept.html'),
  read('css/kidz-konzept.css'),
]);

const flyer = await stat(new URL('../assets/images/kidz-sommerfest-flyer.jpg', import.meta.url));

/* --- Der Abschnitt ist da und steht vor dem Konzepttext --- */

const eventIndex = html.indexOf('id="sommerfest"');
const ideaIndex = html.indexOf('id="idee"');
assert.ok(eventIndex >= 0, 'Auf der KIDZ-Elternseite fehlt der Sommerfest-Abschnitt.');
assert.ok(
  eventIndex < ideaIndex,
  'Der Sommerfest-Hinweis muss vor der KIDZ-Idee stehen, sonst sieht ihn niemand, der nur kurz auf der Seite ist.',
);

/* --- Die Eckdaten stehen ohne Klick auf der Seite --- */

assert.match(html, /Kinder-Sommerfest am 6\. September\./);
assert.match(html, /6\. September 2026/);
assert.match(html, /10 bis 15 Uhr/);
assert.match(html, /Kutzeburger Mühle 1, 03051 Cottbus/);
assert.match(html, /Eintritt frei/);
assert.match(html, /class="summer-facts"/);
assert.match(html, /assets\/images\/kidz-sommerfest-flyer\.jpg/);
assert.ok(flyer.size > 400_000, 'Der Flyer fehlt oder ist keine echte Bilddatei.');

/* --- Beide Wege sind erreichbar, mit sauberer Herkunft --- */

assert.match(html, /href="\/kidz\/sommerfest\?quelle=direkt#sommerfest"/);
assert.match(html, /href="\/kidz\/gewinnspiel\?quelle=direkt#anmeldung"/);

/* --- Auch über das Menü erreichbar --- */

assert.match(html, /<a class="nav-event" href="#sommerfest">Sommerfest<\/a>/);

/* --- Der Hinweis nimmt niemanden in die Pflicht --- */

assert.match(html, /ohne Anmeldung einfach vorbeikommen/);

/* --- Gestaltung: eigener Block, der auf dem Handy umbricht --- */

assert.match(css, /\.summer-section/);
assert.match(css, /\.summer-card/);
assert.match(css, /\.summer-facts/);
assert.match(css, /\.desktop-nav a\.nav-event/);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.summer-card \{ grid-template-columns: 1fr/);

console.log('kidz-konzept-sommerfest: OK');
