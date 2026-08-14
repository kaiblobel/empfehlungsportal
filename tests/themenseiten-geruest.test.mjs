import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('thema.html');
const js = read('js/themen-vorschau.js');
const share = read('api/share.js');
const program = read('js/programm.js');
const settings = read('dashboard/settings.html');
const messages = read('js/app.js');
const supabaseClient = read('js/supabase.js');
const baufi = read('baufi.html');
const baufiJs = read('js/baufi.js');
const baufiMockCss = read('css/baufi-empfehlung-mockup.css');

const themes = ['foerderungen', 'selbstaendige', 'investment', 'absicherung', 'karriere', 'kinder', 'baufi', 'banking', 'energie'];

for (const slug of themes) {
  assert.match(js, new RegExp(`\\b${slug}:\\s*\\{`), `${slug} fehlt im Themengerüst`);
  const expectedPage = slug === 'baufi' ? '/baufi.html' : '/thema.html';
  assert.match(share, new RegExp(`${slug}: '${expectedPage.replace('.', '\\.')}'`), `${slug} fehlt im Router`);
  assert.match(program, new RegExp(`\\b${slug}:\\s*\\{`), `${slug} fehlt in der Präsentationsvorschau`);
  const expectedPreview = slug === 'baufi' ? `baufi.html?vorlage=${slug}` : `thema.html?vorlage=${slug}`;
  assert.ok(settings.includes(expectedPreview), `${slug} fehlt in den Schnellvorschauen`);
}

