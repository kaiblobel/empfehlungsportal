import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gueltig, signiere } from '../lib/betrieb/kern.mjs';
const vektoren=JSON.parse(readFileSync(new URL('./fixtures/betrieb-hmac.json',import.meta.url),'utf8')).vektoren;
for(const [i,v] of vektoren.entries()) if(v.art==='signatur') test(`PHP-Referenz HMAC ${i}: ${v.zweck}`,()=>{
  assert.equal(signiere(v.schluessel_hex,v.zweck,v.daten),v.signatur);
  assert.equal(gueltig(v.schluessel_hex,v.zweck,v.daten,v.signatur),true);
});
