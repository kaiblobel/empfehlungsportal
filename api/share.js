/**
 * Vercel Serverless Function (CommonJS, kein Build/Deps).
 *
 * Liefert die Empfänger-Seite (empfaenger.html) aus, aber mit pro-Berater
 * korrekten Social-Preview-Meta-Tags (og:image = Berater-Foto, og:description
 * mit Berater-Name). Nötig, weil WhatsApp/Co. die Vorschau aus dem statischen
 * HTML-Kopf lesen und KEIN JavaScript ausführen — das clientseitige Branding
 * (berater-brand.js) erreicht den Crawler also nie.
 *
 * Aufruf über Rewrite: /e?token=…  ->  /api/share
 * Bei fehlendem Token / Lookup-Fehler bleibt der statische Default (Kai) stehen.
 */
const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])
  );
}

async function rpc(name, body) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  } catch (_) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0];
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const base = `${proto}://${host}`;
  const requestUrl = new URL(req.url || '/', base);
  const token = requestUrl.searchParams.get('token') || '';

  // Statisches HTML der Empfänger-Seite holen (nicht rewritten -> keine Rekursion).
  let html;
  try {
    const hr = await fetch(`${base}/empfaenger.html`);
    html = await hr.text();
  } catch (_) {
    // Fallback: direkt auf die statische Seite leiten
    res.statusCode = 302;
    res.setHeader('Location', `/empfaenger.html${requestUrl.search}`);
    return res.end();
  }

  // Berater dieser Empfehlung ermitteln
  let berater = null;
  if (token) {
    const emp = await rpc('get_empfehlung_public', { p_token: token });
    if (emp && emp.berater_id) {
      berater = await rpc('get_berater_public_by_id', { p_id: emp.berater_id });
    }
  }

  if (berater && berater.name) {
    const name = esc(berater.name);
    let img = berater.foto_url || '';
    if (img && !/^https?:\/\//i.test(img)) img = base + (img.charAt(0) === '/' ? '' : '/') + img;
    if (!img) img = `${base}/assets/images/og-cover.png`;
    img = esc(img);
    const desc = `Eine kurze Nachricht von ${name}.`;

    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>Eine persönliche Empfehlung · ${name}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1Eine persönliche Empfehlung von ${name}.$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
      .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${img}$2`)
      .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${img}$2`);
    // og:title ("Jemand hat dich empfohlen.") bleibt neutral und passt für alle.
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  return res.end(html);
};
