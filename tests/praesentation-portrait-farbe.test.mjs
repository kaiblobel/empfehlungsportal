// Das Bild im Einstieg darf nicht entfärbt werden.
//
// Ursprünglicher Fund: Auf dem Portrait lag ein Graustufen-Filter, dadurch saß
// Kai schwarzweiß auf einer sonst farbigen Seite. Die Zusage gilt weiter, nur
// steht dort jetzt ein Bild aus dem Büro statt des freigestellten Portraits.
//
// Zweite Zusage, die hier mitgeprüft wird: Das Bild kommt aus den Daten des
// jeweiligen Beraters. Ohne data-bb stünde auf der Seite jedes Partners Kais
// Büro.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, brand] = await Promise.all([
  read('programm.html'),
  read('css/praesentation.css'),
  read('js/berater-brand.js'),
]);

// --- Das Bild hängt am Berater, nicht am HTML ---
assert.match(html, /<img id="t-Foto" data-bb="buerofoto"/);
assert.match(html, /data-bb="buerozeile"/, 'Bildunterschrift kommt ebenfalls aus den Daten');
assert.match(html, /css\/praesentation\.css\?v=\d+/);

// --- Fehlt einem Partner das Bürofoto, rückt SEIN Portrait nach, nie ein fremdes ---
assert.match(brand, /case 'buerofoto':/);
assert.match(brand, /b\.buero_foto_url \|\| b\.foto_url \|\| initialsAvatar\(b\.name\)/);

// --- Ohne eigenes Teambild bleibt die Karte ohne Bild statt fremde Räume zu zeigen ---
assert.match(brand, /case 'teamfoto':/);
assert.match(brand, /traeger\.hidden = true;/);

// --- Keine Entfärbung auf dem Bild im Einstieg ---
const fotoRegel = css.match(/\.einstieg-foto img\{([\s\S]*?)\}/)?.[1] || '';
assert.ok(fotoRegel, 'Regel für das Einstiegsbild gefunden');
assert.doesNotMatch(fotoRegel, /grayscale/, 'kein Graustufen-Filter');
assert.doesNotMatch(fotoRegel, /saturate\(0/, 'nicht entsättigt');

// --- Auch das Portrait in der Marktübersicht bleibt farbig ---
const mitteRegel = css.match(/\.markt-mitte img\{([\s\S]*?)\}/)?.[1] || '';
assert.ok(mitteRegel, 'Regel für das Portrait in der Mitte gefunden');
assert.doesNotMatch(mitteRegel, /grayscale/);

// --- Die Alltagsbilder dürfen gedämpft sein, das ist Absicht und kein Versehen ---
const alltagRegel = css.match(/\.alltag-satz\{([\s\S]*?)\}/)?.[1] || '';
assert.match(alltagRegel, /filter:saturate\(\.82\)/,
  'die sechs Alltagsmotive sind bewusst angeglichen, damit sie wie ein Set wirken');

console.log('praesentation-portrait-farbe: OK');
