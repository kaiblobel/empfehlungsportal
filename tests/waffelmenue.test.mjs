// Waffelmenue-Waechter: Der Anwendungswechsler existiert NUR im internen
// Beraterbereich (ueber js/nav.js) und nie auf Kundenseiten. Die Freigabe
// kommt von Kais zentraler Matrix in KAI.; der Proxy prueft Herkunft und
// Portal-Token, bevor er irgendetwas weiterreicht.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const nav = readFileSync('js/nav.js', 'utf8');
const icons = readFileSync('js/icons.js', 'utf8');
const proxy = readFileSync('api/waffel-config.js', 'utf8');

// Die oeffentlichen Seitentypen, auf denen NIE ein Waffelmenue stehen darf.
const OEFFENTLICH = [
  'index.html', 'programm.html', 'empfehlen.html', 'danke.html',
  'empfaenger.html', 'austragen.html', 'empfehler.html', 'promoter-start.html',
  'promoter-access.html', 'promoter-vorschau.html', 'thema.html',
  'themen-vorschau.html', 'ueberblick.html', 'baufi.html', 'beleg.html',
  'kidz-sommerfest.html', 'kidz-konzept.html', 'kidz-empfehlung.html',
];

test('der Waffelknopf lebt in js/nav.js (und damit nur auf internen Seiten)', () => {
  assert.ok(nav.includes('nav-waffel'), 'Knopf fehlt in nav.js');
  assert.ok(nav.includes('nav-waffel-mobile'), 'Sofort sichtbarer Handyknopf fehlt');
  assert.ok(nav.includes('waffel-overlay'), 'Overlay fehlt in nav.js');
  assert.ok(nav.includes('initWaffel'), 'initWaffel fehlt im init()');
});

test('die Navigation startet erst nach der Definition aller Waffel-Bausteine', () => {
  const definition = nav.indexOf('const WAFFEL_SUCHE_AB');
  const start = nav.lastIndexOf('const init = () => { renderNav(); initWaffel();');
  assert.ok(definition >= 0 && start > definition,
    'Ein Sofortstart vor den Waffel-const-Werten wuerde die ganze Navigation stoppen');
});

test('keine oeffentliche Seite traegt die Waffel-Kennung oder laedt nav.js', () => {
  for (const datei of OEFFENTLICH) {
    let inhalt = '';
    try {
      inhalt = readFileSync(datei, 'utf8');
    } catch {
      continue; // Seite existiert (noch) nicht — nichts zu pruefen.
    }
    assert.ok(!inhalt.includes('js/nav.js'), `${datei} darf nav.js nicht laden`);
    assert.ok(!inhalt.includes('waffel'), `${datei} darf keine Waffel-Kennung tragen`);
  }
});

test('Login und Passwort-Setzen bleiben ohne Navigation und ohne Waffel', () => {
  for (const datei of ['dashboard/index.html', 'dashboard/welcome.html']) {
    const inhalt = readFileSync(datei, 'utf8');
    assert.ok(!inhalt.includes('js/nav.js'), `${datei} laedt nav.js nicht`);
  }
});

test('fail-closed: leerer Bestand blendet den Knopf fuer normale Berater aus', () => {
  assert.ok(nav.includes('eintraege.length === 0 && !(istAdmin && verwaltenUrl)'),
    'Ohne Freigaben und ohne eingerichteten Admin-Einstieg verschwindet der Knopf');
  assert.ok(nav.includes('.nav-waffel[hidden]{display:none!important}'),
    'Die eigene CSS-Regel darf das hidden-Attribut nicht ueberstimmen');
  assert.ok(!nav.includes('NAV_ITEMS.map(waffelEintragHtml)'),
    'Das Waffelmenue faellt NIE auf die Portal-Navigation zurueck');
});

test('kein alter Browser-Zwischenstand ueberlebt eine geaenderte Admin-Freigabe', () => {
  assert.ok(!nav.includes('WAFFEL_CACHE_KEY'), 'Waffelmenue darf keinen localStorage-Rueckfall nutzen');
  assert.ok(!nav.includes('leseWaffelCache'), 'Kein alter Menuebestand wird vorab angezeigt');
  assert.ok(nav.includes("cache: 'no-store'"), 'Die kleine Freigabe wird frisch geladen');
});