assert.ok(html.includes('data-page="thema"'));
assert.ok(!html.includes('In Arbeit'));
assert.match(html, /\/js\/referral-tracking\.js\?v=\d+/);
assert.ok(html.includes('id="interestButton"'));
assert.ok(html.includes('data-track-booking'));
assert.ok(html.includes('id="optOutLink"'));
assert.ok(html.includes('data-advisor-avatar'));
assert.ok(html.includes('data-bb="booking"'));
assert.ok(html.includes('id="baufiAnalysis"'), 'Immobilienanalyse fehlt auf der Baufi-Seite');
assert.ok(html.includes('id="baufiFunding"'), 'Fördermittelbereich fehlt auf der Baufi-Seite');
assert.ok(html.includes('class="baufi-model-compare"'), 'Visueller Vergleich der Finanzierungswege fehlt');
assert.ok(html.includes('Klassisches Bankmodell'), 'Klassisches Bankmodell fehlt im Vergleich');
assert.ok(html.includes('Von Anfang an weitergedacht'), 'Ganzheitliches Finanzierungskonzept fehlt im Vergleich');
assert.ok(html.includes('ab 0,95 %'), 'Geprüftes aktuelles Tarifbeispiel fehlt');
assert.ok(html.includes('Konditionen, Zuteilung und Finanzierbarkeit'), 'Pflichtiger Konditionshinweis fehlt');
assert.ok(html.includes('dvag.de/dvag/das-unternehmen/presse/servicemeldungen/Baufinanzierung.html'), 'Offizielle DVAG-Quelle zur Anschlussfinanzierung fehlt');
assert.ok(html.includes('badenia.de/fileadmin/user_upload/Tarifuebersicht_Via_Badenia_20.pdf'), 'Offizielle Tarifübersicht fehlt');
assert.ok(!/Baufinanzierer Nummer 1/i.test(html), 'Unbelegter Nummer-eins-Claim darf nicht erscheinen');
assert.ok(!html.includes('2,75 %'), 'Nicht belegte Kondition darf nicht erscheinen');
assert.ok(html.includes('<details class="baufi-analysis-disclosure">'), 'Immobilienanalyse ist nicht platzsparend vertiefbar');
assert.equal((html.match(/<details class="baufi-funding-card">/g) || []).length, 2, 'Förderkarten sind nicht einzeln aufklappbar');
assert.ok(html.includes('id="baufiNextSteps"'), 'Klarer Ablauf nach der Terminwahl fehlt');
assert.ok(html.includes('Öffentliche Fördermittel'), 'Öffentliche Fördermittel fehlen');
assert.ok(html.includes('baufi-riester-callout'), 'Wohn-Riester fehlt als sichtbarer Förderbaustein');
assert.ok(html.includes('Bestehende Riester-Rente fürs Eigenheim nutzen?'), 'Wohn-Riester ist nicht als verständlicher Eyecatcher formuliert');
assert.ok(html.includes('vorhandene Riester-Verträge'), 'Der Hinweis auf vorhandene Riester-Verträge fehlt');
assert.ok(html.includes('Wohnförderkonto'), 'Der steuerliche Hinweis zum Wohnförderkonto fehlt');
assert.ok(html.includes('riester.deutsche-rentenversicherung.de/DE/So-geht-Riester/So-geht-Wohn-Riester/'), 'Offizielle ZfA-Quelle zu Wohn-Riester fehlt');
assert.ok(html.includes('Staatliche Sparförderung im direkten Vergleich'), 'Vergleich der staatlichen Sparförderung fehlt');
assert.ok(html.includes('<details class="baufi-savings-disclosure">'), 'Sparförderungsdetails sind nicht einklappbar');
assert.ok(html.includes('Details zur Sparförderung ansehen'), 'Beschriftung für die einklappbaren Sparförderungsdetails fehlt');
assert.ok(html.includes('Wohnungsbauprämiengesetz'), 'Amtliche Grundlage der Wohnungsbauprämie fehlt');
assert.ok(html.includes('bis zu 43 €'), 'Aktueller Höchstwert der Sparzulage beim Bausparen fehlt');
assert.ok(js.includes("document.getElementById('baufiAnalysis').hidden = !isBaufi"), 'Immobilienanalyse ist nicht auf Baufi begrenzt');
assert.ok(js.includes("document.getElementById('baufiFunding').hidden = !isBaufi"), 'Fördermittelbereich ist nicht auf Baufi begrenzt');
assert.ok(js.includes("document.getElementById('toolsSection').hidden = isBaufi"), 'Doppelte Werkzeugauswahl wird auf der Baufi-Seite nicht ausgeblendet');
assert.ok(js.includes('hero.after(orientation)'), 'Situationsauswahl steht auf der Baufi-Seite nicht direkt nach dem Einstieg');
assert.match(baufi, /Was hast du vor\?/i, 'Baufi-Einstieg fragt nicht klar nach dem Vorhaben');
assert.match(baufi, /primarySituations = \['orientierung', 'kauf', 'neubau', 'sanierung', 'anschluss'\]/, 'Die fünf visuellen Hauptwege fehlen oder sind falsch sortiert');
assert.match(baufi, /scenes-v2\/(?:orientierung|kauf|neubau|sanierung|anschluss)\.webp/, 'Die nahbaren Baufi-Motive fehlen im Auswahlweg');
assert.match(baufi, /situation-alt-link/, 'Der zurückgenommene Zusatzweg zur Optimierung fehlt');
assert.ok(!baufi.includes('Was beschäftigt dich?'), 'Die alte generische Kompassfrage ist noch sichtbar');
assert.match(program, /url:\s*'\/baufi\.html\?vorlage=baufi&modus=referral/, 'Die Portalvorschau nutzt nicht die zentrale Baufi-Seite');
assert.match(js, /window\.location\.replace\(`\$\{canonicalBaufi\.pathname\}/, 'Alte Baufi-Themenadressen werden nicht auf den zentralen Weg weitergeführt');

assert.ok(js.includes('getEmpfehlungByToken'));
assert.ok(js.includes('markInteressiert'));
assert.ok(js.includes("/austragen.html?token="));
assert.ok(js.includes("referralOverview.searchParams.set('vorlage', 'allgemein')"));

assert.match(messages, /kinder:\s*\[/, 'Für Kinder fehlt die eigene Nachrichtenvorlage');
assert.match(messages, /banking:\s*\[/, 'Für Banking fehlt die eigene Nachrichtenvorlage');
assert.match(messages, /energie:\s*\[/, 'Für Energie fehlt die eigene Nachrichtenvorlage');
assert.ok(supabaseClient.includes("slug: 'banking'"), 'Banking fehlt in der gemeinsamen Themenauswahl');
assert.ok(supabaseClient.includes("slug: 'energie'"), 'Energie fehlt in der gemeinsamen Themenauswahl');
assert.match(program, /data-page-key=/, 'Die unfertigen Themenkarten sind nicht auswählbar');

assert.match(baufi, /\/css\/baufi-empfehlung-mockup\.css\?v=\d+/, 'Baufi-Empfehlungsmockup ist nicht eingebunden');
assert.ok(baufiMockCss.includes('--tw-blue: #00688b'), 'Blau-Gold-Stil der Baufi-Vorschau fehlt');
assert.ok(baufi.includes('bankenvergleich-praxis-2026-08.png'), 'Echter Bankenvergleich fehlt im Baufi-Mockup');
assert.ok(baufi.includes('class="finance-models'), 'Vergleich der Finanzierungswege fehlt im Baufi-Mockup');
assert.ok(baufi.includes('ab 0,95 %'), 'Geprüftes Tarifbeispiel fehlt im Baufi-Mockup');
assert.ok(baufi.includes('Wie kann die geplante Anschlusslösung funktionieren?'), 'Aufklappbare Erklärung der Anschlusslösung fehlt');
assert.ok(baufi.includes('Auch vorhandenes Riester-Guthaben kann eine Prüfspur sein'), 'Wohn-Riester fehlt im verdichteten Baufi-Weg');
assert.match(baufi, /\/js\/baufi\.js\?v=\d+/, 'Aktuelle Baufi-Logik ist nicht eingebunden');
assert.ok(baufiJs.includes("document.body.dataset.entryMode = referralMode ? 'referral' : 'public'"), 'Empfehlungs- und Kundenseitenmodus sind nicht getrennt');
assert.ok(baufiJs.includes('getEmpfehlungByToken(token)'), 'Empfehlungsdaten werden im Baufi-Mockup nicht geladen');
assert.ok(baufiJs.includes('markInteressiert(token)'), 'Interesse wird im Baufi-Mockup nicht an den echten Empfehlungsweg übergeben');
assert.ok(baufiMockCss.includes('body[data-entry-mode="public"] .recommendation'), 'Neutraler Kundenseitenmodus blendet den Empfehlungshinweis nicht aus');
assert.ok(!/Baufinanzierer Nummer 1/i.test(baufi), 'Unbelegter Nummer-eins-Claim darf nicht erscheinen');
assert.ok(!baufi.includes('2,75 %'), 'Nicht belegte Kondition darf nicht erscheinen');

console.log('themenseiten-geruest: OK');
