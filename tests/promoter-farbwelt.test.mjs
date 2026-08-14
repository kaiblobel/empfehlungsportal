import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('promoter-start.html');
const css = read('css/promoter-start.css');

assert.match(html, /theme-color" content="#FFFFFF"/, 'Der Browser-Rahmen der Promoterseite ist nicht weiß');
assert.match(html, /\/css\/promoter-start\.css\?v=\d+/, 'Die Promoter-Farbwelt ist nicht eingebunden');
assert.match(html, /<span>Persönlich weiterhelfen\.<\/span>/, 'Die farbliche Überschriftenführung fehlt');
assert.match(css, /--ps-paper:\s*#FFFFFF/, 'Die Promoterseite hat keine weiße Grundfläche');
assert.match(css, /--ps-blue-dark:\s*#2C5F7C/, 'Das CI-Dunkelblau fehlt');
assert.match(css, /--ps-teal:\s*#3E8B8B/, 'Das CI-Türkis fehlt');
assert.match(css, /--ps-yellow:\s*#F5D547/, 'Das CI-Gelb fehlt');
assert.match(css, /--ps-gold:\s*#C9A04A/, 'Das CI-Gold fehlt');
assert.match(css, /\.ps-steps li:nth-child\(2\)[\s\S]*background:\s*rgba\(245, 213, 71/, 'Die Themenfarben führen nicht durch die Schritte');
assert.match(css, /\.ps-submit[\s\S]*background:\s*var\(--ps-blue-dark\)/, 'Die Hauptaktion ist nicht dunkelblau');
assert.doesNotMatch(css, /#F7F4EE|#FFFDF9|#C9B98A|#7A8B6F/i, 'Alte Creme- oder Salbeitöne sind noch aktiv');

console.log('promoter-farbwelt: OK');