test('die synthetische Vorschau ist ausschliesslich auf dem eigenen Rechner erreichbar', () => {
  assert.ok(nav.includes("['127.0.0.1', 'localhost'].includes(window.location.hostname)"));
  assert.ok(nav.includes("params.get('waffel-vorschau')"));
  assert.ok(nav.includes('if (vorschau)'));
});

test('Katalogtexte und Zieladressen werden vor innerHTML maskiert', () => {
  assert.ok(nav.includes('function waffelHtmlSicher'), 'HTML-Maskierung fehlt');
  assert.ok(nav.includes('waffelHtmlSicher(e.url)'), 'Zieladresse wird nicht maskiert');
  assert.ok(nav.includes('waffelHtmlSicher(e.name)'), 'Anwendungsname wird nicht maskiert');
  assert.ok(nav.includes('waffelHtmlSicher(e.zweck)'), 'Anwendungszweck wird nicht maskiert');
});

test('der Admin-Einstieg fuehrt zur zentralen Verwaltung in KAI.', () => {
  assert.ok(proxy.includes("`${kaiBasis.replace(/\\/$/, '')}/waffel`"),
    'Die Verwaltungsadresse bildet der Server aus der eingerichteten Verbindung');
  assert.ok(proxy.includes('istAdmin ?'), 'Nur Admins bekommen die Adresse ueberhaupt');
  assert.ok(nav.includes('link.href = verwaltenUrl'),
    'Der Browser nimmt die Adresse vom Server, statt eine eigene zu kennen');
});

test('ausser in der oertlichen Vorschau steht keine feste KAI.-Adresse im Browsercode', () => {
  // Sonst zeigt der Einstieg nach einem Umzug von KAI. still ins Leere.
  // Die Vorschau laeuft nur auf dem eigenen Rechner und darf sie tragen.
  const vorschau = nav.slice(nav.indexOf('function lokaleWaffelVorschau'), nav.indexOf('async function initWaffel'));
  const treffer = [...nav.matchAll(/kai-hub-roan\.vercel\.app/g)].length;
  const inVorschau = [...vorschau.matchAll(/kai-hub-roan\.vercel\.app/g)].length;
  assert.equal(treffer, inVorschau, 'Feste KAI.-Adresse ausserhalb der oertlichen Vorschau');
});

test('wer fragt, wird an KAI. mitgeschickt', () => {
  // Ohne Kennung und Inhaber-Kennzeichen gilt Kai auf dem eigenen Portal als
  // Fremder und saehe fast nichts; ein Partner bekaeme Adressen, die die
  // Interessenten des Inhabers erzeugen.
  assert.ok(proxy.includes("select=ist_admin,slug"), 'Die Kennung wird gar nicht erst gelesen');
  assert.ok(proxy.includes("ziel.searchParams.set('b', slug)"), 'Kennung wird nicht mitgeschickt');
  assert.ok(proxy.includes("ziel.searchParams.set('inhaber', '1')"), 'Inhaber-Kennzeichen fehlt');
  assert.ok(proxy.includes('/^[a-z0-9-]{1,64}$/.test(roh)'),
    'Eine Kennung wird vor dem Weiterreichen auf ihr Format geprueft');
});

test('fremde Anwendungen oeffnen abgekoppelt in einem neuen Tab', () => {
  // Portal und Navi teilen eine Anmeldung, Cockpit und KAI. eine zweite. Ein
  // Sprung ueber die Grenze im selben Tab kostet die laufende Sitzung.
  assert.ok(nav.includes('target="_blank" rel="noopener noreferrer"'),
    'Fremde Ziele oeffnen ohne noopener oder im selben Tab');
  assert.ok(nav.includes("const fremd = !aktuell && /^https?:\\/\\//i.test(String(e.url || ''))"),
    'Die eigene Anwendung darf keinen zweiten Tab von sich selbst oeffnen');
});

test('das Zeichen des Knopfes sind neun Kacheln, gefuellt', () => {
  // Dieselbe Zeichnung wie in KAI., Cockpit und Navi: 3, 9.5 und 16, je 5 breit.
  assert.ok(icons.includes('  Waffel:'), 'Das Waffel-Zeichen fehlt in js/icons.js');
  assert.ok(icons.includes('fill="currentColor"'), 'Neun duenne Raehmchen laufen zu einem Fleck zusammen');
  assert.ok(icons.includes('[3, 9.5, 16]'), 'Die Masse weichen von den anderen drei Projekten ab');
  assert.ok(nav.includes("icon('Waffel', { size: 18 })"), 'Der Knopf traegt noch das alte Zeichen');
  assert.ok(!nav.includes("icon('LayoutGrid', { size: 17 })"), 'Der alte Vier-Kachel-Knopf lebt noch');
});

