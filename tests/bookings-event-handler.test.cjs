const assert = require('node:assert/strict');

process.env.BOOKINGS_WEBHOOK_SECRET = 'test-secret-only';
const handler = require('../api/bookings-event.js');

function response() {
  let body = '';
  return {
    get body() { return body; },
    statusCode: 0,
    setHeader() {},
    end(value) { body = value || ''; },
  };
}

async function testConfirmedBooking() {
  let rpcBody = null;
  global.fetch = async (_url, options) => {
    rpcBody = JSON.parse(options.body);
    return new Response('true', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const res = response();
  await handler({
    method: 'POST',
    headers: { 'x-bookings-secret': 'test-secret-only' },
    body: {
      event: 'created',
      appointmentId: 'appointment-123',
      customerPhone: '+49 151 00000000',
      startTime: '2026-07-28T14:00:00Z',
      serviceName: 'Finanzpotenzial-Gespraech',
    },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).matched, true);
  assert.equal(rpcBody.p_event, 'created');
  assert.equal(rpcBody.p_external_id, 'appointment-123');
}

async function testRejectsWrongSecret() {
  const res = response();
  await handler({ method: 'POST', headers: { 'x-bookings-secret': 'wrong' }, body: {} }, res);
  assert.equal(res.statusCode, 401);
}

(async () => {
  await testConfirmedBooking();
  await testRejectsWrongSecret();
  console.log('bookings-event-handler: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
