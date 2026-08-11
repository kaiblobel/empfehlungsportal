/** Öffentliche Laufzeit-Konfiguration für das KIDZ-Sommerfest-Gewinnspiel. */
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }

  const turnstileSiteKey = String(process.env.TURNSTILE_SITE_KEY || '').trim();
  res.statusCode = turnstileSiteKey ? 200 : 503;
  return res.end(JSON.stringify({
    ok: Boolean(turnstileSiteKey),
    turnstileSiteKey,
  }));
};
