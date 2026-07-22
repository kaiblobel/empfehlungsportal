/**
 * Empfaengt bestaetigte Microsoft-Bookings-Ereignisse aus Power Automate.
 *
 * Datenschutz: Name und E-Mail werden nicht angefordert oder gespeichert.
 * Die Telefonnummer dient in der Datenbank nur zur Zuordnung zu einer zuvor
 * gestarteten Terminwahl.
 */
const crypto = require('node:crypto');

const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const EVENTS = new Set(['created', 'updated', 'cancelled']);

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (!req.body) return {};
  try {
    return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
  } catch (_) {
    return {};
  }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength) || null;
}

function cleanDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function recordBooking(secret, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_booking_event_rpc`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_secret: secret,
      p_event: payload.event,
      p_external_id: payload.appointmentId,
      p_customer_phone: payload.customerPhone,
      p_start_at: payload.startTime,
      p_service_name: payload.serviceName,
    }),
  });
  if (!response.ok) throw new Error(`Supabase Bookings RPC: ${response.status}`);
  return Boolean(await response.json());
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }

  const configuredSecret = process.env.BOOKINGS_WEBHOOK_SECRET || '';
  const suppliedSecret = req.headers['x-bookings-secret'] || '';
  if (!configuredSecret) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ ok: false, reason: 'not_configured' }));
  }
  if (!safeEqual(suppliedSecret, configuredSecret)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false }));
  }

  const body = readBody(req);
  const payload = {
    event: cleanText(body.event, 16)?.toLowerCase(),
    appointmentId: cleanText(body.appointmentId, 180),
    customerPhone: cleanText(body.customerPhone, 80),
    startTime: cleanDate(body.startTime),
    serviceName: cleanText(body.serviceName, 160),
  };

  if (!EVENTS.has(payload.event) || !payload.appointmentId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false }));
  }
  if (payload.event === 'created' && !payload.customerPhone) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, reason: 'phone_required' }));
  }

  try {
    const matched = await recordBooking(configuredSecret, payload);
    res.statusCode = matched ? 200 : 202;
    return res.end(JSON.stringify({ ok: true, matched }));
  } catch (error) {
    console.error('[bookings-event]', error.message);
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false }));
  }
};
