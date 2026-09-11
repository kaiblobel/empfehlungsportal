import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const registerHandler = require('../api/kidz-elternabend-register.js');
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
      host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': '203.0.113.70',
    },
    body,
    ...overrides,
  };
}

const validBody = {
  name: 'Maria Beispiel',
  email: 'maria@example.test',
  telefon: '',
  source: 'elternabend-qr',
  timePreference: 'werktag-abends',
  question: 'Wie bleiben wir beim Sparen flexibel?',
  beraterSlug: 'promoter-anja-scholz',
  captchaToken: 'captcha-token',
  consent: true,
};

const originalFetch = global.fetch;
const originalRegistrationSecret = process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;

process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET = 'test-parent-evening-registration-secret';
process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';

try {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
    return { ok: true, text: async () => JSON.stringify({ ok: true, reference: 'KIDZ-EA-AB12CD34' }) };
  };

  const successResponse = responseMock();
  await registerHandler(request(validBody), successResponse);
  assert.equal(successResponse.statusCode, 201);
  assert.deepEqual(JSON.parse(successResponse.body), { ok: true, reference: 'KIDZ-EA-AB12CD34' });
  assert.equal(requests.length, 2);
  const rpcBody = JSON.parse(requests[1].options.body);
  assert.equal(rpcBody.p_event_key, 'kidz-elternabend-warteliste-2026');
  assert.equal(rpcBody.p_berater_slug, 'promoter-anja-scholz');
  assert.equal(rpcBody.p_source, 'elternabend-qr');
  assert.equal(rpcBody.p_time_preference, 'werktag-abends');
  assert.equal(rpcBody.p_conditions_version, '2026-08-12-v1');
  assert.match(rpcBody.p_rate_key, /^[0-9a-f]{64}$/);
  assert.match(rpcBody.p_contact_key, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(requests[1].options.body, /203\.0\.113\.70/);
  assert.doesNotMatch(requests[1].options.body, /Kindername|Geburtsdatum/);

  const invalidResponse = responseMock();
  await registerHandler(request({ ...validBody, email: '', telefon: '', captchaToken: '' }), invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(JSON.parse(invalidResponse.body).reason, 'invalid_contact');

  const foreignOriginResponse = responseMock();
  await registerHandler(request(validBody, {
    headers: { host: 'localhost:3000', origin: 'https://example.org' },
  }), foreignOriginResponse);
  assert.equal(foreignOriginResponse.statusCode, 403);

  delete process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET;
  const unavailableResponse = responseMock();
  await registerHandler(request(validBody), unavailableResponse);
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(JSON.parse(unavailableResponse.body).reason, 'not_configured');
} finally {
  global.fetch = originalFetch;
  if (originalRegistrationSecret === undefined) delete process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET;
  else process.env.KIDZ_PARENT_EVENING_REGISTRATION_SECRET = originalRegistrationSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
}

const [html, css, publicJs, adminHtml, adminJs, navJs, migration, vercel, sommerfestHtml] = await Promise.all([
  read('kidz-elternabend.html'),
  read('css/kidz-elternabend.css'),
  read('js/kidz-elternabend.js'),
  read('dashboard/kidz-elternabend.html'),
  read('js/kidz-elternabend-admin.js'),
  read('js/nav.js'),
  read('schema-phase191.sql'),
  read('vercel.json'),
  read('kidz-sommerfest.html'),
]);
const qrPngStat = await stat(new URL('../assets/qr/kidz-elternabend.png', import.meta.url));
const qrSvgStat = await stat(new URL('../assets/qr/kidz-elternabend.svg', import.meta.url));
const ogImageStat = await stat(new URL('../assets/images/kidz-vorschau-elternabend.jpg', import.meta.url));

assert.match(html, /KIDZ for Future/);
// Seit der Angleichung an die Konzeptseite (11.09.2026): eine Hauptaktion, Rahmen direkt
// sichtbar, Begrüßung je Herkunft, keine künstliche Verknappung.
assert.match(html, /Der Elternabend zur Zukunft deines Kindes\./);
assert.match(html, /id="keaGreeting"/);
// Kopfzeile wie auf der Konzeptseite: oben der Leitsatz, "KIDZ for Future" nur im Knopf.
assert.match(html, /<strong>Kinderleicht in die Zukunft<\/strong><small>Team Wachsbleiche<\/small>/);
assert.match(html, /class="kea-header-cta" href="#anmeldung">KIDZ for Future vormerken</);
assert.match(html, /id="keaMobileCta" href="#anmeldung" hidden>KIDZ for Future vormerken</);
assert.match(publicJs, /watchMobileCta\(\);/);
// Kais Regel vom 11.09.2026: Auf der allgemeinen Seite ist kein Berater zu sehen. Eine
// Person erscheint nur über den persönlichen Anmeldelink (?berater=…), und dann genau die.
assert.match(html, /<section class="kea-section kea-host" id="gastgeber" aria-labelledby="keaHostTitle" hidden>/);
assert.match(html, /<a href="#gastgeber" id="keaNavHost" hidden>/);
assert.doesNotMatch(html, /kai-portrait\.jpg/);
assert.match(html, /<img data-bb="foto" alt=""/);
assert.match(publicJs, /getBeraterPublicBySlug\(slug\)/);
assert.match(publicJs, /applyBeraterBrand\(berater\)/);
assert.match(publicJs, /!slug\.startsWith\('promoter-'\)/);
assert.match(publicJs, /loadInvitingAdvisor\(\);/);
// Themenkacheln: Liniensymbole statt Schriftzeichen (€, +, ◇), kompakt mit Symbol links.
for (const thema of ['geld', 'gesundheit', 'absicherung']) {
  assert.match(html, new RegExp(`<span class="kea-topic-icon kea-topic-icon-${thema}" aria-hidden="true"></span>`));
  assert.match(css, new RegExp(`\\.kea-topics \\.kea-topic-icon-${thema} \\{ background-image: url\\("data:image/svg\\+xml,`));
}
assert.match(css, /\.kea-topic \{ display: grid; grid-template-columns: 44px minmax\(0, 1fr\);/);
// Einziger Auszug aus der Konzeptseite: § 12 im Wortlaut, mit Sprung zum Abschnitt dort.
// Er ersetzt den früheren Knopf "Zum ganzen KIDZ-Konzept" (Kai, 11.09.2026).
assert.match(html, /<section class="kea-law" id="gesetz" aria-labelledby="keaLawTitle">/);
assert.match(html, /„Die Leistungen müssen ausreichend, zweckmäßig und wirtschaftlich sein; sie dürfen das Maß des Notwendigen nicht überschreiten\.“/);
assert.match(html, /href="\/kidz\/konzept#luecke"/);
assert.doesNotMatch(html, /Zum ganzen KIDZ-Konzept|class="kea-more"/);
assert.ok(html.indexOf('id="gesetz"') < html.indexOf('id="anmeldung"'));
// "Und danach?" gehört allen, deshalb steht es bei den Themen und nicht beim Berater.
assert.ok(html.indexOf('<strong>Und danach?</strong>') < html.indexOf('id="gastgeber"'));
assert.match(publicJs, /'sommerfest-danke': 'Schön, dass ihr beim Sommerfest dabei wart\.'/);
assert.match(publicJs, /showGreeting\(\);/);
assert.match(html, /class="kea-button kea-button-primary" href="#anmeldung">Unverbindlich vormerken</);
assert.match(html, /id="keaSubmit" type="submit" disabled>Unverbindlich vormerken</);
assert.match(publicJs, /const SUBMIT_LABEL = 'Unverbindlich vormerken';/);
assert.match(html, /<dd>Kostenlos<\/dd>/);
assert.match(html, /<dd>Wird noch bekannt gegeben<\/dd>/);
// Jede Rahmen-Kachel trägt ein Liniensymbol aus Lucide, keine Emojis (Kai, 11.09.2026).
for (const fakt of ['dauer', 'kosten', 'rahmen', 'termin']) {
  assert.match(html, new RegExp(`<div class="kea-fact-${fakt}"><dt>`));
  assert.match(css, new RegExp(`\\.kea-facts \\.kea-fact-${fakt}::before \\{ background-image: url\\("data:image/svg\\+xml,`));
}
// Nur echte Emoji-Darstellung zählt; typografische Zeichen wie ✓ oder → sind erlaubt.
assert.doesNotMatch(html, /[\p{Emoji_Presentation}\u{FE0F}]/u);
assert.match('Dauer 🕒', /[\p{Emoji_Presentation}\u{FE0F}]/u);
assert.doesNotMatch(html, /[Ee]xklusiv|Maximal 15|zuerst an die Vormerkliste|Platz vormerken/);
// "E-Mail oder Mobilnummer genügt" steht VOR den beiden Kontaktfeldern.
assert.ok(html.indexOf('E-Mail oder Mobilnummer genügt.') > 0
  && html.indexOf('E-Mail oder Mobilnummer genügt.') < html.indexOf('id="keaEmail"'));
// Das Desktop-Bild liegt als Web-Kopie im Projekt und ist unter 250 KB.
const heroImageStat = await stat(new URL('../assets/images/kidz-heuwagen-960.webp', import.meta.url));
assert.ok(heroImageStat.size <= 250 * 1024, `Einstiegsbild ist ${Math.round(heroImageStat.size / 1024)} KB gross`);
assert.match(html, /kidz-heuwagen-640\.webp 640w, \/assets\/images\/kidz-heuwagen-960\.webp 960w/);
assert.match(html, /id="keaForm"/);
assert.match(html, /id="keaAdvisor"/);
assert.match(html, /promoter-anja-scholz">Anja Scholz/);
assert.match(html, /promoter-sandra-roehrens">Sandra Röhrens/);
assert.match(html, /promoter-anika-bibrach">Anika Biebrach/);
// David Stamm ist seit dem 12.08.2026 selbst Berater und gehoert genau einmal in die
// Auswahl. Eine zusaetzliche promoter-Zeile wuerde ihn doppeln und seine Anmeldungen
// einem anderen Berater zuordnen.
assert.match(html, /"david-stamm">David Stamm/);
assert.doesNotMatch(html, /promoter-david-stamm/);
// Kais Regel vom 11.09.2026: Verkaufswörter kommen auf der Seite gar nicht vor, auch nicht
// verneint ("keine Produktshow", "kein Verkaufstermin", "ohne Abschlussdruck"). Wer so etwas
// abstreitet, bringt den Gedanken erst mit. Dazu keine Füllwörter, die nichts sagen.
// Ausgenommen ist nur der Datenschutztext unten, der "keine Einwilligung in allgemeine
// Werbung" rechtlich festhält; deshalb wird er vor der Prüfung herausgenommen.
const sichtbarOhneRechtstext = html
  .replace(/<section class="kea-section kea-legal"[\s\S]*?<\/section>/, '')
  .replace(/<!--[\s\S]*?-->/g, '');
assert.doesNotMatch(sichtbarOhneRechtstext,
  /verkauf|produktshow|abschluss|kaufdruck|kein kauf|werbe|werbung|in ruhe|verständlich|klarheit|orientierung|einblicke|exklusiv|ganz offen/i);
assert.match(html, /Wir fragen nichts über deine Kinder und nutzen deine Angaben nur für diesen Elternabend\./);
assert.match(html, /<strong>Und danach\?<\/strong> Du entscheidest selbst, ob du ein persönliches Gespräch möchtest\./);
assert.match(html, /Ich bin volljährig und möchte für den nächsten Termin von KIDZ for Future vorgemerkt werden\./);
assert.match(html, /keine Gewinnspielteilnahme, keine Kundenanfrage und keine Einwilligung in allgemeine Werbung/);
assert.match(html, /property="og:image:width" content="1200"/);
assert.match(html, /property="og:image:height" content="630"/);
assert.match(html, /kidz-vorschau-elternabend\.jpg/);
// Bis zum Fest am 06.09.2026 verlinkte die Sommerfest-Seite bewusst nicht auf den
// Elternabend, sie lief als eigene Kampagne. Seit Phase 346 ist sie der Rückblick und
// führt, wie die Dankesmail an die Familien, mit derselben Herkunft zum Vormerken.
assert.match(sommerfestHtml, /href="\/kidz\/elternabend\?quelle=sommerfest-danke"/);
assert.match(publicJs, /'sommerfest-danke'/);
assert.match(css, /color-scheme:\s*light/);
assert.match(css, /@media \(max-width:\s*640px\)/);

assert.match(publicJs, /\/api\/kidz-elternabend-register/);
assert.match(publicJs, /\/api\/kidz-advisors/);
assert.match(publicJs, /elternabend-qr/);
assert.match(publicJs, /beraterSlug/);
assert.match(publicJs, /captchaToken/);

assert.match(adminHtml, /Linas Strecke KIDZ for Future/);
assert.match(adminHtml, /alle Vormerkungen sofort und getrennt vom Sommerfest-Gewinnspiel/);
assert.match(adminHtml, /Alle Berater und Promoter/);
assert.match(adminHtml, /assets\/qr\/kidz-elternabend\.svg/);
assert.match(adminJs, /kidz_elternabend_anmeldungen/);
assert.match(adminJs, /postgres_changes/);
assert.match(adminJs, /appendParticipantFilterGroup\('Vermögensberater'/);
assert.match(adminJs, /appendParticipantFilterGroup\('Promoter'/);
assert.match(adminJs, /currentAdvisor\?\.ist_admin/);
assert.match(adminJs, /KIDZ for Future Vormerkungen/);

assert.match(navJs, /label: 'KIDZ'/);
assert.match(navJs, /dashboard\/kidz-elternabend\.html/);
assert.match(vercel, /"source": "\/kidz\/elternabend"/);
assert.match(vercel, /"destination": "\/kidz-elternabend\.html"/);

assert.match(migration, /create table if not exists public\.kidz_elternabend_anmeldungen/);
assert.match(migration, /enable row level security/);
assert.match(migration, /force row level security/);
assert.match(migration, /current_berater_id\(\) or public\.is_current_berater_admin\(\)/);
assert.match(migration, /grant update \(status, scheduled_for, contacted_at\)/);
assert.match(migration, /alter publication supabase_realtime add table public\.kidz_elternabend_anmeldungen/);
assert.match(migration, /register_kidz_elternabend_public/);
assert.match(migration, /kidz_parent_evening_registration/);
assert.match(migration, /rate_limit_check_key/);
assert.match(migration, /revoke execute[\s\S]*from public, anon, authenticated, service_role/);
assert.match(migration, /grant execute[\s\S]*to anon/);
assert.match(migration, /set name = 'Anika Biebrach'/);
assert.doesNotMatch(migration, /set key =/);

assert.ok(qrPngStat.size > 4_000);
assert.ok(qrSvgStat.size > 20_000);
// Nicht zu gross: WhatsApp laedt Vorschaubilder nur bis etwa 300 KB.
assert.ok(ogImageStat.size > 20_000 && ogImageStat.size <= 300 * 1024,
  `Vorschaubild ist ${Math.round(ogImageStat.size / 1024)} KB gross`);
