/**
 * Die beiden öffentlichen Lesefunktionen für den Berater müssen heil bleiben.
 *
 * An `get_berater_public` und `get_berater_public_by_id` hängt JEDE Kundenseite.
 * Wer sie um eine Spalte erweitert, muss sie löschen und neu anlegen, weil
 * Postgres die Rückgabeliste nicht ändern lässt. Beim Löschen gehen drei Dinge
 * mit verloren, die einzeln leicht zu übersehen sind:
 *
 *   1. die Ausführungsrechte für anonyme Besucher
 *   2. security definer
 *   3. set search_path
 *
 * Fehlt eines davon, bleibt die Seite technisch heil und zeigt trotzdem auf
 * jeder Partnerseite still wieder den Standard-Berater. Kein Fehler in der
 * Konsole, kein leerer Bildschirm. Genau die Art Fehler, die wochenlang
 * unbemerkt bleibt.
 *
 * Vorbild: tests/kidz-gewinnspiel.test.mjs nagelt dasselbe für
 * list_kidz_berater_public fest.
 */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const wurzel = new URL('../', import.meta.url);

/* --- Die jüngste Migration finden, die die Funktionen definiert --- */

const dateien = (await readdir(wurzel))
  .filter((n) => /^schema-phase\d+.*\.sql$/.test(n));

const kandidaten = [];
for (const name of dateien) {
  const inhalt = await readFile(new URL(name, wurzel), 'utf8');
  if (inhalt.includes('create or replace function public.get_berater_public')) {
    kandidaten.push({ name, inhalt, phase: Number(name.match(/^schema-phase(\d+)/)[1]) });
  }
}

assert.ok(
  kandidaten.length > 0,
  'Keine Migration gefunden, die get_berater_public definiert. Wurde die Datei umbenannt?',
);

kandidaten.sort((a, b) => b.phase - a.phase);
const { name: datei, inhalt: sql } = kandidaten[0];

/* --- 1) Beide Funktionen liefern dieselben Spalten --- */

const listen = [...sql.matchAll(/returns table\(([\s\S]*?)\)\s*\nlanguage sql/g)]
  .map((t) => t[1].replace(/\s+/g, ' ').trim());

assert.equal(
  listen.length,
  2,
  `${datei}: erwartet werden genau zwei "returns table"-Listen `
    + `(nach Slug und nach Id), gefunden wurden ${listen.length}.`,
);

assert.equal(
  listen[0],
  listen[1],
  `${datei}: die beiden Lesefunktionen geben unterschiedliche Spalten heraus. `
    + 'Dann sieht ein Empfänger über den Empfehlungslink etwas anderes als über '
    + `den Berater-Link.\n  nach Slug: ${listen[0]}\n  nach Id:   ${listen[1]}`,
);

/* --- 2) Jede Funktion trägt security definer und search_path --- */

const koepfe = sql.split('create or replace function public.get_berater_public').slice(1);
assert.equal(koepfe.length, 2, `${datei}: erwartet werden zwei Funktionsköpfe.`);

koepfe.forEach((kopf, i) => {
  const welche = i === 0 ? 'get_berater_public' : 'get_berater_public_by_id';
  const bis = kopf.slice(0, kopf.indexOf('$function$'));
  assert.match(
    bis,
    /security definer/,
    `${datei}: ${welche} hat kein "security definer". Ohne das greifen die `
      + 'RLS-Regeln, und ein anonymer Besucher bekommt null Zeilen zurück.',
  );
  assert.match(
    bis,
    /set search_path/,
    `${datei}: ${welche} hat kein "set search_path".`,
  );
});

/* --- 3) Die Ausführungsrechte stehen wieder da --- */

for (const signatur of ['get_berater_public(text)', 'get_berater_public_by_id(uuid)']) {
  const muster = new RegExp(
    `grant execute on function public\\.${signatur.replace(/[()]/g, '\\$&')}\\s+to[^;]*anon`,
  );
  assert.match(
    sql,
    muster,
    `${datei}: nach dem Neuanlegen fehlt "grant execute on function `
      + `public.${signatur} to anon". Ohne diese Zeile kann kein Besucher die `
      + 'Berater-Daten lesen, und jede Kundenseite zeigt still den Standard-Berater.',
  );
}

/* --- 4) Wer droppt, muss auch neu anlegen --- */

const drops = (sql.match(/drop function if exists public\.get_berater_public/g) || []).length;
assert.equal(
  drops,
  2,
  `${datei}: es werden ${drops} Lesefunktionen gelöscht, erwartet werden zwei `
    + '(nach Slug und nach Id). Eine gelöschte und nicht neu angelegte Funktion '
    + 'legt die halbe Seite still.',
);

console.log(`berater-lesefunktionen: OK (${datei}, ${listen[0].split(',').length} Spalten)`);
