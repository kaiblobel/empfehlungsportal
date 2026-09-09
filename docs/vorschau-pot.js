/**
 * Vorschau: Potenzialbuch, heute und Vorschlag.
 *
 * Die Beispiele enthalten zwei überfällige Kontakte und einen für heute. Am
 * heutigen Stand stehen sie irgendwo in der Liste, weil nach Bearbeitungs-
 * zeitpunkt sortiert wird, und die Fälligkeit steht als 9,5-Punkt-Zeile am
 * Kartenfuß, in derselben Farbe wie „in fünf Tagen".
 */
import { icon } from '../js/icons.js';
import { esc, initialen } from './vorschau-hilfen.js';

export const KONTAKTE = [
  { name: 'Martin Hebestreit', kreis: 'Sportverein · Freunde', staerke: 'Warm', staerkeKey: 'warm',
    grund: 'regelmäßiger Kontakt', status: 'Angesprochen', statusKey: 'angesprochen',
    faellig: 'heute', notiz: 'Beim Training über den Hauskauf gesprochen, will sich melden.', tel: '0171 2345678' },
  { name: 'Familie Grünberg-Waldmann', kreis: 'Nachbarschaft', staerke: 'Lauwarm', staerkeKey: 'lauwarm',
    grund: 'gelegentlicher Kontakt', status: 'Offen', statusKey: 'offen',
    faellig: 'ueberfaellig', faelligDatum: '04.09.', notiz: '', tel: '' },
  { name: 'Kerstin Wolf', kreis: 'Enger Freundeskreis · Familie', staerke: 'Sehr heiß', staerkeKey: 'sehr_heiss',
    grund: 'eng vertraut', status: 'Im Gespräch', statusKey: 'im_gespraech',
    faellig: 'ueberfaellig', faelligDatum: '02.09.', notiz: 'Zweitgespräch steht aus, Thema Arbeitskraft.', tel: '0160 1122334' },
  { name: 'Tobias P.', kreis: 'Arbeit', staerke: 'Kalt', staerkeKey: 'kalt',
    grund: 'kein direkter Kontaktweg', status: 'Offen', statusKey: 'offen',
    faellig: 'spaeter', faelligDatum: '28.09.', notiz: '', tel: '' },
  { name: 'Anja Scholz', kreis: 'Ehemalige Kollegen', staerke: 'Heiß', staerkeKey: 'heiss',
    grund: '3 gemeinsame Kreise', status: 'Termin', statusKey: 'termin',
    faellig: 'keiner', notiz: 'Wollte nach dem Urlaub noch einmal hören.', tel: '0175 9988776' },
];

const FAELLIG_TEXT = {
  heute: 'Heute nachfassen',
  ueberfaellig: 'Nachfassen war am {d} geplant',
  spaeter: 'Nächster Kontakt am {d}',
  keiner: 'Noch kein nächster Kontakt geplant',
};

function faelligText(k) {
  return (FAELLIG_TEXT[k.faellig] || '').replace('{d}', k.faelligDatum || '');
}

