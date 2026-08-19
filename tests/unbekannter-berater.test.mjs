/**
 * Ein unbekannter Berater darf niemandem eine fremde Person unterschieben.
 *
 * Der Fall: Jemand ruft eine Kundenseite mit einem Kürzel in der Adresse auf,
 * und das Kürzel lässt sich nicht auflösen — Tippfehler, gelöschter Zugang,
 * inaktiv gesetzt. In den Seiten stehen Name, Porträt und Kontaktwege der
 * Regionaldirektion als Vorgabe im HTML, damit sie ohne Netz nicht leer
 * aussehen. Ohne Gegenmaßnahme bleiben genau diese Vorgaben stehen: Der
 * Besucher wollte zu Sven und sieht Kai.
 *
 * Phase 300 hat das für die Kontaktwege gelöst (programm, ueberblick),
 * Phase 310 für Porträt, Name und Rolle auf den übrigen Seiten. In baufi.js
 * stand vorher sogar ausdrücklich das Gegenteil im Code: ein Rückfall auf
 * ENV_BERATER_FOTO, „damit die Portraits nicht leer bleiben".
 *
 * Die Regel: Wer einen Berater aus der Adresse auflöst, muss den Fall
 * behandeln, dass die Auflösung scheitert.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

/**
 * Jede Datei, die einen Berater aus Kürzel oder Token auflöst, und die
 * Gegenmaßnahme, die sie dafür nutzt. Beide sind gleichwertig:
 *   versteckeKontaktwege    blendet Telefon, WhatsApp, Mail, Termin aus
 *   zeigeBueroStattBerater  zusätzlich Porträt und Name der Regionaldirektion
 */
const SEITEN = [
  ['js/programm.js', 'versteckeKontaktwege'],
  ['js/ueberblick.js', 'versteckeKontaktwege'],
  ['js/baufi.js', 'zeigeBueroStattBerater'],
  ['js/themen-vorschau.js', 'zeigeBueroStattBerater'],
  ['js/kidz-empfehlung-intro.js', 'zeigeBueroStattBerater'],
  ['js/empfehler-mobile.js', 'zeigeBueroStattBerater'],
  ['js/promoter-start.js', 'zeigeBueroStattBerater'],
];

for (const [datei, schutz] of SEITEN) {
  const quelle = await lies(datei);
  assert.match(
    quelle,
    new RegExp(schutz),
    `${datei} löst einen Berater auf, behandelt aber nicht den Fall, dass die\n`
      + `Auflösung scheitert. Ohne ${schutz}() bleiben Name, Porträt und\n`
      + 'Kontaktwege der Regionaldirektion aus dem HTML stehen, und der Besucher\n'
      + 'sieht eine Person, die er nie gemeint hat.',
  );
}

/* --- Der alte Rückfall darf nicht zurückkommen --- */

const baufi = await lies('js/baufi.js');
const stelle = baufi.indexOf('if (!advisor)');
assert.ok(stelle > -1, 'js/baufi.js: der Zweig für den nicht auflösbaren Berater fehlt.');
assert.ok(
  /if \(advisorSlug \|\| token\)/.test(baufi.slice(stelle, stelle + 900)),
  'In js/baufi.js hängt der Schutz nicht an einem gesetzten Kürzel oder Token. '
    + 'Ohne diese Bedingung greift er auch beim anonymen Direktaufruf, und dort '
    + 'sind die Vorgaben richtig: Dann ist es die Seite der Regionaldirektion.',
);

/* --- Die gemeinsame Funktion tut, was ihr Name sagt --- */

const buero = await lies('js/buero-brand.js');
const fn = buero.slice(buero.indexOf('export async function zeigeBueroStattBerater'));
for (const [was, muster] of [
  ['Kontaktwege ausblenden', /versteckeKontaktwege\(\)/],
  ['Porträt entfernen', /data-bb="foto"[\s\S]{0,140}removeAttribute\('src'\)/],
  ['Name aus dem Büroprofil', /getBueroPublic\(\)[\s\S]{0,320}data-bb="name"/],
]) {
  assert.match(fn, muster, `zeigeBueroStattBerater() erledigt nicht: ${was}.`);
}
