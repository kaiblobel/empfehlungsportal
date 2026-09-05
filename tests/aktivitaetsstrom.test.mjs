// Waechter fuer den Aktivitaetsstrom (Phase 329, 05.09.2026).
//
// Kais Befund am Bild: "das sieht alles einheitlich aus, kannst du mir das
// etwas staerker hervorheben und auch einen kleinen Abstand zwischen den
// Karten machen".
//
// Sieben Ereignisarten sahen gleich aus, weil drei Sachen zusammenkamen: die
// Zeilen waren flach (kein Rahmen, keine Rundung, durchsichtig), der farbige
// Strich stand mit `left: -18px` ausserhalb der Zeile, und die Marke ("Link
// geklickt", "Interesse") wurde zu 26 Prozent mit Grau gemischt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lies = (d) => { try { return readFileSync(d, 'utf8'); } catch { return ''; } };
const hubCss = lies('css/hub.css');
const hubJs = lies('js/hub.js');

test('jedes Ereignis ist eine Karte mit Abstand, nicht eine flache Zeile', () => {
  const block = hubCss.slice(hubCss.indexOf('body[data-page="hub"] .h-activity-row {'));
  const karte = block.slice(0, block.indexOf('}'));
  assert.match(karte, /border:\s*1px solid var\(--dna-line\)/, 'Die Karte hat keine Kante');
  assert.match(karte, /border-radius:\s*var\(--radius-md\)/, 'Die Karte ist nicht gerundet');
  assert.match(karte, /background:\s*var\(--dna-card\)/, 'Die Karte hat keine eigene Flaeche');
  // Der Abstand zwischen den Karten sitzt am Behaelter. Es gibt mehrere
  // Regeln dafuer; mindestens eine muss einen Abstand setzen, und KEINE darf
  // ihn auf 0 zuruecknehmen (das tat frueher eine Media-Query).
  const stroeme = [...hubCss.matchAll(/\.h-side-activity \.h-timeline \{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(stroeme.some((r) => /gap:\s*[1-9]/.test(r)), 'Kein Abstand zwischen den Karten');
  assert.ok(!stroeme.some((r) => /gap:\s*0/.test(r)), 'Eine Regel nimmt den Abstand wieder auf 0 zurueck');
});

test('die Art des Ereignisses steht an der Karte, nicht daneben', () => {
  const block = hubCss.slice(hubCss.indexOf('body[data-page="hub"] .h-activity-row {'));
  const karte = block.slice(0, block.indexOf('}'));
  assert.match(karte, /border-left:\s*3px solid var\(--act-color/, 'Die farbige Kante fehlt');
  // Der alte Strich stand mit left:-18px ausserhalb und war praktisch
  // unsichtbar. Er wurde ausserdem in zwei Media-Queries wieder gesetzt.
  const ohneKommentare = hubCss.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/left:\s*-18px/.test(ohneKommentare),
    'Der Strich ausserhalb der Zeile ist zurueck');
});

test('die Marke traegt die Farbe des Ereignisses, nicht ein Graugemisch', () => {
  const stellen = [...hubCss.matchAll(/body\[data-page="hub"\] \.h-activity-pill \{([^}]*)\}/g)];
  assert.equal(stellen.length, 1, 'Es soll genau EINE Regel fuer die Marke geben');
  const regel = stellen[0][1];
  assert.match(regel, /color:\s*var\(--act-text/, 'Die Marke steht nicht in der Ereignisfarbe');
  assert.ok(!/color-mix\([^)]*#555/.test(regel), 'Die Farbe wird wieder mit Grau verwaessert');
  assert.match(regel, /font-weight:\s*700/, 'Die Marke ist nicht hervorgehoben');
});

test('Gold traegt auch hier keine Schrift', () => {
  // #C8AA22 auf Weiss sind 2,28:1. Das Ereignis "Interesse" ist golden, seine
  // Marke muss deshalb eine zweite, dunklere Farbe tragen.
  const meta = hubJs.slice(hubJs.indexOf('const EVENT_META = {'));
  const interest = meta.slice(meta.indexOf('interest:'), meta.indexOf('\n', meta.indexOf('interest:')));
  assert.match(interest, /color:\s*'#C8AA22'/, 'Interesse traegt nicht mehr das Markengold');
  assert.match(interest, /text:\s*'#786614'/, 'Fuer die Schrift fehlt die zweite Farbe (gold-140)');
  // Und die Regel muss diese zweite Farbe auch benutzen.
  assert.match(hubCss, /color:\s*var\(--act-text,\s*var\(--act-color\)\)/);
});

test('die Ereignisfarben kommen aus den Haustokens', () => {
  // Sie standen auf der alten Portal-Palette (#2E6E7A, #5E939E, #0B4650,
  // #13191D) und waren nach dem Anstrich aus Phase 326 die einzigen Werte,
  // die noch aus der alten Welt kamen.
  const alt = ['#2E6E7A', '#5E939E', '#0B4650', '#13191D', '#8F7809'];
  const meta = hubJs.slice(hubJs.indexOf('const EVENT_META = {'), hubJs.indexOf('const NEW_BADGE_WINDOW_MS'));
  const team = hubJs.slice(hubJs.indexOf('const TEAM_META = {'));
  const teamBlock = team.slice(0, team.indexOf('};'));
  for (const wert of alt) {
    assert.ok(!meta.includes(wert), `EVENT_META traegt noch den alten Wert ${wert}`);
    assert.ok(!teamBlock.includes(wert), `TEAM_META traegt noch den alten Wert ${wert}`);
  }
});

test('die Toenung laeuft ueber die Variable, nicht ueber einen Zeichenvergleich', () => {
  // Bis Phase 329 stand die Farbe zweimal da: in js/hub.js und als Selektor
  // .h-activity-row[style*="#0B4650"] in css/hub.css. Wurde sie nur an einer
  // Stelle geaendert, griff die Toenung stillschweigend nicht mehr. Genau das
  // war beim Umstellen der Farben passiert.
  assert.ok(!/\.h-activity-row\[style\*=/.test(hubCss),
    'Ein Selektor vergleicht wieder die Farbe als Zeichenkette');
});
