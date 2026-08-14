import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../baufi.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/baufi.js', import.meta.url), 'utf8');

for (const label of ['Vorhaben', 'Bankenvergleich', 'Förderungen', 'Finanzierungsmodell', 'Termin']) {
  assert.ok(html.includes(`>${label}<`), `Schnellnavigation ohne ${label}`);
}

assert.match(html, /id="bankvergleich"/);
assert.match(html, /id="finanzierungsmodell"/);
assert.match(html, /data-open-funding/);
assert.match(html, /querySelectorAll\('\[data-open-funding\]'\)/);
assert.match(js, /function initSectionNavigation\(\)/);
assert.match(js, /aria-current/);
assert.match(js, /window\.innerWidth <= 520/);
assert.match(js, /Nicht der günstigste Zins entscheidet\./);
assert.match(js, /Die richtige Strategie\./);

console.log('baufi-schnellnavigation: OK');
