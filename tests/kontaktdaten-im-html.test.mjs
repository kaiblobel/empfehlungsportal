/**
 * Anschriften, Rufnummern und E-Mail-Adressen gehören nicht ins Markup.
 *
 * Warum das ein Wächter wert ist: Dieselbe Angabe stand über Jahre mehrfach
 * fest in den Seiten. Ein Büroumzug wäre dann kein Datensatz, sondern eine
 * Suche durch dreizehn Dateien — und wer eine übersieht, hat eine falsche
 * Adresse auf einer Kundenseite stehen. Genau so kam es zu einer erfundenen
 * Rufnummer (03556 1234567), die live abrufbar war, und zu vier KIDZ-Seiten
 * mit viermal derselben Anschrift.
 *
 * Die Regel: Ein Kontaktwert darf im Markup stehen, WENN er an einem
 * data-bb- oder data-bo-Element hängt. Dann ist er eine Vorgabe, die zur
 * Laufzeit aus der Datenbank überschrieben wird, und sorgt dafür, dass die
 * Seite auch ohne Netz nicht leer aussieht. Nackt im Fließtext ist er
 * dagegen ein künftiger Fehler.
 *
 * Bewusst KEIN Fund sind Beispielwerte, die dem Nutzer zeigen, was er
 * eintragen soll (placeholder), und technische Zeichenketten wie
 * Paketversionen. Ohne diese Ausnahmen hätte der Wächter 13 Fehlalarme und
 * würde nach einer Woche abgeschaltet.
 */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const wurzel = new URL('..', import.meta.url);

async function sammleHtml(ordner = '', gesammelt = []) {
  for (const e of await readdir(new URL(ordner, wurzel), { withFileTypes: true })) {
    if (['.git', '.worktrees', 'node_modules', 'assets', 'tests', 'docs', 'tools', 'tmp'].includes(e.name)) continue;
    const pfad = `${ordner}${e.name}${e.isDirectory() ? '/' : ''}`;
    if (e.isDirectory()) await sammleHtml(pfad, gesammelt);
    else if (e.name.endsWith('.html')) gesammelt.push(pfad);
  }
  return gesammelt;
}

const SUCHE = {
  Anschrift: /Wachsbleiche\s*1a/gi,
  Rufnummer: /(?:tel:\+?[\d\s/-]{7,}|\b0\d{3,4}[\s/-]?\d{5,}\b|\+49[\s\d]{9,})/g,
  'E-Mail':  /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi,
};

/**
 * Beispielwerte für den Nutzer, keine echten Kontaktdaten. Erkannt am
 * Attribut, in dem sie stehen — nicht am Wert selbst, damit sich niemand
 * durch eine erfundene Nummer an der falschen Stelle vorbeimogelt.
 */
const BEISPIEL_ATTRIBUTE = /\b(?:placeholder|aria-placeholder|pattern|title)\s*=\s*"[^"]*$/i;

/** Technische Zeichenketten, die zufällig wie eine Adresse aussehen. */
const TECHNISCH = [
  /cdn\.jsdelivr\.net/, /unpkg\.com/, /\.js@\d/, /@\d+\.\d+\.\d+/,
];

/**
 * Ein @ innerhalb einer Web-Adresse ist keine E-Mail. Buchungsseiten von
 * Outlook tragen das Postfach im Pfad (…/book/Name@firma.onmicrosoft.com/…),
 * und die gehören als Link dorthin. Nur mailto: zählt als Kontaktweg.
 */
