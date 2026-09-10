// Waechter fuer den Nachnamen (Phase 331, 05.09.2026).
//
// Kais Beobachtung: "Wenn mich ein Promoter weiterempfiehlt, traegt er
// eigentlich nur den Vornamen ein, weil seine persoenliche Ansprache ueber die
// Themenseite laeuft. Und wenn ich die Empfehlung bekommen habe, habe ich gar
// nicht die Moeglichkeit, den Nachnamen nachzutragen."
//
// Gemessen an den echten Daten stimmte das: von vierzehn Empfehlungen hatten
// neun nur EIN Wort als Namen.
//
// Zwei Dinge muessen dabei gleichzeitig halten, und sie ziehen in
// entgegengesetzte Richtungen:
//   1. Kai braucht den Nachnamen, sonst weiss er nicht, wen er anruft.
//   2. Angesprochen wird der Kontakt weiterhin NUR mit dem Vornamen, weil
//      "Hallo Anna" persoenlich wirkt und "Hallo Anna Schmidt" nicht.
// Diese Datei haelt beides fest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lies = (d) => { try { return readFileSync(d, 'utf8'); } catch { return ''; } };

/* Die drei Namens-Helfer stehen in einem Seiten-Modul, das sich ohne Browser
   nicht laden laesst. Also werden sie aus der Quelle geschnitten und wirklich
   ausgefuehrt — geprueft wird der echte Code, nicht eine Nachbildung. */
function helfer() {
  const quelle = lies('js/empfehlung-detail.js');
  const namen = ['vornameVon', 'nachnameVon', 'nameZusammen'];
  const teile = namen.map((n) => {
    const start = quelle.indexOf(`function ${n}(`);
    assert.ok(start > -1, `${n} fehlt in empfehlung-detail.js`);
    const ende = quelle.indexOf('\n}', start);
    return quelle.slice(start, ende + 2);
  });
  return new Function(`${teile.join('\n')}\nreturn { ${namen.join(', ')} };`)();
}

test('Aufteilen und Zusammensetzen verliert nichts', () => {
  const { vornameVon, nachnameVon, nameZusammen } = helfer();
  for (const name of [
    'Anna Schmidt', 'Anna', 'Anna Maria Schmidt', 'Lisa von der Heide',
    '  Tom   Meier  ', 'Jean-Luc Picard',
  ]) {
    const rund = nameZusammen(vornameVon(name), nachnameVon(name));
    assert.equal(rund, name.trim().replace(/\s+/g, ' '),
      `Der Name "${name}" kommt nicht unveraendert zurueck`);
  }
  // Leeres bleibt leer und wirft nicht.
  for (const leer of ['', '   ', null, undefined]) {
    assert.equal(vornameVon(leer), '');
    assert.equal(nachnameVon(leer), '');
  }
  assert.equal(nameZusammen('', ''), '');
  assert.equal(nameZusammen('Anna', ''), 'Anna');
  assert.equal(nameZusammen('', 'Schmidt'), 'Schmidt');
});

test('das erste Wort ist der Vorname, der Rest der Nachname', () => {
  const { vornameVon, nachnameVon } = helfer();
  assert.equal(vornameVon('Anna Schmidt'), 'Anna');
  assert.equal(nachnameVon('Anna Schmidt'), 'Schmidt');
  // Mehrteilige Nachnamen bleiben zusammen.
  assert.equal(nachnameVon('Lisa von der Heide'), 'von der Heide');
  // Ein einzelnes Wort ist der Vorname — genau der heutige Bestand.
  assert.equal(vornameVon('Anna'), 'Anna');
  assert.equal(nachnameVon('Anna'), '');
});

