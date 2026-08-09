import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, js, css, nav] = await Promise.all([
  read('programm.html'),
  read('js/programm.js'),
  read('css/programm.css'),
  read('js/nav.js'),
]);

assert.match(html, /id="presenterHubBack" href="hub\.html" hidden/);
assert.match(html, /Zurück zum Portal/);
assert.doesNotMatch(html, /Zurück zum H(?:ub|UB)/);
assert.match(html, /css\/programm\.css\?v=89/);
assert.match(html, /js\/programm\.js\?v=49/);

assert.match(js, /get\('from'\) === 'hub'/);
assert.match(js, /presenterHubBack\.hidden = false/);
assert.doesNotMatch(js, /presenterHubBack\.hidden = true/);

assert.match(nav, /href: path\('programm\.html\?from=hub'\)/);
assert.match(nav, /u\.searchParams\.set\('berater', b\.slug\)/);

assert.match(css, /\.presenter-hub-back\[hidden\] \{ display: none; \}/);
assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.presenter-hub-back span \{ display: none; \}/);

console.log('praesentation-hub-back: OK');
