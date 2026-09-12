// Der Türhüter vor der Veröffentlichung, gegen seine Regeln geprüft (12.09.2026).
//
// Warum dieser Wächter nötig ist: tuerhueter.mjs entscheidet, ob Vercel überhaupt baut.
// Verrutscht dort eine Regel, merkt es niemand, denn dann wird einfach wieder alles
// durchgelassen -- genau der Zustand, den er abschaffen soll. Ein falsch-grüner
// Türhüter ist schlimmer als keiner.
//
// Kais Auflage vom 12.09.2026, die hier Zeile für Zeile geprüft wird:
//   "Der Türhüter muss das erfolgreiche Prüfergebnis genau der Fassung zuordnen, die
//    veröffentlicht werden soll. Ein älterer grüner Lauf reicht nicht. Fehlende,
//    übersprungene oder abgebrochene Pflichtprüfungen dürfen nicht freigeben."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { neuesterLauf, urteil } from '../tuerhueter.mjs';

const SHA = 'a'.repeat(40);
const ANDERER_SHA = 'b'.repeat(40);

/** Ein Lauf, wie ihn die GitHub-API liefert, auf das Nötige gekürzt. */
function lauf(felder = {}) {
  return {
    name: 'Pruefungen',
    head_sha: SHA,
    status: 'completed',
    conclusion: 'success',
    started_at: '2026-09-12T10:00:00Z',
    html_url: 'https://example.invalid/lauf',
    app: { slug: 'github-actions' },
    ...felder,
  };
}

test('grüne Pflichtprüfung dieser Fassung gibt frei', () => {
  const e = urteil([lauf()], SHA);
  assert.equal(e.frei, true, e.grund);
});

test('rote Pflichtprüfung gibt nicht frei', () => {
  const e = urteil([lauf({ conclusion: 'failure' })], SHA);
  assert.equal(e.frei, false);
  assert.equal(e.wartet, false, 'bei rot wird nicht gewartet, sondern entschieden');
});

// Kais Auflage wörtlich: übersprungen oder abgebrochen darf nicht freigeben.
for (const ausgang of ['skipped', 'cancelled', 'neutral', 'timed_out', 'action_required', 'stale', null]) {
  test(`Ausgang "${ausgang}" gibt nicht frei`, () => {
    const e = urteil([lauf({ conclusion: ausgang })], SHA);
    assert.equal(e.frei, false, `"${ausgang}" hätte nicht freigeben dürfen`);
  });
}

test('fehlender Lauf gibt nicht frei, sondern wartet', () => {
  const e = urteil([], SHA);
  assert.equal(e.frei, false);
  assert.equal(e.wartet, true, 'ohne Ergebnis wird gewartet, nicht freigegeben');
});

test('noch laufende Prüfung gibt nicht frei', () => {
  const e = urteil([lauf({ status: 'in_progress', conclusion: null })], SHA);
  assert.equal(e.frei, false);
  assert.equal(e.wartet, true);
});

test('ohne Commit-Kennung wird nicht freigegeben', () => {
  const e = urteil([lauf()], undefined);
  assert.equal(e.frei, false);
  assert.equal(e.wartet, false, 'ohne Commit gibt es nichts, worauf man warten könnte');
});

test('ein grüner Lauf einer ANDEREN Fassung gibt nicht frei', () => {
  // Genau der Fall aus Kais Auflage: das Ergebnis muss zu der Fassung gehören, die
  // veröffentlicht werden soll.
  const e = urteil([lauf({ head_sha: ANDERER_SHA })], SHA);
  assert.equal(e.frei, false, 'fremdes Prüfergebnis darf nicht zählen');
});

test('ein Lauf aus fremder Quelle zählt nicht', () => {
  const e = urteil([lauf({ app: { slug: 'irgendein-dienst' } })], SHA);
  assert.equal(e.frei, false);
});

test('bei mehreren Läufen gilt der neueste, nicht der erste', () => {
  // "Ein älterer grüner Lauf reicht nicht." Der alte grüne steht bewusst VORN in der
  // Liste, so wie die API ihn liefern kann.
  const alt = lauf({ started_at: '2026-09-12T10:00:00Z', conclusion: 'success' });
  const neu = lauf({ started_at: '2026-09-12T11:00:00Z', conclusion: 'failure' });
  const e = urteil([alt, neu], SHA);
  assert.equal(e.frei, false, 'der jüngere rote Lauf muss gewinnen');
  assert.equal(neuesterLauf([alt, neu], 'Pruefungen', SHA).conclusion, 'failure');
});

test('umgekehrt gilt der neuere grüne Lauf nach einem älteren roten', () => {
  const alt = lauf({ started_at: '2026-09-12T10:00:00Z', conclusion: 'failure' });
  const neu = lauf({ started_at: '2026-09-12T11:00:00Z', conclusion: 'success' });
  assert.equal(urteil([alt, neu], SHA).frei, true);
});

test('mehrere Pflichtprüfungen: eine fehlende hält an', () => {
  const e = urteil([lauf()], SHA, ['Pruefungen', 'GibtEsNicht']);
  assert.equal(e.frei, false);
  assert.match(e.grund, /GibtEsNicht/);
});

test('mehrere Pflichtprüfungen: alle grün gibt frei', () => {
  const zweite = lauf({ name: 'Zweite' });
  assert.equal(urteil([lauf(), zweite], SHA, ['Pruefungen', 'Zweite']).frei, true);
});

// --- Die Verdrahtung, nicht nur die Logik -----------------------------------------

const lies = (d) => readFileSync(new URL(`../${d}`, import.meta.url), 'utf8');

test('vercel.json ruft den Türhüter auf', () => {
  const v = JSON.parse(lies('vercel.json'));
  assert.equal(v.ignoreCommand, 'node tuerhueter.mjs', 'ohne ignoreCommand hält niemand die Tür');
});

test('der Job-Name im Ablauf passt zur Pflichtliste des Türhüters', () => {
  // Die häufigste stille Falle: Jemand benennt den Job um, der Türhüter findet den Lauf
  // nicht mehr und hält ab dann JEDE Veröffentlichung an.
  const ablauf = lies('.github/workflows/waechter.yml');
  const t = lies('tuerhueter.mjs');
  const jobName = ablauf.match(/^\s*name:\s*(\S+)\s*$/m);
  const liste = t.match(/const PFLICHTPRUEFUNGEN = \[([^\]]*)\]/);
  assert.ok(liste, 'PFLICHTPRUEFUNGEN nicht gefunden');
  const namen = liste[1].match(/'([^']+)'/g).map((s) => s.replaceAll("'", ''));
  for (const n of namen) {
    assert.ok(
      ablauf.includes(`name: ${n}`),
      `Pflichtprüfung "${n}" kommt in waechter.yml nicht als Job-Name vor. `
        + `Gefundener Job-Name: ${jobName ? jobName[1] : 'keiner'}`,
    );
  }
});

test('der Türhüter liegt NICHT in .vercelignore', () => {
  // Sonst ist er beim Bau weg, und Vercel baut ohne ihn. Dieselbe Falle hat schon
  // tests/ erwischt: .vercelignore greift VOR dem ignoreCommand.
  const ignore = lies('.vercelignore');
  assert.doesNotMatch(ignore, /^tuerhueter\.mjs$/m);
  assert.doesNotMatch(ignore, /^\*\.mjs$/m);
});

console.log('tuerhueter: OK');
