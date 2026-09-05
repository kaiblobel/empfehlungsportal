// Waechter fuer die Familienaehnlichkeit zum Haus (Phase 326, 05.09.2026).
//
// Kais Vorgabe: "waere schon gut wenn die Anwendungen alle aus einer Schmiede
// kommen ... so wie bei DVAG, da sehen die Anwendungen aus einer Familie, aber
// trotzdem nicht alle gleich aus."
//
// Uebernommen sind Farbe, Gewichte und der Klickton. Die FORM bleibt die des
// Portals (Rundung, Pillen) — das ist der Unterschied zwischen "verwandt" und
// "gleich wie das Cockpit", und verwandt war die Entscheidung.
//
// GILT NUR FUER DEN BERATERBEREICH. Die Kundenseiten bleiben unangetastet: das
// DVAG-Material darf laut kds/referenz/dvag-design-system/DVAG-DESIGN.md nicht
// auf oeffentliche Seiten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Die Stylesheets des Beraterbereichs. Kundenseiten stehen bewusst nicht drin. */
const BERATER_CSS = [
  'css/style.css', 'css/dashboard.css', 'css/hub.css', 'css/dna.css',
  'css/analysen.css', 'css/potenziale.css', 'css/promoter-dashboard.css',
  'css/empfehlung-detail.css',
];

/** Die Seiten des Beraterbereichs. */
const BERATER_HTML = [
  'hub.html', 'team.html', 'berater.html', 'praemien.html', 'vorlagen.html',
  'programm-verwalten.html', 'changelog.html',
  'dashboard/detail.html', 'dashboard/empfehler.html', 'dashboard/empfehlungen.html',
  'dashboard/kidz-elternabend.html', 'dashboard/kidz-gewinnspiel.html',
  'dashboard/neu.html', 'dashboard/overview.html', 'dashboard/potenziale.html',
  'dashboard/promoter.html', 'dashboard/settings.html',
];

const lies = (d) => { try { return readFileSync(d, 'utf8'); } catch { return ''; } };
const zeilenVon = (d) => lies(d).split(/\r?\n/);
const dna = lies('css/dna.css');

test('die Hausschrift kennt nur 300, 400 und 700', () => {
  // Der teuerste Fund des Cockpit-Anstrichs: Waeren die Zwischenstufen
  // geblieben, haette der Browser sie auf 700 hochgerechnet — die Seite waere
  // FETTER geworden statt ruhiger. Im Portal waren acht Stufen im Umlauf:
  // 300, 400, 500, 600, 620, 650, 680, 700, 750, 780, 800.
  const erlaubt = new Set(['300', '400', '700']);
  const fehler = [];
  for (const datei of [...BERATER_CSS, ...BERATER_HTML, 'js/nav.js']) {
    const inhalt = lies(datei);
    for (const treffer of inhalt.matchAll(/font-weight:\s*(\d{3})/g)) {
      if (!erlaubt.has(treffer[1])) fehler.push(`${datei}: font-weight ${treffer[1]}`);
    }
    for (const treffer of inhalt.matchAll(/font:\s*(\d{3})\s/g)) {
      if (!erlaubt.has(treffer[1])) fehler.push(`${datei}: font ${treffer[1]}`);
    }
  }
  assert.deepEqual(fehler, [], 'Gewichte, die es in der Hausschrift nicht gibt');
});

