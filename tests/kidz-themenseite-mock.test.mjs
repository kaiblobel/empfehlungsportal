import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const htmlUrl = new URL('../mockups/kidz-themenseite-v1.html', import.meta.url);
const cssUrl = new URL('../mockups/kidz-themenseite-v1.css', import.meta.url);
const jsUrl = new URL('../mockups/kidz-themenseite-v1.js', import.meta.url);
const planUrl = new URL('../docs/KIDZ-THEMENSEITE-PLAN-v1.md', import.meta.url);
const vercelUrl = new URL('../vercel.json', import.meta.url);

const [html, css, javascript, plan, vercel] = await Promise.all([
  readFile(htmlUrl, 'utf8'),
  readFile(cssUrl, 'utf8'),
  readFile(jsUrl, 'utf8'),
  readFile(planUrl, 'utf8'),
  readFile(vercelUrl, 'utf8'),
]);

assert.match(html, /content="index,follow"/);
assert.match(html, /https:\/\/kidz\.teamwachsbleiche\.de\/kidz\/konzept/);
assert.match(vercel, /"source": "\/kidz\/konzept"/);
assert.match(html, /Was wünschen Sie sich für die Zukunft Ihres Kindes\?/);
assert.doesNotMatch(html, /Generali Deutschland|Deutsche(?:n)? Vermögensberatung/);
assert.match(html, /Was Zukunft für Kinder bedeuten kann/);
assert.equal((html.match(/data-story-slide/g) || []).length, 6);
assert.equal((html.match(/data-story-index=/g) || []).length, 6);
assert.match(javascript, /showStory\(activeStory \+ 1\)/);
assert.match(javascript, /\/kidz\/elternabend\?quelle=direkt#anmeldung/);
assert.match(javascript, /https:\/\/wa\.me\/4915154776159/);
assert.match(html, /https:\/\/www\.dvag\.de\/kai\.blobel\/impressum\.html/);
assert.match(html, /https:\/\/www\.dvag\.de\/kai\.blobel\/datenschutz\.html/);
assert.match(html, /Es werden keine Daten gesendet oder gespeichert/);
assert.match(html, /id="contactConsent" type="checkbox" required/);
assert.doesNotMatch(html, /id="contactConsent"[^>]*\bchecked\b/);
assert.match(html, /Nur Termininfo erhalten/);
assert.match(html, /ohne sich schon für eine Teilnahme vorzumerken/);
assert.match(html, /Wer führt den Elternabend durch\?/);
assert.doesNotMatch(html, /Für dieses Muster wurden keine künstlich erzeugten Ersatzbilder verwendet/);
assert.match(html, /kidz-logo-original\.png/);
assert.match(html, /kidz-lok-vermoegensaufbau-original\.png/);
assert.match(html, /Die KIDZ-Lok steht für einen Weg, der früh beginnt/);
assert.match(html, /Ein echtes VIP-Ticket in puncto Gesundheit!/);
assert.match(html, /kidz-vip-ticket-neutral\.png/);
assert.doesNotMatch(html, /kidz-vip-ticket-original\.png/);
assert.match(html, /Mehr Möglichkeiten durch den FitBonus\+ Junior/);
assert.match(html, /Bis zu 100 % Kostenerstattung für Kieferorthopädie/);
assert.match(html, /Schon heute die künftige Arbeitskraft Ihres Kindes finanziell absichern/);
assert.match(html, /Möglichkeit der Nutzung von attraktiven, staatlichen Förderungen/);
assert.match(html, /Früh anfangen zahlt sich aus/);
assert.match(html, /kidz-frueh-anfangen-v2\.png/);
assert.match(css, /\.pillar-original img \{ width: 190px; height: 190px;/);
assert.match(html, /Leistungsbeispiele aus den bereitgestellten KIDZ-Unterlagen/);

for (const pathName of ['elternabend', 'termininfo', 'gespraech']) {
  assert.match(html, new RegExp(`data-open-path="${pathName}"`));
  assert.match(javascript, new RegExp(`${pathName}:\\s*\\{`));
}

assert.doesNotMatch(
  javascript,
  /\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|sendBeacon/,
  'Das lokale Muster darf keine Daten übertragen oder speichern.',
);
assert.match(javascript, /contactFieldLabel\.textContent = email \? 'E-Mail-Adresse' : 'Mobilnummer'/);
assert.match(javascript, /contactConsent\.checked = false/);
assert.match(css, /@media \(max-width: 720px\)/);
assert.match(css, /\.mobile-cta/);
assert.match(css, /section\[id\] \{ scroll-margin-top:/);
assert.match(css, /\.dialog-step input\[type="email"\]/);
assert.match(plan, /zur Veröffentlichung freigegeben/i);

const assetReferences = new Set(
  [...`${html}\n${javascript}`.matchAll(/assets\/kidz-themenseite\/[^"'`)\s]+/g)].map(
    ([assetPath]) => assetPath,
  ),
);

assert.ok(assetReferences.size >= 14, 'Alle vorgesehenen Originalmotive und Markenbilder müssen eingebunden sein.');

for (const assetPath of assetReferences) {
  await access(new URL(`../mockups/${assetPath}`, import.meta.url));
}

console.log('KIDZ-Themenseiten-Muster und Originalmotive geprüft.');
