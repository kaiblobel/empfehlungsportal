#!/usr/bin/env node
/**
 * Version hochzählen — an allen drei Stellen gleichzeitig.
 *
 * Die sichtbare Version lebt in js/config.js, sw.js und CHANGELOG.md. Wer eine
 * davon vergisst, liefert alte Dateien aus dem Zwischenspeicher aus oder zeigt
 * eine Version, zu der es keinen Eintrag gibt.
 *
 * Aufruf:
 *   node tools/version-setzen.mjs "Kurztitel der Phase"
 *       zählt Version, Phase und Cache-Version je um eins hoch, Datum = heute
 *
 *   node tools/version-setzen.mjs "Kurztitel" --phase 212 --version 1.232
 *       setzt bestimmte Nummern
 *
 *   node tools/version-setzen.mjs "Kurztitel" --probe
 *       zeigt nur, was passieren würde
 *
 * Danach: den neuen Changelog-Abschnitt füllen und `node --test tests/` fahren.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const datei = (p) => path.join(wurzel, p);

/* --- Aufrufzeile lesen --- */

const argv = process.argv.slice(2);
const probe = argv.includes('--probe');
const mitWert = new Set(['--phase', '--version', '--datum']);
const werte = new Map();
const frei = [];
for (let i = 0; i < argv.length; i += 1) {
  if (mitWert.has(argv[i])) {
    werte.set(argv[i].slice(2), argv[i + 1]);
    i += 1;
  } else if (!argv[i].startsWith('--')) {
    frei.push(argv[i]);
  }
}
const schalter = (name) => werte.get(name) ?? null;
const titel = frei[0];

if (!titel) {
  console.error('Es fehlt der Kurztitel der Phase.\n'
    + '  node tools/version-setzen.mjs "Testdaten sind als Test gekennzeichnet"');
  process.exit(1);
}

/* --- Stand lesen --- */

const configPfad = datei('js/config.js');
const swPfad = datei('sw.js');
const changelogPfad = datei('CHANGELOG.md');

let config = await readFile(configPfad, 'utf8');
let sw = await readFile(swPfad, 'utf8');
let changelog = await readFile(changelogPfad, 'utf8');

const alteVersion = config.match(/window\.APP_VERSION = 'v(\d+)\.(\d+)([^']*)'/);
const altePhase = config.match(/window\.APP_PHASE = 'Phase (\d+)/);
const alterCache = sw.match(/const CACHE_VERSION = 'v(\d+)-(\d{4}-\d{2}-\d{2})-phase(\d+)'/);

if (!alteVersion || !altePhase || !alterCache) {
  console.error('Der bisherige Stand ist nicht lesbar. Erwartet:\n'
    + "  js/config.js  window.APP_VERSION = 'v1.227 Beta'\n"
    + "  js/config.js  window.APP_PHASE = 'Phase 207 · …'\n"
    + "  sw.js         const CACHE_VERSION = 'v186-2026-08-12-phase207'");
  process.exit(1);
}

const suffix = alteVersion[3] || ' Beta';
const neueVersion = schalter('version')
  ? `v${schalter('version')}${suffix}`
  : `v${alteVersion[1]}.${Number(alteVersion[2]) + 1}${suffix}`;
const neuePhase = Number(schalter('phase') ?? Number(altePhase[1]) + 1);
const neuerCacheZaehler = Number(alterCache[1]) + 1;
const heute = schalter('datum') ?? new Date().toISOString().slice(0, 10);
const neuerCache = `v${neuerCacheZaehler}-${heute}-phase${neuePhase}`;
const phaseText = `Phase ${neuePhase} · ${titel}`;
const [j, m, t] = heute.split('-');
const datumDeutsch = `${t}.${m}.${j}`;

/* --- Ersetzen --- */

config = config
  .replace(/window\.APP_VERSION = '[^']+'/, `window.APP_VERSION = '${neueVersion}'`)
  .replace(/window\.APP_PHASE = '[^']+'/, `window.APP_PHASE = '${phaseText}'`);

sw = sw.replace(/const CACHE_VERSION = '[^']+'/, `const CACHE_VERSION = '${neuerCache}'`);

changelog = changelog.replace(
  /Offizielle Live-Version: \*\*[^*]+\*\*[^\n]*/,
  `Offizielle Live-Version: **${neueVersion}** · ${titel}, live seit ${datumDeutsch}.`,
);

const neuerAbschnitt = `## ${neueVersion} - ${phaseText}\n`
  + `**${heute}**\n\n`
  + '- (hier eintragen, was sich geändert hat und warum)\n\n'
  + '---\n\n';

const ersterEintrag = changelog.indexOf('\n## ');
if (ersterEintrag < 0) {
  console.error('Im CHANGELOG.md ist kein Eintrag (## …) gefunden worden.');
  process.exit(1);
}
changelog = changelog.slice(0, ersterEintrag + 1) + neuerAbschnitt + changelog.slice(ersterEintrag + 1);

/* --- Schreiben oder zeigen --- */

const bericht = [
  `js/config.js   APP_VERSION  v${alteVersion[1]}.${alteVersion[2]}${suffix}  ->  ${neueVersion}`,
  `js/config.js   APP_PHASE    Phase ${altePhase[1]}  ->  ${phaseText}`,
  `sw.js          CACHE        ${alterCache[0].match(/'([^']+)'/)[1]}  ->  ${neuerCache}`,
  'CHANGELOG.md   Kopfzeile aktualisiert, neuer Abschnitt oben eingefügt',
].join('\n  ');

if (probe) {
  console.log(`Probe, es wird nichts geschrieben:\n  ${bericht}`);
  process.exit(0);
}

await writeFile(configPfad, config, 'utf8');
await writeFile(swPfad, sw, 'utf8');
await writeFile(changelogPfad, changelog, 'utf8');

console.log(`Version gesetzt:\n  ${bericht}\n\n`
  + 'Noch zu tun:\n'
  + '  1. den neuen Abschnitt in CHANGELOG.md füllen\n'
  + '  2. beim Veröffentlichen "· live veröffentlicht" an die Datumszeile hängen\n'
  + '  3. node --test tests/');
