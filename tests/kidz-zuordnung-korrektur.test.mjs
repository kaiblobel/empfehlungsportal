// Phase 390: Zuordnung bestaetigen und Kontaktdaten korrigieren.
//
// Kais Wunsch vom 15.09.2026: Online-Anmeldungen ohne Berater lagen alle bei ihm und
// sahen aus wie seine echten Kontakte. Jetzt: offen oder bestaetigt, "Gehört zu mir"
// fuer jeden Berater, und Name/E-Mail/Mobilnummer dauerhaft korrigierbar fuer alle,
// die die Anmeldung sehen.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const handler = require('../api/kidz-nacherfassung.js');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const sql = read('schema-phase390-kidz-zuordnung-korrektur.sql').replace(/^--.*$/gm, '');
const js = read('js/kidz-gewinnspiel-admin.js');
const html = read('dashboard/kidz-gewinnspiel.html');
const css = read('css/kidz-gewinnspiel-admin.css');

// --- Datenbank: Zuordnung ---------------------------------------------------------
assert.match(sql, /add column if not exists zuordnung_bestaetigt_am timestamptz/);
assert.match(sql, /add column if not exists zuordnung_bestaetigt_von uuid references public\.berater\(id\) on delete set null/);
// Startstand: offen bleibt nur, was ohne Umhaengen beim Vorgabeberater liegt.
assert.match(sql, /t\.zugeordnet_am is not null\s+or t\.berater_id is distinct from \(\s*select b\.id from public\.berater b where lower\(b\.slug\) = 'kai-blobel'/);
// Umhaengen bestaetigt mit.
assert.match(sql, /function public\.set_kidz_gewinnspiel_berater[\s\S]*?zuordnung_bestaetigt_am = now\(\),\s+zuordnung_bestaetigt_von = v_actor/);
// "Gehört zu mir": sehen ist Voraussetzung, fremde bestaetigte bleiben unangetastet.
assert.match(sql, /create or replace function public\.bestaetige_kidz_zuordnung\(p_teilnahme_id uuid\)/);
assert.match(sql, /bestaetige_kidz_zuordnung[\s\S]*?v_is_admin or \(v_event is not null and \(v_berater = v_actor or public\.kidz_team_sicht_offen\(v_event\)\)\)/);
assert.match(sql, /'reason', 'already_confirmed'/);
assert.match(sql, /and \(zuordnung_bestaetigt_am is null or berater_id = v_actor\)/,
  'Druecken zwei gleichzeitig, darf nur einer gewinnen.');
assert.match(sql, /revoke execute on function public\.bestaetige_kidz_zuordnung\(uuid\)\s+from public, anon, service_role/);
assert.match(sql, /grant execute on function public\.bestaetige_kidz_zuordnung\(uuid\)\s+to authenticated/);

// --- Datenbank: Korrektur ---------------------------------------------------------
assert.match(sql, /teilnahme_id\s+uuid not null references public\.kidz_gewinnspiel_teilnahmen\(id\) on delete cascade/);
assert.match(sql, /check \(feld in \('name', 'email', 'telefon'\)\)/);
assert.match(sql, /alter table public\.kidz_teilnahme_korrekturen enable row level security/);
assert.match(sql, /revoke all on public\.kidz_teilnahme_korrekturen from public, anon, authenticated/);
assert.match(sql, /grant select, delete on public\.kidz_teilnahme_korrekturen to authenticated/);
assert.doesNotMatch(sql, /grant[^;]*(insert|update)[^;]*on public\.kidz_teilnahme_korrekturen/,
  'Das Protokoll schreibt nur die Funktion, niemand aendert es.');
assert.match(sql, /create policy kidz_teilnahme_korrekturen_admin_delete[\s\S]{0,120}for delete[\s\S]{0,80}is_current_berater_admin\(\)/);
// Nur ueber den Server mit geheimem Wert.
assert.match(sql, /korrigiere_kidz_teilnahme[\s\S]*?private\.integration_secrets where name = 'kidz_giveaway_registration'/);
// Kais Regel: wer sieht, darf korrigieren.
assert.match(sql, /korrigiere_kidz_teilnahme[\s\S]*?v_is_admin or \(v_event is not null and \(v_berater = v_actor or public\.kidz_team_sicht_offen\(v_event\)\)\)/);
// Keine Dublette durch Korrektur, Schluessel wird mitgeschrieben, altes und neues ins Protokoll.
assert.match(sql, /t\.id <> p_teilnahme_id/);
assert.match(sql, /contact_key = p_contact_key\s+where id = p_teilnahme_id/);
assert.match(sql, /insert into public\.kidz_teilnahme_korrekturen/);
assert.match(sql, /revoke execute on function public\.korrigiere_kidz_teilnahme\(text, uuid, text, text, text, text\)\s+from public, anon, service_role/);

// --- Server: Korrektur ueber die Nacherfassungsdatei ------------------------------
function responseMock() {
  return {
    headers: {}, statusCode: 0, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = value; return value; },
  };
}
const request = (body, headers = {}) => ({
  method: 'POST',
  headers: { host: 'localhost:3000', origin: 'http://localhost:3000', authorization: 'Bearer berater-test-token', ...headers },
  body,
});
const ID = '3f1c2b1a-1111-4222-8333-944455556666';
const originalFetch = global.fetch;
const originalSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
const SECRET = 'test-kidz-registration-secret-with-enough-entropy';
process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = SECRET;

