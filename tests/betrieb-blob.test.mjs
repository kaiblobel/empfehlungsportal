import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { mitBlob } from '../lib/betrieb/speicher-blob.mjs';
import { leer, aendere, leseStand } from '../lib/betrieb/kern.mjs';
const token = 'vercel_blob_rw_rein_synthetischer_Test';
function speicher() {
  let raw = JSON.stringify(leer()), version = 1;
  return {
    get: async (_pfad, opts) => {
      assert.equal(opts.useCache, false); assert.equal(opts.access, 'private');
      assert.equal(opts.headers['accept-encoding'], 'identity');
      const copy = raw, etag = String(version);
      return { statusCode: 200, blob: { etag, size: Buffer.byteLength(copy) }, stream: new Response(copy).body };
    },
    put: async (_pfad, neu, opts) => {
      assert.equal(opts.access, 'private'); assert.equal(opts.addRandomSuffix, false);
      assert.equal(opts.allowOverwrite, true);
      if (opts.ifMatch !== String(version)) throw new BlobPreconditionFailedError();
      raw = neu; version++;
    },
  };
}
test('Blob: konkurrierende Befehle verlieren keine Aenderung und erlauben eine Nonce nur einmal', async () => {
  const sdk = speicher(), now = Math.floor(Date.now()/1000);
  const d = { typ:'notfall_setzen', nonce:'ab'.repeat(16), exp:now+60 };
  const r = await Promise.allSettled(Array.from({length:10}, () => mitBlob(token, s => aendere(s,d,now), sdk)));
  assert.equal(r.filter(x=>x.status==='fulfilled').length, 1);
  const final = await mitBlob(token, async s=>leseStand(await s.read()), sdk);
  assert.equal(final.notfall, true); assert.equal(Object.keys(final.nonces).length, 1);
});
test('Blob: nie automatisch initialisieren oder nach fehlender Lesung ueberschreiben', async () => {
  let schreibt = false;
  const sdk = { get: async()=>null, put: async()=>{schreibt=true;} };
  await assert.rejects(mitBlob(token,s=>s.read(),sdk));
  await assert.rejects(mitBlob(token,s=>s.cas('alt','neu'),sdk));
  assert.equal(schreibt,false);
});
test('Blob: kein Rueckfall auf fremde Umgebungsgeheimnisse, Schreibfehler nicht als Erfolg', async () => {
  await assert.rejects(mitBlob('',()=>{}));
  const sdk=speicher(); sdk.put=async()=>{throw new Error('Testanbieter defekt');};
  await assert.rejects(mitBlob(token,async s=>s.cas(await s.read(),'{}'),sdk),/ablage-schreiben/);
});
test('Blob: uebergrosser Inhalt wird auch bei falscher Groessenangabe begrenzt',async()=>{
  const sdk={get:async()=>({statusCode:200,blob:{etag:'1',size:1},stream:new Response('x'.repeat(300001)).body})};
  await assert.rejects(mitBlob(token,s=>s.read(),sdk),/ablage/);
});
test('Blob: beobachteter Anbieter-Konflikt 409 erzwingt neue Lesung statt Blindschreiben',async()=>{
  const sdk=speicher(), put=sdk.put; let erst=true, lesungen=0;
  const get=sdk.get; sdk.get=async(...a)=>{lesungen++;return get(...a);};
  sdk.put=async(...a)=>{if(erst){erst=false;throw new Error('Vercel Blob: The conditional request cannot succeed due to a conflicting operation against this resource.');}return put(...a);};
  const now=Math.floor(Date.now()/1000);
  await mitBlob(token,s=>aendere(s,{typ:'notfall_setzen',nonce:'ef'.repeat(16),exp:now+60},now),sdk);
  assert.equal(lesungen,2);
});
test('Blob: feste Zeitgrenze auch wenn der Anbieter das Abbruchsignal ignoriert', {timeout:5000}, async()=>{
  let signal;
  const sdk={get:async(_p,o)=>{signal=o.abortSignal;return new Promise(()=>{});}};
  await assert.rejects(mitBlob(token,s=>s.read(),sdk),/speicher-zeitlimit/);
  assert.equal(signal.aborted,true);
});
