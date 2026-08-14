import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const colors = read('css/dvag-kundenfarben.css');
const topics = read('css/themen-vorschau.css');
const baufi = read('css/baufi-empfehlung-mockup.css');

const hex = (value) => {
  const clean = value.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(clean.slice(offset, offset + 2), 16));
};

const luminance = (value) => hex(value)
  .map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  })
  .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

const contrast = (foreground, background) => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

for (const [foreground, background, label] of [
  ['#5f707a', '#ffffff', 'gedaempfter Text auf Weiss'],
  ['#5f707a', '#f7f8f9', 'gedaempfter Text auf hellem Hintergrund'],
  ['#745a1b', '#ffffff', 'lesbares Gold auf Weiss'],
  ['#775d17', '#ffffff', 'Baufi Goldtext auf Weiss'],
  ['#1e4358', '#ffffff', 'Baufi Text auf weisser Schaltflaeche'],
  ['#1e4358', '#f7f8f9', 'Baufi Text im Hoverzustand'],
  ['#294f35', '#ffffff', 'Foerdertext auf weisser Schaltflaeche'],
  ['#294f35', '#f7f8f9', 'Foerdertext im Hoverzustand'],
]) {
  assert.ok(contrast(foreground, background) >= 4.5, `${label} unterschreitet 4,5 zu 1`);
}

assert.match(colors, /--dvag-text-muted:\s*#5f707a/, 'Der gemeinsame Nebentext ist nicht kontraststark genug');
assert.match(topics, /\.topic-hero-card li > span \{ color: var\(--accent\)/, 'Kartennummern verwenden noch blasses Gold');
assert.match(topics, /\.scope-card > span \{ color: var\(--accent\)/, 'Kartenlabels verwenden noch blasses Gold');

const genericButton = baufi.indexOf('body[data-page="baufi"] .primary-btn { background: var(--tw-blue-deep); }');
const teaserButton = baufi.indexOf('body[data-page="baufi"] .rest-teaser .primary-btn,');
assert.ok(genericButton >= 0 && teaserButton > genericButton, 'Die lesbare Teaser-Schaltflaeche wird von der allgemeinen Regel ueberschrieben');
assert.match(baufi, /\.rest-teaser \.primary-btn,[\s\S]*\.funding-teaser \.primary-btn \{[\s\S]*color:\s*var\(--tw-blue-deep\);[\s\S]*background:\s*#fff;/, 'Restschuld und Foerderung haben keinen hellen Schaltflaechenkontrast');
assert.match(baufi, /\.funding-teaser \.primary-btn \{ color: var\(--dvag-green-deep\); \}/, 'Der Foerderbutton besitzt keine lesbare Schriftfarbe');

console.log('themenseiten-kontrast: OK');
