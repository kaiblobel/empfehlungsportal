import { HOST, STEUERUNG, ZUGANG, portalPfad } from './profil.mjs';
import { aendere, leseStand, ist, gueltig, signiere, pruefeHuelle, neuerToken, zugangAktiv, schirm } from './kern.mjs';
const ablehnen = (status = 403) => new Response('Nicht verfügbar.', { status, headers: { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' } });
export async function behandle(request, { aktiv, key, speicher, host = HOST, jetzt = () => Math.floor(Date.now()/1000), next }) {
  const url = new URL(request.url), p = url.pathname;
  if (p.startsWith('/lib/betrieb/') || ['/middleware.ts', '/package.json', '/package-lock.json'].includes(p)) return ablehnen();
  const steuerung = p === STEUERUNG, zugang = p === ZUGANG;
  // Rollout bleibt inert, bis Installation UND Gegenprobe freigegeben sind.
  if (!aktiv) return steuerung || zugang ? ablehnen(404) : next();
  if (steuerung || zugang) {
    if (request.method !== 'POST' || url.host !== host || url.search) return ablehnen();
    try {
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 16000) return ablehnen();
      let d;
      if (zugang) {
        if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return ablehnen();
        const form = new URLSearchParams(raw), beleg = form.get('beleg');
        if (form.getAll('beleg').length !== 1 || form.getAll('signatur').length !== 1 || !/^[A-Za-z0-9_-]{16,2000}$/.test(beleg || '') || !gueltig(key, 'zugang', beleg, form.get('signatur'))) return ablehnen();
        d = JSON.parse(Buffer.from(beleg, 'base64url').toString('utf8'));
      } else {
        if (!request.headers.get('content-type')?.startsWith('application/json') || !gueltig(key, 'befehl', raw, request.headers.get('x-kai-signatur'))) return ablehnen();
        d = JSON.parse(raw);
      }
      const typ = zugang ? 'zugang' : d.typ;
      if (!['zugang', 'schalten', 'status', 'zugang_beenden', 'notfall_setzen', 'notfall_aufheben'].includes(typ) || (!zugang && typ === 'zugang') || !pruefeHuelle(d, typ, jetzt(), url.host, host)) return ablehnen();
      const token = zugang ? neuerToken() : undefined;
      const ergebnis = await speicher(store => aendere(store, d, jetzt(), token));
      if (zugang) return new Response(null, { status: 303, headers: {
        location: '/hub.html', 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer',
        'set-cookie': `__Host-kai_betrieb=${token}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`,
      } });
      const antwort = JSON.stringify(ergebnis);
      return new Response(antwort, { headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store', 'x-kai-signatur': signiere(key, 'antwort', antwort) } });
    } catch { return ablehnen(); }
  }
  // Das Profil gilt auf ALLEN Domain-Aliasen. Kundenseiten bleiben frei.
  if (!portalPfad(p)) return next();
  try {
    return await speicher(async store => {
      const s = leseStand(await store.read()), stand = ist(s, jetzt());
      if (stand.gesperrt && !zugangAktiv(s, request.headers.get('cookie'), jetzt())) return schirm(s, request.method);
      return next({ headers: { 'cache-control': 'private, no-store', 'x-kai-betrieb': stand.betriebszustand ?? 'online' } });
    });
  } catch { return schirm(null, request.method, true); }
}
