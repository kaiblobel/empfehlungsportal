/**
 * Phase 209 · Anmeldeadresse sichtbar, Admin-Sicht gekennzeichnet
 *
 * Zwei Dinge, die aus derselben Frage entstanden sind: In der Beraterkarte
 * stand nur die Geschäftsadresse, dadurch sah es aus, als wäre das auch die
 * Anmeldung. Und das Admin-Recht zeigt an mehreren Stellen das ganze Portal,
 * ohne dass es dort steht.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

const [migration, supabaseJs, beraterAdmin, hubCss, dashboardCss,
       praemienHtml, kidzGewinnHtml, kidzElternHtml,
       kidzGewinnJs, kidzElternJs, dashboardJs] = await Promise.all([
  lies('schema-phase209-anmelde-email.sql'),
  lies('js/supabase.js'),
  lies('js/berater-admin.js'),
  lies('css/hub.css'),
  lies('css/dashboard.css'),
  lies('praemien.html'),
  lies('dashboard/kidz-gewinnspiel.html'),
  lies('dashboard/kidz-elternabend.html'),
  lies('js/kidz-gewinnspiel-admin.js'),
  lies('js/kidz-elternabend-admin.js'),
  lies('js/dashboard.js'),
]);

/* --- 1) Die Funktion ist eng gebaut --- */

// Sie ist der erste lesende Zugriff auf auth.users im ganzen Portal.
assert.match(migration, /create or replace function public\.berater_login_emails\(\)/);
assert.match(migration, /security definer/);
assert.match(migration, /set search_path to 'public', 'auth', 'pg_temp'/);

const fn = migration.match(/create or replace function public\.berater_login_emails[\s\S]*?\$function\$;/);
assert.ok(fn, 'Die Funktion fehlt in der Migration.');

// Die Adminprüfung muss VOR dem Lesezugriff stehen, nicht irgendwo danach.
assert.ok(
  fn[0].indexOf('is_current_berater_admin()') < fn[0].indexOf('auth.users'),
  'Die Funktion liest auth.users, bevor sie das Admin-Recht prüft.',
);

// Datensparsam: nur Abweichungen verlassen die Datenbank, und Groß- und
// Kleinschreibung ist keine Abweichung (sonst meldet Max Kudlek eine).
assert.match(
  fn[0],
  /lower\(btrim\(coalesce\(u\.email, ''\)\)\) is distinct from lower\(btrim\(coalesce\(b\.email, ''\)\)\)/,
  'Die Funktion gibt auch Adressen zurück, die gar nicht abweichen.',
);

// Lehre aus Phase 198: revoke from public allein wirkt in Supabase nicht.
assert.match(migration, /revoke execute on function public\.berater_login_emails\(\) from anon, public;/);
assert.match(migration, /grant execute on function public\.berater_login_emails\(\) to authenticated;/);

/* --- 2) Der Zugriff im Frontend ist gutmütig --- */

assert.match(supabaseJs, /export async function getBeraterLoginEmails/);
const zugriff = supabaseJs.match(/export async function getBeraterLoginEmails[\s\S]*?\n}/);
assert.ok(zugriff, 'getBeraterLoginEmails fehlt.');
assert.match(zugriff[0], /catch/, 'Ohne Fangnetz bricht die ganze Beraterliste, wenn die Funktion fehlt.');

// tests/berater-password-flow.test.mjs verbietet diesen Bezeichner.
assert.doesNotMatch(supabaseJs, /adminSetBeraterPassword/);
assert.doesNotMatch(beraterAdmin, /adminSetBeraterPassword/);

/* --- 3) Die Karte zeigt die Anmeldeadresse, ohne beim Speichern zu stören --- */

assert.match(beraterAdmin, /getBeraterLoginEmails/, 'Die Liste lädt die Adressen nicht.');
assert.match(beraterAdmin, /berater-summary-login/, 'In der Karte fehlt die Zeile.');
assert.match(beraterAdmin, /Anmeldung: /, 'Die Zeile ist nicht als Anmeldung bezeichnet.');
assert.match(hubCss, /\.berater-summary-login\s*\{/, 'Für die Zeile fehlt der Stil.');

// Die Zeile darf kein data-f tragen: Die Speicherroutine sammelt alle
// [data-f]-Elemente ein, ein zweites data-f="email" würde beim Speichern die
// Geschäftsadresse überschreiben.
const kartenBlock = beraterAdmin.slice(
  beraterAdmin.indexOf('function renderCard'),
  beraterAdmin.indexOf('function attachHandlers'),
);
const anmeldeZeile = kartenBlock.match(/[^\n]*berater-summary-login[^\n]*/);
assert.ok(anmeldeZeile, 'Die Anmeldezeile steht nicht in renderCard.');
assert.doesNotMatch(
  anmeldeZeile[0],
  /data-f=/,
  'Die Anmeldezeile trägt ein data-f und würde beim Speichern die Geschäftsadresse überschreiben.',
);

// Die Adressen müssen an den Beratern hängen, BEVOR die Karten gebaut werden.
const listenBlock = beraterAdmin.slice(
  beraterAdmin.indexOf('async function renderList'),
  beraterAdmin.indexOf('/* ---------- Phase 208'),
);
assert.ok(
  listenBlock.indexOf('getBeraterLoginEmails') < listenBlock.indexOf('data.map(renderCard)'),
  'Die Adressen werden erst nach dem Bauen der Karten geladen, dann kommen sie nie an.',
);

/* --- 4) Wo die Admin-Sicht mehr zeigt, steht es dabei --- */

assert.match(dashboardCss, /\.admin-sicht-hinweis\s*\{/, 'Für den Hinweis fehlt der Stil.');

// Prämien: die Seite ist ohnehin nur für Admins, der Hinweis steht fest.
assert.match(praemienHtml, /class="admin-sicht-hinweis"/, 'Auf der Prämienseite fehlt der Hinweis.');
assert.match(praemienHtml, /alle Prämien des Portals/);

// KIDZ: dort sehen normale Berater ihre eigenen Daten, der Hinweis ist
// deshalb versteckt und wird nur für Admins eingeblendet.
for (const [name, html, js] of [
  ['Gewinnspiel', kidzGewinnHtml, kidzGewinnJs],
  ['Elternabend', kidzElternHtml, kidzElternJs],
]) {
  assert.match(html, /id="adminSichtHinweis"[^>]*hidden/,
    `KIDZ ${name}: Der Hinweis ist nicht versteckt und stünde auch bei normalen Beratern.`);
  assert.match(js, /adminSichtHinweis[\s\S]{0,120}currentAdvisor\?\.ist_admin/,
    `KIDZ ${name}: Der Hinweis wird nicht am Admin-Status eingeblendet.`);
}

/* --- 5) Der Admin-Status kommt überhaupt im Browser an --- */

assert.match(
  dashboardJs,
  /ist_admin/,
  'getCurrentBerater lädt ist_admin nicht mit, dann bleibt der Hinweis immer versteckt.',
);

console.log('admin-sicht: OK');
