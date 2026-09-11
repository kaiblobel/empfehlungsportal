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
// Seit dem Umbau "persönlicher" (11.09.2026) gibt es kein animiertes Profil in Kapitel 4
// mehr. Neu fest verdrahtet: der gemerkte Schritt beim Zurückkommen aus dem Finanzcheck.
assert.match(html, /alt\.step>1&&alt\.step<=6/, 'Gemerkter Schritt bleibt innerhalb der sechs Kapitel');
assert.match(html, /<section class="chapter" data-step="3">[\s\S]*?class="chapter-lede"/, 'Themenwahl ist Kapitel 3');
assert.match(html, /step===3&&!interest/, 'Pfeiltaste blockt weiter an der Themenwahl');

// --- Nichts spielt von allein, nichts laedt ungefragt ---
const tag = html.match(/<video[\s\S]*?>/)[0];
assert.doesNotMatch(tag, /autoplay/);
assert.match(tag, /controls/);
assert.match(tag, /preload="none"/);
assert.match(tag, /playsinline/);
assert.match(tag, /poster="\/assets\/video\/allgemein-persoenliche-formel-v5-poster\.jpg"/);
assert.match(html, /<source src="\/assets\/video\/allgemein-persoenliche-formel-v5-720p\.mp4" type="video\/mp4"/);
assert.match(html, /hier herunterladen/);

// --- Die Dateien liegen da und bleiben handytauglich ---
const video = await stat(new URL('../assets/video/allgemein-persoenliche-formel-v5-720p.mp4', import.meta.url));
const poster = await stat(new URL('../assets/video/allgemein-persoenliche-formel-v5-poster.jpg', import.meta.url));
assert.ok(video.size > 0 && video.size < 10 * 1024 * 1024,
  `Video zu gross fuers Handy: ${(video.size / 1024 / 1024).toFixed(1)} MB`);
assert.ok(poster.size > 0 && poster.size < 400 * 1024);

// --- Styles fuer das Film-Kapitel vorhanden, inkl. Handy-Umbruch ---
assert.match(html, /\.film-grid\{display:grid;grid-template-columns:\.85fr 1\.15fr/);
assert.match(html, /\.film-frame video\{[^}]*max-width:100%/, 'Video schrumpft im Raster mit');
assert.match(html, /@media\(max-width:780px\)\{\.film-grid\{grid-template-columns:1fr/);

// --- Phase 349, Kais Entscheidungen vom 11.09.2026 ---
// Film v5 (1:28), keine Zeichenkreise mehr (Funkelstern, Anführungszeichen), kein Satz
// unter dem Film. Die KI-Stimme ist im Bild gekennzeichnet, siehe ki-kennzeichnung.test.mjs.
assert.match(html, /1:28 Minuten/);
assert.doesNotMatch(html, /1:37/);
assert.doesNotMatch(html, /✦/, 'Der Funkelstern ist ein KI-Merkmal und bleibt weg');
assert.doesNotMatch(html, /id="ePromoterInitial"/, 'Kein Kreis vor der Nachricht des Empfehlungsgebers');
assert.doesNotMatch(html, /class="ki-hinweis"/);

console.log('empfaenger-formel-video: OK');
