import { HOST, STEUERUNG, ZUGANG, portalPfad } from './profil.mjs';
import { aendere, leseStand, ist, gueltig, signiere, pruefeHuelle, neuerToken, zugangAktiv, schirm } from './kern.mjs';

// Anzeige der Partnerseiten (ADR-0063, Entscheidung Kai 15.09.2026).
// Der Zustand wird je Instanz kurz vorgehalten, damit nicht jeder Seitenaufruf den Speicher liest.
// Eine Schaltung wirkt in der schaltenden Instanz sofort, in allen anderen spaetestens nach ANZEIGE_MS.
// Faellt der Speicher aus, gilt der letzte bekannte Zustand weiter; ist keiner bekannt, bleibt der
// Partnerbereich offen. Die Wartung ist eine Ansage an die Partner, der Datenschutz liegt in den
// Supabase-Rechten. Beide Stoerungsfaelle tragen x-kai-betrieb-fehler: laufzeit fuer den Waechter.
export const ANZEIGE_MS = 5000;
// Ein Zugangs-Cookie, den der vorgehaltene Stand noch nicht kennt, loest eine frische Lesung aus.
// Hoechstens eine je Sekunde je Instanz, damit erfundene Cookies den Speicher nicht fluten.
export const ERZWUNGEN_MS = 1000;
export const neueAnzeige = () => ({ stand: null, zeitMs: 0, erzwungenMs: -Infinity });
const ANZEIGE = neueAnzeige();
const FEHLER = { 'x-kai-betrieb-fehler': 'laufzeit' };

const ablehnen = (status = 403) => new Response('Nicht verfügbar.', { status, headers: { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' } });
const hatZugangsCookie = cookie => /(?:^|;)\s*__Host-kai_betrieb=[0-9a-f]{64}\s*(?:;|$)/.test(cookie || '');
const merke = (anzeige, stand, zeitMs) => { anzeige.stand = stand; anzeige.zeitMs = zeitMs; };
const mitKoepfen = (response, koepfe) => { for (const [k, v] of Object.entries(koepfe)) response.headers.set(k, v); return response; };

export async function behandle(request, { aktiv, key, speicher, notfall = false, host = HOST, jetzt = () => Math.floor(Date.now()/1000), uhrMs = () => Date.now(), anzeige = ANZEIGE, next }) {
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
      const r = await speicher(store => aendere(store, d, jetzt(), token));
      merke(anzeige, r.stand, uhrMs());
      if (zugang) return new Response(null, { status: 303, headers: {
        location: '/hub.html', 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer',
        'set-cookie': `__Host-kai_betrieb=${token}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`,
      } });
      // Notfallweg 2 wirkt unabhaengig vom Speicher; KAI. soll ihn im signierten Ist als Notschalter sehen.
      if (notfall) r.ergebnis.ist = { ...r.ergebnis.ist, betriebszustand: 'wartung', gesperrt: true, notfall: true };
      const antwort = JSON.stringify(r.ergebnis);
      return new Response(antwort, { headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store', 'x-kai-signatur': signiere(key, 'antwort', antwort) } });
    } catch { return ablehnen(); }
  }
  // Das Profil gilt auf ALLEN Domain-Aliasen. Kundenseiten bleiben frei und lesen nie den Speicher.
  if (!portalPfad(p)) return next();
  // Notfallweg 2: sofort sperren, ohne Speicher zu lesen und ohne Zugang zu pruefen.
  if (notfall) return schirm({ notfall: true, soll: null }, request.method);

  const cookie = request.headers.get('cookie');
  let gestoert = false;
  const frisch = async () => {
    try {
      const neu = await speicher(async store => leseStand(await store.read()));
      merke(anzeige, neu, uhrMs());
      return neu;
    } catch {
      gestoert = true;
      return anzeige.stand;
    }
  };
  const ausAnzeige = anzeige.stand !== null && uhrMs() - anzeige.zeitMs < ANZEIGE_MS;
  let s = ausAnzeige ? anzeige.stand : await frisch();
  if (ausAnzeige && ist(s, jetzt()).gesperrt && hatZugangsCookie(cookie) && !zugangAktiv(s, cookie, jetzt())
      && uhrMs() - anzeige.erzwungenMs >= ERZWUNGEN_MS) {
    anzeige.erzwungenMs = uhrMs();
    s = await frisch();
  }
  const koepfe = gestoert ? FEHLER : {};
  if (!s) return next({ headers: { 'cache-control': 'private, no-store', ...FEHLER } });
  const stand = ist(s, jetzt());
  if (stand.gesperrt && !zugangAktiv(s, cookie, jetzt())) return mitKoepfen(schirm(s, request.method), koepfe);
  return next({ headers: { 'cache-control': 'private, no-store', 'x-kai-betrieb': stand.betriebszustand ?? 'online', ...koepfe } });
}
