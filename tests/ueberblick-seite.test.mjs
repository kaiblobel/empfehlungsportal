/**
 * Die Überblicksseite „Das ganze Bild" (ueberblick.html).
 *
 * Sie zeigt denselben Inhalt wie der Block #themaUeberblick in der
 * Präsentation, nur ausgeschrieben: dort spricht der Berater dazu, hier muss
 * der Text allein tragen.
 *
 * Geprüft wird, was still kaputtgehen kann: die Belege der Reform, die
 * Mandantenfähigkeit, die drei Wege am Ende und der Schutz davor, dass die
 * Seite etwas verspricht, das sie nicht halten kann.
 */

import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const wurzel = new URL('../', import.meta.url);
const lies = (datei) => readFile(new URL(datei, wurzel), 'utf8');

const seite = await lies('ueberblick.html');
const stil = await lies('css/ueberblick.css');
const logik = await lies('js/ueberblick.js');

/* --- 1) Der Kopf trägt, was api/share.js umschreibt --- */

for (const [was, muster] of [
  ['Titel mit Trennpunkt', /<title>[^<]*·[^<]*<\/title>/],
  ['Beschreibung', /<meta name="description" content="[^"]+"/],
  ['og:description', /<meta property="og:description" content="[^"]+"/],
  ['og:image', /<meta property="og:image" content="[^"]+"/],
  ['twitter:image', /<meta name="twitter:image" content="[^"]+"/],
]) {
  assert.match(seite, muster,
    `ueberblick.html: ${was} fehlt oder hat eine andere Schreibweise. `
      + 'api/share.js ersetzt genau diese Tags für die WhatsApp-Vorschau; '
      + 'passt die Form nicht, greift der Ersatz stillschweigend nicht.');
}

assert.match(seite, /rel="apple-touch-icon"[^>]*\.png/,
  'ueberblick.html braucht ein apple-touch-icon als PNG (tests/icons.test.mjs).');

assert.doesNotMatch(seite, /wartung\.js/,
  'ueberblick.html ist eine Kundenseite und bekommt bewusst keinen Wartungsschalter.');

assert.match(seite, /\/js\/referral-tracking\.js\?v=\d+/,
  'ueberblick.html bindet die Aufrufmessung nicht ein.');

/* --- 2) Der Inhalt: Reform mit nachprüfbaren Belegen --- */

for (const datum of ['27.03.2026', '08.05.2026', '01.01.2027']) {
  assert.ok(seite.includes(datum),
    `ueberblick.html: das Datum ${datum} aus der Zeitleiste fehlt. `
      + 'Die Angaben stammen aus dem verabschiedeten Gesetz und machen den '
      + 'Abschnitt nachprüfbar.');
}

assert.match(seite, /Altersvorsorgereformgesetz/,
  'ueberblick.html: der Gesetzesname fehlt.');
assert.match(seite, /bundesregierung\.de/,
  'ueberblick.html: die Quellenangabe zur Reform fehlt.');

const teile = (seite.match(/class="ub-teil[ "]/g) || []).length;
assert.equal(teile, 6,
  `ueberblick.html hat ${teile} nummerierte Teile, erwartet werden sechs. `
    + 'Sie entsprechen den sechs Schritten aus der Präsentation.');

const aktuellPos = seite.indexOf('id="aktuell"');
const ersterTeil = seite.indexOf('class="ub-teil');
assert.ok(aktuellPos > -1 && aktuellPos < ersterTeil,
  'Der Reform-Abschnitt muss vor den sechs Teilen stehen: er ist das Einzige '
    + 'mit einer Frist.');

/* --- 3) Die DVAG-Darstellungen sind da und liegen auch wirklich auf der Platte --- */

const bilder = [...seite.matchAll(/src="(\/assets\/images\/[^"]+)"/g)].map((t) => t[1]);
const eindeutig = [...new Set(bilder)];
assert.ok(eindeutig.length >= 5,
  `ueberblick.html bindet nur ${eindeutig.length} Bilder ein, erwartet werden mindestens fünf.`);

