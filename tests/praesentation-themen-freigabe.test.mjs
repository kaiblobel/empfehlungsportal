// Die Themenauswahl ist die Weiche im Gespräch.
//
// Früher führte jede Kachel in dieselbe Vorschau, und Themen ohne fertige
// Seite mussten deshalb gesperrt werden. Jetzt sagt jedes Thema selbst, was
// beim Antippen passiert. Das löst zwei Dinge auf einmal: Niemand landet mehr
// auf einer Seite, die nicht zum Thema passt, und die Eurosumme aus dem
// Rechner sieht nur noch, wen sie etwas angeht. Wer über Baufinanzierung oder
// über die Kinder empfiehlt, bekommt sie nie zu sehen und fragt sich auch
// nicht, wo denn sein eigener Anteil bleibt.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('css/praesentation.css'),
]);

// --- Drei Wege, und jedes Thema wählt seinen ---
assert.match(js, /typ: 'rechner'/);
assert.match(js, /typ: 'vorschau'/);
assert.match(js, /typ: 'impuls'/);

// --- Der Rechner hängt direkt an „Staatliche Förderungen" und ist aus dem
// Überblick unter „Ganz allgemein" heraus erreichbar. Nur über diese beiden
// Wege erscheint die Eurosumme; wer über Baufinanzierung oder KIDZ empfiehlt,
// bekommt sie nie zu sehen. ---
const stark = js.match(/const THEMEN_STARK = \[([\s\S]*?)\n  \];/)[1];
const rechnerThemen = [...stark.matchAll(/slug: '([^']+)'[\s\S]{0,160}?typ: 'rechner'/g)].map(m => m[1]);
assert.deepEqual(rechnerThemen.sort(), ['foerderungen']);

