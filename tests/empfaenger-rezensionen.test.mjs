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
// Das Symbol darf nicht im Rezensionsblock stehen. Der wird bei fremden Beratern auf
// display:none gesetzt, und ein <use> auf ein Symbol in einem versteckten Zweig löst
// nicht zuverlässig auf. Dann fehlte das Google-Zeichen auch in der Zeile auf Seite 1.
assert.doesNotMatch(reviews, /<symbol id="google-g"/,
  'Das Google-Symbol gehört vor den Rezensionsblock, nicht hinein.');
assert.ok(html.indexOf('<symbol id="google-g"') < html.indexOf('<div class="reviews"'),
  'Das Google-Symbol muss vor seiner ersten Verwendung stehen.');

/* --- 7) Die Zeile auf Seite 1: Anker, kein zweites Karussell --- */

// Auf das Markup schneiden, nicht auf den Stilblock: `data-step="1"` steht auch dort,
// und ein Ausschnitt ab dem ersten Treffer erwischt CSS statt der Seite.
const s1 = html.indexOf('<section class="chapter active" data-step="1">');
const s2 = html.indexOf('<section class="chapter" data-step="2">');
assert.ok(s1 > -1 && s2 > s1, 'Schritt 1 und 2 sind im Markup nicht auffindbar.');
const seite1 = html.slice(s1, s2);
const zeile = seite1.match(/<p class="google-note"[^>]*>[\s\S]*?<\/p>/);
assert.ok(zeile, 'Auf Seite 1 fehlt die Google-Zeile.');
assert.match(zeile[0], /data-default-berater-only/,
  'Auch die Zeile auf Seite 1 gehört nur zum Standard-Berater.');
assert.match(zeile[0], /<use href="#google-g">/, 'Der Zeile fehlt das bunte Google-Zeichen.');
// Kein zweites Karussell auf Seite 1: Die Empfehlung ist dort die Hauptsache.
assert.doesNotMatch(seite1, /review-card|review-track/,
  'Auf Seite 1 gehört nur die Zeile, nicht das Karussell.');
// Die Sterne stehen in Googles eigenem Gelb und schaffen auf Weiß nur 1,9:1. Deshalb
// dürfen sie die Bewertung nicht allein tragen: Sie sind aria-hidden, und die Zahl
// steht als Text daneben.
assert.match(html, /--google-gelb:#fbbc05/, 'Das Google-Gelb fehlt als eigener Wert.');
assert.match(html, /\.stars\{color:var\(--google-gelb\)\}/);
assert.match(zeile[0], /<span class="stars" aria-hidden="true">/,
  'Die Sterne der Zeile müssen Schmuck sein, sonst hängt die Aussage an einer blassen Farbe.');
assert.match(zeile[0], /<b>5,0<\/b><span><span class="gn-lang">von 5 · <\/span>16 Rezensionen<\/span>/,
  'Neben den Sternen muss die Bewertung als Text stehen.');
// Am Handy entfällt „von 5", damit die Zeile neben der Signatur bleibt und nicht umbricht.
assert.match(html, /\.gn-lang\{display:none\}/);
assert.match(html, /\.bn-fuss\{flex-wrap:nowrap/);
// Die Zeile steht neben der Signatur, nicht als eigene Zeile darüber. Als eigene Zeile
// kostete sie 36 px und schob den Hauptknopf auf dem iPhone aus dem Bild (694 px bei
// 664 px Fensterhöhe). Neben der Signatur kostet sie nichts.
assert.match(seite1, /<div class="bn-fuss"><div class="sig"[^>]*>Kai<\/div><p class="google-note"/,
  'Die Google-Zeile gehört neben die Signatur, sonst verdrängt sie den Knopf.');
assert.match(html, /\.bn-fuss\{display:flex[^}]*justify-content:space-between/);
assert.doesNotMatch(html, /elfsight|trustindex|embedsocial|reviewsonmywebsite/i,
  'Kein fremder Rezensions-Baustein auf der Seite.');
assert.doesNotMatch(html, /maps\.googleapis\.com|places\.googleapis\.com/,
  'Der Abruf bei Google gehört auf den Server, nicht in die Seite.');

console.log(`empfaenger-rezensionen: OK (${karten.length} Stimmen)`);
