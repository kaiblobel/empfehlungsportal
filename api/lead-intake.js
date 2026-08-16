/**
 * Nimmt Leads aus den Funnel-Seiten entgegen (Depot-Check,
 * Altersvorsorgedepot-Check, Restschuldcheck und so weiter) und legt sie
 * im Portal ab. Damit existiert ein Interessent nicht mehr nur als Mail
 * in einem Postfach.
 *
 * Warum hier und nicht im Cockpit: North-Star Paragraph 3 legt das
 * Empfehlungsportal als Heimat aller Leads fest (Entscheidung 2026-08-16).
 * Das Portal ist mehrbenutzerfähig, jeder Partner sieht seine eigenen.
 *
 * Der aufrufende Funnel schickt ein gemeinsames Geheimnis im Kopf mit
 * (X-Lead-Secret). Ohne dieses Geheimnis nimmt der Endpunkt nichts an,
 * sonst könnte jeder das Portal mit erfundenen Leads füllen.
 *
 * WICHTIG für den Aufrufer: Diese Antwort muss ausgewertet werden. Ein
 * Lead, der hier still verlorengeht, ist schlimmer als einer, der nur
 * per Mail ankommt. Antwortformat: {"ok":true,"id":"..."} bei Erfolg,
 * sonst {"ok":false,"grund":"..."}.
 */
const crypto = require('node:crypto');

const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';

// Nur bekannte Funnels dürfen schreiben. Eine unbekannte Quelle ist eher
// ein Tippfehler oder ein fremder Aufruf als ein neuer Funnel; wer einen
// neuen anschließt, trägt ihn hier ein.
const QUELLEN = new Set([
  'av-depot-check',
  'depot-check',
  'restschuldcheck',
  'vermoegensstrategie-check',
  'finanzcheck',
  'reform2027',
]);

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (!req.body) return {};
  try {
    return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
  } catch (_) {
    return {};
  }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function text(value, maxLength) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, maxLength) || null;
}

function email(value) {
  const wert = text(value, 180);
  if (!wert) return null;
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(wert) ? wert.toLowerCase() : null;
}

/** Deutsche Schreibweisen zu einer Nummer, mit der man wählen kann. */
function telefon(value) {
  const roh = String(value == null ? '' : value).replace(/[^\d+]/g, '');
  if (!roh) return null;
  let nummer = roh;
  if (nummer.startsWith('00')) nummer = '+' + nummer.slice(2);
  else if (nummer.startsWith('0')) nummer = '+49' + nummer.slice(1);
  else if (!nummer.startsWith('+')) nummer = '+49' + nummer;
  // Zu kurz ist keine Nummer, sondern ein Tippfehler.
  return nummer.replace(/(?!^)\+/g, '').length >= 8 ? nummer : null;
}

async function legeLeadAn(daten) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_lead_public`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_name: daten.name,
      p_email: daten.email,
      p_telefon: daten.telefon,
      p_quelle: daten.quelle,
      p_nachricht: daten.nachricht,
      p_berater_slug: daten.beraterSlug,
      p_vorlage_slug: daten.thema,
      p_ist_test: daten.istTest,
    }),
  });
  const rohtext = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${rohtext.slice(0, 200)}`);
  }
  let zeilen = [];
  try { zeilen = JSON.parse(rohtext); } catch (_) { zeilen = []; }
  return Array.isArray(zeilen) && zeilen[0] ? zeilen[0] : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, grund: 'nur_post' }));
  }

  const hinterlegtesGeheimnis = process.env.LEAD_INTAKE_SECRET || '';
  const mitgeschicktesGeheimnis = req.headers['x-lead-secret'] || '';
  if (!hinterlegtesGeheimnis) {
    // Klar unterscheidbar von "falsches Geheimnis": so sieht man beim
    // Einrichten sofort, ob die Umgebungsvariable fehlt.
    res.statusCode = 503;
    return res.end(JSON.stringify({ ok: false, grund: 'nicht_eingerichtet' }));
  }
  if (!safeEqual(mitgeschicktesGeheimnis, hinterlegtesGeheimnis)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, grund: 'geheimnis_falsch' }));
  }

  const body = readBody(req);
  const quelle = text(body.quelle || body.source, 40);
  if (!quelle || !QUELLEN.has(quelle)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, grund: 'quelle_unbekannt' }));
  }

  const daten = {
    name: text(body.name, 120),
    email: email(body.email),
    telefon: telefon(body.telefon || body.phone),
    quelle,
    nachricht: text(body.nachricht || body.message, 2000),
    beraterSlug: text(body.berater || body.beraterSlug, 60) || 'kai-blobel',
    thema: text(body.thema || body.vorlage, 40) || 'allgemein',
    istTest: body.test === true,
  };

  if (!daten.name) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, grund: 'name_fehlt' }));
  }
  if (!daten.email && !daten.telefon) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, grund: 'kein_kontaktweg' }));
  }

  try {
    const zeile = await legeLeadAn(daten);
    if (!zeile || !zeile.id) throw new Error('Antwort ohne Kennung');
    res.statusCode = 201;
    return res.end(JSON.stringify({ ok: true, id: zeile.id }));
  } catch (error) {
    // Der Aufrufer schickt daraufhin seine Mail mit dem Hinweis, dass der
    // Lead nicht erfasst wurde. Deshalb hier kein stiller 200er.
    console.error('[lead-intake]', error.message);
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false, grund: 'portal_nicht_erreichbar' }));
  }
};
