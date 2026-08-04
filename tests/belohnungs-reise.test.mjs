import assert from 'node:assert/strict';
import {
  normalisiereStufen, istMeilenstein, fehlendeStufen, wertAusLabel,
  gesamtwert, baueReise, verdienteStufen, meilensteine,
  reiseHtml, geldSummary, kundenZeile,
} from '../js/belohnungs-reise.js';

/* ---------------------------------------------------------------------------
 * Synthetische Fixture — entspricht der freigegebenen Belohnungsmatrix.
 * Bewusst KEINE Live-Daten: der Test läuft ohne Netz und ohne Datenbank.
 * ------------------------------------------------------------------------- */
const MEILENSTEINE = {
  2:  { titel: 'Restaurantbesuch deiner Wahl', wert_label: '150 €',   bild_url: '/assets/images/programm/restaurant.jpg' },
  5:  { titel: 'Weber-Grill oder Apple Watch', wert_label: '449 €',   bild_url: '/assets/images/programm/applewatch.jpg' },
  7:  { titel: 'Goldbarren im Wert von 500 €', wert_label: '500 €',   bild_url: '/assets/images/programm/goldbarren.jpg' },
  10: { titel: 'iPad Air',                     wert_label: '699 €',   bild_url: '/assets/images/programm/ipad.jpg' },
  15: { titel: 'Mallorca-Urlaub',              wert_label: '2.000 €', bild_url: '/assets/images/programm/mallorca.jpg' },
};

function fixture() {
  const rows = [];
  for (let stufe = 1; stufe <= 15; stufe++) {
    const m = MEILENSTEINE[stufe];
    rows.push(m
      ? { stufe, ...m, highlight: true,  kategorien: ['sache'] }
      : { stufe, titel: 'Empfehlungs-Bonus', wert_label: '100 €', highlight: false, kategorien: ['geld', 'spende'] });
  }
  return rows;
}

