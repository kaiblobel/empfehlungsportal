import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

// Kai, 13.09.2026: Die öffentliche KIDZ-Konzeptseite zeigt nur Ausschnitte. Wer alles online sieht,
// hat keinen Grund mehr, zum Elternabend zu kommen. Die vollständige Fassung bleibt unverlinkt erhalten.
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, komplett] = await Promise.all([read('kidz-konzept.html'), read('kidz-konzept-komplett.html')]);

assert.match(html, /content="index,follow"/);
for (const verraten of [
  /data-car=/, /55 Euro im Monat\. 18 Jahre lang/, /1\.045\.154/, /757\.880/,
  /Die U4 als früher Orientierungspunkt/, /VIP-Ticket in puncto Gesundheit/, /class="gap-fall"/,
]) {
  assert.doesNotMatch(html, verraten);
}

// Der Ersatz: ein Abschnitt, der neugierig auf den Abend macht und direkt vormerken lässt.
assert.match(html, /<section class="section health-future-section am-abend-section" id="am-abend"/);
assert.match(html, /Das Wichtigste zeigen wir dir am Abend\./);
const abend = html.slice(html.indexOf('id="am-abend"'), html.indexOf('id="kidz-momente"'));
assert.match(abend, /data-open-path="elternabend"/);

// Sprungziele, auf die andere Seiten zeigen, bleiben bestehen.
for (const id of ['saeulen', 'luecke', 'elternabend', 'fragen', 'sommerfest']) {
  assert.match(html, new RegExp(`id="${id}"`));
}
assert.match(html, /id="kindName"/);
assert.match(html, /<strong>60 Minuten<\/strong>/);

// Jeder Sprunglink auf der Seite hat ein Ziel.
for (const [, ziel] of html.matchAll(/href="#([\w-]+)"/g)) {
  assert.match(html, new RegExp(`id="${ziel}"`), `Sprungziel #${ziel} fehlt`);
}

// Die vollständige Fassung: gesperrt für Suchmaschinen und von keiner Seite verlinkt.
assert.match(komplett, /<meta name="robots" content="noindex,nofollow">/);
assert.match(komplett, /55 Euro im Monat\. 18 Jahre lang/);
const seiten = (await readdir(new URL('..', import.meta.url)))
  .filter((datei) => datei.endsWith('.html') && datei !== 'kidz-konzept-komplett.html');
for (const seite of seiten) {
  assert.doesNotMatch(await read(seite), /konzept-komplett/, `${seite} verlinkt die vollständige Fassung`);
}
