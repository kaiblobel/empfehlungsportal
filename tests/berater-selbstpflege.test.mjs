/**
 * Die Selbstpflege darf nur die zwölf freigegebenen Felder anfassen.
 *
 * Seit Phase 302 pflegt jeder Berater sein Profil selbst. Das läuft nicht
 * über ein UPDATE-Recht auf der Tabelle — RLS kann keine einzelnen Spalten
 * sperren, ein Berater könnte sich sonst per Konsole selbst zum Admin machen
 * oder den Slug eines Kollegen übernehmen. Es läuft über genau eine
 * Datenbankfunktion mit fester Feldliste.
 *
 * Dieser Wächter hält drei Dinge fest:
 *   1. Was das Formular schickt, kennt die Funktion — und umgekehrt.
 *      (Das Gegenstück zum Phase-251-Fallstrick: die Funktion schreibt ALLE
 *      zwölf Felder, ein fehlendes im Formular würde eines leeren.)
 *   2. Die gesperrten Felder kommen in der Signatur nicht vor.
 *   3. Die Absicherungen der Funktion stehen noch da.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

const [sql, supabaseJs, settings, dashboardJs] = await Promise.all([
  lies('schema-phase302-berater-selbstpflege.sql'),
  lies('js/supabase.js'),
  lies('dashboard/settings.html'),
  lies('js/dashboard.js'),
]);

const ERWARTET = [
  'name', 'rolle', 'telefon', 'whatsapp', 'bookings_url', 'adresse',
  'impressum_url', 'datenschutz_url', 'foto_url',
  'buero_foto_url', 'team_foto_url', 'buero_bildzeile',
];

/* --- 1) Die Signatur der Datenbankfunktion --- */

const signatur = sql.slice(
  sql.indexOf('create or replace function public.berater_self_update'),
  sql.indexOf(') returns void'),
);
const parameter = [...signatur.matchAll(/^\s*p_([a-z_]+)\s+text/gm)].map((t) => t[1]);

assert.deepEqual(
  [...parameter].sort(),
  [...ERWARTET].sort(),
  'Die Parameter von berater_self_update weichen von der freigegebenen Liste ab.\n'
    + `  gefunden: ${parameter.join(', ')}`,
);

/* --- 2) Gesperrte Felder tauchen nirgends auf --- */

// Diese Felder entscheiden über Rechte, Zuordnung und darüber, ob eine
// Kundenseite überhaupt ausgeliefert wird. Sie gehören dem Admin.
for (const gesperrt of ['slug', 'email', 'ist_admin', 'ist_test', 'ist_aktiv',
  'fuehrungskraft_id', 'auth_user_id', 'id', 'cockpit_advisor_id']) {
  assert.ok(
    !parameter.includes(gesperrt),
    `"${gesperrt}" steht in der Signatur von berater_self_update. Dieses Feld `
      + 'darf ein Berater nicht selbst setzen.',
  );
  assert.ok(
    !new RegExp(`^\\s*${gesperrt}\\s*=`, 'm').test(sql),
    `berater_self_update schreibt "${gesperrt}". Dieses Feld gehört dem Admin.`,
  );
}

/* --- 3) Die Absicherungen der Funktion --- */

assert.match(sql, /security definer/i,
  'Ohne security definer greift die RLS und die Funktion darf nichts schreiben.');
assert.match(sql, /set search_path = public/i,
  'Ohne festen search_path könnte ein untergeschobenes Schema die Tabelle austauschen.');
assert.match(sql, /where auth_user_id = v_uid/,
  'Die Zeilenwahl muss über auth.uid() laufen, nie über einen Parameter — sonst '
    + 'kann jeder eine fremde Zeile schreiben.');
assert.ok(
  !/where\s+id\s*=\s*p_/i.test(sql),
  'In berater_self_update wird eine Zeile über einen Parameter gewählt. Genau das '
    + 'darf nicht sein.',
);
assert.match(sql, /if v_name is null then\s*\n\s*raise exception/i,
  'Der Name muss gegen Leere abgesichert sein: er steht auf jeder Kundenseite und '
    + 'entscheidet mit, ob der Berater in list_kidz_berater_public auftaucht.');