test('die Ansprache nimmt weiterhin nur den Vornamen', () => {
  // Das ist der Punkt, der beim Nachtragen kaputtgehen koennte: sobald in der
  // Datenbank "Anna Schmidt" steht, wuerde eine Seite ohne diese Verkuerzung
  // "Hallo Anna Schmidt" schreiben. Alle sechs Stellen muessen kuerzen.
  // Die Kuerzung muss am EMPFAENGERNAMEN haengen. Ein erster Entwurf dieses
  // Waechters suchte den Ausdruck nur irgendwo in der Datei — und wurde in
  // baufi.js von der Kuerzung des BERATERnamens gruen gehalten, obwohl die
  // Ansprache des Empfaengers sabotiert war.
  const kuerzt = /split\(\/\\s\+\/\)\[0\]/;
  for (const datei of ['js/app.js', 'js/baufi.js', 'js/kidz-empfehlung-intro.js']) {
    const zeile = lies(datei).split('\n')
      .find((z) => z.includes('empfaenger_name') && kuerzt.test(z));
    assert.ok(zeile, `${datei} kuerzt den Empfaengernamen nicht mehr auf den Vornamen`);
  }
  // Zwei Dateien gehen ueber einen Helfer. Dann muss beides stimmen: der
  // Helfer kuerzt, und er bekommt den Empfaengernamen.
  for (const datei of ['js/themen-vorschau.js', 'js/empfehler-mobile.js']) {
    const quelle = lies(datei);
    const helfer = quelle.slice(quelle.indexOf('function firstName'), quelle.indexOf('function firstName') + 200);
    assert.match(helfer, kuerzt, `${datei}: firstName kuerzt nicht mehr`);
  }
  assert.match(lies('js/themen-vorschau.js'), /firstName\(\s*data\.empfaenger_name/,
    'themen-vorschau.js schickt den Empfaengernamen nicht mehr durch firstName');
});

test('der Promoter kann den Nachnamen eintragen, muss aber nicht', () => {
  const html = lies('empfehler.html');
  assert.match(html, /id="contactLastName"/, 'Dem Promoter fehlt das Nachnamen-Feld');
  // Freiwillig: das Feld traegt kein required und ist als optional beschriftet.
  const feld = html.slice(html.indexOf('id="contactLastName"'));
  assert.ok(!/^[^>]*required/.test(feld), 'Der Nachname darf kein Pflichtfeld sein');
  assert.match(html, /contactLastName[\s\S]{0,400}?label-optional|label-optional[\s\S]{0,400}?contactLastName/,
    'Am Feld steht nicht, dass es freiwillig ist');

  const js = lies('js/empfehler-mobile.js');
  // Die Pflichtpruefung von Schritt 1 darf den Nachnamen nicht verlangen.
  const schritt1 = js.slice(js.indexOf('funnel.step === 1 &&'), js.indexOf('funnel.step === 1 &&') + 320);
  assert.ok(!/nachname/i.test(schritt1), 'Schritt 1 verlangt den Nachnamen');
  // Beim Speichern wird zusammengesetzt, nicht nur der Vorname geschickt.
  assert.match(js, /empfaenger_name: vollerName\(\)/,
    'Der Nachname des Promoters landet nicht in der Empfehlung');
  // Und beim Zuruecksetzen darf er nicht stehen bleiben.
  assert.match(js, /step: 1, name: '', nachname: ''/,
    'Ein neuer Vorgang erbt den Nachnamen des vorigen');
});

test('Kai kann den Namen in der Empfehlung nachtragen', () => {
  const js = lies('js/empfehlung-detail.js');
  assert.match(js, /id="vornameFeld"/, 'Das Vornamen-Feld fehlt');
  assert.match(js, /id="nachnameFeld"/, 'Das Nachnamen-Feld fehlt');
  assert.match(js, /updateStatus\(id, status, notiz, \{ anrede, name \}\)/,
    'Der Name wird beim Speichern nicht mitgeschickt');
  // Der Hinweis muss dranstehen, sonst wirkt es wie ein Widerspruch zur
  // Ansprache auf der Themenseite.
  assert.match(js, /nur mit dem Vornamen/,
    'Es steht nicht dabei, dass die Ansprache beim Vornamen bleibt');
});

test('ein leerer Name wird nie gespeichert', () => {
  // Sonst haette die Empfehlung keinen Kontakt mehr. Beim Anlegen verlangt die
  // Datenbank einen Namen, beim Aendern pruefte bisher nichts.
  const dashboard = lies('js/dashboard.js');
  const stelle = dashboard.slice(dashboard.indexOf('if (weitere.name !== undefined)'));
  const block = stelle.slice(0, stelle.indexOf('const { error }'));
  assert.match(block, /if \(name\)/, 'Ein leeres Feld wuerde den Namen loeschen');
  assert.match(block, /slice\(0, 120\)/, 'Die Laengengrenze der Spalte wird nicht eingehalten');
});
