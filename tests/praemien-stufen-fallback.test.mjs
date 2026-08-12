import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lies = (p) => readFile(new URL(p, import.meta.url), 'utf8');

/* --- 1) Migration: Prämien und Stufen-Mail lösen die Stufe gleich auf --- */
// Nur der ausführbare Teil zählt. Der Kommentarkopf zitiert den alten,
// fehlerhaften Ausdruck wörtlich — ein Test über die ganze Datei würde daran
// hängenbleiben und wäre kein Beleg für den Code.
const migrationRoh = await lies('../schema-phase192-praemien-stufen-fallback.sql');
const migration = migrationRoh
  .split('\n')
  .filter((z) => !z.trimStart().startsWith('--'))
  .join('\n');

// Ein Helfer, EINE Antwort auf die Frage "welche Stufen gelten für diesen Berater".
assert.match(migration, /create or replace function private\.belohnungs_stufen_fuer\(p_berater uuid\)/);
assert.match(migration, /where bs\.berater_id = p_berater/);
assert.match(migration, /not exists \(\s*select 1 from public\.belohnungs_stufen b2 where b2\.berater_id = p_berater/);
assert.match(migration, /where b\.ist_admin/);

// Der harte berater_id-Filter im Prämien-Abgleich ist weg.
assert.match(migration, /create or replace function public\.sync_praemien_for_empfehler/);
assert.doesNotMatch(migration, /where bs\.berater_id = v_berater/);
assert.match(migration, /from private\.belohnungs_stufen_fuer\(v_berater\) bs/);
assert.match(migration, /bs\.stufe <= v_kunden/);
// Idempotenz: bestehende Prämien werden nie doppelt angelegt.
assert.match(migration, /not exists \(\s*select 1 from praemien p/);

// Prämie und Mail sind EINE Fachlogik: erst die Prämie, dann die Zusage.
assert.match(migration, /create or replace function public\.check_stufe_erreicht/);
const trigger = migration.slice(migration.indexOf('check_stufe_erreicht'));
const posSync = trigger.indexOf('sync_praemien_for_empfehler');
const posMail = trigger.indexOf('net.http_post');
assert.ok(posSync > 0 && posMail > 0, 'Prämien-Abgleich und Mailversand müssen beide vorkommen');
assert.ok(posSync < posMail, 'Die Prämie muss vor der Stufen-Mail entstehen');

// Die Mail-Stufe wird für den ZUSTÄNDIGEN Berater aufgelöst, nicht global.
assert.match(trigger, /SELECT berater_id INTO v_berater FROM public\.empfehler/);
assert.match(trigger, /FROM private\.belohnungs_stufen_fuer\(v_berater\) bs/);
assert.doesNotMatch(trigger, /FROM public\.belohnungs_stufen WHERE stufe = v_count/);

// Kein anonymer Zugriff auf den Prämien-Abgleich.
assert.match(migration, /revoke execute on function public\.sync_praemien_for_empfehler\(uuid\) from anon/);

/* --- 2) Web-Push geht nur an den zuständigen Berater --- */
const notifyInteresse = await lies('../supabase/functions/notify-interesse/index.ts');

assert.match(notifyInteresse, /\.select\("berater_id, anrufwunsch/);
assert.match(notifyInteresse, /from\("berater"\)[\s\S]*\.eq\("id", emp\.berater_id\)/);
assert.match(
  notifyInteresse,
  /from\("push_subscriptions"\)[\s\S]{0,200}\.eq\("user_id", berater\.auth_user_id\)/,
  'Push-Empfänger müssen auf den zuständigen Berater eingegrenzt sein',
);
// Fail-closed: ohne Zuordnung lieber keine Nachricht als eine an alle.
assert.match(notifyInteresse, /pushSkipped = "kein-zustaendiger-berater"/);
// Der Sammel-Telegramkanal muss sagen, um wessen Lead es geht.
assert.match(notifyInteresse, /Berater: \$\{escapeMd\(berater\.name\)\}/);

/* --- 3) Die Stufen-Mail kommt vom zuständigen Berater --- */
const notifyStufe = await lies('../supabase/functions/notify-stufe/index.ts');

assert.match(notifyStufe, /\.select\("id, name, email, code, berater_id"\)/);
assert.match(notifyStufe, /const BERATER_NAME = beraterName \?\? secrets\.BERATER_NAME/);
assert.match(notifyStufe, /async function ladeStufe\(supa: any, beraterId: string \| null, stufe: number\)/);
assert.match(notifyStufe, /\.eq\("berater_id", beraterId\)[\s\S]{0,120}\.eq\("stufe", stufe\)/);
assert.match(notifyStufe, /\.eq\("ist_admin", true\)/);

/* --- 4) Der Berater geht auf dem Weg zur Empfehlung nicht verloren --- */
const app = await lies('../js/app.js');
assert.match(
  app,
  /berater_id: empfehlerData\?\.berater_id \|\| berater\?\.id \|\| null/,
  'Ohne Promoter-Code muss der über ?berater=slug aufgelöste Berater zählen',
);

const programm = await lies('../js/programm.js');
assert.match(programm, /function reicheBeraterAnFolgeseitenWeiter\(b\)/);
assert.match(programm, /querySelectorAll\('a\[href\*="empfehlen\.html"\]'\)/);
assert.match(programm, /u\.searchParams\.set\('berater', slug\)/);
// Ein vorhandener Promoter-Code oder Berater darf nicht überschrieben werden.
assert.match(programm, /if \(u\.searchParams\.has\('berater'\) \|\| u\.searchParams\.has\('code'\)\) return;/);

/* --- 5) Führungssicht zeigt Zahlen, keine Namen (Phase 195/196) --- */
const supa = await lies('../js/supabase.js');
const teamJs = await lies('../js/team.js');

assert.match(supa, /export async function getTeamBestand/);
assert.match(supa, /supabase\.rpc\('team_bestand'/);
// Die Namensfunktionen sind fuer angemeldete Berater gesperrt, also darf das
// Frontend sie gar nicht erst aufrufen.
assert.doesNotMatch(supa, /rpc\('team_promoter'/);
assert.doesNotMatch(supa, /rpc\('team_empfehlungen'/);
assert.doesNotMatch(supa, /rpc\('team_praemien'/);
assert.doesNotMatch(supa, /rpc\('team_kidz'/);

assert.match(teamJs, /getTeamBestand/);
assert.match(teamJs, /function astListen\(beraterId\)/);
assert.match(teamJs, /promoter_selbst_angemeldet/);
assert.match(teamJs, /empfehlungen_kunde/);
assert.match(teamJs, /praemien_offen/);
assert.match(teamJs, /kidz_anmeldungen/);
// Die Datenschutz-Schranke aus Phase 141 gilt weiter: keine Kundendaten hier.
// (team-overview.test.mjs prueft dasselbe, hier als Absicherung dieser Aenderung.)
assert.doesNotMatch(teamJs, /empfaenger_name|empfaenger_telefon|empfehler_name/);

/* --- 6) Der Coach ist in der Oberfläche pflegbar (Phase 197) --- */
const beraterAdmin = await lies('../js/berater-admin.js');
const beraterHtml = await lies('../berater.html');

// Das Feld wird geladen, angezeigt und mitgespeichert.
assert.match(supa, /fuehrungskraft_id'\)\s*$|fuehrungskraft_id/m);
assert.match(beraterAdmin, /function coachAuswahl\(b, alle\)/);
assert.match(beraterAdmin, /data-f="fuehrungskraft_id"/);
assert.match(beraterAdmin, /function renderCard\(b, _index, alle\)/);
// Auch beim Anlegen eines neuen Beraters.
assert.match(beraterHtml, /data-f="fuehrungskraft_id"/);
assert.match(beraterAdmin, /function fuelleCoachAuswahlImAnlegen\(alle\)/);
// Kein Kreis: weder man selbst noch die eigenen Untergebenen stehen zur Wahl.
assert.match(beraterAdmin, /function untergebene\(id, alle\)/);
assert.match(beraterAdmin, /\.filter\(\(k\) => k\.id !== b\.id && !gesperrt\.has\(k\.id\)\)/);

/* --- 7) Versionsstand ist mitgezogen --- */
const config = await lies('../js/config.js');
assert.match(config, /APP_VERSION = 'v1\.218 Beta'/);
assert.match(config, /Phase 195/);
const sw = await lies('../sw.js');
assert.match(sw, /CACHE_VERSION = 'v177-2026-08-12-phase195'/);

console.log('praemien-stufen-fallback: OK');
