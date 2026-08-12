/**
 * Phase 211 · Neuigkeiten-Zähler im Menü
 *
 * Am Menüpunkt steht eine Zahl, wenn seit dem letzten Blick etwas dazugekommen
 * ist. Der Gelesen-Stand liegt in der Datenbank, damit Rechner und Handy
 * dasselbe wissen.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

const [migration, supabaseJs, navJs, dashboardCss,
       empfehlungenHtml, kidzGewinnJs, kidzElternJs] = await Promise.all([
  lies('schema-phase211-neuigkeiten.sql'),
  lies('js/supabase.js'),
  lies('js/nav.js'),
  lies('css/dashboard.css'),
  lies('dashboard/empfehlungen.html'),
  lies('js/kidz-gewinnspiel-admin.js'),
  lies('js/kidz-elternabend-admin.js'),
]);

const BEREICHE = ['empfehlungen', 'kidz_gewinnspiel', 'kidz_elternabend'];

/* --- 1) Der Gelesen-Stand liegt in der Datenbank, nicht im Browser --- */

assert.match(migration, /create table if not exists public\.gesehen_bis/);
assert.match(migration, /primary key \(berater_id, bereich\)/,
  'Ohne diesen Schlüssel gäbe es je Bereich mehrere Stände.');
assert.match(migration, /references public\.berater\(id\) on delete cascade/);
assert.match(migration, /alter table public\.gesehen_bis enable row level security/);
assert.match(migration, /berater_id = public\.current_berater_id\(\)/,
  'Jeder müsste den Gelesen-Stand der anderen sehen können.');

/* --- 2) Der Zähler zählt das Richtige --- */

const fn = migration.match(/create or replace function public\.neuigkeiten\(\)[\s\S]*?\$function\$;/);
assert.ok(fn, 'neuigkeiten() fehlt.');

for (const b of BEREICHE) {
  assert.ok(fn[0].includes(`'${b}'`), `neuigkeiten() kennt den Bereich ${b} nicht.`);
}

// Testdaten sind keine Neuigkeit (Phase 208).
assert.equal(
  (fn[0].match(/not \w+\.ist_test/g) || []).length, 3,
  'Nicht jeder der drei Zähler nimmt Testdaten heraus.',
);

// Dieselbe Sicht wie auf der Zielseite: Empfehlungen nur eigene,
// KIDZ eigene oder alle als Admin.
assert.match(fn[0], /from public\.empfehlungen e\s*\n\s*where e\.berater_id = v_berater/,
  'Der Empfehlungs-Zähler zählt fremde Empfehlungen mit.');
assert.equal(
  (fn[0].match(/or v_ist_admin/g) || []).length, 2,
  'Die beiden KIDZ-Zähler folgen nicht der Adminsicht der Zielseite.',
);

// Wer noch nie hingesehen hat, startet bei 0 und nicht bei der ganzen Historie.
assert.equal(
  (fn[0].match(/coalesce\(\(/g) || []).length, 3,
  'Ohne Gelesen-Stand müsste der Zähler 0 liefern, nicht null oder alles.',
);

/* --- 3) Gesehen setzen, mit Prüfung des Bereichsnamens --- */

const setzen = migration.match(/create or replace function public\.als_gesehen_markieren[\s\S]*?\$function\$;/);
assert.ok(setzen, 'als_gesehen_markieren() fehlt.');
assert.match(setzen[0], /p_bereich not in \('empfehlungen', 'kidz_gewinnspiel', 'kidz_elternabend'\)/,
  'Ein beliebiger Bereichsname käme durch.');
assert.match(setzen[0], /on conflict \(berater_id, bereich\)\s*\n?\s*do update set gesehen_at = now\(\)/);

/* --- 4) Rechte: die Lehre aus Phase 198 --- */

for (const f of ['neuigkeiten\\(\\)', 'als_gesehen_markieren\\(text\\)']) {
  assert.match(migration, new RegExp(`revoke execute on function public\\.${f} from anon, public;`),
    'Die Funktion bliebe für anonyme Aufrufer offen.');
  assert.match(migration, new RegExp(`grant execute on function public\\.${f} to authenticated;`));
}

/* --- 5) Der Zugriff im Frontend ist gutmütig --- */

for (const name of ['getNeuigkeiten', 'markiereGesehen']) {
  assert.match(supabaseJs, new RegExp(`export async function ${name}`), `${name} fehlt.`);
  const block = supabaseJs.match(new RegExp(`export async function ${name}[\\s\\S]*?\\n}`));
  assert.match(block[0], /catch/, `${name} reißt bei einem Fehler die Seite mit.`);
}

/* --- 6) Das Menü zeigt die Zahl, an allen drei Navigationen --- */

assert.match(navJs, /function zeigeZaehler/, 'Der Zähler-Block wurde nicht herausgelöst.');
assert.match(navJs, /getNeuigkeiten/);
// Ein Aufruf für alle Zähler: das Menü wird auf jeder der Seiten neu gebaut.
assert.match(navJs, /Promise\.all\(\[getOffenePraemienCount\(\), getNeuigkeiten\(\)\]\)/,
  'Die Zähler werden nacheinander statt gemeinsam geholt.');

// Sidebar und Schublade nutzen .nav-item, die untere Leiste am Handy
// .nav-bottom-item. Genau dort sitzt "Empfehlungen".
assert.match(navJs, /a\.nav-item\[href\$="\$\{dateiname\}"\], a\.nav-bottom-item\[href\$="\$\{dateiname\}"\]/,
  'Die untere Leiste am Handy bekommt keinen Zähler.');
assert.match(dashboardCss, /\.nav-bottom-item \.nav-badge\s*\{/, 'Für die untere Leiste fehlt der Stil.');

// Wird die Zahl 0, muss die Pille verschwinden. Vorher gab es nur Anhängen.
assert.match(navJs, /if \(!anzahl\) \{ if \(vorhanden\) vorhanden\.remove\(\); return; \}/,
  'Ein Zähler auf 0 bliebe stehen.');

// Auf der offenen Seite ist nichts ungesehen.
assert.match(navJs, /window\.location\.pathname\.endsWith\(`\/\$\{datei\}`\)/,
  'Der Zähler bliebe auf der Seite stehen, die man gerade ansieht.');

/* --- 7) Neuigkeit pulst nicht, Aufgabe schon --- */

// Der Puls gehört dem, was auf Erledigung wartet. Drei blinkende Pillen
// gleichzeitig wären Lärm.
assert.match(dashboardCss, /\.nav-badge-neu\s*\{[\s\S]*?animation: none;/,
  'Die Neuigkeiten-Pille pulsiert mit.');
assert.match(navJs, /still \? 'nav-badge nav-badge-neu' : 'nav-badge'/);

/* --- 8) Die drei Seiten setzen den Stand zurück --- */

assert.match(empfehlungenHtml, /markiereGesehen\('empfehlungen'\)/);
assert.match(kidzGewinnJs, /markiereGesehen\('kidz_gewinnspiel'\)/);
assert.match(kidzElternJs, /markiereGesehen\('kidz_elternabend'\)/);

console.log(`neuigkeiten: OK (${BEREICHE.length} Bereiche)`);
