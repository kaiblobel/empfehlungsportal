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
test('Speicher-Schluessel: Vercel-Standardname je Umgebung, ausdruecklicher Name geht vor',()=>{
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'production',BLOB_READ_WRITE_TOKEN:'store-prod'}).blobToken,'store-prod');
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'production',BLOB_READ_WRITE_TOKEN:'store-prod',BETRIEB_BLOB_TOKEN:'explizit'}).blobToken,'explizit');
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'preview',BLOB_READ_WRITE_TOKEN:'store-vorschau'}).blobToken,'store-vorschau');
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'preview',BLOB_READ_WRITE_TOKEN:'store-vorschau',BETRIEB_BLOB_TOKEN:'prod'}).blobToken,'store-vorschau','Vorschau nimmt nie den Produktionsnamen');
});
test('Notfallvariable: Produktion nur BETRIEB_PORTAL_NOTFALL=1, Vorschau nur BETRIEB_VORSCHAU_NOTFALL=1',()=>{
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'production',BETRIEB_PORTAL_NOTFALL:'1'}).notfall,true);
  for(const w of ['true','0','',' 1',undefined]) assert.equal(laufzeitUmgebung({VERCEL_ENV:'production',BETRIEB_PORTAL_NOTFALL:w}).notfall,false,String(w));
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'preview',BETRIEB_PORTAL_NOTFALL:'1'}).notfall,false,'Vorschau erbt keine Produktionsnotfallvariable');
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'preview',BETRIEB_VORSCHAU_NOTFALL:'1'}).notfall,true);
  assert.equal(laufzeitUmgebung({VERCEL_ENV:'development',BETRIEB_PORTAL_NOTFALL:'1'}).notfall,false);
});
