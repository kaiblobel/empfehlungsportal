import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css, nav, config, sw] = await Promise.all([
  read('dashboard/overview.html'),
  read('js/analysen.js'),
  read('css/analysen.css'),
  read('js/nav.js'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(html, /<title>Analysen · Empfehlungsportal<\/title>/);
assert.match(html, /data-days="7"/);
assert.match(html, /data-days="30" class="active"/);
assert.match(html, /data-days="90"/);
assert.match(html, /Zeitraum im Vergleich/);
assert.match(html, /Entwicklung über Zeit/);
assert.match(html, /data-metric="promoters"/);
assert.match(html, /data-metric="clicks"/);
assert.match(html, /data-metric="referrals"/);
assert.match(html, /data-metric="customers"/);
assert.match(html, /data-chart-mode="relative"/);
assert.match(html, /Umwandlung/);
assert.match(html, /Themenerfolg/);
assert.match(html, /Promoterquellen/);
assert.match(html, /js\/analysen\.js\?v=2/);
assert.match(html, /css\/analysen\.css\?v=2/);
assert.match(html, /js\/nav\.js\?v=57/);

assert.match(js, /getCurrentBerater\(\)/);
assert.match(js, /getVorlagenPublic\(advisor\?\.id \|\| null\)/);
assert.match(js, /previousStart\.toISOString\(\)/);
assert.match(js, /periodEnd\.toISOString\(\)/);
assert.match(js, /time >= previousStart\.getTime\(\) && time < currentStart\.getTime\(\)/);
assert.match(js, /requestId !== loadRequest/);
assert.match(js, /renderKpis\(current, previous, currentDays\)/);
assert.match(js, /loadTrendRows\(currentDays\)/);
assert.match(js, /supabase\.rpc\('kpi_trend_daily'/);
assert.match(js, /renderTrend\(\)/);
assert.match(js, /const enabledMetrics = new Set\(\['referrals', 'customers'\]\)/);
assert.match(js, /function normalizeSeries\(values\)/);
assert.match(js, /renderFunnel\(current\)/);
assert.match(js, /renderTopics\(currentRows, templateNames, currentDays\)/);
assert.match(js, /renderPromoters\(currentRows\)/);
assert.match(js, /Vorperiode noch ohne vollständige Daten/);

const selectMatch = js.match(/\.select\('([^']+)'\)/);
assert.ok(selectMatch, 'Die Analysedaten müssen mit einer expliziten Feldauswahl geladen werden');
const selectedFields = selectMatch[1].split(',');
for (const forbidden of ['empfaenger_name', 'empfaenger_telefon', 'empfehler_email', 'empfehler_telefon', 'nachricht', 'notiz']) {
  assert.ok(!selectedFields.includes(forbidden), `${forbidden} darf nicht in die Analyse geladen werden`);
}
for (const required of ['created_at', 'link_klicks', 'link_geoeffnet', 'interessiert', 'status', 'vorlage_slug', 'empfehler_id', 'empfehler_name']) {
  assert.ok(selectedFields.includes(required), `${required} fehlt in der Analysedatenbasis`);
}

assert.match(css, /\.analysis-kpis/);
assert.match(css, /\.analysis-upper-grid/);
assert.match(css, /\.analysis-topic-list/);
assert.match(css, /\.analysis-promoter-list/);
assert.match(css, /\.analysis-metric-toggles/);
assert.match(css, /\.analysis-chart-mode/);
assert.match(css, /@media \(max-width:600px\)/);

assert.match(nav, /id: 'analysen',[\s\S]*?href: path\('dashboard\/overview\.html'\)/);
assert.match(config, /v1\.188 Beta/);
assert.match(config, /Phase 161 · Mandantenschutz für Promoter-Empfehlungen/);
assert.match(sw, /CACHE_VERSION = 'v147-2026-08-08'/);
assert.match(sw, /'\/dashboard\/overview\.html'/);
assert.match(sw, /'\/css\/analysen\.css\?v=2'/);
assert.match(sw, /'\/js\/analysen\.js\?v=2'/);

console.log('analysen-echt: OK');
