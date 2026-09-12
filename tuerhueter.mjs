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
//
// WAS AM 12.09.2026 NACHGESCHÄRFT WURDE (Kais Auflage)
//
// "Der Türhüter muss das erfolgreiche Prüfergebnis genau der Fassung zuordnen, die
// veröffentlicht werden soll. Ein älterer grüner Lauf reicht nicht. Fehlende,
// übersprungene oder abgebrochene Pflichtprüfungen dürfen nicht freigeben."
//
// Vier Löcher waren offen und sind jetzt zu:
//   1. Es wurde der ERSTE Lauf mit passendem Namen genommen. Wird ein Lauf wiederholt,
//      liefert die API mehrere Einträge; der erste kann der alte grüne sein, während der
//      neue rot ist. Jetzt zählt je Name ausschließlich der NEUESTE Lauf.
//   2. Fehlte VERCEL_GIT_COMMIT_SHA, wurde gebaut. Ohne Commit ist aber gar kein
//      Prüfergebnis zuordenbar. Jetzt bleibt die Tür zu.
//   3. Es gab nur eine einzige Pflichtprüfung ohne Liste. Jetzt eine Liste, und ALLE
//      darin müssen grün sein.
//   4. Es wurde nicht geprüft, ob der Lauf wirklich zu diesem Commit und zu GitHub
//      Actions gehört. Jetzt wird head_sha verglichen und die Quelle geprüft.
//
// Alles außer "completed + success" hält die Tür zu, also auch skipped, cancelled,
// neutral, timed_out, action_required, stale und ein fehlender Lauf.

import { pathToFileURL } from 'node:url';

const REPO = 'kaiblobel/empfehlungsportal';

// Pflichtprüfungen: Jeder Name muss als Lauf zu DIESEM Commit vorliegen und grün sein.
// Die Namen sind die Job-Namen aus .github/workflows/. Bewusst ohne Umlaute, weil hier
// mit Zeichenketten verglichen wird. Wer einen Job-Namen ändert, muss ihn hier
// mitändern, sonst findet der Türhüter den Lauf nicht und hält alles an.
const PFLICHTPRUEFUNGEN = ['Pruefungen'];

const WARTE_MAX_MS = 150_000; // Der Lauf braucht rund 12 Sekunden; großzügig gerechnet.
const TAKT_MS = 5_000;

const sha = process.env.VERCEL_GIT_COMMIT_SHA;

function tuerZu(grund) {
  console.log(`KEINE VERÖFFENTLICHUNG: ${grund}`);
  console.log('Die bisherige Fassung bleibt stehen.');
  process.exit(0);
}

function tuerAuf(grund) {
  console.log(`Freigabe: ${grund}`);
  process.exit(1);
}

// Notausgang: TUERHUETER_AUS=1 in den Vercel-Projekteinstellungen. Wird unten im
// Ablauf ausgewertet. Kais Auflage: nur nach seiner ausdrücklichen Freigabe benutzen,
// danach wieder ausschalten und die Sperre nachprüfen.

async function holleLaeufe() {
  const antwort = await fetch(
    `https://api.github.com/repos/${REPO}/commits/${sha}/check-runs?per_page=100`,
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'tuerhueter' } },
  );
  if (!antwort.ok) throw new Error(`GitHub antwortet ${antwort.status}`);
  const daten = await antwort.json();
  return daten.check_runs || [];
}

/**
 * Der neueste Lauf zu einem Namen, und nur wenn er wirklich zu dieser Fassung gehört.
 *
 * Zwei Filter, die beide aus Kais Auflage folgen:
 *   head_sha === sha   schließt aus, dass ein Lauf einer anderen Fassung zählt. Die
 *                      Abfrage ist ohnehin nach Commit gestellt, aber verlassen wir uns
 *                      nicht darauf, sondern prüfen es.
 *   app.slug           nur GitHub Actions. Ein anderer Dienst könnte einen Lauf mit
 *                      demselben Namen anlegen; der zählt hier nicht.
 */
