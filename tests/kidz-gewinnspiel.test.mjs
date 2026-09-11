import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const registerHandler = require('../api/kidz-register.js');
const configHandler = require('../api/kidz-config.js');
const advisorsHandler = require('../api/kidz-advisors.js');
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
      host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': '203.0.113.42',
    },
    body,
    ...overrides,
  };
}

const validBody = {
  name: 'Anna Schmidt',
  email: 'anna@example.test',
  telefon: '',
  source: 'vor-ort-qr',
  beraterSlug: 'sandro-wernicke',
  parentEvening: true,
  captchaToken: 'captcha-token',
  consent: true,
};

const originalFetch = global.fetch;
const originalRegistrationSecret = process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const originalTurnstileSiteKey = process.env.TURNSTILE_SITE_KEY;

process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-kidz-registration-secret-with-enough-entropy';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

// Phase 336: Die Anmeldung ist seit dem 6. September, 15 Uhr, geschlossen.
// Damit die Zusicherungen zum Erfolgsfall nicht still verschwinden, wird der
// Schalter fuer diesen Block auf "offen" gestellt und danach zurueckgegeben.
// Dass der Schluss selbst greift, prueft der eigene Block weiter unten.
const echterSchalter = registerHandler.registrationOpen;
registerHandler.registrationOpen = () => true;

