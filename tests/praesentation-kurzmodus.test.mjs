import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('css/praesentation.css'),
]);

assert.match(html, /id="presenterLength" hidden role="group" aria-label="Präsentationslänge"/);
assert.match(html, /data-presentation-mode="short"/);
assert.match(html, /data-presentation-mode="full"/);
assert.equal((html.match(/<section class="section/g) || []).length, 11);
assert.equal((html.match(/data-short-hide/g) || []).length, 3);
assert.match(html, /css\/praesentation\.css\?v=\d+/);
assert.match(html, /js\/programm\.js\?v=\d+/);

assert.match(js, /startModus === 'kurz' \? 'short' : startModus === 'video' \? 'video' : 'full'/);
assert.match(js, /extendedSections\.forEach\(section => \{ section\.hidden = short; \}\)/);
assert.match(html, /data-presentation-mode="video"/);
assert.match(js, /url\.searchParams\.set\('modus', 'kurz'\)/);
assert.match(js, /url\.searchParams\.delete\('modus'\)/);
assert.match(js, /filter\(section => !section\.hidden\)/);

assert.match(css, /\.presenter-length\[hidden\]\{display:none;\}/);
assert.match(css, /\.cta-top\{[\s\S]*?border-radius:999px;/);
// Der Foerderrechner steht nicht mehr als eigener Abschnitt auf der Seite,
// sondern oeffnet sich hinter den Themen 'Ganz allgemein' und 'Staatliche
// Foerderungen'. Damit sieht die Eurosumme nur, wen sie etwas angeht.
assert.match(js, /typ: 'rechner'/);
assert.match(html, /id="themaRechner"/);


console.log('praesentation-kurzmodus: OK');
