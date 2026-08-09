/**
 * Gleichursprungs-Proxy zur Potenzialbuch-Route des Berater-Cockpits.
 *
 * Der Browser reicht nur seinen Portal-Zugriffstoken und eine kleine erlaubte
 * Aktionsliste weiter. Das Cockpit validiert den Token beim Portal, ermittelt
 * den Berater serverseitig und schreibt erst danach in seinen eigenen Datenraum.
 */

const PRODUKTION = 'https://www.beratercockpit.de/api/integrationen/potenzialbuch';
const AKTIONEN = new Set(['status', 'vorschau', 'verbinden']);
const MODI = new Set(['existing', 'new']);

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(payload));
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

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (!req.body) return {};
  try {
    return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
  } catch (_) {
    return {};
  }
}

function cleanBody(body) {
  const action = String(body.action || '');
  if (!AKTIONEN.has(action)) return null;
  const clean = { action };
  if (typeof body.potentialId === 'string') clean.potentialId = body.potentialId.slice(0, 80);
  if (MODI.has(body.mode)) clean.mode = body.mode;
  if (typeof body.clientId === 'string') clean.clientId = body.clientId.slice(0, 80);
  if (body.confirmNew === true) clean.confirmNew = true;
  return clean;
}

function targetUrl() {
  const configured = String(process.env.COCKPIT_POTENZIAL_API_URL || '').trim();
  if (configured) return configured;
  return process.env.VERCEL_ENV === 'production' ? PRODUKTION : '';
}

function targetBaseUrl(target) {
  try {
    const url = new URL(target);
    const lokal = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && lokal)) return '';
    return url.origin;
  } catch (_) {
    return '';
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, reason: 'method_not_allowed' });
  }
  if (!sameOrigin(req)) return send(res, 403, { ok: false, reason: 'origin_rejected' });

  const authorization = String(req.headers.authorization || '');
  if (!/^Bearer\s+[^\s]+$/i.test(authorization) || authorization.length > 8200) {
    return send(res, 401, { ok: false, reason: 'login_required' });
  }
  const body = cleanBody(readBody(req));
  if (!body) return send(res, 400, { ok: false, reason: 'invalid_action' });

  const target = targetUrl();
  if (!target) return send(res, 503, { ok: false, reason: 'bridge_not_configured' });
  const cockpitBaseUrl = targetBaseUrl(target);
  if (!cockpitBaseUrl) return send(res, 503, { ok: false, reason: 'bridge_not_configured' });

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : { ok: false }; } catch (_) {
      return send(res, 502, { ok: false, reason: 'invalid_cockpit_response' });
    }
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      payload.cockpitBaseUrl = cockpitBaseUrl;
    }
    return send(res, response.status, payload);
  } catch (error) {
    console.error('[cockpit-potenzial]', error?.message || 'Verbindung fehlgeschlagen');
    return send(res, 502, { ok: false, reason: 'cockpit_unreachable' });
  }
}

module.exports = handler;
module.exports._test = { cleanBody, sameOrigin, targetUrl, targetBaseUrl };
