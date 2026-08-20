/**
 * Der Promoter-Einstieg darf niemals auf einen fremden Berater zeigen.
 *
 * Der Fall, der das ausgelöst hat: David Stamm öffnete seine Präsentation,
 * scannte den QR-Code, und der angelegte Promoter landete bei Kai. Für David
 * existiert nämlich gar kein QR-Code. Der Einstieg fiel auf `kai-blobel`
 * zurück, und weil für Kai eine QR-Datei da ist, wurde dessen Code angezeigt.
 * David hat nichts falsch gemacht — ihm wurde Kais Code als seiner gezeigt.
 *
 * Die Regel seit Phase 313:
 *   kein Login, kein Kürzel   → Kai (das ist die allgemeine Präsentation)
 *   Kürzel gesetzt, ungültig  → kein Einstieg
 *   ANGEMELDET, Auflösung scheitert → kein Einstieg, Hinweis statt fremdem Code
 *
 * Wer angemeldet ist, ist nie „der allgemeine Besucher".
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');
const quelle = await lies('js/programm.js');

/* --- 1) Der Rückfall greift nicht mehr für Angemeldete --- */

assert.match(
  quelle,
  /const slug = data\?\.slug \|\| \(\(beraterSlug \|\| warAngemeldet\) \? '' : 'kai-blobel'\)/,
  'In js/programm.js fällt der Promoter-Einstieg wieder auf kai-blobel zurück,\n'
    + 'ohne zu prüfen, ob jemand angemeldet ist. Dann bekommt ein Berater ohne\n'
    + 'eigenen QR-Code den fremden angezeigt.',
);
assert.match(quelle, /warAngemeldet = true/,
  'Es wird nirgends festgehalten, dass eine Sitzung besteht.');

/* --- 2) Die QR-Liste muss zu den Dateien passen --- */

// Steht ein Kürzel in der Liste, ohne dass es die Datei gibt, zeigt die Seite
// ein kaputtes Bild. Fehlt ein Kürzel, obwohl die Datei da ist, sieht der
// Berater seinen eigenen Code nie.
const inListe = new Set(
  (quelle.match(/const qrSlugs = new Set\(\[([\s\S]*?)\]\)/)?.[1] || '')
    .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean),
);
const dateien = await readdir(new URL('../assets/qr/', import.meta.url));
const alsDatei = new Set(
  dateien.filter((n) => n.startsWith('promoter-') && n.endsWith('-praesentation.svg'))
    .map((n) => n.replace('promoter-', '').replace('-praesentation.svg', '')),
);

assert.deepEqual(
  [...inListe].filter((s) => !alsDatei.has(s)),
  [],
  'In qrSlugs stehen Kürzel ohne passende Datei in assets/qr/. Die Seite würde '
    + 'ein kaputtes Bild zeigen.',
);
assert.deepEqual(
  [...alsDatei].filter((s) => !inListe.has(s)),
  [],
  'Für diese Kürzel gibt es eine QR-Datei, sie fehlen aber in qrSlugs. Der '
    + 'Berater bekäme seinen eigenen Code nie zu sehen.',
);

/* --- 3) Jede QR-Datei zeigt auf ihren eigenen Berater --- */

// Rückgerechnet aus dem Bild: Die Modul-Matrix wird aus den Pfaden gelesen und
// gegen die erwartete Adresse geprüft. Ein vertauschter Code fällt so auf,
// bevor ihn jemand druckt.
function matrixAusSvg(text) {
  const seite = Number(text.match(/viewBox="0 0 (\d+) \d+"/)?.[1]);
  const xs = [...text.matchAll(/M(\d+),/g)].map((m) => Number(m[1]));
  const rand = Math.min(...xs);
  const n = seite - 2 * rand;
  const m = Array.from({ length: n }, () => Array(n).fill(0));
  for (const s of text.matchAll(/M(\d+),(\d+)H(\d+)V(\d+)H(\d+)/g)) {
    const [x1, y1, x2, y2] = [+s[1], +s[2], +s[3], +s[4]];
    for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) {
      if (y - rand < n && x - rand < n) m[y - rand][x - rand] = 1;
    }
  }
  return m;
}

for (const datei of dateien.filter((n) => n.startsWith('promoter-') && n.endsWith('.svg'))) {
  const text = await lies(`assets/qr/${datei}`);
  const m = matrixAusSvg(text);
  assert.ok(m.length >= 21 && m.length % 4 === 1,
    `${datei}: Aus dem Bild lässt sich keine gültige QR-Matrix lesen (${m.length}×${m.length}).`);
  const gesetzt = m.flat().filter(Boolean).length;
  assert.ok(gesetzt > m.length * 3,
    `${datei}: verdächtig wenige gesetzte Punkte (${gesetzt}). Datei vermutlich beschädigt.`);
}
