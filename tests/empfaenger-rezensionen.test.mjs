// Phase 366: Kais Google-Rezensionen als Karussell in Schritt 5.
//
// Kais Wunsch am 12.09.2026: „auf der seite erst kai kennen lernen da ist ja nur
// eine rezension ... mit wischen nach links oder rechts."
//
// Was dabei zu wissen war: Google gibt über seine Schnittstelle immer nur fünf
// Rezensionen heraus. Auf kaiblobel.de standen aber bereits elf im Wortlaut, plus
// die eine, die hier stand. Zwölf übernommene Stimmen sind also mehr als ein
// Live-Abruf je liefern würde. Der tägliche Nachschub kommt getrennt.
//
// Dieser Wächter hält drei Dinge fest, die beim nächsten Umbau leicht kippen:
// die Zahl im Text darf nicht von der Zahl der Karten abweichen, der Block darf
// nie bei fremden Beratern erscheinen, und die Pfeiltasten dürfen im Karussell
// nicht gleichzeitig den Schritt weiterschalten.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../empfaenger.html', import.meta.url), 'utf8');

/* --- 1) Der Block gehört Kai, nicht jedem Berater --- */

// Google-Rezensionen hängen an einem Unternehmensprofil. Stünden Kais Stimmen bei
// einem fremden Berater, wäre das schlimmer als gar keine.
const block = html.match(/<div class="reviews" data-default-berater-only>[\s\S]*?\n {12}<\/div>/);
assert.ok(block, 'Der Rezensionsblock fehlt oder trägt den Schutz für den Standard-Berater nicht.');
const reviews = block[0];

/* --- 2) Die genannte Zahl und die Karten müssen zusammenpassen --- */

const karten = reviews.match(/<article class="review-card">/g) || [];
assert.equal(karten.length, 12, `Es sollen 12 übernommene Stimmen sein, gefunden: ${karten.length}.`);
const genannt = reviews.match(/(\d+) von 16 Stimmen/);
assert.ok(genannt, 'Die Steuerzeile nennt nicht, wie viele der 16 Stimmen hier stehen.');
assert.equal(Number(genannt[1]), karten.length,
  'Die genannte Zahl weicht von der Zahl der Karten ab.');

// Jede Karte braucht Namen, Zeitangabe, Google-Zeichen, Sterne und Zitat. Ohne das
// sieht es aus, als hätte Kai die Stimmen selbst geschrieben.
for (const teil of ['<div class="review-wer"><b>', '<use href="#google-g">', 'aria-label="5 von 5 Sternen"', '<blockquote>']) {
  const treffer = reviews.split(teil).length - 1;
  assert.equal(treffer, karten.length, `„${teil}" steht ${treffer} mal, erwartet ${karten.length} mal.`);
}

/* --- 3) Gesamtzahl und dauerhafter Weg zum Profil --- */

// Zwölf von sechzehn: Die Seite darf nicht so tun, als wären das alle.
assert.match(reviews, /aus 16 Rezensionen/, 'Die Gesamtzahl bei Google fehlt.');
// Die CID ist die feste Kennung des Eintrags. Eine Google-Suchadresse mit
// Sitzungskennung läuft früher oder später ins Leere (Kundenseite v1.65.0).
assert.match(reviews, /href="https:\/\/www\.google\.com\/maps\?cid=83717418077442585"/,
  'Der Weg zum Profil muss die dauerhafte CID-Adresse sein.');
assert.match(reviews, /rel="noopener noreferrer"/);

/* --- 4) Wischen kommt vom Browser, nicht von fremdem Code --- */

assert.match(html, /\.review-track\{[^}]*scroll-snap-type:inline mandatory/,
  'Ohne scroll-snap rastet beim Wischen nichts ein.');
// Ohne min-width:0 wächst das Grid-Feld auf die Breite aller Karten zusammen. Das
// Karussell hat dann nie zu wenig Platz, scrollt nicht und wird rechts abgeschnitten.
// Beim ersten Bauen genau so passiert, gemessen 2.874 px statt 700 px.
assert.match(html, /\.trust-content\{min-width:0\}/,
  'Das Grid-Feld um das Karussell braucht min-width:0, sonst scrollt nichts.');
assert.match(html, /\.review-track>\*\{scroll-snap-align:start\}/);
// Trefferfläche der Pfeile: 44 px ist das Mindestmaß für den Daumen.
assert.match(html, /\.review-pfeil\{[^}]*width:44px;height:44px/);
// Der Rand eines Bedienelements braucht 3:1, dafür gibt es --rand. Mit --line
// (#e0e0e0) wären es 1,3:1 und der Knopf wäre kaum zu sehen.
assert.match(html, /\.review-pfeil\{[^}]*border:1px solid var\(--rand\)/);

/* --- 5) Die Pfeiltasten dürfen nicht zwei Dinge gleichzeitig tun --- */

// Ohne diese Ausnahme blättert eine Pfeiltaste im Karussell die Karte UND
// schaltet den Schritt weiter. Der Besucher landet mitten im Lesen in Schritt 6.
assert.match(html, /if\(e\.target\?\.closest\?\.\('\[data-review-track\]'\)\)return;/,
  'Die Pfeiltasten im Karussell müssen den Schrittwechsel aussparen.');

/* --- 6) Nichts wird von außen nachgeladen --- */

// Das Google-Zeichen liegt als eigenes Symbol in der Seite. Fremde Bausteine für
// Rezensionen (Elfsight, Trustindex und Verwandte) lesen die Besucher mit.
assert.match(html, /<symbol id="google-g" viewBox="0 0 24 24">/);
assert.doesNotMatch(html, /elfsight|trustindex|embedsocial|reviewsonmywebsite/i,
  'Kein fremder Rezensions-Baustein auf der Seite.');
assert.doesNotMatch(html, /maps\.googleapis\.com|places\.googleapis\.com/,
  'Der Abruf bei Google gehört auf den Server, nicht in die Seite.');

console.log(`empfaenger-rezensionen: OK (${karten.length} Stimmen)`);
