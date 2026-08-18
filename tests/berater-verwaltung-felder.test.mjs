/**
 * Die Berater-Verwaltung darf beim Speichern nichts löschen.
 *
 * Das Formular in js/berater-admin.js sammelt beim Speichern ALLE Felder mit
 * dem Attribut data-f ein und schreibt sie zurück, leere als null. Wird ein
 * Feld beim Laden nicht mitgelesen, kommt es als undefined an, wird als leeres
 * Eingabefeld gezeichnet und beim nächsten Speichern gelöscht.
 *
 * Genau so verschwanden die drei Bildfelder aus Phase 251: Wer bei einem
 * Berater nur die Telefonnummer korrigierte, setzte dabei Bürofoto, Teamfoto
 * und Bildzeile auf null. Ohne Warnung, ohne dass es jemandem auffiel.
 *
 * Dieser Wächter hält fest: Was das Formular schreiben kann, muss listBerater
 * auch laden.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

const admin = await lies('js/berater-admin.js');
const supabase = await lies('js/supabase.js');

/* --- 1) Welche Felder schreibt das Formular? --- */

const geschrieben = new Set(
  [...admin.matchAll(/data-f="([a-z_]+)"/g)].map((t) => t[1]),
);

assert.ok(
  geschrieben.size > 5,
  `In js/berater-admin.js wurden nur ${geschrieben.size} data-f-Felder gefunden. `
    + 'Entweder hat sich die Schreibweise geändert oder der Test greift ins Leere.',
);

// Wird beim Speichern ausdrücklich übersprungen, gehört also nicht dazu.
geschrieben.delete('auth_user_id_readonly');

/* --- 2) Welche Felder lädt die Verwaltung? --- */

const listBerater = supabase.slice(supabase.indexOf('export async function listBerater'));
const auswahl = listBerater.match(/\.select\('([^']+)'\)/);

assert.ok(auswahl, 'In js/supabase.js hat listBerater keine erkennbare .select()-Liste mehr.');

const geladen = new Set(auswahl[1].split(',').map((s) => s.trim()));

/* --- 3) Jedes schreibbare Feld muss geladen werden --- */

const fehlend = [...geschrieben].filter((feld) => !geladen.has(feld)).sort();

assert.deepEqual(
  fehlend,
  [],
  `listBerater in js/supabase.js lädt ${fehlend.length} Feld(er) nicht, die das `
    + `Formular überschreiben kann: ${fehlend.join(', ')}. `
    + 'Beim nächsten Speichern eines Beraters würden sie gelöscht. '
    + 'Feld in die .select()-Liste aufnehmen.',
);

/* --- 4) Der Speicherweg selbst hat sich nicht geändert --- */

assert.match(
  admin,
  /querySelectorAll\('\[data-f\]'\)/,
  'Der Speicherweg sammelt die Felder nicht mehr über [data-f]. Dann prüft '
    + 'dieser Wächter die falsche Stelle und muss nachgezogen werden.',
);

console.log(`berater-verwaltung-felder: OK (${geschrieben.size} Felder geprüft)`);
