// Die Kundenwege zwischen den Projekten, gegen die Wirklichkeit geprüft (12.09.2026).
//
// WARUM ES DIESE PRÜFUNG GIBT
//
// Am 11.09.2026 wurde im Portal die Themensperre eingebaut (Phase 345). Ab dem Moment
// führten fünf Themenkacheln auf kaiblobel.de nicht mehr auf eine Themenseite, sondern
// auf die persönliche Empfehlungsseite, die jedem Besucher eine Empfehlung zuschrieb,
// die es nicht gab. Die Änderung lag im Portal, kaputt ging es auf der Kundenseite.
//
// Keiner der 223 Wächter des Portals konnte das sehen: Sie prüfen alle nur ihr eigenes
// Projekt. Der Uptime-Wächter konnte es auch nicht, denn die Seite antwortete ja mit
// 200, und er folgt Weiterleitungen. Gemerkt wurde es einen Tag später, zufällig, weil
// Kai auf dem iPhone abgemeldet unterwegs war.
//
// Diese Prüfung geht die KANTE ab, nicht das Innere: Sie vergleicht, was ein Link auf
// der Kundenseite verspricht, mit dem, was das Portal daraus macht. Und zwar für jeden
// der sieben Berater, denn die Themenfreigabe gilt pro Berater.
//
// WAS SIE PRÜFT, UND WARUM GERADE DAS
//
//  1. Jeder Themenlink auf der Kundenseite muss auf ein FREIGEGEBENES Thema zeigen.
//     Zeigt er auf ein gesperrtes, wird der Kunde weitergeleitet und landet woanders,
//     als der Link verspricht. Genau das war der Fehler vom 11.09.
//  2. Die Erblogik: Ein Berater ohne eigene Vorlagen erbt die des Hauptberaters
//     (js/supabase.js, eineZeileProSchluessel, Rang 1). Stimmt das nicht mehr, sind
//     für sechs von sieben Beratern plötzlich alle Themen gesperrt.
//  3. Die beiden fertigen Ziele müssen erreichbar bleiben: Baufinanzierung und KIDZ.
//  4. Das Kontaktziel muss zum Berater gehören, nicht zu einem fremden.
//
// KEINE ECHTEN VORGÄNGE
//
// Es werden ausschließlich GET-Abrufe gemacht. Nichts wird abgeschickt, keine Nachricht,
// keine Anfrage, kein Datensatz. Kais Auflage.
//
// AUFRUF
//
//     node tests/kundenwege.mjs             prüft die Live-Adressen
//     node tests/kundenwege.mjs --hilfe     zeigt, was geprüft wird
//
// Diese Prüfung hängt an fremden Seiten und darf deshalb NICHT im blockierenden
// Veröffentlichungs-Ablauf stehen: Wäre kaiblobel.de kurz nicht erreichbar, könnte das
// Portal nichts mehr veröffentlichen. Sie läuft in .github/workflows/kundenwege.yml.

const KUNDENSEITE = process.env.KUNDENSEITE_URL || 'https://kaiblobel.de/';
const PORTAL = process.env.PORTAL_URL || 'https://empfehlungsportal.vercel.app';
const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';

// Der Hauptberater, von dem die anderen ihre Themenfreigabe erben (js/config.js,
// window.ENV_BERATER_ID). Steht hier bewusst als Erwartung: Ändert sich das, muss diese
// Prüfung mit angepasst werden, statt still etwas anderes zu messen.
const HAUPTBERATER_ID = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';

// Themen mit eigener, fertiger Seite. Sie laufen NICHT über thema.html und sind deshalb
// von der Sperre nicht betroffen (js/themen-vorschau.js, Sonderwege am Dateianfang).
const EIGENE_SEITE = { baufi: '/baufi.html', kinder: '/kidz-empfehlung.html' };

const befunde = [];
function ok(bereich, text) { befunde.push({ art: 'ok', bereich, text }); }
function fehler(bereich, text) { befunde.push({ art: 'fehler', bereich, text }); }
function hinweis(bereich, text) { befunde.push({ art: 'hinweis', bereich, text }); }

async function holen(url, zweck) {
  try {
    const a = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'kundenwege-pruefung' } });
    return { ok: a.ok, status: a.status, endziel: a.url, text: await a.text() };
  } catch (f) {
    fehler(zweck, `${url} nicht abrufbar: ${f.message}`);
    return null;
  }
}

