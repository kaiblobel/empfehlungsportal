/**
 * Sie-Ansprache auf den Kundenseiten — ein Wächter gegen zurückkehrende Du-Formen.
 *
 * Regel, auf die sich alles zurückführen lässt:
 *
 *   Wenn das PORTAL spricht, sagt es Sie.
 *   Wenn ein EMPFEHLUNGSGEBER seinem eigenen Bekannten schreibt, bleibt es beim Du.
 *
 * Das zweite ist kein Versehen, sondern gewollt: Wer seiner besten Freundin eine
 * Nachricht schickt, siezt sie nicht. Diese Stellen stehen unten einzeln in
 * AUSNAHMEN, jede mit Begründung. Wer eine davon entfernt, muss auch den Eintrag
 * entfernen — der Test meldet sich sonst, weil die Ausnahme ins Leere zeigt.
 *
 * Nicht geprüft werden angemeldete Verwaltungsseiten (hub, dashboard/, berater,
 * team, vorlagen, praemien, programm-verwalten, changelog) und die KIDZ-Seiten.
 * Die KIDZ-Seiten sind eine eigene Marke für ein Kita-Fest, durchgängig per Du
 * und im Auftrag nicht genannt.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

/* --- Welche Dateien der Kunde zu sehen bekommt --- */

const KUNDENSEITEN = [
  'index.html',
  'programm.html',
  'empfehlen.html',
  'empfaenger.html',
  'danke.html',
  'austragen.html',
  'beleg.html',
  'baufi.html',
  'thema.html',
  'themen-vorschau.html',
  'promoter-start.html',
  'empfehler.html',
  'js/programm.js',
  'js/app.js',
  'js/baufi.js',
  'js/themen-vorschau.js',
  'js/promoter-start.js',
  'js/empfehler-mobile.js',
  'js/beleg.js',
];

/* --- Bewusste Ausnahmen, jede einzeln begründet ---
 *
 * Der Text muss wörtlich in der genannten Datei vorkommen. Stimmt er nicht mehr,
 * schlägt der Test fehl: so verrottet die Liste nicht still.
 */

const AUSNAHMEN = [
  {
    datei: 'js/app.js',
    ab: 'const NACHRICHT_VORLAGEN',
    bis: 'function vorlagenForSlug',
    grund: 'Nachrichten-Vorlagen für WhatsApp. Der Empfehlungsgeber schreibt an seinen eigenen Bekannten, '
      + 'nicht das Portal an einen Kunden. Eine Sie-Vorlage an den besten Freund würde niemand verschicken.',
  },
  {
    datei: 'js/app.js',
    ab: 'function buildMessage(vorname, typ, link',
    bis: 'Normalisiert eine eingegebene',
    grund: 'Die beiden Standardnachrichten („vorab informieren" und „Empfehlung"). Auch sie verschickt '
      + 'der Empfehlungsgeber von seinem eigenen Gerät an seinen eigenen Bekannten.',
  },
  {
    datei: 'js/app.js',
    text: '`Ich habe dir ${beraterVorname} empfohlen und dir diese Seite nach unserem Gespräch weitergeschickt.`',
    grund: 'Sprechblase auf der Empfängerseite. Sie steht im Namen des Empfehlungsgebers und wird durch '
      + 'dessen eigenen Text ersetzt, sobald er einen geschrieben hat.',
  },
  {
    datei: 'js/empfehler-mobile.js',
    ab: 'const messageTemplates',
    bis: 'const GOAL_IMAGE_FALLBACKS',
    grund: 'Die drei Tonfall-Vorlagen (herzlich, kurz, zurückhaltend). Auch hier schreibt der '
      + 'Empfehlungsgeber an seinen eigenen Bekannten.',
  },
  {
    datei: 'js/empfehler-mobile.js',
    text: "funnel.topicTitle || 'deinem Finanzthema'",
    grund: 'Rückfallwert, der in genau diese Vorlagen eingesetzt wird.',
  },
  {
    datei: 'js/empfehler-mobile.js',
    text: 'hier ist noch einmal dein persönlicher Link von',
    grund: 'Erinnerungsnachricht, die der Empfehlungsgeber selbst verschickt.',
  },
  {
    datei: 'programm.html',
    text: 'Hi Anna, ich wollte dir kurz <strong data-bb="name">Kai Blobel</strong> empfehlen. Er hat mir bei meiner '
      + 'Baufinanzierung sehr geholfen. Schau dir das hier mal in Ruhe an:',
    grund: 'Nachgebaute WhatsApp-Nachricht im Handy-Beispiel. Sie zeigt, wie ein Empfehlungsgeber '
      + 'seiner Bekannten schreibt.',
  },
  {
    datei: 'programm.html',
    ab: 'class="alltag-quotes alltag-quotes-standard',
    bis: 'class="alltag-quotes alltag-quotes-hero',
    grund: 'Alltagsempfehlungen unter Freunden („Schau diesen Film.", „Lies dieses Buch."). '
      + 'Der ganze Abschnitt lebt davon, dass Menschen sich so etwas beiläufig sagen.',
  },
  {
    datei: 'empfaenger.html',
    text: 'Ich habe dir <span data-bb="vorname">Kai</span> empfohlen',
    grund: 'Rückfalltext der Sprechblase, siehe js/app.js. Steht im Namen des Empfehlungsgebers.',
  },
  {
    datei: 'themen-vorschau.html',
    text: '„Schau dir das einmal in Ruhe an.',
    grund: 'Beispielzitat eines Empfehlungsgebers in der internen Themenvorschau.',
  },
];