function inWebadresse(html, stelle) {
  // Nur das unmittelbare Umfeld ansehen; eine Adresse ist nie länger.
  const davor = html.slice(Math.max(0, stelle - 300), stelle);
  const letzterStart = Math.max(davor.lastIndexOf('http://'), davor.lastIndexOf('https://'));
  if (letzterStart === -1) return false;
  // Ist die Adresse vor unserem Treffer schon zu Ende, steht er außerhalb.
  return !/["'\s>]/.test(davor.slice(letzterStart));
}

/**
 * Musterdaten in Vorschaukarten: erfundene Werte, die zeigen, wie eine
 * ausgefüllte Karte aussieht. Werden über data-muster gekennzeichnet.
 */
const MUSTER_MARKIERUNG = /data-muster/;

/**
 * Begründete Ausnahmen. Kein stiller Filter: Wer hier etwas einträgt, schreibt
 * dazu, warum der Wert an dieser Stelle fest stehen darf. Wer später die
 * Anschrift ändert, soll beim Lesen verstehen, warum sie doppelt steht.
 */
const AUSNAHMEN = [
  {
    stelle: 'kidz-gewinnspiel.html:209',
    art: 'Anschrift',
    grund:
      'Teilnahmebedingungen sind ein Rechtstext, der als Ganzes formuliert wird. '
      + 'Würde die Veranstalteranschrift zur Laufzeit aus der Datenbank kommen, '
      + 'hätte die Bedingung eine Lücke, sobald ein Feld leer ist oder die Abfrage '
      + 'scheitert. Feste Werte sind hier die sichere Variante.',
    // Kehrseite, die man kennen muss: Ändert sich die Anschrift des Büros,
    // muss sie hier von Hand nachgezogen werden. Sie steht bewusst doppelt.
  },
];

const funde = [];
for (const seite of await sammleHtml()) {
  const html = await readFile(new URL(seite, wurzel), 'utf8');
  for (const [art, muster] of Object.entries(SUCHE)) {
    for (const treffer of html.matchAll(muster)) {
      const davor = html.slice(0, treffer.index);

      // In welchem Tag steht der Wert?
      const tagStart = davor.lastIndexOf('<');
      const tagEnde = html.indexOf('>', tagStart);
      const imTag = tagStart > -1 && tagEnde >= treffer.index;
      const tag = imTag ? html.slice(tagStart, tagEnde + 1) : '';

      // Vorgabe an einem gebrandeten Element → erlaubt.
      if (/data-b[bo]=/.test(tag)) continue;
      // Auch der Textinhalt eines gebrandeten Elements ist eine Vorgabe.
      if (!imTag) {
        const offen = davor.lastIndexOf('<');
        const offenesTag = html.slice(offen, html.indexOf('>', offen) + 1);
        if (/data-b[bo]=/.test(offenesTag)) continue;
      }
      // Beispielwert in einem Eingabefeld → erlaubt.
      if (BEISPIEL_ATTRIBUTE.test(davor.slice(-260))) continue;
      // Technische Zeichenkette → kein Kontakt.
      const umfeld = html.slice(Math.max(0, treffer.index - 60), treffer.index + 60);
      if (TECHNISCH.some((r) => r.test(umfeld))) continue;
      // @ innerhalb einer Web-Adresse ist keine E-Mail.
      if (art === 'E-Mail' && inWebadresse(html, treffer.index)) continue;
      // Ausdrücklich als Musterdatensatz gekennzeichnet → erlaubt.
      if (MUSTER_MARKIERUNG.test(umfeld)) continue;

      const zeile = davor.split('\n').length;
      const stelle = `${seite}:${zeile}`;
      if (AUSNAHMEN.some((a) => a.stelle === stelle && a.art === art)) continue;
      funde.push(`${stelle}  [${art}]  ${treffer[0].trim().slice(0, 42)}`);
    }
  }
}

assert.deepEqual(
  funde,
  [],
  'Diese Kontaktdaten stehen fest im Markup:\n  '
    + funde.join('\n  ')
    + '\n\nSie gehören in die Datenbank, nicht in die Seite: Anschrift und Rufnummer\n'
    + 'des Büros in public.buero (data-bo), die des Beraters in public.berater\n'
    + '(data-bb). Als Vorgabe AN einem solchen Element dürfen sie stehen bleiben,\n'
    + 'dann sieht die Seite auch ohne Netz vollständig aus.\n'
    + 'Ein Beispielwert für den Nutzer gehört in ein placeholder-Attribut,\n'
    + 'ein erfundener Wert in einer Vorschaukarte bekommt data-muster.',
);
