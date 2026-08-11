import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, nav, config, sw] = await Promise.all([
  read('dashboard/empfehlungen.html'),
  read('css/dashboard.css'),
  read('js/nav.js'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(html, /class="has-app-nav emp-page"/);
assert.match(html, /Wartet auf dich/);
assert.match(html, /id="priorityList"/);
assert.match(html, /Name, Telefon oder Promoter suchen/);
assert.match(html, /Empfehlungsmanagement/);
assert.match(html, /\['interessiert', 'Interesse'\]/);
assert.match(html, /function effectiveStatus\(r\)/);
assert.match(html, /r\.interessiert \|\| r\.interessiert_at/);
assert.match(html, /whatsappLink\(phone\)/);
assert.match(html, /class="ep-row feed-row"/);
assert.match(html, /Rechtsklick/);
assert.match(html, /dashboard\.css\?v=49/);
assert.match(html, /nav\.js\?v=60/);

const inlineModule = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].at(-1)?.[1] || '';
const parseableModuleBody = inlineModule.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?/g, '');
assert.doesNotThrow(() => new Function(parseableModuleBody));

assert.match(css, /\.ep-priority-grid/);
assert.match(css, /\.ep-workbar/);
assert.match(css, /\.ep-row/);
assert.match(css, /\.ep-intro \.h-label \{[\s\S]*?text-transform: uppercase/);
assert.match(css, /\.ep-action\.primary \{[\s\S]*?background: var\(--accent-bg\)/);
assert.match(css, /@media \(max-width: 540px\)/);

const recommendationItem = nav.match(/\{ id: 'empfehlungen',[\s\S]*?\},/)?.[0] || '';
assert.doesNotMatch(recommendationItem, /subs:/);
assert.match(nav, /id: 'programm'[\s\S]*?subs:/);

assert.match(config, /v1\.217 Beta/);
assert.match(config, /Phase 191 · Exklusiver KIDZ-Elternabend/);
assert.match(sw, /CACHE_VERSION = 'v176-2026-08-12b'/);
assert.match(sw, /dashboard\.css\?v=49/);
assert.match(sw, /nav\.js\?v=60/);

console.log('empfehlungen-premium: OK');
