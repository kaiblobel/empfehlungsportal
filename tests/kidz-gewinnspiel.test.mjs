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
  assert.deepEqual(JSON.parse(successResponse.body), { ok: true, reference: 'KIDZ-ABC12345' });
  assert.equal(requests.length, 2);
  const rpcBody = JSON.parse(requests[1].options.body);
  assert.equal(rpcBody.p_event_key, 'kidz-sommerfest-2026');
  assert.equal(rpcBody.p_berater_slug, 'sandro-wernicke');
  assert.equal(rpcBody.p_elternabend_interesse, true);
  assert.equal(rpcBody.p_conditions_version, '2026-08-12-v4');
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
      { name: 'Anika Bibrach', slug: 'promoter-anika-bibrach' },
      { name: 'David Stamm', slug: 'promoter-david-stamm' },
    ],
  });
  const advisorsResponse = responseMock();
  await advisorsHandler({ method: 'GET' }, advisorsResponse);
  assert.equal(advisorsResponse.statusCode, 200);
  assert.equal(JSON.parse(advisorsResponse.body).advisors[1].slug, 'sandro-wernicke');
  assert.equal(JSON.parse(advisorsResponse.body).advisors[2].slug, 'promoter-anika-bibrach');
} finally {
  global.fetch = originalFetch;
  if (originalRegistrationSecret === undefined) delete process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET;
  else process.env.KIDZ_GIVEAWAY_REGISTRATION_SECRET = originalRegistrationSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
  if (originalTurnstileSiteKey === undefined) delete process.env.TURNSTILE_SITE_KEY;
  else process.env.TURNSTILE_SITE_KEY = originalTurnstileSiteKey;
}

const [html, css, js, adminHtml, adminJs, navJs, migration, ticketMigration, bonusMigration, managementMigration, promoterMigration, simpleTermsMigration, logoSvg, vercel] = await Promise.all([
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
  read('assets/images/kidz-marke.svg'),
  read('vercel.json'),
]);
const flyerStat = await stat(new URL('../assets/images/kidz-sommerfest-flyer.jpg', import.meta.url));
const prizeFlyerStat = await stat(new URL('../assets/images/kidz-sommerfest-gewinnspiel-v2.png', import.meta.url));
const organizerLogoStat = await stat(new URL('../assets/images/team-wachsbleiche-petrol.jpeg', import.meta.url));

assert.match(html, /id="kgConsent"/);
assert.match(html, /id="kgParentEvening"/);
assert.match(html, /id="kgAdvisor"/);
assert.match(html, /sandro-wernicke/);
assert.match(html, /promoter-anika-bibrach">Anika Bibrach/);
assert.match(html, /promoter-david-stamm">David Stamm/);
assert.match(html, /assets\/images\/kidz-marke\.svg/);
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
assert.match(html, /property="og:title" content="Großes KIDZ Sommerfest-Gewinnspiel!"/);
assert.match(html, /property="og:image" content="https:\/\/kidz\.teamwachsbleiche\.de\/assets\/images\/kidz-sommerfest-gewinnspiel-v2\.png"/);
assert.match(html, /property="og:image:width" content="1086"/);
assert.match(html, /property="og:image:height" content="1448"/);
assert.match(html, /name="twitter:card" content="summary_large_image"/);
assert.doesNotMatch(html, /kg-brand-mark" aria-hidden="true">KIDZ/);
assert.match(logoSvg, /<text[^>]*>KIDZ<\/text>/);
assert.doesNotMatch(logoSvg, /Wagen|Lok|<path|<rect/);
assert.match(html, /Wir brauchen keine Angaben zu Kindern/);
assert.match(html, /automatisch einmal an der Verlosung/);
assert.match(html, /Vor Ort ein Los erhalten/);
assert.match(html, /Eine vorherige Online-Anmeldung ist dafür nicht erforderlich/);
assert.match(html, /Wer den Hauptgewinn erhält, nimmt nicht noch einmal an der Online-Verlosung teil/);
assert.doesNotMatch(html, /Doppel-Los|Doppellos|nummeriert|Losnummer/);
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
assert.match(adminHtml, /Das Los wird nicht im Portal erfasst/);
assert.doesNotMatch(adminHtml, /Doppel-Los|Doppellos|nummeriert|Losnummer|Nur ohne Los/);
assert.doesNotMatch(adminJs, /issue_kidz_gewinnspiel_ticket|ticket_number|data-issue-ticket/);
assert.match(adminHtml, /Teilnahme endgültig löschen/);
assert.match(adminJs, /currentAdvisor\?\.ist_admin/);
assert.match(adminJs, /delete_kidz_gewinnspiel_participation/);
assert.match(adminJs, /\['test', 'duplicate', 'erasure_request'\]/);
assert.match(navJs, /KIDZ Gewinnspiel/);
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
assert.match(promoterMigration, /'promoter-anika-bibrach', 'Anika Bibrach'[\s\S]*where lower\(b\.slug\) = 'sven-augustin'/);
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
assert.match(simpleTermsMigration, /VORBEREITET, NOCH NICHT LIVE ANGEWENDET/);
assert.match(simpleTermsMigration, /2026-08-12-v4/);
assert.match(simpleTermsMigration, /security definer/);
assert.match(simpleTermsMigration, /revoke execute on function public\.register_kidz_gewinnspiel_public/);

console.log('kidz-gewinnspiel: OK');
