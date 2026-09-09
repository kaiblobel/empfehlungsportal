/**
 * Vorschau: Empfehlungsliste, heute und Vorschlag (zweite Fassung).
 *
 * Gegenüber der ersten Fassung geändert, nach Kais Rückfrage und eigener
 * Kritik am Entwurf:
 *
 * 1. Datumsköpfe. Vierzig gleich hohe Zeilen sind eine graue Wand. „Heute",
 *    „Diese Woche", „Älter" geben dem Auge Halt und zeigen nebenbei, wie alt
 *    ein Kontakt ist.
 * 2. Der Namenskreis ist wieder ruhig. Vorher trug er zwei Bedeutungen
 *    gleichzeitig, Person und Zustand. Der Zustand sitzt jetzt allein im
 *    schmalen Streifen links und in einem leisen Wort.
 * 3. Der Name ist größer. Wer die Liste durchgeht, sucht Namen, nicht Zustände.
 */
import { icon } from '../js/icons.js';
import { esc, initialen } from './vorschau-hilfen.js';
import { EMPFEHLUNGEN, STATUS, GRUPPEN } from './vorschau-daten.js';

export function empfHeute() {
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

  const wartet = EMPFEHLUNGEN.filter((r) => r.wartet).slice(0, 4);

  return '<section class="ep-intro"><div>'
    + '<div class="h-label">Tagesgeschäft</div><h1>Empfehlungen</h1>'
    + '<p>Kontakte priorisieren, persönlich reagieren und den nächsten Schritt festhalten.</p>'
    + '</div><a href="#" class="ep-primary">+ Neue Empfehlung</a></section>'
    + '<section class="ep-workbar">'
    + '<label class="ep-search">' + icon('Search', { size: 17 }) + '<input type="search" placeholder="Name, Telefon oder Promoter suchen"></label>'
    + '<div class="ep-filters">'
    + '<button class="filter-tab active" type="button">Alle <span>' + EMPFEHLUNGEN.length + '</span></button>'
    + '<button class="filter-tab" type="button">Offen <span>26</span></button>'
    + '<button class="filter-tab" type="button">Anrufwunsch <span>2</span></button>'
    + '<button class="filter-tab" type="button">Interesse <span>2</span></button>'
    + '<button class="filter-tab" type="button">Kontaktiert <span>6</span></button>'
    + '<button class="filter-tab" type="button">Kunde <span>4</span></button></div>'
    + '<div class="ep-filters ep-scope"><button class="filter-tab active" type="button">Meine</button>'
    + '<button class="filter-tab" type="button">Mein Team</button></div></section>'
    + '<div class="ep-section-head"><h2>Wartet auf dich</h2><span>Nach Dringlichkeit sortiert</span></div>'
    + '<div class="ep-priority-grid">' + wartet.map(karte).join('') + '</div>'
    + '<div class="ep-section-head"><h2>Alle Empfehlungen</h2><span>' + EMPFEHLUNGEN.length + ' Kontakte</span></div>'
    + '<div class="ep-list">' + EMPFEHLUNGEN.map(zeile).join('') + '</div>'
    + '<div class="ep-hint"><span>Rechtsklick öffnet weitere Aktionen.</span>'
    + '<span>' + EMPFEHLUNGEN.length + ' Empfehlungen insgesamt</span></div>';
}

