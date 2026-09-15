import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { portalPfad } from '../lib/betrieb/profil.mjs';
const helper = readFileSync(new URL('../js/betrieb-pwa.js',import.meta.url),'utf8');
const worker = readFileSync(new URL('../sw.js',import.meta.url),'utf8');
test('Browser- und Serverprofil stimmen ueberein',()=>{
  const ctx={self:{},URL};vm.runInNewContext(helper,ctx);
  for(const p of ['/hub','/hub.html','/%68ub.html','/%2568ub.html','/%2fhub.html','/team.html','/dashboard/','/dashboard/index','/dashboard/settings.html','/dashboard/detail.html','/kidz/konzept','/api/share','/baufinanzierung','/index.html',
    '/hub.html/','/hub.html%2F','/hub.html%2f','/hub.html/.','/team.html/','/berater.html/','/dashboard/overview.html/','/dashboard/index.html/','/dashboard','/kidz/konzept/','/programm.html/']) assert.equal(ctx.self.betriebPartnerPfad(p),portalPfad(p),p);
});
test('PWA liefert Partnersperre aus dem Netz und niemals alten Offline-Hub',async()=>{
  let fetchHandler, networkResponse, fail=false, cacheReads=0, response;
  const ctx={URL,Request,Response,console,
    self:{addEventListener:(name,f)=>{if(name==='fetch') fetchHandler=f;}},
    caches:{match:()=>{cacheReads++;return Promise.resolve(new Response('ALT'));}},
    fetch:async()=>{if(fail)throw new Error('offline');return networkResponse;},
    importScripts:()=>vm.runInNewContext(helper,ctx),
  };
  vm.runInNewContext(worker,ctx);
  const event=()=>({request:{url:'https://empfehlungsportal.vercel.app/hub.html',method:'GET',mode:'navigate'},respondWith:p=>{response=p;}});
  networkResponse=new Response('WARTUNG',{status:503,headers:{'x-kai-betrieb':'wartung','cache-control':'no-store'}});
  fetchHandler(event()); assert.equal(await (await response).text(),'WARTUNG');
  fail=true;fetchHandler(event());assert.equal((await response).status,503);assert.equal(cacheReads,0);
});
