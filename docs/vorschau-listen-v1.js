/**
 * Gestaltungsvorschau für die drei Listenseiten im Beraterbereich.
 *
 * Zeigt je Bereich den heutigen Stand und den Vorschlag nebeneinander, mit
 * erfundenen Beispieldaten. Die echten Seiten werden nicht angefasst; diese
 * Dateien existieren nur, damit am Bild entschieden werden kann statt an einer
 * Beschreibung.
 *
 * Die Beispiele decken absichtlich die unbequemen Fälle ab: sehr lange Namen,
 * fehlende Angaben, überfällige Kontakte, Testeinträge, kein Kontaktweg.
 */
import { icon } from '../js/icons.js';
import { esc, initialen } from './vorschau-hilfen.js';
import { promHeute, promNeu, PROM_BEFUND } from './vorschau-prom.js';
import { potHeute, potNeu, POT_BEFUND } from './vorschau-pot.js';

/* ------------------------------------------------------------ Empfehlungen */

const EMPFEHLUNGEN = [
  { name: 'Kimberly', thema: 'Für deine Kinder', status: 'anrufwunsch', zeit: 'vor 2 Stunden',
    promoter: null, geoeffnet: false, telefon: '+49 173 1747526', wartet: true, beste: 'nachmittags' },
  { name: 'Anna-Christin Wiesenberger-Hohenstein', thema: 'Absicherung der Arbeitskraft',
    status: 'interessiert', zeit: 'vor 5 Stunden', promoter: 'Sandro Wernicke',
    geoeffnet: true, telefon: '+49 151 22334455', wartet: true, beste: 'abends' },
  { name: 'Tobias Berger', thema: 'Vermögensaufbau', status: 'offen', zeit: 'gestern',
    promoter: 'Josephine Bürger', geoeffnet: true, telefon: '+49 160 9988776' },
  { name: 'M. Kraus', thema: 'Für deine Kinder', status: 'offen', zeit: 'vor 3 Tagen',
    promoter: null, geoeffnet: false, telefon: null },
  { name: 'Testkontakt Musterfrau', thema: 'Allgemein', status: 'offen', zeit: 'vor 4 Tagen',
    promoter: 'Max Kudlek', geoeffnet: false, telefon: '+49 170 0000000', test: true },
  { name: 'Familie Wende', thema: 'Baufinanzierung', status: 'kunde', zeit: 'vor 1 Woche',
    promoter: 'Sven Augustin', geoeffnet: true, telefon: '+49 175 4433221' },
];

const STATUS = {
  anrufwunsch: { text: 'Anrufwunsch', farbe: 'var(--burnt-orange)' },
  interessiert: { text: 'Interessiert', farbe: 'var(--terracotta)' },
  offen: { text: 'Offen', farbe: 'var(--ink-soft)' },
  kunde: { text: 'Kunde', farbe: 'var(--marine)' },
};

function empfHeute() {
  const zeile = (r) => '<div class="ep-row">'
    + '<div class="ep-person"><span class="ep-initial">' + esc(initialen(r.name)) + '</span>'
    + '<span><strong>' + esc(r.name) + '</strong>'
    + (r.test ? ' <span class="badge badge-test">Test</span>' : '')
    + '<small>' + esc(r.zeit) + '</small></span></div>'
    + '<div class="ep-topic">' + esc(r.thema) + '<small>Promoter: ' + esc(r.promoter || 'nicht angegeben') + '</small></div>'
    + '<span class="ep-state ' + r.status + '">' + esc(STATUS[r.status].text.toUpperCase()) + '</span>'
    + '<span class="ep-opened' + (r.geoeffnet ? '' : ' off') + '"><i></i>' + (r.geoeffnet ? 'geöffnet' : 'ungeöffnet') + '</span>'
    + '<span class="ep-arrow">' + icon('ChevronRight', { size: 16 }) + '</span></div>';

  const karte = (r) => '<article class="ep-lead' + (r.status === 'interessiert' ? ' interest' : '') + '">'
    + '<div class="ep-lead-top"><div class="ep-lead-person">'
    + '<span class="ep-lead-initial">' + esc(initialen(r.name)) + '</span>'
    + '<span><strong>' + esc(r.name) + '</strong><small>' + esc(r.zeit) + ' · über ' + esc(r.promoter || 'unbekannt') + '</small></span></div>'
    + '<span class="ep-lead-badge">' + (r.status === 'interessiert' ? 'Interesse' : 'Anrufwunsch') + '</span></div>'
    + '<p>' + esc(r.name) + ' interessiert sich für <strong>' + esc(r.thema) + '</strong>'
    + (r.telefon ? ' und hat eine Telefonnummer angegeben.' : '.') + '</p>'
    + '<div class="ep-lead-actions">'
    + (r.telefon ? '<a class="ep-action primary" href="#">' + icon('PhoneCall', { size: 15 }) + ' Jetzt anrufen</a><a class="ep-action" href="#">WhatsApp</a>' : '')
    + '<a class="ep-action" href="#">Details</a></div></article>';

  return '<section class="ep-intro"><div>'
    + '<div class="h-label">Tagesgeschäft</div><h1>Empfehlungen</h1>'
    + '<p>Kontakte priorisieren, persönlich reagieren und den nächsten Schritt festhalten.</p>'
    + '</div><a href="#" class="ep-primary">+ Neue Empfehlung</a></section>'
    + '<section class="ep-workbar">'
    + '<label class="ep-search">' + icon('Search', { size: 17 }) + '<input type="search" placeholder="Name, Telefon oder Promoter suchen"></label>'
    + '<div class="ep-filters">'
    + '<button class="filter-tab active" type="button">Alle <span>6</span></button>'
    + '<button class="filter-tab" type="button">Offen <span>3</span></button>'
    + '<button class="filter-tab" type="button">Anrufwunsch <span>1</span></button>'
    + '<button class="filter-tab" type="button">Interesse <span>1</span></button>'
    + '<button class="filter-tab" type="button">Kontaktiert <span>0</span></button>'
    + '<button class="filter-tab" type="button">Kunde <span>1</span></button></div>'
    + '<div class="ep-filters ep-scope"><button class="filter-tab active" type="button">Meine</button>'
    + '<button class="filter-tab" type="button">Mein Team</button></div></section>'
    + '<div class="ep-section-head"><h2>Wartet auf dich</h2><span>Nach Dringlichkeit sortiert</span></div>'
    + '<div class="ep-priority-grid">' + EMPFEHLUNGEN.filter((r) => r.wartet).map(karte).join('') + '</div>'
    + '<div class="ep-section-head"><h2>Alle Empfehlungen</h2><span>6 Kontakte</span></div>'
    + '<div class="ep-list">' + EMPFEHLUNGEN.map(zeile).join('') + '</div>'
    + '<div class="ep-hint"><span>Rechtsklick öffnet weitere Aktionen.</span><span>6 Empfehlungen insgesamt</span></div>';
}

