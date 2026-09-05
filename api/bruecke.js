/**
 * Die Bruecken zu Kais anderen Anwendungen, in EINER Serverless-Funktion.
 *
 * Zwei Bruecken wohnen hier:
 *   ?dienst=potenzialbuch  ->  Berater-Cockpit, Potenzialbuch-Route (POST)
 *   ?dienst=waffel         ->  KAI., Waffelmenue-Auslieferung (GET)
 *
 * WARUM ZUSAMMEN, obwohl es zwei Sachen sind: Das Vercel-Konto laeuft auf dem
 * Hobby-Tarif, und der erlaubt 12 Serverless-Funktionen je Veroeffentlichung.
 * Das Portal hatte genau 12. Der Waffel-Vermittler waere die dreizehnte gewesen,
 * und die Veroeffentlichung ist daran gescheitert (05.09.2026) — der Bau selbst
 * war sauber, es kippte beim Ausliefern, ohne Meldung im Protokoll.
 *
 * Die beiden passen inhaltlich zusammen: beides sind Gleichursprungs-Vermittler,
 * die einen Portal-Token pruefen und dann mit einem Geheimnis nach aussen gehen,
 * das den Browser nie erreicht. Wer hier eine dritte Bruecke einhaengt, gewinnt
 * keine Funktion dazu, sondern spart eine.
 *
 * DIE ADRESSEN BLEIBEN, WIE SIE WAREN. `/api/cockpit-potenzial` und
 * `/api/waffel-config` zeigen ueber zwei Umleitungen in vercel.json hierher. Das
 * ist kein Schoenheitsfehler, sondern Absicht: Das Portal ist eine PWA, und in
 * den Browsern der Berater liegen aeltere Fassungen von `js/potenziale-cockpit.mjs`
 * im Zwischenspeicher. Wuerde die alte Adresse verschwinden, faende genau deren
 * Potenzialbuch nichts mehr.
 */

/* ------------------------------------------------------------ gemeinsam --- */

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === String(req.headers.host || '').toLowerCase();
  } catch (_) {
    return false;
  }
}

/**
 * Welcher Dienst ist gemeint? Kommt aus der Umleitung in vercel.json.
 *
 * Der Rueckfall ueber den Pfad greift, falls eine Umleitung einmal nicht zieht
 * (oder jemand die Funktion direkt unter ihrer eigenen Adresse aufruft).
 */
function dienstAus(req) {
  const ausQuery = req.query && typeof req.query.dienst === 'string' ? req.query.dienst : '';
  if (ausQuery) return ausQuery;
  try {
    const url = new URL(String(req.url || ''), 'http://platzhalter.invalid');
    const p = url.searchParams.get('dienst');
    if (p) return p;
    if (url.pathname.includes('cockpit-potenzial')) return 'potenzialbuch';
    if (url.pathname.includes('waffel-config')) return 'waffel';
  } catch (_) { /* faellt unten auf leer */ }
  return '';
}

/* ------------------------------------------- Bruecke 1: Potenzialbuch --- */
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

