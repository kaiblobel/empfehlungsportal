import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Kai, 13.09.2026: Alle KIDZ-Seiten verlinken dezent auf die Team-Wachsbleiche-Homepage, und zwar über den
// Veranstalternamen in der Fußzeile. buero-brand.js setzt nur den Text des <strong>, der Link bleibt erhalten.
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

for (const seite of ['kidz-sommerfest.html', 'kidz-konzept.html', 'kidz-elternabend.html']) {
  const html = await read(seite);
  assert.match(html, /<a class="kidz-homepage-link" href="https:\/\/teamwachsbleiche\.de\/"[^>]*><strong data-bo="bezeichnung">/, `${seite}: Homepage-Link am Veranstalternamen fehlt`);
  const fuss = html.slice(html.indexOf('<footer'));
  assert.ok(fuss.includes('kidz-homepage-link'), `${seite}: Der Homepage-Link gehört in die Fußzeile`);
}

// Die vollständige Konzeptseite bleibt unverändert.
assert.doesNotMatch(await read('kidz-konzept-komplett.html'), /kidz-homepage-link/);
