// Phase 363: Die Empfängerseite bekommt Farbe und im Fuß Instagram und Facebook
// des Büros.
// Phase 364 (12.09.2026): Kais Farbrichtung ist Weiß, Blau und Grau. Weiß trägt
// die Seite, Hellblau die Themenkarten und den Finanzcheck, Blau Information und
// Auswahl, Hellgrau den Kontaktbereich, Gold nur die Hauptaktion.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('empfaenger.html');
const brand = read('js/berater-brand.js');
const sql = read('schema-phase363-buero-social.sql');

/* --- 1) Weiß trägt die Seite, nur der Kontaktbereich steht auf Grau --- */

for (const n of [1, 2, 3, 4, 5, 6]) {
  assert.match(html, new RegExp(`\\.chapter\\[data-step="${n}"\\][^{]*\\{background:`),
    `Schritt ${n} hat keine eigene Fläche.`);
}
assert.match(html, /\.chapter\[data-step="6"\]\{background:var\(--grau-flaeche\)\}/,
  'Der Kontaktbereich steht nicht auf der hellen Graufläche.');
// Die Kontaktkarte darauf ist weiß mit feiner Goldkante.
assert.match(html, /\.chapter\[data-step="6"\] \.decision-card\{background:#fff;[^}]*border-top:3px solid var\(--gold\)/,
  'Die Kontaktkarte braucht weißen Grund und die Goldkante.');
// Themenkarten hellblau, Auswahl in Blau mit heller Schrift.
assert.match(html, /\.choice\{background:var\(--blau-hell\)/);
assert.match(html, /\.choice\.selected\{background:var\(--petrol\);[^}]*color:#fff\}/,
  'Die ausgewählte Themenkarte braucht Blau mit heller Schrift.');
// Gold als Fläche schafft auf Weiß nur 2,3:1, taugt also nicht für den Fortschritt.
assert.match(html, /\.progress i\.active,\.progress i\.done\{background:var\(--petrol\)\}/,
  'Der Fortschritt gehört in Blau, nicht in Gold.');
// Keine vorausgewählte Anrufzeit (Kais Vorgabe vom 12.09.2026).
assert.doesNotMatch(html, /class="time selected"/, 'Es darf keine Zeit vorausgewählt sein.');
assert.doesNotMatch(html, /<option value="Nachmittags \(14–17 Uhr\)" selected>/, 'Das versteckte Feld darf nichts vorwählen.');

/* --- 2) Kontrast, gerechnet aus den Werten der Datei --- */

const wert = (name) => {
  const treffer = [...html.matchAll(new RegExp(`${name}:(#[0-9a-fA-F]{6})`, 'g'))].map((m) => m[1]);
  assert.equal(new Set(treffer).size, 1, `${name} ist nicht eindeutig definiert: ${treffer.join(', ')}`);
  return treffer[0];
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const kontrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const flaechen = {
  weiss: '#ffffff',
  Hellblau: wert('--blau-hell'),
  'Grau-Fläche': wert('--grau-flaeche'),
};
const paare = [];
for (const [flaeche, grund] of Object.entries(flaechen)) {
  paare.push([`Blau auf ${flaeche}`, wert('--petrol'), grund]);
  paare.push([`grauer Text auf ${flaeche}`, wert('--muted'), grund]);
  paare.push([`Schrift auf ${flaeche}`, wert('--ink'), grund]);
}
paare.push(['Weiß auf Blau (ausgewählte Karte)', '#ffffff', wert('--petrol')]);
paare.push(['Blau im blaugrauen Symbolfeld', wert('--petrol'), wert('--blau-grau')]);
paare.push(['Schrift auf dem Gold-Knopf', wert('--auf-gold'), wert('--gold')]);
paare.push(['Gold-Schrift auf Weiß', wert('--gold-dark'), '#ffffff']);
paare.push(['Rand eines Bedienelements auf Weiß', wert('--rand'), '#ffffff']);

// Text braucht 4,5:1. Für Ränder und Symbolflächen verlangt die Richtlinie 3:1,
// sie tragen keine Schrift.
const nurSymbol = /Symbolfeld|Rand eines Bedienelements/;
for (const [was, vorne, grund] of paare) {
  const k = kontrast(vorne, grund);
  const soll = nurSymbol.test(was) ? 3 : 4.5;
  assert.ok(k >= soll, `${was}: ${k.toFixed(2)}:1, verlangt sind ${soll}:1 (${vorne} auf ${grund})`);
}

/* --- 3) Im Fuß: Symbole des Büros, keine feste Adresse --- */

for (const [klasse, feld, name] of [['legal-ig', 'instagram', 'Instagram'], ['legal-fb', 'facebook', 'Facebook']]) {
  const tag = html.match(new RegExp(`<a class="${klasse}"[^>]*>`));
  assert.ok(tag, `${name}-Symbol fehlt im Fuß.`);
  assert.match(tag[0], new RegExp(`data-bb="${feld}"`));
  assert.match(tag[0], /rel="noopener noreferrer"/);
  assert.match(tag[0], new RegExp(`aria-label="${name}"`));
  assert.match(tag[0], / hidden>/, `${name}: Das Symbol muss versteckt starten, bis das Büro seine Adresse liefert.`);
  assert.doesNotMatch(tag[0], /href=/, `${name}: Die Adresse gehört ins Büroprofil, nicht in die Seite.`);
}
assert.doesNotMatch(html, /instagram\.com|facebook\.com/, 'Keine festen Profiladressen in der Seite.');
// display:grid schlägt hidden. Ohne diese Regel stünden leere Kreise da.
assert.match(html, /\.legal-social a\[hidden\]\{display:none\}/);

/* --- 4) berater-brand.js setzt die Adresse, nur https --- */

assert.match(brand, /case 'instagram':\s*case 'facebook':/);
assert.match(brand, /\/\^https:\\\/\\\/\/\.test\(url\)/, 'Nur https-Adressen dürfen als Link gesetzt werden.');
assert.match(brand, /el\.hidden = true;/);
// Neuer Schlüssel, sonst behalten Wiederkehrer den alten Datensatz ohne die Felder.
assert.match(brand, /BRAND_CACHE_PREFIX = 'bb_berater_v5_'/);

// Angemeldete Vorschau und Aufruf ohne Link laden den Berater ohne die Felder.
// Dann holt die Seite nur die Profile nach, sonst stünden dort nie Symbole und
// die Seite sähe beim eigenen Nachsehen kaputt aus.
const app = read('js/app.js');
assert.match(app, /import \{[^}]*setzeProfile[^}]*\} from '\.\/berater-brand\.js'/);
assert.match(app, /!\('instagram_url' in profilQuelle\)[\s\S]{0,200}getBeraterPublicById\(id\)[\s\S]{0,80}setzeProfile\(profil\)/,
  'Fehlen die Profile im Datensatz, müssen sie nachgeladen werden.');
assert.match(brand, /export function setzeProfile\(b\)/);

/* --- 5) Datenbank: Felder am Büro, über beide Lesefunktionen --- */

assert.match(sql, /add column if not exists instagram_url text/);
assert.match(sql, /add column if not exists facebook_url text/);
assert.match(sql, /check \(instagram_url is null or instagram_url ~ '\^https:\/\/'\)/);
assert.match(sql, /check \(facebook_url is null or facebook_url ~ '\^https:\/\/'\)/);
assert.equal((sql.match(/o\.instagram_url/g) || []).length, 2, 'Beide Lesefunktionen müssen Instagram liefern.');
assert.equal((sql.match(/o\.facebook_url/g) || []).length, 2, 'Beide Lesefunktionen müssen Facebook liefern.');
// Welche Profile ein Büro hat, sind Daten, keine Struktur.
assert.doesNotMatch(sql.replace(/^--.*$/gm, ''), /https:\/\/www\./, 'Profiladressen gehören nicht in die Migration.');

console.log(`empfaenger-farbe: OK (${paare.length} Kontrastpaare)`);