export function potHeute() {
  const karte = (k) => '<article class="potential-card' + (k.faellig === 'ueberfaellig' ? ' overdue' : '') + '">'
    + '<header class="potential-card-head">'
    + '<span class="potential-avatar">' + esc(initialen(k.name)) + '</span>'
    + '<div class="potential-person"><h3>' + esc(k.name) + '</h3><p>' + esc(k.kreis) + '</p></div>'
    + '<span class="potential-status" data-status="' + k.statusKey + '">' + esc(k.status) + '</span></header>'
    + '<div class="potential-strength-line">'
    + '<span class="potential-strength-badge" data-strength="' + k.staerkeKey + '"><strong>' + esc(k.staerke) + '</strong></span>'
    + '<span class="potential-strength-reason">' + esc(k.grund) + '</span></div>'
    + '<div class="potential-meta potential-meta-desktop"><span>Potenzialkunde</span><span>' + esc(k.kreis) + '</span>'
    + (k.tel ? '<span>' + esc(k.tel) + '</span>' : '') + '</div>'
    + '<p class="potential-note">' + esc(k.notiz || 'Noch keine Gesprächsnotiz. Ein kurzer Gedanke reicht für den nächsten Schritt.') + '</p>'
    + '<div class="potential-next ' + (k.faellig === 'ueberfaellig' ? 'overdue' : (k.faellig === 'heute' ? 'due' : '')) + '">'
    + '<span aria-hidden="true">' + (k.faellig === 'ueberfaellig' ? '!' : (k.faellig === 'heute' ? '•' : '○')) + '</span>'
    + '<span>' + esc(faelligText(k)) + '</span></div>'
    + '<div class="potential-actions">'
    + '<button class="potential-contact" type="button">Gespräch vorbereiten</button>'
    + '<button class="potential-transfer" type="button">Cockpit verbinden</button>'
    + '<button class="potential-more" type="button">•••</button></div></article>';

  return '<section class="potential-hero"><div>'
    + '<div class="h-label">Beziehungen bewusst entwickeln</div><h1>Potenzialbuch</h1>'
    + '<p>Menschen im Blick behalten, Chancen entwickeln und erst dann bewusst ins Cockpit übernehmen.</p></div>'
    + '<div class="potential-hero-actions"><button class="potential-secondary" type="button">Mit Stimme anlegen</button>'
    + '<button class="potential-primary" type="button">Kontakt eintragen</button></div></section>'
    + '<div class="potential-boundary"><span>i</span><p><strong>Dein privater Denkraum.</strong>'
    + ' Einträge aus dem Potenzialbuch werden nicht zu Empfehlungen, Promotern oder Prämien gezählt.</p></div>'
    + '<section class="potential-kpis">'
    + '<div class="potential-kpi" style="--potential-tone:#7A8B6F"><span class="potential-kpi-dot"></span><strong>4</strong><span>Offene Potenziale</span><small>noch ohne Abschluss</small></div>'
    + '<div class="potential-kpi" style="--potential-tone:#C28447"><span class="potential-kpi-dot"></span><strong>3</strong><span>Diese Woche nachfassen</span><small>dein nächster Fokus</small></div>'
    + '<div class="potential-kpi" style="--potential-tone:#2E5266"><span class="potential-kpi-dot"></span><strong>2</strong><span>Im Gespräch</span><small>inklusive Termine</small></div>'
    + '<div class="potential-kpi" style="--potential-tone:#8B7355"><span class="potential-kpi-dot"></span><strong>0</strong><span>Ins Cockpit übernommen</span><small>bewusst bestätigt</small></div>'
    + '</section>'
    + '<header class="potential-toolbar"><div><div class="h-label">Deine Kontakte</div>'
    + '<h2>Wen möchtest du weiterentwickeln?</h2></div></header>'
    + '<div class="potential-controls"><div class="potential-strength-buttons">'
    + '<button type="button">Alle</button><button type="button">Kalt</button><button type="button">Lauwarm</button>'
    + '<button type="button">Warm</button><button type="button">Heiß</button><button type="button">Sehr heiß</button></div>'
    + '<div class="potential-control-tools"><label class="potential-search">'
    + icon('Search', { size: 16 }) + '<input type="search" placeholder="Name, Telefon, E-Mail, Kreis oder Stärke"></label>'
    + '<details class="potential-circle-filter"><summary><span>Weitere Filter</span></summary></details></div></div>'
    + '<div class="potential-list">' + KONTAKTE.map(karte).join('') + '</div>';
}

