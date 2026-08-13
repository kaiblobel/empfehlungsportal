/**
 * Datensparsamer Aufrufzaehler fuer die KIDZ-Sommerfestseite.
 *
 * Gespeichert werden nur Tageszaehler je Quelle und Berater. IP-Adresse und
 * Browserkennung verlassen diesen Endpunkt nicht. Die IP wird nur als HMAC
 * fuer das bestehende Rate-Limit verwendet.
 */
const crypto = require('node:crypto');

const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const EVENT_KEY = 'kidz-sommerfest-2026';
const PAGE_KEY = 'sommerfest';
const DEFAULT_ADVISOR_SLUG = 'kai-blobel';
const ALLOWED_SOURCES = new Set(['vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BOT_PATTERN = /(?:bot|crawler|spider|slurp|facebookexternalhit|facebot|twitterbot|linkedinbot|telegrambot|discordbot|skypeuripreview|google-inspectiontool|headlesschrome)/i;

function send(res, status, payload) {
  res.statusCode = status;
  return status === 204 ? res.end() : res.end(JSON.stringify(payload));
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

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === String(req.headers.host || '').toLowerCase();
  } catch (_) {
    return false;
  }
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '').trim() || 'unknown';
}

function hmac(secret, value) {
  return crypto.createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

function isPreviewBot(req) {
  const userAgent = String(req.headers['user-agent'] || '');
  if (BOT_PATTERN.test(userAgent)) return true;
  return /whatsapp/i.test(userAgent) && !/(applewebkit|chrome|crios|safari)/i.test(userAgent);
}

async function recordPageview(secret, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_kidz_pageview_public`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_secret: secret,
      p_event_key: EVENT_KEY,
      p_page_key: PAGE_KEY,
      p_berater_slug: payload.beraterSlug,
      p_source: payload.source,
      p_rate_key: payload.rateKey,
    }),
  });

  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) {
    const message = String(result?.message || '');
    const error = new Error(message || `Supabase Seitenaufruf: ${response.status}`);
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
  if (isPreviewBot(req)) return send(res, 204);

  const registrationSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET || '';
  if (!registrationSecret) return send(res, 503, { ok: false, reason: 'not_configured' });

  const body = readBody(req);
  const requestedSource = String(body.source || '').trim().toLowerCase();
  const source = ALLOWED_SOURCES.has(requestedSource) ? requestedSource : 'direkt';
  const requestedAdvisorSlug = String(body.beraterSlug || '').trim().toLowerCase().slice(0, 80);
  const beraterSlug = requestedAdvisorSlug || DEFAULT_ADVISOR_SLUG;
  if (!SLUG_PATTERN.test(beraterSlug)) return send(res, 400, { ok: false, reason: 'invalid_input' });

  try {
    const result = await recordPageview(registrationSecret, {
      source,
      beraterSlug,
      rateKey: hmac(registrationSecret, `ip:${requestIp(req)}`),
    });
    if (result?.reason === 'invalid_advisor' || result?.reason === 'invalid_event') {
      return send(res, 400, { ok: false, reason: result.reason });
    }
    if (!result?.ok) throw new Error('Unvollstaendige Zaehlerantwort');
    return send(res, 201, { ok: true });
  } catch (error) {
    console.error('[kidz-pageview]', error.message);
    return send(res, error.statusCode || 502, {
      ok: false,
      reason: error.statusCode === 429 ? 'rate_limited' : 'tracking_failed',
    });
  }
};

module.exports._test = { isPreviewBot, sameOrigin };
