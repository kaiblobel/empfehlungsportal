const assert = require('node:assert/strict');
const handler = require('../api/referral-event.js');

function response() {
  const headers = {};
  let body = '';
  return {
    headers,
    get body() { return body; },
    statusCode: 0,
    setHeader(key, value) { headers[key] = value; },
    end(value) { body = value || ''; },
  };
}

async function testOpened() {
  let requestBody = null;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(null, { status: 204 });
  };
  const res = response();
  await handler({
    method: 'POST',
    body: { event: 'opened', token: '125b319f-4ba7-4577-acf3-4ed28468cb27' },
    headers: {},
  }, res);
  assert.equal(res.statusCode, 204);
  assert.deepEqual(requestBody, { p_token: '125b319f-4ba7-4577-acf3-4ed28468cb27' });
}

async function testRejectsInvalidToken() {
  const res = response();
  await handler({ method: 'POST', body: { event: 'opened', token: 'nope' }, headers: {} }, res);
  assert.equal(res.statusCode, 400);
}

(async () => {
  await testOpened();
  await testRejectsInvalidToken();
  console.log('referral-event-handler: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
