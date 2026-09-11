// Zugangs-Mail für Promoter: Outlook-tauglich und professionell (11.09.2026).
//
// Kai sah die Mail in Outlook am Rechner: Der Knopf war ein schwarzer Textkasten,
// Abstände und runde Ecken fehlten. Outlook ignoriert div-Abstände, Polster an
// Links und WebP-Bilder. Deshalb Tabellen, Knopf als Tabellenzelle mit bgcolor,
// Logo als JPG, dazu ein Ersatzlink, falls der Knopf nicht klickbar ist.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const edge = read('supabase/functions/promoter-access-request/index.ts');
const html = edge.slice(edge.indexOf('function emailHtml('), edge.indexOf('function emailText('));
const text = edge.slice(edge.indexOf('function emailText('));

assert.ok(html.length > 500, 'emailHtml nicht gefunden');
assert.match(html, /<table role="presentation"/, 'Layout muss aus Tabellen bestehen');
assert.match(html, /<td bgcolor="#0B4650"[^>]*>\s*<a href="\$\{link\}"/, 'Knopf als Tabellenzelle mit fester Hintergrundfarbe');
assert.match(html, /team-wachsbleiche-marke-mail-120\.jpg/, 'Logo als JPG');
assert.doesNotMatch(html, /\.webp/, 'Outlook zeigt kein WebP');
assert.doesNotMatch(html, /<div style="max-width/, 'kein div-Layout, Outlook ignoriert es');
assert.match(html, /Falls der Knopf nicht funktioniert/, 'Ersatzlink fehlt');
assert.doesNotMatch(html, />Empfehlungsportal</, 'Das Wort Empfehlungsportal gehört nicht in die Mail');
assert.match(text, /Viele Grüße/);

// Das Logo liegt im Portal und bleibt klein.
const logo = statSync(new URL('../assets/images/team-wachsbleiche-marke-mail-120.jpg', import.meta.url));
assert.ok(logo.size > 1024 && logo.size < 20 * 1024, `Mail-Logo ${logo.size} Bytes`);

console.log('promoter-mail-gestaltung: OK');
