import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, config, sw] = await Promise.all([
  readFile(new URL('../hub.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/hub.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
]);

assert.match(html, /css\/hub\.css\?v=51/);
assert.match(html, /id="hHeroLines"/);
assert.match(html, /id="hTimeline"/);
assert.match(html, /id="kpiEmpfehler"/);
assert.match(html, /id="kpiKlicks"/);
assert.match(html, /id="kpiGesamt"/);
assert.match(html, /id="kpiKunden"/);

assert.match(css, /Phase 150 · HUB-Leichtigkeit/);
assert.match(css, /body\[data-page="hub"\] \.h-live/);
assert.match(css, /#3F9B55/);
assert.match(css, /body\[data-page="hub"\] \.h-badge-new/);
assert.match(css, /color: #3F8A50 !important/);
assert.match(css, /body\[data-page="hub"\] \.h-network-overview \.h-kpi/);
assert.match(css, /box-shadow: none !important/);
assert.match(css, /body\[data-page="hub"\] \.h-activity-row/);
assert.match(css, /border-bottom: 1px solid #E7E4DE !important/);
assert.match(css, /background: #F8F8F6/);
assert.match(css, /@media \(max-width: 560px\)/);

assert.match(config, /APP_VERSION = 'v1\.176 Beta'/);
assert.match(config, /Phase 150 · Leichterer Premium-HUB/);
assert.match(sw, /CACHE_VERSION = 'v134-2026-08-05'/);
assert.match(sw, /\/css\/hub\.css\?v=51/);

console.log('hub-leichtigkeit: OK');