// „Ganz allgemein" öffnet den Überblick über alle Themen; von dort führt ein
// Knopf zum Rechner, ohne dass das Overlay dazwischen schließt.
assert.match(js, /slug: 'allgemein'[\s\S]{0,140}?typ: 'ueberblick'/);
assert.match(js, /ueberblickRechner'\)\?\.addEventListener/);
assert.match(js, /themaAuf\(\{ \.\.\.allgemein, typ: 'rechner'/);
assert.match(html, /id="themaUeberblick"/);
assert.equal((html.match(/class="ueberblick-teil[ "]/g) || []).length, 6,
  'sechs Schritte im Überblick');

// --- Was gerade gesetzlich passiert, steht vor den Schritten. Es ist der
// einzige Teil mit einer Frist, deshalb gehört er nach oben und nicht ans
// Ende. Die Termine sind die des verabschiedeten Gesetzes; ohne Zeitleiste
// und Quelle wäre es eine Behauptung. ---
const ueberblickStart = html.indexOf('id="themaUeberblick"');
const aktuellPos = html.indexOf('<section class="aktuell">', ueberblickStart);
const ersterSchritt = html.indexOf('class="ueberblick-teil', ueberblickStart);
assert.ok(aktuellPos > -1, 'der Block mit der aktuellen Gesetzeslage fehlt');
assert.ok(aktuellPos < ersterSchritt, 'der Aktuell-Block gehört vor die Schritte');
['27.03.2026', '08.05.2026', '01.01.2027'].forEach((datum) => {
  assert.ok(html.includes(datum), `${datum} fehlt in der Zeitleiste`);
});
assert.match(html, /Altersvorsorgereformgesetz/);
assert.match(html, /aktuell-fuss[\s\S]{0,200}bundesregierung\.de/,
  'die Quellenangabe unter dem Aktuell-Block fehlt');

// --- Die Darstellungen sind die echten aus den DVAG-Unterlagen, keine
// selbst gezeichneten Ersatzgrafiken. Das SVG, das früher an der Stelle des
// Zwei-Konten-Modells stand, darf nicht zurückkommen. ---
['dvag-formel.webp', 'dvag-pyramide.webp', 'dvag-zwei-konten.webp', 'dvag-haushaltsplan.webp'].forEach((datei) => {
  assert.match(html, new RegExp(`praesentation/${datei.replace('.', '\\.')}`),
    `${datei} fehlt im Überblick`);
});
const ueberblick = html.match(/id="themaUeberblick"[\s\S]*?\n      <\/div>/)[0];
assert.doesNotMatch(ueberblick, /<svg/, 'keine eigene Zeichnung mehr im Überblick');

// --- Baufi und Kinder zeigen die fertige Seite, so wie die Person sie bekommt ---
const vorschauThemen = [...stark.matchAll(/slug: '([^']+)'[\s\S]{0,120}?typ: 'vorschau'/g)].map(m => m[1]);
assert.deepEqual(vorschauThemen.sort(), ['baufi', 'kinder']);

// --- Beide Vorschau-Adressen tragen modus=referral. Ohne den Parameter läuft
// die Themenseite im öffentlichen Modus und zeigt die neutrale Fassung statt
// der persönlichen Empfehlung. ---
const vorschauUrls = [...stark.matchAll(/url: '([^']+)'/g)].map(m => m[1]);
assert.equal(vorschauUrls.length, 2);
vorschauUrls.forEach((u) => assert.match(u, /modus=referral/, `${u} braucht modus=referral`));

// --- Die Vorschau bekommt den Berater-Slug mit. Ohne ihn sähe ein Partner
// beim Öffnen das Portrait des Standard-Beraters auf seiner eigenen Seite. ---
assert.match(js, /const mitBerater = \(url\) =>/);
assert.match(js, /rahmen\.src = mitBerater\(thema\.url\)/);

// --- Die übrigen Themen sind nicht gesperrt, sondern geben einen Satz zum
// Weiterreden. Grau und tot wäre im Gespräch zu wenig. ---
assert.match(js, /const THEMEN_WEITERE = \[/);
const weitere = js.match(/const THEMEN_WEITERE = \[([\s\S]*?)\n  \];/)[1];
assert.equal((weitere.match(/impuls:/g) || []).length, 6);

// --- Im Overlay steht die Absicht im Vordergrund, nicht die Mechanik ---
assert.match(html, /Jetzt den Vorteil für deine Empfehlung berechnen/);
assert.match(js, /'Was hätte die empfohlene Person davon\?'/);

// --- Der Rechner liegt im Overlay, nicht mehr als eigener Abschnitt ---
assert.match(html, /id="themaRechner"/);
assert.doesNotMatch(html, /<section class="section foerder-rechner"/);

// --- Anzeige: Der Rechner darf nur in seinem eigenen Weg auftauchen.
// Als ID-Regel würde display:grid das hidden-Attribut überstimmen. ---
assert.match(css, /\.thema-rechner\{display:grid;/);
assert.doesNotMatch(css, /#themaRechner\{display:grid/);
assert.match(css, /\.thema-inhalt\[hidden\]\{display:none;\}/);

// --- KIDZ heisst KIDZ und traegt seinen Satz mit ---
assert.match(js, /titel: 'KIDZ', untertitel: 'Kinderleicht in die Zukunft'/);

// --- Kein Thema nutzt mehr die alten, sichtbar erzeugten Motive ---
assert.doesNotMatch(stark, /topic-allgemein-v1|topic-baufi-v1|foerder-freunde-v1/,
  'die erzeugten Motive sind ersetzt');

// --- Drei Darstellungen, damit die Reihe nicht wie ein Baukasten wirkt ---
assert.match(js, /art: 'ink'/);
assert.match(js, /art: 'foto'/);
assert.match(js, /art: 'logo'/);

// --- Jede der vier Kacheln zeigt ein Bild, und jedes füllt seine Fläche.
// „Ganz allgemein" stand vorher als reine Textfläche da, KIDZ als kleines
// Quadrat mittig auf grauem Grund. ---
const bilder = [...stark.matchAll(/bild: '([^']+)'/g)].map(m => m[1]);
assert.equal(bilder.length, 4, 'jede der vier starken Kacheln braucht ein Bild');
assert.match(js, /slug: 'allgemein'[\s\S]{0,400}?bild: '[^']*ueberblick-vorschau/,
  'die dunkle Kachel zeigt die Vorschau auf das, was dahinter liegt');
assert.match(js, /slug: 'kinder'[\s\S]{0,400}?bild: '[^']*thema-kidz/,
  'KIDZ nutzt das freigestellte Zeichen, nicht mehr das Logo mit weißem Rand');
assert.match(css, /\.thema-kachel-logo \.thema-kachel-bild img\{object-fit:cover;\}/);
assert.doesNotMatch(css, /\.thema-kachel-logo[^}]*object-fit:contain/,
  'contain lässt das Zeichen wieder als kleines Quadrat stehen');

console.log('praesentation-themen-freigabe: OK');