export function empfNeu() {
  const dringend = EMPFEHLUNGEN.filter((r) => r.wartet);
  const rest = EMPFEHLUNGEN.filter((r) => !r.wartet);

  const dringendZeile = (r) => {
    const s = STATUS[r.status];
    return '<div class="n2-dringend" style="--ton:' + s.farbe + '">'
      + '<span class="n2-kreis">' + esc(initialen(r.name)) + '</span>'
      + '<span class="n2-mitte"><span class="n2-name gross">' + esc(r.name) + '</span>'
      + '<span class="n2-zeile2"><b class="n2-zustand">' + esc(s.text) + '</b>'
      + '<span class="n2-punkt">·</span>' + esc(r.thema)
      + (r.beste ? '<span class="n2-punkt">·</span>am besten ' + esc(r.beste) : '') + '</span></span>'
      + '<span class="n2-tuen">'
      + (r.telefon
        ? '<a class="n2-tun haupt" href="#">' + icon('PhoneCall', { size: 14 }) + ' Anrufen</a>'
          + '<a class="n2-tun" href="#">WhatsApp</a>'
        : '<span class="n2-tun leer">Keine Nummer</span>')
      + '</span></div>';
  };

  const zeile = (r) => {
    const s = STATUS[r.status];
    const leise = r.status === 'offen' || r.status === 'kontaktiert';
    return '<a class="n2-zeile" href="#" style="--ton:' + s.farbe + '">'
      + '<span class="n2-kreis">' + esc(initialen(r.name)) + '</span>'
      + '<span class="n2-mitte"><span class="n2-name">' + esc(r.name) + '</span>'
      + '<span class="n2-zeile2">'
      + '<b class="n2-zustand' + (leise ? ' leise' : '') + '">' + esc(s.text) + '</b>'
      + '<span class="n2-punkt">·</span>' + esc(r.thema)
      + (r.promoter ? '<span class="n2-punkt">·</span>von ' + esc(r.promoter) : '')
      + '</span></span>'
      + (r.test ? '<span class="n2-test">Testeintrag</span>' : '')
      + '<span class="n2-zeit">' + esc(r.zeit) + '</span>'
      + '<span class="n2-pfeil">' + icon('ChevronRight', { size: 15 }) + '</span></a>';
  };

  const gruppen = GRUPPEN.map(([schluessel, titel]) => {
    const teil = rest.filter((r) => r.gruppe === schluessel);
    if (!teil.length) return '';
    return '<div class="n2-gruppe"><span>' + titel + '</span><b>' + teil.length + '</b></div>'
      + teil.map(zeile).join('');
  }).join('');

  return '<section class="n2-kopf"><div>'
    + '<div class="h-label">Tagesgeschäft</div><h1>Empfehlungen</h1></div>'
    + '<a href="#">+ Neue Empfehlung</a></section>'
    + '<div class="n2-leiste">'
    + '<label class="n2-suche">' + icon('Search', { size: 16 }) + '<input type="search" placeholder="Name oder Telefonnummer"></label>'
    + '<div class="n2-reiter"><button type="button" aria-pressed="true">Alle <b>' + EMPFEHLUNGEN.length + '</b></button>'
    + '<button type="button">Offen <b>26</b></button>'
    + '<button type="button">Anrufwunsch <b>2</b></button>'
    + '<button type="button">Interesse <b>2</b></button></div>'
    + '<button class="n2-mehr" type="button" aria-expanded="false" id="empfMehr">Weitere Filter</button>'
    + '<div class="n2-weitere" id="empfWeitere">'
    + '<button class="n2-mehr" type="button">Kontaktiert</button>'
    + '<button class="n2-mehr" type="button">Kunde</button>'
    + '<button class="n2-mehr" type="button">Kein Interesse</button>'
    + '<button class="n2-mehr" type="button">Mein Team</button>'
    + '<button class="n2-mehr" type="button">Nur Funnel-Leads</button>'
    + '<button class="n2-mehr" type="button">Testeinträge zeigen</button></div></div>'
    + '<div class="n2-abschnitt"><h2>Wartet auf dich</h2><span>' + dringend.length + ' von ' + EMPFEHLUNGEN.length + '</span></div>'
    + '<div class="n2-dringend-block">' + dringend.map(dringendZeile).join('') + '</div>'
    + '<div class="n2-abschnitt"><h2>Alle weiteren</h2><span>' + rest.length + ' Kontakte</span></div>'
    + '<div class="n2-liste">' + gruppen + '</div>';
}

export const EMPF_BEFUND = '<strong>Befund Empfehlungen.</strong> Die dringenden Kontakte stehen'
  + ' heute <strong>zweimal</strong> auf der Seite: als große Karte unter „Wartet auf dich" und'
  + ' direkt darunter noch einmal in der Liste. Am Handy schiebt das die erste Listenzeile um 1200'
  + ' bis 1400 Punkte nach unten.'
  + '<br><br>Unter 820 Punkten Breite blendet das heutige Raster <strong>Thema und Herkunft'
  + ' ersatzlos aus</strong>. Am Handy sieht man nur Name, Datum und Status.'
  + '<br><br><strong>Testeinträge zählen in allen Zählern dieser Seite mit</strong>, anders als auf'
  + ' den übrigen Seiten des Portals.'
  + '<br><br>„Promoter: nicht angegeben" und „über unbekannt" stehen auf jeder Empfehlung, die über'
  + ' die Promoter-App kam. Der Promoter <strong>ist</strong> bekannt, nur sein Name wird beim'
  + ' Anlegen nicht mitgespeichert.'
  + '<br><br><strong>Was in dieser zweiten Fassung dazugekommen ist:</strong> Datumsköpfe statt'
  + ' einer durchgehenden Wand, ein ruhiger Namenskreis statt eines zweifarbig codierten, und ein'
  + ' größerer Name. Vierzig Einträge statt sechs, damit sichtbar wird, wie sich das Scrollen'
  + ' anfühlt.';
