/**
 * Alle KIDZ-Seiten sind im Portal-Menü mit einem Klick erreichbar.
 *
 * Erst ging es darum, die Elternseite (`/kidz/konzept`) überhaupt auffindbar zu
 * machen: Von außen führt kidz.teamwachsbleiche.de auf das Sommerfest, und keine
 * der öffentlichen KIDZ-Seiten verlinkt auf das Konzept. Deshalb steht der Punkt
 * im KIDZ-Reiter der Seitenleiste (Phase 277). Von Phase 284 an war er mit
 * `bald: true` gesperrt, weil die Seite noch nicht fertig war.
 *
 * Seit 13.09.2026 ist die kurze Konzeptseite live und der Punkt offen. Kai wollte
 * dort, wo KIDZ verwaltet wird, alle KIDZ-Seiten griffbereit haben: Konzept,
 * vollständige Fassung, Anmeldung und Rückblick. Dieser Wächter hält das fest.
 * Das Merkmal `bald` bleibt im Renderer, falls wieder etwas angekündigt wird.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const nav = await readFile(new URL('../js/nav.js', import.meta.url), 'utf8');
const settings = await readFile(new URL('../dashboard/settings.html', import.meta.url), 'utf8');
const sommerfest = await readFile(new URL('../kidz-sommerfest.html', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

/* --- 1) Der KIDZ-Reiter führt auf alle KIDZ-Seiten --- */

const kidzBlock = nav.slice(nav.indexOf("id: 'kidz'"), nav.indexOf("id: 'team'"));
assert.match(kidzBlock, /label: 'KIDZ-Konzept', href: '\/kidz\/konzept', kunde: true \}/,
  'Das KIDZ-Konzept ist freigegeben: Kundenseite mit Absender, ohne bald.');
assert.doesNotMatch(kidzBlock, /bald: true/, 'Im KIDZ-Reiter ist nichts mehr gesperrt.');
assert.match(kidzBlock, /label: 'KIDZ-Konzept vollständig', href: '\/kidz\/konzept-komplett', neuerTab: true \}/,
  'Die vollständige Fassung öffnet im eigenen Tab, aber ohne Absender, sie geht nicht an Eltern.');
assert.match(kidzBlock, /label: 'Anmeldung KIDZ for Future', href: '\/kidz\/elternabend', kunde: true \}/);
assert.match(kidzBlock, /label: 'Rückblick Sommerfest 2026', href: '\/kidz\/sommerfest-2026', kunde: true \}/);
assert.match(kidzBlock, /label: 'Sommerfest-Gewinnspiel', href: path\('dashboard\/kidz-gewinnspiel\.html'\)/);
assert.match(kidzBlock, /label: 'KIDZ for Future', href: path\('dashboard\/kidz-elternabend\.html'\)/);

/* --- 2) Der Renderer: bald bleibt ein <span>, neuerTab ohne Absender --- */

// Nur der gesperrte Zweig des Ternärs, also bis zum `:` vor dem normalen <a>.
const baldZweig = nav.slice(nav.indexOf('s.bald ?'), nav.indexOf('</span>` : `'));
assert.ok(baldZweig.length > 0, 'Der Renderer kennt das Merkmal bald nicht mehr.');
assert.match(baldZweig, /<span class="nav-sub nav-sub-bald"/);
assert.ok(!/<a[^>]*\$\{s\.href\}/.test(baldZweig), 'Ein gesperrter Unterpunkt darf keine Adresse tragen.');
assert.match(nav, /s\.kunde \? ' target="_blank" rel="noopener" data-berater-link' : s\.neuerTab \? ' target="_blank" rel="noopener"' : ''/,
  'kunde öffnet mit Absender, neuerTab ohne, alles andere im selben Tab.');
assert.match(nav, /a\[data-berater-link\]/, 'Der Slug-Anhänger muss data-berater-link kennen.');

/* --- 3) Die Kachel in den Einstellungen ist ebenfalls offen --- */

assert.match(settings, /<a class="settings-tile" data-berater-link href="\.\.\/kidz\/konzept" target="_blank">/);
assert.doesNotMatch(settings, /settings-tile-bald/);

/* --- 4) Adressen: Kurzadresse, feste Archivadresse, Hauptadresse des Rückblicks --- */

const rewrites = Object.fromEntries(vercel.rewrites.map((r) => [r.source, r.destination]));
assert.equal(rewrites['/kidz/konzept'], '/kidz-konzept.html');
assert.equal(rewrites['/kidz/sommerfest'], '/kidz-sommerfest.html');
assert.equal(rewrites['/kidz/sommerfest-2026'], '/kidz-sommerfest.html');
const kurz = vercel.redirects.find((r) => r.source === '/konzept');
assert.ok(kurz, 'Die Kurzadresse kidz.teamwachsbleiche.de/konzept fehlt.');
assert.equal(kurz.destination, '/kidz/konzept');
assert.equal(kurz.permanent, false);
assert.deepEqual(kurz.has, [{ type: 'host', value: 'kidz.teamwachsbleiche.de' }],
  'Die Kurzadresse gilt nur für die KIDZ-Adresse, nicht für andere Adressen des Portals.');
assert.match(sommerfest, /<link rel="canonical" href="https:\/\/kidz\.teamwachsbleiche\.de\/kidz\/sommerfest-2026">/);
assert.match(sommerfest, /<meta property="og:url" content="https:\/\/kidz\.teamwachsbleiche\.de\/kidz\/sommerfest-2026">/);

console.log('kidz-programm-im-menue: OK (alle KIDZ-Seiten im Menü, Kurz- und Archivadresse gesetzt)');
