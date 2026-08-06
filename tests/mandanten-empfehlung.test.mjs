import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../schema-phase161.sql', import.meta.url),
  'utf8',
);

assert.match(migration, /create or replace function public\.create_empfehlung_public\(/);
assert.match(migration, /join public\.berater b on b\.id = e\.berater_id and b\.ist_aktiv/);
assert.match(migration, /where e\.id = p_empfehler_id/);
assert.match(migration, /p_berater_id <> v_promoter_berater/);
assert.match(migration, /raise insufficient_privilege[\s\S]*Promoter und Berater passen nicht zusammen/);
assert.match(migration, /v_berater := v_promoter_berater/);
assert.match(migration, /revoke execute[\s\S]*from public/);
assert.match(migration, /grant execute[\s\S]*to anon, authenticated, service_role/);

console.log('mandanten-empfehlung: OK');
