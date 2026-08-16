/**
 * Der Versionsstand — eine Prüfung für alle drei Stellen.
 *
 * Die sichtbare Version lebt an genau drei Orten:
 *   js/config.js   APP_VERSION + APP_PHASE   (was der Nutzer im Portal liest)
 *   sw.js          CACHE_VERSION             (was der Zwischenspeicher unterscheidet)
 *   CHANGELOG.md   Kopfzeile + oberster Eintrag
 *
 * Bleibt eine davon stehen, liefert der Zwischenspeicher alte Dateien aus oder
 * die Oberfläche zeigt eine Version, zu der es keinen Eintrag gibt. Genau das
 * fängt dieser Test ab. Er prüft NICHT, welche Version gerade aktuell ist —
 * sondern dass die drei Stellen dieselbe meinen.
 *
 * Der zweite Teil ist ein Wächter: keine andere Testdatei darf die Version
 * wieder fest verdrahten. Vorher taten das vierzehn, und jede Veröffentlichung
 * brach sie alle.
 */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { projektstand, quellen } from './_projektstand.mjs';

const s = projektstand;

/* --- 1) Die drei Stellen meinen dieselbe Phase --- */

assert.equal(
  s.cachePhase,
  s.phaseNummer,
  `sw.js nennt Phase ${s.cachePhase}, js/config.js nennt Phase ${s.phaseNummer}. `
    + 'Beim Veröffentlichen wird die CACHE_VERSION mitgezogen, sonst bleibt der alte Stand im Zwischenspeicher.',
);

/* --- 2) Das Datum in der Cache-Version ist ein echtes Datum --- */

const [jahr, monat, tag] = s.cacheDatum.split('-').map(Number);
const datum = new Date(Date.UTC(jahr, monat - 1, tag));
assert.equal(
  datum.toISOString().slice(0, 10),
  s.cacheDatum,
  `Das Datum in der CACHE_VERSION (${s.cacheDatum}) gibt es so nicht.`,
);

/* --- 3) Der Changelog kennt genau diese Version --- */

const roh = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

assert.match(
  quellen.changelog,
  new RegExp(`Offizielle Live-Version: \\*\\*${roh(s.version)}\\*\\*`),
  `Die Kopfzeile im CHANGELOG.md nennt nicht ${s.version}.`,
);