function empfNeu() {
  const dringend = EMPFEHLUNGEN.filter((r) => r.wartet);
  const rest = EMPFEHLUNGEN.filter((r) => !r.wartet);

  const dringendZeile = (r) => {
    const s = STATUS[r.status];
    return '<div class="n-dringend-zeile" style="--ton:' + s.farbe + '">'
      + '<span class="n-kuerzel">' + esc(initialen(r.name)) + '</span>'
      + '<span style="min-width:0"><span class="n-name">' + esc(r.name) + '</span>'
      + '<span class="n-satz"><b>' + esc(s.text) + '</b> · ' + esc(r.thema)
      + (r.beste ? ' · am besten ' + esc(r.beste) : '') + '</span></span>'
      + '<span class="n-tuen">'
      + (r.telefon ? '<a class="n-tun haupt" href="#">' + icon('PhoneCall', { size: 14 }) + ' Anrufen</a><a class="n-tun" href="#">WhatsApp</a>' : '<span class="n-tun">Keine Nummer</span>')
      + '</span></div>';
  };

  const zeile = (r) => {
    const s = STATUS[r.status];
    return '<a class="n-zeile" href="#" style="--ton:' + s.farbe + '">'
      + '<span class="n-kuerzel">' + esc(initialen(r.name)) + '</span>'
      + '<span style="min-width:0"><span class="n-oben"><strong>' + esc(r.name) + '</strong>'
      + '<span class="n-marke"><i></i>' + esc(s.text) + '</span>'
      + (r.test ? '<span class="n-test">Testeintrag</span>' : '') + '</span>'
      + '<span class="n-unten"><span>' + esc(r.thema) + '</span>'
      + (r.promoter ? '<span class="n-punkt">·</span><span>von ' + esc(r.promoter) + '</span>' : '')
      + '<span class="n-punkt">·</span><span>' + esc(r.zeit) + '</span></span></span>'
      + '<span class="n-pfeil">' + icon('ChevronRight', { size: 15 }) + '</span></a>';
  };

  return '<section class="n-kopf"><div>'
    + '<div class="h-label">Tagesgeschäft</div><h1>Empfehlungen</h1></div>'
    + '<a href="#">+ Neue Empfehlung</a></section>'
    + '<div class="n-leiste">'
    + '<label class="n-suche">' + icon('Search', { size: 16 }) + '<input type="search" placeholder="Name oder Telefonnummer"></label>'
    + '<div class="n-reiter"><button type="button" aria-pressed="true">Alle <b>6</b></button>'
    + '<button type="button">Offen <b>3</b></button><button type="button">Anrufwunsch <b>1</b></button>'
    + '<button type="button">Interesse <b>1</b></button></div>'
    + '<button class="n-mehr" type="button" aria-expanded="false" id="empfMehr">Weitere Filter</button>'
    + '<div class="n-weitere" id="empfWeitere">'
    + '<button class="n-mehr" type="button">Kontaktiert</button>'
    + '<button class="n-mehr" type="button">Kunde</button>'
    + '<button class="n-mehr" type="button">Kein Interesse</button>'
    + '<button class="n-mehr" type="button">Mein Team</button>'
    + '<button class="n-mehr" type="button">Nur Funnel-Leads</button>'
    + '<button class="n-mehr" type="button">Testeinträge zeigen</button></div></div>'
    + '<div class="n-abschnitt"><h2>Wartet auf dich</h2><span>' + dringend.length + ' von ' + EMPFEHLUNGEN.length + '</span></div>'
    + '<div class="n-dringend">' + dringend.map(dringendZeile).join('') + '</div>'
    + '<div class="n-abschnitt"><h2>Alle weiteren</h2><span>' + rest.length + ' Kontakte</span></div>'
    + '<div class="n-liste">' + rest.map(zeile).join('') + '</div>';
}

