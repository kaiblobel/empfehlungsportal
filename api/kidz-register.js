/**
 * Öffentliche Gewinnspiel-Anmeldung für das KIDZ-Sommerfest 2026.
 *
 * Gewinnspielteilnahmen bleiben eine eigene Datenstrecke. Bei einer namentlichen
 * Einladung speichert die Datenbank nur die interne Promoter-Verknüpfung.
 * Der Browser erhält weder Promoter-Codes noch interne Datenbankrechte.
 */
const crypto = require('node:crypto');

const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const EVENT_KEY = 'kidz-sommerfest-2026';
const DEFAULT_ADVISOR_SLUG = 'kai-blobel';
const CONDITIONS_VERSION = '2026-08-12-v4';
const ALLOWED_SOURCES = new Set(['vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt']);
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

async function registerParticipation(secret, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_kidz_gewinnspiel_public`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_secret: secret,
      p_event_key: EVENT_KEY,
      p_berater_slug: payload.beraterSlug,
      p_name: payload.name,
      p_email: payload.email || null,
      p_telefon: payload.telefon || null,
      p_source: payload.source,
      p_elternabend_interesse: payload.parentEvening,
      p_conditions_version: CONDITIONS_VERSION,
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

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false });
  }
  if (!sameOrigin(req)) return send(res, 403, { ok: false });

  const registrationSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET || '';
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
  if (!registrationSecret || !turnstileSecret) {
    return send(res, 503, { ok: false, reason: 'not_configured' });
  }

  const body = readBody(req);
  const name = cleanName(body.name);
  const rawEmail = String(body.email || '').trim();
  const rawPhone = String(body.telefon || '').trim();
  const email = cleanEmail(rawEmail);
  const telefon = cleanPhone(rawPhone);
  const requestedSource = String(body.source || '').trim().toLowerCase();
  const source = ALLOWED_SOURCES.has(requestedSource) ? requestedSource : 'direkt';
  const requestedAdvisorSlug = String(body.beraterSlug || '').trim().toLowerCase().slice(0, 80);
  const beraterSlug = requestedAdvisorSlug || DEFAULT_ADVISOR_SLUG;
  const captchaToken = String(body.captchaToken || '').trim().slice(0, 4096);

  if (name.length < 2 || body.consent !== true || !SLUG_PATTERN.test(beraterSlug)) {
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
    const result = await registerParticipation(registrationSecret, {
      name,
      email,
      telefon,
      source,
      beraterSlug,
      parentEvening: body.parentEvening === true,
      rateKey: hmac(registrationSecret, `ip:${ip}`),
      contactKey: hmac(registrationSecret, `${EVENT_KEY}|${contactIdentity}`),
    });

    if (result?.reason === 'already_exists') {
      return send(res, 409, { ok: false, reason: 'already_exists' });
    }
    if (result?.reason === 'invalid_advisor' || result?.reason === 'invalid_event') {
      return send(res, 400, { ok: false, reason: result.reason });
    }
    if (!result?.ok || !result?.reference) throw new Error('Unvollständige Registrierungsantwort');
    return send(res, 201, { ok: true, reference: result.reference });
  } catch (error) {
    console.error('[kidz-register]', error.message);
    return send(res, error.statusCode || 502, {
      ok: false,
      reason: error.statusCode === 429 ? 'rate_limited' : 'registration_failed',
    });
  }
};
