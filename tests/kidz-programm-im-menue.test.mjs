/**
 * Das KIDZ-Programm ist aus dem Portal heraus erreichbar.
 *
 * Die Elternseite (`/kidz/konzept`) war von außen praktisch unauffindbar:
 * kidz.teamwachsbleiche.de führt auf das Sommerfest, und von dort verlinkt
 * keine der öffentlichen KIDZ-Seiten auf das Konzept. Der einzige verlässliche
 * Ort, an dem alle Partner ohnehin arbeiten, ist das Portal. Deshalb steht der
 * Zugang im KIDZ-Reiter der Seitenleiste.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const nav = await readFile(new URL('../js/nav.js', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

/* --- 1) Der Punkt steht im KIDZ-Reiter --- */

const kidzBlock = nav.slice(nav.indexOf("id: 'kidz'"), nav.indexOf("id: 'team'"));
assert.match(kidzBlock, /label: 'Das KIDZ-Programm'/,
  'Im KIDZ-Reiter fehlt der Zugang zum KIDZ-Programm.');
assert.match(kidzBlock, /href: '\/kidz\/konzept'/,
  'Der Zugang muss auf die Elternseite /kidz/konzept zeigen.');
assert.match(kidzBlock, /label: 'Das KIDZ-Programm', href: '\/kidz\/konzept', kunde: true/,
  'Der Punkt führt auf eine Kundenseite und braucht deshalb kunde: true.');

/* --- 2) Kundenseiten öffnen in einem eigenen Tab und tragen den Absender --- */

assert.match(nav, /s\.kunde \? ' target="_blank" rel="noopener" data-berater-link'/,
  'Unterpunkte mit kunde: true müssen in einem eigenen Tab öffnen und data-berater-link tragen, '
  + 'sonst fehlt der Absender und Anmeldungen landen beim falschen Partner.');
assert.match(nav, /a\[data-berater-link\]/,
  'Der Slug-Anhänger muss data-berater-link kennen.');

/* --- 3) Die Adresse gibt es wirklich --- */

const ziele = vercel.rewrites.map((r) => r.source);
assert.ok(ziele.includes('/kidz/konzept'),
  'In vercel.json fehlt die Umschreibung für /kidz/konzept.');

console.log('kidz-programm-im-menue: OK');
