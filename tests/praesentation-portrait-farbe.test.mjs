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
assert.match(config, /v1\.227 Beta/);
assert.match(config, /Phase 207 · Vorschau lädt zum Fest ein/);
assert.match(sw, /CACHE_VERSION = 'v186-2026-08-12-phase207'/);

console.log('praesentation-portrait-farbe: OK');
