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
assert.match(hero, /--hero-rand:\s*max\(24px,\s*calc\(\(100vw - var\(--max\)\) \/ 2\)\)/,
  'Der Rand bis zur Inhaltsmitte gehört in eine eigene Variable, damit ihn beide Regeln meinen.');
assert.match(hero, /grid-template-columns:\s*minmax\(0,\s*calc\(var\(--hero-rand\) \+ var\(--hero-text\) \+ var\(--hero-luft\)\)\)/,
  'Die Textspalte muss aus Rand, Textbreite und Abstand gerechnet werden, nicht in Bruchteilen.');

/* --- 2) Der Text zieht den Rand von seiner Breite ab --- */

const copy = block('.hero-copy');
assert.match(copy, /width:\s*min\(var\(--hero-text\),\s*calc\(100% - var\(--hero-rand\) - 40px\)\)/,
  'Die Textbreite muss den eigenen Rand abziehen, sonst läuft sie bei knappem Platz ins Bild.');
assert.match(copy, /margin-left:\s*var\(--hero-rand\)/,
  'Der Rand muss aus derselben Variable kommen wie die Spaltenrechnung.');

/* --- 3) Kein Rückfall auf das alte Muster --- */

assert.doesNotMatch(copy, /width:\s*min\(610px,\s*calc\(100% - 40px\)\)/,
  'Das ist genau die Kombination, die den Text ins Bild geschoben hat.');

console.log('kidz-hero-textbreite: OK');
