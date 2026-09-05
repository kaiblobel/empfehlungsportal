// Waechter gegen die Zwoelfer-Grenze.
//
// Am 05.09.2026 ist eine Veroeffentlichung gescheitert, weil das Portal eine
// Serverless-Funktion zu viel hatte. Das Vercel-Konto laeuft auf dem
// Hobby-Tarif, und der erlaubt zwoelf je Veroeffentlichung. Das Portal hatte
// genau zwoelf; der Waffel-Vermittler waere die dreizehnte gewesen.
//
// Das Tueckische daran war nicht die Grenze, sondern wie sie sich meldet: Der
// Bau lief sauber durch ("Build Completed"), und erst beim Ausliefern stand
// "Error" — ohne eine einzige Zeile Begruendung im Protokoll. Vier
// Vorschau-Veroeffentlichungen waren aus demselben Grund seit zwoelf Tagen rot,
// und niemand hatte einen Anhaltspunkt.
//
// Dieser Waechter macht daraus einen roten Test vor dem Hochladen statt einer
// Ratestunde danach.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/** Was der Hobby-Tarif je Veroeffentlichung erlaubt. */
const GRENZE = 12;

test('das Portal bleibt unter der Funktionsgrenze des Tarifs', () => {
  // Jede .js-Datei direkt in api/ wird bei Vercel eine eigene Funktion.
  const funktionen = readdirSync('api').filter((d) => d.endsWith('.js'));
  assert.ok(
    funktionen.length <= GRENZE,
    `${funktionen.length} Serverless-Funktionen, erlaubt sind ${GRENZE}. `
    + 'Eine mehr, und die Veroeffentlichung scheitert beim Ausliefern, ohne Meldung. '
    + 'Zwei Wege: eine neue Bruecke in api/bruecke.js einhaengen statt eine eigene '
    + `Datei anzulegen, oder den Tarif wechseln. Vorhanden: ${funktionen.join(', ')}`,
  );
});

test('die alten Adressen der zusammengelegten Bruecken bleiben erreichbar', () => {
  // Das Portal ist eine PWA. In den Browsern der Berater liegen aeltere
  // Fassungen von js/potenziale-cockpit.mjs und js/nav.js im Zwischenspeicher
  // und rufen weiterhin die alten Adressen auf. Faellt eine Umleitung weg,
  // findet genau deren Potenzialbuch oder Waffelmenue nichts mehr.
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const umleitungen = new Map((vercel.rewrites || []).map((r) => [r.source, r.destination]));

  assert.equal(
    umleitungen.get('/api/cockpit-potenzial'), '/api/bruecke?dienst=potenzialbuch',
    'Das Potenzialbuch aelterer Browserfassungen findet seine Adresse nicht mehr',
  );
  assert.equal(
    umleitungen.get('/api/waffel-config'), '/api/bruecke?dienst=waffel',
    'Das Waffelmenue findet seine Adresse nicht mehr',
  );

  // Und die Auffangregel muss hinter den beiden stehen, sonst greift sie zuerst.
  const quellen = (vercel.rewrites || []).map((r) => r.source);
  const auffang = quellen.indexOf('/(.*)');
  if (auffang >= 0) {
    assert.ok(quellen.indexOf('/api/cockpit-potenzial') < auffang);
    assert.ok(quellen.indexOf('/api/waffel-config') < auffang);
  }
});

test('beide Bruecken antworten nur auf ihren eigenen Dienst', async () => {
  const { dienstAus } = (await import('../api/bruecke.js')).default._test;

  // Aus der Umleitung.
  assert.equal(dienstAus({ query: { dienst: 'waffel' }, headers: {} }), 'waffel');
  assert.equal(dienstAus({ url: '/api/bruecke?dienst=potenzialbuch', headers: {} }), 'potenzialbuch');

  // Rueckfall ueber den Pfad, falls eine Umleitung einmal nicht zieht.
  assert.equal(dienstAus({ url: '/api/waffel-config', headers: {} }), 'waffel');
  assert.equal(dienstAus({ url: '/api/cockpit-potenzial', headers: {} }), 'potenzialbuch');

  // Nichts Erkennbares heisst nichts Erratenes.
  assert.equal(dienstAus({ url: '/api/bruecke', headers: {} }), '');
});

test('ein Aufruf ohne erkennbaren Dienst wird abgewiesen, nicht erraten', async () => {
  const handler = (await import('../api/bruecke.js')).default;
  const res = {
    statusCode: 200, headers: {}, body: '',
    setHeader(n, v) { this.headers[n] = v; },
    end(v = '') { this.body = v; return v; },
  };
  await handler({ method: 'GET', url: '/api/bruecke', headers: {} }, res);
  assert.equal(res.statusCode, 404);
  assert.match(res.body, /unbekannte_bruecke/);
});
