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
assert.equal((html.match(/<section class="section/g) || []).length, 14);
assert.equal((html.match(/data-short-hide/g) || []).length, 6);
assert.match(html, /css\/programm\.css\?v=90/);
assert.match(html, /js\/programm\.js\?v=50/);

assert.match(js, /startModus === 'kurz' \? 'short' : startModus === 'video' \? 'video' : 'full'/);
assert.match(js, /extendedSections\.forEach\(section => \{ section\.hidden = short; \}\)/);
assert.match(html, /data-presentation-mode="video"/);
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

assert.match(config, /v1\.227 Beta/);
assert.match(config, /Phase 207 · Vorschau lädt zum Fest ein/);
assert.match(sw, /CACHE_VERSION = 'v186-2026-08-12-phase207'/);

console.log('praesentation-kurzmodus: OK');
