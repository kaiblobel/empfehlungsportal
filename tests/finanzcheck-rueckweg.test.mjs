// Phase 365: Der Weg zurück aus dem Finanzcheck.
//
// Kais Befund am 12.09.2026: „wenn ich in den Finanzcheck klicke und dann auf
// das X schließen lande ich auf der Anmeldeseite des Empfehlungsportals."
//
// Nachgestellt: Das X ruft returnToWebsite() in der Kundenseite. Die Funktion
// sprang blind einen Schritt im Browserverlauf zurück. Über die Empfängerseite
// stimmt das zufällig, im frisch geöffneten Tab landet man im Nichts, und wer
// vorher woanders war, landet dort, zuletzt auf der Anmeldeseite.
//
// Die Lösung liegt hier im Portal: Es hängt seine eigene Adresse als ?zurueck=
// an jeden Finanzcheck-Link. Der Check muss dann nichts mehr erraten. Dieser
// Wächter hält fest, dass der Parameter gesetzt wird, und zwar auf beiden Wegen:
// mit aufgelöstem Berater (berater-brand.js) und ohne (app.js).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const brand = read('js/berater-brand.js');
const app = read('js/app.js');

/* --- 1) Mit Berater: das Kürzel und der Rückweg gehen zusammen mit --- */

// Bis zum Ende des Falls schneiden, nicht nach fester Länge: Die Erklärungen
// davor sind lang, ein fester Ausschnitt endet sonst vor dem Code.
const start = brand.indexOf("case 'finanzcheck'");
const fall = brand.slice(start, brand.indexOf('break;', start));
assert.match(fall, /ziel\.searchParams\.set\('zurueck', window\.location\.href\)/,
  'Der Finanzcheck-Link bekommt den Rückweg nicht mit.');
assert.match(fall, /ziel\.searchParams\.set\('b', b\.slug\)/,
  'Das Beraterkürzel muss weiterhin mitgehen.');
// Der Rückweg darf nicht am Berater hängen: ohne Zuordnung braucht ihn die Seite
// genauso, sonst bleibt genau Kais Fall bestehen.
const zurueckZeile = fall.indexOf("set('zurueck'");
const slugPruefung = fall.indexOf('if (b.slug)');
assert.ok(slugPruefung === -1 || zurueckZeile > slugPruefung,
  'Der Rückweg darf nicht in der Bedingung für das Beraterkürzel stecken.');

/* --- 2) Ohne Berater: app.js setzt ihn trotzdem --- */

assert.match(app, /querySelectorAll\('\[data-bb="finanzcheck"\]'\)[\s\S]{0,400}searchParams\.set\('zurueck', window\.location\.href\)/,
  'Ohne aufgelösten Berater bleibt der Link ohne Rückweg.');
// Ein schon gesetzter Rückweg wird nicht überschrieben.
assert.match(app, /if \(!ziel\.searchParams\.get\('zurueck'\)\)/,
  'Ein vorhandener Rückweg darf nicht überschrieben werden.');

/* --- 3) Die Themenvorlage baut den Link neu und darf ihn nicht verlieren --- */

assert.match(app, /\['from', 'schwerpunkt', 'v', 'b', 'zurueck'\]\.forEach/,
  'applyVorlage baut den Finanzcheck-Link neu und muss das Rückziel mitnehmen.');

console.log('finanzcheck-rueckweg: OK');
