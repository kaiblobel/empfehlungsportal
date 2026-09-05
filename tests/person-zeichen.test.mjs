// Waechter fuer das Zeichen vor dem Namen (Phase 330, 05.09.2026).
//
// Kais Wunsch war ein Geschlechtszeichen statt eines Buchstabens. Die
// naheliegende Loesung waere gewesen, es aus dem Vornamen abzuleiten. Ein Blick
// in die echten Daten hat das verworfen: neun von vierzehn Empfaengern haben
// nur EIN Wort als Namen, bei den Promotern steht der Nachname teils vorn
// ("Schmidt Lucas"), und Namen wie Kim oder Toni gehen in beide Richtungen.
//
// Ein falsches Zeichen stuende dann in der Akte eines Menschen, den jemand
// anruft. Deshalb kommt die Anrede aus einem Feld, das der Berater setzt.
// Diese Datei haelt fest, dass NIE geraten wird.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  personZeichen, personPlatzhalter, hatAnrede, zeichenBeschriftung,
  anredeAuswahlHtml, ANREDEN,
} from '../js/person-zeichen.js';

const lies = (d) => { try { return readFileSync(d, 'utf8'); } catch { return ''; } };

test('nur frau und herr sind erlaubt, alles andere ist "keine Angabe"', () => {
  assert.deepEqual(ANREDEN, ['frau', 'herr']);
  const neutral = personZeichen('');
  for (const unfug of [null, undefined, 'divers', 'FRAU ', 'm', 'w', 'x', 42, {}]) {
    if (String(unfug).trim().toLowerCase() === 'frau') continue;
    assert.equal(personZeichen(unfug), neutral, `${String(unfug)} muss neutral sein`);
  }
  // Und Gross-/Kleinschreibung samt Leerzeichen darf nicht stoeren.
  assert.equal(personZeichen(' Frau '), personZeichen('frau'));
  assert.equal(personZeichen('HERR'), personZeichen('herr'));
});

test('die drei Zeichen sind wirklich verschieden', () => {
  // Der erste Entwurf unterschied sie nur ueber feine Haarlinien. Bei 19 Pixeln
  // sahen alle drei gleich aus — genau der Mangel, der behoben werden sollte.
  const [f, h, n] = [personZeichen('frau'), personZeichen('herr'), personZeichen('')];
  assert.notEqual(f, h);
  assert.notEqual(f, n);
  assert.notEqual(h, n);
  // Die beiden bekannten tragen ein Abzeichen, das neutrale nicht.
  assert.match(f, /translate\(14\.2 13\.6\)/, 'Dem weiblichen Zeichen fehlt das Abzeichen');
  assert.match(h, /translate\(14\.2 13\.6\)/, 'Dem maennlichen Zeichen fehlt das Abzeichen');
  assert.ok(!/translate\(14\.2 13\.6\)/.test(n), 'Ohne Angabe darf kein Abzeichen stehen');
});

test('das Abzeichen sitzt auf einem eigenen Grund', () => {
  // Ohne eigenen Grund laeuft es in die Silhouette. Der Grund kommt aus der
  // Flaeche, auf der der Platzhalter liegt, und muss deshalb eine Variable sein.
  assert.match(personZeichen('frau'), /fill="var\(--pz-grund, #fff\)"/);
  assert.match(lies('css/dna.css'), /--pz-grund:/, 'dna.css setzt den Grund nicht');
  // Und wo eine eigene Flaeche gilt, muss er mitwandern.
  const hub = lies('css/hub.css');
  assert.match(hub, /\.h-lead\.interesse \.h-lead-avatar \{[^}]*--pz-grund/,
    'Beim Interesse-Lead sitzt das Abzeichen auf dem falschen Grund');
  assert.match(hub, /\.h-lead\.anrufwunsch \.h-lead-avatar \{[^}]*--pz-grund/,
    'Beim Anrufwunsch-Lead sitzt das Abzeichen auf dem falschen Grund');
});

