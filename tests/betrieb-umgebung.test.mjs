import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laufzeitUmgebung } from '../lib/betrieb/umgebung.mjs';
test('Vorschauen koennen Produktionsvariablen nicht erben',()=>{
  const production={VERCEL_ENV:'production',BETRIEB_PORTAL_AKTIV:'1',BETRIEB_GEHEIMNIS_EMPFEHLUNG:'prod',BETRIEB_BLOB_TOKEN:'prod'};
  assert.equal(laufzeitUmgebung(production).aktiv,true);
  for(const v of ['preview','development',undefined]) assert.equal(laufzeitUmgebung({...production,VERCEL_ENV:v}).aktiv,false);
  const p=laufzeitUmgebung({...production,VERCEL_ENV:'preview',BETRIEB_VORSCHAU_AKTIV:'1',BETRIEB_VORSCHAU_HOST:'portal-probe.vercel.app',BETRIEB_VORSCHAU_GEHEIMNIS:'probe',BETRIEB_VORSCHAU_BLOB_TOKEN:'probe'});
  assert.equal(p.aktiv,true);assert.equal(p.key,'probe');assert.equal(p.blobToken,'probe');
  assert.equal(laufzeitUmgebung({...production,VERCEL_ENV:'preview',BETRIEB_VORSCHAU_AKTIV:'1',BETRIEB_VORSCHAU_HOST:'empfehlungsportal.vercel.app'}).aktiv,false);
});
