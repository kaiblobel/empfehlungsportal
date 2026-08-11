import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, js, config, sw] = await Promise.all([
  read('programm.html'),
  read('css/programm.css'),
  read('js/programm.js'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(html, /<img class="hero-portrait" id="t-Foto" data-bb="foto"/);
assert.match(html, /css\/programm\.css\?v=90/);

const baseRule = css.match(/\.hero-portrait \{([\s\S]*?)\}/)?.[1] || '';
const splitRule = css.match(/\.hero-split-image \.hero-portrait \{([\s\S]*?)\}/)?.[1] || '';
assert.match(baseRule, /filter:\s*none/);
assert.match(splitRule, /filter:\s*none/);
assert.doesNotMatch(baseRule, /grayscale/);
assert.doesNotMatch(splitRule, /grayscale/);

assert.match(js, /applyBeraterBrand\(data\)/);
assert.match(js, /getBeraterPublicBySlug\(beraterSlug\)/);
assert.match(config, /v1\.198 Beta/);
assert.match(config, /Phase 172 · KIDZ-Gewinnspiel/);
assert.match(sw, /CACHE_VERSION = 'v157-2026-08-11a'/);

console.log('praesentation-portrait-farbe: OK');
