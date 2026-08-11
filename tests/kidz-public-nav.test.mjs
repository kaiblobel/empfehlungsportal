import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [summerHtml, giveawayHtml, navCss, navJs] = await Promise.all([
  read('kidz-sommerfest.html'),
  read('kidz-gewinnspiel.html'),
  read('css/kidz-public-nav.css'),
  read('js/kidz-public-nav.js'),
]);

const header = (html) => html.match(/<header class="kidz-public-nav">[\s\S]*?<\/header>/)?.[0].replace(/\s+/g, ' ').trim();
assert.ok(header(summerHtml));
assert.equal(header(summerHtml), header(giveawayHtml));
assert.match(summerHtml, /kidz-public-nav\.css\?v=1/);
assert.match(giveawayHtml, /kidz-public-nav\.css\?v=1/);
assert.match(summerHtml, /kidz-public-nav\.js\?v=1/);
assert.match(giveawayHtml, /kidz-public-nav\.js\?v=1/);
assert.match(summerHtml, /<strong>Sommerfest<\/strong>/);
assert.match(summerHtml, /<strong>Gewinne<\/strong>/);
assert.match(summerHtml, /<strong>Anmeldung<\/strong>/);
assert.match(navCss, /\.kidz-public-menu-panel/);
assert.match(navCss, /@media \(max-width: 460px\)/);
assert.doesNotMatch(navCss, /prefers-color-scheme\s*:\s*dark/);
assert.match(navJs, /ALLOWED_KIDZ_SOURCES/);
assert.match(navJs, /SAFE_KIDZ_SLUG/);
assert.doesNotMatch(navJs, /localStorage|sessionStorage|document\.cookie/);

const links = [
  { dataset: { kidzDestination: '/kidz/sommerfest#sommerfest' }, href: '', attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } },
  { dataset: { kidzDestination: '/kidz/sommerfest#gewinnspiel' }, href: '', attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } },
  { dataset: { kidzDestination: '/kidz/gewinnspiel#anmeldung' }, href: '', attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } },
];
const menu = { open: false, contains: () => false, removeAttribute() {} };
globalThis.window = { location: { href: 'https://kidz.teamwachsbleiche.de/kidz/gewinnspiel?quelle=vor-ort-qr&berater=claudius-tusche#anmeldung' } };
globalThis.document = {
  querySelectorAll: (selector) => selector === '[data-kidz-destination]' ? links : [],
  getElementById: (id) => id === 'kidzPublicMenu' ? menu : null,
  addEventListener() {},
};
await import(new URL(`../js/kidz-public-nav.js?test=${Date.now()}`, import.meta.url));
assert.deepEqual(links.map((link) => link.href), [
  '/kidz/sommerfest?quelle=vor-ort-qr&berater=claudius-tusche#sommerfest',
  '/kidz/sommerfest?quelle=vor-ort-qr&berater=claudius-tusche#gewinnspiel',
  '/kidz/gewinnspiel?quelle=vor-ort-qr&berater=claudius-tusche#anmeldung',
]);
assert.equal(links[2].attrs['aria-current'], 'page');
delete globalThis.window;
delete globalThis.document;

console.log('kidz-public-nav: OK');
