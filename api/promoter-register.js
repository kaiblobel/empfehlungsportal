/**
 * Oeffentliche Promoter-Selbstanmeldung ueber die eigene Domain.
 *
 * Der Browser bekommt weder den Supabase-Service-Key noch das interne
 * Registrierungs-Secret. Turnstile, Eingabepruefung, Dublettenlogik und
 * Mengenbegrenzung laufen vor dem geschuetzten Supabase-RPC.
 */
const crypto = require('node:crypto');

const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const ALLOWED_SOURCES = new Set(['praesentation', 'aufsteller', 'direkt', 'portal']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ACCESS_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/promoter-access-request`;

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

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 100);
}

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase().slice(0, 180);
  return email && EMAIL_PATTERN.test(email) ? email : '';
}

function cleanPhone(value) {
  let phone = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!phone) return '';
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith('0')) phone = `+49${phone.slice(1)}`;
  else if (!phone.startsWith('+')) phone = `+${phone}`;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
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

async function registerPromoter(secret, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_empfehler_public`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_secret: secret,
      p_name: payload.name,
      p_email: payload.email || null,
      p_telefon: payload.telefon || null,
      p_berater_slug: payload.beraterSlug,
      p_source: payload.source,
      p_rate_key: payload.rateKey,
      p_contact_key: payload.contactKey,
      p_consent: true,
    }),
  });

  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) {
    const message = String(result?.message || '');
    const error = new Error(message || `Supabase Registrierung: ${response.status}`);
    error.statusCode = message.includes('Zu viele Anfragen') ? 429 : 502;
    throw error;
  }
  return result;
}

async function callAccessFunction(secret, payload) {
  const response = await fetch(ACCESS_FUNCTION_URL, {
    method: 'POST',
    headers: {
      apikey: ANON,
      'Content-Type': 'application/json',
      'x-promoter-secret': secret,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) {
    const error = new Error(`Promoter access: ${response.status}`);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }
  return result;
}

async function requestExistingAccess(req, res, body, registrationSecret, turnstileSecret) {
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
    await callAccessFunction(registrationSecret, {
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
}

async function openExistingAccess(res, body, registrationSecret) {
  const token = String(body.token || '').trim();
  if (!TOKEN_PATTERN.test(token)) {
    return send(res, 400, { ok: false, reason: 'invalid_token' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    const result = await callAccessFunction(registrationSecret, {
      action: 'consume',
      tokenHash,
    });
    if (!result?.ok || !result?.code) {
      return send(res, 410, { ok: false, reason: 'invalid_token' });
    }
    return send(res, 200, { ok: true, code: result.code });
  } catch (_) {
    console.error('[promoter-access-open] consume_failed');
    return send(res, 502, { ok: false, reason: 'consume_failed' });
  }
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

  const body = readBody(req);
  const action = String(body.action || '').trim();
  const registrationSecret = process.env.PROMOTER_REGISTRATION_SECRET || '';
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
  if (!registrationSecret || (action !== 'access_open' && !turnstileSecret)) {
    return send(res, 503, { ok: false, reason: 'not_configured' });
  }

  if (action === 'access_request') {
    return requestExistingAccess(req, res, body, registrationSecret, turnstileSecret);
  }
  if (action === 'access_open') {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return openExistingAccess(res, body, registrationSecret);
  }

  const name = cleanName(body.name);
  const rawEmail = String(body.email || '').trim();
  const rawPhone = String(body.telefon || '').trim();
  const email = cleanEmail(rawEmail);
  const telefon = cleanPhone(rawPhone);
  const beraterSlug = String(body.beraterSlug || '').trim().toLowerCase().slice(0, 80);
  const requestedSource = String(body.source || '').trim().toLowerCase();
  const source = ALLOWED_SOURCES.has(requestedSource) ? requestedSource : 'direkt';
  const captchaToken = String(body.captchaToken || '').trim().slice(0, 4096);

  if (name.length < 2 || !SLUG_PATTERN.test(beraterSlug) || body.consent !== true) {
    return send(res, 400, { ok: false, reason: 'invalid_input' });
  }
  if ((rawEmail && !email) || (rawPhone && !telefon) || (!email && !telefon)) {
    return send(res, 400, { ok: false, reason: 'invalid_contact' });
  }
  if (!captchaToken) return send(res, 400, { ok: false, reason: 'captcha_required' });

  const ip = requestIp(req);
  try {
    if (!await verifyTurnstile(turnstileSecret, captchaToken, ip)) {
      return send(res, 400, { ok: false, reason: 'captcha_failed' });
    }

    const contactIdentity = email ? `email:${email}` : `phone:${telefon}`;
    const result = await registerPromoter(registrationSecret, {
      name,
      email,
      telefon,
      beraterSlug,
      source,
      rateKey: hmac(registrationSecret, `ip:${ip}`),
      contactKey: hmac(registrationSecret, `${beraterSlug}|${contactIdentity}`),
    });

    if (result?.reason === 'already_exists') {
      return send(res, 409, { ok: false, reason: 'already_exists' });
    }
    if (result?.reason === 'invalid_advisor') {
      return send(res, 400, { ok: false, reason: 'invalid_advisor' });
    }
    if (!result?.ok || !result?.code) throw new Error('Unvollstaendige Registrierungsantwort');
    return send(res, 201, { ok: true, code: result.code });
  } catch (error) {
    console.error('[promoter-register]', error.message);
    return send(res, error.statusCode || 502, {
      ok: false,
      reason: error.statusCode === 429 ? 'rate_limited' : 'registration_failed',
    });
  }
};
