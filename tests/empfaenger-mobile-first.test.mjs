import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('empfaenger.html');
const app = read('js/app.js');
const sw = read('sw.js');

assert.match(html, /EmpfÃ¤ngerseite v1\.181 Â· Beraterportraits unverfÃ¤lscht farbig/);
assert.match(html, /font-size:clamp\(34px,9\.4vw,40px\)/, 'Mobile Ãœberschrift ist nicht ruhig skaliert');
assert.match(html, /font-size:clamp\(31px,8\.7vw,35px\)/, 'Mobile KapitelÃ¼berschriften sind zu groÃŸ');
assert.match(html, /\.topbar\{height:60px/, 'Mobile Kopfzeile ist nicht kompakt');
assert.match(html, /\.primary,\.secondary\{min-height:54px\}/, 'Mobile Touch-Ziele fehlen');
assert.match(html, /\.chapter\[data-step="1"\] \.portrait\{display:none\}/, 'Das groÃŸe Portrait steht mobil noch im Einstieg');
assert.match(html, /data-recipient-prefix/, 'Personalisierung der ruhigen Ãœberschrift fehlt');
assert.match(html, /data-headline-start>Ein/, 'Unpersonalisierter Satzanfang fehlt');
assert.match(html, /headlineStart\.textContent = 'ein'/, 'Personalisierte Ãœberschrift beginnt nicht korrekt kleingeschrieben');
assert.match(html, /Unverbindlich entdecken/);
assert.match(html, /Ganz bewusst fÃ¼r dich/);
assert.match(html, /profile:before,\.profile\.revealed \.metric i,\.digit-reel\{animation:none!important\}/, 'Mobile Animationen laufen weiter');

assert.doesNotMatch(html, /ðŸ‘/, 'Doppelte Daumen-Symbole sind noch vorhanden');
assert.doesNotMatch(html, /hero-proof/, 'Der doppelte Erfahrungsblock ist noch vorhanden');
assert.doesNotMatch(html, /glaubt, dass sich/, 'Die alte aufdringliche Ãœberschrift ist noch vorhanden');
assert.doesNotMatch(html, /hat dich persÃ¶nlich empfohlen/, 'Die Empfehlung wird noch doppelt erklÃ¤rt');

const heroPortraitRule = html.match(/\.portrait img\{[^}]+\}/)?.[0] || '';
const trustPortraitRule = html.match(/\.trust-person img\{[^}]+\}/)?.[0] || '';
assert.match(heroPortraitRule, /filter:none/, 'Das groÃŸe Beraterportrait ist nicht farbig');
assert.match(trustPortraitRule, /filter:none/, 'Das Beraterportrait im Vertrauensabschnitt ist nicht farbig');
assert.doesNotMatch(heroPortraitRule, /grayscale/, 'Das groÃŸe Beraterportrait wird noch entsÃ¤ttigt');
assert.doesNotMatch(trustPortraitRule, /grayscale/, 'Das Beraterportrait im Vertrauensabschnitt wird noch entsÃ¤ttigt');

assert.match(app, /querySelector\('\[data-recipient-prefix\]'\)/, 'Dynamische EmpfÃ¤ngerpersonalisierung fehlt');
assert.doesNotMatch(app, /querySelectorAll\('\[data-recipient\]'\)/, 'Alte EmpfÃ¤ngerpersonalisierung ist noch aktiv');
assert.match(sw, /CACHE_VERSION = 'v142-2026-08-05'/);

console.log('empfaenger-mobile-first: OK');

