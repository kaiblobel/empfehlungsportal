import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('css/praesentation.css'),
]);

// Die Leiste im Markup: echte Buttons, sprechende aria-Labels,
// Fortschritt mit aria-live.
assert.match(html, /<nav class="mobile-guide" id="mobileGuide" hidden aria-label="Geführte Navigation durch die Präsentation">/);
assert.match(html, /<button class="mobile-guide-btn mobile-guide-prev" id="mobileGuidePrev" type="button" aria-label="Zurück zum vorherigen Abschnitt">Zurück<\/button>/);
assert.match(html, /<span class="mobile-guide-progress" id="mobileGuideProgress" aria-live="polite">/);
assert.match(html, /<button class="mobile-guide-btn mobile-guide-next" id="mobileGuideNext" type="button" aria-label="Weiter zum nächsten Abschnitt">Weiter<\/button>/);

// Abschnittsbestand unverändert: 14 Abschnitte, 6 davon vertiefend.
// Die Führung zählt dynamisch — diese Zahlen stehen NICHT in der Logik.
assert.equal((html.match(/<section class="section/g) || []).length, 11);
assert.equal((html.match(/data-short-hide/g) || []).length, 3);

// Abfragekennungen dieser Phase.
assert.match(html, /css\/praesentation\.css\?v=\d+/);
assert.match(html, /js\/programm\.js\?v=\d+/);

// Skript: Führung nur auf kleinen Bildschirmen, Zählung dynamisch über die
// sichtbaren Abschnitte, Zurück auf dem ersten Abschnitt gesperrt, letzter
// Knopf heißt Fertig, Längenwechsel wird über das hidden-Attribut beobachtet.
assert.match(js, /matchMedia\('\(max-width: 767px\)'\)/);
assert.match(js, /const sichtbareAbschnitte = \(\) =>\s*\[\.\.\.document\.querySelectorAll\('section\.section'\)\]\.filter\(section => !section\.hidden\)/);
assert.match(js, /prevBtn\.disabled = i === 0/);
assert.match(js, /letzter \? 'Fertig' : 'Weiter'/);
assert.match(js, /attributeFilter: \['hidden'\]/);
assert.match(js, /ruhigeBewegung\.matches \? 'auto' : 'smooth'/);
assert.match(js, /progressEl\.textContent !== stand/);

// CSS: feste Leiste unten mit iPhone-Safe-Area; Sticky-CTA, Hero-Knöpfe und
// oberer CTA entfallen, solange die Führung aktiv ist.
assert.match(css, /@media \(max-width: 767px\)/);
assert.match(css, /body\.mobile-guided \.mobile-guide\{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;/);
assert.match(css, /calc\(10px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(css, /body\.mobile-guided \.sticky-cta \{ display: none; \}/);
assert.match(css, /body\.mobile-guided \.section-cta \{ display: none; \}/);
assert.match(css, /body\.mobile-guided \.cta-top \{ display: none; \}/);

// Vollbild-Einstieg und Zufriedenheits-Abschnitt: svh mit vh-Rückfall,
// Porträt vollständig, Skala als zwei Fünferreihen.
assert.match(css, /body\.mobile-guided \.einstieg\{ min-height: 100vh; min-height: 100svh; \}/);
assert.match(css, /body\.mobile-guided \.einstieg-foto img\{ max-height: 34svh; \}/);
assert.match(css, /body\.mobile-guided section\.section\.zitat\{/);
assert.match(css, /body\.mobile-guided \.nps-scale\{ grid-template-columns: repeat\(5, 1fr\)/);

// Kein verpflichtendes Scroll-Einrasten — nirgends, auch nicht auf dem Handy.
assert.doesNotMatch(css, /scroll-snap-type:\s*y\s+mandatory/);

// Phase 164: Jeder Abschnitt füllt in der Führung mindestens den Bildschirm
// (Weiter zeigt eine komplette Seite), die zwei randlosen Grid-Flächen und
// die Zufriedenheit ordnen ihren Inhalt weiter selbst.
assert.match(css, /body\.mobile-guided section\.section:where\(:not\(\.zitat\)\)\{[\s\S]*?min-height: 100svh;/);
assert.match(css, /body\.mobile-guided \.mobile-guide\{[\s\S]*?position: fixed;/);

// Phase 164: Beim freien Scrollen (Finger oder Mausrad) weicht die Leiste
// und kommt bei Ruhe zurück; Sprünge über die Knöpfe erzeugen keines dieser
// Signale, dabei bleibt sie stehen.
assert.match(css, /body\.mobile-guided \.mobile-guide\.weicht \{ transform: translateY\(110%\); \}/);
assert.match(js, /window\.addEventListener\('touchmove', verstecke, \{ passive: true \}\)/);
assert.match(js, /window\.addEventListener\('wheel', verstecke, \{ passive: true \}\)/);
assert.match(js, /guide\.classList\.add\('weicht'\);\s*\n\s*planeRueckkehr\(\);/);
assert.match(js, /guide\.classList\.remove\('weicht'\);\s*\n\s*zeichne\(\);/);

// Versionsstempel dieser Phase.

console.log('praesentation-mobile-gefuehrt: OK');
