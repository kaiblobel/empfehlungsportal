// Kapitel 2 der Empfänger-Strecke: "Deine persönliche Formel zum finanziellen Glück".
//
// Der Film bekam einen eigenen Bildschirm — dadurch sind aus fünf Kapiteln sechs
// geworden. Diese Datei sichert vor allem die Stellen ab, an denen im Skript feste
// Schrittnummern stehen: die verrutschen beim naechsten Umbau als Erstes, und der
// Fehler faellt niemandem auf, weil die Seite trotzdem laedt.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const html = await readFile(new URL('../empfaenger.html', import.meta.url), 'utf8');

// --- Der Film ist ein eigenes Kapitel, direkt nach dem Einstieg ---
assert.match(html, /<section class="chapter" data-step="2">/);
const posFilm = html.indexOf('id="formelVideo"');
const posHero = html.indexOf('data-step="1">');
const posWahl = html.indexOf('data-step="3">');
assert.ok(posFilm > posHero, 'Film kommt nach dem Einstieg');
assert.ok(posWahl > posFilm, 'die Themenwahl kommt nach dem Film');

// --- Sechs Kapitel, und die Anzeige sagt auch sechs ---
assert.equal((html.match(/<section class="chapter/g) || []).length, 6);
assert.equal((html.match(/<div class="progress" aria-label="Fortschritt">(<i[^>]*><\/i>)+/)?.[0].match(/<i/g) || []).length, 6);
assert.match(html, /<b id="stepNow">1<\/b> \/ 6/);

// --- Fest verdrahtete Schrittnummern im Skript: alle mitgewandert ---
assert.match(html, /if\(next<1\|\|next>6\|\|next===step\)return;/, 'Obergrenze auf 6');
assert.match(html, /if\(step===4\)setTimeout\(/, 'Profil-Aufbau haengt jetzt am Ergebnis-Kapitel 4');
assert.match(html, /\.chapter\[data-step="3"\] \.chapter-lede/, 'Themenwahl ist Kapitel 3');
assert.match(html, /step===3&&!interest/, 'Pfeiltaste blockt weiter an der Themenwahl');

// --- Nichts spielt von allein, nichts laedt ungefragt ---
const tag = html.match(/<video[\s\S]*?>/)[0];
assert.doesNotMatch(tag, /autoplay/);
assert.match(tag, /controls/);
assert.match(tag, /preload="none"/);
assert.match(tag, /playsinline/);
assert.match(tag, /poster="\/assets\/video\/formel-finanzielles-glueck-poster\.jpg"/);
assert.match(html, /<source src="\/assets\/video\/formel-finanzielles-glueck\.mp4" type="video\/mp4"/);
assert.match(html, /hier herunterladen/);

// --- Die Dateien liegen da und bleiben handytauglich ---
const video = await stat(new URL('../assets/video/formel-finanzielles-glueck.mp4', import.meta.url));
const poster = await stat(new URL('../assets/video/formel-finanzielles-glueck-poster.jpg', import.meta.url));
assert.ok(video.size > 0 && video.size < 10 * 1024 * 1024,
  `Video zu gross fuers Handy: ${(video.size / 1024 / 1024).toFixed(1)} MB`);
assert.ok(poster.size > 0 && poster.size < 400 * 1024);

// --- Styles fuer das Film-Kapitel vorhanden, inkl. Handy-Umbruch ---
assert.match(html, /\.film-grid\{display:grid;grid-template-columns:\.85fr 1\.15fr/);
assert.match(html, /\.film-frame video\{[^}]*max-width:100%/, 'Video schrumpft im Raster mit');
assert.match(html, /@media\(max-width:780px\)\{\.film-grid\{grid-template-columns:1fr/);

console.log('empfaenger-formel-video: OK');