/* --- Aufbau der Reise ---------------------------------------------------- */
const reise = baueReise(fixture());
assert.equal(reise.stationen.length, 15, '15 Stationen');
assert.equal(reise.stationen.filter(s => s.art === 'geld').length, 10, '10 Geldstufen');
assert.equal(reise.stationen.filter(s => s.art === 'meilenstein').length, 5, '5 Bild-Meilensteine');
assert.deepEqual(reise.stationen.map(s => s.stufe), [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 'in Reihenfolge');
assert.deepEqual(reise.fehlt, [], 'keine Lücken');
assert.deepEqual(
  reise.stationen.filter(s => s.art === 'meilenstein').map(s => s.stufe),
  [2, 5, 7, 10, 15],
  'Meilensteine an den richtigen Stufen'
);

/* --- Gesamtwert ---------------------------------------------------------- */
// 10 × 100 € + 150 + 449 + 500 + 699 + 2.000 = 4.798 €
assert.equal(gesamtwert(fixture()), 4798, 'Gesamtwert exakt 4.798 €');
assert.equal(wertAusLabel('2.000 €'), 2000, 'deutscher Tausenderpunkt');
assert.equal(wertAusLabel('1.234,50 €'), 1234.5, 'Komma als Dezimaltrenner');
assert.equal(wertAusLabel(null), 0, 'fehlender Wert zählt 0');
assert.equal(wertAusLabel('auf Anfrage'), 0, 'unlesbarer Wert zählt 0');

/* --- Es wird nichts erfunden --------------------------------------------- */
const mitLuecke = fixture().filter(s => ![4, 6].includes(s.stufe));
const reiseLuecke = baueReise(mitLuecke);
assert.equal(reiseLuecke.stationen.length, 13, 'fehlende Stufen werden nicht ergänzt');
assert.deepEqual(reiseLuecke.fehlt, [4, 6], 'Lücken werden gemeldet');
assert.ok(!reiseLuecke.stationen.some(s => s.stufe === 4), 'Stufe 4 wird nicht erfunden');
assert.equal(gesamtwert(mitLuecke), 4598, 'Gesamtwert rechnet nur mit echten Stufen');

/* --- Dubletten ----------------------------------------------------------- */
const doppelt = [...fixture(), { stufe: 5, titel: 'Klon', wert_label: '999 €', highlight: true }];
assert.equal(normalisiereStufen(doppelt).length, 15, 'Dublette fliegt raus');
assert.equal(normalisiereStufen(doppelt).find(s => s.stufe === 5).titel,
  'Weber-Grill oder Apple Watch', 'erster Treffer gewinnt');

/* --- Ungültige Zeilen ---------------------------------------------------- */
assert.deepEqual(normalisiereStufen(null), [], 'null ergibt leere Reise');
assert.deepEqual(normalisiereStufen([{ stufe: 'x' }, { stufe: 0 }, {}]), [], 'unbrauchbare Zeilen fallen weg');

/* --- Deckungsgleich mit sync_praemien_for_empfehler() --------------------- */
const rows = fixture();
assert.deepEqual(verdienteStufen(rows, 0),  [], '0 Kunden → keine Prämie');
assert.deepEqual(verdienteStufen(rows, 1),  [1], '1 Kunde → genau Stufe 1');
assert.deepEqual(verdienteStufen(rows, 4),  [1, 2, 3, 4], '4 Kunden → Stufen 1 bis 4');
assert.deepEqual(verdienteStufen(rows, 14), [1,2,3,4,5,6,7,8,9,10,11,12,13,14], '14 Kunden → 1 bis 14');
assert.deepEqual(verdienteStufen(rows, 15), [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], '15 Kunden → alle');
assert.deepEqual(verdienteStufen(rows, 99), verdienteStufen(rows, 15), 'mehr Kunden als Stufen ändert nichts');
// Gegenprobe zum alten Zustand: ohne die acht Zeilen entsteht bei 4 Kunden
// eben KEINE vierte Prämie — genau der Widerspruch, den die Migration löst.
assert.deepEqual(verdienteStufen(mitLuecke, 4), [1, 2, 3], 'fehlende Zeile → keine Prämie');

/* --- Wunschziele --------------------------------------------------------- */
assert.deepEqual(meilensteine(rows).map(s => s.stufe), [2, 5, 7, 10, 15], 'nur Meilensteine als Ziel');
assert.equal(istMeilenstein({ highlight: true }), true);
assert.equal(istMeilenstein({ highlight: false, titel: 'Mallorca-Urlaub' }), false,
  'der Titel entscheidet nicht mehr');

/* --- Markup --------------------------------------------------------------- */
const html = reiseHtml(reise);
assert.equal((html.match(/<li /g) || []).length, 15, '15 Listeneinträge');
assert.equal((html.match(/reise-meilenstein/g) || []).length, 5, '5 Bildkarten');
assert.equal((html.match(/reise-finale/g) || []).length, 1, 'genau ein Finale');
assert.ok(/stufe-15[^"]*reise-finale/.test(html), 'das Finale ist Stufe 15');
assert.ok(html.indexOf('data-stufe="1"') < html.indexOf('data-stufe="15"'), 'Reihenfolge im Markup');
assert.ok(!/reise-finale/.test(reiseHtml(baueReise([{ stufe: 1, titel: 'Bonus', wert_label: '100 €', highlight: false }]))),
  'ohne Meilenstein kein Finale');
assert.match(reiseHtml({ stationen: [] }), /reise-leer/, 'leere Reise fällt ruhig zurück');

// Texte aus der Datenbank landen im HTML — sie müssen escaped sein.
const boese = baueReise([
  { stufe: 1, titel: '<script>alert(1)</script>', wert_label: '100 €', highlight: false },
  { stufe: 2, titel: 'Foto "gross" & schön', beschreibung: '<img onerror=x>', bild_url: 'a.jpg" onload="x', highlight: true },
]);
const boeseHtml = reiseHtml(boese);
assert.ok(!boeseHtml.includes('<script>'), 'Titel wird escaped');
assert.ok(!boeseHtml.includes('<img onerror'), 'Beschreibung wird escaped');
assert.ok(!/src="a\.jpg" onload=/.test(boeseHtml), 'Bild-Adresse bricht das Attribut nicht auf');
assert.ok(boeseHtml.includes('&amp;'), 'kaufmännisches Und wird escaped');

/* --- Zusammenfassung für den Präsentations-Modus -------------------------- */
assert.match(geldSummary(reise), /^Dazu 10 Geldstufen à 100 € auf dem Weg dorthin/, 'Satz statt zehn Zeilen');
assert.match(geldSummary(reise), /13 und 14\.$/, 'letzte Stufe mit "und" verbunden');
assert.equal(geldSummary({ stationen: [] }), '', 'ohne Geldstufen kein Satz');

/* --- Kleinigkeiten -------------------------------------------------------- */
assert.equal(kundenZeile(1), '1 gewonnener Kunde', 'Einzahl');
assert.equal(kundenZeile(5), '5 gewonnene Kunden', 'Mehrzahl');

console.log('belohnungs-reise: OK');
