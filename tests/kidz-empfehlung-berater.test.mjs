/**
 * Auf der KIDZ-Empfehlungsseite steht der Berater, der sie verschickt.
 *
 * Die Seite lief lange nur über das Empfehlungs-Token. Wer sie ohne Token
 * öffnete (Vorschau in der Präsentation, QR-Weg, Blick aus dem eigenen
 * Dashboard), sah das statische Portrait aus dem HTML — also Kai, auch als
 * angemeldeter Partner. Dieser Test hält die drei Wege fest, auf denen der
 * richtige Berater gefunden wird, und dass Kais persönliche Angaben bei
 * jemand anderem verschwinden.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modul = await readFile(new URL('../js/kidz-empfehlung-intro.js', import.meta.url), 'utf8');
const seite = await readFile(new URL('../kidz-empfehlung.html', import.meta.url), 'utf8');

/* --- 1) Drei Wege zum Berater --- */

assert.match(modul, /getBeraterPublicById/, 'Weg 1 fehlt: Berater über das Empfehlungs-Token.');
assert.match(modul, /getBeraterPublicBySlug\(slugParam\)/, 'Weg 2 fehlt: Berater über ?berater=slug.');
assert.match(
  modul,
  /supabase\.auth\.getSession\(\)[\s\S]*getCurrentBerater\(\)/,
  'Weg 3 fehlt: der eingeloggte Berater, wenn weder Token noch Slug da sind.',
);

/* --- 2) Der Slug aus der Adresse wird geprüft, nicht blind übernommen --- */

assert.match(modul, /SICHERER_SLUG\.test\(roh\)/, 'Der Slug aus der Adresse muss gegen SICHERER_SLUG laufen.');

/* --- 3) Gefundener Berater wird gemerkt, damit beim zweiten Aufruf kein
        fremdes Gesicht aufblitzt --- */

assert.match(modul, /gemerkterBerater\(brandKey\)/, 'Das gemerkte Branding fehlt.');
assert.match(modul, /merkeBerater\(brandKey, berater\)/, 'Der gefundene Berater wird nicht gemerkt.');

/* --- 4) Kais persönliche Angaben gehören nur Kai --- */

for (const stelle of ['intro-person-facts', 'intro-person intro-person-back']) {
  const treffer = seite.match(new RegExp(`class="${stelle}"[^>]*`));
  assert.ok(treffer, `In kidz-empfehlung.html fehlt "${stelle}".`);
  assert.match(
    treffer[0],
    /data-default-berater-only/,
    `"${stelle}" trägt Kais Familie und Berufsjahre und muss data-default-berater-only tragen.`,
  );
}

/* --- 5) Impressum und Datenschutz folgen dem Berater --- */

assert.match(seite, /data-bb="impressum"/, 'Der Impressum-Link im Fuß zeigt fest auf Kai.');
assert.match(seite, /data-bb="datenschutz"/, 'Der Datenschutz-Link im Fuß zeigt fest auf Kai.');

console.log('kidz-empfehlung-berater: OK');
