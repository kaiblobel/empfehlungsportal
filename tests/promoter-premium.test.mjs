import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [listHtml, detailHtml, promoterCss, dashboardJs, detailJs, config, sw] = await Promise.all([
  read('dashboard/empfehler.html'),
  read('dashboard/promoter.html'),
  read('css/promoter-dashboard.css'),
  read('js/dashboard.js'),
  read('js/promoter-detail.js'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(listHtml, /class="has-app-nav promoter-page"/);
assert.match(listHtml, /Dein Empfehlungsnetzwerk/);
assert.match(listHtml, /id="networkSummary"/);
assert.match(listHtml, /id="promoterChampions"/);
assert.match(listHtml, /id="promoterPodium"/);
assert.match(listHtml, /id="promoterSearch"/);
assert.match(listHtml, /data-sort="aktuell"/);
assert.match(listHtml, /class="promoter-card feed-row"/);
assert.match(listHtml, /function renderSummary\(\)/);
assert.match(listHtml, /function renderPodium\(\)/);
assert.match(listHtml, /function relativeDate\(value\)/);
assert.match(listHtml, /function impulsText\(gesamt, kunden, ziel\)/);
assert.match(listHtml, /Rechtsklick/);
assert.match(listHtml, /promoter-dashboard\.css\?v=2/);

const inlineModule = [...listHtml.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].at(-1)?.[1] || '';
const parseableModuleBody = inlineModule.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?/g, '');
assert.doesNotThrow(() => new Function(parseableModuleBody));

assert.match(dashboardJs, /ziel_stufe, created_at/);
assert.match(dashboardJs, /status, created_at/);
assert.match(dashboardJs, /letzte_aktivitaet/);

assert.match(detailHtml, /class="has-app-nav promoter-detail-page"/);
assert.match(detailHtml, /promoter-detail-content/);
assert.match(detailHtml, /promoter-detail\.js\?v=6/);
assert.match(detailJs, /pd-profile-hero/);
assert.match(detailJs, /pd-layout/);
assert.match(detailJs, /Kontakt und Beziehungspflege/);
assert.match(detailJs, /id="pdEditToggle"/);
assert.match(detailJs, /id="pdInvite"/);
assert.match(detailJs, /id="pdZiel"/);
assert.match(detailJs, /updateEmpfehler\(id, fields\)/);
assert.match(detailJs, /navigator\.clipboard\.writeText/);

assert.match(promoterCss, /\.promoter-grid/);
assert.match(promoterCss, /\.pr-champions/);
assert.match(promoterCss, /\.pr-podium-place\.rank-1/);
assert.match(promoterCss, /\.pd-layout/);
assert.match(promoterCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(promoterCss, /@media \(max-width: 540px\)/);

assert.match(config, /v1\.185 Beta/);
assert.match(config, /Phase 159 · 60-Sekunden-Modus/);
assert.match(sw, /CACHE_VERSION = 'v144-2026-08-06'/);
assert.match(sw, /promoter-dashboard\.css\?v=2/);

console.log('promoter-premium: OK');
