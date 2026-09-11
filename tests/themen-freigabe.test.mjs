// Unfertige Themen sind für Empfehlungen gesperrt (Phase 345, 11.09.2026).
//
// Kais Regel: Kein Interessent sieht eine Seite, die nicht fertig ist. Die
// Sperre steht in vorlagen.in_arbeit und wird an vier Stellen durchgesetzt:
// Auswahl in der Promoter-App und im Formular, Weiterleitung alter Links
// (api/share.js), Themenseite ohne Anmeldung und die Datenbank selbst.
// Fällt eine davon weg, ist die Sperre an dieser Stelle still offen.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// Eine Regel an einer Stelle; Allgemein ist nie gesperrt.
const supa = read('js/supabase.js');
assert.match(supa, /export function themaGesperrt\(vorlage\)/, 'themaGesperrt fehlt in js/supabase.js');
assert.match(supa, /vorlage\.slug === 'allgemein'\) return false/, 'Allgemein muss immer frei bleiben');
assert.match(supa, /slug: 'banking'[^}]*in_arbeit: true/, 'Banking hat keine eigene Seite und muss gesperrt sein');
assert.match(supa, /slug: 'energie'[^}]*in_arbeit: true/, 'Energie hat keine eigene Seite und muss gesperrt sein');

// Promoter-App: gesperrt heißt disabled und ohne Klick-Handler.
const promoter = read('js/empfehler-mobile.js');
assert.match(promoter, /themaGesperrt\(template\)/, 'Promoter-App prüft die Sperre nicht');
assert.match(promoter, /\[data-topic\]:not\(\[disabled\]\)/, 'Promoter-App hängt Klicks auch an gesperrte Themen');

// Öffentliches Formular und Allgemein-Seite.
const app = read('js/app.js');
assert.match(app, /themaGesperrt\(v\)/, 'Formular prüft die Sperre nicht');
assert.match(app, /\.vorlage-kachel:not\(\[disabled\]\)/, 'Formular hängt Klicks auch an gesperrte Themen');
assert.match(app, /!themaGesperrt\(gewaehlt\)/, 'Allgemein-Seite zeigt sonst Inhalte eines gesperrten Themas');

// Alte Links: gesperrtes Thema führt auf die allgemeine Seite.
const share = read('api/share.js');
assert.match(share, /in_arbeit=eq\.false/, 'share.js fragt die Freigabe nicht ab');
assert.match(share, /if \(gesperrt\) pagePath = '\/empfaenger\.html'/, 'share.js leitet gesperrte Themen nicht um');

// Themenseite ohne Anmeldung, interne Vorschau nur mit Anmeldung.
const themen = read('js/themen-vorschau.js');
assert.match(themen, /async function weiterleitenWennGesperrt/, 'thema.html prüft die Sperre nicht');
assert.match(themen, /location\.replace\(ziel\.toString\(\)\)/, 'thema.html leitet gesperrte Themen nicht um');
assert.match(themen, /async function vorschauNurAngemeldet/, 'themen-vorschau.html ist ohne Anmeldung offen');

// Berater-Feld: gesperrte Themen nicht neu wählbar.
const liste = read('dashboard/empfehlungen.html');
assert.match(liste, /opt\.disabled = gesperrt/, 'Berater kann ein gesperrtes Thema wieder setzen');

// Datenbank: die Anlage-Funktion setzt gesperrte Themen auf Allgemein.
const sql = read('schema-phase345-themen-freigabe.sql');
assert.match(sql, /not v\.in_arbeit/, 'SQL prüft in_arbeit nicht');
assert.match(sql, /v_thema := 'allgemein'/, 'SQL fällt nicht auf Allgemein zurück');
assert.doesNotMatch(sql, /drop function/i, 'drop function verliert Rechte und security definer');

console.log('themen-freigabe: OK');
