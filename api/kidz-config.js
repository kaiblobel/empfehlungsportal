/** Öffentliche Laufzeit-Konfiguration für das KIDZ-Sommerfest-Gewinnspiel. */

/**
 * Zwei Felder der Anmeldung gehören zum Veranstaltungstag und sind vorher zu:
 *
 * - Das Schätzfeld, weil der Umfang des XXL-Balls erst dort gemessen wird. Wer
 *   vorher schätzt, hat den Ball nie gesehen.
 * - Das Elternabend-Häkchen, weil bis zum Fest zum Sommerfest eingeladen wird
 *   und sonst nirgends vom Elternabend die Rede ist. Ein Häkchen für etwas, das
 *   auf der Seite nicht vorkommt, wirkt untergeschoben. Am 6. September wird der
 *   Elternabend vor Ort vorgestellt, dann hat es seinen Zusammenhang.
 */
const EVENT_DAY_STARTS_AT = Date.parse('2026-09-06T00:00:00+02:00');
const EVENT_DAY_ENDS_AT = Date.parse('2026-09-07T00:00:00+02:00');

function eventDay(now = Date.now()) {
  return now >= EVENT_DAY_STARTS_AT && now < EVENT_DAY_ENDS_AT;
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
    eventDay: eventDay(),
    // Alter Name, damit ein Browser mit zwischengespeichertem Skript nichts falsch macht.
    guessOpen: eventDay(),
  }));
};

module.exports.eventDay = eventDay;
module.exports.EVENT_DAY_STARTS_AT = EVENT_DAY_STARTS_AT;
module.exports.EVENT_DAY_ENDS_AT = EVENT_DAY_ENDS_AT;
