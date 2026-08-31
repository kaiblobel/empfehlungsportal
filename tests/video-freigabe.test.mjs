// Kein Film auf einer Kundenseite ohne Kais Freigabe.
//
// Anlass: Am 29.08.2026 wurde auf der Themenseite eine 25 Sekunden lange
// Probefassung des Erstgespraechsfilms eingebunden und hochgeladen. Vercel
// veroeffentlicht jeden Push auf main sofort. Der Film war damit live, ohne
// dass Kai ihn je gesehen hatte. Gemerkt hat es niemand, bis Kai zwei Tage
// spaeter selbst auf die Seite ging.
//
// Der bestehende Waechter tests/ki-kennzeichnung.test.mjs haette das nicht
// gefangen: Der Probefilm war ordentlich gekennzeichnet. Er war nur nicht
// gewollt. Kennzeichnung und Freigabe sind zwei verschiedene Fragen.
//
// Geprueft wird gegen assets/video/FREIGABEN.json:
//   1. Jedes Video, das eine Seite einbindet, steht dort unter "freigegeben".
//   2. Sein Inhalt entspricht der eingetragenen Pruefsumme. Der Name allein
//      reicht nicht: Genau die Verwechslung "gleicher Name, anderer Inhalt"
//      soll dieser Test abfangen.
//
// Die Freigabe traegt Kai ein, kein Agent. Das kann ein Test nicht erzwingen,
// aber er macht jede Umgehung sichtbar: Wer einen Film live stellt, muss
// dieselbe Aenderung auch in FREIGABEN.json machen, und die faellt beim
// Durchsehen sofort auf.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const lies = (datei) => readFile(new URL(datei, root), 'utf8');

// Dieselben Seiten wie in der KI-Kennzeichnung. Wer eine Seite mit Video
// hinzufuegt, traegt sie in BEIDEN Listen nach.
const SEITEN = ['programm.html', 'empfaenger.html', 'baufi.html'];

const freigaben = JSON.parse(await lies('assets/video/FREIGABEN.json'));
const freigegeben = new Map(freigaben.freigegeben.map((e) => [e.datei, e]));
const wartend = new Map((freigaben.wartet_auf_kai ?? []).map((e) => [e.datei, e]));

/* --- 1) Was binden die Seiten ueberhaupt ein? --- */

// Gelesen wird aus dem HTML, nicht gepflegt. Eine gepflegte Liste veraltet
// genau dann, wenn es darauf ankommt.
const eingebunden = new Map(); // datei -> [seiten]
for (const seite of SEITEN) {
  const html = await lies(seite);
  for (const treffer of html.matchAll(/\/assets\/video\/([\w.-]+\.mp4)/g)) {
    const datei = treffer[1];
    if (!eingebunden.has(datei)) eingebunden.set(datei, []);
    if (!eingebunden.get(datei).includes(seite)) eingebunden.get(datei).push(seite);
  }
}

assert.ok(eingebunden.size > 0, 'Keine Seite bindet ein Video ein — pruefe SEITEN in diesem Test.');

/* --- 2) Jedes eingebundene Video ist freigegeben --- */

// Auch die zweite <source>-Zeile zaehlt: Sie spielt, sobald der Browser mit
// der ersten nichts anfangen kann. "Nur als Rueckfall drin" ist keine
// Ausnahme, sondern derselbe Film vor denselben Kundenaugen.
const ohneFreigabe = [];
for (const [datei, seiten] of eingebunden) {
  if (freigegeben.has(datei)) continue;
  const wartet = wartend.get(datei);
  ohneFreigabe.push(
    `${datei} laeuft auf ${seiten.join(', ')}`
      + (wartet ? ` — steht in FREIGABEN.json unter "wartet_auf_kai": ${wartet.offen}` : ''),
  );
}

assert.deepEqual(
  ohneFreigabe,
  [],
  'Diese Filme sind eingebunden, aber nicht von Kai freigegeben:\n  '
    + ohneFreigabe.join('\n  ')
    + '\n\nEntweder Kai sieht den Film an und traegt ihn in assets/video/FREIGABEN.json '
    + 'unter "freigegeben" ein, oder die Einbindung wird zurueckgenommen. '
    + 'Kein Agent traegt sich hier selbst ein.',
);

/* --- 3) Der Inhalt passt zur eingetragenen Pruefsumme --- */

const abweichend = [];
for (const datei of eingebunden.keys()) {
  const eintrag = freigegeben.get(datei);
  const bytes = await readFile(new URL(`assets/video/${datei}`, root));
  const ist = createHash('sha256').update(bytes).digest('hex');
  if (ist !== eintrag.sha256) {
    abweichend.push(
      `${datei}\n    freigegeben war: ${eintrag.sha256}\n    da liegt jetzt:  ${ist}`,
    );
  }
}

assert.deepEqual(
  abweichend,
  [],
  'Der Inhalt dieser Dateien ist nicht der freigegebene:\n  '
    + abweichend.join('\n  ')
    + '\n\nEine andere Fassung unter demselben Dateinamen ist eine neue Fassung. '
    + 'Sie braucht Kais Freigabe wie jede andere auch.',
);

/* --- 4) Die Liste selbst bleibt sauber --- */

// Ein Eintrag fuer eine Datei, die es nicht mehr gibt, ist eine Freigabe ins
// Leere. Faellt sonst niemandem auf, bis jemand eine neue Datei mit dem alten
// Namen ablegt und sie damit ungeprueft geerbt hat.
const imOrdner = new Set(
  (await readdir(new URL('assets/video/', root))).filter((n) => n.endsWith('.mp4')),
);
const verwaisteEintraege = [...freigegeben.keys(), ...wartend.keys()]
  .filter((d) => !imOrdner.has(d));

assert.deepEqual(
  verwaisteEintraege,
  [],
  `FREIGABEN.json nennt Dateien, die es nicht mehr gibt: ${verwaisteEintraege.join(', ')}. `
    + 'Eintrag entfernen, sonst erbt eine spaetere Datei mit gleichem Namen diese Freigabe.',
);

/* --- 5) Jeder Eintrag traegt, wer wann freigegeben hat --- */

for (const eintrag of freigaben.freigegeben) {
  for (const feld of ['datei', 'sha256', 'laeuft_auf', 'freigegeben_von', 'freigegeben_am']) {
    assert.ok(
      eintrag[feld],
      `FREIGABEN.json: Eintrag ${eintrag.datei ?? '(ohne Namen)'} hat kein Feld "${feld}". `
        + 'Ohne Datum und Namen ist es keine Freigabe, sondern nur eine Zeile.',
    );
  }
  assert.match(
    eintrag.freigegeben_am,
    /^\d{4}-\d{2}-\d{2}$/,
    `FREIGABEN.json: "${eintrag.freigegeben_am}" bei ${eintrag.datei} ist kein Datum (JJJJ-MM-TT).`,
  );
}

console.log(
  `video-freigabe: OK (${eingebunden.size} eingebundene Filme, alle freigegeben, `
    + 'Pruefsummen stimmen)',
);
