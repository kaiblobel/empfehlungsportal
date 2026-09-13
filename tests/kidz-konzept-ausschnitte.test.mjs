import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

// Kai, 13.09.2026: Die öffentliche KIDZ-Konzeptseite ist eine kurze, intensive Infoseite. Wer alles online sieht,
// hat keinen Grund mehr, zum Elternabend zu kommen. Die vollständige Fassung bleibt unverlinkt und unverändert.
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, komplett, komplettCss, js, komplettJs] = await Promise.all([
  read('kidz-konzept.html'),
  read('kidz-konzept-komplett.html'),
  read('css/kidz-konzept-komplett.css'),
  read('js/kidz-konzept.js'),
  read('js/kidz-konzept-komplett.js'),
]);

/* --- Kurz: genau diese sechs Abschnitte, in dieser Reihenfolge --- */

assert.match(html, /content="index,follow"/);
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const abschnitte = [...main.matchAll(/<(?:section|aside)\b[^>]*\bid="([\w-]+)"/g)].map((treffer) => treffer[1]);
assert.deepEqual(abschnitte, ['start', 'sommerfest', 'saeulen', 'luecke', 'elternabend', 'fragen']);
assert.equal((main.match(/<details>/g) || []).length, 3, 'Drei Fragen genügen.');

for (const verraten of [
  /data-car=/, /55 Euro/, /18 Jahre lang/, /1\.045\.154/, /287\.274/, /11\.880/,
  /Die U4 als früher Orientierungspunkt/, /VIP-Ticket in puncto Gesundheit/, /class="gap-fall"/,
  /pillar-tab/, /data-story-slide/, /choice-card/, /id="idee"/,
]) {
  assert.doesNotMatch(html, verraten);
}

/* --- Der Abend: Vorsprung als Aufhänger, nur mit Hinweis, und direkt vormerken --- */

const abend = html.slice(html.indexOf('id="elternabend"'), html.indexOf('id="fragen"'));
assert.match(abend, /Das Wichtigste zeigen wir dir am Abend\./);
assert.match(abend, /<article class="am-abend-vorsprung"><span>Der Vorsprung, den Eltern ihrem Kind verschaffen können<\/span><strong>757\.880 Euro<\/strong>/);
assert.equal(html.split('757.880').length - 1, 1);
assert.match(abend, /<p class="am-abend-hinweis">Beispielrechnung mit 7,3 Prozent Wertentwicklung pro Jahr\. Keine Zusage/);
assert.match(abend, /<strong>60 Minuten<\/strong>/);
assert.match(abend, /data-open-path="elternabend"/);

/* --- Was andere Seiten und das Skript brauchen --- */

assert.match(html, /id="kindName"/);
assert.match(html, /id="kindNameAusgabe"/);
for (const [, ziel] of html.matchAll(/href="#([\w-]+)"/g)) {
  assert.match(html, new RegExp(`id="${ziel}"`), `Sprungziel #${ziel} fehlt`);
}
assert.match(js, /if \(storyTrack\) \{/, 'Ohne Bildstrecke darf das Skript nicht abbrechen.');

/* --- Das Original: unverlinkt, gesperrt für Suchmaschinen, mit eigenen eingefrorenen Dateien --- */

assert.match(komplett, /<meta name="robots" content="noindex,nofollow">/);
assert.match(komplett, /href="\/css\/kidz-konzept-komplett\.css\?v=\d+"/);
assert.match(komplett, /src="\/js\/kidz-konzept-komplett\.js\?v=\d+"/);
assert.match(komplett, /55 Euro im Monat\. 18 Jahre lang/);
assert.equal((komplett.match(/data-car=/g) || []).length, 8);
for (const spur of [/kurz-/, /am-abend/, /Mobile first \(Kai/]) {
  assert.doesNotMatch(komplettCss, spur, 'Die Stildatei des Originals trägt Regeln der kurzen Seite.');
  assert.doesNotMatch(komplett, spur, 'Das Original trägt Bausteine der kurzen Seite.');
}
assert.doesNotMatch(komplettJs, /if \(storyTrack\)/);

const seiten = (await readdir(new URL('..', import.meta.url)))
  .filter((datei) => datei.endsWith('.html') && datei !== 'kidz-konzept-komplett.html');
for (const seite of seiten) {
  assert.doesNotMatch(await read(seite), /konzept-komplett/, `${seite} verlinkt die vollständige Fassung`);
}
