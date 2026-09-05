// Waechter fuer die Symbole in der Empfehlungs-Detailansicht
// (Phase 331, 05.09.2026).
//
// Kai: "Da waere es vielleicht auch schoen, dass da keine Platzhalter sind wie
// zum Beispiel per Telefon, dass da nicht TEL drinsteht, sondern das Symbol
// fuer Telefon. Das wirkt glaub ich hochwertiger." Dazu: "die Schrift, dass die
// da so verrueckt ist."
//
// Er hatte mit beidem recht, und das zweite erklaert das erste: die Kaestchen
// sind 26 bis 30 Pixel gross, die Kuerzel standen darin mit 9 bis 10 Pixeln,
// fett und in Versalien. Ein dreibuchstabiges Kuerzel fuellt das Kaestchen dann
// randlos aus und liest sich wie ein Fehler, nicht wie ein Symbol.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICONS } from '../js/icons.js';

const lies = (d) => { try { return readFileSync(d, 'utf8'); } catch { return ''; } };

test('kein Kuerzel steht mehr in einem Kaestchen', () => {
  const js = lies('js/empfehlung-detail.js');
  // Genau die Kuerzel, die Kai aufgefallen sind, plus die aus dem Verlauf.
  const kuerzel = ['TEL', 'MAIL', 'KAN', 'ZEIT', 'LINK', 'THE', 'TYP',
    'QUE', 'PRO', 'ERG', 'VER', 'BER', '01', '02', '03', '04', 'OK', 'EN'];
  for (const k of kuerzel) {
    for (const ruf of ['summaryCard', 'contactCard', 'eventRow']) {
      assert.ok(!js.includes(`${ruf}('${k}'`), `${ruf} bekommt noch das Kuerzel "${k}"`);
    }
    assert.ok(!js.includes(`['${k}',`), `Im Verlauf steht noch das Kuerzel "${k}"`);
  }
});

test('jedes verwendete Zeichen gibt es wirklich', () => {
  // Ein Tippfehler im Namen faellt sonst nicht auf: icon() gibt bei einem
  // unbekannten Namen einen leeren String zurueck. Das Kaestchen waere dann
  // einfach leer — schlimmer als ein Kuerzel.
  const js = lies('js/empfehlung-detail.js');
  const gefunden = [...js.matchAll(/(?:summaryCard|contactCard|eventRow)\('([A-Za-z0-9]+)'/g)]
    .map((m) => m[1]);
  const ausVerlauf = [...js.matchAll(/^\s+\w+: \['([A-Za-z0-9]+)',/gm)].map((m) => m[1]);
  const alle = [...new Set([...gefunden, ...ausVerlauf])];
  assert.ok(alle.length >= 12, `Es wurden nur ${alle.length} Zeichen gefunden, erwartet mindestens 12`);
  for (const name of alle) {
    assert.ok(ICONS[name], `Das Zeichen "${name}" gibt es in icons.js nicht — das Kaestchen bliebe leer`);
    assert.match(ICONS[name], /^<svg /, `"${name}" ist kein SVG`);
  }
});

test('die Zeichen bekommen eine Groesse, sonst laufen sie ueber', () => {
  // Ohne eigene Regel gilt die Standardgroesse aus icon() (20px). In einem
  // 26px-Kaestchen passt das zwar, sitzt aber unruhig.
  const css = lies('css/empfehlung-detail.css');
  for (const klasse of ['.ed-summary-icon', '.ed-contact-icon', '.ed-event-dot']) {
    // Wortgrenze davor, sonst zaehlt auch ein verschriebenes "xwidth" als Treffer.
    const muster = new RegExp(`\\${klasse} svg\\s*\\{[^}]*(?:^|[^\\w-])width:\\s*\\d+px`);
    assert.match(css, muster, `${klasse} gibt dem Zeichen keine Groesse`);
  }
  // Und die alte Schriftgroesse muss weg, sonst bleibt unter dem Zeichen eine
  // Zeilenhoehe stehen und verschiebt es.
  //
  // Dabei zaehlt die Spezifitaet, nicht nur der Wortlaut: Am gerenderten Bild
  // gemessen treffen `.ed-summary-card span` und `.ed-contact span` dieselben
  // Kaestchen und sind mit Klasse+Element spezifischer als eine einzelne
  // Klasse. Ein erster Entwurf mit `.ed-summary-icon { font-size: 0 }` sah im
  // Quelltext richtig aus und wurde im Browser ueberschrieben — dieselbe Falle
  // wie beim Fokusrahmen mit :where(). Deshalb muss die Regel zwei Klassen
  // tragen.
  for (const [aussen, innen] of [
    ['ed-summary-card', 'ed-summary-icon'],
    ['ed-contact', 'ed-contact-icon'],
    ['ed-event', 'ed-event-dot'],
  ]) {
    const muster = new RegExp(`\\.${aussen} \\.${innen}\\s*\\{[^}]*font-size:\\s*0`);
    assert.match(css, muster,
      `.${innen} setzt die Schriftgroesse mit zu wenig Spezifitaet — .${aussen} span gewinnt`);
  }
});

test('im Kopf der Seite steht das Personenzeichen, kein Buchstabe', () => {
  const js = lies('js/empfehlung-detail.js');
  assert.ok(!/class="ed-initial"/.test(js),
    'Im Kopf steht noch die Initiale statt des Personenzeichens');
  // Es gibt zwei Aufrufe: beim Aufbau der Seite und beim Speichern eines neuen
  // Namens. Eine Sabotage am ersten allein liess einen frueheren Entwurf gruen.
  // Deshalb muessen ALLE Aufrufe in dieser Datei die Kopfgroesse tragen.
  const aufrufe = [...js.matchAll(/personPlatzhalter\(\{[^}]*\}\)/g)].map((m) => m[0]);
  assert.ok(aufrufe.length >= 2, `Erwartet mindestens 2 Aufrufe, gefunden ${aufrufe.length}`);
  for (const a of aufrufe) {
    assert.match(a, /klasse: 'pz-hero'/, `Ein Aufruf ohne Kopfgroesse: ${a}`);
  }
  // Die eigene Groesse muss dna.css schlagen. Gleiche Spezifitaet wuerde
  // verlieren, weil dna.css spaeter geladen wird.
  const css = lies('css/empfehlung-detail.css');
  assert.match(css, /\.ed-person \.pz\.pz-hero \{/,
    'Ohne hoehere Spezifitaet gewinnt die Grundgroesse aus dna.css');
  assert.match(css, /\.ed-person \.pz\.pz-hero \{[^}]*--pz-grund/,
    'Das Abzeichen sitzt auf dem falschen Grund');
});
