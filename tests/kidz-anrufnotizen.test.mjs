// Phase 388: Anrufnotizen fuer die Teilnehmer des KIDZ-Sommerfests.
//
// Kais Auftrag vom 14.09.2026: je Teilnehmer ein kurzer Anrufstand mit Notiz,
// "nicht zu umfangreich ... nachhaltig, sonst sieht da keiner mehr durch".
// Kais Regel zum Eintragen: wer die Anmeldung sieht, darf eintragen. Schalter
// aus = nur eigene Kontakte, Schalter an = bei allen.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const sql = read('schema-phase388-kidz-anrufnotizen.sql').replace(/^--.*$/gm, '');
const js = read('js/kidz-gewinnspiel-admin.js');
const html = read('dashboard/kidz-gewinnspiel.html');
const css = read('css/kidz-gewinnspiel-admin.css');

// --- Datenbank ---------------------------------------------------------------
assert.match(sql, /create table if not exists public\.kidz_kontaktnotizen/);
// Faellt mit der Anmeldung weg (Loeschwunsch, Dublette, Aufbewahrungsfrist).
assert.match(sql, /teilnahme_id\s+uuid not null references public\.kidz_gewinnspiel_teilnahmen\(id\) on delete cascade/,
  'Ohne cascade blieben Notizen zu geloeschten Personen stehen.');
// Genau fuenf Ergebnisse, nicht mehr.
assert.match(sql, /check \(ergebnis in \('nicht_erreicht', 'rueckruf', 'termin', 'kein_interesse', 'gesprochen'\)\)/);
assert.match(sql, /char_length\(notiz\) <= 500/);
assert.match(sql, /constraint kidz_kontaktnotizen_datum_passt/);

assert.match(sql, /alter table public\.kidz_kontaktnotizen enable row level security/);
assert.match(sql, /revoke all on public\.kidz_kontaktnotizen from public, anon, authenticated/);
assert.match(sql, /grant select, delete on public\.kidz_kontaktnotizen to authenticated/);
// Nie ueberschreiben, nie direkt aus dem Browser anlegen.
assert.doesNotMatch(sql, /grant[^;]*(insert|update)[^;]*on public\.kidz_kontaktnotizen/,
  'Eintragen nur ueber die Funktion, Aendern gar nicht.');
assert.doesNotMatch(sql, /on public\.kidz_kontaktnotizen for (insert|update|all)/);

