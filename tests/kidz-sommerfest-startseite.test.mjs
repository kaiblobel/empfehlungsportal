import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, js, vercel] = await Promise.all([
  read('kidz-sommerfest.html'),
  read('css/kidz-sommerfest.css'),
  read('js/kidz-sommerfest.js'),
  read('vercel.json'),
]);

const eventFlyer = await stat(new URL('../assets/images/kidz-sommerfest-flyer.jpg', import.meta.url));
const prizeFlyer = await stat(new URL('../assets/images/kidz-sommerfest-gewinnspiel-v2.png', import.meta.url));
const organizerLogo = await stat(new URL('../assets/images/team-wachsbleiche-petrol.jpeg', import.meta.url));
const factIcons = await Promise.all([
  'kidz-calendar.svg',
  'kidz-clock.svg',
  'kidz-location.svg',
  'kidz-ticket.svg',
].map((name) => stat(new URL(`../assets/icons/${name}`, import.meta.url))));
const vercelConfig = JSON.parse(vercel);
const hasHost = (entry, host) => entry.has?.some((condition) => condition.type === 'host' && condition.value === host);

const eventIndex = html.indexOf('id="sommerfest"');
const prizeIndex = html.indexOf('id="gewinnspiel"');
const registrationIndex = html.indexOf('3 · Die Anmeldung');

assert.ok(eventIndex >= 0);
assert.ok(prizeIndex > eventIndex);
assert.ok(registrationIndex > prizeIndex);
assert.match(html, /Kinder-Sommerfest für die ganze Familie/);
assert.match(html, /6\. September 2026/);
assert.match(html, /10:00 bis 15:00 Uhr/);
assert.match(html, /Kutzeburger Mühle/);
assert.match(html, /Eintritt kostenlos/);
assert.match(html, /class="kf-fact kf-fact-date"/);
assert.match(html, /class="kf-fact kf-fact-time"/);
assert.match(html, /class="kf-fact kf-fact-place"/);
assert.match(html, /class="kf-fact kf-fact-free"/);
assert.match(html, /assets\/icons\/kidz-calendar\.svg/);
assert.match(html, /assets\/icons\/kidz-clock\.svg/);
assert.match(html, /assets\/icons\/kidz-location\.svg/);
assert.match(html, /assets\/icons\/kidz-ticket\.svg/);
assert.match(html, /assets\/images\/kidz-sommerfest-flyer\.jpg/);
assert.match(html, /assets\/images\/kidz-sommerfest-gewinnspiel-v2\.png/);
assert.match(html, /Jetzt kostenlos anmelden/);
assert.match(html, /data-registration-link/);
assert.match(html, /class="kf-footer" id="veranstalter"/);
assert.match(html, /class="kf-organizer"/);
assert.match(html, /assets\/images\/team-wachsbleiche-petrol\.jpeg/);
assert.match(html, /alt="Team Wachsbleiche · Kai Blobel &amp; Team"/);
assert.match(html, /property="og:image" content="https:\/\/kidz\.teamwachsbleiche\.de\/assets\/images\/kidz-sommerfest-flyer\.jpg"/);
assert.match(html, /property="og:image:width" content="904"/);
assert.match(html, /property="og:image:height" content="1280"/);
assert.ok(eventFlyer.size > 400_000);
assert.ok(prizeFlyer.size > 2_000_000);
assert.ok(organizerLogo.size > 300_000);
assert.ok(factIcons.every((icon) => icon.size > 300));

assert.match(css, /\.kf-section-event/);
assert.match(css, /\.kf-section-prizes/);
assert.match(css, /\.kf-section-register/);
assert.match(css, /\.kf-fact-icon img/);
assert.match(css, /grid-template-columns: repeat\(4, 1fr\)/);
assert.match(css, /grid-template-columns: 1fr 1fr/);
assert.match(css, /\.kf-organizer img/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.doesNotMatch(css, /prefers-color-scheme\s*:\s*dark/);

assert.match(js, /ALLOWED_SOURCES/);
assert.match(js, /SAFE_SLUG/);
assert.match(js, /data-registration-link/);
assert.match(js, /target\.searchParams\.set\('quelle'/);
assert.match(js, /target\.searchParams\.set\('berater'/);
assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie/);

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
assert.ok(vercelConfig.rewrites.some((entry) => (
  entry.source === '/kidz/sommerfest'
  && entry.destination === '/kidz-sommerfest.html'
)));
assert.ok(vercelConfig.rewrites.some((entry) => (
  entry.source === '/kidz/gewinnspiel'
  && entry.destination === '/kidz-gewinnspiel.html'
)));

const registrationLinks = [{ href: '' }, { href: '' }, { href: '' }];
globalThis.window = {
  location: new URL('https://kidz.teamwachsbleiche.de/kidz/sommerfest?quelle=whatsapp&berater=sandro'),
};
globalThis.document = {
  querySelectorAll: (selector) => selector === '[data-registration-link]' ? registrationLinks : [],
};
await import(new URL(`../js/kidz-sommerfest.js?test=${Date.now()}`, import.meta.url));
assert.deepEqual(
  registrationLinks.map((link) => link.href),
  Array(3).fill('/kidz/gewinnspiel?quelle=whatsapp&berater=sandro#anmeldung'),
);
delete globalThis.window;
delete globalThis.document;

console.log('kidz-sommerfest-startseite: OK');

// --- Anmeldung deutlich sichtbar, oberhalb des Flyers -------------------------
// Wer schon muendlich zugesagt hat, braucht einen Grund, sich trotzdem einzutragen.
assert.match(html, /class="kf-anmeldebox"/);
assert.match(html, /Du kommst\? Sag uns hier nochmal Bescheid\./);
assert.match(html, /Auch wenn wir schon gesprochen haben/);
assert.match(html, /Wir können planen/);
assert.match(html, /Du bist beim Gewinnspiel dabei/);
// Der Block steht vor der ersten Flyerkarte, sonst sieht ihn niemand.
// (Der Dateiname des Flyers taugt nicht zum Vergleich, er steht schon in den
// Vorschau-Metadaten im Kopf der Seite.)
assert.ok(html.indexOf('kf-anmeldebox') < html.indexOf('kf-flyer-card'),
  'Der Anmeldeblock muss oberhalb der Flyerkarte stehen');
// Beide Wege zur Anmeldung tragen die Beraterzuordnung mit.
assert.equal((html.match(/data-registration-link/g) || []).length, 3);