const EMPF_BEFUND = '<strong>Befund Empfehlungen.</strong> Die dringenden Kontakte stehen heute'
  + ' <strong>zweimal</strong> auf der Seite: als große Karte unter „Wartet auf dich" und direkt'
  + ' darunter noch einmal in der Liste. Am Handy schiebt das die erste Listenzeile um 1200 bis'
  + ' 1400 Punkte nach unten. Im Vorschlag ist jede dringende Person eine Zeile mit dem Anruf'
  + ' daneben, und sie erscheint unten nicht noch einmal.'
  + '<br><br>Zweiter Fund: Unter 820 Punkten Breite blendet das heutige Raster <strong>Thema und'
  + ' Herkunft ersatzlos aus</strong>. Am Handy sieht man nur Name, Datum und Status. Der'
  + ' Vorschlag stellt beides untereinander, dann bleibt es auf jeder Breite lesbar.'
  + '<br><br>Dritter Fund: <strong>Testeinträge zählen in allen Zählern dieser Seite mit</strong>,'
  + ' anders als auf den übrigen Seiten. Im Vorschlag sind sie deutlich gekennzeichnet und gehören'
  + ' unter „Weitere Filter".'
  + '<br><br>Und: „Promoter: nicht angegeben" sowie „über unbekannt" stehen heute auf jeder'
  + ' Empfehlung, die über die Promoter-App kam. Der Promoter <strong>ist</strong> bekannt, nur'
  + ' sein Name wird beim Anlegen nicht mitgespeichert. Im Vorschlag steht die Herkunft nur dann,'
  + ' wenn sie etwas aussagt.';

/* ------------------------------------------------------------------ Aufbau */

function paar(heute, neu, befund) {
  return '<div class="vs-paar">'
    + '<div class="vs-spalte"><div class="vs-marke heute">Heute <b>live</b></div>'
    + '<div class="vs-rahmen">' + heute + '</div></div>'
    + '<div class="vs-spalte"><div class="vs-marke neu">Vorschlag <b>Entwurf</b></div>'
    + '<div class="vs-rahmen">' + neu + '</div></div></div>'
    + '<p class="vs-befund">' + befund + '</p>';
}

document.getElementById('empf').innerHTML = paar(empfHeute(), empfNeu(), EMPF_BEFUND);
document.getElementById('prom').innerHTML = paar(promHeute(), promNeu(), PROM_BEFUND);
document.getElementById('pot').innerHTML = paar(potHeute(), potNeu(), POT_BEFUND);

/* --------------------------------------------------------------- Bedienung */

for (const id of ['empf', 'prom', 'pot']) {
  const knopf = document.getElementById(id + 'Mehr');
  const feld = document.getElementById(id + 'Weitere');
  if (!knopf || !feld) continue;
  knopf.addEventListener('click', () => {
    const offen = knopf.getAttribute('aria-expanded') === 'true';
    knopf.setAttribute('aria-expanded', String(!offen));
    feld.dataset.offen = offen ? 'nein' : 'ja';
  });
}

/* Der Bereich lässt sich über die Adresse ansteuern (#prom, #pot). Praktisch
   zum Verlinken und nötig, um die Bereiche einzeln abfotografieren zu können. */
function zeigeBereich(ziel) {
  document.querySelectorAll('.vs-reiter button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.ziel === ziel)));
  document.querySelectorAll('.vs-bereich').forEach((s) => { s.hidden = s.id !== ziel; });
}
// Auch die Breite laesst sich ueber die Adresse setzen (?eng), damit sich die
// Handy-Ansicht abfotografieren und verlinken laesst.
if (location.search.includes('eng')) {
  document.body.classList.add('vs-eng');
  document.querySelectorAll('.vs-breite button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.breite === 'eng')));
}
const ausAdresse = String(location.hash || '').replace('#', '');
if (['empf', 'prom', 'pot'].includes(ausAdresse)) zeigeBereich(ausAdresse);
window.addEventListener('hashchange', () => {
  const z = String(location.hash || '').replace('#', '');
  if (['empf', 'prom', 'pot'].includes(z)) zeigeBereich(z);
});

document.querySelectorAll('.vs-reiter button').forEach((b) => {
  b.addEventListener('click', () => {
    history.replaceState(null, '', '#' + b.dataset.ziel);
    document.querySelectorAll('.vs-reiter button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('.vs-bereich').forEach((s) => { s.hidden = s.id !== b.dataset.ziel; });
  });
});

document.querySelectorAll('.vs-breite button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.vs-breite button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.body.classList.toggle('vs-eng', b.dataset.breite === 'eng');
  });
});
