import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css, config, sw] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('css/programm.css'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(html, /id="presenterLength" hidden role="group" aria-label="Präsentationslänge"/);
assert.match(html, /data-presentation-mode="short"/);
assert.match(html, /data-presentation-mode="full"/);
assert.equal((html.match(/<section class="section/g) || []).length, 13);
assert.equal((html.match(/data-short-hide/g) || []).length, 6);
assert.match(html, /css\/programm\.css\?v=82/);
assert.match(html, /js\/programm\.js\?v=46/);

assert.match(js, /presentationParams\.get\('modus'\) === 'kurz' \? 'short' : 'full'/);
assert.match(js, /extendedSections\.forEach\(section => \{ section\.hidden = short; \}\)/);
assert.match(js, /url\.searchParams\.set\('modus', 'kurz'\)/);
assert.match(js, /url\.searchParams\.delete\('modus'\)/);
assert.match(js, /filter\(section => !section\.hidden\)/);
assert.match(js, /document\.body\.appendChild\(preview\)/);

assert.match(css, /\.presenter-length\[hidden\] \{ display: none; \}/);
assert.match(css, /\.cta-top \{[\s\S]*?border-radius: 14px;/);
const closingRule = css.match(/\.foerder-stage-closing \{([\s\S]*?)\}/)?.[1] || '';
assert.match(closingRule, /position: static/);
assert.match(closingRule, /justify-self: end/);
assert.doesNotMatch(closingRule, /position: absolute/);

assert.match(config, /v1\.177 Beta/);
assert.match(config, /Phase 151 · Themenseiten-Gerüst/);
assert.match(sw, /CACHE_VERSION = 'v137-2026-08-05'/);

console.log('praesentation-kurzmodus: OK');
