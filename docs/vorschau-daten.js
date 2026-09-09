/**
 * Beispieldaten für die Vorschau. Erfunden, aber in der Menge realistisch:
 * rund vierzig Empfehlungen, damit sichtbar wird, wie sich die Liste beim
 * Scrollen anfühlt. Mit sechs Einträgen sieht jede Gestaltung gut aus.
 *
 * Enthalten sind die unbequemen Fälle: sehr lange Namen, Einträge ohne
 * Telefonnummer, ohne Promoter, ein Testeintrag, sehr alte Kontakte.
 */

const NAMEN = [
  'Kimberly', 'Anna-Christin Wiesenberger-Hohenstein', 'Tobias Berger', 'M. Kraus',
  'Familie Wende', 'Steffen Lauterbach', 'Nicole Hartmann', 'Dr. Peter Ohlsen',
  'Yvonne Schuster', 'Marco Reinhardt', 'Familie Özdemir', 'Sabine Kruse',
  'Hendrik Vollmer', 'Jaqueline B.', 'Thomas Wendland', 'Katrin Scheiter',
  'Robert Bauer', 'Claudia Bauer', 'Sven Lehmann', 'Testkontakt Musterfrau',
  'Marion Gerlach', 'Uwe Petzold', 'Franziska Neumann-Bergstedt', 'Kevin Adler',
  'Heike Sommer', 'Andreas Kirstein', 'Anka Kirstein', 'Michael Roth',
  'Silke Brandt', 'Denis Pohl', 'Familie Grünberg', 'Lars Wiedemann',
  'Petra Ziegler', 'Christoph Maus', 'Nadine Beck', 'Oliver Kranz',
  'Ines Wolter', 'Familie Sanchez-Ortega', 'Torsten Riedel', 'Bianca Hoffmann',
];

const THEMEN = ['Für deine Kinder', 'Absicherung der Arbeitskraft', 'Vermögensaufbau',
  'Baufinanzierung', 'Staatliche Förderungen', 'Allgemeine Beratung', 'Geldanlage'];

const PROMOTER_NAMEN = ['Sandro Wernicke', 'Josephine Bürger', 'Sven Augustin',
  'Max Kudlek', 'Claudius Tusche', null, null];

const ZEITEN = [
  { text: 'vor 2 Stunden', gruppe: 'heute' },
  { text: 'vor 5 Stunden', gruppe: 'heute' },
  { text: 'heute früh', gruppe: 'heute' },
  { text: 'gestern', gruppe: 'woche' },
  { text: 'vor 2 Tagen', gruppe: 'woche' },
  { text: 'vor 3 Tagen', gruppe: 'woche' },
  { text: 'vor 5 Tagen', gruppe: 'woche' },
  { text: 'vor 2 Wochen', gruppe: 'aelter' },
  { text: 'vor 3 Wochen', gruppe: 'aelter' },
  { text: 'im August', gruppe: 'aelter' },
];

/**
 * Fester Zufall, damit die Vorschau bei jedem Laden gleich aussieht.
 *
 * Der Faktor darf kein Vielfaches der Listenlaenge sein, sonst kommt immer
 * derselbe Eintrag heraus. Genau das ist im ersten Anlauf passiert: mit
 * Faktor 7 und sieben Themen stand auf jeder Zeile "Baufinanzierung".
 */
function streu(i, laenge, faktor, versatz) {
  return (i * faktor + versatz) % laenge;
}

export const EMPFEHLUNGEN = NAMEN.map((name, i) => {
  const zeit = ZEITEN[Math.min(ZEITEN.length - 1, Math.floor(i / 4))];
  const status = i === 0 ? 'anrufwunsch'
    : i === 1 ? 'interessiert'
    : i === 5 ? 'anrufwunsch'
    : i === 8 ? 'interessiert'
    : i % 11 === 3 ? 'kunde'
    : i % 7 === 5 ? 'kontaktiert'
    : 'offen';
  return {
    name,
    thema: THEMEN[streu(i, THEMEN.length, 3, 1)],
    status,
    zeit: zeit.text,
    gruppe: zeit.gruppe,
    promoter: PROMOTER_NAMEN[streu(i, PROMOTER_NAMEN.length, 5, 2)],
    geoeffnet: i % 3 !== 0,
    telefon: i % 9 === 4 ? null : '+49 1' + (60 + (i % 9)) + ' ' + (1000000 + i * 13579),
    test: name.startsWith('Testkontakt'),
    wartet: ['anrufwunsch', 'interessiert'].includes(status) && zeit.gruppe !== 'aelter',
    beste: i % 2 ? 'nachmittags' : 'abends',
  };
});

export const STATUS = {
  anrufwunsch: { text: 'Anrufwunsch', farbe: 'var(--burnt-orange)' },
  interessiert: { text: 'Interessiert', farbe: 'var(--terracotta)' },
  kontaktiert: { text: 'Kontaktiert', farbe: 'var(--ink-soft)' },
  offen: { text: 'Offen', farbe: 'var(--ink-soft)' },
  kunde: { text: 'Kunde', farbe: 'var(--marine)' },
};

export const GRUPPEN = [
  ['heute', 'Heute'],
  ['woche', 'Diese Woche'],
  ['aelter', 'Älter'],
];
