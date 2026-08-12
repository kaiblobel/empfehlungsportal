/**
 * Nacherfassung der Papierzettel vom KIDZ-Sommerfest durch angemeldete Berater.
 *
 * Kein Turnstile und keine IP-Bremse: Der Erfasser ist angemeldet und reicht sein
 * Portal-Token durch. Die Datenbank bleibt die Rechteinstanz und prüft, ob er für
 * die gewählte Zuordnung erfassen darf.
 *
 * Der Dublettenschlüssel wird hier zeichengleich zur öffentlichen Anmeldung
 * gebildet (api/kidz-register.js). Nur dadurch erkennt das Portal einen Zettel als
 * Dublette zu einer bereits vorhandenen Online-Anmeldung.
 */
const crypto = require('node:crypto');

const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const EVENT_KEY = 'kidz-sommerfest-2026';
const CONDITIONS_VERSION = '2026-08-12-v5';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BEARER_PATTERN = /^Bearer\s+[^\s]+$/i;

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

function cleanCompanions(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return Number.NaN;
  const anzahl = Math.trunc(number);
  return anzahl >= 0 && anzahl <= 20 ? anzahl : Number.NaN;
}

function cleanGuess(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return Number.NaN;
  const guess = Math.trunc(number);
  return guess >= 10 && guess <= 999 ? guess : Number.NaN;
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

async function recordParticipation(secret, accessToken, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_kidz_gewinnspiel_onsite`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_secret: secret,
      p_event_key: EVENT_KEY,
      p_berater_slug: payload.beraterSlug || null,
      p_name: payload.name,
      p_email: payload.email || null,
      p_telefon: payload.telefon || null,
      p_schaetzung_cm: payload.schaetzung,
      p_begleitpersonen: payload.begleitpersonen,
      p_elternabend_interesse: payload.parentEvening,
      p_conditions_version: CONDITIONS_VERSION,
      p_contact_key: payload.contactKey,
      p_contact_key_alt: payload.contactKeyAlt,
      p_consent: true,
    }),
  });

  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) {
    const message = String(result?.message || '');
    const error = new Error(message || `Supabase Nacherfassung: ${response.status}`);
    error.statusCode = response.status === 401 || response.status === 403 ? 401 : 502;
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

  const authorization = String(req.headers.authorization || '').trim();
  if (!BEARER_PATTERN.test(authorization)) {
    return send(res, 401, { ok: false, reason: 'authentication_required' });
  }
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();

  const registrationSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET || '';
  if (!registrationSecret) {
    return send(res, 503, { ok: false, reason: 'not_configured' });
  }

  const body = readBody(req);
  const name = cleanName(body.name);
  const rawEmail = String(body.email || '').trim();
  const rawPhone = String(body.telefon || '').trim();
  const email = cleanEmail(rawEmail);
  const telefon = cleanPhone(rawPhone);
  const schaetzung = cleanGuess(body.schaetzung);
  const begleitpersonen = cleanCompanions(body.begleitpersonen);
  const requestedAdvisorSlug = String(body.beraterSlug || '').trim().toLowerCase().slice(0, 80);

  if (name.length < 2 || body.consent !== true) {
    return send(res, 400, { ok: false, reason: 'invalid_input' });
  }
  if (requestedAdvisorSlug && !SLUG_PATTERN.test(requestedAdvisorSlug)) {
    return send(res, 400, { ok: false, reason: 'invalid_advisor' });
  }
  if ((rawEmail && !email) || (rawPhone && !telefon) || (!email && !telefon)) {
    return send(res, 400, { ok: false, reason: 'invalid_contact' });
  }
  if (Number.isNaN(schaetzung)) {
    return send(res, 400, { ok: false, reason: 'invalid_guess' });
  }
  if (Number.isNaN(begleitpersonen)) {
    return send(res, 400, { ok: false, reason: 'invalid_companions' });
  }

  try {
    const contactIdentity = email ? `email:${email}` : `phone:${telefon}`;
    const result = await recordParticipation(registrationSecret, accessToken, {
      name,
      email,
      telefon,
      schaetzung,
      begleitpersonen,
      beraterSlug: requestedAdvisorSlug,
      parentEvening: body.parentEvening === true,
      contactKey: hmac(registrationSecret, `${EVENT_KEY}|${contactIdentity}`),
      contactKeyAlt: email && telefon
        ? hmac(registrationSecret, `${EVENT_KEY}|phone:${telefon}`)
        : null,
    });

    if (result?.reason === 'already_exists') {
      return send(res, 409, { ok: false, reason: 'already_exists', reference: result.reference || null });
    }
    if (result?.reason === 'forbidden') return send(res, 403, { ok: false, reason: 'forbidden' });
    if (result?.reason === 'no_advisor_account') return send(res, 403, { ok: false, reason: 'no_advisor_account' });
    if (result?.reason === 'invalid_advisor') return send(res, 400, { ok: false, reason: 'invalid_advisor' });
    if (!result?.ok || !result?.reference) throw new Error('Unvollständige Antwort der Nacherfassung');
    return send(res, 201, { ok: true, reference: result.reference });
  } catch (error) {
    console.error('[kidz-nacherfassung]', error.message);
    return send(res, error.statusCode || 502, {
      ok: false,
      reason: error.statusCode === 401 ? 'authentication_required' : 'registration_failed',
    });
  }
};
