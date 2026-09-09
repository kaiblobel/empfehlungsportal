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
import { empfHeute, empfNeu, EMPF_BEFUND } from './vorschau-empf.js';
import { promHeute, promNeu, PROM_BEFUND } from './vorschau-prom.js';
import { potHeute, potNeu, POT_BEFUND } from './vorschau-pot.js';

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