// Die sieben Kennungen stehen hier fest, weil die Tabelle `berater` bewusst NICHT
// öffentlich lesbar ist (HTTP 401 mit dem öffentlichen Schlüssel, richtig so). Die
// Kennungen selbst sind öffentlich, sie stehen in den Adressen der Beraterseiten.
// GRENZE, ehrlich benannt: Ein NEU angelegter Berater fällt hier nicht auf. Wer einen
// hinzufügt, muss ihn in diese Liste eintragen.
const BERATER_SLUGS = [
  'claudius-tusche',
  'david-stamm',
  'josephine-buerger',
  'kai-blobel',
  'max-kudlek',
  'sandro-wernicke',
  'sven-augustin',
];

/**
 * Je Kennung die öffentlichen Angaben, über denselben Weg, den die Kundenseite nimmt:
 * die Funktion get_berater_public. Damit wird zugleich geprüft, dass jede Kennung
 * überhaupt noch etwas liefert.
 */
async function beraterHolen() {
  const liste = [];
  for (const slug of BERATER_SLUGS) {
    const a = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_berater_public`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_slug: slug }),
    });
    if (!a.ok) {
      fehler(`Berater ${slug}`, `get_berater_public antwortet ${a.status}`);
      continue;
    }
    const daten = await a.json();
    if (!daten || daten.length === 0) {
      fehler(`Berater ${slug}`, 'liefert keine Angaben, die Kennung gibt es so nicht mehr');
      continue;
    }
    liste.push({ slug, ...daten[0] });
  }
  return liste;
}

/** Die Themenfreigabe, wie das Portal sie sieht. */
async function vorlagenHolen() {
  const a = await fetch(`${SUPABASE_URL}/rest/v1/vorlagen?select=slug,in_arbeit,berater_id`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!a.ok) throw new Error(`Vorlagen: HTTP ${a.status}`);
  return a.json();
}

/**
 * Nachbau von eineZeileProSchluessel (js/supabase.js): eigene Zeile schlägt die des
 * Hauptberaters, diese schlägt alles andere. Wer nichts Eigenes hat, erbt.
 */
function freigabeFuer(vorlagen, beraterId) {
  const rang = (v) => (v.berater_id === beraterId ? 0 : v.berater_id === HAUPTBERATER_ID ? 1 : 2);
  const beste = new Map();
  for (const v of vorlagen) {
    const da = beste.get(v.slug);
    if (!da || rang(v) < rang(da)) beste.set(v.slug, v);
  }
  // banking und energie stehen nicht in der Datenbank, sondern fest im Code als gesperrt.
  for (const slug of ['banking', 'energie']) {
    if (!beste.has(slug)) beste.set(slug, { slug, in_arbeit: true });
  }
  return beste;
}

/** Die Themenlinks der Kundenseite, so wie sie im gelieferten HTML stehen. */
function themenlinksAusHtml(html) {
  const links = [];
  const muster = /<a[^>]*data-topic-page="([^"]+)"[^>]*href="([^"]+)"/g;
  let t;
  while ((t = muster.exec(html)) !== null) links.push({ thema: t[1], href: t[2].replaceAll('&amp;', '&') });
  // Die KIDZ-Kachel traegt kein data-topic-page, sie verlinkt direkt auf die eigene
  // Seite. Sie gehoert trotzdem zu den Kundenwegen und wird deshalb mitgenommen.
  const kidzMuster = /<a[^>]*class="finance-topic-preview-link"[^>]*href="(https:\/\/kidz\.[^"]+)"/g;
  let k;
  while ((k = kidzMuster.exec(html)) !== null) {
    links.push({ thema: 'kinder', href: k[1].replaceAll('&amp;', '&') });
  }
  // Kacheln ohne Link: dort steht der Hinweis statt eines Ziels. Erwartet, kein Fehler.
  const gesperrte = (html.match(/class="finance-topic-soon"/g) || []).length;
  return { links, gesperrte };
}

console.log('Kundenwege zwischen Kundenseite, Portal, Baufinanzierung und KIDZ');
console.log('='.repeat(72));

const seite = await holen(KUNDENSEITE, 'Kundenseite');
if (!seite) {
  console.log('Kundenseite nicht erreichbar, Prüfung abgebrochen.');
  process.exit(2);
}
ok('Kundenseite', `${KUNDENSEITE} antwortet ${seite.status}`);

const { links, gesperrte } = themenlinksAusHtml(seite.text);
console.log(`\nThemenkacheln: ${links.length} mit Ziel, ${gesperrte} mit Hinweis "Folgt in Kürze"\n`);

const [berater, vorlagen] = await Promise.all([beraterHolen(), vorlagenHolen()]);
ok('Stammdaten', `${berater.length} Berater, ${vorlagen.length} Themenzeilen`);

// --- 1. Jeder verlinkte Themenweg, für jeden Berater --------------------------------

for (const b of berater) {
  const freigabe = freigabeFuer(vorlagen, b.id);
  for (const l of links) {
    const eigene = EIGENE_SEITE[l.thema];
    if (eigene) {
      ok(`Weg ${b.slug}`, `${l.thema}: eigene Seite ${eigene}, von der Themensperre nicht betroffen`);
      continue;
    }
    const eintrag = freigabe.get(l.thema);
    // Dieselbe Regel wie js/themen-vorschau.js: kein Eintrag heißt gesperrt, außer bei
    // "allgemein". Ein gesperrtes Thema leitet den Kunden weg.
    const istGesperrt = eintrag ? eintrag.in_arbeit === true : l.thema !== 'allgemein';
    if (istGesperrt) {
      fehler(
        `Weg ${b.slug}`,
        `Die Kachel "${l.thema}" verlinkt auf ${l.href}, aber das Thema ist für diesen Berater ` +
          `gesperrt. Der Kunde wird weitergeleitet und landet woanders, als der Link verspricht. ` +
          `Genau dieser Fall war der Fehler vom 11.09.2026.`,
      );
    } else {
      ok(`Weg ${b.slug}`, `${l.thema}: freigegeben, der Link hält sein Versprechen`);
    }
  }
}

// --- 1a. Hat jeder Berater überhaupt ein eigenes Profil auf der Kundenseite? --------
//
// Am 12.09.2026 gefunden: Die Kundenseite hält ihre Beraterprofile in
// js/advisor-profile-data.js. Fehlt ein Slug dort, fällt die Seite still auf
// `defaultSlug` zurück -- ein Kunde auf "?berater=josephine-buerger" sah Kai Blobel,
// mit Kais Namen, Kais Titel und Kais Terminziel. Der Baufi-Link trug ihren Slug
// weiter, der Rest nicht. Niemand merkt das, denn die Seite lädt tadellos.

const profilDatei = await holen(new URL('/js/advisor-profile-data.js', KUNDENSEITE).href, 'Beraterprofile');
if (profilDatei && profilDatei.ok) {
  const vorhanden = new Set([...profilDatei.text.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
  const standard = (profilDatei.text.match(/defaultSlug:\s*'([a-z0-9-]+)'/) || [])[1] || '(unbekannt)';
  for (const b of berater) {
    if (vorhanden.has(b.slug)) {
      ok(`Profil ${b.slug}`, 'eigenes Profil auf der Kundenseite vorhanden');
    } else {
      fehler(
        `Profil ${b.slug}`,
        `Kein Profil in js/advisor-profile-data.js. Die Kundenseite fällt still auf ` +
          `"${standard}" zurück: Der Kunde sieht Name, Titel und Terminziel eines anderen ` +
          `Beraters, obwohl die Adresse "${b.slug}" lautet.`,
      );
    }
  }
} else {
  fehler('Beraterprofile', 'js/advisor-profile-data.js nicht abrufbar, Profile nicht prüfbar');
}

// --- 1b. Das Kontaktziel je Berater -------------------------------------------------

for (const b of berater) {
  const url = b.bookings_url || '';
  if (!url) {
    fehler(`Kontakt ${b.slug}`, 'kein Kontaktziel, ein Kunde hat keinen Weg zum Termin');
    continue;
  }
  const eigen = new RegExp(b.slug.split('-').pop(), 'i').test(url);
  if (eigen) {
    ok(`Kontakt ${b.slug}`, 'eigenes Terminziel');
  } else {
    // Kein Fehler, aber es muss sichtbar sein: Wer keinen eigenen Kalender hinterlegt
    // hat, schickt seine Kunden in den des Hauptberaters. Am 12.09.2026 betraf das vier
    // von sieben (bookings_url in der Datenbank NULL). Ob das so gewollt ist,
    // entscheidet Kai; still bleiben darf es nicht.
    hinweis(`Kontakt ${b.slug}`, `Terminziel zeigt nicht auf den eigenen Namen: ${url.slice(0, 70)}`);
  }
}

// --- 2. Die Erblogik ----------------------------------------------------------------

const ohneEigene = berater.filter((b) => !vorlagen.some((v) => v.berater_id === b.id));
if (ohneEigene.length > 0) {
  const erben = ohneEigene.every((b) => {
    const f = freigabeFuer(vorlagen, b.id);
    return f.get('baufi') && f.get('kinder');
  });
  if (erben) {
    ok('Erblogik', `${ohneEigene.length} Berater ohne eigene Vorlagen erben die des Hauptberaters`);
  } else {
    fehler('Erblogik', `Berater ohne eigene Vorlagen erben nicht: ${ohneEigene.map((b) => b.slug).join(', ')}`);
  }
}

// --- 3. Die beiden fertigen Ziele ---------------------------------------------------

for (const l of links) {
  const antwort = await holen(l.href, `Ziel ${l.thema}`);
  if (!antwort) continue;
  if (!antwort.ok) {
    fehler(`Ziel ${l.thema}`, `${l.href} antwortet ${antwort.status}`);
  } else {
    ok(`Ziel ${l.thema}`, `${l.href} antwortet ${antwort.status} (Endziel ${antwort.endziel})`);
  }
}

// Baufinanzierung je Berater: Kai auf der Wurzel, alle anderen auf /baufinanzierung/<slug>
// (Kundenseite, js/themen-preview-links.js).
for (const b of berater) {
  const pfad = b.slug === 'kai-blobel' ? '/' : `/baufinanzierung/${b.slug}`;
  const url = `https://finanzierung.kaiblobel.de${pfad}`;
  const a = await holen(url, `Baufi ${b.slug}`);
  if (!a) continue;
  if (!a.ok) fehler(`Baufi ${b.slug}`, `${url} antwortet ${a.status}`);
  else if (!/baufi|finanzierung/i.test(a.text.slice(0, 4000)))
    fehler(`Baufi ${b.slug}`, `${url} antwortet ${a.status}, sieht aber nicht nach der Baufi-Seite aus`);
  else ok(`Baufi ${b.slug}`, `${url} antwortet ${a.status}`);
}

const kidz = await holen('https://kidz.teamwachsbleiche.de/kidz/konzept', 'KIDZ');
if (kidz) {
  if (!kidz.ok) fehler('KIDZ', `antwortet ${kidz.status}`);
  else if (!/kidz/i.test(kidz.text.slice(0, 4000))) fehler('KIDZ', 'antwortet, sieht aber nicht nach der KIDZ-Seite aus');
  else ok('KIDZ', `antwortet ${kidz.status} (Endziel ${kidz.endziel})`);
}

// --- 4. Der neutrale Team-Einstieg --------------------------------------------------

const neutral = await holen(`${PORTAL}/ueberblick.html`, 'Neutraler Einstieg');
if (neutral) {
  if (!neutral.ok) fehler('Neutraler Einstieg', `ueberblick.html antwortet ${neutral.status}`);
  else if (/Jemand aus deinem Umfeld/.test(neutral.text) && !/id="ubBand"[^>]*hidden/.test(neutral.text))
    fehler('Neutraler Einstieg', 'Das Empfehlungsband ist nicht versteckt, obwohl kein Empfehler vorliegt');
  else ok('Neutraler Einstieg', 'ueberblick.html ohne behauptete Empfehlung');
}

// --- Ergebnis ------------------------------------------------------------------------

console.log('');
const fehlerhaft = befunde.filter((b) => b.art === 'fehler');
const gruppen = [...new Set(befunde.map((b) => b.bereich))];
for (const g of gruppen) {
  const eigene = befunde.filter((b) => b.bereich === g);
  const schlecht = eigene.filter((b) => b.art === 'fehler');
  const winke = eigene.filter((b) => b.art === 'hinweis');
  const marke = schlecht.length > 0 ? 'ROT ' : winke.length > 0 ? 'HINW' : 'OK  ';
  console.log(`${marke} ${g}: ${eigene.length} geprüft, ${schlecht.length} beanstandet, ${winke.length} Hinweise`);
  for (const s of schlecht) console.log(`       FEHLER: ${s.text}`);
  for (const w of winke) console.log(`       Hinweis: ${w.text}`);
}

console.log('');
const winke = befunde.filter((b) => b.art === 'hinweis');
console.log(`${befunde.length} Prüfungen, ${fehlerhaft.length} beanstandet, ${winke.length} Hinweise.`);
if (fehlerhaft.length > 0) {
  console.log('\nDie Kundenwege stimmen NICHT. Kein Kunde soll auf einer Seite landen,');
  console.log('die etwas anderes zeigt oder behauptet als der Link versprochen hat.');
  process.exit(1);
}
console.log('Alle geprüften Kundenwege halten ihr Versprechen.');
