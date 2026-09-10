// Waechter fuer Phase 344 (10.09.2026): Die Symbole auf der Empfehlungs-Detailseite
// sitzen in der Mitte ihrer Kaestchen.
//
// Was passiert war: .ed-summary-card span und .ed-contact span (Klasse + Element)
// setzen display:block und einen Abstand oben. Die Symbolkaestchen sind selbst
// ein span und bekamen deshalb diese Regeln ab, weil die einfache Kaestchen-Klasse
// schwaecher ist. Das zentrierende Raster wurde zum Block, das Symbol stand oben
// links. Phase 331 hatte dieselbe Falle bei Schriftgroesse und Farbe schon
// entschaerft, beim Zentrieren aber nicht.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Kommentare zuerst entfernen: sie enthalten Kommas und wuerden sonst beim
// Zerlegen der Selektorliste an einem Selektor kleben bleiben.
const css = readFileSync('css/empfehlung-detail.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Alle Regelkoerper, deren Selektor den gesuchten Ausdruck enthaelt. */
function koerperFuer(selektor) {
  const koerper = [];
  for (const treffer of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const auswahl = treffer[1].split(',').map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').trim());
    if (auswahl.includes(selektor)) koerper.push(treffer[2]);
  }
  return koerper;
}

for (const selektor of ['.ed-summary-card .ed-summary-icon', '.ed-contact .ed-contact-icon']) {
  test(`${selektor} zentriert das Symbol mit zwei Klassen`, () => {
    // Zwei Klassen, damit die Regel gegen ".ed-summary-card span" gewinnt.
    const koerper = koerperFuer(selektor).join(';');
    assert.match(koerper, /display:\s*inline-grid/, 'Ohne Raster wird das Kaestchen ein Block');
    assert.match(koerper, /place-items:\s*center/, 'Ohne Mittelstellung steht das Symbol oben links');
    assert.match(koerper, /margin-top:\s*0/, 'Der Abstand der Textzeile schiebt das Kaestchen sonst nach unten');
  });
}
