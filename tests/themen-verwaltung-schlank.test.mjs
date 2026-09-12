// Die Themen-Verwaltung zeigt nur, was auch irgendwo ankommt (Phase 365, 12.09.2026).
//
// Vorgeschichte: Der Editor bot Felder an, die nirgends mehr gelesen wurden.
// Die "Unterzeile" (headline) schrieb seit dem Umbau der Empfaengerseite nur
// noch in die Datenbank hinein, ihr Anker eFinanzHeadline existiert dort nicht
// mehr. Der Knopf-Block wirkt allein bei "allgemein": js/app.js liest cta_text
// und quickcheck_url ausschliesslich auf empfaenger.html. Der Hinweis auf der
// Seite behauptete zusaetzlich, er wirke auch bei "baufi" — baufi.js laedt die
// Vorlage aber gar nicht.
//
// Faellt eine dieser Regeln weg, tippt Kai wieder ins Leere, ohne dass sich
// etwas meldet. Deshalb dieser Waechter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const cms = read('js/vorlagen-cms.js');
const seite = read('vorlagen.html');

test('kein Feld ohne Wirkung im Editor', () => {
  assert.ok(!cms.includes('data-f="headline"'), 'Die Unterzeile wirkt nirgends und darf nicht angeboten werden');
  assert.ok(!cms.includes('data-f="subtext"'), 'subtext wird von keiner Seite gelesen');
  assert.ok(!cms.includes('data-f="hero_bild_url"'), 'Das Bild wird von keiner Seite gelesen');
  assert.ok(!/data-f="vorteil_/.test(cms), 'Die Vorteile werden von keiner Seite gelesen');
});

test('der Knopf-Block steht nur beim Thema mit eigenem Knopf', () => {
  // js/app.js liest cta_text und quickcheck_url nur auf empfaenger.html,
  // also nur fuer slug 'allgemein'.
  assert.match(cms, /THEMA_MIT_EIGENEM_KNOPF = 'allgemein'/, 'Das Thema mit eigenem Knopf ist nicht mehr festgelegt');
  assert.match(cms, /eigenerKnopf \? knopfGruppe : festHinweis/, 'Der Knopf-Block wird nicht mehr nur fuer dieses eine Thema gerendert');
  assert.ok(cms.includes('data-f="cta_text"'), 'Fuer Allgemein muss die Beschriftung weiter editierbar sein');
  assert.ok(cms.includes('data-f="quickcheck_url"'), 'Fuer Allgemein muss das Ziel weiter editierbar sein');
});

test('die Seite behauptet nicht mehr, der Knopf wirke bei Baufinanzierung', () => {
  assert.ok(!/wirken nur bei .Allgemein. und .Baufinanzierung/.test(seite),
    'Der alte Hinweis war sachlich falsch: baufi.js laedt die Vorlage gar nicht');
});

test('keine technische Kennung in der Kopfzeile', () => {
  assert.ok(!/<span class="slug">/.test(cms), 'Die Kennung (slug) gehoert nicht in die Anzeige');
  // Als Anker bleibt sie im Code, sonst findet die Befehlspalette das Thema nicht.
  assert.match(cms, /data-slug="\$\{escapeAttr\(v\.slug\)\}"/, 'Ohne data-slug findet der Sprung aus der Befehlspalette nichts');
});

test('die Reihenfolge wird verschoben, nicht getippt', () => {
  assert.ok(!cms.includes('data-f="sort_order"'), 'Das Zahlenfeld fuer die Reihenfolge ist ersetzt');
  assert.match(cms, /async function verschiebe\(slug, richtung\)/, 'Die Verschiebe-Funktion fehlt');
  assert.match(cms, /data-hoch/, 'Der Pfeil nach oben fehlt');
  assert.match(cms, /data-runter/, 'Der Pfeil nach unten fehlt');
});

test('der Freigabe-Schalter bleibt unangetastet', () => {
  // Das ist die einzige Einstellung mit echter Schutzwirkung: sie sperrt ein
  // Thema in der Promoter-App, im Formular, auf der Themenseite und im Server
  // (api/share.js). Siehe tests/themen-freigabe.test.mjs.
  assert.match(cms, /data-f-check="in_arbeit"/, 'Der Freigabe-Schalter fehlt');
  assert.match(cms, /data\.in_arbeit = wip\.checked/, 'Der Schalter wird nicht mehr gespeichert');
});

test('der Zustand steht in Worten in der Kopfzeile', () => {
  assert.match(cms, /gesperrt \? 'Gesperrt' : 'Frei'/, 'Frei/Gesperrt fehlt in der Kopfzeile');
});
