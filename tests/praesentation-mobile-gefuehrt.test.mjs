import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css, config, sw] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('css/programm.css'),
  read('js/config.js'),
  read('sw.js'),
]);

// Die Leiste im Markup: echte Buttons, sprechende aria-Labels,
// Fortschritt mit aria-live.
assert.match(html, /<nav class="mobile-guide" id="mobileGuide" hidden aria-label="Geführte Navigation durch die Präsentation">/);
assert.match(html, /<button class="mobile-guide-btn mobile-guide-prev" id="mobileGuidePrev" type="button" aria-label="Zurück zum vorherigen Abschnitt">Zurück<\/button>/);
assert.match(html, /<span class="mobile-guide-progress" id="mobileGuideProgress" aria-live="polite">/);
assert.match(html, /<button class="mobile-guide-btn mobile-guide-next" id="mobileGuideNext" type="button" aria-label="Weiter zum nächsten Abschnitt">Weiter<\/button>/);

// Abschnittsbestand unverändert: 14 Abschnitte, 6 davon vertiefend.
// Die Führung zählt dynamisch — diese Zahlen stehen NICHT in der Logik.
assert.equal((html.match(/<section class="section/g) || []).length, 14);
assert.equal((html.match(/data-short-hide/g) || []).length, 6);

// Abfragekennungen dieser Phase.
assert.match(html, /css\/programm\.css\?v=90/);
assert.match(html, /js\/programm\.js\?v=50/);

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
assert.match(css, /body\.mobile-guided \.mobile-guide \{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;/);
assert.match(css, /calc\(10px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(css, /body\.mobile-guided \.sticky-cta \{ display: none; \}/);
assert.match(css, /body\.mobile-guided \.hero-cta-stack \{ display: none; \}/);
assert.match(css, /body\.mobile-guided \.cta-top \{ display: none; \}/);

// Vollbild-Einstieg und Zufriedenheits-Abschnitt: svh mit vh-Rückfall,
// Porträt vollständig, Skala als zwei Fünferreihen.
assert.match(css, /body\.mobile-guided \.hero\.hero-split \{[\s\S]*?min-height: 100svh;/);
assert.match(css, /body\.mobile-guided \.hero-split-image \.hero-portrait \{[\s\S]*?max-height: 36svh;/);
assert.match(css, /body\.mobile-guided \.pre-hero \{ min-height: 100vh; min-height: 100svh; \}/);
assert.match(css, /body\.mobile-guided \.nps-scale \{ grid-template-columns: repeat\(5, 1fr\)/);

// Kein verpflichtendes Scroll-Einrasten — nirgends, auch nicht auf dem Handy.
assert.doesNotMatch(css, /scroll-snap-type:\s*y\s+mandatory/);

// Phase 164: Jeder Abschnitt füllt in der Führung mindestens den Bildschirm
// (Weiter zeigt eine komplette Seite), die zwei randlosen Grid-Flächen und
// die Zufriedenheit ordnen ihren Inhalt weiter selbst.
assert.match(css, /body\.mobile-guided section\.section:where\(:not\(\.pre-hero\)\) \{[\s\S]*?min-height: 100svh;/);
assert.match(css, /:where\(:not\(\.pre-hero\):not\(\.promoter-message\):not\(\.foerder-rechner\)\)/);

// Phase 164: Beim freien Scrollen (Finger oder Mausrad) weicht die Leiste
// und kommt bei Ruhe zurück; Sprünge über die Knöpfe erzeugen keines dieser
// Signale, dabei bleibt sie stehen.
assert.match(css, /body\.mobile-guided \.mobile-guide\.weicht \{ transform: translateY\(110%\); \}/);
assert.match(js, /window\.addEventListener\('touchmove', verstecke, \{ passive: true \}\)/);
assert.match(js, /window\.addEventListener\('wheel', verstecke, \{ passive: true \}\)/);
assert.match(js, /guide\.classList\.add\('weicht'\);\s*\n\s*planeRueckkehr\(\);/);
assert.match(js, /guide\.classList\.remove\('weicht'\);\s*\n\s*zeichne\(\);/);

// Versionsstempel dieser Phase.
assert.match(config, /APP_VERSION = 'v1\.190 Beta'/);
assert.match(config, /Phase 164 · Mobile Führung: volle Seiten, weichende Leiste/);
assert.match(sw, /CACHE_VERSION = 'v149-2026-08-09b'/);

console.log('praesentation-mobile-gefuehrt: OK');
