import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [adminUi, hubCss, beraterHtml, config, serviceWorker] = await Promise.all([
  read('js/berater-admin.js'),
  read('css/hub.css'),
  read('berater.html'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(adminUi, /Profil und Kontakt/);
assert.match(adminUi, /Öffentliche Angaben/);
assert.match(adminUi, /Technische Angaben anzeigen/);
assert.match(adminUi, /type="hidden" data-f="foto_url"/);
assert.match(adminUi, /data-photo-remove/);
assert.match(adminUi, /Bild ersetzen/);
assert.doesNotMatch(adminUi, /Bild hochladen → oder URL einfügen/);
assert.doesNotMatch(adminUi, /class="berater-slug/);

const renderCard = adminUi.slice(
  adminUi.indexOf('function renderCard'),
  adminUi.indexOf('function attachHandlers'),
);
const editableFields = [
  'name',
  'slug',
  'rolle',
  'email',
  'telefon',
  'whatsapp',
  'foto_url',
  'bookings_url',
  'impressum_url',
  'datenschutz_url',
];

for (const field of editableFields) {
  const matches = renderCard.match(new RegExp(`data-f="${field}"`, 'g')) || [];
  assert.equal(matches.length, 1, `${field} muss genau einmal editierbar bleiben`);
}

assert.match(renderCard, /data-f="telefon" type="tel" inputmode="tel"/);
assert.match(renderCard, /data-f="whatsapp" type="tel" inputmode="tel"/);

assert.match(hubCss, /\.berater-profile-grid/);
assert.match(hubCss, /\.berater-photo-preview[\s\S]*object-fit: contain/);
assert.match(hubCss, /\.berater-tech-grid/);
assert.match(hubCss, /@media \(max-width: 560px\)[\s\S]*\.berater-fields/);

assert.match(beraterHtml, /css\/hub\.css\?v=53/);
assert.match(beraterHtml, /js\/berater-admin\.js\?v=9/);
assert.match(config, /v1\.191 Beta/);
assert.match(serviceWorker, /CACHE_VERSION = 'v150-2026-08-09c'/);
assert.match(serviceWorker, /css\/hub\.css\?v=53/);

console.log('berater-account-layout: OK');
