import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Potenzialbuch bleibt fachlich von Empfehlungen und Prämien getrennt', async () => {
  const [pageLogic, migration] = await Promise.all([
    read('js/potenziale.js'),
    read('schema-phase167.sql'),
  ]);
  const forbidden = ['empfehlungen', 'empfehler', 'praemien', 'kpi_snapshots', 'kpi_trend', 'momentum'];
  for (const name of forbidden) {
    assert.equal(pageLogic.includes(`from('${name}')`), false, `Seitenlogik greift auf ${name} zu`);
    assert.equal(migration.includes(`alter table public.${name}`), false, `Migration verändert ${name}`);
  }
});

test('Migration erzwingt Beratertrennung und sperrt anonyme Zugriffe', async () => {
  const sql = await read('schema-phase167.sql');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all on table public\.potenziale from public, anon/i);
  assert.match(sql, /to authenticated/i);
  assert.equal((sql.match(/berater_id = \(select public\.current_berater_id\(\)\)/g) || []).length, 5);
  assert.match(sql, /for update to authenticated[\s\S]*using[\s\S]*with check/i);
});

test('Navigation führt das Potenzialbuch nur im vollständigen Menü', async () => {
  const nav = await read('js/nav.js');
  assert.match(nav, /id: 'potenziale'[\s\S]*dashboard\/potenziale\.html/);
  assert.match(nav, /\['dashboard', 'empfehlungen', 'champions'\]\.includes\(it\.id\)/);
  assert.doesNotMatch(nav, /\['dashboard', 'empfehlungen', 'champions', 'potenziale'\]/);
});

test('Neue Seite hat eindeutige IDs und die kontrollierte Cockpit-Bestätigung', async () => {
  const html = await read('dashboard/potenziale.html');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML enthält doppelte IDs');
  assert.match(html, /Daten kopieren und Cockpit öffnen/);
  assert.match(html, /Im Cockpit angelegt/);
  assert.match(html, /value="uebernommen" disabled/);
});

test('Responsive Regeln und Tippziele sind für das iPhone vorbereitet', async () => {
  const css = await read('css/potenziale.css');
  assert.match(css, /@media \(max-width:600px\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(css, /backdrop-filter|glassmorphism|neon/i);
});

test('Service-Worker verweist nur auf vorhandene lokale Dateien', async () => {
  const worker = await read('sw.js');
  const shellBlock = worker.match(/const SHELL_URLS = \[([\s\S]*?)\];/)?.[1] || '';
  const urls = [...shellBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  for (const url of urls) {
    const path = url.split('?')[0].replace(/^\//, '');
    await access(new URL(`../${path}`, import.meta.url));
  }
  assert.ok(urls.includes('/dashboard/potenziale.html'));
  assert.ok(urls.includes('/js/potenziale-utils.mjs'));
});
