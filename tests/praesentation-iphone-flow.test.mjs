// Die drei Handy-Ansichten im Abschnitt „So empfiehlst du mich".
//
// Sie sind der Teil, der im Termin am meisten erklärt: anlegen, per WhatsApp
// senden, Dankeschön wählen. Geprüft wird, dass alle drei stehen, dass der
// Name des Beraters aus den Daten kommt und dass die Geräte ihr Seitenformat
// behalten. Die Klassennamen sind mit dem Umbau deutsch geworden
// (geraet/schirm statt iphone-device), die Zusagen dahinter sind dieselben.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css] = await Promise.all([
  read('programm.html'),
  read('css/praesentation.css'),
]);

// --- Drei Schritte, drei Geräte ---
assert.match(html, /class="schritte"/);
assert.equal((html.match(/class="geraet"/g) || []).length, 3);
assert.equal((html.match(/class="insel"/g) || []).length, 3);
assert.equal((html.match(/class="homebar"/g) || []).length, 3);

// --- Die drei Schritte heißen im Klartext, was sie tun ---
assert.match(html, /Empfehlung anlegen/);
assert.match(html, /Per WhatsApp senden/);
assert.match(html, /Dankeschön auswählen/);

// --- In der Nachricht steht der Name des jeweiligen Beraters, nicht Kai fest ---
assert.match(html, /chat-blase[\s\S]*?data-bb="name"/);
// --- Auch das Kürzel in der App-Kopfzeile kommt aus den Daten ---
assert.match(html, /app-marke[\s\S]*?data-bb="initialen"/);

// --- Die drei Belohnungsarten stehen zur Wahl ---
assert.match(html, /Geldprämie/);
assert.match(html, /Sachprämie/);
assert.match(html, /Spende/);

assert.match(html, /css\/praesentation\.css\?v=\d+/);

// --- Die Geräte behalten ihr Format, sonst werden sie zu Klötzen ---
assert.match(css, /\.geraet\{/);
assert.match(css, /aspect-ratio:244\/500/);
assert.match(css, /\.insel\{/);
assert.match(css, /\.wa-schirm\{/);
assert.match(css, /\.pramien-option\{/);

// --- Die drei stehen versetzt, nicht in Reih und Glied.
// Drei gleich hohe Karten nebeneinander sind das Muster, das nach Baukasten
// aussieht; der Versatz kostet nichts und nimmt genau diesen Eindruck. ---
assert.match(css, /\.schritt:nth-child\(2\)\{padding-top:\d+px;\}/);
assert.match(css, /\.schritt:nth-child\(3\)\{padding-top:\d+px;\}/);

// --- Auf dem Handy stehen sie untereinander, ohne Versatz ---
assert.match(css, /\.schritt:nth-child\(2\), \.schritt:nth-child\(3\)\{padding-top:0;\}/);

console.log('praesentation-iphone-flow: OK');
