// Waffelmenue-Waechter: Der Anwendungswechsler existiert NUR im internen
// Beraterbereich (ueber js/nav.js) und nie auf Kundenseiten. Die Freigabe
// kommt von Kais zentraler Matrix in KAI.; der Proxy prueft Herkunft und
// Portal-Token, bevor er irgendetwas weiterreicht.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const nav = readFileSync('js/nav.js', 'utf8');
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
  assert.ok(nav.includes('waffel-overlay'), 'Overlay fehlt in nav.js');
  assert.ok(nav.includes('initWaffel'), 'initWaffel fehlt im init()');
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
  assert.ok(nav.includes('eintraege.length === 0 && !istAdmin'),
    'Ohne Freigaben und ohne Admin-Rolle verschwindet der Knopf');
  assert.ok(!nav.includes('NAV_ITEMS.map(waffelEintragHtml)'),
    'Das Waffelmenue faellt NIE auf die Portal-Navigation zurueck');
});

test('der Admin-Einstieg fuehrt zur zentralen Verwaltung in KAI.', () => {
  assert.ok(nav.includes("https://kai-hub-roan.vercel.app/waffel"));
  assert.ok(nav.includes('istAdmin'), 'Der Einstieg haengt am Admin-Kennzeichen');
});

test('der Proxy prueft Herkunft und Token, bevor er weiterreicht', () => {
  assert.ok(proxy.includes('sameOrigin(req)'), 'Herkunftspruefung fehlt');
  assert.ok(proxy.includes('/auth/v1/user'), 'Token-Pruefung gegen die Portal-Supabase fehlt');
  const herkunft = proxy.indexOf('sameOrigin(req)');
  const kaiAufruf = proxy.indexOf('/api/waffel/empfehlungsportal');
  assert.ok(herkunft > 0 && kaiAufruf > herkunft,
    'Die KAI.-Route wird erst NACH den Pruefungen angesprochen');
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
