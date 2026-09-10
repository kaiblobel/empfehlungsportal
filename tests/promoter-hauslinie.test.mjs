// Waechter fuer Phase 342 (10.09.2026): Promoterprofil in der Hauslinie,
// Promoter-Seite in der ruhigen Linie der Kundenseiten.
//
// Die heikle Stelle ist die Hausschrift DVAG-Type. Sie ist lizenziertes
// Firmenmaterial, und dieses Repo ist OEFFENTLICH auf GitHub. Deshalb liegt sie
// gesperrt in der Datenbank (public.hausschrift) und kommt nur ueber
// js/hausschrift.js an angemeldete Berater. Diese Tests halten fest, dass sie
// nie als Datei ins Repo rutscht und nie auf einer Kundenseite landet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const lies = (d) => { try { return readFileSync(d, 'utf8'); } catch { return ''; } };

function alleDateien(ordner = '.', gesammelt = []) {
  for (const name of readdirSync(ordner)) {
    if (['.git', 'node_modules', '.worktrees'].includes(name)) continue;
    const pfad = path.join(ordner, name);
    if (statSync(pfad).isDirectory()) alleDateien(pfad, gesammelt);
    else gesammelt.push(pfad.replace(/\\/g, '/'));
  }
  return gesammelt;
}

/** Seiten, die Kunden und Promoter sehen. Dort hat die Hausschrift nichts verloren. */
const KUNDENSEITEN = [
  'empfehler.html', 'promoter-vorschau.html', 'promoter-start.html', 'promoter-access.html',
  'programm.html', 'empfaenger.html', 'empfehlen.html', 'ueberblick.html', 'thema.html',
  'baufi.html', 'danke.html', 'austragen.html', 'kidz-sommerfest.html', 'kidz-konzept.html',
  'dashboard/index.html',
];

test('die Hausschrift liegt nicht als Datei im oeffentlichen Repo', () => {
  const funde = alleDateien().filter((d) => /dvag-?type|dvagtype/i.test(d) && /\.(woff2?|ttf|otf|eot)$/i.test(d));
  assert.deepEqual(funde, [], 'Lizenzierte Schriftdateien gehoeren nicht in ein oeffentliches Repo');
});

test('die Hausschrift erscheint auf keiner Kundenseite', () => {
  const fehler = [];
  for (const seite of KUNDENSEITEN) {
    const inhalt = lies(seite);
    if (/hausschrift\.js/.test(inhalt)) fehler.push(`${seite}: laedt hausschrift.js`);
    if (/DVAG-Type/i.test(inhalt)) fehler.push(`${seite}: nennt DVAG-Type`);
  }
  for (const css of ['css/empfehler-mobile.css', 'css/promoter-start.css', 'css/empfaenger.css']) {
    if (/DVAG-Type/i.test(lies(css))) fehler.push(`${css}: nennt DVAG-Type`);
  }
  assert.deepEqual(fehler, []);
});

test('das Promoterprofil laedt die Hausschrift', () => {
  assert.match(lies('dashboard/promoter.html'), /js\/hausschrift\.js\?v=\d+/);
  assert.match(lies('css/promoter-dashboard.css'), /--font-sans:\s*"DVAG-Type"/);
});

test('hausschrift.js holt nur aus der Datenbank, nicht aus einer Datei', () => {
  const lader = lies('js/hausschrift.js');
  assert.match(lader, /rpc\('hausschrift_datei'/, 'Der Weg ueber die gesperrte Abfrage fehlt');
  assert.ok(!/fetch\(/.test(lader), 'Ein direkter Dateiabruf wuerde eine oeffentliche Adresse voraussetzen');
  assert.match(lader, /getSession\(\)/, 'Ohne Anmeldung soll gar nicht erst gefragt werden');
});

test('die Schema-Datei sperrt Nichtangemeldete aus', () => {
  const schema = lies('schema-phase342-hausschrift.sql');
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /revoke all on function public\.hausschrift_datei\(text\) from public, anon/i);
  assert.match(schema, /current_berater_id\(\) is not null/i);
  assert.ok(!/einspielen/i.test(schema.replace(/^--.*$/gm, '')),
    'Die Einspiel-Funktion war einmalig und gehoert nicht ins Schema');
});

test('Profil-Ueberschriften im Hausgewicht 400 ohne zusammengezogene Buchstaben', () => {
  const css = lies('css/promoter-dashboard.css');
  const block = css.slice(css.indexOf('PHASE 342'));
  assert.ok(block.length > 100, 'Der Phase-342-Block fehlt');
  assert.match(block, /\.pd-profile-copy h1\{[^}]*font-weight:\s*400[^}]*letter-spacing:\s*0/);
  assert.match(block, /\.pd-card-head h2\{[^}]*font-weight:\s*400/);
});

test('jedes Symbol im Profil hat ein gezeichnetes Gegenstueck', () => {
  const js = lies('js/promoter-detail.js');
  const css = lies('css/promoter-dashboard.css');
  const namen = [...js.matchAll(/(?:statCard|infoRow)\('[^']*',\s*'([a-z]+)'/g)].map((m) => m[1]);
  assert.equal(namen.length, 8, 'Vier Kennzahlen und vier Kontaktzeilen erwartet');
  for (const name of namen) {
    assert.match(css, new RegExp(`\\[data-symbol="${name}"\\]\\{\\s*--sym:`), `Kein Symbol fuer ${name}`);
  }
});

test('die Promoter-Seite traegt keine Schwergewichte mehr', () => {
  const css = lies('css/empfehler-mobile.css');
  const block = css.slice(css.indexOf('PHASE 342'), css.indexOf('Symbole der Meldungen'));
  assert.ok(block.length > 100, 'Der Phase-342-Block fehlt');
  const zuSchwer = [...block.matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1])).filter((w) => w > 600);
  assert.deepEqual(zuSchwer, [], 'Im neuen Block ist nichts schwerer als 600');
  assert.match(block, /\.hero::before\{\s*display:\s*none/, 'Der Leuchtring ist zurueck');
  assert.match(block, /backdrop-filter:\s*none/, 'Der Glaseffekt ist zurueck');
});

test('keine Schrift kommt mehr von Google', () => {
  const fehler = [];
  for (const d of alleDateien().filter((d) => /^(css\/[^/]+\.css|[^/]+\.html|dashboard\/[^/]+\.html)$/.test(d))) {
    if (/fonts\.(googleapis|gstatic)\.com/.test(lies(d))) fehler.push(d);
  }
  assert.deepEqual(fehler, [], 'Schriften aus dem Projekt laden (DSGVO), nicht von Google');
});
