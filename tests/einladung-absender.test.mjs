/**
 * Die Einladung an einen Promoter kommt vom richtigen Berater.
 *
 * Der Fall, der das ausgelöst hat: David legte einen Promoter an und
 * verschickte die Einladung. Darunter stand „Viele Grüße Kai". Nicht wegen
 * einer falschen Zuordnung, sondern weil der Absender fest aus der
 * Konfiguration kam:
 *
 *   const beraterName = window.ENV_BERATER_NAME || '';
 *
 * ENV_BERATER_NAME ist der Standard-Berater des Portals, also immer Kai.
 * Damit verschickten alle sechs anderen Berater ihre Einladungen in Kais
 * Namen — an echte Kunden, mit einem Link, der auf sie selbst zeigt.
 *
 * Überall sonst im Projekt gilt: erst der angemeldete Berater
 * (window.CURRENT_BERATER), dann der Standardwert als Rückfall. Nur hier
 * fehlte der erste Teil.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');
const quelle = await lies('js/promoter-invite.js');

/* --- 1) Der Absender kommt vom angemeldeten Berater --- */

assert.match(
  quelle,
  /const beraterName = window\.CURRENT_BERATER\?\.name \|\| window\.ENV_BERATER_NAME/,
  'In js/promoter-invite.js kommt der Absender nicht zuerst vom angemeldeten\n'
    + 'Berater. Steht dort nur ENV_BERATER_NAME, unterschreibt jeder Berater\n'
    + 'seine Einladungen mit dem Namen des Standard-Beraters.',
);

/* --- 2) Anrede und Absender dürfen nicht dieselbe Quelle haben --- */

// Die Anrede ist der Promoter, der Absender der Berater. Kämen beide aus
// derselben Variable, stünde in der Nachricht zweimal derselbe Name.
const fn = quelle.slice(quelle.indexOf('export function inviteMessage'));
assert.match(fn, /const anrede = vorname\(name\)/,
  'Die Anrede muss aus dem Namen des Promoters kommen.');
assert.match(fn, /const absender = vorname\(beraterName\)/,
  'Der Absender muss aus dem Namen des Beraters kommen.');

/* --- 3) Kein anderer Weg setzt den Absender fest --- */

const treffer = [...quelle.matchAll(/beraterName\s*=\s*([^;\n]+)/g)].map((m) => m[1].trim());
for (const wert of treffer) {
  assert.ok(
    !/^window\.ENV_BERATER_NAME/.test(wert),
    `In js/promoter-invite.js wird beraterName aus "${wert}" gesetzt. Der `
      + 'Standardwert darf nur der Rückfall sein, nie die erste Wahl.',
  );
}
