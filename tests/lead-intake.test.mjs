/**
 * Prueft die Tuersteher-Logik der Lead-Aufnahme, ohne die Datenbank zu
 * beruehren: falsches oder fehlendes Geheimnis, unbekannte Quelle,
 * fehlender Name, kein Kontaktweg. Der erfolgreiche Fall wird hier
 * bewusst NICHT geprueft, sonst legt jeder Testlauf einen Datensatz an.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/lead-intake.js');

function antwortAttrappe() {
  return {
    statusCode: 0,
    kopf: {},
    koerper: '',
    setHeader(name, wert) { this.kopf[name] = wert; },
    end(text) { this.koerper = text || ''; return this; },
  };
}

async function ruf(koerper, { geheimnis = 'richtig', kopfGeheimnis = 'richtig', methode = 'POST' } = {}) {
  const alt = process.env.LEAD_INTAKE_SECRET;
  if (geheimnis === null) delete process.env.LEAD_INTAKE_SECRET;
  else process.env.LEAD_INTAKE_SECRET = geheimnis;

  const req = { method: methode, headers: { 'x-lead-secret': kopfGeheimnis }, body: koerper };
  const res = antwortAttrappe();
  await handler(req, res);

  if (alt === undefined) delete process.env.LEAD_INTAKE_SECRET;
  else process.env.LEAD_INTAKE_SECRET = alt;

  let daten = {};
  try { daten = JSON.parse(res.koerper); } catch {}
  return { code: res.statusCode, daten };
}

const gueltig = { quelle: 'av-depot-check', name: 'Test Person', email: 'test@example.org' };

// Nur POST nimmt etwas an.
assert.equal((await ruf(gueltig, { methode: 'GET' })).code, 405);

// Ohne hinterlegtes Geheimnis: klar unterscheidbar von "falsch", damit man
// beim Einrichten sieht, dass die Umgebungsvariable fehlt.
{
  const { code, daten } = await ruf(gueltig, { geheimnis: null });
  assert.equal(code, 503);
  assert.equal(daten.grund, 'nicht_eingerichtet');
}

// Falsches Geheimnis wird abgewiesen.
{
  const { code, daten } = await ruf(gueltig, { kopfGeheimnis: 'falsch' });
  assert.equal(code, 401);
  assert.equal(daten.grund, 'geheimnis_falsch');
}

// Leeres Geheimnis im Kopf zaehlt nicht als Treffer.
assert.equal((await ruf(gueltig, { kopfGeheimnis: '' })).code, 401);

// Eine Quelle, die das Portal nicht kennt, wird nicht angenommen.
{
  const { code, daten } = await ruf({ ...gueltig, quelle: 'irgendwas' });
  assert.equal(code, 400);
  assert.equal(daten.grund, 'quelle_unbekannt');
}

// Ohne Namen kein Lead.
{
  const { code, daten } = await ruf({ ...gueltig, name: '   ' });
  assert.equal(code, 400);
  assert.equal(daten.grund, 'name_fehlt');
}

// Ohne jeden Kontaktweg waere der Eintrag wertlos.
{
  const { code, daten } = await ruf({ quelle: 'av-depot-check', name: 'Ohne Kontakt' });
  assert.equal(code, 400);
  assert.equal(daten.grund, 'kein_kontaktweg');
}

// Eine unbrauchbare E-Mail zaehlt nicht als Kontaktweg.
{
  const { code, daten } = await ruf({ quelle: 'av-depot-check', name: 'Krumme Mail', email: 'keine-mail' });
  assert.equal(code, 400);
  assert.equal(daten.grund, 'kein_kontaktweg');
}

// Eine zu kurze Ziffernfolge ist keine Telefonnummer.
{
  const { code, daten } = await ruf({ quelle: 'av-depot-check', name: 'Kurze Nummer', telefon: '123' });
  assert.equal(code, 400);
  assert.equal(daten.grund, 'kein_kontaktweg');
}

console.log('lead-intake: OK');
