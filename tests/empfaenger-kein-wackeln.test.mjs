// Phase 371: Die Seite darf beim Schrittwechsel nicht zur Seite springen.
//
// Kais Befund am 12.09.2026: „die seite ist nicht fixiert die wackelt im fenster."
//
// Ursache, gemessen bei 1440x900: Jedes Kapitel scrollt für sich (.chapter{overflow:auto}),
// und sie sind unterschiedlich hoch. Schritt 1 (951 px Inhalt) und Schritt 5 (1050 px)
// laufen über die 828 px Sichthöhe hinaus, Schritt 2, 3, 4 und 6 passen genau. Wo der
// Scrollbalken echten Platz wegnimmt, und das ist auf Windows der Normalfall, springt der
// Inhalt bei jedem Wechsel um dessen Breite zur Seite.
//
// Auf dem Mac und am Handy liegt der Balken über dem Inhalt, dort fällt es nicht auf.
// Genau deshalb ist so etwas leicht zu übersehen und gehört in einen Wächter.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../empfaenger.html', import.meta.url), 'utf8');

// Der Platz für den Balken wird immer reserviert, auch wenn keiner gebraucht wird.
// Gemessen danach: nutzbare Breite konstant 1425 statt abwechselnd 1425 und 1440.
assert.match(html, /\.chapter\{[^}]*overflow:auto;scrollbar-gutter:stable\}/,
  'Ohne scrollbar-gutter springt der Inhalt bei jedem Schrittwechsel zur Seite.');

// Die Kapitel müssen einzeln scrollen dürfen: Schritt 5 trägt Bürofoto, Zahlen, Text,
// zwölf Rezensionen und zwei Kacheln und passt auf kleinen Fenstern nicht.
assert.match(html, /\.chapter\{position:absolute;inset:72px 0 0;/,
  'Die Kapitel füllen den Bereich unter der Kopfzeile.');

// Der Rahmen darf nicht zusätzlich scrollen, sonst gibt es zwei Scrollebenen
// übereinander und es ruckelt erst recht.
assert.match(html, /\.story\{min-height:100svh;position:relative;overflow:hidden/,
  'Der Rahmen um die Kapitel darf nicht selbst scrollen.');

console.log('empfaenger-kein-wackeln: OK');
