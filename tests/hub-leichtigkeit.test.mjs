import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, dashboardCss, dnaCss, nav, manifest, sw] = await Promise.all([
  readFile(new URL('../hub.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/hub.css', import.meta.url), 'utf8'),
  readFile(new URL('../css/dashboard.css', import.meta.url), 'utf8'),
  readFile(new URL('../css/dna.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/nav.js', import.meta.url), 'utf8'),
  readFile(new URL('../manifest.json', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
]);

// Seit Phase 268 steht jede Farbe des Beraterbereichs in css/dna.css.
// Diese Datei muss auf dem Hub geladen sein, sonst bleibt er creme.
assert.match(html, /css\/dna\.css\?v=\d+/);

assert.match(html, /css\/hub\.css\?v=\d+/);
assert.match(html, /id="hHeroLines"/);
assert.match(html, /id="hTimeline"/);
assert.match(html, /id="kpiEmpfehler"/);
assert.match(html, /id="kpiKlicks"/);
assert.match(html, /id="kpiGesamt"/);
assert.match(html, /id="kpiKunden"/);
assert.doesNotMatch(html, /Schnellaktion/);
assert.doesNotMatch(html, /class="h-action-primary"/);
assert.match(html, /<title>Empfehlungsportal · Kai Blobel<\/title>/);
assert.match(html, /css\/dashboard\.css\?v=\d+/);
assert.match(html, /js\/nav\.js\?v=\d+/);
assert.doesNotMatch(html, /Regionaldirektion · Hub/);

assert.match(nav, /nav-brand-name">Empfehlungsportal/);
assert.match(nav, /nav-brand-signature/);
assert.match(nav, /Regionaldirektion/);
assert.match(nav, /Kai Blobel &amp; Team/);
assert.match(dashboardCss, /\.nav-brand-signature/);
// Die Schreibschrift steht in dashboard.css noch als Rueckfallebene, wird
// aber von css/dna.css ueberschrieben: sie gibt es nur auf Windows.
assert.match(dnaCss, /\.nav-brand-signature/);
assert.match(dnaCss, /font-family: var\(--font-sans\)/);
assert.match(manifest, /"short_name": "Empfehlungsportal"/);

assert.match(css, /Phase 150 · HUB-Leichtigkeit/);
assert.match(css, /body\[data-page="hub"\] \.h-live/);
assert.match(css, /body\[data-page="hub"\] \.h-live \{[^}]*color: var\(--sage-dark\)/);
assert.match(css, /body\[data-page="hub"\] \.h-badge-new/);
assert.match(css, /color: var\(--sage-dark\) !important/);
assert.match(css, /body\[data-page="hub"\] \.h-network-overview \.h-kpi/);
assert.match(css, /box-shadow: none !important/);
assert.match(css, /body\[data-page="hub"\] \.h-activity-row/);
assert.match(css, /padding: 14px 2px !important/);
assert.match(css, /border-bottom: 1px solid var\(--surface-2\) !important/);
assert.match(css, /background: var\(--bg\)/);
assert.match(css, /@media \(max-width: 560px\)/);

assert.match(sw, /\/css\/hub\.css\?v=\d+/);
assert.match(sw, /\/css\/dashboard\.css\?v=\d+/);
assert.match(sw, /\/js\/nav\.js\?v=\d+/);

console.log('hub-leichtigkeit: OK');