for (const pfad of eindeutig) {
  await access(new URL(`.${pfad}`, wurzel));
}

for (const noetig of ['dvag-formel', 'dvag-haushaltsplan', 'dvag-pyramide', 'dvag-zwei-konten']) {
  assert.ok(seite.includes(noetig),
    `ueberblick.html: die Darstellung ${noetig} fehlt.`);
}

// Zwei der Schaubilder sind Bildschirmaufnahmen aus der Beratungssoftware.
// Ohne die Zeile darunter liest sich eine Musterrechnung wie ein Versprechen.
const hinweise = (seite.match(/Beispielzahlen aus der Beratungssoftware/g) || []).length;
assert.equal(hinweise, 2,
  `ueberblick.html: ${hinweise} Hinweise auf Beispielzahlen, erwartet werden zwei `
    + '(Haushaltsplan und Zwei-Konten-Modell).');

/* --- 4) Mandantenfähig: die drei Wege zum Berater --- */

assert.match(logik, /getBeraterPublicById/,
  'js/ueberblick.js: der Weg über die Empfehlung fehlt.');
assert.match(logik, /getBeraterPublicBySlug/,
  'js/ueberblick.js: der Weg über ?berater=slug fehlt.');
assert.match(logik, /auth\.getSession\(\)[\s\S]{0,400}getCurrentBerater\(\)/,
  'js/ueberblick.js: der Weg über den angemeldeten Berater fehlt. Ohne ihn '
    + 'zeigt die Vorschau aus dem eigenen Portal den Standard-Berater.');

assert.match(logik, /gemerkterBerater\(brandKey\)/,
  'js/ueberblick.js: ohne den gemerkten Berater blitzt beim Laden ein fremdes Gesicht auf.');
assert.match(logik, /merkeBerater\(brandKey, berater\)/,
  'js/ueberblick.js: der aufgelöste Berater wird nicht gemerkt.');

assert.match(logik, /meta\[name="referral-token"\]/,
  'js/ueberblick.js liest den Token nicht aus der Seite. Über die Kurzadresse '
    + 'steht er nicht in der Adresszeile (tests/kurzadressen.test.mjs).');

assert.match(logik, /SICHERER_SLUG\.test/,
  'js/ueberblick.js prüft den Berater-Slug aus der Adresse nicht.');

