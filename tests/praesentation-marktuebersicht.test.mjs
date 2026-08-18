// Die Marktübersicht öffnet sich aus „Was alles dazugehört“.
//
// Sie war eine Zeit lang tot: Das Skript blendete sie mit der Klasse
// `is-open` ein, sichtbar macht das Stylesheet ein Overlay aber über `offen`.
// Damit verschwand nur das hidden-Merkmal, die Fläche blieb durchsichtig —
// ein Klick, nichts passiert, und darüber lag eine unsichtbare Scheibe.
// Zwei Namen für dieselbe Sache, in zwei Dateien, die niemand nebeneinander
// legt. Deshalb prüft dieser Test die Kopplung selbst und nicht nur den
// einen Knopf: Jede Klasse, mit der das Skript ein Overlay einblendet, muss
// im Stylesheet auch etwas sichtbar machen.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('css/praesentation.css'),
]);

// --- Der Knopf und die Fläche gehören zusammen ---
assert.match(html, /id="marketOpen"[^>]*aria-controls="marketOverlay"/,
  'der Knopf „Was alles dazugehört" muss auf die Marktübersicht zeigen');
assert.match(html, /id="marketOverlay"[^>]*hidden/,
  'die Marktübersicht startet verborgen');

// --- Skript und Stylesheet müssen dieselbe Klasse meinen ---
const jsKlassen = [...js.matchAll(/overlay\.classList\.add\('([^']+)'\)/g)].map(m => m[1]);
const cssKlassen = new Set(
  [...css.matchAll(/\.[a-z-]+-overlay\.([a-z-]+)\s*\{/g)].map(m => m[1])
);
assert.ok(jsKlassen.length >= 3, 'die drei Overlays der Präsentation müssen erfasst sein');
for (const klasse of new Set(jsKlassen)) {
  assert.ok(cssKlassen.has(klasse),
    `js/programm.js blendet ein Overlay mit „${klasse}" ein, css/praesentation.css kennt diese Klasse nicht`);
}

// --- Geschlossen darf kein Overlay als unsichtbare Scheibe über der Seite
// liegen. Die Overlays stehen auf display:flex, das schlägt das
// hidden-Merkmal, deshalb braucht jedes seine eigene Regel dafür. ---
for (const name of [...css.matchAll(/\.([a-z-]+-overlay)\s*\{/g)].map(m => m[1])) {
  assert.match(css, new RegExp(`\\.${name}\\[hidden\\]\\s*\\{[^}]*display:\\s*none`),
    `${name} braucht eine Regel .${name}[hidden]{display:none}`);

  // Sicherheitsnetz: unsichtbar heißt auch „nimmt keine Klicks an". Ein
  // falscher Klassenname im Skript legt sonst wieder die ganze Seite lahm.
  const block = css.slice(css.indexOf(`.${name}{`), css.indexOf('}', css.indexOf(`.${name}{`)));
  assert.match(block, /pointer-events:\s*none/,
    `.${name} braucht pointer-events:none, solange es nicht eingeblendet ist`);
  assert.match(css, new RegExp(`\\.${name}\\.offen\\{[^}]*pointer-events:\\s*auto`),
    `.${name}.offen muss die Klicks wieder annehmen`);
}

// --- Die zehn Felder rechnet das Skript auf die Ellipse, ihre Texte stehen im
// HTML. Am Rad stehen zwei kurze Stichworte, in data-details der ausführliche
// Text, der beim Antippen im Band unter dem Rad aufklappt. Ohne data-details
// bliebe das Band leer. ---
const knoten = [...html.matchAll(/class="market-node markt-stelle"[\s\S]*?>/g)].map(m => m[0]);
assert.equal(knoten.length, 10, 'zehn Themenfelder');
for (const k of knoten) {
  assert.match(k, /data-title="[^"]+"/, 'jedes Feld braucht eine Überschrift');
  assert.match(k, /data-details="[^"|]+\|[^"]+"/, 'jedes Feld braucht zwei Punkte im Detail');
}

// --- Das Plus am Symbol ist das sichtbare Versprechen, dass hinter dem Feld
// etwas liegt. Ohne es sieht niemand, dass die Felder Knöpfe sind: genau das
// war der Anlass für den Umbau in Phase 287. ---
assert.equal((html.match(/class="markt-plus"/g) || []).length, 10,
  'jedes der zehn Felder braucht das Plus am Symbol');
assert.match(css, /\.markt-stelle\[aria-pressed="true"\] \.markt-plus::after\{[^}]*opacity:0/,
  'beim geöffneten Feld muss aus dem Plus ein Minus werden');

// --- Das Rad darf nicht wieder in einer halben Spalte landen. ---
assert.match(css, /\.markt-rad\{[^}]*max-width:960px/,
  'das Rad steht auf 960 Pixeln, vorher waren es 520 neben einer Textspalte');
assert.doesNotMatch(css, /\.markt-detail\{/,
  'die alte Detailspalte rechts ist ersetzt durch .markt-tiefe unter dem Rad');

console.log('praesentation-marktuebersicht: alles in Ordnung');