test('das Markengold traegt keine Schrift', () => {
  // Gemessen: #C8AA22 auf Weiss sind 2,28:1, noetig waeren 4,5:1. Sechs Stellen
  // standen so, darunter alle Abschnittsueberschriften ("WARTEN AUF DICH"). Fuer
  // Schrift gibt es --dna-gold-dark (#786614, 5,7:1). Flaeche und Kante bleiben
  // im Markengold.
  //
  // Eine Ausnahme, benannt statt stillschweigend: .h-activity-unread ist ein
  // Punkt ohne Text. Dort IST Gold richtig, weil es eine Flaeche ist. Wer eine
  // weitere Ausnahme braucht, traegt sie hier ein und begruendet sie.
  const AUSNAHMEN = ['.h-activity-unread'];
  const GOLD_IN_HTML = /color:\s*(var\(--(?:accent-gold|dna-gold)\)|#[Cc]8[Aa][Aa]22)/g;
  const GOLD_ALS_SCHRIFT = /(^|[;{])\s*color:\s*(var\(--(accent-gold|dna-gold)\)|#[Cc]8[Aa][Aa]22)/;

  const fehler = [];
  for (const datei of BERATER_CSS) {
    let selektor = '';
    for (const zeile of zeilenVon(datei)) {
      if (/^[^ \t}].*\{/.test(zeile)) selektor = zeile.replace(/\s*\{.*/, '').trim();
      if (!GOLD_ALS_SCHRIFT.test(zeile)) continue;
      if (AUSNAHMEN.some((a) => selektor.includes(a))) continue;
      fehler.push(`${datei}: ${selektor}`);
    }
  }
  // Auch die style-Bloecke und style-Attribute in den Seiten selbst. Dort sass
  // der goldene "Zurueck zum Portal"-Link auf vier Seiten; im CSS haette ihn
  // kein Waechter gefunden.
  for (const datei of BERATER_HTML) {
    for (const treffer of lies(datei).matchAll(GOLD_IN_HTML)) {
      fehler.push(datei + ': ' + treffer[1]);
    }
  }

  assert.deepEqual(fehler, [], 'Markengold als Schriftfarbe — bei 2,28:1 nicht lesbar');
});

test('Markenblau und Klickton sind zwei Farben, nicht eine', () => {
  // Das Haus trennt die Flaechenfarbe (#00587C) vom Klickton (#0070A8). Diese
  // Trennung hat dem Portal gefehlt: es nutzte fuer beides dasselbe Petrol.
  assert.match(dna, /--dna-petrol:\s*#00587C/i, 'Markenblau fehlt oder weicht ab');
  assert.match(dna, /--dna-klick:\s*#0070A8/i, 'Der Klickton fehlt');
  assert.match(dna, /--dna-klick-hover:\s*#005A86/i);
  assert.match(dna, /--dna-klick-aktiv:\s*#004365/i, 'Die Aktiv- und Fokusfarbe fehlt');
  assert.ok(!/--dna-klick:\s*var\(--dna-petrol\)/i.test(dna),
    'Klickton und Markenblau duerfen nicht dieselbe Farbe sein');
});

test('die Grundwerte kommen aus dem Haus', () => {
  const erwartet = {
    '--dna-ink': '#2B2B2B', '--dna-text': '#575757', '--dna-symbol': '#808080',
    '--dna-paper': '#F7F7F7', '--dna-paper-2': '#EDEDED',
    '--dna-line': '#D6D6D6', '--dna-line-strong': '#ABABAB',
    '--dna-gold': '#C8AA22', '--dna-gold-dark': '#786614',
  };
  for (const [name, wert] of Object.entries(erwartet)) {
    const m = dna.match(new RegExp(name + ':\\s*(#[0-9A-Fa-f]{6})'));
    assert.ok(m, `${name} fehlt in dna.css`);
    assert.equal(m[1].toUpperCase(), wert, `${name} weicht vom Hauswert ab`);
  }
});

test('der hellste Grauton ist keine Textfarbe', () => {
  // #808080 hat 3,95:1 und ist im Haus ausdruecklich nur fuer Symbole, Rahmen
  // und Platzhalter. Er darf deshalb nicht auf einer Textvariablen liegen. Vor
  // dem Anstrich trug --dna-faint mit 2,56:1 an 47 Stellen echten Text.
  for (const name of ['--dna-text', '--dna-muted', '--dna-faint']) {
    const m = dna.match(new RegExp(name + ':\\s*(#[0-9A-Fa-f]{6})'));
    assert.ok(m, `${name} fehlt`);
    assert.notEqual(m[1].toUpperCase(), '#808080',
      `${name} traegt Text und darf nicht auf dem Symbolton liegen`);
  }
});

test('die Form des Portals bleibt — das ist der Unterschied zu "gleich wie das Cockpit"', () => {
  // Kais Entscheidung war "verwandt, eigener Kopf". Wer hier auf Radius 0
  // stellt, hat die andere Variante gebaut und muss das mit Kai klaeren.
  assert.match(dna, /--radius-card:\s*12px/, 'Die Rundung der Karten gehoert zum Portal');
  assert.match(dna, /--radius-md:\s*10px/);
});

test('der Fokusrahmen ist der des Hauses', () => {
  // 3px in der Aktivfarbe plus heller Hof. Vorher lag hier ein goldener Ring
  // mit 2,28:1 gegen Weiss: sichtbar nur, wer ihn kennt.
  assert.match(dna, /outline:\s*3px solid var\(--fokus\)/, 'Fokusrahmen fehlt');
  assert.match(dna, /box-shadow:\s*0 0 0 7px rgba\(255,255,255,\.92\)/, 'Der helle Hof fehlt');
  // :where() hat Spezifitaet 0 und verliert gegen die Grundregeln des
  // Rahmenwerks. Genau daran ist der Fokus in KAI. einmal gescheitert: im
  // Bild sah er richtig aus, gemessen war er es nicht.
  assert.ok(!/:where\([^)]*\):focus-visible/.test(dna),
    ':where() verliert gegen Grundregeln — :is() nehmen');
});

test('die Kundenseiten bleiben unangetastet', () => {
  // Der Anstrich gilt nur hinter der Anmeldung. Taucht eine oeffentliche Seite
  // in den Berater-Listen oben auf, ist die Grenze verrutscht.
  const OEFFENTLICH = [
    'programm.html', 'empfaenger.html', 'empfehlen.html', 'ueberblick.html',
    'thema.html', 'baufi.html', 'danke.html', 'austragen.html',
    'kidz-sommerfest.html', 'kidz-konzept.html', 'promoter-start.html',
  ];
  for (const seite of OEFFENTLICH) {
    assert.ok(!BERATER_HTML.includes(seite), `${seite} ist eine Kundenseite`);
  }
  // Und die Anmeldeseite bleibt draussen: dort laeuft spaeter bewusst keine
  // Hausschrift, weil sie ohne Anmeldung erreichbar ist.
  assert.ok(!BERATER_HTML.includes('dashboard/index.html'));
});
