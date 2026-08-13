const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const handler = require('../api/kidz-config.js');

function response() {
  return {
    headers: {}, statusCode: 0, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(body = '') { this.body = body; },
  };
}

test('KIDZ Aufrufzaehler akzeptiert einen echten Browser und uebergibt nur Aggregate', async () => {
  const oldSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  const oldFetch = global.fetch;
  process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-secret-with-enough-entropy';
  let rpcBody = null;
  global.fetch = async (_url, options) => {
    rpcBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const res = response();
    await handler({
      method: 'POST',
      headers: {
        host: 'kidz.example',
        origin: 'https://kidz.example',
        'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36',
        'x-forwarded-for': '192.0.2.10',
      },
      body: { source: 'whatsapp', beraterSlug: 'kai-blobel' },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(JSON.parse(res.body), { ok: true });
    assert.equal(rpcBody.p_source, 'whatsapp');
    assert.equal(rpcBody.p_berater_slug, 'kai-blobel');
    assert.match(rpcBody.p_rate_key, /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(rpcBody).includes('192.0.2.10'));
    assert.ok(!Object.hasOwn(rpcBody, 'userAgent'));
  } finally {
    global.fetch = oldFetch;
    if (oldSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
    else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = oldSecret;
  }
});

test('Vorschau-Bots und fremde Urspruenge werden nicht gezaehlt', async () => {
  const oldSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-secret-with-enough-entropy';
  try {
    const preview = response();
    await handler({ method: 'POST', headers: { host: 'kidz.example', 'user-agent': 'facebookexternalhit/1.1' }, body: {} }, preview);
    assert.equal(preview.statusCode, 204);

    const foreign = response();
    await handler({ method: 'POST', headers: { host: 'kidz.example', origin: 'https://evil.example', 'user-agent': 'Mozilla/5.0 Chrome/140' }, body: {} }, foreign);
    assert.equal(foreign.statusCode, 403);
  } finally {
    if (oldSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
    else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = oldSecret;
  }
});

test('Browser, Verwaltung und Migration bilden den datensparsamen Zaehler ab', () => {
  const root = path.join(__dirname, '..');
  const summer = fs.readFileSync(path.join(root, 'js', 'kidz-sommerfest.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'js', 'kidz-gewinnspiel-admin.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'dashboard', 'kidz-gewinnspiel.html'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'schema-phase212-kidz-aufrufzaehler.sql'), 'utf8');

  assert.match(summer, /navigator\.webdriver/);
  assert.doesNotMatch(summer, /localStorage|sessionStorage|document\.cookie/);
  assert.match(summer, /fetch\('\/api\/kidz-config'/);
  assert.match(admin, /from\('kidz_seitenaufrufe_tag'\)/);
  assert.match(html, /id="pageviewCount"/);
  assert.match(html, /id="whatsappPageviewCount"/);
  assert.match(html, /id="copyWhatsAppBtn"/);
  assert.match(admin, /\/kidz\/sommerfest\?berater=\$\{encodeURIComponent\(slug\)\}&quelle=whatsapp/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke all on table public\.kidz_seitenaufrufe_tag from public, anon, authenticated/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /private\.rate_limit_check_key/);
  assert.match(migration, /test_advisor/);
  assert.doesNotMatch(migration, /user_agent|ip_address|referrer/);
});
