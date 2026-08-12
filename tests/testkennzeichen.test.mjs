/**
 * Phase 208 · Testdaten sind als Test gekennzeichnet
 *
 * Der Kern: "Test oder echt?" ist keine Frage der Namensgebung mehr, sondern
 * eine Spalte, die die Datenbank selbst pflegt und weitergibt.
 *
 * Der wichtigste Teil dieses Tests ist der Wächter am Ende. Er sorgt dafür,
 * dass eine neue Abfrage auf die betroffenen Tabellen sich zum Kennzeichen
 * verhalten MUSS: entweder Testdaten herausfiltern (Kennzahl) oder das
 * Kennzeichen mitlesen (Liste). Ohne ihn schleicht sich die alte Lage über
 * das nächste Feature wieder ein.
 */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

const [migration, migrationB, hub, dashboard, analysen, cmdk, supabaseJs,
       beraterAdmin, beraterHtml, empfehlerHtml, empfehlungenHtml,
       kidzGewinn, kidzEltern, css] = await Promise.all([
  lies('schema-phase208-testkennzeichen.sql'),
  lies('schema-phase208b-testdaten-kennzahlen.sql'),
  lies('js/hub.js'),
  lies('js/dashboard.js'),
  lies('js/analysen.js'),
  lies('js/cmdk.js'),
  lies('js/supabase.js'),
  lies('js/berater-admin.js'),
  lies('berater.html'),
  lies('dashboard/empfehler.html'),
  lies('dashboard/empfehlungen.html'),
  lies('js/kidz-gewinnspiel-admin.js'),
  lies('js/kidz-elternabend-admin.js'),
  lies('css/dashboard.css'),
]);

/* --- 1) Das Kennzeichen steht auf allen Tabellen, die es braucht --- */

for (const tabelle of ['berater', 'empfehler', 'empfehlungen', 'praemien',
                       'kidz_gewinnspiel_teilnahmen', 'kidz_elternabend_anmeldungen',
                       'potenziale']) {
  assert.match(
    migration,
    new RegExp(`alter table public\\.${tabelle}\\s*\\n\\s*add column if not exists ist_test boolean not null default false`),
    `${tabelle} bekommt kein Testkennzeichen.`,
  );
}

/* --- 2) Die Vererbung greift beim Anlegen und beim Nachträglich-Erklären --- */

assert.match(migration, /create or replace function public\.erbe_testkennzeichen\(\)/);
assert.match(migration, /create or replace function public\.ziehe_testkennzeichen_nach\(\)/);

// Der Vererbungs-Trigger muss NACH dem Trigger laufen, der die berater_id
// setzt (empfehlungen_zz_set_berater) — sonst ist sie noch leer. Postgres
// sortiert Trigger nach Namen, deshalb das zusätzliche z.
assert.match(migration, /create trigger empfehlungen_zzz_erbe_test\s*\n\s*before insert on public\.empfehlungen/);
for (const t of ['empfehler', 'praemien', 'kidz_gewinnspiel', 'kidz_elternabend', 'potenziale']) {
  assert.match(migration, new RegExp(`create trigger ${t}_zzz_erbe_test`), `Vererbung fehlt für ${t}.`);
}
assert.match(migration, /create trigger berater_zzz_ziehe_test_nach/);
assert.match(migration, /create trigger empfehler_zzz_ziehe_test_nach/);

/* --- 3) Testdaten lösen keine echten Benachrichtigungen aus --- */

// Das war bisher reine Disziplin ("vor jedem Test prüfen, welche Mails
// ausgelöst werden könnten"). Jetzt steht es im Code.
const interesse = migration.match(/create or replace function public\.notify_interesse_trigger[\s\S]*?\$function\$;/);
assert.ok(interesse, 'notify_interesse_trigger fehlt in der Migration.');
assert.ok(
  interesse[0].indexOf('IF NEW.ist_test THEN') < interesse[0].indexOf('net.http_post'),
  'notify_interesse_trigger prüft das Testkennzeichen nicht VOR dem Versand.',
);

