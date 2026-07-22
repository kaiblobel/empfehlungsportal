/**
 * Zuverlaessiges Empfaenger-Tracking ueber die eigene Domain.
 *
 * Der Browser spricht nicht mehr direkt mit Supabase. Dadurch haengt das
 * Tracking weder vom extern geladenen Supabase-Modul noch von dessen CDN ab.
 */
const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (!req.body) return {};
  try {
    return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
  } catch (_) {
    return {};
  }
}

async function callRpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase RPC ${name}: ${response.status}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }

  const body = readBody(req);
  const token = String(body.token || '').trim();
  const event = String(body.event || '').trim().toLowerCase();
  if (!TOKEN_PATTERN.test(token) || !['opened', 'booking_started'].includes(event)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false }));
  }

  try {
    if (event === 'opened') {
      await callRpc('mark_link_geoeffnet_rpc', { p_token: token });
    } else {
      await callRpc('mark_booking_started_rpc', { p_token: token });
    }
    res.statusCode = 204;
    return res.end();
  } catch (error) {
    console.error('[referral-event]', error.message);
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false }));
  }
};
