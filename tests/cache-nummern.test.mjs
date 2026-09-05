// Waechter gegen die stille Falle mit den Cache-Nummern (05.09.2026).
//
// Was passiert ist: In Phase 326 wurden acht Stylesheets geaendert, aber die
// Nummern hinter `?v=` blieben stehen. Der Bau lief, die Veroeffentlichung lief,
// die Datei auf dem Server war richtig — und der Browser lieferte trotzdem die
// alte Fassung, weil er die Adresse `css/dna.css?v=11` bereits kannte. Auf der
// Anmeldeseite standen deshalb noch die alten Farben, gemessen an der Live-Seite.
//
// Das Tueckische: Nichts meldet sich. Kein roter Test, kein Fehler im Protokoll.
// Man sieht es nur, wenn man die fertige Seite anschaut und die Werte misst.
//
// Dieser Waechter macht daraus einen roten Test vor dem Hochladen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const lies = (d) => { try { return readFileSync(d, 'utf8'); } catch { return ''; } };

/** Alle Seiten des Projekts, auch die Kundenseiten: die Falle gilt ueberall. */
function seiten() {
  const wurzel = readdirSync('.').filter((d) => d.endsWith('.html'));
  const dash = readdirSync('dashboard').filter((d) => d.endsWith('.html')).map((d) => `dashboard/${d}`);
  return [...wurzel, ...dash];
}

test('jedes eingebundene Stylesheet und Skript traegt eine Cache-Nummer', () => {
  // Ohne Nummer entscheidet allein der Browser, wie lange er die alte Fassung
  // behaelt. Mit Nummer ist der Wechsel eine neue Adresse und damit sicher.
  // Eine benannte Ausnahme: js/config.js traegt bewusst KEINE Nummer. Sie
  // enthaelt selbst die Fassungsnummer, deshalb holt der Service Worker sie
  // ausdruecklich immer erst aus dem Netz (Network-First, sw.js Phase 133).
  // Eine Cache-Nummer waere dort doppelt gemoppelt.
  const OHNE_NUMMER_ERLAUBT = ['js/config.js'];

  const fehler = [];
  for (const datei of seiten()) {
    const inhalt = lies(datei);
    for (const treffer of inhalt.matchAll(/(?:href|src)="((?:\.\.\/)?(?:css|js)\/[^"?]+\.(?:css|js))"/g)) {
      const pfad = treffer[1].replace('../', '');
      if (OHNE_NUMMER_ERLAUBT.includes(pfad)) continue;
      fehler.push(`${datei}: ${treffer[1]} ohne ?v=`);
    }
  }
  assert.deepEqual(fehler, [], 'Eingebundene Datei ohne Cache-Nummer');
});

test('dieselbe Datei traegt auf allen Seiten dieselbe Nummer', () => {
  // Sonst sieht ein Berater je nach Seite zwei verschiedene Staende.
  const nummern = new Map();
  for (const datei of seiten()) {
    for (const treffer of lies(datei).matchAll(/(?:href|src)="(?:\.\.\/)?((?:css|js)\/[^"?]+\.(?:css|js))\?v=([^"]+)"/g)) {
      const [, pfad, nr] = treffer;
      if (!nummern.has(pfad)) nummern.set(pfad, new Map());
      nummern.get(pfad).set(nr, (nummern.get(pfad).get(nr) || []).concat?.(datei) ?? datei);
    }
  }
  const uneinig = [...nummern.entries()]
    .filter(([, n]) => n.size > 1)
    .map(([pfad, n]) => `${pfad}: ${[...n.keys()].join(' vs ')}`);
  assert.deepEqual(uneinig, [], 'Dieselbe Datei mit verschiedenen Cache-Nummern');
});

test('der Dienstspeicher haelt dieselben Nummern vor wie die Seiten', () => {
  // Steht im Service Worker eine alte Nummer, legt er die alte Fassung an und
  // liefert sie noch Tage spaeter aus, obwohl die Seite die neue anfordert.
  const sw = lies('sw.js');
  const inSeiten = new Map();
  for (const datei of seiten()) {
    for (const treffer of lies(datei).matchAll(/(?:href|src)="(?:\.\.\/)?((?:css|js)\/[^"?]+\.(?:css|js))\?v=([^"]+)"/g)) {
      inSeiten.set(treffer[1], treffer[2]);
    }
  }
  const fehler = [];
  for (const treffer of sw.matchAll(/'\/((?:css|js)\/[^'?]+\.(?:css|js))\?v=([^']+)'/g)) {
    const [, pfad, nr] = treffer;
    const erwartet = inSeiten.get(pfad);
    if (erwartet && erwartet !== nr) fehler.push(`${pfad}: Speicher ${nr}, Seiten ${erwartet}`);
  }
  assert.deepEqual(fehler, [], 'Der Dienstspeicher legt eine andere Fassung an, als die Seiten anfordern');
});