const promoter = migration.match(/create or replace function public\.notify_promoter_created_trigger[\s\S]*?\$function\$;/);
assert.ok(promoter, 'notify_promoter_created_trigger fehlt in der Migration.');
assert.ok(
  promoter[0].indexOf('if new.ist_test then') < promoter[0].indexOf('net.http_post'),
  'notify_promoter_created_trigger prüft das Testkennzeichen nicht VOR dem Versand.',
);

const stufe = migration.match(/create or replace function public\.check_stufe_erreicht[\s\S]*?\$function\$;/);
assert.ok(stufe, 'check_stufe_erreicht fehlt in der Migration.');
assert.ok(
  stufe[0].indexOf('IF NEW.ist_test THEN') < stufe[0].indexOf('notify-stufe'),
  'check_stufe_erreicht verschickt die Stufen-Mail auch bei Testdaten.',
);
// Die Prämie soll trotzdem entstehen, sonst lässt sich die Strecke nicht testen.
assert.ok(
  stufe[0].indexOf('sync_praemien_for_empfehler') < stufe[0].indexOf('IF NEW.ist_test THEN'),
  'Bei Testdaten soll die Prämienlogik weiterlaufen, nur die Mail nicht.',
);

/* --- 4) Kennzahlen in der Datenbank rechnen ohne Testdaten --- */

for (const fn of ['snapshot_kpis_today', 'team_bestand', 'team_metrics', 'team_activity_secure']) {
  const block = migrationB.match(new RegExp(`function public\\.${fn}\\([\\s\\S]*?\\$function\\$;`));
  assert.ok(block, `${fn} fehlt in der Migration.`);
  assert.match(block[0], /ist_test/, `${fn} rechnet Testdaten mit.`);
}

// Die Führungssicht-Listen liefern das Kennzeichen mit, statt zu filtern.
for (const fn of ['team_promoter', 'team_empfehlungen', 'team_praemien', 'team_kidz']) {
  const block = migrationB.match(new RegExp(`create function public\\.${fn}\\([\\s\\S]*?\\$function\\$;`));
  assert.ok(block, `${fn} fehlt in der Migration.`);
  assert.match(block[0], /ist_test boolean\)/, `${fn} gibt das Testkennzeichen nicht zurück.`);
}

/* --- 5) Aufräumen: sichern, dann löschen, und nur als Admin --- */

const aufraeumen = migrationB.match(/function public\.testdaten_entfernen[\s\S]*?\$function\$;/);
assert.ok(aufraeumen, 'testdaten_entfernen fehlt.');
assert.match(aufraeumen[0], /is_current_berater_admin\(\)/, 'Jeder dürfte aufräumen.');
assert.match(aufraeumen[0], /TESTDATEN ENTFERNEN/, 'Es fehlt die Bestätigung.');
assert.ok(
  aufraeumen[0].indexOf('create table archiv.') < aufraeumen[0].indexOf('delete from'),
  'Es wird gelöscht, bevor gesichert ist.',
);

/* --- 6) Rechte: die Lehre aus Phase 198 --- */

// In Supabase bekommt jede neue Funktion im Schema public automatisch
// EXECUTE für anon; ein revoke from public entfernt das NICHT.
for (const fn of ['testdaten_bestand()', 'testdaten_entfernen(text)']) {
  assert.match(
    migrationB,
    new RegExp(`revoke execute on function public\\.${fn.replace(/[()]/g, '\\$&')} from anon, public;`),
    `${fn} bleibt für anonyme Aufrufer offen.`,
  );
}

/* --- 7) Die Oberfläche: anlegen, erkennen, aufräumen --- */

