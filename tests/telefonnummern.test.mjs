/**
 * Rufnummern: der gewählte Link UND die angezeigte Schreibweise.
 *
 * Hier hing ein echter Fehler drin. Die alte Zeile machte aus einer Nummer
 * ohne Ländervorwahl eine falsche:
 *
 *   '+' + '016095698537'.replace(/^0+/, '')  →  '+16095698537'
 *
 * Das ist nicht Cottbus, das ist Nordamerika. Zwei Berater hatten damit einen
 * Anrufen-Knopf, der irgendwo klingelte, nur nicht bei ihnen. Aufgefallen ist
 * es erst, als jemand die Umwandlung für alle sieben durchgerechnet hat.
 *
 * Dieser Wächter rechnet sie deshalb dauerhaft durch, mit den echten
 * Schreibweisen aus dem Bestand: mit Plus, ohne Plus, mit führender Null,
 * mit Leerzeichen, Mobil und Festnetz.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Das Modul hängt an document/localStorage, deshalb wird die Funktion aus der
// Datei gelesen und einzeln ausgeführt, statt das ganze Modul zu laden.
const quelle = await readFile(new URL('../js/berater-brand.js', import.meta.url), 'utf8');
const anfang = quelle.indexOf('export function rufnummer(');
assert.ok(anfang > -1, 'js/berater-brand.js exportiert keine rufnummer().');
const ende = quelle.indexOf('\nexport function applyBeraterBrand', anfang);
const code = quelle.slice(anfang, ende).replace('export function', 'function');
const rufnummer = new Function(`${code}; return rufnummer;`)();

/* --- 1) Die echten Schreibweisen aus dem Bestand --- */

const faelle = [
  // [Eingabe,             erwarteter Link,   erwartete Anzeige,      Anmerkung]
  ['+4915154776159',      '+4915154776159',  '+49 151 54776159',     'mobil, mit Plus'],
  ['+491706764114',       '+491706764114',   '+49 170 6764114',      'mobil, mit Plus'],
  ['+491738355258',       '+491738355258',   '+49 173 8355258',      'mobil, Kais Beispiel'],
  ['491732947231',        '+491732947231',   '+49 173 2947231',      'mobil, ohne Plus'],
  ['4917687959836',       '+4917687959836',  '+49 176 87959836',     'mobil, ohne Plus'],
  ['016095698537',        '+4916095698537',  '+49 160 95698537',     'mobil, führende Null'],
  ['01601893082',         '+491601893082',   '+49 160 1893082',      'mobil, führende Null'],
  ['0355 49497303',       '+4935549497303',  '+49 355 49497303',     'FESTNETZ, Büro, Kais Beispiel'],
  ['+49 355 49497303',    '+4935549497303',  '+49 355 49497303',     'festnetz, schon gegliedert'],
  ['0049 173 8355258',    '+491738355258',   '+49 173 8355258',      'mit 0049'],
  ['035549497303',        '+4935549497303',  '+49 35549497303',      'festnetz als Klumpen: nur Land abgesetzt'],
];

for (const [eingabe, linkSoll, anzeigeSoll, was] of faelle) {
  const { e164, anzeige } = rufnummer(eingabe);
  assert.equal(e164, linkSoll,
    `Link falsch (${was}): "${eingabe}" ergibt "${e164}", erwartet "${linkSoll}".`);
  assert.equal(anzeige, anzeigeSoll,
    `Anzeige falsch (${was}): "${eingabe}" ergibt "${anzeige}", erwartet "${anzeigeSoll}".`);
}

/* --- 2) Der alte Fehler darf nie zurückkommen --- */

for (const eingabe of ['016095698537', '01601893082', '0355 49497303']) {
  const { e164 } = rufnummer(eingabe);
  assert.ok(
    e164.startsWith('+49'),
    `"${eingabe}" ergibt "${e164}". Eine deutsche Nummer mit führender Null darf `
      + 'niemals in einer fremden Ländervorwahl landen — genau das war der Fehler.',
  );
}

/* --- 3) Nichts ergibt nichts, statt eines kaputten Links --- */

for (const leer of ['', null, undefined, '   ', 'abc', '12']) {
  const { e164, anzeige } = rufnummer(leer);
  assert.equal(e164, '', `"${leer}" hätte keinen Link ergeben dürfen, ergibt aber "${e164}".`);
  assert.equal(anzeige, '', `"${leer}" hätte keine Anzeige ergeben dürfen.`);
}

/* --- 4) Auslandsnummern bleiben unangetastet --- */

const ausland = rufnummer('+436641234567');
assert.equal(ausland.e164, '+436641234567',
  'Eine österreichische Nummer darf nicht zu einer deutschen umgebogen werden.');

/* --- 5) Beide Anzeigestellen nutzen die Umwandlung --- */

assert.match(
  quelle,
  /el\.textContent = tel\.anzeige/,
  'Bei data-bb="tel-text" wird nicht die gegliederte Form angezeigt. Dann steht '
    + 'die Nummer wieder als Klumpen in der Fußzeile.',
);
assert.ok(
  !/el\.textContent = b\.telefon/.test(quelle),
  'Irgendwo wird noch der rohe Telefonwert angezeigt.',
);
