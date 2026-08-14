/** Tauscht einen Einmal-Code serverseitig gegen den bestehenden Bereich aus. */
const crypto = require('node:crypto');

const FUNCTION_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co/functions/v1/promoter-access-request';
const PUBLISHABLE_KEY = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function send(res, status, payload) {
  res.statusCode = status;
  return res.end(JSON.stringify(payload));
}

function readToken(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return String(req.body.token || '').trim();
  }
  try {
    const body = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '{}'));
    return String(body.token || '').trim();
  } catch (_) {
    return '';
  }
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === String(req.headers.host || '').toLowerCase();
  } catch (_) {
    return false;
  }
}

async function consumeAccess(secret, tokenHash) {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      apikey: PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      'x-promoter-secret': secret,
    },
    body: JSON.stringify({ action: 'consume', tokenHash }),
  });
  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) throw new Error(`Consume access: ${response.status}`);
  return result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false });
  }
  if (!sameOrigin(req)) return send(res, 403, { ok: false });

  const secret = process.env.PROMOTER_REGISTRATION_SECRET || '';
  const token = readToken(req);
  if (!secret) return send(res, 503, { ok: false, reason: 'not_configured' });
  if (!TOKEN_PATTERN.test(token)) return send(res, 400, { ok: false, reason: 'invalid_token' });

  try {
    const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    const result = await consumeAccess(secret, tokenHash);
    if (!result?.ok || !result?.code) {
      return send(res, 410, { ok: false, reason: 'invalid_token' });
    }
    return send(res, 200, { ok: true, code: result.code });
  } catch (_) {
    console.error('[promoter-access-open] consume_failed');
    return send(res, 502, { ok: false, reason: 'consume_failed' });
  }
};
