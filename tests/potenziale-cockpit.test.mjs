import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cockpitAccessState,
  cockpitClientUrl,
  cockpitFehlertext,
  cockpitLinkMap,
  cockpitRequest,
  cockpitStatusLabel,
} from '../js/potenziale-cockpit.mjs';

test('Cockpit-Status wird verständlich gespiegelt', () => {
  assert.equal(cockpitStatusLabel('interessent'), 'Interessent');
  assert.equal(cockpitStatusLabel('kunde'), 'Kunde');
  assert.equal(cockpitStatusLabel('altkunde'), 'Altkunde');
});

test('Cockpit-Zugang wird nur bei ausdrücklicher Freigabe aktiv', () => {
  assert.equal(cockpitAccessState({ ok: true, access: 'available' }), 'available');
  assert.equal(cockpitAccessState({ ok: true, access: 'locked' }), 'locked');
  assert.equal(cockpitAccessState({ ok: true }), 'unavailable');
  assert.equal(cockpitAccessState({ ok: false, reason: 'cockpit_unreachable' }), 'unavailable');
});

test('Statusantwort wird nur mit vollständigen festen Kennungen übernommen', () => {
  const map = cockpitLinkMap({ ok: true, links: [
    { potentialId: 'pot-1', clientId: 'client-1', clientPath: '/clients/client-1' },
    { potentialId: 'unvollstaendig' },
  ] });
  assert.equal(map.size, 1);
  assert.equal(map.get('pot-1').clientId, 'client-1');
});

test('Kundenadresse akzeptiert nur den festen Cockpit-Pfad', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(cockpitClientUrl({ clientPath: `/clients/${id}` }), `https://www.beratercockpit.de/clients/${id}`);
  assert.equal(
    cockpitClientUrl({ clientPath: `/clients/${id}`, cockpitBaseUrl: 'https://cockpit-staging.example' }),
    `https://cockpit-staging.example/clients/${id}`,
  );
  assert.equal(
    cockpitClientUrl({ clientPath: `/clients/${id}`, cockpitBaseUrl: 'http://localhost:3001/api' }),
    `http://localhost:3001/clients/${id}`,
  );
  assert.equal(
    cockpitClientUrl({ clientPath: `/clients/${id}`, cockpitBaseUrl: 'http://fremd.example' }),
    `https://www.beratercockpit.de/clients/${id}`,
  );
  assert.equal(cockpitClientUrl({ clientPath: 'https://fremd.example' }), 'https://www.beratercockpit.de');
});

test('Anfrage reicht den Zugriffstoken mit kleiner Nutzlast weiter', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ ok: true, candidates: [] }), { status: 200 });
  };
  const result = await cockpitRequest(fetchImpl, 'token-123', { action: 'vorschau', potentialId: 'pot-1' });
  assert.equal(result.ok, true);
  assert.equal(request.url, '/api/cockpit-potenzial');
  assert.equal(request.options.headers.Authorization, 'Bearer token-123');
});

test('Sicherheitsfehler werden klar und ohne falsche Erfolgszusage erklärt', () => {
  assert.match(cockpitFehlertext('cockpit_access_pending'), /noch nicht freigeschaltet/i);
  assert.match(cockpitFehlertext('advisor_mapping_missing'), /nichts verbunden/i);
  assert.match(cockpitFehlertext('client_not_in_advisor_scope'), /nicht zu deinem Beraterbereich/i);
});
