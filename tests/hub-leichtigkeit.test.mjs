import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, dashboardCss, nav, manifest, config, sw] = await Promise.all([
  readFile(new URL('../hub.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/hub.css', import.meta.url), 'utf8'),
  readFile(new URL('../css/dashboard.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/nav.js', import.meta.url), 'utf8'),
  readFile(new URL('../manifest.json', import.meta.url), 'utf8'),
  readFile(new URL('../js/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
]);

assert.match(html, /css\/hub\.css\?v=52/);
assert.match(html, /id="hHeroLines"/);
assert.match(html, /id="hTimeline"/);
assert.match(html, /id="kpiEmpfehler"/);
assert.match(html, /id="kpiKlicks"/);
assert.match(html, /id="kpiGesamt"/);
assert.match(html, /id="kpiKunden"/);
assert.doesNotMatch(html, /Schnellaktion/);
assert.doesNotMatch(html, /class="h-action-primary"/);
assert.match(html, /<title>Empfehlungsportal · Kai Blobel<\/title>/);
assert.match(html, /css\/dashboard\.css\?v=48/);
assert.match(html, /js\/nav\.js\?v=57/);
assert.doesNotMatch(html, /Regionaldirektion · Hub/);

assert.match(nav, /nav-brand-name">Empfehlungsportal/);
assert.match(nav, /nav-brand-signature/);
assert.match(nav, /Regionaldirektion/);
assert.match(nav, /Kai Blobel &amp; Team/);
assert.match(dashboardCss, /\.nav-brand-signature/);
assert.match(dashboardCss, /"Segoe Script"/);
assert.match(manifest, /"short_name": "Empfehlungsportal"/);

assert.match(css, /Phase 150 · HUB-Leichtigkeit/);
assert.match(css, /body\[data-page="hub"\] \.h-live/);
assert.match(css, /#3F9B55/);
assert.match(css, /body\[data-page="hub"\] \.h-badge-new/);
assert.match(css, /color: #3F8A50 !important/);
assert.match(css, /body\[data-page="hub"\] \.h-network-overview \.h-kpi/);
assert.match(css, /box-shadow: none !important/);
assert.match(css, /body\[data-page="hub"\] \.h-activity-row/);
assert.match(css, /padding: 14px 2px !important/);
assert.match(css, /border-bottom: 1px solid #ECEAE5 !important/);
assert.match(css, /background: #F8F8F6/);
assert.match(css, /@media \(max-width: 560px\)/);

assert.match(config, /APP_VERSION = 'v1\.189 Beta'/);
assert.match(config, /Phase 163 · Geführte mobile Präsentation/);
assert.match(sw, /CACHE_VERSION = 'v148-2026-08-09'/);
assert.match(sw, /\/css\/hub\.css\?v=52/);
assert.match(sw, /\/css\/dashboard\.css\?v=48/);
assert.match(sw, /\/js\/nav\.js\?v=57/);

console.log('hub-leichtigkeit: OK');
