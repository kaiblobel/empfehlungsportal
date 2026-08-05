import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('neue Selbstanmeldungen erscheinen live im Hub', () => {
  const hub = read('js/hub.js');
  assert.match(hub, /table: 'empfehler'/);
  assert.match(hub, /payload\.new\?\.self_registered_at/);
  assert.match(hub, /Neuer Promoter hat sich registriert/);
  assert.match(hub, /dashboard\/promoter\.html\?id=/);
});

test('Promoterliste aktualisiert sich bei neuen Einträgen', () => {
  const page = read('dashboard/empfehler.html');
  assert.match(page, /channel\('promoter-list-stream'\)/);
  assert.match(page, /await refresh\(\)/);
});

test('Datenbank benachrichtigt nur bei echter Selbstanmeldung', () => {
  const schema = read('schema-phase157.sql');
  assert.match(schema, /after insert on public\.empfehler/i);
  assert.match(schema, /when \(new\.self_registered_at is not null\)/i);
  assert.match(schema, /X-Internal-Token/);
  assert.match(schema, /functions\/v1\/notify-promoter/);
});

test('Edge Function prüft internen Token und adressiert den richtigen Berater', () => {
  const fn = read('supabase/functions/notify-promoter/index.ts');
  assert.match(fn, /providedToken !== secrets\.INTERNAL_FUNCTION_TOKEN/);
  assert.match(fn, /\.eq\("user_id", berater\.auth_user_id\)/);
  assert.match(fn, /Promoter im Portal öffnen/);
});