try {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, text: async () => JSON.stringify({ ok: true, unchanged: false, name: 'Anna Schmidt', email: 'anna.neu@example.test', telefon: null }) };
  };
  const ok = responseMock();
  await handler(request({ action: 'korrektur', teilnahmeId: ID, name: '  Anna   Schmidt ', email: 'Anna.Neu@Example.test', telefon: '' }), ok);
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(JSON.parse(ok.body), { ok: true, unchanged: false, name: 'Anna Schmidt', email: 'anna.neu@example.test', telefon: null });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /rpc\/korrigiere_kidz_teilnahme$/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer berater-test-token',
    'Die Datenbank muss den angemeldeten Berater sehen, nicht einen Dienstzugang.');
  const rpc = JSON.parse(calls[0].options.body);
  assert.equal(rpc.p_teilnahme_id, ID);
  assert.equal(rpc.p_name, 'Anna Schmidt');
  assert.equal(rpc.p_email, 'anna.neu@example.test');
  assert.equal(rpc.p_telefon, null);
  // Zeichengleich zur Anmeldung, sonst erkennt das Portal keine Dubletten mehr.
  const erwartet = crypto.createHmac('sha256', SECRET).update('kidz-sommerfest-2026|email:anna.neu@example.test', 'utf8').digest('hex');
  assert.equal(rpc.p_contact_key, erwartet);
  assert.equal(rpc.p_secret, SECRET);

  // Nur Telefon: Schluessel aus der Nummer.
  calls.length = 0;
  await handler(request({ action: 'korrektur', teilnahmeId: ID, name: 'Anna Schmidt', email: '', telefon: '0151 2345678' }), responseMock());
  const nurTelefon = JSON.parse(calls[0].options.body);
  assert.equal(nurTelefon.p_telefon, '+491512345678');
  assert.equal(nurTelefon.p_contact_key, crypto.createHmac('sha256', SECRET).update('kidz-sommerfest-2026|phone:+491512345678', 'utf8').digest('hex'));

  // Ohne Kontaktweg, mit kaputter E-Mail oder zu kurzem Namen gar nicht erst zur Datenbank.
  for (const [body, grund] of [
    [{ name: 'Anna Schmidt', email: '', telefon: '' }, 'invalid_contact'],
    [{ name: 'Anna Schmidt', email: 'kein-at', telefon: '' }, 'invalid_contact'],
    [{ name: 'A', email: 'a@example.test', telefon: '' }, 'invalid_input'],
  ]) {
    calls.length = 0;
    const res = responseMock();
    await handler(request({ action: 'korrektur', teilnahmeId: ID, ...body }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).reason, grund);
    assert.equal(calls.length, 0);
  }

  // Dublette und fehlendes Recht kommen verstaendlich zurueck.
  for (const [antwort, status] of [[{ ok: false, reason: 'already_exists' }, 409], [{ ok: false, reason: 'forbidden' }, 403]]) {
    global.fetch = async () => ({ ok: true, text: async () => JSON.stringify(antwort) });
    const res = responseMock();
    await handler(request({ action: 'korrektur', teilnahmeId: ID, name: 'Anna Schmidt', email: 'a@example.test' }), res);
    assert.equal(res.statusCode, status);
  }

  // Ohne Anmeldung nichts.
  const ohne = responseMock();
  await handler(request({ action: 'korrektur', teilnahmeId: ID, name: 'Anna Schmidt', email: 'a@example.test' }, { authorization: '' }), ohne);
  assert.equal(ohne.statusCode, 401);
} finally {
  global.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = originalSecret;
}

// --- Seite ------------------------------------------------------------------------
assert.match(js, /supabase\.rpc\('bestaetige_kidz_zuordnung'/);
assert.match(js, /action: 'korrektur'/);
assert.match(js, /zuordnung_bestaetigt_am,berater:berater_id/, 'Ohne die Spalte waere jede Anmeldung offen.');
assert.doesNotMatch(js, /from\('kidz_gewinnspiel_teilnahmen'\)[\s\S]{0,120}\.update\(\{[^}]*(name|email|telefon)/,
  'Kontaktdaten duerfen nicht direkt aus dem Browser geschrieben werden.');
for (const text of ['Gehört zu mir', 'Zuordnung offen', 'Daten korrigieren', 'Diese E-Mail oder Mobilnummer gehört schon zu einer anderen Anmeldung.']) {
  assert.ok(js.includes(text), `Text fehlt: ${text}`);
}
assert.match(html, /id="zuordnungOffenOnly" type="checkbox"/);
assert.match(html, /id="korrekturDialog"/);
assert.match(html, /id="korrekturEmail" type="email"/);
assert.match(html, /Alter und neuer Wert werden mit deinem Namen festgehalten/);
assert.match(css, /\.kg-admin-claim \{/);

console.log('kidz-zuordnung-korrektur: OK');
