import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [html, css, config, sw] = await Promise.all([
  read('programm.html'),
  read('css/programm.css'),
  read('js/config.js'),
  read('sw.js'),
]);

assert.match(html, /class="steps-row iphone-flow"/);
assert.equal((html.match(/class="iphone-device"/g) || []).length, 3);
assert.equal((html.match(/class="iphone-island"/g) || []).length, 3);
assert.equal((html.match(/class="iphone-home"/g) || []).length, 3);
assert.match(html, /Empfehlung anlegen/);
assert.match(html, /Per WhatsApp senden/);
assert.match(html, /DankeschÃ¶n auswÃ¤hlen/);
assert.match(html, /iphone-chat-bubble[\s\S]*data-bb="name"/);
assert.match(html, /GeldprÃ¤mie/);
assert.match(html, /SachprÃ¤mie/);
assert.match(html, /Spende/);
assert.doesNotMatch(html, /class="wa-mockup"/);
assert.match(html, /css\/programm\.css\?v=86/);

assert.match(css, /\.steps-row\.iphone-flow/);
assert.match(css, /\.iphone-device \{/);
assert.match(css, /aspect-ratio: 244 \/ 500/);
assert.match(css, /\.iphone-island \{/);
assert.match(css, /\.iphone-wa-screen/);
assert.match(css, /\.iphone-reward-option/);
assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.steps-row\.iphone-flow \{ grid-template-columns: 1fr/);

assert.match(config, /v1\.183 Beta/);
assert.match(config, /Phase 157 Â· Hinweis bei neuem Promoter/);
assert.match(sw, /CACHE_VERSION = 'v142-2026-08-05'/);

console.log('praesentation-iphone-flow: OK');

