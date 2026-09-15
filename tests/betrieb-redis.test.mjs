import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from 'redis';
import { mitSpeicher, SCHLUESSEL } from '../lib/betrieb/speicher.mjs';
import { aendere, leer, leseStand, signiere } from '../lib/betrieb/kern.mjs';
import { behandle } from '../lib/betrieb/handler.mjs';
const URL='redis://127.0.0.1:16387';
const enabled=process.env.BETRIEB_REDIS_TEST==='1';
test('Echter Redis: Parallelzugriff, CAS, Nonce, Neustart des Clients und Defekt', {skip:!enabled}, async()=>{
  const c=createClient({url:URL});c.on('error',()=>{});await c.connect();
  try {
    await c.set(SCHLUESSEL,JSON.stringify(leer()));
    const now=Math.floor(Date.now()/1000), d={v:1,typ:'notfall_setzen',host:'empfehlungsportal.vercel.app',anwendung:'empfehlung',iat:now,exp:now+60,nonce:'12'.repeat(16)};
    const requests=await Promise.allSettled(Array.from({length:10},()=>mitSpeicher(URL,s=>aendere(s,d,now),{lokal:true})));
    assert.equal(requests.filter(x=>x.status==='fulfilled').length,1);
    const stand=await mitSpeicher(URL,async s=>leseStand(await s.read()),{lokal:true});assert.equal(stand.notfall,true);
    const speicher=f=>mitSpeicher(URL,f,{lokal:true});
    const page=await behandle(new Request('https://empfehlungsportal.vercel.app/hub.html'),{aktiv:true,key:'ab'.repeat(32),speicher,next:()=>new Response('online')});assert.equal(page.status,503);
    await c.set(SCHLUESSEL,'defekt');
    const kaputt=await behandle(new Request('https://empfehlungsportal.vercel.app/hub.html'),{aktiv:true,key:'ab'.repeat(32),speicher,next:()=>new Response('online')});assert.equal(kaputt.headers.get('x-kai-betrieb-fehler'),'laufzeit');
    await c.set(SCHLUESSEL,JSON.stringify(leer()));
  } finally { c.destroy(); }
});