assert.match(sql, /grant execute on function public\.berater_self_update/i,
  'Ohne grant kann kein angemeldeter Berater die Funktion aufrufen.');
assert.ok(
  /revoke all on function public\.berater_self_update[\s\S]{0,200}from public, anon/i.test(sql),
  'Die Funktion muss anon ausdrücklich entzogen werden.',
);

/* --- 4) Der Client schickt genau diese Felder --- */

const wrapper = supabaseJs.slice(
  supabaseJs.indexOf('export async function updateMeinProfil'),
  supabaseJs.indexOf('export async function updateMeinProfil') + 1600,
);
for (const feld of ERWARTET) {
  assert.ok(
    new RegExp(`p_${feld}:`).test(wrapper),
    `updateMeinProfil schickt "p_${feld}" nicht mit. Die Datenbankfunktion würde `
      + 'das Feld beim Speichern leeren.',
  );
}

/* --- 5) Das Formular kennt alle zwölf Felder --- */

const imFormular = new Set(
  [...settings.matchAll(/data-p="([a-z_]+)"/g)].map((t) => t[1]),
);
for (const feld of ERWARTET) {
  assert.ok(
    imFormular.has(feld),
    `In dashboard/settings.html fehlt ein Eingabefeld für "${feld}". Beim Speichern `
      + 'würde dieses Feld geleert.',
  );
}
assert.deepEqual(
  [...imFormular].filter((f) => !ERWARTET.includes(f)),
  [],
  'Im Formular stehen Felder, die die Datenbankfunktion nicht kennt.',
);

/* --- 6) Der Speichern-Knopf ist erst nach vollständigem Laden frei --- */

assert.match(settings, /id="profSaveBtn"[^>]*disabled/,
  'Der Speichern-Knopf muss gesperrt starten. Sonst kann jemand speichern, bevor '
    + 'die zwölf Felder geladen sind, und leert dabei die Hälfte seines Profils.');
assert.match(settings, /profBtn\.disabled = false/,
  'Der Speichern-Knopf wird nirgends freigegeben.');
assert.match(settings, /if \(!vollstaendig\)[\s\S]{0,200}return;/,
  'Es fehlt der Abbruch bei unvollständig geladenem Profil.');

/* --- 7) Die Maske füllt aus den EIGENEN Werten, nicht aus der Kundensicht --- */

// Seit Phase 304 erbt die Kundensicht fehlende Angaben vom Büro. Stünde ein
// geerbter Wert im Eingabefeld, würde er beim nächsten Speichern als eigener
// festgeschrieben — die Vererbung wäre für diesen Berater tot und ein Umzug
// des Büros ginge an ihm vorbei.
assert.match(
  settings,
  /const eigen = b\.eigen \|\| b;/,
  'dashboard/settings.html füllt das Formular nicht aus b.eigen. Damit landen '
    + 'geerbte Bürowerte in den Feldern und werden beim Speichern zu eigenen.',
);
assert.match(
  settings,
  /el\.value = eigen\[f\] \?\? '';/,
  'Die Felder werden nicht aus den rohen eigenen Werten befüllt.',
);
assert.match(
  dashboardJs,
  /eigen: data,/,
  'js/dashboard.js reicht die rohen Tabellenwerte nicht als b.eigen weiter. '
    + 'Ohne die kann die Maske eigenen und geerbten Wert nicht unterscheiden.',
);
assert.match(
  dashboardJs,
  /get_berater_public_by_id/,
  'getCurrentBerater holt die Kundensicht nicht. Dann sieht ein Berater in '
    + 'seiner eigenen Vorschau andere Angaben als seine Kunden.',
);

/* --- 8) Der gemerkte Berater wird nach dem Speichern verworfen --- */

assert.match(dashboardJs, /export function vergissBerater/,
  'js/dashboard.js exportiert kein vergissBerater(). Ohne das steht nach dem '
    + 'Speichern das alte Foto im Kopf der Seite.');
assert.match(settings, /vergissBerater\(\);[\s\S]{0,120}applyBeraterHeader\(\)/,
  'Nach dem Speichern muss der gemerkte Berater verworfen und der Kopf neu '
    + 'gesetzt werden.');
