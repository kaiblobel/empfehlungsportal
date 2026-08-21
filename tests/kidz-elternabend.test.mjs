import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const registerHandler = require('../api/kidz-elternabend-register.js');
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

function responseMock() {
  return {
    headers: {}, statusCode: 0, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = value; return value; },
  };
}

function request(body, overrides = {}) {
  return {
    method: 'POST',
    headers: {
      host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': '203.0.113.70',
    },
    body,
    ...overrides,
  };
}

const validBody = {
  name: 'Maria Beispiel',
  email: 'maria@example.test',
  telefon: '',
  source: 'elternabend-qr',
  timePreference: 'werktag-abends',
  question: 'Wie bleiben wir beim Sparen flexibel?',
  beraterSlug: 'promoter-anja-scholz',
  captchaToken: 'captcha-token',
  consent: true,
};

const originalFetch = global.fetch;
const originalRegistrationSecret = process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;

process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET = 'test-parent-evening-registration-secret';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

try {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, text: async () => JSON.stringify({ ok: true, reference: 'KIDZ-EA-AB12CD34' }) };
  };

  const successResponse = responseMock();
  await registerHandler(request(validBody), successResponse);
  assert.equal(successResponse.statusCode, 201);
  assert.deepEqual(JSON.parse(successResponse.body), { ok: true, reference: 'KIDZ-EA-AB12CD34' });
  assert.equal(requests.length, 2);
  const rpcBody = JSON.parse(requests[1].options.body);
  assert.equal(rpcBody.p_event_key, 'kidz-elternabend-warteliste-2026');
  assert.equal(rpcBody.p_berater_slug, 'promoter-anja-scholz');
  assert.equal(rpcBody.p_source, 'elternabend-qr');
  assert.equal(rpcBody.p_time_preference, 'werktag-abends');
  assert.equal(rpcBody.p_conditions_version, '2026-08-12-v1');
  assert.match(rpcBody.p_rate_key, /^[0-9a-f]{64}$/);
  assert.match(rpcBody.p_contact_key, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(requests[1].options.body, /203\.0\.113\.70/);
  assert.doesNotMatch(requests[1].options.body, /Kindername|Geburtsdatum/);

  const invalidResponse = responseMock();
  await registerHandler(request({ ...validBody, email: '', telefon: '', captchaToken: '' }), invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(JSON.parse(invalidResponse.body).reason, 'invalid_contact');

  const foreignOriginResponse = responseMock();
  await registerHandler(request(validBody, {
    headers: { host: 'localhost:3000', origin: 'https://example.org' },
  }), foreignOriginResponse);
  assert.equal(foreignOriginResponse.statusCode, 403);

  delete process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET;
  const unavailableResponse = responseMock();
  await registerHandler(request(validBody), unavailableResponse);
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(JSON.parse(unavailableResponse.body).reason, 'not_configured');
} finally {
  global.fetch = originalFetch;
  if (originalRegistrationSecret === undefined) delete process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET;
  else process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET = originalRegistrationSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
}

const [html, css, publicJs, adminHtml, adminJs, navJs, migration, vercel, sommerfestHtml] = await Promise.all([
  read('kidz-elternabend.html'),
  read('css/kidz-elternabend.css'),
  read('js/kidz-elternabend.js'),
  read('dashboard/kidz-elternabend.html'),
  read('js/kidz-elternabend-admin.js'),
  read('js/nav.js'),
  read('schema-phase191.sql'),
  read('vercel.json'),
  read('kidz-sommerfest.html'),
]);
const qrPngStat = await stat(new URL('../assets/qr/kidz-elternabend.png', import.meta.url));
const qrSvgStat = await stat(new URL('../assets/qr/kidz-elternabend.svg', import.meta.url));
const ogImageStat = await stat(new URL('../assets/images/kidz-vorschau-elternabend.jpg', import.meta.url));

assert.match(html, /Exklusiver KIDZ-Elternabend/);
assert.match(html, /Der persönliche Eltern-Workshop für Familien/);
assert.match(html, /id="keaForm"/);
assert.match(html, /id="keaAdvisor"/);
assert.match(html, /promoter-anja-scholz">Anja Scholz/);
assert.match(html, /promoter-sandra-roehrens">Sandra Röhrens/);
assert.match(html, /promoter-anika-bibrach">Anika Biebrach/);
// David Stamm ist seit dem 12.08.2026 selbst Berater und gehoert genau einmal in die
// Auswahl. Eine zusaetzliche promoter-Zeile wuerde ihn doppeln und seine Anmeldungen
// einem anderen Berater zuordnen.
assert.match(html, /"david-stamm">David Stamm/);
assert.doesNotMatch(html, /promoter-david-stamm/);
assert.match(html, /Keine Angaben zu Kindern\. Kein Kauf\. Keine automatische Werbeeinwilligung\./);
assert.match(html, /keine Gewinnspielteilnahme, keine Kundenanfrage und keine Einwilligung in allgemeine Werbung/);
assert.match(html, /property="og:image:width" content="1200"/);
assert.match(html, /property="og:image:height" content="630"/);
assert.match(html, /kidz-vorschau-elternabend\.jpg/);
assert.doesNotMatch(sommerfestHtml, /href="\/kidz\/elternabend/);
assert.match(css, /color-scheme:\s*light/);
assert.match(css, /@media \(max-width:\s*640px\)/);

assert.match(publicJs, /\/api\/kidz-elternabend-register/);
assert.match(publicJs, /\/api\/kidz-advisors/);
assert.match(publicJs, /elternabend-qr/);
assert.match(publicJs, /beraterSlug/);
assert.match(publicJs, /captchaToken/);

assert.match(adminHtml, /Linas Elternabend-Strecke/);
assert.match(adminHtml, /alle Vormerkungen sofort und getrennt vom Sommerfest-Gewinnspiel/);
assert.match(adminHtml, /Alle Berater und Promoter/);
assert.match(adminHtml, /assets\/qr\/kidz-elternabend\.svg/);
assert.match(adminJs, /kidz_elternabend_anmeldungen/);
assert.match(adminJs, /postgres_changes/);
assert.match(adminJs, /appendParticipantFilterGroup\('Vermögensberater'/);
assert.match(adminJs, /appendParticipantFilterGroup\('Promoter'/);
assert.match(adminJs, /currentAdvisor\?\.ist_admin/);
assert.match(adminJs, /KIDZ Elternabend Vormerkungen/);

assert.match(navJs, /label: 'KIDZ'/);
assert.match(navJs, /dashboard\/kidz-elternabend\.html/);
assert.match(vercel, /"source": "\/kidz\/elternabend"/);
assert.match(vercel, /"destination": "\/kidz-elternabend\.html"/);

assert.match(migration, /create table if not exists public\.kidz_elternabend_anmeldungen/);
assert.match(migration, /enable row level security/);
assert.match(migration, /force row level security/);
assert.match(migration, /current_berater_id\(\) or public\.is_current_berater_admin\(\)/);
assert.match(migration, /grant update \(status, scheduled_for, contacted_at\)/);
assert.match(migration, /alter publication supabase_realtime add table public\.kidz_elternabend_anmeldungen/);
assert.match(migration, /register_kidz_elternabend_public/);
assert.match(migration, /kidz_parent_evening_registration/);
assert.match(migration, /rate_limit_check_key/);
assert.match(migration, /revoke execute[\s\S]*from public, anon, authenticated, service_role/);
assert.match(migration, /grant execute[\s\S]*to anon/);
assert.match(migration, /set name = 'Anika Biebrach'/);
assert.doesNotMatch(migration, /set key =/);

assert.ok(qrPngStat.size > 4_000);
assert.ok(qrSvgStat.size > 20_000);
// Nicht zu gross: WhatsApp laedt Vorschaubilder nur bis etwa 300 KB.
assert.ok(ogImageStat.size > 20_000 && ogImageStat.size <= 300 * 1024,
  `Vorschaubild ist ${Math.round(ogImageStat.size / 1024)} KB gross`);
