import { createHmac, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { ANWENDUNG, HOST, FREI, STANDARD } from './profil.mjs';

export const signiere = (key, zweck, daten) => {
  if (!/^[0-9a-f]{64}$/.test(key || '')) throw new Error('schluessel');
  return createHmac('sha256', Buffer.from(key, 'hex')).update(`${zweck}.${daten}`).digest('base64url');
};
export function gueltig(key, zweck, daten, signatur) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(signatur || '')) return false;
  try { return timingSafeEqual(Buffer.from(signatur), Buffer.from(signiere(key, zweck, daten))); }
  catch { return false; }
}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const leer = () => ({ schema: 1, soll: null, notfall: false, nonces: {}, zugaenge: {} });
const objekt = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const ganz = x => Number.isSafeInteger(x) && x >= 0;
const WIRKUNG = {
  online: [200, false, false], wartung: [503, true, false],
  stoerung: [503, true, false], intern: [403, true, true], 'coming-soon': [200, true, true],
};
export function sollGueltig(s) {
  if (!objekt(s) || !ganz(s.version) || s.version < 1 || !Object.hasOwn(WIRKUNG, s.betriebszustand)) return false;
  const w = s.wirkung, regel = WIRKUNG[s.betriebszustand];
  if (!objekt(w) || w.http !== regel[0] || w.sperrt !== regel[1] || w.noindex !== regel[2] || !ganz(w.retry_after) || w.retry_after > 86400) return false;
  if (s.betriebszustand === 'wartung' ? w.retry_after < 60 : w.retry_after !== (s.betriebszustand === 'stoerung' ? 600 : 0)) return false;
  if (!objekt(s.texte)) return false;
  for (const [name, max] of Object.entries({ ueberschrift: 120, beschreibung: 900, zusatz: 450 })) {
    const t = s.texte[name];
    if (typeof t !== 'string' || Array.from(t).length > max) return false;
    if ((name === 'beschreibung' ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(t)) return false;
  }
  return s.wieder_da === null || (typeof s.wieder_da === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s.wieder_da) && Number.isFinite(Date.parse(s.wieder_da)));
}
export function leseStand(raw) {
  if (typeof raw !== 'string' || raw.length > 300000) throw new Error('ablage');
  const s = JSON.parse(raw);
  if (!objekt(s) || s.schema !== 1 || !(s.soll === null || sollGueltig(s.soll)) || typeof s.notfall !== 'boolean') throw new Error('ablage');
  for (const [name, muster, max] of [['nonces', /^[0-9a-f]{32}$/, 2048], ['zugaenge', /^[0-9a-f]{64}$/, 64]]) {
    if (!objekt(s[name]) || Object.keys(s[name]).length > max || !Object.entries(s[name]).every(([k,v]) => muster.test(k) && ganz(v))) throw new Error('ablage');
  }
  return s;
}
export function ist(s, jetzt) {
  return { protokoll: 1, betriebszustand: s.notfall ? 'wartung' : s.soll?.betriebszustand ?? null,
    version: s.soll?.version ?? 0, zustand_lesbar: true, gesperrt: s.notfall || !!s.soll?.wirkung.sperrt,
    notfall: s.notfall, altschalter_v1: false, zugaenge_aktiv: Object.values(s.zugaenge).filter(exp => exp > jetzt).length,
    rechte_ok: true, freie_pfade: [...FREI, '/kidz/*', '/baufinanzierung/*', '/empfehlung/*', '/api/*'] };
}
export function pruefeHuelle(d, typ, jetzt, host, erwartet = HOST) {
  return objekt(d) && d.v === 1 && d.typ === typ && host === erwartet && d.host === erwartet && d.anwendung === ANWENDUNG &&
    ganz(d.iat) && ganz(d.exp) && d.iat <= jetzt + 5 && d.iat >= jetzt - 300 && d.exp > jetzt &&
    d.exp > d.iat && d.exp - d.iat <= (typ === 'zugang' ? 60 : 120) && /^[0-9a-f]{32}$/.test(d.nonce);
}
export function schritt(s, d, jetzt, token) {
  s = structuredClone(s);
  for (const name of ['nonces', 'zugaenge']) for (const [k,v] of Object.entries(s[name])) if (v <= jetzt) delete s[name][k];
  if (Object.hasOwn(s.nonces, d.nonce)) throw new Error('wiederholt');
  if (Object.keys(s.nonces).length >= 2048) throw new Error('ausgelastet');
  s.nonces[d.nonce] = d.exp + 300;
  const ergebnis = { ok: true };
  if (d.typ === 'schalten') {
    if (!sollGueltig(d)) throw new Error('soll');
    const soll = { version: d.version, betriebszustand: d.betriebszustand, wirkung: d.wirkung, texte: d.texte, wieder_da: d.wieder_da };
    const alt = s.soll?.version ?? 0;
    if (soll.version < alt) throw new Error('version');
    if (soll.version === alt && JSON.stringify(s.soll) !== JSON.stringify(soll)) throw new Error('versionskonflikt');
    ergebnis.wiederholung = soll.version === alt;
    s.soll = soll;
    if (!soll.wirkung.sperrt) s.zugaenge = {};
  } else if (d.typ === 'notfall_setzen') s.notfall = true;
  else if (d.typ === 'notfall_aufheben') s.notfall = false;
  else if (d.typ === 'zugang_beenden') { ergebnis.beendet = Object.keys(s.zugaenge).length; s.zugaenge = {}; }
  else if (d.typ === 'zugang') {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(d.advisor) || d.ziel !== '/hub.html' || Object.keys(s.zugaenge).length >= 64 || !token) throw new Error('zugang');
    s.zugaenge[tokenHash(token)] = jetzt + 28800;
  } else if (d.typ !== 'status') throw new Error('typ');
  return { stand: s, ergebnis: { ...ergebnis, ist: ist(s, jetzt), anfrage: d.nonce, zeit: new Date(jetzt * 1000).toISOString().replace('.000Z', 'Z') } };
}
// Liefert { stand, ergebnis }: den geschriebenen Stand fuer die Anzeige, das Ergebnis fuer KAI.
export async function aendere(store, d, jetzt, token) {
  for (let i = 0; i < 12; i++) {
    const raw = await store.read();
    const r = schritt(leseStand(raw), d, jetzt, token);
    if (await store.cas(raw, JSON.stringify(r.stand))) return r;
  }
  throw new Error('konflikt');
}
export const neuerToken = () => randomBytes(32).toString('hex');
export function zugangAktiv(s, cookie, jetzt) {
  const tokens = (cookie || '').split(';').map(x => x.trim()).filter(x => x.startsWith('__Host-kai_betrieb='));
  if (tokens.length !== 1) return false;
  const token = tokens[0].slice('__Host-kai_betrieb='.length);
  return /^[0-9a-f]{64}$/.test(token) && (s.zugaenge[tokenHash(token)] ?? 0) > jetzt;
}
const escape = t => t.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export function schirm(s, method = 'GET', defekt = false) {
  const n = s?.notfall || defekt || !s;
  const w = n ? { http: 503, retry_after: 600, noindex: false } : s.soll.wirkung;
  const zustand = n ? (defekt ? 'stoerung' : 'wartung') : s.soll.betriebszustand;
  const texte = n ? STANDARD : s.soll.texte;
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store, max-age=0',
    'x-kai-betrieb': zustand, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
  if (defekt) headers['x-kai-betrieb-fehler'] = 'laufzeit';
  if (w.retry_after) headers['retry-after'] = String(w.retry_after);
  if (w.noindex) headers['x-robots-tag'] = 'noindex, nofollow';
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Empfehlungsportal</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbfcfc;color:#13191d;font:16px/1.6 system-ui}main{max-width:460px;margin:24px;padding:32px;background:white;border:1px solid #e3e7e9}h1{font-size:25px;line-height:1.3}p{white-space:pre-line}a{color:#00587c}footer{margin-top:28px;font-size:13px}</style><main><small>EMPFEHLUNGSPORTAL · PARTNERBEREICH</small><h1>${escape(texte.ueberschrift || STANDARD.ueberschrift)}</h1><p>${escape(texte.beschreibung)}</p><p>${escape(texte.zusatz)}</p><a href="https://www.dvag.de/kai.blobel/kontakt.html">Kontakt aufnehmen</a><footer><a href="https://www.dvag.de/kai.blobel/impressum.html">Impressum</a> · <a href="https://www.dvag.de/kai.blobel/datenschutz.html">Datenschutz</a></footer></main></html>`;
  return new Response(method === 'HEAD' ? null : html, { status: w.http, headers });
}
