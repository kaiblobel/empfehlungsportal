import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const htmlUrl = new URL('../mockups/kidz-themenseite-v1.html', import.meta.url);
const cssUrl = new URL('../mockups/kidz-themenseite-v1.css', import.meta.url);
const jsUrl = new URL('../mockups/kidz-themenseite-v1.js', import.meta.url);
const planUrl = new URL('../docs/KIDZ-THEMENSEITE-PLAN-v1.md', import.meta.url);

const [html, css, javascript, plan] = await Promise.all([
  readFile(htmlUrl, 'utf8'),
  readFile(cssUrl, 'utf8'),
  readFile(jsUrl, 'utf8'),
  readFile(planUrl, 'utf8'),
]);

assert.match(html, /content="noindex,nofollow"/);
assert.match(html, /Was wünschen Sie sich für die Zukunft Ihres Kindes\?/);
assert.match(html, /Deutschen Vermögensberatung/);
assert.match(html, /Generali Deutschland/);
assert.match(html, /Es werden keine Daten gesendet oder gespeichert/);

for (const pathName of ['elternabend', 'termininfo', 'gespraech']) {
  assert.match(html, new RegExp(`data-open-path="${pathName}"`));
  assert.match(javascript, new RegExp(`${pathName}:\\s*\\{`));
}

assert.doesNotMatch(
  javascript,
  /\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|sendBeacon/,
  'Das lokale Muster darf keine Daten übertragen oder speichern.',
);
assert.match(css, /@media \(max-width: 720px\)/);
assert.match(css, /\.mobile-cta/);
assert.match(plan, /nicht veröffentlicht/i);

const assetReferences = new Set(
  [...`${html}\n${javascript}`.matchAll(/assets\/kidz-themenseite\/[^"'`)\s]+/g)].map(
    ([assetPath]) => assetPath,
  ),
);

assert.ok(assetReferences.size >= 8, 'Alle vorgesehenen Originalmotive müssen eingebunden sein.');

for (const assetPath of assetReferences) {
  await access(new URL(`../mockups/${assetPath}`, import.meta.url));
}

console.log('KIDZ-Themenseiten-Muster und Originalmotive geprüft.');
