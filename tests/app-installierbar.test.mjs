/**
 * Prueft, dass das Portal als App installierbar bleibt (Homebildschirm am
 * Handy, eigenes Fenster am Rechner) und dass die Sprungliste den Berater
 * nicht auf eine Kundenseite schickt.
 *
 * Anlass: In der Sprungliste zeigte "Neue Empfehlung" auf /empfehlen.html.
 * Das ist die Seite, auf der ein PROMOTER eine Empfehlung ausspricht, nicht
 * die, auf der ein Berater eine erfasst. Wer den Eintrag benutzte, landete
 * im Kundenpfad.
 */
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const manifest = JSON.parse(
  await readFile(new URL('../manifest.json', import.meta.url), 'utf8')
);

// --- Grundlagen der Installierbarkeit ---
assert.equal(manifest.display, 'standalone', 'Ohne standalone startet die App im Browserfenster.');
assert.ok(manifest.name && manifest.short_name, 'Name und Kurzname sind Pflicht.');
assert.ok(manifest.start_url, 'Ohne start_url weiss die App nicht, wo sie aufmacht.');

// Android verlangt 192 und 512, iOS das apple-touch-icon (in den Seiten).
for (const groesse of ['192x192', '512x512']) {
  assert.ok(
    manifest.icons.some((i) => i.sizes === groesse && i.type === 'image/png'),
    `Es fehlt ein PNG in ${groesse}.`
  );
}
assert.ok(
  manifest.icons.some((i) => i.purpose === 'maskable'),
  'Ohne maskable-Fassung schneidet Android ins Zeichen hinein.'
);

// Die Zeichen muessen auch wirklich liegen, wo das Manifest sie sucht.
for (const eintrag of manifest.icons) {
  const pfad = new URL('..' + eintrag.src, import.meta.url);
  await assert.doesNotReject(access(pfad), `Datei fehlt: ${eintrag.src}`);
}

// --- Am Rechner ---
assert.ok(
  !('orientation' in manifest),
  'Eine feste Ausrichtung schraenkt das Fenster am Rechner unnoetig ein.'
);
assert.equal(
  manifest.launch_handler?.client_mode, 'focus-existing',
  'Sonst geht bei jedem Start ein weiteres Fenster auf.'
);

// --- Die Sprungliste gehoert dem Berater ---
const KUNDENSEITEN = [
  '/empfehlen.html', '/empfaenger.html', '/danke.html', '/programm-verwalten.html',
  '/promoter-start.html', '/austragen.html', '/thema.html', '/baufi.html',
];
assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 3);
for (const kurz of manifest.shortcuts) {
  assert.ok(kurz.name && kurz.url, 'Jeder Eintrag braucht Name und Ziel.');
  assert.ok(
    !KUNDENSEITEN.includes(kurz.url.split('?')[0]),
    `"${kurz.name}" zeigt auf eine Kundenseite (${kurz.url}). Die Sprungliste ist fuer den Berater.`
  );
}
// Die Praesentation ist die eine Ausnahme: eine Kundenseite, die der Berater
// im Termin selbst aufruft. Sie steht bewusst drin.
assert.ok(
  manifest.shortcuts.some((k) => k.url.startsWith('/programm.html')),
  'Die Praesentation sollte aus der Sprungliste erreichbar sein.'
);

console.log('app-installierbar: OK');
