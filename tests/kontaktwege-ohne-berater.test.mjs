/**
 * Ein unbekannter Berater in der Adresse darf keine fremden Kontaktwege
 * stehen lassen.
 *
 * In programm.html und ueberblick.html stehen Telefonnummer, WhatsApp und
 * E-Mail des Standard-Beraters fest im HTML. Das ist Absicht: Wer die Seite
 * ohne Berater in der Adresse öffnet, sieht die Regionaldirektion, und die
 * betreibt das Portal.
 *
 * Stand aber ein Slug oder ein Empfehlungs-Token in der Adresse und ließ sich
 * der Berater nicht auflösen — Tippfehler, gelöschter Zugang, inaktiv gesetzt —
 * dann wollte der Besucher ausdrücklich zu jemand anderem. Ohne Gegenmaßnahme
 * bleiben die Vorgaben stehen: der Kunde tippt auf WhatsApp bei der Seite von
 * Sven und schreibt Kai.
 *
 * Dieselbe Regel gilt beim Promoter-Einstieg schon (setPromoterEntry in
 * js/programm.js): ein gesetzter, aber ungültiger Slug fällt nie still auf den
 * Standard-Berater zurück. Dieser Wächter hält fest, dass die Kontaktwege
 * mitziehen.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

const [brand, programm, ueberblick] = await Promise.all([
  lies('js/berater-brand.js'),
  lies('js/programm.js'),
  lies('js/ueberblick.js'),
]);

/* --- 1) Die Funktion gibt es, und sie deckt alle Kontaktwege ab --- */

assert.match(
  brand,
  /export function versteckeKontaktwege\(\)/,
  'js/berater-brand.js exportiert keine versteckeKontaktwege(). '
    + 'Ohne sie bleibt bei einem unbekannten Berater die Nummer des Standard-Beraters stehen.',
);

// Jeder data-bb-Wert, der zu einem persönlichen Anschluss führt, muss dabei
// sein. Kommt ein neuer Kontaktweg dazu, gehört er in beide Listen.
for (const weg of ['whatsapp', 'tel', 'tel-text', 'email', 'email-text', 'booking']) {
  assert.ok(
    new RegExp(`'${weg}'`).test(brand.slice(brand.indexOf('versteckeKontaktwege'))),
    `versteckeKontaktwege() lässt "${weg}" aus. Dieser Kontaktweg führt zu einer `
      + 'konkreten Person und darf bei einem unbekannten Berater nicht stehen bleiben.',
  );
}

/* --- 2) Beide Kundenseiten rufen sie auf --- */

for (const [name, quelle] of [['js/programm.js', programm], ['js/ueberblick.js', ueberblick]]) {
  assert.match(
    quelle,
    /versteckeKontaktwege/,
    `${name} ruft versteckeKontaktwege() nicht auf, obwohl die zugehörige Seite `
      + 'Kontaktdaten des Standard-Beraters fest im HTML trägt.',
  );
  assert.match(
    quelle,
    /import \{[^}]*versteckeKontaktwege[^}]*\} from '\.\/berater-brand\.js'/,
    `${name} importiert versteckeKontaktwege nicht aus berater-brand.js.`,
  );
}

/* --- 3) Nur beim unbekannten Berater, nicht immer --- */

// Ohne Slug und ohne Token ist die Vorgabe im HTML richtig: dann ist es die
// Seite der Regionaldirektion. Ein bedingungsloser Aufruf würde die Kontaktwege
// auch dort ausblenden und die Seite unbrauchbar machen.
assert.match(
  programm,
  /if \(beraterSlug\) versteckeKontaktwege\(\)/,
  'In js/programm.js hängt der Aufruf nicht an einem gesetzten Slug. Ohne Slug '
    + 'muss die Kai-Vorgabe stehen bleiben.',
);
assert.match(
  ueberblick,
  /else if \(slugParam \|\| token\) \{[\s\S]{0,900}?versteckeKontaktwege\(\);/,
  'In js/ueberblick.js hängt der Aufruf nicht an Slug oder Token. Ohne beides '
    + 'muss die Kai-Vorgabe stehen bleiben.',
);

/* --- 4) Die Vorgaben im HTML sind noch da (sonst prüft 1-3 ins Leere) --- */

const [programmHtml, ueberblickHtml] = await Promise.all([
  lies('programm.html'),
  lies('ueberblick.html'),
]);

for (const [name, quelle] of [['programm.html', programmHtml], ['ueberblick.html', ueberblickHtml]]) {
  assert.match(
    quelle,
    /data-bb="whatsapp"[^>]*href="https:\/\/wa\.me\//,
    `In ${name} steht kein fester wa.me-Link mehr. Wenn er absichtlich `
      + 'entfernt wurde, kann dieser Test weg — sonst fehlt die Vorgabe.',
  );
}
