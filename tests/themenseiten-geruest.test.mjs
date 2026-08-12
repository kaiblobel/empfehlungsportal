import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('thema.html');
const js = read('js/thema.js');
const share = read('api/share.js');
const program = read('js/programm.js');
const settings = read('dashboard/settings.html');
const messages = read('js/app.js');

const themes = ['foerderungen', 'selbstaendige', 'investment', 'absicherung', 'karriere', 'kinder'];

for (const slug of themes) {
  assert.match(js, new RegExp(`\\b${slug}:\\s*\\{`), `${slug} fehlt im Themengerüst`);
  assert.match(share, new RegExp(`${slug}: '/thema\\.html'`), `${slug} fehlt im Router`);
  assert.match(program, new RegExp(`\\b${slug}:\\s*\\{`), `${slug} fehlt in der Präsentationsvorschau`);
  assert.ok(settings.includes(`thema.html?vorlage=${slug}`), `${slug} fehlt in den Schnellvorschauen`);
}

assert.ok(html.includes('data-page="thema"'));
assert.ok(html.includes('In Arbeit'));
assert.match(html, /\/js\/referral-tracking\.js\?v=\d+/);
assert.ok(html.includes('id="interestButton"'));
assert.ok(html.includes('data-track-booking'));
assert.ok(html.includes('id="optOutLink"'));
assert.ok(html.includes('data-bb="foto"'));
assert.ok(html.includes('data-bb="booking"'));

assert.ok(js.includes('getEmpfehlungByToken'));
assert.ok(js.includes('markInteressiert'));
assert.ok(js.includes("/austragen.html?token="));
assert.ok(js.includes("target.searchParams.set('vorlage', 'allgemein')"));

assert.match(messages, /kinder:\s*\[/, 'Für Kinder fehlt die eigene Nachrichtenvorlage');
assert.match(program, /data-page-key=/, 'Die unfertigen Themenkarten sind nicht auswählbar');

console.log('themenseiten-geruest: OK');
