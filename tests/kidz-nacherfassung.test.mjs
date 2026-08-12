import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const onsiteHandler = require('../api/kidz-nacherfassung.js');
const registerHandler = require('../api/kidz-register.js');
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

function responseMock() {
  return {
    headers: {}, statusCode: 0, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = value; return value; },
  };
}

function request(body, overrides = {}) {
  return {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '203.0.113.42',
      authorization: 'Bearer berater-test-token',
      ...(overrides.headers || {}),
    },
    body,
    ...overrides,
  };
}

const validBody = {
  name: 'Anna Schmidt',
  email: 'anna@example.test',
  telefon: '',
  schaetzung: 240,
  parentEvening: true,
  beraterSlug: '',
  consent: true,
};

const originalFetch = global.fetch;
const originalRegistrationSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;

process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-kidz-registration-secret-with-enough-entropy';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

try {
  let requests = [];
  const okFetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, text: async () => JSON.stringify({ ok: true, reference: 'KIDZ-ONSITE01' }) };
  };

  // Ein Zettel wird erfasst.
  global.fetch = okFetch;
  const success = responseMock();
  await onsiteHandler(request(validBody), success);
  assert.equal(success.statusCode, 201);
  assert.deepEqual(JSON.parse(success.body), { ok: true, reference: 'KIDZ-ONSITE01' });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /record_kidz_gewinnspiel_onsite$/);

  const rpcBody = JSON.parse(requests[0].options.body);
  assert.equal(rpcBody.p_event_key, 'kidz-sommerfest-2026');
  assert.equal(rpcBody.p_conditions_version, '2026-08-12-v5');
  assert.equal(rpcBody.p_schaetzung_cm, 240);
  assert.equal(rpcBody.p_begleitpersonen, null);
  assert.equal(rpcBody.p_berater_slug, null);
  assert.equal(rpcBody.p_consent, true);
  assert.match(rpcBody.p_contact_key, /^[0-9a-f]{64}$/);
  assert.equal(rpcBody.p_contact_key_alt, null);

  // Das Berater-Token wird durchgereicht, nicht der anonyme Schluessel.
  assert.equal(requests[0].options.headers.Authorization, 'Bearer berater-test-token');
  assert.match(requests[0].options.headers.apikey, /^sb_publishable_/);

  // Kein Captcha, keine IP-Bremse: Der Erfasser ist angemeldet.
  assert.doesNotMatch(requests[0].options.body, /captcha/i);
  assert.doesNotMatch(requests[0].options.body, /p_rate_key/);
  assert.doesNotMatch(requests[0].options.body, /203\.0\.113\.42/);

  // Der entscheidende Vertrag: derselbe Kontakt erzeugt online und auf Papier
  // denselben Dublettenschluessel. Sonst landet ein Zettel doppelt in der Liste.
  requests = [];
  global.fetch = okFetch;
  const onlineResponse = responseMock();
  await registerHandler(request({
    name: 'Anna Schmidt', email: 'ANNA@example.test', telefon: '', source: 'direkt',
    beraterSlug: 'kai-blobel', parentEvening: false, captchaToken: 'captcha-token', consent: true,
  }, { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } }), onlineResponse);
  assert.equal(onlineResponse.statusCode, 201);
  const onlineKey = JSON.parse(requests.at(-1).options.body).p_contact_key;

  requests = [];
  global.fetch = okFetch;
  const paperResponse = responseMock();
  await onsiteHandler(request({ ...validBody, email: 'anna@Example.Test' }), paperResponse);
  assert.equal(paperResponse.statusCode, 201);
  assert.equal(JSON.parse(requests[0].options.body).p_contact_key, onlineKey);

  // Auch die Telefonnormalisierung muss zeichengleich sein.
  requests = [];
  global.fetch = okFetch;
  const phoneOnline = responseMock();
  await registerHandler(request({
    name: 'Bernd Klein', email: '', telefon: '0151 23456789', source: 'direkt',
    beraterSlug: 'kai-blobel', parentEvening: false, captchaToken: 'captcha-token', consent: true,
  }, { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } }), phoneOnline);
  const phoneOnlineKey = JSON.parse(requests.at(-1).options.body).p_contact_key;

  requests = [];
  global.fetch = okFetch;
  const phonePaper = responseMock();
  await onsiteHandler(request({ ...validBody, email: '', telefon: '+4915123456789' }), phonePaper);
  assert.equal(JSON.parse(requests[0].options.body).p_contact_key, phoneOnlineKey);

  // Mit beiden Kontaktwegen wird zusaetzlich der telefonbasierte Schluessel mitgeschickt.
  requests = [];
  global.fetch = okFetch;
  const bothResponse = responseMock();
  await onsiteHandler(request({ ...validBody, telefon: '0151 23456789' }), bothResponse);
  const bothBody = JSON.parse(requests[0].options.body);
  assert.match(bothBody.p_contact_key_alt, /^[0-9a-f]{64}$/);
  assert.equal(bothBody.p_contact_key_alt, phoneOnlineKey);
  assert.notEqual(bothBody.p_contact_key, bothBody.p_contact_key_alt);

  // Ohne Anmeldung wird gar nichts an die Datenbank geschickt.
  requests = [];
  global.fetch = okFetch;
  const noAuth = responseMock();
  await onsiteHandler(request(validBody, { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } }), noAuth);
  assert.equal(noAuth.statusCode, 401);
  assert.equal(JSON.parse(noAuth.body).reason, 'authentication_required');
  assert.equal(requests.length, 0);

  const brokenAuth = responseMock();
  await onsiteHandler(request(validBody, { headers: { authorization: 'irgendwas' } }), brokenAuth);
  assert.equal(brokenAuth.statusCode, 401);

  // Fremde Herkunft wird abgewiesen.
  const foreignOrigin = responseMock();
  await onsiteHandler(request(validBody, { headers: { origin: 'https://fremde-seite.test' } }), foreignOrigin);
  assert.equal(foreignOrigin.statusCode, 403);

  // Ein Zettel ohne Kontaktweg ist nicht erfassbar.
  const noContact = responseMock();
  await onsiteHandler(request({ ...validBody, email: '', telefon: '' }), noContact);
  assert.equal(noContact.statusCode, 400);
  assert.equal(JSON.parse(noContact.body).reason, 'invalid_contact');

  const shortName = responseMock();
  await onsiteHandler(request({ ...validBody, name: 'A' }), shortName);
  assert.equal(shortName.statusCode, 400);

  const badEmail = responseMock();
  await onsiteHandler(request({ ...validBody, email: 'keine-mail' }), badEmail);
  assert.equal(badEmail.statusCode, 400);
  assert.equal(JSON.parse(badEmail.body).reason, 'invalid_contact');

  // Unsinnige Schaetzungen werden abgewiesen, eine leere ist erlaubt.
  for (const guess of [5, 1000, 'viel']) {
    const badGuess = responseMock();
    await onsiteHandler(request({ ...validBody, schaetzung: guess }), badGuess);
    assert.equal(badGuess.statusCode, 400, `Schätzung ${guess} müsste abgewiesen werden`);
    assert.equal(JSON.parse(badGuess.body).reason, 'invalid_guess');
  }

  requests = [];
  global.fetch = okFetch;
  const noGuess = responseMock();
  await onsiteHandler(request({ ...validBody, schaetzung: null }), noGuess);
  assert.equal(noGuess.statusCode, 201);
  assert.equal(JSON.parse(requests[0].options.body).p_schaetzung_cm, null);

  // Dublette, verbotene Zuordnung und fehlendes Beraterkonto werden durchgereicht.
  const cases = [
    [{ ok: false, reason: 'already_exists', reference: 'KIDZ-VORHAND1' }, 409, 'already_exists'],
    [{ ok: false, reason: 'forbidden' }, 403, 'forbidden'],
    [{ ok: false, reason: 'no_advisor_account' }, 403, 'no_advisor_account'],
    [{ ok: false, reason: 'invalid_advisor' }, 400, 'invalid_advisor'],
  ];
  for (const [payload, status, reason] of cases) {
    global.fetch = async () => ({ ok: true, text: async () => JSON.stringify(payload) });
    const response = responseMock();
    await onsiteHandler(request(validBody), response);
    assert.equal(response.statusCode, status);
    assert.equal(JSON.parse(response.body).reason, reason);
  }

  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ ok: false, reason: 'already_exists', reference: 'KIDZ-VORHAND1' }) });
  const duplicate = responseMock();
  await onsiteHandler(request(validBody), duplicate);
  assert.equal(JSON.parse(duplicate.body).reference, 'KIDZ-VORHAND1');

  // Ohne hinterlegtes Geheimnis meldet die Funktion sich sauber ab.
  delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  const notConfigured = responseMock();
  await onsiteHandler(request(validBody), notConfigured);
  assert.equal(notConfigured.statusCode, 503);
  assert.equal(JSON.parse(notConfigured.body).reason, 'not_configured');
  process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-kidz-registration-secret-with-enough-entropy';

  const wrongMethod = responseMock();
  await onsiteHandler({ method: 'GET', headers: {} }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
} finally {
  global.fetch = originalFetch;
  if (originalRegistrationSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = originalRegistrationSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
}

// --- Oberflaeche des geschuetzten Bereichs ------------------------------------

const adminHtml = await read('dashboard/kidz-gewinnspiel.html');
const adminJs = await read('js/kidz-gewinnspiel-admin.js');
const adminCss = await read('css/kidz-gewinnspiel-admin.css');

assert.match(adminHtml, /id="onsiteBtn"[\s\S]*Zettel nacherfassen/);
assert.match(adminHtml, /<dialog class="kg-admin-dialog" id="onsiteDialog"/);
assert.match(adminHtml, /<form method="dialog" class="kg-admin-dialog-card" id="onsiteForm">/);
assert.match(adminHtml, /id="onsiteName"/);
assert.match(adminHtml, /id="onsiteEmail"/);
assert.match(adminHtml, /id="onsitePhone"/);
assert.match(adminHtml, /id="onsiteGuess"[\s\S]*min="10" max="999"/);
assert.match(adminHtml, /id="onsiteBegleitung"/);
assert.match(adminHtml, /id="personCount"/);
assert.match(adminJs, /begleitpersonen/);
assert.match(adminHtml, /id="onsiteConsent"/);
assert.match(adminHtml, /id="onsiteNoContactBtn"/);
assert.match(adminHtml, /id="onsiteCounter"/);
assert.match(adminHtml, /id="guessDialog"/);
assert.match(adminHtml, /id="guessValue"/);
assert.match(adminHtml, /id="onsiteOnly"/);
assert.match(adminHtml, /Ohne E-Mail oder Mobilnummer geht es nicht/);
assert.match(adminHtml, /Fassung 5/);

assert.match(adminJs, /\/api\/kidz-nacherfassung/);
assert.match(adminJs, /supabase\.auth\.getSession\(\)/);
assert.match(adminJs, /Authorization: `Bearer \$\{session\.access_token\}`/);
assert.match(adminJs, /already_exists|409/);
assert.match(adminJs, /SOURCE_LABELS/);
assert.match(adminJs, /const ONSITE_SOURCE = 'flyer'/);
assert.match(adminJs, /schaetzung_cm/);
assert.match(adminJs, /onsiteTally/);

// Weder Geheimnis noch Datenbankweg duerfen im Browser landen.
assert.doesNotMatch(adminJs, /KIDZ_GIVEAWAY|p_secret|record_kidz_gewinnspiel_onsite/);
assert.doesNotMatch(adminHtml, /KIDZ_GIVEAWAY|p_secret/);

assert.match(adminCss, /\.kg-admin-badge-onsite/);
assert.match(adminCss, /\.kg-admin-dialog input\[type="email"\]/);

// --- Migration ----------------------------------------------------------------

const migration = await read('schema-phase200.sql');

assert.match(migration, /ANGEWENDET am 12\.08\.2026/);
assert.match(migration, /add column if not exists schaetzung_cm smallint/);
assert.match(migration, /schaetzung_cm between 10 and 999/);
assert.match(migration, /grant update \(schaetzung_cm, schaetzung_am\)[\s\S]*to authenticated/);

// Fassung 5 wird zugelassen, Fassung 4 bleibt gueltig: kein Ausfallfenster.
assert.match(migration, /'2026-08-12-v4', '2026-08-12-v5'/);

assert.match(migration, /create or replace function public\.record_kidz_gewinnspiel_onsite/);
assert.match(migration, /security definer/);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /public\.current_berater_id\(\)/);
assert.match(migration, /public\.is_current_berater_admin\(\)/);
assert.match(migration, /private\.integration_secrets/);
assert.match(migration, /extensions\.digest/);
assert.match(migration, /rate_limit_check_key/);
assert.match(migration, /v_source constant text := 'flyer'/);
assert.match(migration, /p_conditions_version <> '2026-08-12-v5'/);
assert.match(migration, /not v_is_admin and v_berater <> v_actor_berater/);
assert.match(migration, /'forbidden'/);
assert.match(migration, /timestamptz '2026-09-06 12:00:00\+02'/);

