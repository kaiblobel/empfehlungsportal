/** Öffentliche Laufzeit-Konfiguration für das KIDZ-Sommerfest-Gewinnspiel. */

/**
 * Der Umfang des XXL-Balls wird erst am Veranstaltungstag gemessen. Wer vorher
 * schätzt, hat den Ball nie gesehen. Das Schätzfeld ist deshalb bis zum
 * 6. September 2026 zu und öffnet erst an diesem Tag.
 */
const GUESS_OPENS_AT = Date.parse('2026-09-06T00:00:00+02:00');
const GUESS_CLOSES_AT = Date.parse('2026-09-07T00:00:00+02:00');

function guessOpen(now = Date.now()) {
  return now >= GUESS_OPENS_AT && now < GUESS_CLOSES_AT;
}

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
    guessOpen: guessOpen(),
  }));
};

module.exports.guessOpen = guessOpen;
module.exports.GUESS_OPENS_AT = GUESS_OPENS_AT;
module.exports.GUESS_CLOSES_AT = GUESS_CLOSES_AT;
