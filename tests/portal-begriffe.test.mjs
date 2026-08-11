import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [presentation, programAdmin, payouts, advisors, changelogPage, index, config, sw] = await Promise.all([
  read('programm.html'),
  read('programm-verwalten.html'),
  read('praemien.html'),
  read('berater.html'),
  read('changelog.html'),
  read('index.html'),
  read('js/config.js'),
  read('sw.js'),
]);

for (const page of [presentation, programAdmin, payouts, advisors, changelogPage]) {
  assert.match(page, /Zurück zum Portal/);
  assert.doesNotMatch(page, /Zurück zum H(?:ub|UB)/);
}

assert.match(index, />Zum Portal<\/a>/);
assert.doesNotMatch(index, />Zum Hub<\/a>/);
assert.match(config, /APP_VERSION = 'v1\.209 Beta'/);
assert.match(config, /Phase 183 · KIDZ-Flyermenü/);
assert.doesNotMatch(config, /Premium-HUB/);
assert.match(sw, /CACHE_VERSION = 'v168-2026-08-11c'/);

console.log('portal-begriffe: OK');
