/**
 * Das KIDZ-Konzept steht im Menü, ist dort aber noch gesperrt.
 *
 * Erst ging es darum, die Elternseite (`/kidz/konzept`) überhaupt auffindbar zu
 * machen: Von außen führt kidz.teamwachsbleiche.de auf das Sommerfest, und keine
 * der öffentlichen KIDZ-Seiten verlinkt auf das Konzept. Deshalb steht der Punkt
 * im KIDZ-Reiter der Seitenleiste (Phase 277).
 *
 * Seit Phase 284 ist die Seite dort **noch nicht freigegeben**: Die Partner
 * sollen sehen, dass sie kommt, aber noch nicht hin. Der Punkt bleibt also
 * sichtbar, verliert aber seine Adresse. Seit Phase 285 heißt er „KIDZ-Konzept":
 * Der alte Name „Das KIDZ-Programm" brach in der Leiste auf zwei Zeilen um.
 *
 * Dieser Wächter hält beides fest: dass der Punkt da ist, und dass er zu ist.
 * Beim Freischalten fällt `bald: true` weg, dann muss auch dieser Test wieder
 * auf „offen" umgestellt werden.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const nav = await readFile(new URL('../js/nav.js', import.meta.url), 'utf8');
const settings = await readFile(new URL('../dashboard/settings.html', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

/* --- 1) Der Punkt steht im KIDZ-Reiter und ist gesperrt --- */

const kidzBlock = nav.slice(nav.indexOf("id: 'kidz'"), nav.indexOf("id: 'team'"));
assert.match(kidzBlock, /label: 'KIDZ-Konzept', href: '\/kidz\/konzept', kunde: true, bald: true/,
  'Im KIDZ-Reiter muss der Punkt „KIDZ-Konzept" stehen, auf /kidz/konzept zeigen, als Kundenseite '
  + 'ausgezeichnet und mit bald: true gesperrt sein.');

/* --- 2) Gesperrt heißt: kein Link, nicht nur ausgegraut --- */

// Nur der gesperrte Zweig des Ternärs, also bis zum `:` vor dem normalen <a>.
// Wer weiter schneidet, prüft den offenen Link mit und bekommt falsche Treffer.
const baldZweig = nav.slice(nav.indexOf('s.bald ?'), nav.indexOf('</span>` : `'));
assert.ok(baldZweig.length > 0, 'Der Renderer kennt das Merkmal bald nicht mehr.');
assert.match(baldZweig, /<span class="nav-sub nav-sub-bald"/,
  'Ein gesperrter Unterpunkt muss als <span> gerendert werden.');
assert.ok(!/<a[^>]*\$\{s\.href\}/.test(baldZweig),
  'Ein gesperrter Unterpunkt darf keine Adresse tragen — über Mittelklick und Kontextmenü '
  + 'wäre ein ausgegrauter Link weiter erreichbar.');
assert.ok(!baldZweig.includes('data-berater-link'),
  'Ein gesperrter Unterpunkt braucht keinen Slug-Anhänger.');
assert.match(baldZweig, /nav-sub-marke">bald</,
  'Am gesperrten Punkt fehlt die Marke „bald", sonst sieht er nur kaputt aus.');

/* --- 3) Derselbe Weg über die Einstellungen ist ebenfalls zu --- */

assert.ok(!/<a[^>]*href="\.\.\/kidz\/konzept"/.test(settings),
  'Die Vorschau-Kachel in den Einstellungen darf nicht auf die gesperrte Seite verlinken, '
  + 'sonst ist die Sperre im Menü wirkungslos.');
assert.match(settings, /settings-tile settings-tile-bald/,
  'Die Kachel „KIDZ für Eltern" soll sichtbar bleiben, aber gesperrt.');

/* --- 4) Offene Kundenseiten öffnen weiter im eigenen Tab mit Absender --- */

assert.match(nav, /s\.kunde \? ' target="_blank" rel="noopener" data-berater-link'/,
  'Unterpunkte mit kunde: true müssen in einem eigenen Tab öffnen und data-berater-link tragen, '
  + 'sonst fehlt der Absender und Anmeldungen landen beim falschen Partner.');
assert.match(nav, /a\[data-berater-link\]/,
  'Der Slug-Anhänger muss data-berater-link kennen.');

/* --- 5) Die Adresse selbst bleibt bestehen --- */

const ziele = vercel.rewrites.map((r) => r.source);
assert.ok(ziele.includes('/kidz/konzept'),
  'In vercel.json fehlt die Umschreibung für /kidz/konzept. Gesperrt ist nur der Weg über das '
  + 'Portal, die Seite selbst bleibt erreichbar.');

console.log('kidz-programm-im-menue: OK (Punkt „KIDZ-Konzept" steht im Menü und ist gesperrt)');
