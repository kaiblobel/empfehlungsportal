/**
 * Auf jeder Kundenseite steht der Berater, dem sie gehört.
 *
 * Das Muster ist überall dasselbe und muss es bleiben: erst die Empfehlung
 * (Token), dann die ausdrückliche Wahl (?berater=slug), dann der eingeloggte
 * Berater. Fehlt der dritte Weg, sieht ein Partner in der Vorschau seiner
 * eigenen Seite den Standard-Berater — genau das war der Fehler in Phase 272
 * (KIDZ) und Phase 275 (Themenseiten).
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

/* --- 1) Jedes Kundenskript kennt alle drei Wege --- */

const SEITEN = [
  ['js/app.js', 'Empfängerseite und Empfehlungsformular'],
  ['js/baufi.js', 'Finanzierungskompass'],
  ['js/kidz-empfehlung-intro.js', 'KIDZ-Empfehlung'],
  ['js/themen-vorschau.js', 'Themenseiten'],
  ['js/ueberblick.js', 'Überblicksseite'],
];

for (const [datei, was] of SEITEN) {
  const quelle = await lies(datei);
  assert.match(quelle, /getBeraterPublicById/, `${was}: der Weg über die Empfehlung fehlt.`);
  assert.match(quelle, /getBeraterPublicBySlug/, `${was}: der Weg über ?berater=slug fehlt.`);
  assert.match(
    quelle,
    /auth\.getSession\(\)[\s\S]{0,400}getCurrentBerater\(\)/,
    `${was}: der Weg über den eingeloggten Berater fehlt. Ohne ihn zeigt die `
      + 'Vorschau aus dem Dashboard den Standard-Berater.',
  );
}

/* --- 2) Die Themenseiten trennen „nichts angegeben" von „Kai gemeint" --- */

const themen = await lies('js/themen-vorschau.js');
assert.match(themen, /let expliziterSlug = params\.get\('berater'\) \|\| ''/,
  'Der Slug aus der Adresse braucht eine eigene Variable, sonst greift der Standard zu früh.');
const reihenfolge = themen.slice(themen.indexOf('async function loadAdvisor()'));
assert.ok(
  reihenfolge.indexOf('getCurrentBerater()') < reihenfolge.indexOf("getBeraterPublicBySlug(currentAdvisor)"),
  'Der eingeloggte Berater muss VOR dem Standard-Berater abgefragt werden.',
);

/* --- 3) Die Vorschau-Kacheln bekommen den Slug angehängt --- */

const nav = await lies('js/nav.js');
assert.match(nav, /a\[data-berater-link\]/,
  'js/nav.js hängt den Slug nicht an ausgezeichnete Links außerhalb der Navigation.');

const einstellungen = await lies('dashboard/settings.html');
const kacheln = einstellungen.match(/class="settings-tile"/g)?.length || 0;
const ausgezeichnet = einstellungen.match(/data-berater-link/g)?.length || 0;
assert.ok(kacheln > 0, 'In den Einstellungen wurden keine Vorschau-Kacheln gefunden.');
assert.equal(ausgezeichnet, kacheln,
  `${kacheln} Vorschau-Kacheln, aber nur ${ausgezeichnet} mit data-berater-link. `
    + 'Jede Kachel öffnet eine Kundenseite und muss den Absender mitnehmen.');

console.log('berater-auf-allen-seiten: OK');