export function potNeu() {
  const dringend = KONTAKTE.filter((k) => k.faellig === 'heute' || k.faellig === 'ueberfaellig');
  const rest = KONTAKTE.filter((k) => !(k.faellig === 'heute' || k.faellig === 'ueberfaellig'));

  const ton = (k) => (k.faellig === 'ueberfaellig' ? 'var(--burnt-orange)' : 'var(--terracotta)');

  const dringendZeile = (k) => '<div class="n2-dringend" style="--ton:' + ton(k) + '">'
    + '<span class="n2-kreis">' + esc(initialen(k.name)) + '</span>'
    + '<span class="n2-mitte"><span class="n2-name gross">' + esc(k.name) + '</span>'
    + '<span class="n2-zeile2"><b>' + esc(faelligText(k)) + '</b> · ' + esc(k.staerke) + ' · ' + esc(k.kreis) + '</span></span>'
    + '<span class="n2-tuen">'
    + (k.tel ? '<a class="n2-tun haupt" href="#">' + icon('PhoneCall', { size: 14 }) + ' Anrufen</a>' : '<span class="n2-tun">Keine Nummer</span>')
    + '<a class="n2-tun" href="#">Vorbereiten</a></span></div>';

  const zeile = (k) => '<a class="n2-zeile" href="#" style="--ton:var(--marine)">'
    + '<span class="n2-kreis">' + esc(initialen(k.name)) + '</span>'
    + '<span class="n2-mitte"><span class="n2-name">' + esc(k.name) + '</span>'
    + '<span class="n2-zeile2"><b class="n2-zustand">' + esc(k.staerke) + '</b><span class="n2-punkt">·</span>' + esc(k.kreis)
    + '<span class="n2-punkt">·</span><span>' + esc(k.status) + '</span>'
    + (k.faellig === 'spaeter' ? '<span class="n2-punkt">·</span><span>ab ' + esc(k.faelligDatum) + '</span>' : '')
    + '</span>'
    + (k.notiz ? '<details class="n2-detail"><summary>Notiz</summary><p>' + esc(k.notiz) + '</p></details>' : '')
    + '</span>'
    + '<span class="n2-pfeil">' + icon('ChevronRight', { size: 15 }) + '</span></a>';

  return '<section class="n2-kopf"><div>'
    + '<div class="h-label">Beziehungen bewusst entwickeln</div><h1>Potenzialbuch</h1></div>'
    + '<a href="#">Kontakt eintragen</a></section>'
    + '<div class="n2-leiste">'
    + '<label class="n2-suche">' + icon('Search', { size: 16 }) + '<input type="search" placeholder="Name oder Kreis"></label>'
    + '<div class="n2-reiter"><button type="button" aria-pressed="true">Alle</button>'
    + '<button type="button">Heute und überfällig <b>' + dringend.length + '</b></button>'
    + '<button type="button">Im Gespräch</button></div>'
    + '<button class="n2-mehr" type="button" aria-expanded="false" id="potMehr">Weitere Filter</button>'
    + '<div class="n2-weitere n-spalte" id="potWeitere">'
    + '<div class="n-zahlen">'
    + '<span class="n-zahl-block"><b>4</b><span>Offen</span></span>'
    + '<span class="n-zahl-block"><b>2</b><span>Im Gespräch</span></span>'
    + '<span class="n-zahl-block"><b>0</b><span>Im Cockpit</span></span></div>'
    + '<div class="n-filterreihe">'
    + '<button class="n2-mehr" type="button">Kontaktstärke</button>'
    + '<button class="n2-mehr" type="button">Kreise</button>'
    + '<button class="n2-mehr" type="button">Stand im Prozess</button>'
    + '<button class="n2-mehr" type="button">Mit Stimme anlegen</button></div>'
    + '<p class="n-fussnote">Einträge aus dem Potenzialbuch zählen nicht zu Empfehlungen, Promotern oder Prämien.</p>'
    + '</div></div>'
    + '<div class="n2-abschnitt"><h2>Heute und überfällig</h2><span>' + dringend.length + ' von ' + KONTAKTE.length + '</span></div>'
    + '<div class="n2-dringend-block">' + dringend.map(dringendZeile).join('') + '</div>'
    + '<div class="n2-abschnitt"><h2>Alle weiteren</h2><span>' + rest.length + ' Kontakte</span></div>'
    + '<div class="n2-liste">' + rest.map(zeile).join('') + '</div>';
}

export const POT_BEFUND = '<strong>Befund Potenzialbuch.</strong> Bis zum ersten Menschen stehen'
  + ' heute rund <strong>610 Punkte</strong> auf dem Rechner und <strong>750 auf dem Handy</strong>,'
  + ' also anderthalb Bildschirme aus Überschrift, Hinweistext, vier Zahlen und drei Filterzeilen.'
  + '<br><br><strong>Der wichtigste Fund:</strong> „Heute nachfassen" ist eine <strong>9,5 Punkt'
  + ' große Zeile am Kartenfuß</strong>, in derselben Farbe wie „Nächster Kontakt am 28.09.".'
  + ' Und die Liste ist <strong>nach Bearbeitungszeitpunkt sortiert</strong>, nicht nach'
  + ' Fälligkeit. Wer heute drankommt, steht also irgendwo. Einen Filter „heute" oder'
  + ' „überfällig" gibt es nicht. Im Vorschlag stehen genau diese Leute oben, mit dem Anruf daneben.'
  + '<br><br>Die Kachel „Diese Woche nachfassen" zählt <strong>Überfälliges stillschweigend mit</strong>.'
  + ' Zwei seit Tagen fällige Kontakte und einer von morgen ergeben dieselbe Drei.'
  + '<br><br>„Cockpit verbinden" steht heute als zweiter Knopf auf <strong>jeder</strong> Karte und'
  + ' ist auf dem Handy ausgeblendet. Im Vorschlag liegt er unter „Mehr", dort wo er hingehört.'
  + '<br><br>Auch hier: Kartenschrift zwischen <strong>8,5 und 10,5 Punkten</strong>, gegen 12 bis'
  + ' 15 im übrigen Beraterbereich.';
