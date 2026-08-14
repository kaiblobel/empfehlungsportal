// KI-Kennzeichnung für jedes Video im Portal.
//
// Warum das ein eigener Test ist und nicht eine Zeile in den beiden Video-Tests:
// Am 06.08.2026 gingen zwei mit HeyGen erzeugte Videos live, ohne jeden Hinweis
// darauf. Nicht im Bild, nicht im Seitentext, nicht in der Datei. Aufgefallen ist
// es erst zwei Tage später bei einer Bestandsaufnahme. Ein Test, der an einer
// festen Dateiliste hängt, hätte das dritte Video genauso durchgelassen.
//
// Deshalb läuft dieser Test über den ORDNER, nicht über eine Liste. Wer eine
// neue MP4 nach assets/video/ legt, muss sie kennzeichnen, sonst wird der Test
// rot. Das ist der Zweck.
//
// Zwei Ebenen, beide nötig:
//   1. Sichtbar auf der Seite — greift beim Ansehen im Browser.
//   2. In der Datei (C2PA) — greift, wenn jemand die MP4 herunterlädt. Beide
//      Seiten bieten einen Download-Link an; ab dann trägt die Datei den
//      HTML-Hinweis nicht mehr mit sich, das Manifest schon.
import assert from 'node:assert/strict';
import { readFile, readdir, open } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (file) => readFile(new URL(file, root), 'utf8');

// Welche Seite bindet welches Video ein? Wird aus dem HTML gelesen, nicht gepflegt.
// Der zweite Wert sagt, wo die Stile dieser Seite stehen: programm.html lädt eine
// CSS-Datei, empfaenger.html trägt sie inline im <style>-Block. Ohne diese
// Unterscheidung würde der Test eine Seite grün melden, deren Hinweis unformatiert
// im Rahmen klebt (dort steht line-height: 0 für das <video>).
const SEITEN = [
  ['programm.html', 'css/programm.css'],
  ['empfaenger.html', 'empfaenger.html'],
  ['baufi.html', 'baufi.html'],
];

const videos = (await readdir(new URL('assets/video/', root)))
  .filter((n) => n.endsWith('.mp4'))
  .sort();

assert.ok(videos.length > 0, 'Es liegt mindestens ein Video im Ordner');

const htmls = new Map();
const stile = new Map();
for (const [seite, stilquelle] of SEITEN) {
  htmls.set(seite, await read(seite));
  stile.set(seite, stilquelle === seite ? htmls.get(seite) : await read(stilquelle));
}

/**
 * Sucht den C2PA-Kasten in den ersten 256 KB der Datei.
 *
 * Absichtlich eine Byte-Suche statt eines Aufrufs von c2patool: Der Test soll
 * auf jedem Rechner und in jeder CI laufen, ohne dass dort ein signiertes
 * Werkzeug installiert sein muss. Er prüft, DASS ein Manifest da ist, nicht ob
 * dessen Signatur gültig ist. Für die Gültigkeit gibt es `c2patool --info`.
 */
async function hatC2pa(datei) {
  const fh = await open(new URL(`assets/video/${datei}`, root), 'r');
  try {
    const puffer = Buffer.alloc(256 * 1024);
    const { bytesRead } = await fh.read(puffer, 0, puffer.length, 0);
    const kopf = puffer.subarray(0, bytesRead);
    return kopf.includes('jumb') && kopf.includes('c2pa');
  } finally {
    await fh.close();
  }
}

for (const datei of videos) {
  // --- 1. Die Datei trägt ein Manifest -------------------------------------
  assert.ok(
    await hatC2pa(datei),
    `${datei}: keine KI-Kennzeichnung in der Datei. Nachrüsten ohne neu zu kodieren:\n`
      + `  cd C:/Projekte/avatar-reel-pipeline\n`
      + `  python -m avatar_reel label-existing <pfad> --visible-elsewhere "<Wortlaut auf der Seite>"`,
  );

  // --- 2. Die einbindende Seite nennt es beim Namen ------------------------
  const eingebunden = [...htmls.entries()].filter(([, html]) => html.includes(datei));
  assert.ok(
    eingebunden.length > 0,
    `${datei} wird von keiner der geprüften Seiten (${SEITEN.map(([s]) => s).join(', ')}) `
      + 'eingebunden. Entweder ist die Datei verwaist und gehört gelöscht, oder die Seite '
      + 'fehlt hier in SEITEN.',
  );

  for (const [seite, html] of eingebunden) {
    // Der Hinweis muss beim Video stehen, nicht irgendwo auf der Seite.
    // Gemessen wird im Umkreis der <figure>, die das Video enthält.
    const pos = html.indexOf(datei);
    const umfeld = html.slice(Math.max(0, pos - 1500), pos + 2500);
    assert.match(
      umfeld,
      /class="ki-hinweis"/,
      `${seite}: beim Video ${datei} fehlt der sichtbare KI-Hinweis (class="ki-hinweis")`,
    );
    assert.match(
      umfeld,
      /Mit KI erstellt/,
      `${seite}: der Hinweis bei ${datei} muss den Wortlaut "Mit KI erstellt" tragen`,
    );

    // --- 3. Und er ist gestaltet, nicht nur vorhanden ---------------------
    // Beide Rahmen setzen line-height: 0, damit das <video> keine Grundlinien-
    // lücke erzeugt. Ohne eigene Regel erbt der Hinweis das und ist unlesbar.
    assert.match(
      stile.get(seite),
      /\.ki-hinweis\s*\{/,
      `${seite}: es fehlt eine .ki-hinweis-Regel in der Stilquelle dieser Seite`,
    );
  }
}

console.log(`ki-kennzeichnung: OK (${videos.length} Video${videos.length === 1 ? '' : 's'} geprüft)`);