/* --- Muster, die eine Du-Ansprache verraten --- */

const MUSTER = [
  {
    name: 'Du-Pronomen',
    regex: /\b(?:du|dich|dir|dein|deine|deinen|deinem|deiner|deines|euch|euer|eure|euren|eurem|eurer)\b/gi,
  },
  {
    name: 'Verb in der 2. Person Einzahl',
    regex: new RegExp(
      '\\b(?:hast|bist|kannst|willst|musst|sollst|darfst|wirst|weißt|siehst|gibst|nimmst'
      + '|machst|gehst|kommst|findest|brauchst|möchtest|denkst|glaubst|sagst|schaust|prüfst'
      + '|wählst|trägst|erzählst|entscheidest|erkennst|bekommst|bleibst|hörst|schreibst'
      + '|verstehst|hilfst|zahlst|sparst|verdienst|arbeitest|lebst|fühlst|erreichst|startest'
      // Bewusst nicht in der Liste: Formen, die in der 3. Person gleich lauten
      // (nutzt, liest, passt). Sie würden auf jeder zweiten Zeile falsch anschlagen.
      + '|öffnest|klickst|tippst|meldest|landest|empfiehlst|kennst|redest|suchst|wolltest)\\b',
      'gi',
    ),
  },
  {
    name: 'Befehlsform im Du',
    regex: new RegExp(
      '\\bBitte\\s+(?:gib|trag|trage|prüf|prüfe|wähl|wähle|öffne|lad|lade|versuch|versuche'
      + '|probier|probiere|bestätige|führe|melde|sprich|wende|schau|nutze|klick|klicke|tippe'
      + '|sende|schick|schicke|scanne|beachte|achte)\\b',
      'gi',
    ),
  },
];

/* --- Ausnahmen aus dem Text schneiden, bevor gesucht wird --- */

const belegt = new Map(); // "datei|kennung" -> true

function schneideAusnahmen(datei, text) {
  let rest = text;
  for (const a of AUSNAHMEN.filter((e) => e.datei === datei)) {
    const kennung = `${datei}|${a.text || `${a.ab} … ${a.bis}`}`;
    if (a.text) {
      if (!rest.includes(a.text)) continue;
      belegt.set(kennung, true);
      rest = rest.split(a.text).join(' ');
    } else {
      const start = rest.indexOf(a.ab);
      if (start === -1) continue;
      const ende = rest.indexOf(a.bis, start + a.ab.length);
      if (ende === -1) continue;
      belegt.set(kennung, true);
      rest = rest.slice(0, start) + ' ' + rest.slice(ende);
    }
  }
  return rest;
}

/* --- Prüfen --- */

const funde = [];

for (const datei of KUNDENSEITEN) {
  const roh = await lies(datei);
  const text = schneideAusnahmen(datei, roh);
  for (const { name, regex } of MUSTER) {
    for (const treffer of text.matchAll(regex)) {
      const zeile = text.slice(0, treffer.index).split('\n').length;
      const umfeld = text.slice(Math.max(0, treffer.index - 55), treffer.index + 55).replace(/\s+/g, ' ').trim();
      funde.push(`${datei}:${zeile} — ${name} „${treffer[0]}" in: …${umfeld}…`);
    }
  }
}

assert.deepEqual(
  funde,
  [],
  'Auf einer Kundenseite steht wieder eine Du-Form. Kundenseiten sprechen Sie.\n'
    + 'Ist die Stelle bewusst per Du (weil dort ein Empfehlungsgeber an seinen eigenen\n'
    + 'Bekannten schreibt), gehört sie mit Begründung in AUSNAHMEN in dieser Datei:\n  '
    + funde.join('\n  '),
);

/* --- Die Ausnahmeliste darf nicht ins Leere zeigen --- */

const verwaist = AUSNAHMEN
  .map((a) => `${a.datei}|${a.text || `${a.ab} … ${a.bis}`}`)
  .filter((kennung) => !belegt.has(kennung));

assert.deepEqual(
  verwaist,
  [],
  'Diese Ausnahmen gibt es im Code nicht mehr. Bitte aus AUSNAHMEN entfernen,\n'
    + 'sonst deckt die Liste irgendwann Stellen ab, die niemand mehr geprüft hat:\n  '
    + verwaist.join('\n  '),
);

/* --- Und ein positiver Nachweis: die Sie-Form ist wirklich angekommen --- */

const STICHPROBEN = [
  ['baufi.html', 'Was haben Sie vor?'],
  ['baufi.html', 'Wählen Sie Ihr Vorhaben'],
  ['empfaenger.html', 'Ihre persönliche Empfehlung'],
  ['empfehlen.html', 'Wen möchten Sie empfehlen?'],
  ['empfehler.html', 'Wem möchten Sie gerade etwas Gutes tun?'],
  ['programm.html', 'Sie sind <em>begeistert</em>'],
  ['promoter-start.html', 'Ihren Empfehlungsbereich öffnen'],
  ['thema.html', 'hat bei diesem Thema an Sie gedacht.'],
];

for (const [datei, satz] of STICHPROBEN) {
  const text = await lies(datei);
  assert.ok(text.includes(satz), `${datei} enthält nicht mehr „${satz}" — die Sie-Fassung fehlt.`);
}

console.log(
  `sie-ansprache: OK (${KUNDENSEITEN.length} Kundenseiten geprüft, `
    + `${AUSNAHMEN.length} begründete Ausnahmen, ${STICHPROBEN.length} Stichproben)`,
);
