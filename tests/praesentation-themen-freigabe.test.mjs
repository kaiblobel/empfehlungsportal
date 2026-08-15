import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [js, css] = await Promise.all([
  read('js/programm.js'),
  read('css/programm.css'),
]);

// Nur Themen mit eigener, fertiger Themenseite sind auswählbar.
assert.match(js, /const FREIGESCHALTETE_THEMEN = new Set\(\['allgemein', 'baufi', 'kinder', 'kidz'\]\)/);
assert.match(js, /const frei = Boolean\(page\) && FREIGESCHALTETE_THEMEN\.has\(template\.slug\)/);

// Gesperrte Kacheln tragen die graue Optik, sind deaktiviert und haben keinen
// data-page-key — damit greift auch der Klick-Handler nicht.
assert.match(js, /class="topic-compact\$\{frei \? '' : ' is-locked'\}"/);
assert.match(js, /frei \? ` data-page-key="\$\{escapeAttr\(template\.slug \|\| ''\)\}"` : ' disabled aria-disabled="true"'/);
assert.match(js, /frei \? \(page\.status \|\| 'Fertige Themenseite'\) : 'In Vorbereitung'/);

// Der Vermerk erscheint nur, wenn tatsächlich etwas gesperrt ist.
assert.match(js, /compactTemplates\.some\(v => !FREIGESCHALTETE_THEMEN\.has\(v\.slug\)\)/);
assert.match(js, /Grau hinterlegte Themen entstehen gerade und sind noch nicht auswählbar\./);

// Optik: zurückgenommen, kein Hover-Anheben, kein Zeigefinger.
const lockedRule = css.match(/\.topic-compact\.is-locked \{([\s\S]*?)\}/)?.[1] || '';
assert.match(lockedRule, /cursor: default/);
assert.match(lockedRule, /--compact-accent: #B6B1A8/);
assert.match(css, /\.topic-compact\.is-locked:hover,[\s\S]*?transform: none/);
assert.match(css, /\.topics-locked-note \{/);

console.log('praesentation-themen-freigabe: OK');
