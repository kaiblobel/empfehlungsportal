import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, js, config, sw] = await Promise.all([
  readFile(new URL('../dashboard/detail.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/empfehlung-detail.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/empfehlung-detail.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
]);

assert.match(html, /class="has-app-nav emp-detail-page"/);
assert.match(html, /css\/empfehlung-detail\.css\?v=1/);
assert.match(html, /js\/empfehlung-detail\.js\?v=1/);
assert.match(html, /class="app-content ed-content"/);
assert.doesNotMatch(html, /class="detail-info"/);

assert.match(css, /\.ed-hero\s*\{/);
assert.match(css, /\.ed-summary\s*\{/);
assert.match(css, /\.ed-layout\s*\{/);
assert.match(css, /\.ed-timeline\s*\{/);
assert.match(css, /position:\s*sticky/);
assert.match(css, /@media \(max-width: 540px\)/);

assert.match(js, /loadDetail/);
assert.match(js, /updateStatus/);
assert.match(js, /deleteEmpfehlung/);
assert.match(js, /whatsappLink/);
assert.match(js, /navigator\.clipboard\.writeText/);
assert.match(js, /empfehler_score/);
assert.match(js, /id="statusSel"/);
assert.match(js, /id="notizArea"/);
assert.match(js, /Nächster sinnvoller Schritt/);
assert.match(js, /Verwaltung anzeigen/);

assert.match(config, /APP_VERSION = 'v1\.219 Beta'/);
assert.match(config, /Phase 199 · KIDZ Ballschätzen und Nacherfassung/);
assert.match(sw, /CACHE_VERSION = 'v178-2026-08-12-phase199'/);
assert.match(sw, /\/css\/empfehlung-detail\.css\?v=1/);
assert.match(sw, /\/js\/empfehlung-detail\.js\?v=1/);

console.log('Empfehlungsdetail-Premiumtests bestanden.');
