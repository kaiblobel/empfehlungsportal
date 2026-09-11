// Das Berater-Kürzel muss auf der Empfängerseite angelegt sein.
//
// Phase 311 (20.08.2026) legte `aktuellerBeraterSlug` nur im Block der
// Empfehlen-Seite an. Benutzt wurde es auch in applyVorlage auf der
// Empfängerseite. Dort warf es einen ReferenceError, sobald der Standard-Berater
// die Seite zeigte, und alles danach im selben Ablauf lief nie: die Karte mit
// Name und Nachricht des Empfehlungsgebers und die Anzeige eines schon
// abgegebenen Anrufwunschs. Die Seite lud trotzdem, deshalb fiel es nicht auf.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

const start = app.indexOf("if (page === 'empfaenger')");
assert.ok(start > 0, 'Block der Empfängerseite in js/app.js nicht gefunden');
const rest = app.slice(start + 10);
const naechster = rest.search(/\nif \(page === '/);
const block = naechster > 0 ? rest.slice(0, naechster) : rest;

const anlage = block.indexOf('let aktuellerBeraterSlug');
const nutzung = block.indexOf("searchParams.set('b', aktuellerBeraterSlug)");
assert.ok(anlage >= 0, 'aktuellerBeraterSlug ist im Block der Empfängerseite nicht angelegt');
assert.ok(nutzung > anlage, 'aktuellerBeraterSlug wird benutzt, bevor es angelegt ist');
assert.match(block, /aktuellerBeraterSlug = berater\.slug/, 'Kürzel wird nach dem Laden des Beraters nicht gesetzt');

console.log('empfaenger-kuerzel: OK');
