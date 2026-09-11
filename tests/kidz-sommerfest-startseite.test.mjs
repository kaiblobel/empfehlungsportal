// Die Sommerfest-Seite ist seit Phase 346 (11.09.2026) der Rückblick nach dem Fest
// am 06.09.2026. Vorher hielt dieser Test die Einladung fest (Flyer, Anmeldung,
// Gewinnspiel). Jetzt: Danke, Auflösung, Dank an die Helfer, Vormerken für
// KIDZ for Future. Die Adressen und Sprungmarken bleiben, weil Flyer, QR-Codes
// und alte Links weiter auf /kidz/sommerfest#sommerfest und #gewinnspiel zeigen.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, js, vercel] = await Promise.all([
  read('kidz-sommerfest.html'),
  read('css/kidz-sommerfest.css'),
  read('js/kidz-sommerfest.js'),
  read('vercel.json'),
]);

const organizerLogo = await stat(new URL('../assets/images/team-wachsbleiche-petrol.jpeg', import.meta.url));
const factIcons = await Promise.all([
  'kidz-calendar.svg',
  'kidz-location.svg',
  'kidz-ticket.svg',
].map((name) => stat(new URL(`../assets/icons/${name}`, import.meta.url))));
const vercelConfig = JSON.parse(vercel);
const hasHost = (entry, host) => entry.has?.some((condition) => condition.type === 'host' && condition.value === host);

// Reihenfolge: Danke, Auflösung, Helfer, wie es weitergeht.
const dankeIndex = html.indexOf('id="sommerfest"');
const aufloesungIndex = html.indexOf('id="gewinnspiel"');
const helferIndex = html.indexOf('kf-section-partner');
const weiterIndex = html.indexOf('Wie es weitergeht');
assert.ok(dankeIndex >= 0, 'Sprungmarke #sommerfest fehlt, alte Links laufen ins Leere');
assert.ok(aufloesungIndex > dankeIndex, 'Sprungmarke #gewinnspiel muss bei der Auflösung stehen');
assert.ok(helferIndex > aufloesungIndex);
assert.ok(weiterIndex > helferIndex);

// Inhalt wie in der Dankesmail an die KIDZ-Familien.
assert.match(html, /Danke, dass ihr dabei wart!/);
assert.match(html, /Über 700 Menschen/);
assert.match(html, /314 cm/);
assert.match(html, /12 von euch lagen genau richtig/);
assert.match(html, /6\. September 2026/);
assert.match(html, /Kutzeburger Mühle/);
assert.match(html, /Spreewald Survival/);
assert.match(html, /href="https:\/\/www\.instagram\.com\/team_wachsbleiche\/"/);
assert.match(html, /href="https:\/\/www\.facebook\.com\/people\/Team-Wachsbleiche\/61594233901851\/"/);
assert.match(html, /href="\/kidz\/elternabend\?quelle=sommerfest-danke"/);
assert.match(html, /class="kf-fact kf-fact-date"/);
assert.match(html, /class="kf-fact kf-fact-place"/);
assert.match(html, /class="kf-fact kf-fact-free"/);
assert.match(html, /assets\/icons\/kidz-calendar\.svg/);
assert.match(html, /assets\/icons\/kidz-location\.svg/);
assert.match(html, /assets\/icons\/kidz-ticket\.svg/);

// Nach dem Fest lädt nichts mehr zur Anmeldung ein.
assert.doesNotMatch(html, /data-registration-link/, 'Anmeldeknöpfe gehören nicht mehr auf den Rückblick');
assert.doesNotMatch(html, /Jetzt (kostenlos )?(anmelden|mitmachen)/);
assert.doesNotMatch(html, /10:00 bis 15:00 Uhr/);
assert.doesNotMatch(html, /Eintritt (&amp; Teilnahme )?kostenlos/);
// Keine typografischen Gedankenstriche im sichtbaren Text.
assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ''), /[–—]/);

assert.match(html, /class="kf-footer" id="veranstalter"/);
assert.match(html, /class="kf-organizer"/);
assert.match(html, /assets\/images\/team-wachsbleiche-petrol\.jpeg/);
assert.match(html, /alt="Team Wachsbleiche · Kai Blobel &amp; Team"/);
assert.match(html, /property="og:image" content="https:\/\/kidz\.teamwachsbleiche\.de\/assets\/images\/kidz-vorschau-sommerfest-danke\.jpg"/);
assert.match(html, /property="og:image:width" content="1200"/);
assert.match(html, /property="og:image:height" content="630"/);
assert.ok(organizerLogo.size > 300_000);
assert.ok(factIcons.every((icon) => icon.size > 300));

assert.match(css, /\.kf-section-event/);
assert.match(css, /\.kf-section-prizes/);
assert.match(css, /\.kf-section-partner/);
assert.match(css, /\.kf-section-register/);
assert.match(css, /\.kf-facts\.kf-facts-drei/);
assert.match(css, /\.kf-zahlen/);
assert.match(css, /\.kf-fact-icon img/);
assert.match(css, /\.kf-organizer img/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.doesNotMatch(css, /prefers-color-scheme\s*:\s*dark/);

// Das Skript zählt weiter die Aufrufe und würde Anmeldelinks weiter richtig
// zuordnen, falls je wieder welche auf die Seite kommen.
assert.match(js, /ALLOWED_SOURCES/);
assert.match(js, /SAFE_SLUG/);
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

const registrationLinks = [{ href: '' }];
globalThis.window = {
  location: new URL('https://kidz.teamwachsbleiche.de/kidz/sommerfest?quelle=whatsapp&berater=sandro'),
};
globalThis.document = {
  querySelectorAll: (selector) => selector === '[data-registration-link]' ? registrationLinks : [],
};
await import(new URL(`../js/kidz-sommerfest.js?test=${Date.now()}`, import.meta.url));
assert.deepEqual(registrationLinks.map((link) => link.href), ['/kidz/gewinnspiel?quelle=whatsapp&berater=sandro#anmeldung']);
delete globalThis.window;
delete globalThis.document;

// Phase 348 (Kais Wunsch vom 11.09.2026): Der Flyer bleibt sichtbar, damit man
// sieht, worum es ging; die Auflösung nennt alle Preise, nicht nur den Ball;
// der Schluss blickt nach vorn.
assert.match(html, /class="kf-flyer-card kf-danke-flyer"/);
assert.match(html, /assets\/images\/kidz-sommerfest-flyer\.jpg" alt="[^"]+" width="904" height="1280"/);
for (const preis of ['Survival Event', 'UCI Kinogutscheine', 'Tierpark-Jahreskarte', 'weitere Sachpreise']) {
  assert.match(html, new RegExp(preis), `Preis fehlt: ${preis}`);
}
assert.match(html, /Unter allen Anmeldungen/);
assert.match(html, /hört über den angegebenen Kontaktweg von uns/);
assert.match(html, /href="\/kidz\/gewinnspiel#teilnahmebedingungen"/);
assert.match(html, /Wir freuen uns schon aufs nächste Mal mit euch/);
assert.doesNotMatch(html, /kidz-sommerfest-gewinnspiel-v2\.png/, 'Die 2,3-MB-Gewinngrafik ist zu schwer fürs Handy');
assert.match(css, /\.kf-danke-flyer/);
assert.match(css, /\.kf-preise/);

console.log('kidz-sommerfest-startseite: OK');
