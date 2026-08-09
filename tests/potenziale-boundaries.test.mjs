import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Potenzialbuch bleibt fachlich von Empfehlungen und Prämien getrennt', async () => {
  const [pageLogic, migration, strengthMigration] = await Promise.all([
    read('js/potenziale.js'),
    read('schema-phase167.sql'),
    read('schema-phase168.sql'),
  ]);
  const forbidden = ['empfehlungen', 'empfehler', 'praemien', 'kpi_snapshots', 'kpi_trend', 'momentum'];
  for (const name of forbidden) {
    assert.equal(pageLogic.includes(`from('${name}')`), false, `Seitenlogik greift auf ${name} zu`);
    assert.equal(migration.includes(`alter table public.${name}`), false, `Migration verändert ${name}`);
    assert.equal(strengthMigration.includes(`alter table public.${name}`), false, `Kontaktstärke-Migration verändert ${name}`);
  }
});

test('Migration erzwingt Beratertrennung und sperrt anonyme Zugriffe', async () => {
  const sql = await read('schema-phase167.sql');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all on table public\.potenziale from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.potenziale to authenticated/i);
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
  assert.match(html, /Kontakt mit dem Cockpit verbinden/);
  assert.match(html, /Eine Verbindung nur anhand des Namens gibt es nicht/);
  assert.match(html, /Das Cockpit führt ab jetzt Interessent, Kunde und Altkunde/);
  assert.match(html, /Kundenakte im Cockpit öffnen/);
  assert.match(html, /value="uebernommen" disabled/);
  assert.equal((html.match(/data-strength-filter=/g) || []).length, 6);
  assert.match(html, /Mehrfachauswahl möglich/);
  assert.match(html, /Direkt erreichbar/);
});

test('Kontaktstärke-Migration ist additiv und begrenzt Tabellenrechte erneut', async () => {
  const sql = await read('schema-phase168.sql');
  assert.match(sql, /add column if not exists kreise text\[\]/i);
  assert.match(sql, /add column if not exists beziehungsnaehe/i);
  assert.match(sql, /add column if not exists kontakthaeufigkeit/i);
  assert.match(sql, /add column if not exists direkt_erreichbar boolean/i);
  assert.match(sql, /add column if not exists kontaktstaerke_override/i);
  assert.match(sql, /revoke all on table public\.potenziale from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.potenziale to authenticated/i);
  assert.doesNotMatch(sql, /drop table|drop column|delete from public\.potenziale/i);
});

test('Kontakt-Coach speichert nur geprüfte Strukturen im privaten Beraterbereich', async () => {
  const [sql, page, api] = await Promise.all([
    read('schema-phase170.sql'), read('dashboard/potenziale.html'), read('api/potenzial-coach.js'),
  ]);
  assert.match(sql, /add column if not exists kontaktbild jsonb/i);
  assert.match(sql, /add column if not exists gespraechsvorbereitung jsonb/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all on table public\.potenziale from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /add column[^;]*(audio|transkript)/i);
  assert.doesNotMatch(sql, /alter table public\.(empfehlungen|empfehler|praemien)/i);
  assert.match(page, /Erst dein Klick auf „Kontakt speichern“ übernimmt die Angaben/);
  assert.match(page, /Vermutungen bleiben sichtbar getrennt/);
  assert.match(api, /store: false/);
  assert.match(api, /auth\/v1\/user/);
});

test('Kontaktstärke zeigt fünf ruhige Symbole und bleibt als Beziehungsstärke erklärt', async () => {
  const [logic, css] = await Promise.all([read('js/potenziale.js'), read('css/potenziale.css')]);
  for (const symbol of ['snowflake', 'cloud-sun', 'sun', 'flame', 'flame-spark']) assert.match(logic, new RegExp(symbol));
  for (const strength of ['kalt', 'lauwarm', 'warm', 'heiss', 'sehr_heiss']) assert.match(css, new RegExp(`data-strength=\\"${strength}\\"`));
  assert.match(logic, /Beziehungsstärke, nicht das Kaufinteresse/);
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
