// Türhüter vor der Veröffentlichung.
//
// WARUM ES DIESE DATEI GIBT
//
// Am 11.09.2026 ging die Themensperre live (Phase 345). Ab dem Moment führten die
// Themenkacheln auf kaiblobel.de nicht mehr auf eine Themenseite, sondern auf die
// persönliche Empfehlungsseite, die jedem Besucher eine Empfehlung zuschrieb, die es
// nicht gab. Gemerkt wurde es einen Tag später, zufällig, auf dem Handy.
//
// Seit dem 12.09.2026 laufen die rund hundert Wächter aus tests/ bei jedem Hochladen
// automatisch (.github/workflows/waechter.yml). Sie MELDEN aber nur: GitHub setzt ein
// rotes Kreuz an den Commit, und Vercel veröffentlicht trotzdem. Genau das ist am
// 12.09.2026 in einer Probe nachgemessen worden: Prüfung rot in 12 Sekunden, Stand
// gleichzeitig gebaut und ausgeliefert.
//
// Diese Datei macht aus der Meldung einen Riegel. Vercel ruft sie als "Ignored Build
// Step" auf (vercel.json, Feld ignoreCommand) und wertet den Rückgabewert aus:
//
//     0  =  Bau überspringen, die bisherige Fassung bleibt stehen
//     1  =  bauen
//
// (So steht es in der Vercel-Doku, und ja, es ist verdreht zur üblichen Bedeutung.)
//
// WARUM SIE NICHT SELBST DIE TESTS LAUFEN LÄSST
//
// Der erste Versuch war genau das: `node --test tests/*.test.mjs` als ignoreCommand.
// Das Protokoll sagte "tests 0, fail 0" und Vercel baute. Grund: `.vercelignore`
// entfernt `tests/` (bewusst, seit Phase 166, damit interne Dateien nicht öffentlich
// abrufbar sind), und zwar BEVOR der ignoreCommand läuft. Der Türhüter hatte nichts zu
// prüfen und meldete deshalb Erfolg. Ein Türhüter ohne Tests sagt immer "alles gut" --
// die gefährlichste Sorte Wächter.
//
// Deshalb prüft er nicht selbst, sondern fragt das Ergebnis dort ab, wo es entsteht:
// beim Wächter-Lauf auf GitHub. Das Repo ist öffentlich, die Abfrage braucht deshalb
// keinen Zugangsschlüssel.

const REPO = 'kaiblobel/empfehlungsportal';
// Muss zum Job-Namen in .github/workflows/waechter.yml passen. Bewusst ohne Umlaut:
// der Name wird hier mit einer Zeichenkette verglichen.
const PRUEFUNG = 'Pruefungen';
const WARTE_MAX_MS = 150_000; // Der Lauf braucht rund 12 Sekunden; großzügig gerechnet.
const TAKT_MS = 5_000;

const sha = process.env.VERCEL_GIT_COMMIT_SHA;

// Notausgang. Wenn die GitHub-Abfrage streikt und trotzdem veröffentlicht werden muss:
// in den Vercel-Projekteinstellungen TUERHUETER_AUS=1 setzen, veröffentlichen, danach
// wieder entfernen. Ohne diesen Weg wäre eine Störung bei GitHub gleichbedeutend mit
// "kann nichts mehr live bringen".
if (process.env.TUERHUETER_AUS === '1') {
  console.log('Türhüter ist über TUERHUETER_AUS=1 abgeschaltet. Es wird gebaut.');
  process.exit(1);
}

if (!sha) {
  // Kein Commit-Bezug, also auch kein Prüfergebnis zuordenbar (etwa bei einem Bau ohne
  // Git-Anbindung). Hier wird gebaut, sonst käme man aus dieser Lage nicht heraus.
  console.log('Kein VERCEL_GIT_COMMIT_SHA vorhanden. Es wird gebaut.');
  process.exit(1);
}

async function hollePruefung() {
  const antwort = await fetch(`https://api.github.com/repos/${REPO}/commits/${sha}/check-runs`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'tuerhueter' },
  });
  if (!antwort.ok) throw new Error(`GitHub antwortet ${antwort.status}`);
  const daten = await antwort.json();
  return (daten.check_runs || []).find((lauf) => lauf.name === PRUEFUNG) || null;
}

const beginn = Date.now();

while (Date.now() - beginn < WARTE_MAX_MS) {
  let lauf;
  try {
    lauf = await hollePruefung();
  } catch (fehler) {
    console.log(`Abfrage bei GitHub fehlgeschlagen: ${fehler.message}. Neuer Versuch.`);
    await new Promise((r) => setTimeout(r, TAKT_MS));
    continue;
  }

  if (!lauf) {
    console.log(`Wächter-Lauf "${PRUEFUNG}" für ${sha.slice(0, 7)} noch nicht angelegt. Warte.`);
    await new Promise((r) => setTimeout(r, TAKT_MS));
    continue;
  }

  if (lauf.status !== 'completed') {
    console.log(`Wächter läuft noch (${lauf.status}). Warte.`);
    await new Promise((r) => setTimeout(r, TAKT_MS));
    continue;
  }

  if (lauf.conclusion === 'success') {
    console.log(`Wächter grün. Es wird gebaut. (${lauf.html_url})`);
    process.exit(1);
  }

  console.log(`Wächter nicht grün: ${lauf.conclusion}. Es wird NICHT gebaut,`);
  console.log(`die bisherige Fassung bleibt stehen. (${lauf.html_url})`);
  process.exit(0);
}

// Zeit abgelaufen, ohne Ergebnis. Bewusst der sichere Weg: nicht veröffentlichen.
// Wer hier landet, hat oben den Notausgang.
console.log(`Nach ${WARTE_MAX_MS / 1000} Sekunden kein Ergebnis des Wächters. Es wird NICHT gebaut.`);
process.exit(0);
