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
  assert.equal(headers.Location, '/baufi.html?token=abc+123&vorlage=baufi');
}

async function testThemeFallbackRoutes() {
  const routes = {
    foerderungen: '/thema.html?token=abc+123&vorlage=foerderungen',
    selbstaendige: '/thema.html?token=abc+123&vorlage=selbstaendige',
    investment: '/thema.html?token=abc+123&vorlage=investment',
    absicherung: '/thema.html?token=abc+123&vorlage=absicherung',
    karriere: '/thema.html?token=abc+123&vorlage=karriere',
    // Kinder führt auf die eigene KIDZ-Einleitung, die von dort aufs Konzept
    // weitergeht. Die allgemeine Themenseite ist hier bewusst nicht das Ziel.
    kinder: '/kidz-empfehlung.html?token=abc+123&vorlage=kinder',
    banking: '/thema.html?token=abc+123&vorlage=banking',
    energie: '/thema.html?token=abc+123&vorlage=energie',
    unbekannt: '/empfaenger.html?token=abc+123&vorlage=unbekannt',
  };

  for (const [template, expected] of Object.entries(routes)) {
    global.fetch = async () => { throw new Error('offline'); };
    const headers = {};
    const res = {
      statusCode: 0,
      setHeader: (key, value) => { headers[key] = value; },
      end: () => {},
    };

    await handler({
      headers: { host: 'example.test', 'x-forwarded-proto': 'https' },
      url: `/e?token=abc%20123&vorlage=${template}`,
    }, res);

    assert.equal(res.statusCode, 302);
    assert.equal(headers.Location, expected);
  }
}

async function testStoredThemeRoutesOldLinks() {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('get_empfehlung_public')) {
      return new Response(JSON.stringify([{ vorlage_slug: 'kinder' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (String(url).endsWith('/kidz-empfehlung.html')) {
      return new Response('<title>Themenseite</title>', { status: 200 });
    }
    return new Response('[]', { status: 200 });
  };

  let body = '';
  const res = {
    statusCode: 0,
    setHeader: () => {},
    end: (value) => { body = value || ''; },
  };

  await handler({
    headers: { host: 'example.test', 'x-forwarded-proto': 'https' },
    url: '/e?token=alter-link',
  }, res);

  assert.equal(res.statusCode, 200);
  assert.ok(calls.some((url) => url.endsWith('/kidz-empfehlung.html')),
    'ein alter Kinder-Link landet auf der KIDZ-Einleitung, nicht mehr auf der Themenseite');
  assert.ok(body.includes('Themenseite'));
}

async function testStoredBaufiRoutesToCanonicalPage() {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('get_empfehlung_public')) {
      return new Response(JSON.stringify([{ vorlage_slug: 'baufi' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (String(url).endsWith('/baufi.html')) {
      return new Response('<title>Finanzierungskompass</title>', { status: 200 });
    }
    return new Response('[]', { status: 200 });
  };

  let body = '';
  const res = {
    statusCode: 0,
    setHeader: () => {},
    end: (value) => { body = value || ''; },
  };

  await handler({
    headers: { host: 'example.test', 'x-forwarded-proto': 'https' },
    url: '/e?token=alter-baufi-link',
  }, res);

  assert.equal(res.statusCode, 200);
  assert.ok(calls.some((url) => url.endsWith('/baufi.html')));
  assert.ok(body.includes('Finanzierungskompass'));
}

async function testCleanRecommendationAddressCarriesTokenIntoPage() {
  const token = '125b319f-4ba7-4577-acf3-4ed28468cb27';
  global.fetch = async (url) => {
    if (String(url).includes('get_empfehlung_public')) {
      return new Response(JSON.stringify([{ vorlage_slug: 'baufi' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (String(url).endsWith('/baufi.html')) {
      return new Response('<html><head><title>Finanzierungskompass</title></head><body></body></html>', { status: 200 });
    }
    return new Response('[]', { status: 200 });
  };

  let body = '';
  const res = {
    statusCode: 0,
    setHeader: () => {},
    end: (value) => { body = value || ''; },
  };

  await handler({
    headers: { host: 'example.test', 'x-forwarded-proto': 'https' },
    url: `/empfehlung/${token}`,
  }, res);

  assert.equal(res.statusCode, 200);
  assert.ok(body.includes(`<meta name="referral-token" content="${token}" />`));
  assert.ok(body.includes(`<meta property="og:url" content="https://example.test/empfehlung/${token}" />`));
}

(async () => {
  await testHappyPath();
  await testFallbackKeepsQuery();
  await testThemeFallbackRoutes();
  await testStoredThemeRoutesOldLinks();
  await testStoredBaufiRoutesToCanonicalPage();
  await testCleanRecommendationAddressCarriesTokenIntoPage();
  console.log('share-handler: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
