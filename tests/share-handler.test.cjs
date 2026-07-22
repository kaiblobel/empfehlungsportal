const assert = require('node:assert/strict');
const handler = require('../api/share.js');

async function testHappyPath() {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith('/empfaenger.html')) {
      return new Response([
        '<title>Alt</title>',
        '<meta name="description" content="x">',
        '<meta property="og:description" content="x">',
        '<meta property="og:image" content="x">',
        '<meta name="twitter:image" content="x">',
      ].join(''));
    }
    return new Response('[]', { status: 200 });
  };

  const headers = {};
  let body = '';
  const res = {
    statusCode: 0,
    setHeader: (key, value) => { headers[key] = value; },
    end: (value) => { body = value || ''; },
  };

  await handler({
    headers: { host: 'example.test', 'x-forwarded-proto': 'https' },
    url: '/e?token=abc%20123',
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(headers['Content-Type'], 'text/html; charset=utf-8');
  assert.ok(calls.some((url) => url.includes('get_empfehlung_public')));
  assert.ok(body.includes('<title>Alt</title>'));
}

async function testFallbackKeepsQuery() {
  global.fetch = async () => { throw new Error('offline'); };

  const headers = {};
  const res = {
    statusCode: 0,
    setHeader: (key, value) => { headers[key] = value; },
    end: () => {},
  };

  await handler({
    headers: { host: 'example.test', 'x-forwarded-proto': 'https' },
    url: '/e?token=abc%20123&vorlage=baufi',
  }, res);

  assert.equal(res.statusCode, 302);
  assert.equal(headers.Location, '/baufi.html?token=abc%20123&vorlage=baufi');
}

(async () => {
  await testHappyPath();
  await testFallbackKeepsQuery();
  console.log('share-handler: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