assert.match(empfehlerHtml, /id="newIstTest"/, 'Beim Promoter-Anlegen fehlt das Häkchen.');
assert.match(empfehlerHtml, /istTest: newIstTest\.checked/, 'Das Häkchen wird nicht mitgeschickt.');
assert.match(empfehlerHtml, /badge badge-test/, 'Die Promoterliste kennzeichnet Testdaten nicht.');
assert.match(empfehlungenHtml, /badge badge-test/, 'Die Empfehlungsliste kennzeichnet Testdaten nicht.');
assert.match(beraterHtml, /data-f="ist_test"/, 'Beim Berater-Anlegen fehlt das Häkchen.');
assert.match(beraterAdmin, /data-f="ist_test"/, 'In der Beraterkarte fehlt das Häkchen.');
assert.match(beraterAdmin, /badge badge-test/, 'Ein Testkonto ist in der Liste nicht erkennbar.');
assert.match(beraterAdmin, /f\.type === 'checkbox'/, 'Ein Häkchen würde als Text "on" gespeichert.');
assert.match(beraterHtml, /id="testdatenBtn"/, 'Es fehlt der Knopf zum Aufräumen.');
assert.match(supabaseJs, /export async function entferneTestdaten/);
assert.match(supabaseJs, /export async function getTestdatenBestand/);
assert.match(css, /\.badge-test\s*\{/, 'Für das Kennzeichen fehlt der Stil.');

/* --- 8) Der Wächter: keine Abfrage darf das Kennzeichen übergehen --- */

// Betroffen sind die Tabellen, in denen Testdatensätze entstehen können.
const TABELLEN = ['empfehlungen', 'empfehler', 'praemien',
                  'kidz_gewinnspiel_teilnahmen', 'kidz_elternabend_anmeldungen'];

// Ein Lesevorgang ist unbedenklich, wenn er
//   * ist_test filtert oder mitliest,
//   * alle Spalten liest (select('*') bringt ist_test mit),
//   * oder einen einzelnen Satz über seinen Schlüssel holt.
function unbedenklich(ausdruck) {
  if (/ist_test/.test(ausdruck)) return true;
  if (/\.select\('\*/.test(ausdruck)) return true;
  if (/\.(maybeSingle|single)\(\)/.test(ausdruck)) return true;
  if (/\.eq\('id',|\.eq\('code',|\.in\('id',/.test(ausdruck)) return true;
  return false;
}

const jsDateien = (await readdir(new URL('../js', import.meta.url)))
  .filter((n) => n.endsWith('.js'))
  .map((n) => ['js', n]);
const dashDateien = (await readdir(new URL('../dashboard', import.meta.url)))
  .filter((n) => n.endsWith('.html'))
  .map((n) => ['dashboard', n]);

const offen = [];
for (const [ordner, name] of [...jsDateien, ...dashDateien]) {
  const inhalt = await lies(`${ordner}/${name}`);
  for (const tabelle of TABELLEN) {
    const muster = new RegExp(`\\.from\\('${tabelle}'\\)`, 'g');
    let treffer;
    while ((treffer = muster.exec(inhalt)) !== null) {
      // Den verketteten Ausdruck bis zum Abschluss lesen: entweder ein
      // Semikolon oder das Ende des Arguments in einem Promise.all.
      const rest = inhalt.slice(treffer.index, treffer.index + 700);
      const ende = rest.search(/;|\n\s*\]\)|,\n\s*(supabase|lies|read)\b/);
      const ausdruck = ende > 0 ? rest.slice(0, ende) : rest;
      // Schreibvorgänge sind nicht gemeint: sie erzeugen oder ändern gezielt.
      if (/\.(insert|update|delete|upsert)\(/.test(ausdruck)) continue;
      if (!/\.select\(/.test(ausdruck)) continue;
      if (unbedenklich(ausdruck)) continue;
      const zeile = inhalt.slice(0, treffer.index).split('\n').length;
      offen.push(`${ordner}/${name}:${zeile} — .from('${tabelle}')`);
    }
  }
}

assert.deepEqual(
  offen,
  [],
  'Diese Abfragen verhalten sich nicht zum Testkennzeichen. Eine Kennzahl muss\n'
    + "Testdaten herausnehmen (.eq('ist_test', false)), eine Liste muss das\n"
    + 'Kennzeichen mitlesen (ist_test in die Spaltenliste), damit die Oberfläche\n'
    + 'es anzeigen kann:\n  '
    + offen.join('\n  '),
);

console.log(`testkennzeichen: OK (${TABELLEN.length} Tabellen bewacht)`);