test('der Knopf laesst sich mit dem Daumen treffen', () => {
  assert.ok(nav.includes('.nav-waffel::after{content:\'\';position:absolute;inset:-4px}'),
    'Sichtbar 36 Pixel, anfassbar muessen es 44 sein');
});

test('das Menue nimmt die Farben des Portals statt eigener Hex-Werte', () => {
  const block = nav.slice(nav.indexOf('function waffelMarkup'), nav.indexOf('function waffelEintragHtml'));
  assert.ok(!block.includes('#1677B8'), 'Das fremde Fuehrungsblau ist zurueck');
  assert.ok(block.includes('var(--dna-gold'), 'Die Symbole stehen nicht in Markengold');
  assert.ok(block.includes('var(--dna-line'), 'Trennung laeuft nicht ueber die Haarlinie des Portals');
});

test('der Proxy prueft Herkunft und Token, bevor er weiterreicht', () => {
  assert.ok(proxy.includes('sameOrigin(req)'), 'Herkunftspruefung fehlt');
  assert.ok(proxy.includes('/auth/v1/user'), 'Token-Pruefung gegen die Portal-Supabase fehlt');
  const herkunft = proxy.indexOf('sameOrigin(req)');
  const kaiAufruf = proxy.indexOf('/api/waffel/empfehlungsportal');
  assert.ok(herkunft > 0 && kaiAufruf > herkunft,
    'Die KAI.-Route wird erst NACH den Pruefungen angesprochen');
});

test('die Admin-Rolle wird ueber die echte Auth-Verknuepfung des Beraters gelesen', () => {
  assert.ok(proxy.includes('auth_user_id=eq.'), 'Admin-Suche muss auth_user_id verwenden');
  assert.ok(!proxy.includes('&user_id=eq.'), 'Die veraltete Spalte user_id darf nicht verwendet werden');
});

test('jedes erlaubte KAI.-Katalogsymbol ist im Portal vorhanden', () => {
  const block = nav.match(/const WAFFEL_ICONS = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(block, 'Liste der erlaubten Symbole fehlt');
  const namen = [...block[1].matchAll(/'([^']+)'/g)].map((treffer) => treffer[1]);
  for (const name of namen) {
    assert.ok(icons.includes(`  ${name}:`), `Symbol ${name} fehlt in js/icons.js`);
  }
});

test('das Tor-Wort bleibt auf dem Server und faellt fail-closed aus', () => {
  assert.ok(proxy.includes('KAI_WAFFEL_SECRET'), 'Secret kommt aus der Umgebung');
  assert.ok(proxy.includes('kaiSecret.length < 32'), 'Mindestlaenge wird geprueft');
  assert.ok(proxy.includes("eintraege: [], istAdmin: false"),
    'Fehlende Konfiguration ergibt ein leeres Menue');
  assert.ok(!nav.includes('KAI_WAFFEL_SECRET'), 'Das Secret erreicht den Browser nie');
});

test('nur http(s)-Ziele werden an den Browser durchgereicht', () => {
  assert.ok(proxy.includes('/^https?:\\/\\//i.test(url)'));
});

test('alle internen Seiten laden dieselbe nav.js-Fassung wie der Service Worker', () => {
  // Der versionsstand-Test prueft das breiter; hier der Waffel-spezifische Anker.
  const sw = readFileSync('sw.js', 'utf8');
  const m = sw.match(/js\/nav\.js\?v=(\d+)/);
  assert.ok(m, 'nav.js fehlt in der Precache-Liste');
  const fassung = m[1];
  const seiten = readdirSync('.').filter((d) => d.endsWith('.html'));
  for (const datei of seiten) {
    const inhalt = readFileSync(datei, 'utf8');
    if (!inhalt.includes('js/nav.js')) continue;
    assert.ok(inhalt.includes(`js/nav.js?v=${fassung}`),
      `${datei} laedt eine andere nav.js-Fassung als der Service Worker`);
  }
});
