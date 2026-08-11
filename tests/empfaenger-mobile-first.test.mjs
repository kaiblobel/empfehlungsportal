import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('empfaenger.html');
const app = read('js/app.js');
const sw = read('sw.js');

assert.match(html, /Empfängerseite v1\.181 · Beraterportraits unverfälscht farbig/);
assert.match(html, /font-size:clamp\(34px,9\.4vw,40px\)/, 'Mobile Überschrift ist nicht ruhig skaliert');
assert.match(html, /font-size:clamp\(31px,8\.7vw,35px\)/, 'Mobile Kapitelüberschriften sind zu groß');
assert.match(html, /\.topbar\{height:60px/, 'Mobile Kopfzeile ist nicht kompakt');
assert.match(html, /\.primary,\.secondary\{min-height:54px\}/, 'Mobile Touch-Ziele fehlen');
assert.match(html, /\.chapter\[data-step="1"\] \.portrait\{display:none\}/, 'Das große Portrait steht mobil noch im Einstieg');
assert.match(html, /data-recipient-prefix/, 'Personalisierung der ruhigen Überschrift fehlt');
assert.match(html, /data-headline-start>Ein/, 'Unpersonalisierter Satzanfang fehlt');
assert.match(html, /headlineStart\.textContent = 'ein'/, 'Personalisierte Überschrift beginnt nicht korrekt kleingeschrieben');
assert.match(html, /Unverbindlich entdecken/);
assert.match(html, /Ganz bewusst für dich/);
assert.match(html, /profile:before,\.profile\.revealed \.metric i,\.digit-reel\{animation:none!important\}/, 'Mobile Animationen laufen weiter');

assert.doesNotMatch(html, /👍/, 'Doppelte Daumen-Symbole sind noch vorhanden');
assert.doesNotMatch(html, /hero-proof/, 'Der doppelte Erfahrungsblock ist noch vorhanden');
assert.doesNotMatch(html, /glaubt, dass sich/, 'Die alte aufdringliche Überschrift ist noch vorhanden');
assert.doesNotMatch(html, /hat dich persönlich empfohlen/, 'Die Empfehlung wird noch doppelt erklärt');

const heroPortraitRule = html.match(/\.portrait img\{[^}]+\}/)?.[0] || '';
const trustPortraitRule = html.match(/\.trust-person img\{[^}]+\}/)?.[0] || '';
assert.match(heroPortraitRule, /filter:none/, 'Das große Beraterportrait ist nicht farbig');
assert.match(trustPortraitRule, /filter:none/, 'Das Beraterportrait im Vertrauensabschnitt ist nicht farbig');
assert.doesNotMatch(heroPortraitRule, /grayscale/, 'Das große Beraterportrait wird noch entsättigt');
assert.doesNotMatch(trustPortraitRule, /grayscale/, 'Das Beraterportrait im Vertrauensabschnitt wird noch entsättigt');

assert.match(app, /querySelector\('\[data-recipient-prefix\]'\)/, 'Dynamische Empfängerpersonalisierung fehlt');
assert.doesNotMatch(app, /querySelectorAll\('\[data-recipient\]'\)/, 'Alte Empfängerpersonalisierung ist noch aktiv');
assert.match(sw, /CACHE_VERSION = 'v159-2026-08-11a'/);

console.log('empfaenger-mobile-first: OK');
