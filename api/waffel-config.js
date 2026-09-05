/**
 * Gleichursprungs-Proxy fuer das Waffelmenue des Beraterbereichs.
 *
 * Der Browser reicht NUR seinen Portal-Zugriffstoken weiter. Der Proxy prueft
 * den Token gegen die Portal-Supabase (wer bist du?), ermittelt dabei das
 * Admin-Kennzeichen fuer den Verwalten-Einstieg und holt dann das fertige
 * Portal-Profil des Waffelmenues von der abgesicherten KAI.-Route (Tor-Wort
 * nur hier in der Vercel-Umgebung, nie im Browser).
 *
 * Fail-closed an jeder Kante: fehlende Konfiguration, ungueltiger Token oder
 * ein Fehler der KAI.-Route ergeben ein leeres Menue — nie eine eigene Liste,
 * nie ein Katalog-Rueckfall. Die Freigabe ist reine Sichtbarkeit; jede
 * Zielanwendung prueft weiterhin selbst Anmeldung und Berechtigung.
 */

const ZEITGRENZE_MS = 12000;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
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

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { eintraege: [], istAdmin: false });
  if (!sameOrigin(req)) return send(res, 403, { eintraege: [], istAdmin: false });

  const token = bearerToken(req);
  if (!token) return send(res, 401, { eintraege: [], istAdmin: false });

  const portalUrl = String(process.env.SUPABASE_URL || 'https://kkseqhmfubzfyloffkwe.supabase.co');
  const anonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
  // Dieselben Namen wie in Cockpit und Umsatz-Navi: derselbe Name traegt in
  // allen vier Projekten denselben Wert. Wer einmal rotiert, sucht dann nicht
  // in jedem Projekt nach einer anderen Schreibweise.
  const kaiBasis = String(process.env.WAFFEL_MENUE_URL || '').trim();
  const kaiSecret = String(process.env.WAFFEL_MENUE_SECRET || '').trim();
  // Ohne vollstaendige Konfiguration bleibt das Menue leer — kein Rueckfall.
  if (!anonKey || !kaiBasis || !kaiSecret || kaiSecret.length < 32) {
    return send(res, 200, { eintraege: [], istAdmin: false });
  }

  try {
    // 1) Wer ruft an? Der Token muss zu einem echten Portal-Nutzer gehoeren.
    const nutzer = await mitZeitgrenze(`${portalUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${token}` },
    });
    if (!nutzer.ok) return send(res, 401, { eintraege: [], istAdmin: false });
    const konto = await nutzer.json();
    const userId = String((konto && konto.id) || '');
    if (!userId) return send(res, 401, { eintraege: [], istAdmin: false });

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
    if (!antwort.ok) return send(res, 200, { eintraege: [], istAdmin, verwaltenUrl });
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
    return send(res, 200, { eintraege, istAdmin, verwaltenUrl });
  } catch (_) {
    return send(res, 200, { eintraege: [], istAdmin: false });
  }
};
