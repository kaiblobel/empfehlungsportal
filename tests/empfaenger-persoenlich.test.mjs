// Interessenten-Seite persönlicher (11.09.2026, Kai: "gefällt mir gut").
//
// Befunde am alten Stand: Am Handy war der Berater in keinem der sechs Schritte zu sehen,
// Kais Zahlen (20+ Jahre, 3.000 Haushalte) standen auch bei Interessenten anderer Berater,
// beim Thema Geld stand ein Dollar-Zeichen, "Ansprechpartner" war fest männlich, und
// Schritt 4 zeigte ein "gesperrtes Profil" mit Scheinbalken. Dazu führte das X im
// Finanzcheck in die Präsentation; der Rückweg landet jetzt wieder im selben Schritt.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('empfaenger.html');
const app = read('js/app.js');

// Gesicht und Name in jedem Schritt: Kopfzeile trägt das Porträt, am Handy auch die Notiz.
assert.match(html, /<img class="brand-foto" data-bb="foto"/, 'Kopfzeile ohne Beraterfoto');
assert.match(html, /\.bn-foto\{display:block\}/, 'Am Handy fehlt das Gesicht in Schritt 1');
assert.doesNotMatch(html, /\.trust-person\{display:none\}/, 'Schritt 5 versteckt den Berater am Handy');
assert.match(app, /document\.querySelectorAll\('img\[data-bb="foto"\]'\)/, 'Rückfall-Foto erreicht nicht alle Porträts');

// Kais Zahlen und seine Bewertung nur beim Standard-Berater.
assert.match(html, /<div class="fakt" data-default-berater-only><b>20\+<\/b>/);
assert.match(html, /<div class="fakt" data-default-berater-only><b>3\.000\+<\/b>/);
assert.match(html, /class="review" data-default-berater-only/);

// Bürofoto nur, wenn hinterlegt: kein data-bb="buerofoto" (das setzt sonst das Porträt ein).
assert.match(html, /<img class="buero" id="eBueroFoto"/);
assert.doesNotMatch(html, /class="buero" data-bb="buerofoto"/);
assert.match(html, /\.trust-person \.buero\[hidden\]\{display:none\}/, 'hidden wirkt nicht gegen display:block');
assert.match(app, /function zeigeBuero\(b\)/);
assert.match(app, /applyBeraterBrand\(berater\);\s*zeigeBuero\(berater\);/);

// Rolle aus dem Profil statt fest "Ansprechpartner", Euro statt Dollar, kein Scheinprofil.
assert.doesNotMatch(html, /Dein persönlicher Ansprechpartner/);
assert.doesNotMatch(html, /M29 17c-2-2-4-2-7-2/, 'Dollar-Symbol ist zurück');
assert.doesNotMatch(html, /Gesperrt|Potenzialprofil</);

// Empfehlungsgeber mit Namen, Kleinschreibung nach dem Empfängernamen ohne festes Wort.
assert.match(html, /data-von-text/);
assert.match(app, /\[data-von-text\]/, 'app.js setzt den Namen des Empfehlungsgebers nicht');
assert.doesNotMatch(app, /headlineStart\.textContent = 'ein'/);

// Rückweg aus dem Finanzcheck: nur bei Zurück-Navigation, frische Links beginnen vorne.
assert.match(html, /nav\.type==='back_forward'/);
assert.match(html, /sessionStorage\.setItem\(merkKey/);

// Die Namen in Kopfzeile, Bildunterschrift und Anrufkarte brechen nicht um:
// display:block nur für direkte Kinder (dieselbe span-Falle wie am 10.09.).
assert.doesNotMatch(html, /\.brand-text span\{display:block/);
assert.doesNotMatch(html, /\.portrait figcaption span\{display:block/);
assert.doesNotMatch(html, /\.dc-kopf span\{display:block/);

// Der Link "Lieber erst das ganze Bild ansehen" führt auf die Überblick-Seite. Deren Fußzeile
// ragte am Handy über den Rand (Querscrollen), sie muss umbrechen dürfen.
const ueberblickCss = read('css/ueberblick.css');
assert.match(ueberblickCss, /\.site-footer nav\{display:flex; flex-wrap:wrap;/, 'Fußzeile der Überblick-Seite bricht nicht um');

console.log('empfaenger-persoenlich: OK');
