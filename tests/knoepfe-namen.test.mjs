/**
 * In einem Knopf darf kein Name direkt neben nacktem Text stehen.
 *
 * Der Fall, der das ausgelöst hat: Auf zwei Kundenseiten zeigte der
 * Terminknopf „MitSvenbesprechen" statt „Mit Sven besprechen". Im Quelltext
 * stand alles richtig, und auch innerText lieferte brav den Text mit
 * Leerzeichen. Nur sah der Kunde etwas anderes.
 *
 * Der Grund steckt im Layout: `.button` ist inline-flex. Damit wird jeder
 * Textknoten im Knopf zu einem eigenständigen Flex-Element, und Leerzeichen
 * am Rand von Flex-Elementen wirft der Browser weg. Solange in einem Knopf
 * nur ein Textblock steht, fällt das nie auf. Sobald ein Name hineingesetzt
 * wird, klebt alles zusammen.
 *
 * Vorher gab es dagegen eine Sonderregel an genau einer Stelle
 * (.scan-copy .secondary [data-bb="vorname"]{margin:0 .24em}). Sie wirkte
 * dort und hat die beiden anderen Stellen trotzdem nicht verhindert. Deshalb
 * jetzt die Konstruktion statt des Pflasters: Der Knopfinhalt kommt in EIN
 * Element, dann fließt der Text darin ganz normal.
 *
 * Dieser Wächter hält das fest, damit der nächste Knopf nicht wieder
 * auseinanderfällt.
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

// Knöpfe im Projekt: <button> immer, <a> wenn die Klasse nach Knopf aussieht.
// Beides ist hier durchweg als Flex gesetzt (css/*.css: .button, .primary,
// .secondary), deshalb gilt für beide dieselbe Regel.
const KNOPF = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const KNOPFKLASSE = /class="[^"]*\b(button|primary|secondary)\b/i;

const funde = [];
for (const seite of await sammleHtml()) {
  const html = await readFile(new URL(seite, wurzel), 'utf8');
  for (const treffer of html.matchAll(KNOPF)) {
    const [ganz, tag, attribute, inhalt] = treffer;
    if (tag.toLowerCase() === 'a' && !KNOPFKLASSE.test(attribute)) continue;
    if (!/data-bb=/.test(inhalt)) continue;

    // Steht das data-bb-Element als DIREKTES Kind im Knopf?
    const ohneVerschachtelung = inhalt.replace(/<(\w+)(?![^>]*data-bb)[^>]*>[\s\S]*?<\/\1>/g, '');
    if (!/data-bb=/.test(ohneVerschachtelung)) continue;

    // Und steht daneben nackter Text?
    const nackterText = ohneVerschachtelung.replace(/<[^>]*>/g, ' ').trim();
    if (!nackterText) continue;

    const zeile = html.slice(0, treffer.index).split('\n').length;
    funde.push(`${seite}:${zeile}  <${tag}> mit Text „${nackterText.slice(0, 40)}" neben einem data-bb-Element`);
  }
}

assert.deepEqual(
  funde,
  [],
  'In diesen Knöpfen steht ein eingesetzter Wert direkt neben Text:\n  '
    + funde.join('\n  ')
    + '\n\nDas klebt beim Anzeigen zusammen („MitSvenbesprechen"), weil Knöpfe hier\n'
    + 'Flex-Elemente sind und Leerzeichen an deren Rändern verworfen werden.\n'
    + 'Lösung: den ganzen Knopfinhalt in EIN <span> packen, dann fließt der Text\n'
    + 'darin normal. Kein margin-Pflaster am einzelnen Element.',
);