// Die Kurzadresse /ueberblick/slug leitet Vercel serverseitig um. Die
// Adresszeile behält dabei den Pfad, in der Abfrage steht nichts. Wer nur dort
// nachsieht, zeigt bei jedem Partner still den Standard-Berater.
assert.match(logik, /pathname\.match\(\/\^\\\/ueberblick\\\//,
  'js/ueberblick.js liest den Berater nicht aus dem Pfad. Dann funktioniert '
    + '/ueberblick/slug nicht, obwohl der Rewrite in vercel.json steht. '
    + 'Muster wie in js/baufi.js und js/promoter-start.js.');

for (const haken of ['name', 'foto', 'rolle', 'adresse', 'booking', 'finanzcheck', 'impressum', 'datenschutz']) {
  assert.match(seite, new RegExp(`data-bb="${haken}"`),
    `ueberblick.html: der Branding-Haken data-bb="${haken}" fehlt. `
      + 'Ohne ihn steht dort bei jedem Berater dieselbe Angabe.');
}

// Kais Berufsjahre und seine Rezension gehören nur ihm.
for (const stelle of ['ub-belege', 'ub-rezension']) {
  const treffer = seite.match(new RegExp(`class="${stelle}"[^>]*`));
  assert.ok(treffer, `ueberblick.html: der Block ${stelle} fehlt.`);
  assert.match(treffer[0], /data-default-berater-only/,
    `"${stelle}" behauptet etwas über Kai und muss data-default-berater-only tragen.`);
}

/* --- 5) Die drei Wege am Ende, und was sie versprechen --- */

assert.match(seite, /id="ubAnrufSubmit"/, 'ueberblick.html: der Rückruf-Knopf fehlt.');
assert.match(seite, /id="ubSlot"/, 'ueberblick.html: das Feld für die gewählte Zeit fehlt.');
assert.match(logik, /markAnrufwunsch\(token, slot\)/,
  'js/ueberblick.js trägt den Anrufwunsch nicht ein.');

// Der wichtigste Schutz der Seite: ohne Token gibt es keine Empfehlung, an der
// der Wunsch hängen könnte. Eine stille Bestätigung wäre ein Versprechen, das
// niemand einlöst.
assert.match(logik, /if \(!token\)[\s\S]{0,400}unvollständig/,
  'js/ueberblick.js bestätigt den Anrufwunsch auch ohne Token. Dann liest der '
    + 'Empfänger „Notiert", und es ruft nie jemand an.');

assert.match(seite, /id="ubAustragen"/, 'ueberblick.html: der Austragen-Weg fehlt.');
assert.match(seite, /id="ubOptoutOhneToken"/,
  'ueberblick.html: ohne Token muss ein anderer Weg zum Abbestellen stehen, '
    + 'weil austragen.html den Token braucht.');
assert.match(logik, /mitToken\.hidden = !token/,
  'js/ueberblick.js blendet den Austragen-Weg ohne Token nicht aus.');

// Wenn niemand etwas auswählt, wird angerufen. Das gehört sichtbar auf die Seite.
assert.match(seite, /Wenn du nichts auswählst/,
  'ueberblick.html: der Hinweis fehlt, dass sich der Berater ohne Auswahl meldet.');

/* --- 6) Der Rechner rechnet nur im Browser, und sagt das auch --- */

assert.match(seite, /id="ubNetto"/, 'ueberblick.html: das Eingabefeld der Formel fehlt.');
assert.match(seite, /Nichts davon wird gesendet oder gespeichert/,
  'ueberblick.html: beim Rechner fehlt der Hinweis, dass nichts übertragen wird.');
assert.doesNotMatch(logik, /localStorage\.setItem\('ub|sessionStorage/,
  'js/ueberblick.js speichert Eingaben des Besuchers. Der Rechner soll rein '
    + 'im Browser laufen, ohne Spur.');

/* --- 7) Mobil und barrierefrei --- */

assert.match(stil, /@media \(max-width: ?720px\)/,
  'css/ueberblick.css hat keinen Umbruchpunkt fürs Handy.');
assert.match(stil, /prefers-reduced-motion/,
  'css/ueberblick.css berücksichtigt keine reduzierte Bewegung.');
assert.match(stil, /scroll-margin-top/,
  'css/ueberblick.css: ohne scroll-margin-top verschwinden Sprungziele unter '
    + 'der stehenden Kopfzeile.');
assert.match(stil, /\.ub-schiene\s*\{[\s\S]{0,200}overflow-x: ?auto|overflow-x: ?auto/,
  'css/ueberblick.css: die breiten Schaubilder müssen am Handy wischbar sein.');
assert.doesNotMatch(stil, /grayscale\(|saturate\(0\)/,
  'css/ueberblick.css: Bilder werden im Portal nicht entfärbt.');

/* --- 8) Verdrahtung --- */

const vercel = await lies('vercel.json');
assert.match(vercel, /"source": "\/ueberblick"/,
  'vercel.json: die Kurzadresse /ueberblick fehlt.');
assert.match(vercel, /"source": "\/ueberblick\/:berater"/,
  'vercel.json: die Adresse mit Berater-Kürzel fehlt.');

const share = await lies('api/share.js');
assert.match(share, /ueberblick: '\/ueberblick\.html'/,
  'api/share.js: ohne Eintrag ist die Seite über einen Empfehlungslink nicht erreichbar.');

const settings = await lies('dashboard/settings.html');
assert.match(settings, /href="\.\.\/ueberblick\.html"/,
  'dashboard/settings.html: die Vorschaukachel fehlt.');

console.log(`ueberblick-seite: OK (${teile} Teile, ${eindeutig.length} Bilder)`);
