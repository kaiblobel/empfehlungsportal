/**
 * Abmelden von KIDZ-Mails (Phase 347).
 *
 * Was hier bewacht wird, weil ein Fehler still bliebe:
 * - Die Seite ist unter /kidz/abmelden erreichbar. Fehlt die Weiterleitung, führt
 *   der Link in jeder bereits verschickten Mail ins Leere.
 * - Abgemeldet wird nur per Klick, nie beim Laden. Sonst tragen Virenscanner,
 *   die Links aus Mails vorab öffnen, Menschen ungefragt aus.
 * - Die Datenbankfunktion schreibt nur den Abmeldezeitpunkt und ist ohne
 *   Anmeldung aufrufbar, sonst kann sich niemand abmelden.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Zeilenenden vereinheitlichen: Git checkt unter Windows mit CRLF aus, die Muster erwarten LF.
const read = async (file) => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const [vercel, html, js, sql] = await Promise.all([
  read('vercel.json'),
  read('kidz-abmelden.html'),
  read('js/kidz-abmelden.js'),
  read('schema-phase347-kidz-mail-abmeldung.sql'),
]);

// Weiterleitung vorhanden und vor der Sammelregel.
const rewrites = JSON.parse(vercel).rewrites;
const stelle = rewrites.findIndex((r) => r.source === '/kidz/abmelden');
assert.ok(stelle >= 0, '/kidz/abmelden fehlt in vercel.json');
assert.equal(rewrites[stelle].destination, '/kidz-abmelden.html');
assert.ok(stelle < rewrites.findIndex((r) => r.source === '/(.*)'), 'Weiterleitung muss vor der Sammelregel stehen');
// Der Link in der Mail steht als Pfad (/kidz/abmelden/<Schlüssel>) ohne "=",
// weil Outlook "=" plus zwei Hex-Zeichen beim Versand verstümmelt.
const pfad = rewrites.findIndex((r) => r.source === '/kidz/abmelden/:schluessel');
assert.ok(pfad >= 0 && rewrites[pfad].destination === '/kidz-abmelden.html', 'Pfadform des Abmeldelinks fehlt');
assert.ok(pfad < rewrites.findIndex((r) => r.source === '/(.*)'));
assert.match(js, /window\.location\.pathname\.split\('\/'\)/, 'Skript muss den Schlüssel aus dem Pfad lesen');

// Seite: nicht in Suchmaschinen, lädt Konfiguration und Skript, alle vier Zustände.
assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
assert.match(html, /<script src="\/js\/config\.js"><\/script>/);
assert.match(html, /\/js\/kidz-abmelden\.js\?v=\d+/);
for (const zustand of ['frage', 'fertig', 'ungueltig', 'fehler']) {
  assert.match(html, new RegExp(`<section id="kab-${zustand}" hidden>`), `Zustand ${zustand} fehlt oder ist sichtbar`);
}

// Skript: Abmelden nur im Klick, richtige Funktion, kein Speicher im Browser.
assert.match(js, /kidz_mail_abmelden_public/);
assert.match(js, /addEventListener\('click'/);
const ausserhalbVonKlicks = js.replace(/addEventListener\('click',[^\n]*\n/g, '').replace(/async function abmelden[\s\S]*?\n}\n/, '');
assert.doesNotMatch(ausserhalbVonKlicks, /abmelden\(/, 'abmelden() darf nur aus einem Klick heraus laufen');
assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie/);
const muster = new RegExp(js.match(/SCHLUESSEL_MUSTER = \/(.+)\/i;/)[1], 'i');
assert.ok(muster.test('3f2b8c1e-9a4d-4e6f-8b1a-2c3d4e5f6a7b'));
assert.ok(!muster.test('max@example.test'), 'Eine Mailadresse darf kein gültiger Schlüssel sein');

// Datenbank: eng begrenzt, ohne Anmeldung aufrufbar, erster Zeitpunkt bleibt.
assert.match(sql, /security definer/);
assert.match(sql, /set search_path = ''/);
assert.match(sql, /grant execute on function public\.kidz_mail_abmelden_public\(uuid\) to anon, authenticated;/);
assert.match(sql, /revoke execute on function public\.kidz_mail_abmelden_public\(uuid\) from public;/);
assert.match(sql, /set mail_abgemeldet_at = coalesce\(mail_abgemeldet_at, now\(\)\)/);
// "set search_path" ist die Funktionseinstellung, keine geschriebene Spalte.
const gesetzteSpalten = [...sql.matchAll(/^\s*set (\w+) =/gm)].map((m) => m[1]).filter((s) => s !== 'search_path');
assert.deepEqual(gesetzteSpalten, ['mail_abgemeldet_at'], 'Die Funktion darf nur den Abmeldezeitpunkt schreiben');
