// Das Zeichen des Portals: zwei Hände, die sich greifen.
//
// Der Anlass für diesen Test: Als Zeichen für den Homebildschirm war ein SVG
// eingetragen. **iOS kann für `apple-touch-icon` kein SVG.** Wer die Seite auf
// den Homebildschirm legte, bekam kein Zeichen, sondern einen Ausschnitt der
// Seite als Bild. Aufgefallen ist das erst, als jemand es ausprobieren wollte.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';

const wurzel = new URL('..', import.meta.url);
const lies = (datei) => readFile(new URL(datei, wurzel), 'utf8');
const gibtEs = async (datei) => {
  try { return (await stat(new URL(datei, wurzel))).size; } catch { return 0; }
};

/* --- 1) Die Dateien liegen da, und zwar als PNG ------------------------- */
const PFLICHT = [
  'favicon.ico',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/icon.svg',
];
for (const datei of PFLICHT) {
  assert.ok(await gibtEs(datei) > 400, `${datei} fehlt oder ist verdächtig klein`);
}

/* --- 2) Kein apple-touch-icon zeigt auf ein SVG ------------------------- */
// Geprüft wird, was ausgeliefert wird. `docs/`, `mockups/` und `tests/` stehen
// in .vercelignore, `tmp/` in .gitignore: Entwürfe und Sicherungen brauchen
// kein Zeichen für den Homebildschirm.
async function alleSeiten(ordner = '', gesammelt = []) {
  for (const e of await readdir(new URL(ordner, wurzel), { withFileTypes: true })) {
    if (['.git', '.worktrees', 'node_modules', 'assets', 'mockups', 'tests', 'docs', 'tmp']
      .includes(e.name)) continue;
    const pfad = `${ordner}${e.name}${e.isDirectory() ? '/' : ''}`;
    if (e.isDirectory()) await alleSeiten(pfad, gesammelt);
    else if (e.name.endsWith('.html')) gesammelt.push(pfad);
  }
  return gesammelt;
}
const seiten = await alleSeiten();
const mitSvgTouchIcon = [];
for (const seite of seiten) {
  const html = await lies(seite);
  const treffer = html.match(/<link[^>]*rel="apple-touch-icon"[^>]*>/g) || [];
  for (const t of treffer) {
    if (/\.svg/.test(t)) mitSvgTouchIcon.push(`${seite}: ${t.trim()}`);
  }
}
assert.deepEqual(mitSvgTouchIcon, [],
  'iOS kann für den Homebildschirm kein SVG. Diese Seiten liefern eins:\n  '
    + mitSvgTouchIcon.join('\n  '));

/* --- 3) Die Portalseiten tragen das Zeichen überhaupt ------------------- */
// Die KIDZ-Seiten haben bewusst ihr eigenes und sind ausgenommen.
const ohne = [];
for (const seite of seiten) {
  if (/^kidz-/.test(seite)) continue;
  const html = await lies(seite);
  if (!/rel="apple-touch-icon"/.test(html)) ohne.push(seite);
}
assert.deepEqual(ohne, [], `ohne Zeichen für den Homebildschirm:\n  ${ohne.join('\n  ')}`);

/* --- 4) Das Manifest nennt PNG, nicht nur SVG -------------------------- */
const manifest = JSON.parse(await lies('manifest.json'));
const pngs = manifest.icons.filter((i) => i.type === 'image/png');
assert.ok(pngs.length >= 2, 'das Manifest braucht PNG-Zeichen, nicht nur SVG');
assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'),
  'ohne maskable-Fassung schneidet Android in das Motiv hinein');

console.log(`icons: OK (${seiten.length} Seiten geprüft)`);
