import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const vercel = JSON.parse(read('vercel.json'));
const rewrites = new Map(vercel.rewrites.map((entry) => [entry.source, entry.destination]));
assert.equal(rewrites.get('/baufinanzierung'), '/baufi.html');
assert.equal(rewrites.get('/baufinanzierung/:berater'), '/baufi.html?berater=:berater');
assert.equal(rewrites.get('/empfehlung/:token'), '/api/share?token=:token');
assert.equal(rewrites.get('/e'), '/api/share', 'Alte Empfehlungslinks müssen gültig bleiben');

const generators = [read('js/app.js'), read('js/empfehler-mobile.js'), read('js/promoter-detail.js')];
for (const source of generators) {
  assert.ok(source.includes('/empfehlung/'), 'Ein Linkgenerator verwendet die neue Kurzadresse nicht');
}

for (const source of [read('js/app.js'), read('js/baufi.js'), read('js/themen-vorschau.js'), read('js/referral-tracking.js')]) {
  assert.ok(source.includes('meta[name="referral-token"]'), 'Eine Empfängerseite liest den Token der Kurzadresse nicht');
}

console.log('kurzadressen: OK');
