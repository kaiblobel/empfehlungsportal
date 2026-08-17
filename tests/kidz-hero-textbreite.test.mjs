/**
 * Der Hero-Text der KIDZ-Elternseite bleibt neben dem Bild.
 *
 * Die Textspalte war 0.94fr breit, der Text darin hatte aber seinen eigenen
 * Rand (bis zur Inhaltsmitte) PLUS feste 610px. Auf breiten Schirmen war die
 * Summe größer als die Spalte, und weil der Text z-index 2 trägt, standen die
 * letzten Wörter jeder Zeile mitten in der Bildcollage: ab 1366px sichtbar,
 * bei 1920px 37px tief.
 *
 * Die Regel dahinter, und die prüft dieser Test: Wer einen Rand aus
 * `(100vw - --max) / 2` als margin setzt, muss ihn von der Breite wieder
 * abziehen. Sonst zählt er doppelt.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/kidz-konzept.css', import.meta.url), 'utf8');

/** Der komplette Block einer Regel, auch wenn er über mehrere Zeilen geht. */
const block = (auswahl) => {
  const start = css.indexOf(`\n${auswahl} {`);
  assert.ok(start >= 0, `Regel ${auswahl} nicht gefunden`);
  const ende = css.indexOf('}', start);
  return css.slice(start, ende);
};

/* --- 1) Die Spalte wird gerechnet, nicht geraten --- */

const hero = block('.hero');
assert.match(hero, /--hero-rand:\s*clamp\(24px,\s*calc\(\(100vw - var\(--max\)\) \/ 2\),\s*360px\)/,
  'Der Rand bis zur Inhaltsmitte gehört in eine eigene Variable, damit ihn beide Regeln meinen. '
  + 'Der Deckel bei 360px verhindert, dass der Rand auf breiten Schirmen über 600px wächst und '
  + 'dieser Platz in der Textspalte brachliegt, statt der Collage zu gehören.');

/* Die Spaltenaufteilung bestimmt, wie viel von der Bildcollage zu sehen ist. Nach Phase 278 gilt:
   Die Bildspalte darf nie schrumpfen. Seit Phase 280 darf sie aber wachsen, weil die Textspalte
   einen Deckel bekommen hat. Geprüft wird deshalb nicht mehr ein fester Wert, sondern die
   Richtung: ein Prozentanteil, der den bisherigen 47 Prozent entspricht, kombiniert mit einem
   Deckel per min(). So kann die Textspalte nur schmaler werden. */
assert.match(hero, /grid-template-columns:\s*minmax\(0,\s*min\(47%,/,
  'Die Textspalte braucht einen Anteil von höchstens 47 Prozent und einen Deckel per min(). '
  + 'Wird der Anteil größer oder der Deckel entfernt, schrumpft die Bildspalte und das Bild '
  + 'zeigt weniger. Genau das war der Fehler in Phase 278.');
assert.match(hero, /min\(47%,\s*calc\(var\(--hero-rand\) \+ var\(--hero-text\) \+ var\(--hero-luft\)\)\)/,
  'Der Deckel muss aus denselben Variablen rechnen, die der Textblock benutzt. Sonst deckelt man '
  + 'auf einen Wert, der mit der tatsächlichen Textbreite nichts zu tun hat.');
assert.match(hero, /minmax\(460px,\s*1fr\)/,
  'Die Bildspalte nimmt den Rest und behält ihre Mindestbreite.');

/* --- 2) Der Text zieht den Rand von seiner Breite ab --- */

const copy = block('.hero-copy');
assert.match(copy, /width:\s*min\(var\(--hero-text\),\s*calc\(100% - var\(--hero-rand\) - 40px\)\)/,
  'Die Textbreite muss den eigenen Rand abziehen, sonst läuft sie bei knappem Platz ins Bild.');
assert.match(copy, /margin-left:\s*var\(--hero-rand\)/,
  'Der Rand muss aus derselben Variable kommen wie die Spaltenrechnung.');

/* --- 3) Kein Rückfall auf das alte Muster --- */

assert.doesNotMatch(copy, /width:\s*min\(610px,\s*calc\(100% - 40px\)\)/,
  'Das ist genau die Kombination, die den Text ins Bild geschoben hat.');

/* --- 4) Die Überschrift richtet sich nach ihrem Block, nicht nach dem Fenster --- */

const h1 = block('.hero h1');
assert.match(h1, /font-size:\s*clamp\(48px,\s*13\.5cqw,\s*76px\)/,
  'Die Überschrift muss in cqw rechnen. Mit vw wird sie auf breiten Schirmen am größten, '
  + 'wo der Textblock am wenigsten Platz hat, und "Was wünschen" bricht auseinander.');
assert.match(copy, /container-type:\s*inline-size/,
  '.hero-copy muss ein Größen-Container sein, sonst hat cqw keinen Bezug.');

/* --- 5) Die Collage ist auf dem Rechner ganz zu sehen ---
 *
 * Sie ist 1890 zu 1063, also deutlich breiter als ihre Spalte hoch ist. Mit `cover` auf voller
 * Höhe fehlten bei 2400px Fensterbreite über 40 Prozent der Bildbreite, und zwar mitten in den
 * Kacheln. Mehr Spaltenbreite allein löst das nicht: Für das ganze Bild bräuchte es dort 2378px,
 * vorhanden sind 1381. Deshalb `contain` mit festem Seitenverhältnis.
 */

const media = block('.hero-media > img');
assert.match(media, /object-fit:\s*contain/,
  'Auf dem Rechner muss die Collage vollständig zu sehen sein, nicht formatfüllend beschnitten.');
assert.match(media, /aspect-ratio:\s*1890 \/ 1063/,
  'Das Seitenverhältnis gehört ins CSS, sonst springt das Layout beim Nachladen des Bildes.');

/* Auf kleinen Schirmen liegt die Collage über dem Text und füllt einen Streifen von 480 bis
   580px Höhe. Vollständig gezeigt stünde sie dort nur etwa 220px hoch, der Rest bliebe leer.
   Dort bleibt es deshalb formatfüllend. */
const schmal = css.slice(css.indexOf('@media (max-width: 980px)'));
assert.match(schmal.slice(0, 1200), /\.hero-media > img \{[^}]*object-fit:\s*cover/,
  'Einspaltig muss die Collage ihre Fläche wieder füllen, sonst steht der halbe Streifen leer.');

console.log('kidz-hero-textbreite: OK');
