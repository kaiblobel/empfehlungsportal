import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const accessHandler = require('../api/promoter-register.js');
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
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '203.0.113.51',
    },
    body,
    ...overrides,
  };
}

const validBody = {
  action: 'access_request',
  email: 'anna@example.test',
  beraterSlug: 'kai-blobel',
  captchaToken: 'captcha-token',
};

const originalFetch = global.fetch;
const originalRegistrationSecret = process.env.PROMOTER_REGISTRATION_SECRET;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
process.env.PROMOTER_REGISTRATION_SECRET = 'test-registration-secret-with-enough-entropy';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

try {
  let calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('siteverify')) {
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
  };

  const success = responseMock();
  await accessHandler(request(validBody), success);
  assert.equal(success.statusCode, 200);
  assert.deepEqual(JSON.parse(success.body), { ok: true });
  assert.equal(calls.length, 2);
  const edgeCall = calls[1];
  const edgeBody = JSON.parse(edgeCall.options.body);
  assert.match(edgeBody.rateKey, /^[0-9a-f]{64}$/);
  assert.match(edgeBody.contactKey, /^[0-9a-f]{64}$/);
  assert.equal(edgeCall.options.headers['x-promoter-secret'], process.env.PROMOTER_REGISTRATION_SECRET);
  assert.doesNotMatch(edgeCall.options.body, /203\.0\.113\.51/);
  assert.doesNotMatch(success.body, /anna@example\.test/);

  calls = [];
  global.fetch = async () => { calls.push('unexpected'); };
  const invalid = responseMock();
  await accessHandler(request({ ...validBody, email: 'falsch' }), invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);

  const foreignOrigin = responseMock();
  await accessHandler(request(validBody, {
    headers: { host: 'localhost:3000', origin: 'https://example.org' },
  }), foreignOrigin);
  assert.equal(foreignOrigin.statusCode, 403);

  global.fetch = async (url) => {
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: false, status: 429, text: async () => '' };
  };
  const limited = responseMock();
  await accessHandler(request(validBody), limited);
  assert.equal(limited.statusCode, 429);

  const rawToken = 'A'.repeat(43);
  global.fetch = async (_url, options) => {
    const rpcBody = JSON.parse(options.body);
    assert.equal(rpcBody.action, 'consume');
    assert.match(rpcBody.tokenHash, /^[0-9a-f]{64}$/);
    assert.doesNotMatch(options.body, new RegExp(rawToken));
    return { ok: true, text: async () => JSON.stringify({ ok: true, code: 'Code-123_abc' }) };
  };
  const opened = responseMock();
  await accessHandler(request({ action: 'access_open', token: rawToken }), opened);
  assert.equal(opened.statusCode, 200);
  assert.deepEqual(JSON.parse(opened.body), { ok: true, code: 'Code-123_abc' });
  assert.doesNotMatch(opened.body, new RegExp(rawToken));
  assert.equal(opened.headers['Referrer-Policy'], 'no-referrer');

  const malformed = responseMock();
  await accessHandler(request({ action: 'access_open', token: 'zu-kurz' }), malformed);
  assert.equal(malformed.statusCode, 400);
  assert.equal(JSON.parse(malformed.body).reason, 'invalid_token');

  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ ok: false }) });
  const consumed = responseMock();
  await accessHandler(request({ action: 'access_open', token: rawToken }), consumed);
  assert.equal(consumed.statusCode, 410);

  const foreignOpen = responseMock();
  await accessHandler(request({ action: 'access_open', token: rawToken }, {
    headers: { host: 'localhost:3000', origin: 'https://example.org' },
  }), foreignOpen);
  assert.equal(foreignOpen.statusCode, 403);
} finally {
  global.fetch = originalFetch;
  if (originalRegistrationSecret === undefined) delete process.env.PROMOTER_REGISTRATION_SECRET;
  else process.env.PROMOTER_REGISTRATION_SECRET = originalRegistrationSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
}

const [html, css, js, accessHtml, accessJs, migration, edge, supabaseConfig] = await Promise.all([
  read('promoter-start.html'),
  read('css/promoter-start.css'),
  read('js/promoter-start.js'),
  read('promoter-access.html'),
  read('js/promoter-access.js'),
  read('supabase/migrations/20260814215546_promoter_access_magic_link.sql'),
  read('supabase/functions/promoter-access-request/index.ts'),
  read('supabase/config.toml'),
]);

assert.match(html, /id="psExistingLink"[^>]*>Mein vorhandener Bereich/);
assert.doesNotMatch(html, /id="psExistingLink"[^>]*hidden/);
assert.match(html, /id="psAccessDialog"/);
assert.match(html, /15 Minuten gültig/);
assert.match(css, /\.ps-access-dialog::backdrop/);
assert.match(js, /\/api\/promoter-register/);
assert.match(js, /action: 'access_request'/);
assert.match(js, /accessState === 'ungueltig'/);
assert.match(accessHtml, /meta name="referrer" content="no-referrer"/);
assert.match(accessJs, /window\.location\.hash/);
assert.match(accessJs, /history\.replaceState/);
assert.match(accessJs, /\/api\/promoter-register/);
assert.match(accessJs, /action: 'access_open'/);
assert.match(migration, /create table if not exists private\.empfehler_access_tokens/);
assert.match(migration, /alter table private\.empfehler_access_tokens enable row level security/);
assert.doesNotMatch(migration, /\btoken\s+text\b/i);
assert.match(migration, /token_hash text not null unique/);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /grant execute on function public\.request_empfehler_access[\s\S]*to service_role/);
assert.match(migration, /grant execute on function public\.consume_empfehler_access[\s\S]*to service_role/);
assert.match(migration, /used_at is null[\s\S]*expires_at > clock_timestamp\(\)/);
assert.match(edge, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
assert.match(edge, /action === "consume"/);
assert.match(edge, /accessUrl\.hash = new URLSearchParams/);
assert.match(edge, /Idempotency-Key/);
assert.match(edge, /api\.resend\.com\/emails/);
assert.match(edge, /return Response\.json\(\{ ok: true \}\)/);
assert.match(edge, /SUPABASE_SECRET_KEYS/);
assert.match(supabaseConfig, /\[functions\.promoter-access-request\][\s\S]*verify_jwt = false/);

console.log('promoter-access: OK');
