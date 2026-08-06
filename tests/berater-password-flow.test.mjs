import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [adminUi, supabaseClient, edgeFunction, beraterHtml, config] = await Promise.all([
  read('js/berater-admin.js'),
  read('js/supabase.js'),
  read('supabase/functions/berater-create-login/index.ts'),
  read('berater.html'),
  read('js/config.js'),
]);

assert.match(adminUi, /value="" autocomplete="new-password" placeholder="Mindestens 8 Zeichen"/);
assert.match(adminUi, /Neues Passwort jetzt setzen/);
assert.match(adminUi, /Der allgemeine Knopf „Speichern“ für die Beraterdaten ändert dieses Passwort nicht/);
assert.match(adminUi, /createBeraterLogin\(id, pw\)/);
assert.doesNotMatch(adminUi, /adminSetBeraterPassword/);

assert.match(edgeFunction, /admin\.auth\.admin\.updateUserById/);
assert.match(edgeFunction, /return json\(\{ ok: true, created: false/);
assert.match(edgeFunction, /admin\.auth\.admin\.createUser/);

assert.doesNotMatch(supabaseClient, /export async function adminSetBeraterPassword/);
assert.match(beraterHtml, /js\/berater-admin\.js\?v=9/);
assert.match(config, /v1\.187 Beta/);

console.log('berater-password-flow: OK');
