/**
 * Der Projektstand an einer Stelle.
 *
 * Vorher stand die aktuelle Versionsnummer, die Phase und die Cache-Version in
 * vierzehn Testdateien fest verdrahtet. Jede Veröffentlichung brach damit
 * vierzehn Tests, die inhaltlich nichts mit der Version zu tun haben.
 *
 * Ab jetzt gilt: die Zahlen kommen aus den Dateien, die sie tragen. Ob sie
 * zueinander passen, prüft genau ein Test (tests/versionsstand.test.mjs).
 * Alle anderen Tests fragen hier nach, wenn sie die Version überhaupt brauchen.
 */

import { readFile } from 'node:fs/promises';

const lies = (datei) => readFile(new URL(`../${datei}`, import.meta.url), 'utf8');

const [config, sw, changelog] = await Promise.all([
  lies('js/config.js'),
  lies('sw.js'),
  lies('CHANGELOG.md'),
]);

function pflicht(text, muster, wo) {
  const treffer = text.match(muster);
  if (!treffer) throw new Error(`Projektstand: ${wo} nicht gefunden (${muster})`);
  return treffer;
}

const version = pflicht(config, /window\.APP_VERSION = '([^']+)'/, 'APP_VERSION in js/config.js')[1];
const phase = pflicht(config, /window\.APP_PHASE = '([^']+)'/, 'APP_PHASE in js/config.js')[1];
const cacheVersion = pflicht(sw, /const CACHE_VERSION = '([^']+)'/, 'CACHE_VERSION in sw.js')[1];

const versionNummer = pflicht(version, /^v(\d+)\.(\d+)/, 'Versionsnummer in APP_VERSION');
const phaseNummer = Number(pflicht(phase, /^Phase (\d+)/, 'Phasennummer in APP_PHASE')[1]);
const phaseTitel = pflicht(phase, /^Phase \d+ · (.+)$/, 'Phasentitel in APP_PHASE')[1];
const cacheTeile = pflicht(
  cacheVersion,
  /^v(\d+)-(\d{4}-\d{2}-\d{2})-phase(\d+)$/,
  'Aufbau der CACHE_VERSION (erwartet vNNN-JJJJ-MM-TT-phaseNNN)',
);

export const projektstand = {
  /** z. B. "v1.227 Beta" */
  version,
  /** z. B. 1 */
  major: Number(versionNummer[1]),
  /** z. B. 227 */
  minor: Number(versionNummer[2]),
  /** z. B. "Phase 207 · Vorschau lädt zum Fest ein" */
  phase,
  /** z. B. 207 */
  phaseNummer,
  /** z. B. "Vorschau lädt zum Fest ein" */
  phaseTitel,
  /** z. B. "v186-2026-08-12-phase207" */
  cacheVersion,
  /** z. B. 186 */
  cacheNummer: Number(cacheTeile[1]),
  /** z. B. "2026-08-12" */
  cacheDatum: cacheTeile[2],
  /** z. B. 207 */
  cachePhase: Number(cacheTeile[3]),
};

export const quellen = { config, sw, changelog };
