import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const themePage = read('thema.html');
const themePreview = read('themen-vorschau.html');
const baufiPage = read('baufi.html');
const colors = read('css/dvag-kundenfarben.css');

for (const page of [themePage, themePreview, baufiPage]) {
  assert.match(page, /\/css\/dvag-kundenfarben\.css\?v=\d+/, 'Gemeinsame DVAG-Farbwelt ist nicht eingebunden');
}

assert.ok(themePreview.includes('data-page="thema"'), 'Die klickbare Vorschau aktiviert die gemeinsame Themen-Farbwelt nicht');

for (const [token, value] of Object.entries({
  '--dvag-blue-dark': '#2c5f7c',
  '--dvag-blue-mid': '#4a8ba8',
  '--dvag-blue-light': '#b8d4e3',
  '--dvag-teal': '#3e8b8b',
  '--dvag-green-dark': '#4a8b5c',
  '--dvag-green-light': '#a8c957',
  '--dvag-yellow': '#f5d547',
  '--dvag-gold': '#c9a04a',
  '--dvag-text': '#2a3b47',
  '--dvag-text-muted': '#6b7b85',
  '--dvag-soft': '#f7f8f9',
})) {
  assert.ok(colors.includes(`${token}: ${value}`), `${token} fehlt oder weicht von der Stilvorlage ab`);
}

for (const theme of ['investment', 'foerderungen', 'baufi', 'absicherung', 'selbstaendige', 'banking', 'energie', 'kinder', 'karriere']) {
  assert.ok(colors.includes(`body[data-theme="${theme}"]`), `${theme} hat keine gesteuerte DVAG-Farbwelt`);
}

assert.match(colors, /body\[data-page="baufi"\][\s\S]*--tw-blue:\s*var\(--dvag-blue-dark\)/, 'Baufi-Blau folgt nicht der DVAG-Farbwelt');
assert.match(colors, /body\[data-page="thema"\] \.topic-hero::before[\s\S]*clip-path:/, 'Geometrisches Stilmerkmal fehlt');
assert.match(colors, /body\[data-theme="investment"\][\s\S]*--theme-panel:\s*var\(--dvag-gold\)/, 'Investment hat keine kräftige goldene Leitfläche');
assert.match(colors, /body\[data-theme="foerderungen"\][\s\S]*--theme-panel:\s*var\(--dvag-yellow\)/, 'Förderungen haben keine kräftige gelbe Leitfläche');
assert.match(colors, /body\[data-theme="banking"\][\s\S]*--theme-panel:\s*var\(--dvag-blue-mid\)/, 'Banking ist nicht klar mittelblau geführt');
assert.match(colors, /body\[data-theme="kinder"\][\s\S]*--theme-panel:\s*var\(--dvag-blue-light\)/, 'Kinder haben keine eigene hellblaue Leitfläche');
assert.match(colors, /\.topic-hero-card[\s\S]*border-top:\s*6px solid var\(--theme-panel\)/, 'Die Leitfarbe wird auf den Themenseiten nicht sichtbar eingesetzt');
assert.match(colors, /body\[data-page="thema"\] \.topic-hero::before[\s\S]*background:\s*var\(--theme-panel\)/, 'Kräftige Themenfläche fehlt');
assert.match(colors, /\[data-theme="banking"\] \.topic-hero::before[\s\S]*background:\s*var\(--accent-soft\)/, 'Freigegebene Banking-Optik wird nicht geschützt');

console.log('dvag-kundenfarben: OK');
