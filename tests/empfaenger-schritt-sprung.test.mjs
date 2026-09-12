// Phase 370: Direkt zu einem Schritt springen, den man schon gesehen hat.
//
// Kais Frage am 12.09.2026: „könntest du das so bauen, dass ich schnell von Seite 6 zu
// Seite 3 springen kann ... wichtig, es muss einen Mehrwert bringen und nicht nur mehr
// Funktionen, die kein Kunde nutzt." Und danach: „der Kunde muss es auch wissen oder
// fühlen."
//
// Drei Entscheidungen stecken darin, die dieser Wächter festhält:
//
// 1. Nur besuchte Schritte sind anspringbar. Schritt 4 zeigt das Ergebnis der Wahl aus
//    Schritt 3; wer dorthin springt, ohne gewählt zu haben, sieht eine leere Hülle.
// 2. Zwei Bedienwege, weil die Geräte Verschiedenes hergeben. Am Rechner die Striche
//    selbst. Am Handy sind die ausgeblendet (`.progress{display:none}` ab 780 px), dort
//    führt die Zahl in eine Liste. Ohne den zweiten Weg wäre die Funktion genau dort
//    wirkungslos, wo die meisten Empfehlungen geöffnet werden.
// 3. Ein einmaliger Wink, sonst findet niemand eine stumme Funktion.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../empfaenger.html', import.meta.url), 'utf8');

/* --- 1) Die Striche sind Knöpfe, mit echter Trefferfläche --- */

const dots = html.match(/<button type="button" class="step-dot"><\/button>/g) || [];
assert.equal(dots.length, 6, `Es braucht 6 Sprungmarken, gefunden: ${dots.length}.`);
// Der sichtbare Balken bleibt 3 px, die Trefferfläche muss 44 px hoch sein: 3 + 2*21 = 45.
// Mit 20 px waren es gemessen 43 und damit knapp unter dem Mindestmaß.
assert.match(html, /\.step-dot\{[^}]*padding:21px 0/,
  'Ohne Polsterung ist die Trefferfläche 3 px hoch und am Finger nicht zu treffen.');
assert.match(html, /\.step-dot:before\{content:"";[^}]*height:3px/);

/* --- 2) Nur besuchte Schritte, und das sichtbar --- */

assert.match(html, /const besucht = new Set\(\[1\]\)/,
  'Es muss mitgeschrieben werden, welche Schritte gesehen wurden.');
assert.match(html, /bar\.disabled=!frei/, 'Nicht besuchte Marken müssen stumm sein.');
assert.match(html, /bars\.forEach\(\(bar,i\)=>bar\.addEventListener\('click',\(\)=>\{ if\(besucht\.has\(i\+1\)\) show\(i\+1\); \}\)\)/,
  'Der Klick auf eine Marke darf nur besuchte Schritte anspringen.');
// „Frei" heißt besucht, nicht „liegt vor dem aktuellen Schritt": Wer von 6 auf 3
// zurückspringt, muss auch wieder nach vorn auf 6 kommen.
assert.match(html, /const n=i\+1, frei=besucht\.has\(n\)&&n!==step/,
  'Anspringbar ist, was besucht wurde, nicht was vor dem aktuellen Schritt liegt.');
// Nur freie Marken fühlen sich auch anklickbar an.
assert.match(html, /\.step-dot\[data-frei\]\{cursor:pointer\}/);
assert.match(html, /\.step-dot\[data-frei\]:hover:before,\.step-dot\[data-frei\]:focus-visible:before\{height:7px\}/,
  'Beim Darüberfahren muss die Marke reagieren, sonst wirkt sie tot.');
assert.match(html, /\.step-dot\[data-frei\]:hover:after[^{]*\{content:attr\(data-name\)/,
  'Die Marke muss beim Darüberfahren sagen, wohin sie führt.');

/* --- 3) Der zweite Weg für das Handy --- */

// Die Striche sind am Handy ausgeblendet. Gäbe es nur sie, wäre die Funktion dort weg.
assert.match(html, /@media\(max-width:780px\)[\s\S]{0,400}\.progress\{display:none\}/,
  'Annahme geprüft: Am Handy sind die Striche ausgeblendet.');
assert.match(html, /<button type="button" class="step-menu-knopf" id="stepMenuKnopf" aria-expanded="false" aria-controls="stepMenu">/,
  'Am Handy fehlt der Weg über die Zahl.');
assert.match(html, /<ul class="step-menu" id="stepMenu" hidden><\/ul>/);
// display:flex auf den Einträgen schlägt hidden, deshalb die eigene Regel.
assert.match(html, /\.step-menu\[hidden\]\{display:none\}/,
  'Ohne diese Regel steht die Liste immer offen.');
// Im Menü stehen Namen, nicht nur Zahlen. Eine Zahl allein sagt niemandem, wohin er springt.
assert.match(html, /const SCHRITTE = \['Willkommen', 'Der Film', 'Dein Thema', 'Dein Schwerpunkt', 'Dein Ansprechpartner', 'Kennenlernen'\]/);
// Keine Beraternamen in den Marken: Die Seite läuft für mehrere Berater.
assert.doesNotMatch(html.match(/const SCHRITTE = \[[^\]]*\]/)[0], /Kai/,
  'Die Schrittnamen dürfen keinen Berater nennen.');
assert.match(html, /if\(besucht\.has\(n\)\) return `<li><button type="button" data-goto="\$\{n\}">/,
  'Nur besuchte Schritte dürfen in der Liste Knöpfe sein.');
assert.match(html, /Du bist hier/, 'Der aktuelle Schritt muss in der Liste erkennbar sein.');

/* --- 4) Der Wink: einmal, und nur einmal --- */

assert.match(html, /function wink\(\)\{\s*if\(step!==3\) return;/,
  'Der Wink gehört an das erste Erreichen von Schritt 3, vorher lohnt Springen nicht.');
assert.match(html, /sessionStorage\.getItem\('empf-wink'\)/, 'Der Wink darf sich nicht wiederholen.');
assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{\.step-dot\.wink:before,\.step-menu-knopf\.wink svg\{animation:none\}\}/,
  'Wer Bewegung abgestellt hat, darf keine bekommen.');

/* --- 5) Was der Sprung nicht kaputt machen darf --- */

// Nach der Rückkehr aus dem Finanzcheck müssen die Marken wieder frei sein.
assert.match(html, /if\(Array\.isArray\(alt\.besucht\)\)alt\.besucht\.filter\(n=>n>=1&&n<=6\)\.forEach\(n=>besucht\.add\(n\)\)/,
  'Nach der Rückkehr aus dem Finanzcheck fehlen sonst alle Sprungmarken.');
assert.match(html, /JSON\.stringify\(\{step,interest,besucht:\[\.\.\.besucht\]\}\)/);
// Offenes Menü und Pfeiltasten dürfen sich nicht in die Quere kommen.
assert.match(html, /if\(!menu\.hidden\)return;\s*if\(e\.key==='ArrowLeft'\)/,
  'Bei offener Liste dürfen die Pfeiltasten nicht zusätzlich den Schritt wechseln.');
// Klick daneben und Escape schließen.
assert.match(html, /if\(!menu\.hidden&&!e\.target\.closest\('\.step-count'\)\) oeffneMenu\(false\)/);
assert.match(html, /e\.key==='Escape'&&!menu\.hidden/);

console.log('empfaenger-schritt-sprung: OK');