// Rechte: nur angemeldete Berater, niemals anonym.
assert.match(migration, /revoke execute on function public\.record_kidz_gewinnspiel_onsite[\s\S]*from public, anon, service_role/);
assert.match(migration, /grant execute on function public\.record_kidz_gewinnspiel_onsite[\s\S]*to authenticated/);

// Der Tabellenzugang bleibt zu: kein direktes Einfuegen aus dem Browser.
assert.doesNotMatch(migration, /grant insert on table public\.kidz_gewinnspiel_teilnahmen/);
assert.doesNotMatch(migration, /for insert\s+to authenticated/);

// Promoter-Umstellung, ohne Zugangscodes im Repository.
assert.match(migration, /set ist_aktiv = false\s*\n\s*where key = 'promoter-anika-bibrach'/);
assert.match(migration, /set name = 'Anja Scholz'/);
assert.match(migration, /'promoter-anja-scholz', 'Anja Scholz'/);
assert.match(migration, /'promoter-sandra-roehrens', 'Sandra Röhrens'/);
assert.match(migration, /gen_random_uuid\(\)/);
assert.doesNotMatch(migration, /anjasscholz-646f'[^\n]*insert/);
assert.doesNotMatch(migration, /sandra-roehrens-[a-z0-9]{10,}/);

// --- Schaetzfenster: nur am Veranstaltungstag ---------------------------------

const configHandler = require('../api/kidz-config.js');

const VOR_DEM_FEST = Date.parse('2026-08-12T14:00:00+02:00');
const AM_FEST = Date.parse('2026-09-06T11:00:00+02:00');
const NACH_DEM_FEST = Date.parse('2026-09-07T09:00:00+02:00');

assert.equal(configHandler.eventDay(VOR_DEM_FEST), false);
assert.equal(configHandler.eventDay(AM_FEST), true);
assert.equal(configHandler.eventDay(NACH_DEM_FEST), false);

// Die oeffentliche Anmeldung verwirft eine zu frueh mitgeschickte Schaetzung,
// laesst die Anmeldung selbst aber durchgehen.
{
  const originalSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  const originalTurnstile = process.env.TURNSTILE_SECRET_KEY;
  const originalGlobalFetch = global.fetch;
  process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-kidz-registration-secret-with-enough-entropy';
  process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';
  const gesendet = [];
  global.fetch = async (url, options) => {
    gesendet.push({ url: String(url), options });
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, text: async () => JSON.stringify({ ok: true, reference: 'KIDZ-FENSTER1' }) };
  };
  const antwort = responseMock();
  await registerHandler(request({
    name: 'Frueh Schaetzer', email: 'frueh@example.test', telefon: '', source: 'direkt',
    beraterSlug: 'kai-blobel', parentEvening: false, captchaToken: 'captcha-token',
    schaetzung: 240, consent: true,
  }, { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } }), antwort);
  assert.equal(antwort.statusCode, 201);
  assert.equal(JSON.parse(gesendet.at(-1).options.body).p_schaetzung_cm, null);

  global.fetch = originalGlobalFetch;
  if (originalSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = originalSecret;
  if (originalTurnstile === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstile;
}

// Die zweite Schranke steht in der Datenbank.
const fenstermigration = await read('schema-phase200-schaetzfenster.sql');
assert.match(fenstermigration, /tstzrange\(\s*\n?\s*timestamptz '2026-09-06 00:00:00\+02', timestamptz '2026-09-07 00:00:00\+02', '\[\)'\)/);
assert.match(fenstermigration, /KIDZ guess accepted on event day only/);
assert.match(fenstermigration, /2026-08-12-v5/);
// Die Nacherfassung der Papierzettel bleibt ausdruecklich unberuehrt: Die
// Migration fasst nur die oeffentliche Anmeldung an.
assert.doesNotMatch(fenstermigration, /create or replace function public\.record_kidz_gewinnspiel_onsite/);
assert.match(fenstermigration, /create or replace function public\.register_kidz_gewinnspiel_public/);

// Der Browser entscheidet nicht selbst, wann das Feld aufgeht.
const publicJs = await read('js/kidz-gewinnspiel.js');
assert.match(publicJs, /applyEventDay\(config\?\.eventDay === true/);
// Das Elternabend-Haekchen haengt am selben Schalter und startet versteckt.
assert.match(publicJs, /parentEveningRow\.hidden = !isEventDay;/);
// Das Attribut hidden allein reicht nicht: .kg-check setzt display: grid und
// wuerde gewinnen. Ohne diese Regel bleibt das ausgeblendete Haekchen sichtbar.
const publicCss = await read('css/kidz-gewinnspiel.css');
assert.match(publicCss, /\.kg-check\[hidden\]\s*\{\s*display:\s*none/);
assert.match(publicJs, /const parentEvening = !parentEveningRow\.hidden/);
assert.match(publicJs, /if \(guessInput\.disabled\) return null;/);
assert.doesNotMatch(publicJs, /2026-09-06/);

// --- Begleitpersonen: freiwillige Angabe fuer die Planung ---------------------
{
  const originalSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-kidz-registration-secret-with-enough-entropy';
  const originalGlobalFetch = global.fetch;
  const gesendet = [];
  global.fetch = async (url, options) => {
    gesendet.push({ url: String(url), options });
    return { ok: true, text: async () => JSON.stringify({ ok: true, reference: 'KIDZ-BEGLEIT1' }) };
  };

  const mitBegleitung = responseMock();
  await onsiteHandler(request({ ...validBody, schaetzung: null, begleitpersonen: 3 }), mitBegleitung);
  assert.equal(mitBegleitung.statusCode, 201);
  assert.equal(JSON.parse(gesendet.at(-1).options.body).p_begleitpersonen, 3);

  // Keine Angabe bleibt leer, statt zu 0 zu werden.
  const ohneAngabe = responseMock();
  await onsiteHandler(request({ ...validBody, schaetzung: null, begleitpersonen: '' }), ohneAngabe);
  assert.equal(ohneAngabe.statusCode, 201);
  assert.equal(JSON.parse(gesendet.at(-1).options.body).p_begleitpersonen, null);

  // "Ich komme allein" ist eine Angabe und muss als 0 ankommen.
  const allein = responseMock();
  await onsiteHandler(request({ ...validBody, schaetzung: null, begleitpersonen: 0 }), allein);
  assert.equal(JSON.parse(gesendet.at(-1).options.body).p_begleitpersonen, 0);

  for (const unsinn of [-1, 21, 'viele']) {
    const abgewiesen = responseMock();
    await onsiteHandler(request({ ...validBody, begleitpersonen: unsinn }), abgewiesen);
    assert.equal(abgewiesen.statusCode, 400, `Begleitung ${unsinn} müsste abgewiesen werden`);
    assert.equal(JSON.parse(abgewiesen.body).reason, 'invalid_companions');
  }

  global.fetch = originalGlobalFetch;
  if (originalSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = originalSecret;
}

// --- Einladungslinks tragen immer die offizielle Adresse ----------------------
// Sonst verschickt ein Berater, der ueber die alte Portaladresse angemeldet ist,
// auch eine alte Adresse.
const elternabendJs = await read('js/kidz-elternabend-admin.js');
for (const [name, quelle] of [['Gewinnspiel', adminJs], ['Elternabend', elternabendJs]]) {
  assert.match(quelle, /const KIDZ_ADRESSE = 'https:\/\/kidz\.teamwachsbleiche\.de';/,
    `${name}: feste KIDZ-Adresse fehlt`);
  assert.match(quelle, /\$\{KIDZ_ADRESSE\}\/kidz\/(gewinnspiel|elternabend)\?berater=/,
    `${name}: Einladungslink baut nicht auf der festen Adresse auf`);
  assert.doesNotMatch(quelle, /window\.location\.origin\}\/kidz\//,
    `${name}: Einladungslink haengt noch am Fenster`);
}

// --- Vorschaubilder fuer WhatsApp --------------------------------------------
// WhatsApp laedt Vorschaubilder nur bis etwa 300 KB und will Querformat. Die
// grossen Motive (2,3 MB im Hochformat) wurden deshalb gar nicht angezeigt.
import { stat as dateiInfo } from 'node:fs/promises';

for (const [seite, bild] of [
  ['kidz-sommerfest.html', 'kidz-vorschau-sommerfest.jpg'],
  ['kidz-gewinnspiel.html', 'kidz-vorschau-gewinnspiel.jpg'],
  ['kidz-elternabend.html', 'kidz-vorschau-elternabend.jpg'],
]) {
  const seiteninhalt = await read(seite);
  assert.match(seiteninhalt, new RegExp(`property="og:image" content="[^"]*/${bild}"`),
    `${seite}: falsches Vorschaubild`);
  assert.match(seiteninhalt, /property="og:image:width" content="1200"/, `${seite}: Breite`);
  assert.match(seiteninhalt, /property="og:image:height" content="630"/, `${seite}: Hoehe`);

  const info = await dateiInfo(new URL(`../assets/images/${bild}`, import.meta.url));
  assert.ok(info.size <= 300 * 1024,
    `${bild} ist ${Math.round(info.size / 1024)} KB gross, WhatsApp laedt hoechstens etwa 300 KB`);
  assert.ok(info.size > 20 * 1024, `${bild} wirkt zu klein, wurde es richtig erzeugt?`);
}
