import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizePhoneE164, normalizeWhatsAppNumber } from '../js/phone-utils.js';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

assert.equal(normalizePhoneE164('0173 2947231'), '+491732947231');
assert.equal(normalizePhoneE164('+49 (173) 2947231'), '+491732947231');
assert.equal(normalizePhoneE164('0049 173 2947231'), '+491732947231');
assert.equal(normalizePhoneE164('49 173 2947231'), '+491732947231');
assert.equal(normalizePhoneE164('1732947231'), '+491732947231');
assert.equal(normalizePhoneE164('+49 0173 2947231'), '+491732947231');
assert.equal(normalizePhoneE164('030 / 12345678'), '+493012345678');
assert.equal(normalizePhoneE164('+43 664 1234567'), '+436641234567');
assert.equal(normalizePhoneE164(''), '');
assert.equal(normalizePhoneE164('Telefon 0173 2947231'), null);
assert.equal(normalizePhoneE164('123'), null);

assert.equal(normalizeWhatsAppNumber('+49 173 2947231'), '491732947231');
assert.equal(normalizeWhatsAppNumber('', '+491732947231'), '491732947231');
assert.equal(normalizeWhatsAppNumber('0043 664 1234567'), '436641234567');
assert.equal(normalizeWhatsAppNumber(''), '');

const [admin, html, config, sw] = await Promise.all([
  read('js/berater-admin.js'),
  read('berater.html'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(admin, /import \{ normalizePhoneE164, normalizeWhatsAppNumber \} from '\.\/phone-utils\.js'/);
assert.match(admin, /document\.querySelectorAll\('\.berater-card'\)\.forEach\(bindContactFormatters\)/);
assert.match(admin, /const contactResult = normalizeContactFields\(card\)/);
assert.match(admin, /const contactResult = normalizeContactFields\(form\)/);
assert.match(admin, /if \(whatsappInput && !whatsappInput\.value\.trim\(\)\)/);
assert.match(html, /js\/berater-admin\.js\?v=10/);
assert.match(html, /Auch 0170… oder 0049… möglich/);
assert.match(html, /Leer lassen, wenn die Telefonnummer auch für WhatsApp gilt/);
assert.match(config, /v1\.170 Beta/);
assert.match(config, /Phase 144 · Einheitliche Telefonnummern/);
assert.match(sw, /CACHE_VERSION = 'v128-2026-08-05'/);

console.log('berater-phone-format: OK');