test('nirgends wird das Geschlecht aus dem Namen abgeleitet', () => {
  // Der eigentliche Punkt dieser ganzen Uebung. Taucht hier je eine Vornamen-
  // liste oder eine Endungsregel auf, ist der Fehler zurueck.
  // Ohne Kommentare geprueft: dort steht das Wort "Vorname" absichtlich, weil
  // dort erklaert wird, warum NICHT geraten wird.
  const quelle = lies('js/person-zeichen.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/vorname|firstName|endetAuf|namensliste/i.test(quelle),
    'Es wird wieder aus dem Namen geraten');
  // personZeichen nimmt genau ein Argument: die Anrede. Keinen Namen.
  assert.equal(personZeichen.length, 1);
});

test('die Beschriftung behauptet nichts, was nicht dasteht', () => {
  assert.equal(zeichenBeschriftung('frau', 'Promoter'), 'Promoter, weiblich');
  assert.equal(zeichenBeschriftung('herr', 'Empfänger'), 'Empfänger, männlich');
  // Ohne Angabe bleibt es bei der Rolle — kein "unbekanntes Geschlecht".
  assert.equal(zeichenBeschriftung('', 'Promoter'), 'Promoter');
  assert.equal(zeichenBeschriftung(null, 'Empfänger'), 'Empfänger');
  assert.equal(hatAnrede('frau'), true);
  assert.equal(hatAnrede(''), false);
  assert.equal(hatAnrede('divers'), false);
});

test('die Rolle steuert die Farbe, nicht das Zeichen', () => {
  // Zwei Angaben, zwei Mittel: Zeichen = Anrede, Farbe = Rolle.
  const a = personPlatzhalter({ anrede: 'frau', rolle: 'promoter', titel: 'Promoter' });
  const b = personPlatzhalter({ anrede: 'frau', rolle: 'empfaenger', titel: 'Empfänger' });
  assert.match(a, /class="pz pz-promoter"/);
  assert.match(b, /class="pz pz-empfaenger"/);
  // Dasselbe Zeichen, andere Klasse.
  assert.equal(a.replace('pz-promoter', 'X'), b.replace('pz-empfaenger', 'X').replace('Empfänger', 'Promoter'));
  // Eine unbekannte Rolle bekommt keine Farbklasse untergeschoben.
  assert.match(personPlatzhalter({ rolle: 'irgendwas' }), /class="pz"/);
});

test('das Auswahlfeld bietet genau die drei Moeglichkeiten', () => {
  const html = anredeAuswahlHtml('test', 'herr');
  assert.match(html, /<option value=""/);
  assert.match(html, /<option value="frau"/);
  assert.match(html, /<option value="herr" selected/);
  assert.equal((html.match(/<option/g) || []).length, 3);
});

test('nur erlaubte Werte erreichen die Datenbank', () => {
  // Die Pruefregel der Tabelle laesst nur frau, herr und NULL zu. Kaeme etwas
  // anderes an, schluege das Speichern fehl — deshalb sieben beide Speicherwege
  // vorher aus.
  const promoter = lies('js/promoter-detail.js');
  assert.match(promoter, /ANREDEN\.includes\(gewaehlt\) \? gewaehlt : null/,
    'Die Promoterakte reicht ungeprueft durch');
  const dashboard = lies('js/dashboard.js');
  assert.match(dashboard, /\['frau', 'herr'\]\.includes\(wert\) \? wert : null/,
    'Die Empfehlung reicht ungeprueft durch');
  // Und ein alter Aufrufer ohne das Feld darf nichts ueberschreiben.
  assert.match(dashboard, /if \(anrede !== undefined\)/,
    'Ein Aufruf ohne Anrede wuerde eine vorhandene Angabe loeschen');
});

test('auf dunkler Flaeche steht das Zeichen hell', () => {
  // Beim Anrufwunsch liegt der Platzhalter auf --burnt-orange. Ohne eigene
  // Schriftfarbe erbt er die aus .pz-empfaenger — und die IST derselbe Ton:
  // gemessen 1,0 zu 1, also vollstaendig unsichtbar. Genau so war es gebaut,
  // bis es am gerenderten Bild gemessen wurde.
  const hub = lies('css/hub.css');
  const regel = hub.slice(hub.indexOf('.h-lead.anrufwunsch .h-lead-avatar {'));
  const block = regel.slice(0, regel.indexOf('}'));
  assert.match(block, /color:\s*#fff/, 'Das Zeichen verschwindet in der dunklen Flaeche');
});
