/**
 * Fordert fuer einen bestehenden Empfehler einen kurz gueltigen Einmal-Link an.
 * Die Antwort bleibt neutral und verraet nicht, ob die E-Mail existiert.
 */
const crypto = require('node:crypto');

const FUNCTION_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co/functions/v1/promoter-access-request';
const PUBLISHABLE_KEY = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function send(res, status, payload) {
  res.statusCode = status;
  return res.end(JSON.stringify(payload));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (!req.body) return {};
  try {
    return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
  } catch (_) {
    return {};
  }
}

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase().slice(0, 180);
  return email && EMAIL_PATTERN.test(email) ? email : '';
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '').trim() || 'unknown';
}

function hmac(secret, value) {
  return crypto.createHmac('sha256', secret).update(value, 'utf8').digest('hex');
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

async function verifyTurnstile(secret, token, ip) {
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (ip && ip !== 'unknown') body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result?.success === true;
}

async function requestAccess(secret, payload) {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      apikey: PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      'x-promoter-secret': secret,
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 429) {
    const error = new Error('rate_limited');
    error.statusCode = 429;
    throw error;
  }
  if (!response.ok) throw new Error(`Access function: ${response.status}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false });
  }
  if (!sameOrigin(req)) return send(res, 403, { ok: false });

  const registrationSecret = process.env.PROMOTER_REGISTRATION_SECRET || '';
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
  if (!registrationSecret || !turnstileSecret) {
    return send(res, 503, { ok: false, reason: 'not_configured' });
  }

  const body = readBody(req);
  const email = cleanEmail(body.email);
  const beraterSlug = String(body.beraterSlug || '').trim().toLowerCase().slice(0, 80);
  const captchaToken = String(body.captchaToken || '').trim().slice(0, 4096);
  if (!email || !SLUG_PATTERN.test(beraterSlug)) {
    return send(res, 400, { ok: false, reason: 'invalid_input' });
  }
  if (!captchaToken) return send(res, 400, { ok: false, reason: 'captcha_required' });

  const ip = requestIp(req);
  try {
    if (!await verifyTurnstile(turnstileSecret, captchaToken, ip)) {
      return send(res, 400, { ok: false, reason: 'captcha_failed' });
    }
    await requestAccess(registrationSecret, {
      action: 'request',
      email,
      beraterSlug,
      rateKey: hmac(registrationSecret, `access-ip:${ip}`),
      contactKey: hmac(registrationSecret, `access:${beraterSlug}|${email}`),
    });
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('[promoter-access-request]', error.statusCode === 429 ? 'rate_limited' : 'request_failed');
    return send(res, error.statusCode || 502, {
      ok: false,
      reason: error.statusCode === 429 ? 'rate_limited' : 'request_failed',
    });
  }
};
