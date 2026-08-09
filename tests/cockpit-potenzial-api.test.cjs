const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/cockpit-potenzial.js');

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = value; return value; },
  };
}

test('Proxy lehnt fremde Ursprünge und fehlende Anmeldung ab', async () => {
  const fremd = responseRecorder();
  await handler({ method: 'POST', headers: { origin: 'https://fremd.example', host: 'portal.example' }, body: { action: 'status' } }, fremd);
  assert.equal(fremd.statusCode, 403);

  const ohneLogin = responseRecorder();
  await handler({ method: 'POST', headers: { host: 'portal.example' }, body: { action: 'status' } }, ohneLogin);
  assert.equal(ohneLogin.statusCode, 401);
});

test('Proxy reicht nur erlaubte Felder und den Portal-Token weiter', async (t) => {
  const vorher = process.env.COCKPIT_POTENZIAL_API_URL;
  process.env.COCKPIT_POTENZIAL_API_URL = 'https://cockpit.example/api/potenzial';
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    if (vorher === undefined) delete process.env.COCKPIT_POTENZIAL_API_URL;
    else process.env.COCKPIT_POTENZIAL_API_URL = vorher;
  });

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ ok: true, links: [] }), { status: 200 });
  };

  const res = responseRecorder();
  await handler({
    method: 'POST',
    headers: { host: 'portal.example', origin: 'https://portal.example', authorization: 'Bearer test-token' },
    body: { action: 'verbinden', potentialId: 'pot-1', mode: 'new', confirmNew: true, advisorId: 'darf-nicht-mit' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(request.url, 'https://cockpit.example/api/potenzial');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(request.options.body), {
    action: 'verbinden', potentialId: 'pot-1', mode: 'new', confirmNew: true,
  });
  assert.equal(JSON.parse(res.body).cockpitBaseUrl, 'https://cockpit.example');
});

test('Proxy leitet nur sichere Cockpit-Zieladressen an den Browser weiter', () => {
  assert.equal(handler._test.targetBaseUrl('https://cockpit-staging.example/api/potenzial'), 'https://cockpit-staging.example');
  assert.equal(handler._test.targetBaseUrl('http://localhost:3001/api/potenzial'), 'http://localhost:3001');
  assert.equal(handler._test.targetBaseUrl('http://cockpit.example/api/potenzial'), '');
  assert.equal(handler._test.targetBaseUrl('file:///tmp/cockpit'), '');
});
