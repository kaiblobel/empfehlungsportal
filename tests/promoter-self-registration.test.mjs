import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const registerHandler = require('../api/promoter-register.js');
const configHandler = require('../api/promoter-config.js');
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

function responseMock() {
  return {
    headers: {},
    statusCode: 0,
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = value; return value; },
  };
}

function request(body, overrides = {}) {
  return {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '203.0.113.42',
    },
    body,
    ...overrides,
  };
}

const validBody = {
  name: 'Anna Schmidt',
  email: 'anna@example.test',
  telefon: '',
  beraterSlug: 'kai-blobel',
  source: 'praesentation',
  captchaToken: 'captcha-token',
  consent: true,
};

const originalFetch = global.fetch;
const originalRegistrationSecret = process.env.PROMOTER_REGISTRATION_SECRET;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const originalTurnstileSiteKey = process.env.TURNSTILE_SITE_KEY;

process.env.PROMOTER_REGISTRATION_SECRET = 'test-registration-secret-with-enough-entropy';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

try {
  let requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('siteverify')) {
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: true, text: async () => JSON.stringify({ ok: true, code: 'Abc123Def456Gh' }) };
  };

  const successResponse = responseMock();
  await registerHandler(request(validBody), successResponse);
  assert.equal(successResponse.statusCode, 201);
  assert.deepEqual(JSON.parse(successResponse.body), { ok: true, code: 'Abc123Def456Gh' });
  assert.equal(requests.length, 2);
  const rpcBody = JSON.parse(requests[1].options.body);
  assert.match(rpcBody.p_rate_key, /^[0-9a-f]{64}$/);
  assert.match(rpcBody.p_contact_key, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(requests[1].options.body, /203\.0\.113\.42/);

  requests = [];
  global.fetch = async (url) => {
    requests.push(String(url));
    if (String(url).includes('siteverify')) {
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: true, text: async () => JSON.stringify({ ok: false, reason: 'already_exists' }) };
  };
  const duplicateResponse = responseMock();
  await registerHandler(request(validBody), duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 409);
  assert.equal(JSON.parse(duplicateResponse.body).reason, 'already_exists');

  requests = [];
  global.fetch = async () => { requests.push('unexpected'); };
  const invalidResponse = responseMock();
  await registerHandler(request({ ...validBody, email: '', telefon: '', captchaToken: '' }), invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(requests.length, 0);

  const foreignOriginResponse = responseMock();
  await registerHandler(request(validBody, {
    headers: { host: 'localhost:3000', origin: 'https://example.org' },
  }), foreignOriginResponse);
  assert.equal(foreignOriginResponse.statusCode, 403);

  delete process.env.PROMOTER_REGISTRATION_SECRET;
  const unavailableResponse = responseMock();
  await registerHandler(request(validBody), unavailableResponse);
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(JSON.parse(unavailableResponse.body).reason, 'not_configured');

  process.env.TURNSTILE_SITE_KEY = 'public-test-site-key';
  const configResponse = responseMock();
  configHandler({ method: 'GET' }, configResponse);
  assert.equal(configResponse.statusCode, 200);
  assert.equal(JSON.parse(configResponse.body).turnstileSiteKey, 'public-test-site-key');
} finally {
  global.fetch = originalFetch;
  if (originalRegistrationSecret === undefined) delete process.env.PROMOTER_REGISTRATION_SECRET;
  else process.env.PROMOTER_REGISTRATION_SECRET = originalRegistrationSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
  if (originalTurnstileSiteKey === undefined) delete process.env.TURNSTILE_SITE_KEY;
  else process.env.TURNSTILE_SITE_KEY = originalTurnstileSiteKey;
}

const [presentation, presentationJs, startHtml, startCss, startJs, migration, vercel] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('promoter-start.html'),
  read('css/promoter-start.css'),
  read('js/promoter-start.js'),
  read('schema-phase156.sql'),
  read('vercel.json'),
]);

assert.match(presentation, /id="t-PromoterQr"/);
assert.match(presentation, /id="t-PromoterStartLink"/);
assert.doesNotMatch(presentation, /id="t-AnmeldeForm"/);
assert.doesNotMatch(presentationJs, /createEmpfehler/);
assert.match(presentationJs, /if \(!slug\)[\s\S]*Berater-Link nicht verfügbar/);

assert.match(startHtml, /color-scheme" content="light"/);
assert.match(startHtml, /id="psCaptcha"/);
assert.match(startHtml, /Jemanden weiterempfehlen/);
assert.doesNotMatch(startHtml, />Promoter werden[.<]/);
assert.match(startCss, /color-scheme:\s*light/);
assert.doesNotMatch(startCss, /prefers-color-scheme\s*:\s*dark/);
assert.match(startJs, /\/api\/promoter-register/);
assert.match(startJs, /\/empfehler\.html\?code=/);

assert.match(vercel, /\/p\/:berater\/:quelle/);
assert.match(migration, /LIVE ANGEWENDET AM 2026-08-05/);
assert.match(migration, /promoter_self_registration/);
assert.match(migration, /revoke execute on function public\.create_empfehler[\s\S]*from public, anon, authenticated, service_role/);
assert.match(migration, /grant execute on function public\.register_empfehler_public[\s\S]*to anon/);
assert.doesNotMatch(migration, /b3cbf981-ea3e-4e6d-a993-2fe158ca0d48/);

// Zu jedem Berater gehören BEIDE Varianten: eine für die Präsentation im
// Gespräch, eine für den Aufsteller. Hier stand vorher eine feste Zahl (10),
// die bei jedem neuen Berater brach, ohne inhaltlich etwas zu sichern —
// beim Nachziehen für Claudius und David fiel sie prompt um. Geprüft wird
// jetzt die Vollständigkeit je Kürzel. Ob die Codes auf den richtigen
// Berater zeigen, prüft tests/promoter-einstieg.test.mjs.
const qrFiles = (await readdir(new URL('../assets/qr/', import.meta.url)))
  .filter((name) => /^promoter-.+-(praesentation|aufsteller)\.svg$/.test(name));
assert.ok(qrFiles.length >= 10, `Nur ${qrFiles.length} QR-Dateien gefunden.`);
const jeKuerzel = new Map();
for (const name of qrFiles) {
  const [, kuerzel, art] = name.match(/^promoter-(.+)-(praesentation|aufsteller)\.svg$/);
  jeKuerzel.set(kuerzel, (jeKuerzel.get(kuerzel) || new Set()).add(art));
}
for (const [kuerzel, arten] of jeKuerzel) {
  assert.equal(arten.size, 2,
    `Für ${kuerzel} fehlt eine QR-Variante (vorhanden: ${[...arten].join(', ')}).`);
}

console.log('promoter-self-registration: OK');
