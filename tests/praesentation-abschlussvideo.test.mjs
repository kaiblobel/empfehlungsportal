// Abschluss-Video "Das Portal in 60 Sekunden" am Ende der Präsentation.
//
// Geprüft wird vor allem das, was im Kundengespräch weh täte:
// dass nichts von allein losspielt, dass nichts ungefragt Datenvolumen zieht,
// und dass der Service Worker das Video in Ruhe lässt (Bereichs-Anfragen).
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, sw, js] = await Promise.all([
  read('programm.html'),
  read('css/programm.css'),
  read('sw.js'),
  read('js/programm.js'),
]);

// --- Der Abschnitt steht am ENDE: nach dem QR-Einstieg, vor dem Footer ---
assert.match(html, /<section class="section story-video" id="video">/);
const posVideo = html.indexOf('id="video"');
const posQr = html.indexOf('id="anmelden"');
const posFooter = html.indexOf('<footer class="site-footer">');
assert.ok(posQr > 0 && posVideo > posQr, 'Video steht nach dem QR-Einstieg');
assert.ok(posFooter > posVideo, 'Video steht vor dem Footer');

// --- Kein Autoplay, kein Ton ungefragt, Bedienelemente vorhanden ---
const tag = html.match(/<video[\s\S]*?>/)[0];
assert.doesNotMatch(tag, /autoplay/, 'kein Autoplay im Kundengespräch');
assert.doesNotMatch(tag, /\bloop\b/);
assert.match(tag, /controls/);
assert.match(tag, /playsinline/, 'iPhone soll nicht in den Vollbildmodus springen');

// --- Nichts wird geladen, bevor Kai auf Play drückt; Vorschaubild steht sofort ---
assert.match(tag, /preload="none"/);
assert.match(tag, /poster="\/assets\/video\/empfehlungsportal-story-poster\.jpg"/);
assert.match(html, /<source src="\/assets\/video\/empfehlungsportal-story\.mp4" type="video\/mp4"/);

// --- Rückfalltext, wenn der Browser nicht abspielen kann ---
assert.match(html, /hier herunterladen/);

// --- Die Dateien liegen wirklich da und sind fürs Web tauglich ---
const video = await stat(new URL('../assets/video/empfehlungsportal-story.mp4', import.meta.url));
const poster = await stat(new URL('../assets/video/empfehlungsportal-story-poster.jpg', import.meta.url));
assert.ok(video.size > 0 && video.size < 8 * 1024 * 1024,
  `Video muss klein genug fuers Handy bleiben (ist ${(video.size / 1024 / 1024).toFixed(1)} MB)`);
assert.ok(poster.size > 0 && poster.size < 400 * 1024, 'Vorschaubild bleibt schlank');

// --- Der Service Worker haelt sich raus (206-Bereichsanfragen) ---
assert.match(sw, /url\.pathname\.endsWith\('\.mp4'\)\) return;/);

// --- Styles vorhanden, und der Abschnitt haengt beim Scrollen nicht fest ---
assert.match(css, /\.section\.story-video \{/);
assert.match(css, /\.story-video-frame video \{[\s\S]*?aspect-ratio: 16 \/ 9;/);
assert.match(css, /\.section\.story-video \{ scroll-snap-align: none; \}/);

// --- Im Kurzmodus bleibt das Video sichtbar (es ist der Abschluss, keine Vertiefung) ---
const abschnitt = html.slice(posVideo - 200, posVideo + 200);
assert.doesNotMatch(abschnitt, /data-short-hide/);

// --- 60-Sekunden-Modus (Phase 159) ---
assert.match(html, /data-presentation-mode="video"/, 'dritter Knopf im Umschalter');
assert.match(js, /VIDEO_MODE_KEEP = \['video', 'anmelden'\]/, 'nur Video + Anmeldung bleiben stehen');
assert.match(js, /qrSection\.before\(videoSection\)/, 'im 60-Sek-Modus kommt das Video VOR den QR-Block');
assert.match(js, /qrSection\.after\(videoSection\)/, 'sonst steht es wieder dahinter');
assert.match(js, /startModus === 'kurz' \? 'short' : startModus === 'video' \? 'video' : 'full'/);
assert.match(js, /url\.searchParams\.set\('modus', 'video'\)/, 'Modus bleibt als Link speicherbar');

// --- Der eigentliche Fund: Verstecken muss auch verstecken ---
// `.section { display: flex }` schlug die Browser-Regel `[hidden] { display: none }`.
// Im Browser gemessen: hidden=true, display=flex, 14 von 14 Abschnitten sichtbar.
// Ohne diese Regel ist auch der Kurzmodus wirkungslos.
assert.match(css, /\.section\[hidden\] \{ display: none; \}/);
assert.match(css, /body\.presentation-video \.reveal \{ opacity: 1;/, 'im Kurzestmodus nichts Blasses');

console.log('praesentation-abschlussvideo: OK');
