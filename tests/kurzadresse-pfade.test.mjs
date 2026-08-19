/**
 * Empfängerseiten müssen ihre Dateien absolut verlinken.
 *
 * Der Empfehlungslink ist eine Kurzadresse: /empfehlung/<token>. Vercel liefert
 * darunter die passende Seite aus, die Adresszeile im Browser behält aber den
 * Pfad. Ein relativer Verweis wie src="js/config.js" wird damit zu
 * /empfehlung/js/config.js und läuft ins Leere.
 *
 * Genau das ist passiert: In empfaenger.html standen config.js und app.js
 * relativ. Über die Kurzadresse fehlten damit die Zugangsdaten zur Datenbank
 * und das komplette Skript der Seite. Sichtbar wurde das erst bei einem
 * Partner: Ohne Skript blieb der Standard-Berater im HTML stehen, also Kai.
 * Beim Standard-Berater selbst sah die Seite völlig richtig aus, deshalb fiel
 * es monatelang niemandem auf.
 *
 * Der Anrufwunsch war über die Kurzadresse für alle wirkungslos.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wurzel = new URL('../', import.meta.url);
const lies = (datei) => readFile(new URL(datei, wurzel), 'utf8');

/* --- Welche Seiten werden unter einer Kurzadresse ausgeliefert? --- */

const share = await lies('api/share.js');
const seiten = [...new Set(
  [...share.matchAll(/'(\/[a-z0-9-]+\.html)'/g)].map((t) => t[1].slice(1)),
)];

assert.ok(
  seiten.length >= 4,
  `In api/share.js wurden nur ${seiten.length} Empfängerseiten gefunden. `
    + 'Entweder hat sich die Schreibweise geändert oder der Test greift ins Leere.',
);

/* --- Keine relativen Verweise auf eigene Dateien --- */

const istAbsolut = (p) => /^(\/|https?:|#|mailto:|tel:|data:|javascript:)/i.test(p);
// Verweise, die ein Skript zur Laufzeit zusammensetzt (`${…}`), stehen so nie
// im ausgelieferten HTML und sind hier nicht zu bewerten.
const istPlatzhalter = (p) => p.includes('${') || p.includes('{{');

for (const datei of seiten) {
  const html = await lies(datei);

  const verweise = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((t) => t[1]);
  const relativ = [...new Set(
    verweise.filter((p) => p && !istAbsolut(p) && !istPlatzhalter(p)),
  )];

  assert.deepEqual(
    relativ,
    [],
    `${datei} verweist relativ auf: ${relativ.join(', ')}. `
      + 'Diese Seite wird unter /empfehlung/<token> ausgeliefert; dort löst ein '
      + 'relativer Pfad zu /empfehlung/... auf und läuft ins Leere. '
      + 'Mit führendem Schrägstrich schreiben.',
  );

  // Ohne diese beiden ist die Seite eine Attrappe: keine Zugangsdaten zur
  // Datenbank, kein Berater, kein Anrufwunsch.
  assert.match(html, /src="\/js\/config\.js"/,
    `${datei} lädt /js/config.js nicht absolut. Ohne diese Datei gibt es keine `
      + 'Verbindung zur Datenbank, und die Seite zeigt still den Standard-Berater.');
}

console.log(`kurzadresse-pfade: OK (${seiten.length} Seiten: ${seiten.join(', ')})`);