try {
  let requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, text: async () => JSON.stringify({ ok: true, reference: 'KIDZ-ABC12345' }) };
  };

  const successResponse = responseMock();
  await registerHandler(request(validBody), successResponse);
  assert.equal(successResponse.statusCode, 201);
  assert.deepEqual(JSON.parse(successResponse.body), {
    ok: true, reference: 'KIDZ-ABC12345',
    updated: false, guessAdded: false, interestAdded: false, guessKept: false,
  });
  assert.equal(requests.length, 2);
  const rpcBody = JSON.parse(requests[1].options.body);
  assert.equal(rpcBody.p_event_key, 'kidz-sommerfest-2026');
  assert.equal(rpcBody.p_berater_slug, 'sandro-wernicke');
  assert.equal(rpcBody.p_elternabend_interesse, true);
  assert.equal(rpcBody.p_conditions_version, '2026-08-12-v5');
  assert.match(rpcBody.p_rate_key, /^[0-9a-f]{64}$/);
  assert.match(rpcBody.p_contact_key, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(requests[1].options.body, /203\.0\.113\.42/);

  requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, text: async () => JSON.stringify({ ok: true, reference: 'KIDZ-DEFAULT1' }) };
  };
  const defaultAdvisorResponse = responseMock();
  await registerHandler(request({ ...validBody, beraterSlug: '' }), defaultAdvisorResponse);
  assert.equal(defaultAdvisorResponse.statusCode, 201);
  assert.equal(JSON.parse(requests[1].options.body).p_berater_slug, 'kai-blobel');

  // Der 6. September: Wer sich vor dem Fest angemeldet hat, kommt am Festtag mit
  // denselben Daten wieder und traegt Schaetzung und Haekchen nach. Die Datenbank
  // ergaenzt dann die vorhandene Anmeldung. Der Endpunkt muss das durchreichen,
  // sonst meldet die Seite "Du bist dabei", wo sie etwas ergaenzt hat, und
  // niemand erfaehrt, ob die Schaetzung angekommen ist.
  global.fetch = async (url) => {
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return {
      ok: true,
      text: async () => JSON.stringify({
        ok: true, reference: 'KIDZ-ABC12345', updated: true,
        guessAdded: true, interestAdded: true, guessKept: false,
      }),
    };
  };
  const nachtragResponse = responseMock();
  await registerHandler(request(validBody), nachtragResponse);
  assert.equal(nachtragResponse.statusCode, 201);
  assert.deepEqual(JSON.parse(nachtragResponse.body), {
    ok: true, reference: 'KIDZ-ABC12345',
    updated: true, guessAdded: true, interestAdded: true, guessKept: false,
  });

  // Rueckfall: Eine aeltere Fassung der Datenbankfunktion lehnt noch ab.
  global.fetch = async (url) => {
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, text: async () => JSON.stringify({ ok: false, reason: 'already_exists' }) };
  };
  const duplicateResponse = responseMock();
  await registerHandler(request(validBody), duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 409);

  let fetchCalled = false;
  global.fetch = async () => { fetchCalled = true; };
  const invalidResponse = responseMock();
  await registerHandler(request({ ...validBody, email: '', telefon: '', captchaToken: '' }), invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(fetchCalled, false);

  const foreignOriginResponse = responseMock();
  await registerHandler(request(validBody, { headers: { host: 'localhost:3000', origin: 'https://example.org' } }), foreignOriginResponse);
  assert.equal(foreignOriginResponse.statusCode, 403);

  delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  const unavailableResponse = responseMock();
  await registerHandler(request(validBody), unavailableResponse);
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(JSON.parse(unavailableResponse.body).reason, 'not_configured');

  process.env.TURNSTILE_SITE_KEY = 'public-test-site-key';
  const configResponse = responseMock();
  configHandler({ method: 'GET' }, configResponse);
  assert.equal(configResponse.statusCode, 200);
  assert.equal(JSON.parse(configResponse.body).turnstileSiteKey, 'public-test-site-key');

  global.fetch = async () => ({
    ok: true,
    json: async () => [
      { name: 'Kai Blobel', slug: 'kai-blobel' },
      { name: 'Sandro Wernicke', slug: 'sandro-wernicke' },
      { name: 'Anja Scholz', slug: 'promoter-anja-scholz' },
      { name: 'David Stamm', slug: 'promoter-david-stamm' },
    ],
  });
  const advisorsResponse = responseMock();
  await advisorsHandler({ method: 'GET' }, advisorsResponse);
  assert.equal(advisorsResponse.statusCode, 200);
  assert.equal(JSON.parse(advisorsResponse.body).advisors[1].slug, 'sandro-wernicke');
  assert.equal(JSON.parse(advisorsResponse.body).advisors[2].slug, 'promoter-anja-scholz');
  assert.equal(JSON.parse(advisorsResponse.body).advisors[2].name, 'Anja Scholz');
} finally {
  registerHandler.registrationOpen = echterSchalter;
  global.fetch = originalFetch;
  if (originalRegistrationSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = originalRegistrationSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
  if (originalTurnstileSiteKey === undefined) delete process.env.TURNSTILE_SITE_KEY;
  else process.env.TURNSTILE_SITE_KEY = originalTurnstileSiteKey;
}

// Phase 336: Nach dem Anmeldeschluss nimmt die oeffentliche Strecke nichts mehr
// entgegen, weder eine neue Anmeldung noch einen Nachtrag an einer bestehenden.
// Geprueft wird mit dem echten Schalter, nicht mit einem gesetzten Datum.
{
  let datenbankGefragt = false;
  const vorher = global.fetch;
  global.fetch = async () => { datenbankGefragt = true; return { ok: true, text: async () => '{}' }; };
  process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = 'test-kidz-registration-secret-with-enough-entropy';
  process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

  const geschlossen = responseMock();
  await registerHandler(request(validBody), geschlossen);
  const offen = registerHandler.registrationOpen(Date.now());
  assert.equal(geschlossen.statusCode, offen ? 201 : 410,
    'Nach dem Anmeldeschluss muss die Anmeldung mit 410 abgewiesen werden.');
  if (!offen) {
    assert.equal(JSON.parse(geschlossen.body).reason, 'closed');
    // Weder Turnstile noch die Datenbank duerfen nach dem Schluss noch behelligt
    // werden. Die Schranke steht ganz vorn.
    assert.equal(datenbankGefragt, false);
  }
  // Der Schalter selbst: vor dem Schluss offen, danach zu.
  assert.equal(registerHandler.registrationOpen(Date.parse('2026-09-06T12:00:00+02:00')), true);
  assert.equal(registerHandler.registrationOpen(Date.parse('2026-09-06T15:00:01+02:00')), false);
  global.fetch = vorher;
  delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  delete process.env.TURNSTILE_SECRET_KEY;
}

const [html, css, js, adminHtml, adminJs, navJs, migration, ticketMigration, bonusMigration, managementMigration, promoterMigration, simpleTermsMigration, parentEveningMigration, comebackMigration, logoPng, vercel] = await Promise.all([
  read('kidz-gewinnspiel.html'),
  read('css/kidz-gewinnspiel.css'),
  read('js/kidz-gewinnspiel.js'),
  read('dashboard/kidz-gewinnspiel.html'),
  read('js/kidz-gewinnspiel-admin.js'),
  read('js/nav.js'),
  read('schema-phase172.sql'),
  read('schema-phase174.sql'),
  read('schema-phase179.sql'),
  read('schema-phase182.sql'),
  read('schema-phase186.sql'),
  read('schema-phase190.sql'),
  read('schema-phase191.sql'),
  read('schema-phase314-kidz-auswahl-echt.sql'),
  read('assets/images/kidz-logo-konzept.png'),
  read('vercel.json'),
]);
const flyerStat = await stat(new URL('../assets/images/kidz-sommerfest-flyer.jpg', import.meta.url));
const prizeFlyerStat = await stat(new URL('../assets/images/kidz-sommerfest-gewinnspiel-v2.png', import.meta.url));
const organizerLogoStat = await stat(new URL('../assets/images/team-wachsbleiche-petrol.jpeg', import.meta.url));

assert.match(html, /id="kgConsent"/);
assert.match(html, /id="kgParentEvening"/);
// Das Haekchen fuer KIDZ for Future ist bis zum Veranstaltungstag ausgeblendet.
assert.match(html, /id="kgParentEveningRow" hidden/);
// Derselbe Hinweis bleibt bis dahin ebenfalls verborgen. Auswahl und Erklärung
// dürfen nie unabhängig voneinander sichtbar sein.
assert.match(html, /id="kgParentEveningLegal" hidden/);
assert.match(html, /id="kgAdvisor"/);
assert.match(html, /sandro-wernicke/);
assert.match(html, /promoter-anja-scholz">Anja Scholz/);
assert.match(html, /promoter-sandra-roehrens">Sandra Röhrens/);
assert.match(html, /promoter-anika-bibrach">Anika Biebrach/);
// David Stamm ist seit dem 12.08.2026 selbst Berater und gehoert genau einmal in die
// Auswahl. Eine zusaetzliche promoter-Zeile wuerde ihn doppeln und seine Anmeldungen
// einem anderen Berater zuordnen.
assert.match(html, /"david-stamm">David Stamm/);
assert.doesNotMatch(html, /promoter-david-stamm/);
assert.match(html, /assets\/images\/kidz-logo-konzept\.png/);
assert.match(html, /id="kidzPublicMenu"/);
assert.match(html, /Flyer &amp; Gewinne/);
assert.match(html, /id="kgFlyerDialog"/);
assert.match(html, /assets\/images\/kidz-sommerfest-flyer\.jpg/);
assert.match(html, /id="kgFlyerTabEvent"/);
assert.match(html, /id="kgFlyerTabPrizes"/);
assert.match(html, /assets\/images\/kidz-sommerfest-gewinnspiel-v2\.png/);
assert.match(html, /Aktuelle Seite herunterladen/);
assert.match(html, /class="kg-footer" id="veranstalter"/);
assert.match(html, /class="kg-organizer"/);
assert.match(html, /assets\/images\/team-wachsbleiche-petrol\.jpeg/);
assert.match(html, /alt="Team Wachsbleiche · Kai Blobel &amp; Team"/);
assert.ok(flyerStat.size > 100_000);
assert.ok(prizeFlyerStat.size > 1_000_000);
assert.ok(organizerLogoStat.size > 300_000);
// Die Vorschau lädt zum Fest ein, nicht zu einem Gewinnspiel: Wer die Karte in
// WhatsApp sieht, soll den Familientag erkennen, das Gewinnspiel ist der Anlass.
assert.match(html, /property="og:title" content="Kinder-Sommerfest am 6\. September: jetzt anmelden"/);
assert.match(html, /property="og:description" content="[^"]*Hüpfburg[^"]*Eintritt frei[^"]*"/);
assert.match(html, /property="og:image" content="https:\/\/kidz\.teamwachsbleiche\.de\/assets\/images\/kidz-vorschau-gewinnspiel\.jpg"/);
assert.match(html, /property="og:image:width" content="1200"/);
assert.match(html, /property="og:image:height" content="630"/);
assert.match(html, /name="twitter:card" content="summary_large_image"/);
assert.doesNotMatch(html, /kg-brand-mark" aria-hidden="true">KIDZ/);
assert.ok(logoPng.length > 50_000);
assert.match(html, /Wir brauchen keine Angaben zu Kindern/);
assert.match(html, /Jede gültige Anmeldung bis zum 6\. September 2026 um 15 Uhr nimmt automatisch einmal an der Verlosung/);
assert.match(html, /Am 6\. September schätzen/);
assert.match(html, /Vor Ort am Ball/);
assert.match(html, /Das Survival Event geht an die genaueste Schätzung des Ballumfangs/);
assert.match(html, /entscheidet unter diesen Personen das Los/);
assert.match(html, /Wer Platz 1 erhält, nimmt nicht noch einmal an der Verlosung der weiteren Preise teil/);
assert.match(html, /wählt zwischen einem Vater-Kind-Wochenende und einer ganzen Sommercamp-Woche/);
assert.match(html, /Stand: 12\. August 2026, Fassung 5/);
assert.match(html, /id="kgGuess"/);
// Wie viele kommen mit: freiwillig, fuer die Planung.
assert.match(html, /id="kgBegleitung"/);
assert.match(html, /Kommt noch jemand mit\?/);
assert.match(html, /Kinder einfach mitzählen/);
assert.match(html, /min="10" max="999"/);
// Das Schaetzfeld bleibt sichtbar, startet aber gesperrt und ausgegraut.
assert.match(html, /id="kgGuessField" class="[^"]*is-closed|class="[^"]*is-closed[^"]*" id="kgGuessField"/);
assert.match(html, /id="kgGuess"[^>]*disabled/);
assert.match(html, /ab 6\. September/);
assert.match(html, /bis zum 6\. September zu/);
assert.doesNotMatch(html, /Doppel-Los|Doppellos|nummeriert|Losnummer/);
assert.doesNotMatch(html, /Tombola/);
assert.match(html, /Veranstalter[\s\S]*An der Wachsbleiche 1a · 03046 Cottbus/);
assert.match(html, /Veranstaltungsort[\s\S]*Kutzeburger Mühle 1 · 03051 Cottbus/);
assert.doesNotMatch(html, /Kindername|Geburtsdatum|Gesundheitsdaten/);
assert.match(css, /color-scheme:\s*light/);
assert.doesNotMatch(css, /prefers-color-scheme\s*:\s*dark/);
assert.match(css, /\.kg-menu-panel/);
assert.match(css, /\.kg-organizer img/);
assert.match(css, /\.kg-flyer-dialog::backdrop/);
assert.match(css, /\.kg-flyer-tabs/);
assert.match(css, /max-height:\s*calc\(100dvh - 216px\)/);
assert.match(js, /\/api\/kidz-register/);
assert.match(js, /\/api\/kidz-advisors/);
assert.match(js, /beraterSlug/);
assert.match(js, /promoterFallbacks/);
assert.match(js, /choice\.slug === promoter\.slug/);
assert.match(js, /facebook.*instagram.*whatsapp/);
assert.match(js, /flyerDialog\.showModal\(\)/);
assert.match(js, /showFlyerPage\('prizes'\)/);
assert.match(js, /kidz-sommerfest-gewinnspiel-v2\.png/);
assert.match(js, /parentEveningLegal\.hidden = !isEventDay/);
assert.doesNotMatch(js, /menu\.removeAttribute\('open'\)/);
assert.match(adminHtml, /Linas Arbeitsstrecke/);
assert.match(adminJs, /kidz_gewinnspiel_teilnahmen/);
assert.match(adminJs, /Eingeladen von/);
assert.match(adminJs, /empfehler:empfehler_id\(name\)/);
assert.match(adminHtml, /Alle Berater und Promoter/);
assert.match(adminHtml, /Nach Vermögensberater oder Promoter filtern/);
assert.match(adminJs, /\/api\/kidz-advisors/);
assert.match(adminJs, /appendParticipantFilterGroup\('Vermögensberater'/);
assert.match(adminJs, /appendParticipantFilterGroup\('Promoter'/);
assert.match(adminJs, /participantChoice\?\.kind === 'advisor'/);
assert.match(adminJs, /participantChoice\?\.kind === 'promoter'/);
assert.match(adminJs, /entry\.empfehler\?\.name !== participantChoice\.name/);
assert.match(adminJs, /if \(!currentAdvisor\?\.ist_admin\)/);
assert.match(adminJs, /berater-einladung/);
assert.match(adminHtml, /Zettel nacherfassen/);
assert.match(adminHtml, /id="onsiteDialog"/);
assert.match(adminHtml, /id="onsiteGuess"/);
assert.match(adminHtml, /Ohne E-Mail oder Mobilnummer geht es nicht/);
assert.match(adminHtml, /Fassung 5/);
assert.match(adminHtml, /id="guessDialog"/);
assert.match(adminHtml, /id="onsiteOnly"/);
assert.match(adminHtml, /ziehen wir unter diesen Personen zufällig/);
assert.doesNotMatch(adminHtml, /Doppel-Los|Doppellos|nummeriert|Losnummer|Nur ohne Los/);
assert.doesNotMatch(adminHtml, /Tombola/);
assert.doesNotMatch(adminJs, /issue_kidz_gewinnspiel_ticket|ticket_number|data-issue-ticket/);
assert.match(adminHtml, /Teilnahme endgültig löschen/);
assert.match(adminJs, /currentAdvisor\?\.ist_admin/);
assert.match(adminJs, /delete_kidz_gewinnspiel_participation/);
assert.match(adminJs, /\['test', 'duplicate', 'erasure_request'\]/);
assert.match(navJs, /label: 'KIDZ'/);
assert.match(navJs, /Sommerfest-Gewinnspiel/);
assert.match(navJs, /KIDZ for Future/);
assert.match(vercel, /\/kidz\/gewinnspiel/);
assert.match(vercel, /kidz\.teamwachsbleiche\.de/);
assert.match(vercel, /kidz\.kaiblobel\.de/);
assert.match(vercel, /"type":\s*"host"/);
assert.match(vercel, /"redirects"/);
assert.match(vercel, /"destination":\s*"\/kidz\/sommerfest"/);
const vercelConfig = JSON.parse(vercel);
const hasHost = (entry, host) => entry.has?.some((condition) => condition.type === 'host' && condition.value === host);
assert.ok(vercelConfig.redirects.some((entry) => (
  entry.source === '/'
  && entry.destination === '/kidz/sommerfest'
  && hasHost(entry, 'kidz.teamwachsbleiche.de')
)));
assert.ok(vercelConfig.redirects.some((entry) => (
  entry.source === '/'
  && entry.destination === 'https://kidz.teamwachsbleiche.de/kidz/sommerfest'
  && hasHost(entry, 'kidz.kaiblobel.de')
)));
assert.ok(vercelConfig.redirects.some((entry) => (
  entry.source === '/:path*'
  && entry.destination === 'https://kidz.teamwachsbleiche.de/:path*'
  && hasHost(entry, 'kidz.kaiblobel.de')
)));
assert.equal(
  vercelConfig.rewrites.some((entry) => entry.source === '/' && entry.has?.some((condition) => condition.type === 'host')),
  false,
);
assert.match(migration, /LIVE ANGEWENDET AM 11\.08\.2026 ALS phase_172_kidz_gewinnspiel/);
assert.match(migration, /force row level security/);
assert.match(migration, /revoke all on table public\.kidz_gewinnspiel_teilnahmen from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.register_kidz_gewinnspiel_public[\s\S]*to anon/);
assert.match(migration, /list_kidz_berater_public/);
assert.match(migration, /is_current_berater_admin\(\)/);
assert.doesNotMatch(migration, /empfehler\s*\(/);
assert.doesNotMatch(migration, /empfehlungen\s*\(/);
assert.match(ticketMigration, /add column if not exists ticket_number text/);
assert.match(ticketMigration, /kidz_gewinnspiel_event_ticket_unique/);
assert.match(ticketMigration, /issue_kidz_gewinnspiel_ticket/);
assert.match(ticketMigration, /issue_kidz_gewinnspiel_ticket[\s\S]*security invoker/);
assert.match(ticketMigration, /auth\.uid\(\)/);
assert.match(ticketMigration, /grant execute on function public\.issue_kidz_gewinnspiel_ticket\(uuid, text\)[\s\S]*to authenticated/);
assert.match(ticketMigration, /'facebook', 'instagram', 'whatsapp'/);
assert.match(ticketMigration, /grant update \(ticket_number, ticket_issued_at\)/);
assert.match(ticketMigration, /enforce_kidz_ticket_once/);
assert.match(bonusMigration, /LIVE ANGEWENDET AM 11\.08\.2026 ALS phase_179_kidz_bonus_hauptgewinn/);
assert.match(bonusMigration, /2026-08-11-v3/);
assert.match(bonusMigration, /security definer/);
assert.match(bonusMigration, /revoke execute on function public\.register_kidz_gewinnspiel_public/);
assert.match(managementMigration, /kidz_gewinnspiel_loeschprotokoll/);
assert.match(managementMigration, /kidz_gewinnspiel_admin_delete/);
assert.doesNotMatch(managementMigration, /berater_id = public\.current_berater_id/);
assert.match(managementMigration, /delete_kidz_gewinnspiel_participation[\s\S]*security invoker/);
assert.match(managementMigration, /is_current_berater_admin\(\)/);
assert.match(managementMigration, /extensions\.digest/);
assert.match(managementMigration, /retention_expired/);
assert.match(managementMigration, /kidz-gewinnspiel-aufbewahrungsfrist/);
assert.match(managementMigration, /2027-01-01 00:00:00\+01/);
assert.match(managementMigration, /revoke execute on function public\.cleanup_kidz_gewinnspiel_expired\(\)[\s\S]*authenticated/);
assert.match(promoterMigration, /LIVE ANGEWENDET AM 11\.08\.2026/);
assert.match(promoterMigration, /'promoter-anika-bibrach', 'Anika Biebrach'[\s\S]*where lower\(b\.slug\) = 'sven-augustin'/);
assert.match(promoterMigration, /'promoter-david-stamm', 'David Stamm'[\s\S]*where lower\(b\.slug\) = 'claudius-tusche'/);
assert.match(promoterMigration, /promoter-anika-bibrach/);
assert.match(promoterMigration, /promoter-david-stamm/);
assert.match(promoterMigration, /add column if not exists empfehler_id uuid/);
assert.match(promoterMigration, /select e\.berater_id, e\.empfehler_id/);
assert.match(promoterMigration, /reference, event_key, berater_id, empfehler_id/);
assert.match(promoterMigration, /revoke all on table public\.kidz_gewinnspiel_einladende from public, anon, authenticated/);
assert.match(promoterMigration, /kidz_gewinnspiel_einladende_berater_idx/);
assert.match(promoterMigration, /grant execute on function public\.list_kidz_berater_public\(\)[\s\S]*to anon, authenticated/);
assert.doesNotMatch(promoterMigration, /david-stamm-386wx9bs4678bs/);
assert.match(simpleTermsMigration, /LIVE ANGEWENDET AM 12\.08\.2026 ALS phase_190_kidz_teilnahme_einfach/);
assert.match(simpleTermsMigration, /2026-08-12-v4/);
assert.match(simpleTermsMigration, /security definer/);
assert.match(simpleTermsMigration, /v_source text := lower\(trim\(coalesce\(p_source, 'direkt'\)\)\);/);
assert.match(simpleTermsMigration, /revoke execute on function public\.register_kidz_gewinnspiel_public/);
assert.match(parentEveningMigration, /LIVE ANGEWENDET AM 12\.08\.2026 ALS phase_191_kidz_elternabend/);
assert.match(parentEveningMigration, /set name = 'Anika Biebrach'/);
assert.match(parentEveningMigration, /key = 'promoter-anika-bibrach'/);
assert.match(parentEveningMigration, /lower\(slug\) = 'sven-augustin'/);
assert.doesNotMatch(parentEveningMigration, /set key =/);

// Phase 314: Anika Biebrach und David Stamm standen in den Auswahllisten, aber nicht
// in der Datenbank. Wer sie waehlte, bekam invalid_advisor und war nicht angemeldet.
assert.match(comebackMigration, /'promoter-anika-bibrach', 'Anika Biebrach'[\s\S]*where slug = 'sven-augustin'/);
assert.match(comebackMigration, /delete from public\.kidz_gewinnspiel_einladende[\s\S]*where key = 'promoter-david-stamm'/);
assert.match(comebackMigration, /raise exception 'promoter-david-stamm is still present'/);
assert.match(comebackMigration, /ist_aktiv = true/);
// Zweimal anwenden darf nichts doppeln und nichts kaputtmachen.
assert.match(comebackMigration, /on conflict \(key\) do update/);
assert.match(comebackMigration, /not exists \(\s*select 1 from public\.empfehler/);
// Die Sichtbarkeit haengt allein an berater_id: Ein falscher Wert wuerde die
// Anmeldungen still im fremden Dashboard ablegen. Deshalb wird geprueft, nicht geraten.
assert.match(comebackMigration, /raise exception 'promoter-anika-bibrach is missing or assigned to the wrong advisor/);
// Zugangscodes gehoeren nicht ins Repository, sie werden erzeugt.
assert.match(comebackMigration, /gen_random_uuid\(\)/);
assert.doesNotMatch(comebackMigration, /'(?:anika-biebrach|david-stamm)-[a-z0-9]{10,}'/);

// Phase 321: Eine zweite Anmeldung ergaenzt, statt abzulehnen.
//
// Die tragende Regel ist "nur fuellen, was leer ist". Faellt sie weg, kann jeder,
// der eine fremde E-Mail kennt, die Schaetzung eines anderen ueberschreiben und
// ihm den ersten Platz nehmen. Deshalb steht sie hier unter Aufsicht.
// Geprueft wird die zuletzt angewendete Fassung. Phase 322 hat die Funktion
// erneut geschrieben, deshalb steht die Regel dort und nicht mehr nur in 321.
const nachtragMigration = await read('schema-phase322-kidz-festtag-bremse.sql');
assert.match(nachtragMigration, /v_schaetzung_neu := \(p_schaetzung_cm is not null and v_alte_schaetzung is null\)/,
  'Eine vorhandene Schaetzung muss stehen bleiben.');
assert.match(nachtragMigration, /elternabend_interesse = elternabend_interesse or coalesce\(p_elternabend_interesse, false\)/,
  'Ein gesetztes Haekchen darf nicht wieder verschwinden.');
assert.match(nachtragMigration, /'updated', true/);
// Name, Kontakt und Zuordnung bleiben unberuehrt: sonst schreibt ein Fremder den
// Eintrag eines anderen um.
assert.doesNotMatch(nachtragMigration, /set[\s\S]{0,200}name = /);
assert.doesNotMatch(nachtragMigration, /set[\s\S]{0,200}berater_id = /);

// Phase 323: Aus der Einwilligungszeile wurde eine kleine Karte.
//
// Die Karte traegt die Kennung, an der das Ausblenden haengt. Bekommt sie
// spaeter display: grid oder flex, verliert das Attribut hidden, und die
// Einladung stuende schon vor dem Fest auf der Seite. Genau das ist dem Projekt
// bei .kg-check bereits passiert.
const gewinnspielCss = await read('css/kidz-gewinnspiel.css');
assert.match(gewinnspielCss, /\.kg-evening\[hidden\]\s*\{\s*display:\s*none/,
  'Ohne diese Regel kann die Einladung vor dem Veranstaltungstag sichtbar werden.');
// Phase 334: Die Karte nennt keinen Abend mehr. KIDZ for Future ist mehr als
// der Elternabend, es geht auch um das Konzept selbst; was zu wem passt, klaert
// das Team im Gespraech.
assert.match(html, /<h3 id="kgEveningTitle">Mehr zum KIDZ-Konzept erfahren<\/h3>/);
// Phase 335: kein Kanal im Text. Das Team ruft wegen Ballumfang und Gewinnen
// ohnehin an, und am Telefon laesst sich KIDZ besser erklaeren als in einer Mail.
assert.match(html, /Ja, ich möchte einmal über KIDZ for Future informiert werden\./);
assert.doesNotMatch(html, /schickt mir einmal Informationen/);
assert.doesNotMatch(html, /Ein Abend nur für Eltern/);
assert.match(html, /um dich über KIDZ for Future zu informieren/);
// Die Dauer steht auf drei Seiten und muss dieselbe sein.
assert.match(await read('kidz-elternabend.html'), /Etwa 60 Minuten/);
assert.match(await read('kidz-konzept.html'), /<strong>60 Minuten<\/strong>/);

// Phase 324: Das Haekchen im Beraterbereich laeuft ueber die Datenbank.
//
// Phase 321 schrieb die Spalte direkt aus dem Browser und lief in eine
// Fehlermeldung: Das Aenderungsrecht ist spaltenweise vergeben, und
// elternabend_interesse steht nicht darin. Aufgefallen ist das erst, als Kai
// den Knopf am Vorabend des Fests wirklich gedrueckt hat. Diese Zusicherungen
// halten den reparierten Weg fest.
const interesseMigration = await read('schema-phase324-kidz-interesse-nachtragen.sql');
assert.match(interesseMigration, /create or replace function public\.set_kidz_gewinnspiel_interesse/);
assert.match(interesseMigration, /security definer/);
assert.match(interesseMigration, /public\.current_berater_id\(\)/);
assert.match(interesseMigration, /public\.is_current_berater_admin\(\)/);
assert.match(interesseMigration, /revoke execute on function public\.set_kidz_gewinnspiel_interesse\(uuid, boolean\)[\s\S]*from public, anon, service_role/);
assert.match(interesseMigration, /grant execute on function public\.set_kidz_gewinnspiel_interesse\(uuid, boolean\)[\s\S]*to authenticated/);
// Der kurze Weg bleibt zu: mit einem Spaltenrecht koennte der Browser die
// Einwilligung frei schreiben, und der einzige Schutz waere die Oberflaeche.
// Geprueft wird der Code ohne Kommentarzeilen. Der Kopfkommentar der Migration
// nennt den kurzen Weg absichtlich, um zu erklaeren, warum er nicht gegangen
// wird; ein Waechter, der darauf anspringt, zwingt dazu, die Begruendung zu
// loeschen.
const interesseCode = interesseMigration.replace(/^--.*$/gm, '');
assert.doesNotMatch(interesseCode, /grant update \(elternabend_interesse/);
// Ausser dieser einen Spalte darf die Funktion nichts anfassen.
assert.doesNotMatch(interesseCode, /set[\s\S]{0,120}name = /);
assert.doesNotMatch(interesseCode, /set[\s\S]{0,120}berater_id = /);
assert.doesNotMatch(interesseMigration, /set[\s\S]{0,120}schaetzung_cm = /);

assert.match(adminJs, /supabase\.rpc\('set_kidz_gewinnspiel_interesse'/);
assert.doesNotMatch(adminJs, /update\(\{ elternabend_interesse/,
  'Das direkte Schreiben der Einwilligung aus dem Browser scheitert am Spaltenrecht.');

// Phase 333: Am Festtag sieht jeder Berater alle Anmeldungen des Sommerfests.
//
// Die Freigabe ist bewusst doppelt begrenzt. Faellt eine der beiden Schranken
// weg, oeffnet sich still das ganze Portal fuer jeden mit Beraterkonto.
const teamSicht = (await read('schema-phase333-kidz-team-sicht.sql'))
  .replace(/^--.*$/gm, '');
for (const regel of ['kidz_gewinnspiel_team_select_sommerfest', 'kidz_gewinnspiel_team_update_sommerfest']) {
  assert.match(teamSicht, new RegExp(`create policy ${regel}`));
}
// Schranke 1: nur dieses Fest. Zweimal fuer select, zweimal fuer update
// (using und with check).
assert.equal((teamSicht.match(/event_key = 'kidz-sommerfest-2026'/g) || []).length, 3,
  'Jede der drei Bedingungen muss auf das Sommerfest eingegrenzt sein.');
// Schranke 2: nur mit aktivem Beraterkonto.
assert.equal((teamSicht.match(/current_berater_id\(\) is not null/g) || []).length, 3,
  'Ohne Beraterkonto darf niemand die Liste sehen.');
// Das Loeschen wird nicht angefasst: Am Stand wird eingetragen, nicht entfernt.
assert.doesNotMatch(teamSicht, /kidz_gewinnspiel_admin_delete/,
  'Die Loeschregel darf hier nicht auftauchen.');
assert.doesNotMatch(teamSicht, /for delete/);

// Phase 337: Der gruene Haken verschwindet, wenn das Gewinnspiel zu ist. Auch
// hier gilt: hidden verliert gegen display: grid, die Regel ist Pflicht.
assert.match(css, /\.kg-success > div\[hidden\]\s*\{\s*display:\s*none/,
  'Ohne diese Regel bleibt der Erfolgshaken ueber dem Abschlusshinweis stehen.');
assert.match(html, /id="kgSuccessMark"/);
assert.match(js, /kgSuccessMark[\s\S]{0,80}hidden = true/);

const adminCss = await read('css/kidz-gewinnspiel-admin.css');

// Phase 340: Das Auswahlfeld erschien nicht, weil die Beraterliste erst nach
// dem Zeichnen geladen wurde. Diese beiden Zusicherungen halten die Reihenfolge
// fest. Sie sind Textmuster, kein Browser-Test: Sie fangen genau diesen
// Rueckfall und sonst nichts.
assert.match(adminJs, /async function ladeBeraterAuswahl/);
assert.ok(
  adminJs.indexOf('await ladeBeraterAuswahl()') > -1
    && adminJs.indexOf('await ladeBeraterAuswahl()') < adminJs.indexOf('loadEntries(),'),
  'Die Beraterliste muss vor dem Zeichnen der Teilnahmen geladen werden, sonst fehlt das Auswahlfeld.',
);
// Und sie muss abgewartet werden. Nebenher gestartet heisst nicht vorher fertig.
assert.doesNotMatch(adminJs, /Promise\.all\(\[\s*ladeBeraterAuswahl\(\)/,
  'ladeBeraterAuswahl darf nicht nebenher laufen, sondern muss fertig sein.');
// Sicherheitsnetz: Wird die Liste doch erst im Filteraufbau gefuellt, muss
// danach neu gezeichnet werden.
assert.match(adminJs, /appendParticipantFilterGroup\('Promoter'[\s\S]{0,400}render\(\);/);

// Phase 338: Die Zuordnung laesst sich von Hand aendern, aber nur von
// Administratoren. Ein Spaltenrecht auf berater_id waere hier die falsche
// Antwort: Damit koennte sich jeder Berater fremde Kontakte zuschreiben.
const zuordnung = (await read('schema-phase338-kidz-zuordnung-aendern.sql'))
  .replace(/^--.*$/gm, '');
assert.match(zuordnung, /create or replace function public\.set_kidz_gewinnspiel_berater/);
assert.match(zuordnung, /security definer/);
assert.match(zuordnung, /public\.is_current_berater_admin\(\)/);
assert.match(zuordnung, /revoke execute on function public\.set_kidz_gewinnspiel_berater\(uuid, text\)[\s\S]*from public, anon, service_role/);
assert.doesNotMatch(zuordnung, /grant update \(berater_id/,
  'Der kurze Weg ueber ein Spaltenrecht bleibt zu.');
// Wer eingeladen hat, ist Geschichte und wird von einer Umverteilung nicht
// ueberschrieben. Sonst verlieren die Promoter die Zurechnung ihrer Arbeit.
assert.doesNotMatch(zuordnung, /set[\s\S]{0,120}empfehler_id = /,
  'empfehler_id darf beim Umhaengen nicht angefasst werden.');
// Der Slug wird gegen public.berater aufgeloest, nicht gegen die Einladenden:
// Ein Promoter laedt ein, er betreut nicht.
assert.match(zuordnung, /from public\.berater b[\s\S]{0,120}ist_aktiv/);
assert.doesNotMatch(zuordnung, /kidz_gewinnspiel_einladende/);

assert.match(adminJs, /supabase\.rpc\('set_kidz_gewinnspiel_berater'/);
assert.doesNotMatch(adminJs, /update\(\{ berater_id/,
  'Die Zuordnung darf nicht direkt aus dem Browser geschrieben werden.');
// Das Auswahlfeld erscheint nur fuer Administratoren.
assert.match(adminJs, /ist_admin[\s\S]{0,120}return `<strong>\$\{escapeHtml\(name\)\}<\/strong>`/);

// Die Falle mit hidden gilt auch hier: der Vermerk an der Karte ist ein span,
// und fuer span steht weiter oben display: block.
assert.match(adminCss, /\.kg-admin-entry span\[hidden\]\s*\{\s*display:\s*none/,
  'Ohne diese Regel steht der Vermerk dauerhaft an jeder Karte.');

// Phase 336: Anmeldeschluss, und die Sicht wieder eng.
const schlussMigration = (await read('schema-phase336-kidz-anmeldeschluss.sql'))
  .replace(/^--.*$/gm, '');

// Der Schluss steht in der Registrierfunktion, und zwar VOR den Ratenzaehlern:
// nach dem Schluss soll nicht einmal mehr ein Zaehlerstand mitgeschrieben werden.
assert.match(schlussMigration, /v_anmeldeschluss constant timestamptz := timestamptz '2026-09-06 15:00:00\+02'/);
assert.match(schlussMigration, /'reason', 'closed'/);
assert.ok(
  schlussMigration.indexOf("'reason', 'closed'")
    < schlussMigration.indexOf("rate_limit_check_key('kidz_giveaway_hour'"),
  'Die Schranke muss vor den Ratenzaehlern stehen.',
);

// Die Papierzettel werden noch abgetippt. Dieser Weg darf vom Schluss nicht
// mitgetroffen werden, sonst ist die Arbeit eines ganzen Festtags verloren.
assert.doesNotMatch(schlussMigration, /record_kidz_gewinnspiel_onsite/,
  'Die Nacherfassung der Papierzettel darf hier nicht auftauchen.');

// Die erweiterte Sicht vom Festtag kommt weg, die Grundregeln bleiben stehen.
assert.match(schlussMigration, /drop policy if exists kidz_gewinnspiel_team_select_sommerfest/);
assert.match(schlussMigration, /drop policy if exists kidz_gewinnspiel_team_update_sommerfest/);
assert.doesNotMatch(schlussMigration, /drop policy if exists kidz_gewinnspiel_berater_select/,
  'Die Grundregel fuer die eigene Sicht darf nicht mit geloescht werden.');
assert.doesNotMatch(schlussMigration, /drop policy if exists kidz_gewinnspiel_admin_delete/);

// Und das Haekchen gilt wieder nur an eigenen Anmeldungen.
assert.doesNotMatch(schlussMigration, /v_event <> 'kidz-sommerfest-2026'/,
  'Die Sommerfest-Sonderregel muss aus der Interesse-Funktion raus sein.');

// Phase 359: Noch einmal sieht jeder Berater alle Sommerfest-Anmeldungen, aber
// nur sehen und nur bis Montag, 14.09.2026. Faellt eine der drei Schranken weg,
// bleibt die Liste still fuer jeden mit Beraterkonto offen.
const befristet = (await read('schema-phase359-kidz-team-sicht-befristet.sql'))
  .replace(/^--.*$/gm, '');
assert.match(befristet, /create policy kidz_gewinnspiel_team_select_befristet[\s\S]{0,120}for select/);
assert.match(befristet, /current_berater_id\(\) is not null/);
assert.match(befristet, /event_key = 'kidz-sommerfest-2026'/);
assert.match(befristet, /now\(\) < timestamptz '2026-09-15 00:00:00\+02'/,
  'Ohne Ablaufdatum bleibt die Freigabe fuer immer stehen.');
// Nur Sehen. Schreiben, Haekchen und Loeschen bleiben so, wie Phase 336 sie
// zurueckgesetzt hat.
assert.doesNotMatch(befristet, /for (update|delete|insert|all)/);
assert.doesNotMatch(befristet, /set_kidz_gewinnspiel_interesse/);

// Die Seite muss sagen, was passiert ist, statt pauschal "Du bist dabei".
const gewinnspielJs = await read('js/kidz-gewinnspiel.js');
assert.match(gewinnspielJs, /function erfolgsMeldung/);
assert.match(gewinnspielJs, /result\?\.updated !== true/);
assert.match(gewinnspielJs, /guessKept/);

// Phase 322: Die Bremse pro Anschluss passt zum Festgelaende, wo sich viele
// Besucher eine Adresse teilen. Die Grenze pro Kontakt bleibt, sie ist der
// eigentliche Schutz gegen Massenanmeldungen.
assert.match(nachtragMigration, /'kidz_giveaway_hour', p_rate_key, 60,/);
assert.match(nachtragMigration, /'kidz_giveaway_day', p_rate_key, 300,/);
assert.match(nachtragMigration, /'kidz_giveaway_contact_day', p_contact_key, 3,/,
  'Die Grenze je Kontakt darf nicht mitgelockert werden.');
// Das Schaetzfenster bleibt der 6. September, es wurde nur die Bremse angefasst.
assert.match(nachtragMigration, /2026-09-06 00:00:00\+02/);

console.log('kidz-gewinnspiel: OK');

// Phase 346: Nach dem Anmeldeschluss steht oben ein fester Hinweis, bevor jemand
// die Werbung für die Anmeldung liest. Er führt zur Auflösung auf dem Rückblick.
assert.ok(html.indexOf('class="kg-beendet"') > -1, 'Hinweis "Anmeldung beendet" fehlt');
assert.ok(html.indexOf('class="kg-beendet"') < html.indexOf('class="kg-hero"'), 'Hinweis muss vor dem Kopf stehen');
assert.match(html, /href="\/kidz\/sommerfest#gewinnspiel">Zur Auflösung</);
