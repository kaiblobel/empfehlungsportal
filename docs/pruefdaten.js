/**
 * Attrappen fuer die Prueflaeufe der drei Listenseiten.
 *
 * Die Pruefkopien in docs/pruef-*.html sind die ECHTEN Seiten, nur mit
 * einer Import-Karte, die dashboard.js und supabase.js hierher umlenkt.
 * So laeuft der echte Rendercode gegen erfundene Daten. Eine ausgelieferte
 * Datei ist kein Funktionsnachweis; eine laufende Seite schon.
 *
 * Die Daten decken absichtlich die unbequemen Faelle ab: sehr lange Namen,
 * fehlende Telefonnummer, fehlender Promotername, Testeintrag, fremder
 * Bestand, sehr alte Kontakte.
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

const THEMEN = ['kinder', 'absicherung', 'investment', 'baufi', 'foerderungen', 'allgemein', 'investment'];
const PROMOTER = ['Sandro Wernicke', 'Josephine Bürger', 'Sven Augustin', 'Max Kudlek', 'Claudius Tusche', null, null];

/* Fester Zufall, damit jeder Lauf gleich aussieht. Der Faktor darf kein
   Vielfaches der Listenlaenge sein, sonst kommt immer derselbe Eintrag
   heraus: mit Faktor 7 und sieben Themen stand einmal auf jeder Zeile
   "Baufinanzierung". */
const streu = (i, laenge, faktor, versatz) => (i * faktor + versatz) % laenge;

const vorTagen = (t) => new Date(Date.now() - t * 864e5).toISOString();

export const EMPFEHLUNGEN = NAMEN.map((name, i) => {
  const status = i === 0 ? 'anrufwunsch'
    : i === 5 ? 'anrufwunsch'
    : i % 11 === 3 ? 'kunde'
    : i % 7 === 5 ? 'kontaktiert'
    : i % 13 === 9 ? 'kein_interesse'
    : 'offen';
  return {
    id: 'p' + i,
    empfaenger_name: name,
    empfaenger_anrede: i % 2 ? 'frau' : 'herr',
    empfaenger_telefon: i % 9 === 4 ? null : '+49 160 ' + (1000000 + i * 13579),
    empfaenger_email: null,
    empfehler_name: PROMOTER[streu(i, PROMOTER.length, 5, 2)],
    vorlage_slug: THEMEN[streu(i, THEMEN.length, 3, 1)],
    typ: 'empfehlung',
    quelle: i % 17 === 6 ? 'restschuldcheck' : null,
    status,
    interessiert: i === 1 || i === 8,
    ist_test: name.startsWith('Testkontakt'),
    fremd: i === 12,
    berater_name: i === 12 ? 'Max Kudlek' : null,
    link_geoeffnet: i % 3 !== 0,
    created_at: vorTagen(Math.floor(i / 4)),
  };
});

/* ------------------------------------------------- Attrappe dashboard.js */
export const requireAuth = async () => ({ user: { id: 'pruef' } });
export const logout = () => {};
export const loadEmpfehlungen = async () => EMPFEHLUNGEN;
export const updateStatus = async () => {};
export const setInteressiert = async () => {};
export const updateEmpfehlung = async () => {};
export const applyBeraterHeader = () => {
  const name = document.getElementById('hdrName');
  if (name) name.textContent = 'Prüflauf';
};
export const whatsappLink = (tel) => 'https://wa.me/' + String(tel).replace(/[^\d]/g, '');
export function formatDate(iso) {
  const d = new Date(iso || 0);
  if (Number.isNaN(d.getTime())) return '';
  const tage = Math.floor((Date.now() - d.getTime()) / 864e5);
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'gestern';
  if (tage < 7) return `vor ${tage} Tagen`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/* -------------------------------------------------- Attrappe supabase.js */
export const deleteEmpfehlung = async () => {};
export const getVorlagen = async () => [];
export const markiereGesehen = async () => {};
export const getFunnelQuellen = async () => ({
  restschuldcheck: { anzeige: 'Restschuld-Check', ton: '#5E939E' },
});
export const getTeamBestand = async () => [{ id: 'a' }, { id: 'b' }];

/* ------------------------------------------ Attrappen fuer die Promoter */
export const PROMOTER_ZEILEN = [
  { id: 'e1', name: 'Sandro Wernicke', empfehlungen: 14, kunden: 4, letzte_aktivitaet: vorTagen(0), created_at: '2026-03-14', ist_test: false },
  { id: 'e2', name: 'Josephine Bürger', empfehlungen: 9, kunden: 3, letzte_aktivitaet: vorTagen(2), created_at: '2026-04-02', ist_test: false },
  { id: 'e3', name: 'Testpromoter Mustermann', empfehlungen: 6, kunden: 3, letzte_aktivitaet: vorTagen(0), created_at: '2026-09-01', ist_test: true },
  { id: 'e4', name: 'Sven Augustin', empfehlungen: 7, kunden: 1, letzte_aktivitaet: vorTagen(8), created_at: '2026-02-20', ist_test: false },
  { id: 'e5', name: 'Anna-Christin Wiesenberger-Hohenstein', empfehlungen: 2, kunden: 0, letzte_aktivitaet: vorTagen(23), created_at: '2026-05-11', ist_test: false },
  { id: 'e6', name: 'Max Kudlek', empfehlungen: 0, kunden: 0, letzte_aktivitaet: null, created_at: '2026-08-28', ist_test: false },
];

/* -------------------------------- Attrappen fuer die Promoter-Seite */
export const loadEmpfehlerList = async () => PROMOTER_ZEILEN.map((p) => ({
  id: p.id,
  code: p.id.toUpperCase(),
  name: p.name,
  telefon: p.id === 'e6' ? '' : '+49 160 1234567',
  email: '',
  gesamt: p.empfehlungen,
  kunde: p.kunden,
  ziel_stufe: p.id === 'e1' ? 5 : 0,
  letzte_aktivitaet: p.letzte_aktivitaet,
  created_at: p.created_at,
  ist_test: p.ist_test,
  berater_name: null,
}));
export const getCurrentBerater = async () => ({ name: 'Prüflauf', slug: 'pruef' });
export const supabase = null;
export const deleteEmpfehler = async () => {};
export const createEmpfehler = async () => ({});
export const updateEmpfehler = async () => {};
export const getEmpfehlerIdByCode = async () => null;