// Sehen haengt an der Sichtbarkeit der Anmeldung selbst, samt Schalter.
assert.match(sql, /create policy kidz_kontaktnotizen_select[\s\S]{0,200}exists \([\s\S]{0,120}from public\.kidz_gewinnspiel_teilnahmen t[\s\S]{0,40}where t\.id = teilnahme_id/);
// Loeschen nur Admin.
assert.match(sql, /create policy kidz_kontaktnotizen_admin_delete[\s\S]{0,120}for delete[\s\S]{0,80}is_current_berater_admin\(\)/);

// Eintragen: Kais Regel in der Datenbank.
assert.match(sql, /create or replace function public\.add_kidz_kontaktnotiz/);
assert.match(sql, /add_kidz_kontaktnotiz[\s\S]{0,200}security definer/);
assert.match(sql, /v_is_admin or \(v_event is not null and \(v_berater = v_actor or public\.kidz_team_sicht_offen\(v_event\)\)\)/,
  'Eintragen darf nur, wer die Anmeldung sieht.');
assert.match(sql, /revoke execute on function public\.add_kidz_kontaktnotiz\(uuid, text, text, date\)[\s\S]{0,40}from public, anon, service_role/);
assert.match(sql, /grant execute on function public\.add_kidz_kontaktnotiz\(uuid, text, text, date\)[\s\S]{0,20}to authenticated/);
// Die Funktion fasst die Anmeldung selbst nicht an.
assert.doesNotMatch(sql, /update public\.kidz_gewinnspiel_teilnahmen/);

// --- Seite ---------------------------------------------------------------------
assert.match(js, /supabase\.rpc\('add_kidz_kontaktnotiz'/);
assert.match(js, /\.from\('kidz_kontaktnotizen'\)/);
assert.doesNotMatch(js, /from\('kidz_kontaktnotizen'\)[\s\S]{0,80}\.insert\(/,
  'Notizen duerfen nicht direkt aus dem Browser geschrieben werden.');
for (const label of ['Nicht erreicht', 'Rückruf vereinbart', 'Termin vereinbart', 'Kein Interesse', 'Gesprochen']) {
  assert.ok(js.includes(label), `Ergebnis fehlt: ${label}`);
}
for (const filter of ['Noch nicht angerufen', 'Rückruf fällig']) {
  assert.ok(js.includes(filter), `Filter fehlt: ${filter}`);
}
// Die Notizen muessen da sein, bevor die Liste zum ersten Mal gezeichnet wird.
assert.ok(js.indexOf('await loadNotizen()') > -1 && js.indexOf('await loadNotizen()') < js.indexOf('loadEntries(),'),
  'loadNotizen muss vor dem ersten Zeichnen fertig sein.');
// Am Handy direkt waehlen.
assert.match(js, /tel:\$\{/);
// Der Export kennt den Stand.
assert.match(js, /'Letzter Anrufstand'/);

assert.match(html, /id="anrufDialog"/);
assert.match(html, /id="anrufFilter"/);
assert.match(html, /id="anrufNotiz"[^>]*maxlength="500"/);
assert.match(html, /Nur Sachliches/);
for (const wert of ['nicht_erreicht', 'rueckruf', 'termin', 'kein_interesse', 'gesprochen']) {
  assert.match(html, new RegExp(`name="anrufErgebnis" value="${wert}"`));
}

// hidden verliert gegen display-Regeln. Ohne diese drei Regeln stuenden Filter,
// Datumsfeld und Anrufknopf auch dann da, wenn sie verborgen sein sollen.
assert.match(css, /\.kg-anruf-filter\[hidden\]\s*\{\s*display:\s*none/);
assert.match(css, /#anrufDatumFeld\[hidden\]\s*\{\s*display:\s*none/);
assert.match(css, /\.kg-anruf-tel\[hidden\]\s*\{\s*display:\s*none/);

// --- Phase 389: Anliegen, Terminwunsch, Uhrzeit, Sperre, Widerruf, Leitfaden ----
const sql389 = read('schema-phase389-kidz-anrufnotizen-details.sql').replace(/^--.*$/gm, '');
assert.match(sql389, /add column if not exists anliegen text/);
assert.match(sql389, /add column if not exists terminwunsch text/);
assert.match(sql389, /add column if not exists termin_uhrzeit time/);
assert.match(sql389, /add column if not exists keine_anrufe boolean not null default false/);
assert.match(sql389, /add column if not exists kff_widerrufen boolean not null default false/);
assert.match(sql389, /anliegen in \('kff', 'gespraech', 'beides'\)/);
assert.match(sql389, /terminwunsch in \('anfang', 'ende'\)/);
assert.match(sql389, /not keine_anrufe or ergebnis = 'kein_interesse'/);
// Die alte Fassung mit vier Angaben muss weg, sonst gibt es zwei gleichnamige Funktionen.
assert.match(sql389, /drop function if exists public\.add_kidz_kontaktnotiz\(uuid, text, text, date\);/);
// Die neue nimmt vier Angaben weiterhin an (Vorgabewerte), damit die alte Seite nicht bricht.
assert.match(sql389, /p_anliegen text default null/);
assert.match(sql389, /p_kff_widerruf boolean default false/);
assert.match(sql389, /'reason', 'time_required'/);
// Kernregel unveraendert.
assert.match(sql389, /v_is_admin or \(v_event is not null and \(v_berater = v_actor or public\.kidz_team_sicht_offen\(v_event\)\)\)/);
// Eine Einwilligung wird hier nur zurueckgenommen, nie gesetzt.
assert.match(sql389, /set elternabend_interesse = false/);
assert.doesNotMatch(sql389, /elternabend_interesse = true/);
assert.doesNotMatch(sql389, /set[\s\S]{0,80}(berater_id|name|schaetzung_cm) = /,
  'Ausser dem Widerruf darf die Funktion an der Anmeldung nichts aendern.');
assert.match(sql389, /revoke execute on function public\.add_kidz_kontaktnotiz\(uuid, text, text, date, text, text, time, boolean, boolean\)[\s\S]{0,40}from public, anon, service_role/);
assert.match(sql389, /grant execute on function public\.add_kidz_kontaktnotiz\(uuid, text, text, date, text, text, time, boolean, boolean\)[\s\S]{0,20}to authenticated/);

for (const text of ['Anfang der Woche', 'Ende der Woche', 'Persönliches Gespräch', 'Nicht mehr anrufen', 'Einwilligung KIDZ for Future: ja', 'Einwilligung KIDZ for Future: nein']) {
  assert.ok(js.includes(text), `Text fehlt: ${text}`);
}
assert.match(js, /p_kff_widerruf:/);
assert.match(js, /p_termin_uhrzeit:/);
// Der Leitfaden steht in der Datenbank, Kai bearbeitet ihn selbst. Lesen alle Berater,
// aendern nur Admins, nie anlegen oder loeschen aus dem Browser.
assert.match(sql389, /create table if not exists public\.kidz_leitfaden/);
assert.match(sql389, /char_length\(inhalt\) <= 8000/);
assert.match(sql389, /alter table public\.kidz_leitfaden enable row level security/);
assert.match(sql389, /revoke all on public\.kidz_leitfaden from public, anon, authenticated/);
assert.match(sql389, /grant update \(inhalt\) on public\.kidz_leitfaden to authenticated/);
assert.doesNotMatch(sql389, /grant[^;]*(insert|delete)[^;]*on public\.kidz_leitfaden/);
assert.match(sql389, /create policy kidz_leitfaden_admin_update[\s\S]{0,120}for update[\s\S]{0,80}is_current_berater_admin\(\)/);
assert.match(js, /\.from\('kidz_leitfaden'\)/);
assert.match(js, /anrufLeitfadenText\.textContent = /, 'Hineinkopierter Text darf nie als HTML landen.');
assert.doesNotMatch(js, /const LEITFADEN = /, 'Kein fest eingebauter Leitfaden mehr.');
assert.match(html, /id="leitfadenEingabe"[^>]*maxlength="8000"/);
assert.match(html, /id="leitfadenBearbeitenBtn" type="button"/);
assert.match(css, /\.kg-anruf-leitfaden-editor\[hidden\]/);
// Anliegen und Terminwunsch sofort sichtbar, nicht erst nach Wahl des Ergebnisses.
assert.match(js, /const mitDetails = !\['nicht_erreicht', 'kein_interesse'\]\.includes\(ergebnis\)/);
// Termin nur mit Uhrzeit speichern.
assert.match(js, /ergebnis === 'termin' && !anrufUhrzeit\.value/);

for (const wert of ['kff', 'gespraech', 'beides']) assert.match(html, new RegExp(`name="anrufAnliegen" value="${wert}"`));
for (const wert of ['anfang', 'ende']) assert.match(html, new RegExp(`name="anrufWunsch" value="${wert}"`));
assert.match(html, /id="anrufUhrzeit" type="time"/);
assert.match(html, /id="anrufSperre" type="checkbox"/);
assert.match(html, /id="anrufWiderruf" type="checkbox"/);
assert.match(html, /id="anrufLeitfaden"/);
assert.match(html, /id="anrufEinwilligung"/);
assert.match(css, /\.kg-anruf-feld\[hidden\]\s*\{\s*display:\s*none\s*!important/,
  'Sperre und Widerruf stehen auf display: flex und blieben sonst immer sichtbar.');

console.log('kidz-anrufnotizen: OK');
