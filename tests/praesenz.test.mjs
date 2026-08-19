/**
 * Die Online-Anzeige im Beraterbereich.
 *
 * Zwei Fehler, die beide still bleiben und die es beide schon gab:
 *
 *   1. Die Anwesenheit wurde nur auf dem Überblick gemeldet. Wer bei den
 *      Empfehlungen oder in der Präsentation arbeitete, galt als offline,
 *      obwohl er die ganze Zeit im Portal war.
 *
 *   2. Die Präsenz-Liste filterte über team_sichtbare_berater(): jeder sah nur
 *      sich und die Leute unter sich. Eine Agenturleiterin ohne eigene
 *      Mannschaft sah eine Liste mit genau einem Namen, dem eigenen.
 *
 * Beides fällt niemandem auf, der es nicht weiß: Es steht ja etwas da.
 */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const wurzel = new URL('../', import.meta.url);
const lies = (datei) => readFile(new URL(datei, wurzel), 'utf8');

/* --- 1) Gemeldet wird von jeder Seite, nicht nur vom Überblick --- */

const nav = await lies('js/nav.js');

assert.match(nav, /touchPresence\(\)/,
  'js/nav.js meldet die Anwesenheit nicht. Die Navigation ist die einzige '
    + 'Stelle, die auf jeder Seite des Beraterbereichs läuft; hängt die Meldung '
    + 'woanders, zählt nur diese eine Seite als „im Portal".');

assert.match(nav, /setInterval\(melden, 60000\)/,
  'js/nav.js meldet die Anwesenheit nur einmal beim Laden. Wer eine Seite '
    + 'lange offen hat, fiele nach wenigen Minuten aus der Anzeige.');

assert.match(nav, /visibilitychange/,
  'js/nav.js meldet nach dem Zurückwechseln zum Fenster nicht sofort. Dann '
    + 'steht jemand nach einer Pause bis zu eine Minute lang auf offline.');

// Ein Fehler beim Melden darf die Seite nicht aufhalten.
assert.match(nav, /catch \(_\)[\s\S]{0,120}\}/,
  'js/nav.js fängt Fehler beim Melden nicht ab. Eine nicht gemeldete '
    + 'Anwesenheit ist ärgerlich, eine Seite die deshalb nicht lädt wäre schlimmer.');

/* --- 2) Die Anzeige-Spanne passt zum Meldetakt --- */

const hub = await lies('js/hub.js');
const spanne = hub.match(/const online = last && \(now - last\) < (\d+) \* 60 \* 1000/);

assert.ok(spanne, 'js/hub.js: die Regel, ab wann jemand als online gilt, ist nicht mehr auffindbar.');
assert.ok(
  Number(spanne[1]) >= 4,
  `js/hub.js gilt jemanden nach ${spanne[1]} Minuten als offline. Gemeldet wird `
    + 'im Minutentakt und bei verstecktem Fenster gar nicht; unter vier Minuten '
    + 'flackert die Anzeige beim Fensterwechsel.',
);

/* --- 3) Die Präsenz-Liste zeigt das ganze Team --- */

const dateien = (await readdir(wurzel)).filter((n) => /^schema-phase\d+.*\.sql$/.test(n));
let migration = null;
let hoechste = -1;
for (const name of dateien) {
  const inhalt = await readFile(new URL(name, wurzel), 'utf8');
  if (!inhalt.includes('function public.team_presence')) continue;
  const phase = Number(name.match(/^schema-phase(\d+)/)[1]);
  if (phase > hoechste) { hoechste = phase; migration = { name, inhalt }; }
}

assert.ok(migration, 'Keine Migration gefunden, die team_presence definiert.');

assert.doesNotMatch(
  migration.inhalt.slice(migration.inhalt.indexOf('function public.team_presence')),
  /team_sichtbare_berater/,
  `${migration.name}: team_presence filtert wieder über team_sichtbare_berater. `
    + 'Damit sieht jeder nur sich und seine Untergebenen, und wer niemanden '
    + 'unter sich hat, sieht nur den eigenen Namen. Für die Präsenz gilt die '
    + 'Spitze des Teams, nicht die eigene Linie.',
);

assert.match(migration.inhalt, /team_wurzel/,
  `${migration.name}: team_presence grenzt das Team nicht über die gemeinsame Spitze ab.`);

// Ohne angemeldeten Berater liefert team_wurzel null, und null is not distinct
// from null waere wahr: dann saehe ein Aufruf ohne Anmeldung alle wurzellosen
// Berater.
assert.match(migration.inhalt, /current_berater_id\(\) is not null/,
  `${migration.name}: der Schutz gegen den Aufruf ohne angemeldeten Berater fehlt.`);

// Eine Rekursion nach oben ohne Tiefengrenze laeuft bei einem versehentlichen
// Kreis in der Hierarchie endlos und legt jede Seite lahm, die die Praesenz laedt.
assert.match(migration.inhalt, /tiefe < \d+/,
  `${migration.name}: team_wurzel hat keine Tiefenbegrenzung.`);

assert.match(migration.inhalt, /grant execute on function public\.team_presence\(\)\s+to authenticated/,
  `${migration.name}: die Ausführungsrechte für team_presence fehlen.`);

console.log(`praesenz: OK (${migration.name}, Anzeige ab ${spanne[1]} Minuten offline)`);