const obersterEintrag = quellen.changelog.match(/^## (.+)$/m);
assert.ok(obersterEintrag, 'Im CHANGELOG.md steht kein Eintrag (## …).');
assert.equal(
  obersterEintrag[1].trim(),
  `${s.version} - ${s.phase}`,
  `Der oberste Changelog-Eintrag lautet "${obersterEintrag[1].trim()}", `
    + `erwartet war "${s.version} - ${s.phase}" aus js/config.js.`,
);

/* --- 4) Alle Seiten binden dieselbe Fassung einer Datei ein --- */

// CSS und JS werden mit ?v=N eingebunden, damit der Browser nach einer
// Änderung nicht die alte Fassung aus seinem Zwischenspeicher nimmt. Die
// Gefahr ist nicht, dass die Nummer irgendeinen bestimmten Wert hat, sondern
// dass eine von zwanzig Seiten oder der Service Worker zurückbleibt: dann
// bekommt derselbe Nutzer je nach Seite zwei verschiedene Fassungen.
const { readdir: verzeichnis } = await import('node:fs/promises');
const wurzel = new URL('..', import.meta.url);

async function sammleHtml(ordner, gesammelt = []) {
  for (const eintrag of await verzeichnis(ordner, { withFileTypes: true })) {
    // .worktrees enthaelt vollstaendige zweite Arbeitskopien des Projekts.
    // Ohne diese Zeile vergleicht der Test die Fassungen dieser Kopie mit
    // denen des Hauptordners und meldet Unterschiede, die keine sind.
    if (['.git', '.worktrees', 'node_modules', 'assets', 'mockups'].includes(eintrag.name)) continue;
    const pfad = new URL(`${eintrag.name}${eintrag.isDirectory() ? '/' : ''}`, ordner);
    if (eintrag.isDirectory()) await sammleHtml(pfad, gesammelt);
    else if (eintrag.name.endsWith('.html')) gesammelt.push(pfad);
  }
  return gesammelt;
}

const seiten = await sammleHtml(wurzel);
const fassungen = new Map(); // datei -> Map(nummer -> [orte])

function erfasse(text, ort) {
  const muster = /([\w./-]+\.(?:css|js))\?v=(\d+)/g;
  let treffer;
  while ((treffer = muster.exec(text)) !== null) {
    const datei = treffer[1].replace(/^(\.\.\/|\.\/|\/)+/, '');
    if (!fassungen.has(datei)) fassungen.set(datei, new Map());
    const je = fassungen.get(datei);
    if (!je.has(treffer[2])) je.set(treffer[2], []);
    je.get(treffer[2]).push(ort);
  }
}

for (const seite of seiten) {
  const ort = decodeURIComponent(seite.pathname).slice(decodeURIComponent(wurzel.pathname).length);
  erfasse(await readFile(seite, 'utf8'), ort);
}
erfasse(quellen.sw, 'sw.js');

const uneinig = [];
for (const [datei, je] of fassungen) {
  if (je.size < 2) continue;
  const auflistung = [...je.entries()]
    .map(([nummer, orte]) => `v=${nummer} in ${[...new Set(orte)].join(', ')}`)
    .join('  |  ');
  uneinig.push(`${datei}: ${auflistung}`);
}

assert.deepEqual(
  uneinig,
  [],
  'Für dieselbe Datei sind verschiedene Fassungen eingebunden. Wer eine\n'
    + '?v-Nummer hochzählt, muss sie überall hochzählen — auch in sw.js.\n'
    + 'Sonst sieht derselbe Nutzer je nach Seite zwei verschiedene Stände:\n  '
    + uneinig.join('\n  '),
);

/* --- 5) Wächter: keine Testdatei verdrahtet die Version wieder fest --- */

const eigene = new Set(['_projektstand.mjs', 'versionsstand.test.mjs']);
const dateien = (await readdir(new URL('.', import.meta.url)))
  .filter((n) => /\.(mjs|cjs|js)$/.test(n) && !eigene.has(n));

// Verboten ist die Behauptung über den AKTUELLEN Stand — einmal wörtlich
// (der heutige Wert steht in der Zeile), einmal der Form nach (eine Prüfung
// gegen js/config.js oder sw.js, die eine Versionsangabe enthält).
//
// Erlaubt bleibt der fachliche Verweis auf die Phase, in der ein Merkmal
// entstand: "Phase 150 · HUB-Leichtigkeit" im Kopf einer CSS-Datei altert
// nicht und darf geprüft werden.
const woertlich = [
  { wert: projektstand.version, hinweis: 'die aktuelle Versionsnummer' },
  { wert: projektstand.cacheVersion, hinweis: 'die aktuelle Cache-Version' },
  { wert: projektstand.phase, hinweis: 'der aktuelle Phasentext' },
];
const pruefziel = /\b(config|sw|serviceWorker)\b/;
const versionsangabe = [
  { muster: /APP_VERSION/, hinweis: 'APP_VERSION' },
  { muster: /APP_PHASE/, hinweis: 'APP_PHASE' },
  { muster: /CACHE_VERSION/, hinweis: 'CACHE_VERSION' },
  { muster: /v\d+\.\d+ Beta/, hinweis: 'eine Versionsnummer' },
  { muster: /Phase \d+/, hinweis: 'eine Phasennummer' },
];
// Dasselbe gilt für die ?v-Nummern von CSS und JS: dass eine Datei
// eingebunden ist, darf ein Test gern prüfen (?v=\d+). Welche Nummer sie
// gerade trägt, bricht bei jeder Änderung und wird oben zentral geprüft.
const festeAssetVersion = /\?v=\d+(?![\d\\])/;

const funde = [];
for (const name of dateien) {
  const inhalt = await readFile(new URL(name, import.meta.url), 'utf8');
  inhalt.split('\n').forEach((zeile, i) => {
    // Im Quelltext steht die Version als Regex-Literal (v1\.227), deshalb
    // vor dem Vergleich die Maskierung wegnehmen.
    const flach = zeile.replace(/\\/g, '');
    if (!/assert\./.test(flach)) return;
    const ort = `tests/${name}:${i + 1}`;
    for (const w of woertlich) {
      if (flach.includes(w.wert)) funde.push(`${ort} — ${w.hinweis} (${w.wert})`);
    }
    if (festeAssetVersion.test(zeile)) {
      funde.push(`${ort} — eine feste ?v-Nummer (statt \\?v=\\d+)`);
    }
    if (!pruefziel.test(flach)) return;
    for (const v of versionsangabe) {
      if (v.muster.test(flach)) funde.push(`${ort} — ${v.hinweis} fest geprüft`);
    }
  });
}

assert.deepEqual(
  funde,
  [],
  'Diese Tests verdrahten den Versionsstand fest. Sie brechen bei jeder '
    + 'Veröffentlichung, ohne inhaltlich etwas damit zu tun zu haben. '
    + 'Der Versionsstand wird in tests/versionsstand.test.mjs geprüft, sonst nirgends:\n  '
    + funde.join('\n  '),
);

/* --- 5) Das Bump-Werkzeug ist vorhanden und kennt alle drei Stellen --- */

const werkzeug = await readFile(new URL('../tools/version-setzen.mjs', import.meta.url), 'utf8');
for (const stelle of ['js/config.js', 'sw.js', 'CHANGELOG.md']) {
  assert.ok(
    werkzeug.includes(stelle),
    `tools/version-setzen.mjs fasst ${stelle} nicht an — dann bleibt diese Stelle beim Bump stehen.`,
  );
}

console.log(
  `versionsstand: OK (${s.version} · Phase ${s.phaseNummer} · ${s.cacheVersion}, `
    + `${dateien.length} Testdateien ohne feste Version)`,
);
