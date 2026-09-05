/**
 * Das Zeichen vor dem Namen.
 *
 * Kais Wunsch (05.09.2026): "bei den Platzhaltern davor vor den Namen, wo jetzt
 * ein Buchstabe drinsteht, bei weiblichen Personen ein weibliches Symbol und
 * bei männlichen ein männliches. Das sieht vernünftiger aus."
 *
 * WARUM EIN FELD UND KEIN RATEN. Die naheliegende Lösung wäre gewesen, das
 * Geschlecht aus dem Vornamen abzuleiten. Ein Blick in die echten Daten hat das
 * verworfen:
 *   - neun von vierzehn Empfängern haben nur EIN Wort als Namen; ob Vor- oder
 *     Nachname, steht nirgends
 *   - bei den Promotern steht der Nachname teils vorn ("Schmidt Lucas"), ein
 *     Rater würde dort den Nachnamen auswerten
 *   - Namen wie Kim, Toni, Andrea, Sascha, Luca gehen in beide Richtungen, bei
 *     nicht-deutschen Namen trifft eine Liste fast gar nicht
 * Ein falsches Zeichen stünde dann in der Akte eines Menschen, den jemand
 * anruft. Deshalb kommt die Anrede aus einem Feld, das der Berater selbst setzt
 * (Migration anrede_fuer_promoter_und_empfaenger vom 05.09.2026).
 *
 * ZWEI ANGABEN, ZWEI MITTEL:
 *   Das ZEICHEN sagt, wen man vor sich hat  -> aus der Anrede
 *   Die FARBE sagt, welche Rolle er hat     -> aus der Rolle, die das System weiß
 * Wo keine Anrede gesetzt ist, steht die schlichte Person. Das ist kein Mangel,
 * sondern der ehrliche Zustand: wir wissen es nicht.
 *
 * DIE FORM (Kais Wahl am Bild, Variante C): Die Person bleibt die Hauptsache,
 * ein kleines Venus- oder Marszeichen unten rechts sagt das Übrige. Der erste
 * Entwurf hatte den Unterschied nur in feinen Haarlinien — bei 19 Pixeln waren
 * die drei Zeichen praktisch nicht zu unterscheiden.
 */

/** Was in der Datenbank stehen darf. Alles andere gilt als "keine Angabe". */
export const ANREDEN = ['frau', 'herr'];

/** Für Auswahlfelder: Reihenfolge und Beschriftung an einer Stelle. */
export const ANREDE_AUSWAHL = [
  { wert: '', text: 'Keine Angabe' },
  { wert: 'frau', text: 'Frau' },
  { wert: 'herr', text: 'Herr' },
];

const HUELLE = (inhalt, strich = '1.7') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strich}"`
  + ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inhalt}</svg>`;

/* Das Abzeichen sitzt unten rechts und braucht einen eigenen Grund, sonst
   laeuft es in die Silhouette. Der Grund ist --pz-grund: die Flaeche, auf der
   der Platzhalter liegt. Steht sie nicht, gilt Weiss. */
const ABZEICHEN = (inhalt) => `<g transform="translate(14.2 13.6) scale(0.46)">`
  + `<circle cx="10" cy="10" r="9.6" fill="var(--pz-grund, #fff)" stroke="none"/>${inhalt}</g>`;

/* Die Person rutscht bei den beiden Zeichen leicht nach links oben, damit
   unten rechts Platz bleibt. Ohne Angabe steht sie mittig. */
const PERSON_VERSETZT = '<circle cx="10.4" cy="8" r="3.4"/>'
  + '<path d="M4.4 19.6v-.5a6 6 0 0 1 9.6-4.8"/>';

const ZEICHEN = {
  frau: HUELLE(PERSON_VERSETZT
    + ABZEICHEN('<circle cx="10" cy="7.6" r="4.2"/><path d="M10 11.8v6"/><path d="M7.4 15.4h5.2"/>'), '1.9'),
  herr: HUELLE(PERSON_VERSETZT
    + ABZEICHEN('<circle cx="8.4" cy="11.6" r="4.2"/><path d="M11.6 8.4 17 3"/><path d="M12.4 3h5v5"/>'), '1.9'),
  neutral: HUELLE('<circle cx="12" cy="8.4" r="3.6"/><path d="M5 20v-.6a7 7 0 0 1 14 0v.6"/>'),
};

/**
 * Das Zeichen zu einer Anrede. Unbekanntes und Leeres ergibt das neutrale.
 * @param {string|null|undefined} anrede
 * @returns {string} SVG als Zeichenkette
 */
export function personZeichen(anrede) {
  const wert = String(anrede || '').trim().toLowerCase();
  return ZEICHEN[wert] || ZEICHEN.neutral;
}

/** Sagt, ob wirklich etwas eingetragen ist — für "keine Angabe"-Hinweise. */
export function hatAnrede(anrede) {
  return ANREDEN.includes(String(anrede || '').trim().toLowerCase());
}

/**
 * Wie das Zeichen für Menschen heißt, die es nicht sehen können.
 * Ohne Angabe bleibt es bei der Rolle, damit dort nichts behauptet wird.
 */
export function zeichenBeschriftung(anrede, rolle = 'Person') {
  const wert = String(anrede || '').trim().toLowerCase();
  if (wert === 'frau') return `${rolle}, weiblich`;
  if (wert === 'herr') return `${rolle}, männlich`;
  return rolle;
}

/**
 * Ein fertiger Platzhalter, wie er vor einem Namen steht.
 *
 * @param {object} o
 * @param {string} [o.anrede]  'frau' | 'herr' | leer
 * @param {string} [o.rolle]   'promoter' | 'empfaenger' — steuert nur die Farbe
 * @param {string} [o.klasse]  zusätzliche CSS-Klasse der Hülle
 * @param {string} [o.titel]   Rollenname für die Beschriftung
 */
export function personPlatzhalter({ anrede, rolle = '', klasse = '', titel = 'Person' } = {}) {
  const rollenKlasse = rolle === 'promoter' || rolle === 'empfaenger' ? ` pz-${rolle}` : '';
  const beschriftung = zeichenBeschriftung(anrede, titel);
  return `<span class="pz${rollenKlasse}${klasse ? ' ' + klasse : ''}" role="img" aria-label="${beschriftung}">`
    + `${personZeichen(anrede)}</span>`;
}

/** Baut ein Auswahlfeld für die Anrede. Der aktuelle Wert wird vorgewählt. */
export function anredeAuswahlHtml(id, wert = '') {
  const jetzt = String(wert || '').trim().toLowerCase();
  const zeilen = ANREDE_AUSWAHL
    .map((o) => `<option value="${o.wert}"${o.wert === jetzt ? ' selected' : ''}>${o.text}</option>`)
    .join('');
  return `<select id="${id}" class="pz-auswahl">${zeilen}</select>`;
}