export function neuesterLauf(laeufe, name, commit = sha) {
  const passende = laeufe
    .filter((l) => l.name === name)
    .filter((l) => !l.head_sha || l.head_sha === commit)
    .filter((l) => !l.app?.slug || l.app.slug === 'github-actions');
  if (passende.length === 0) return null;
  // Nach Startzeit sortieren, der jüngste gewinnt. Ein wiederholter Lauf ersetzt damit
  // das Urteil des alten, auch wenn der alte grün war.
  passende.sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));
  return passende[0];
}

/**
 * Das Urteil über einen Satz Läufe, ohne Netz und ohne Warten. Genau diese Funktion
 * prüft tests/tuerhueter.test.mjs, damit die Regeln nicht still verrutschen.
 *
 * Rückgabe: { frei: boolean, wartet: boolean, grund: string }
 *   frei=true    -> bauen
 *   wartet=true  -> noch kein vollständiges Ergebnis, später nochmal fragen
 *   sonst        -> Tür zu
 */
export function urteil(laeufe, commit, pflicht = PFLICHTPRUEFUNGEN) {
  if (!commit) return { frei: false, wartet: false, grund: 'kein Commit, also kein zuordenbares Ergebnis' };

  const stand = pflicht.map((name) => ({ name, lauf: neuesterLauf(laeufe, name, commit) }));

  const rot = stand.find((e) => e.lauf?.status === 'completed' && e.lauf.conclusion !== 'success');
  if (rot) {
    return {
      frei: false,
      wartet: false,
      grund: `Pflichtprüfung "${rot.name}" ist nicht grün, sondern "${rot.lauf.conclusion}". ${rot.lauf.html_url || ''}`.trim(),
    };
  }

  const offen = stand.filter((e) => !e.lauf || e.lauf.status !== 'completed');
  if (offen.length > 0) {
    const text = offen
      .map((e) => (e.lauf ? `${e.name} (${e.lauf.status})` : `${e.name} (noch nicht angelegt)`))
      .join(', ');
    return { frei: false, wartet: true, grund: `Warte auf: ${text}` };
  }

  const namen = stand.map((e) => `${e.name}: ${e.lauf.conclusion}`).join(', ');
  return { frei: true, wartet: false, grund: `alle Pflichtprüfungen dieser Fassung sind grün (${namen}).` };
}

// Ab hier der Ablauf bei einem echten Aufruf durch Vercel. Beim Import aus einem Test
// passiert nichts davon: dort wird nur urteil() und neuesterLauf() geprüft.
const direktAufgerufen =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (direktAufgerufen) {
  if (process.env.TUERHUETER_AUS === '1') {
    console.log('ACHTUNG: Türhüter ist über TUERHUETER_AUS=1 abgeschaltet.');
    console.log('Diese Veröffentlichung ist UNGEPRÜFT. Variable danach wieder entfernen.');
    process.exit(1);
  }

  if (!sha) tuerZu('VERCEL_GIT_COMMIT_SHA fehlt, also ist kein Prüfergebnis dieser Fassung zuordenbar.');

  const beginn = Date.now();
  let letzterGrund = 'kein Ergebnis';

  while (Date.now() - beginn < WARTE_MAX_MS) {
    let laeufe;
    try {
      laeufe = await holleLaeufe();
    } catch (fehler) {
      console.log(`Abfrage bei GitHub fehlgeschlagen: ${fehler.message}. Neuer Versuch.`);
      await new Promise((r) => setTimeout(r, TAKT_MS));
      continue;
    }

    const ergebnis = urteil(laeufe, sha);
    letzterGrund = ergebnis.grund;

    if (ergebnis.frei) tuerAuf(ergebnis.grund);
    if (!ergebnis.wartet) tuerZu(ergebnis.grund);

    console.log(ergebnis.grund);
    await new Promise((r) => setTimeout(r, TAKT_MS));
  }

  // Zeit abgelaufen, ohne vollständiges Ergebnis. Bewusst der sichere Weg: nicht
  // veröffentlichen. Eine fehlende Prüfung ist kein Freibrief. Notausgang siehe oben.
  tuerZu(
    `nach ${WARTE_MAX_MS / 1000} Sekunden lag nicht für jede Pflichtprüfung ` +
      `(${PFLICHTPRUEFUNGEN.join(', ')}) ein Ergebnis zu ${sha.slice(0, 7)} vor. Zuletzt: ${letzterGrund}`,
  );
}
