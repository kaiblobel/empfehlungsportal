import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, js] = await Promise.all([
  read('programm.html'),
  read('css/programm.css'),
  read('js/programm.js'),
]);

assert.match(html, /<img class="hero-portrait" id="t-Foto" data-bb="foto"/);
assert.match(html, /css\/programm\.css\?v=\d+/);

const baseRule = css.match(/\.hero-portrait \{([\s\S]*?)\}/)?.[1] || '';
const splitRule = css.match(/\.hero-split-image \.hero-portrait \{([\s\S]*?)\}/)?.[1] || '';
assert.match(baseRule, /filter:\s*none/);
assert.match(splitRule, /filter:\s*none/);
assert.doesNotMatch(baseRule, /grayscale/);
assert.doesNotMatch(splitRule, /grayscale/);

assert.match(js, /applyBeraterBrand\(data\)/);
assert.match(js, /getBeraterPublicBySlug\(beraterSlug\)/);

console.log('praesentation-portrait-farbe: OK');