async function potenzialbuch(req, res) {
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

/* ------------------------------------------------ Bruecke 2: Waffelmenue --- */
/**
 * Gleichursprungs-Vermittler fuer das Waffelmenue des Beraterbereichs.
 *
 * Der Browser reicht NUR seinen Portal-Zugriffstoken weiter. Der Vermittler
 * prueft den Token gegen die Portal-Supabase (wer bist du?), ermittelt dabei das
 * Admin-Kennzeichen und die oeffentliche Kennung, und holt dann das fertige
 * Portal-Profil des Waffelmenues von der abgesicherten KAI.-Route (Tor-Wort
 * nur hier in der Vercel-Umgebung, nie im Browser).
 *
 * Fail-closed an jeder Kante: fehlende Konfiguration, ungueltiger Token oder
 * ein Fehler der KAI.-Route ergeben ein leeres Menue — nie eine eigene Liste,
 * nie ein Katalog-Rueckfall. Die Freigabe ist reine Sichtbarkeit; jede
 * Zielanwendung prueft weiterhin selbst Anmeldung und Berechtigung.
 */

const ZEITGRENZE_MS = 12000;

function sendWaffel(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.end(JSON.stringify(payload));
}

function bearerToken(req) {
  const roh = String(req.headers.authorization || '');
  const m = roh.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

async function mitZeitgrenze(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ZEITGRENZE_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waffel(req, res) {
  if (req.method !== 'GET') return sendWaffel(res, 405, { eintraege: [], istAdmin: false });
  if (!sameOrigin(req)) return sendWaffel(res, 403, { eintraege: [], istAdmin: false });

  const token = bearerToken(req);
  if (!token) return sendWaffel(res, 401, { eintraege: [], istAdmin: false });

  const portalUrl = String(process.env.SUPABASE_URL || 'https://kkseqhmfubzfyloffkwe.supabase.co');
  const anonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
  // Dieselben Namen wie in Cockpit und Umsatz-Navi: derselbe Name traegt in
  // allen vier Projekten denselben Wert. Wer einmal rotiert, sucht dann nicht
  // in jedem Projekt nach einer anderen Schreibweise.
  const kaiBasis = String(process.env.WAFFEL_MENUE_URL || '').trim();
  const kaiSecret = String(process.env.WAFFEL_MENUE_SECRET || '').trim();
  // Ohne vollstaendige Konfiguration bleibt das Menue leer — kein Rueckfall.
  if (!anonKey || !kaiBasis || !kaiSecret || kaiSecret.length < 32) {
    return sendWaffel(res, 200, { eintraege: [], istAdmin: false });
  }

  try {
    // 1) Wer ruft an? Der Token muss zu einem echten Portal-Nutzer gehoeren.
    const nutzer = await mitZeitgrenze(`${portalUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${token}` },
    });
    if (!nutzer.ok) return sendWaffel(res, 401, { eintraege: [], istAdmin: false });
    const konto = await nutzer.json();
    const userId = String((konto && konto.id) || '');
    if (!userId) return sendWaffel(res, 401, { eintraege: [], istAdmin: false });

    // 2) Admin-Kennzeichen UND oeffentliche Kennung aus der eigenen
    // Berater-Zeile (RLS: eigene Zeile). Beides steuert nur die Ausgabe des
    // Menues, nie einen Zugriff.
    let istAdmin = false;
    let slug = '';
    try {
      const zeile = await mitZeitgrenze(
        `${portalUrl}/rest/v1/berater?select=ist_admin,slug&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`,
        { headers: { apikey: anonKey, authorization: `Bearer ${token}` } },
      );
      if (zeile.ok) {
        const liste = await zeile.json();
        const eigene = Array.isArray(liste) && liste[0] ? liste[0] : null;
        istAdmin = eigene ? eigene.ist_admin === true : false;
        // Nur das Format, das eine Kennung haben darf. Alles andere wird
        // verworfen, damit nichts Fremdes in eine ausgelieferte Adresse
        // geraet. Dieselbe Pruefung steht auf der KAI.-Seite noch einmal.
        const roh = eigene && typeof eigene.slug === 'string' ? eigene.slug.trim().toLowerCase() : '';
        slug = /^[a-z0-9-]{1,64}$/.test(roh) ? roh : '';
      }
    } catch (_) {
      istAdmin = false;
      slug = '';
    }

    // Die Verwaltungsadresse bildet der Server aus der eingerichteten
    // Verbindung. Sonst stuende eine feste fremde Adresse im Browsercode und
    // zeigte nach einem Umzug von KAI. still ins Leere. Nur Admins bekommen
    // sie; fuer alle anderen waere der Weg dorthin eine Sackgasse.
    const verwaltenUrl = istAdmin ? `${kaiBasis.replace(/\/$/, '')}/waffel` : '';

    // 3) Das fertige Portal-Profil von KAI. holen. Das Tor-Wort bleibt hier.
    //
    // Wer fragt, wird mitgeschickt: die Kennung dreht persoenliche Adressen
    // auf den angemeldeten Berater (sonst verteilt ein Partner Links, die
    // Kais Interessenten erzeugen), das Inhaber-Kennzeichen entscheidet, ob
    // auch die fest zugeschnittenen Eintraege dabei sind. Ohne beides gaelte
    // Kai auf seinem eigenen Portal als Fremder und saehe fast nichts.
    //
    // Die Portal-Kennung ist dieselbe wie die Karriere-Kennung im Cockpit
    // (geprueft am 05.09.2026 fuer alle sieben Berater). Wer das aendert,
    // trennt beide Welten und muss hier eine Uebersetzung einziehen.
    const ziel = new URL(`${kaiBasis.replace(/\/$/, '')}/api/waffel/empfehlungsportal`);
    if (slug) ziel.searchParams.set('b', slug);
    if (istAdmin) ziel.searchParams.set('inhaber', '1');
    const antwort = await mitZeitgrenze(
      ziel.toString(),
      { headers: { authorization: `Bearer ${kaiSecret}` } },
    );
    if (!antwort.ok) return sendWaffel(res, 200, { eintraege: [], istAdmin, verwaltenUrl });
    const daten = await antwort.json();
    const roh = daten && Array.isArray(daten.eintraege) ? daten.eintraege : [];

    // Doppelter Boden: nur saubere Eintraege mit erlaubtem Ziel durchreichen.
    const eintraege = [];
    for (const e of roh) {
      if (!e || typeof e !== 'object') continue;
      const key = typeof e.key === 'string' ? e.key : '';
      const name = typeof e.name === 'string' ? e.name : '';
      const url = typeof e.url === 'string' ? e.url : '';
      if (!key || !name || !/^https?:\/\//i.test(url)) continue;
      eintraege.push({
        key,
        name,
        zweck: typeof e.zweck === 'string' ? e.zweck : '',
        url,
        symbol: typeof e.symbol === 'string' && e.symbol ? e.symbol : 'Circle',
      });
    }
    return sendWaffel(res, 200, { eintraege, istAdmin, verwaltenUrl });
  } catch (_) {
    return sendWaffel(res, 200, { eintraege: [], istAdmin: false });
  }
}

/* ----------------------------------------------------------- Verteiler --- */

module.exports = async function handler(req, res) {
  const dienst = dienstAus(req);
  if (dienst === 'potenzialbuch') return potenzialbuch(req, res);
  if (dienst === 'waffel') return waffel(req, res);
  // Ein Aufruf ohne erkennbaren Dienst ist ein Fehler in der Umleitung, kein
  // Grund, irgendetwas zu erraten.
  res.statusCode = 404;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify({ ok: false, reason: 'unbekannte_bruecke' }));
};

// Die beiden Bruecken einzeln, damit die vorhandenen Tests sie direkt aufrufen
// koennen, ohne den Umweg ueber die Umleitung nachzubauen.
module.exports.potenzialbuch = potenzialbuch;
module.exports.waffel = waffel;
module.exports._test = { cleanBody, sameOrigin, targetUrl, targetBaseUrl, dienstAus };
