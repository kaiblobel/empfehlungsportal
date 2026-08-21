/**
 * Wer im Team eine Person auswählt, muss ihre Entwicklung auch SEHEN.
 *
 * Der Fall, der das ausgelöst hat (Phase 316): Kai klickte auf
 * „Entwicklung ansehen" und es passierte scheinbar nichts. Tatsächlich
 * wechselte die Detailansicht sofort — sie steht aber unter der
 * Personenliste, bei sieben Karten gut zwei Bildschirmhöhen tiefer.
 * Gemessen lag ihr Kopf bei 1806 Pixeln in einem 876 Pixel hohen Fenster.
 *
 * Das Teamranking darüber sprang seit jeher hin, die Personenkarten nicht.
 * Genau diese Ungleichheit ist der Fehler: Zwei Wege zum selben Ziel, einer
 * davon unsichtbar.
 *
 * Der Wächter prüft deshalb nicht, DASS irgendwo gesprungen wird, sondern
 * dass JEDE Stelle, die eine Person auswählt, danach auch hinspringt.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const quelle = await readFile(new URL('../js/team.js', import.meta.url), 'utf8');
const css    = await readFile(new URL('../css/hub.css', import.meta.url), 'utf8');

/* --- 1) Jede Auswahl springt zur Entwicklung --- */

// Alle Klick-Handler, die eine Person auswählen. Der Rumpf reicht bis zur
// schließenden Klammer des Handlers.
const handler = [...quelle.matchAll(/addEventListener\('click',\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s{4}\}\);/g)]
  .map((m) => m[1])
  .filter((rumpf) => /selectedId\s*=/.test(rumpf));

assert.ok(handler.length >= 2,
  `Erwartet: mindestens zwei Stellen wählen eine Person aus (Personenliste und Ranking). Gefunden: ${handler.length}.`);

handler.forEach((rumpf, i) => {
  assert.match(rumpf, /zeigeEntwicklung\(\)/,
    `Auswahl-Stelle ${i + 1} in js/team.js wählt eine Person, springt aber nicht zu ihrer Entwicklung. `
    + 'Ohne den Sprung wechselt der Inhalt außerhalb des Bildes und der Knopf wirkt kaputt.');
});

/* --- 2) Der Sprung landet am Anfang, nicht mittig --- */

// Auf dem Handy ist der Detailblock höher als der Bildschirm. Mit
// block:'center' schiebt es den Namen oben aus dem Bild (gemessen: -83 px).
const sprung = quelle.match(/function zeigeEntwicklung\(\)\s*\{[\s\S]*?\n\}/);
assert.ok(sprung, 'js/team.js hat keine Funktion zeigeEntwicklung() mehr.');
assert.match(sprung[0], /block:\s*'start'/,
  "zeigeEntwicklung() muss block:'start' verwenden: Der Block ist auf dem Handy höher als der "
  + 'Bildschirm, zentriert rutscht der Name oben heraus.');

/* --- 3) Und lässt oben Luft --- */

const regel = css.match(/\.team-detail\s*\{[\s\S]*?\n\}/);
assert.ok(regel, 'css/hub.css hat keine Regel .team-detail mehr.');
assert.match(regel[0], /scroll-margin-top/,
  '.team-detail braucht scroll-margin-top, sonst klebt der Name beim Anspringen am Bildschirmrand.');
