import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leer, signiere, gueltig, leseStand, tokenHash } from '../lib/betrieb/kern.mjs';
import { behandle, neueAnzeige, ANZEIGE_MS } from '../lib/betrieb/handler.mjs';
import { HOST, STEUERUNG, ZUGANG, portalPfad } from '../lib/betrieb/profil.mjs';

const KEY = 'ab'.repeat(32), NOW = 1789480000;
let counter = 0;
const nonce = () => (++counter).toString(16).padStart(32, '0');
const wirkung = z => ({ http: ['wartung','stoerung'].includes(z) ? 503 : z === 'intern' ? 403 : 200,
  sperrt: z !== 'online', noindex: ['intern','coming-soon'].includes(z), retry_after: z === 'wartung' ? 86400 : z === 'stoerung' ? 600 : 0 });
export const befehl = (typ = 'status', extra = {}) => ({ v:1, typ, host:HOST, anwendung:'empfehlung', iat:NOW, exp:NOW+60, nonce:nonce(), ...extra });
const schalten = (z, version = 1) => befehl('schalten', { version, betriebszustand:z, wirkung:wirkung(z), texte:{ ueberschrift:'Probe', beschreibung:'Hallo', zusatz:'' }, wieder_da:null });
function fixture() {
  let raw = JSON.stringify(leer()), reads = 0, ms = 1_000_000;
  const store = { read: async () => { reads++; return raw; }, cas: async (alt, neu) => { if (raw !== alt) return false; raw=neu; return true; } };
  const opts = { aktiv:true, key:KEY, jetzt:()=>NOW, uhrMs:()=>ms, anzeige:neueAnzeige(), speicher: f => f(store), next: o => new Response('ECHTE SEITE', { headers:o?.headers }) };
  const run = (path, init = {}, options = {}) => behandle(new Request(`https://${HOST}${path}`, init), { ...opts, ...options });
  const send = (d, options={}) => { const body = JSON.stringify(d); return run(STEUERUNG, { method:'POST', body, headers:{'content-type':'application/json','x-kai-signatur':signiere(KEY,'befehl',body)} }, options); };
  const access = (extra={}) => { const d = befehl('zugang',{advisor:'synthetisch',ziel:'/hub.html',exp:NOW+30,...extra}); const beleg=Buffer.from(JSON.stringify(d)).toString('base64url'); return { body:new URLSearchParams({beleg,signatur:signiere(KEY,'zugang',beleg)}).toString(), method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'} }; };
  return {run,send,access,store,opts, raw:()=>raw, reads:()=>reads, corrupt: v=>{raw=v;}, vor: x=>{ms+=x;}};
}
test('Unaktivierter Rollout beruehrt weder Kundenfunktion noch Laufzeitspeicher', async()=>{
  const f=fixture();
  for(const p of ['/hub.html','/dashboard/detail.html','/api/promoter-register','/empfehlung/probe']) assert.equal(await (await f.run(p,{}, {aktiv:false})).text(),'ECHTE SEITE');
  assert.equal((await f.run(STEUERUNG,{}, {aktiv:false})).status,404); assert.equal(f.reads(),0);
});
for(const z of ['online','wartung','stoerung','intern','coming-soon']) test(`KAI-Zustand ${z}: Wirkung und signiertes Ist`,async()=>{
  const f=fixture(), d=schalten(z), r=await f.send(d), body=await r.text();
  assert.equal(r.status,200); assert.ok(gueltig(KEY,'antwort',body,r.headers.get('x-kai-signatur')));
  const a=JSON.parse(body); assert.equal(a.anfrage,d.nonce); assert.equal(a.ist.betriebszustand,z);
  const page=await f.run('/hub.html'); assert.equal(page.status,wirkung(z).http); assert.equal(page.headers.get('x-kai-betrieb'),z);
  assert.match(page.headers.get('cache-control'),/no-store/);
  assert.equal((await f.run('/hub.html',{method:'HEAD'})).status,wirkung(z).http);
  if(z!=='online') assert.equal(await (await f.run('/hub.html',{method:'HEAD'})).text(),'');
});
test('Freie oeffentliche Seiten und Funktionen bleiben bei Wartung unangetastet',async()=>{
  const f=fixture(); await f.send(schalten('wartung'));
  const pfade=['/','/index.html','/dashboard/','/dashboard/index','/dashboard/welcome.html','/dashboard/settings.html','/empfehlen.html','/empfaenger.html','/programm.html','/promoter-start.html','/promoter.html','/berater-profil.html','/p/test/test','/e','/empfehlung/test','/baufinanzierung','/baufinanzierung/test','/baufi.html','/kidz/sommerfest','/kidz/konzept','/kidz/elternabend','/kidz/abmelden/test','/kidz-elternabend.html','/api/promoter-register','/api/kidz-register','/api/referral-event','/api/share','/api/bruecke','/assets/test.webp','/sw.js','/js/config.js','/robots.txt'];
  for(const p of pfade) assert.equal(await (await f.run(p)).text(),'ECHTE SEITE',p);
});
test('Direktpfade und Aliasdomains umgehen Partnersperre nicht',async()=>{
  const f=fixture(); await f.send(schalten('intern'));
  for(const p of ['/hub','/hub.html','/%68ub.html','/%2568ub.html','/%2fhub.html','/dashboard/detail','/dashboard/detail.html','/team.html']) assert.equal((await f.run(p)).status,403,p);
  for(const host of ['empfehlung.kaiblobel.de','kidz.teamwachsbleiche.de','finanzierung.kaiblobel.de']) assert.equal((await behandle(new Request(`https://${host}/hub.html`),f.opts)).status,403);
});
test('Fremde Hosts, Anwendungen, Schluessel, Zwecke und Zeitfenster werden vor Ablage abgewiesen',async()=>{
  const f=fixture();
  for(const extra of [{host:'kaiblobel.de'},{anwendung:'kundenseite'},{v:2},{exp:NOW},{exp:NOW+121},{iat:NOW+10},{nonce:'x'},{typ:'unbekannt'}]) assert.equal((await f.send(befehl('status',extra))).status,403);
  const d=befehl(), body=JSON.stringify(d);
  for(const s of ['',signiere('cd'.repeat(32),'befehl',body),signiere(KEY,'antwort',body)]) assert.equal((await f.run(STEUERUNG,{method:'POST',body,headers:{'content-type':'application/json','x-kai-signatur':s}})).status,403);
  assert.equal(f.reads(),0);
});
test('Nonce atomar genau einmal, auch bei gleichzeitiger Wiederholung',async()=>{
  const f=fixture(), d=befehl(); const antworten=await Promise.all(Array.from({length:8},()=>f.send(d)));
  assert.equal(antworten.filter(x=>x.status===200).length,1);
});
test('Version monoton, Wiederholungsversuch mit neuer Nonce idempotent, Konflikte gesperrt',async()=>{
  const f=fixture(), d=schalten('wartung',2); await f.send(d);
  assert.equal((await f.send(d)).status,403);
  assert.equal((await (await f.send({...d,nonce:nonce()})).json()).wiederholung,true);
  assert.equal((await f.send(schalten('online',1))).status,403);
  assert.equal((await f.send(schalten('online',2))).status,403);
});
test('Notfall hat Vorrang, Normalbetrieb hebt ihn nicht auf',async()=>{
  const f=fixture(); await f.send(schalten('online')); await f.send(befehl('notfall_setzen'));
  await f.send(schalten('online',2)); assert.equal((await f.run('/hub.html')).status,503);
  await f.send(befehl('notfall_aufheben')); assert.equal((await f.run('/hub.html')).status,200);
});
test('Einmalzugang, sichere Cookies, acht Stunden Ablauf und sofortiger Widerruf',async()=>{
  const f=fixture(); await f.send(schalten('intern'));
  const form=f.access(), r=await f.run(ZUGANG,form), cookie=r.headers.get('set-cookie');
  assert.equal(r.status,303); for(const s of ['HttpOnly','Secure','SameSite=Lax','Path=/','Max-Age=28800']) assert.ok(cookie.includes(s));
  assert.equal((await f.run(ZUGANG,form)).status,403);
  assert.equal((await f.run('/hub.html',{headers:{cookie}})).status,200);
  assert.equal((await f.run('/hub.html',{headers:{cookie}},{jetzt:()=>NOW+28801})).status,403);
  await f.send(befehl('zugang_beenden')); assert.equal((await f.run('/hub.html',{headers:{cookie}})).status,403);
});
test('Zugang lehnt Umleitungen, andere Anwendung und falsche Tokens ab',async()=>{
  const f=fixture(); await f.send(schalten('intern'));
  for(const ziel of ['//evil.example','/','/%2f%2fevil','/hub.html?x=1']) assert.equal((await f.run(ZUGANG,f.access({ziel}))).status,403);
  assert.equal((await f.run(ZUGANG,f.access({anwendung:'karriere'}))).status,403);
  for(const cookie of ['__Host-kai_betrieb=abc','__Host-kai_betrieb='+ 'a'.repeat(64),'portal_wartung_v1=0; berater_ist_admin_v1=1']) assert.equal((await f.run('/hub.html',{headers:{cookie}})).status,403);
});
// Entscheidung Kai 15.09.2026: Bei Speicherstoerung gilt der letzte bekannte Zustand, sonst offen.
test('Speicherstoerung ohne bekannten Zustand: Partnerbereich offen, Fehlerkopf fuer den Waechter, Kunden unberuehrt',async()=>{
  for(const raw of [null,'{','{}',JSON.stringify({...leer(),notfall:'false'}),JSON.stringify({...leer(),soll:{version:1}})]) {
    const f=fixture(); f.corrupt(raw); const r=await f.run('/hub.html');
    assert.equal(r.status,200,String(raw)); assert.equal(await r.text(),'ECHTE SEITE');
    assert.equal(r.headers.get('x-kai-betrieb-fehler'),'laufzeit'); assert.equal(r.headers.get('x-kai-betrieb'),null);
    const kunde=await f.run('/kidz/konzept'); assert.equal(kunde.status,200); assert.equal(kunde.headers.get('x-kai-betrieb-fehler'),null);
  }
  const r=await fixture().run('/hub.html',{}, {speicher:()=>{throw new Error('timeout');}});
  assert.equal(r.status,200); assert.equal(r.headers.get('x-kai-betrieb-fehler'),'laufzeit');
});
test('Speicherstoerung mit bekanntem Zustand: letzter Zustand gilt weiter, mit Fehlerkopf',async()=>{
  const f=fixture(); await f.send(schalten('wartung')); f.corrupt('{'); f.vor(ANZEIGE_MS);
  const r=await f.run('/hub.html'); assert.equal(r.status,503); assert.equal(r.headers.get('x-kai-betrieb'),'wartung'); assert.equal(r.headers.get('x-kai-betrieb-fehler'),'laufzeit');
  const g=fixture(); await g.send(schalten('online')); g.corrupt('{'); g.vor(ANZEIGE_MS);
  const o=await g.run('/hub.html'); assert.equal(o.status,200); assert.equal(o.headers.get('x-kai-betrieb'),'online'); assert.equal(o.headers.get('x-kai-betrieb-fehler'),'laufzeit');
  const h=fixture(); await h.send(schalten('online')); await h.send(befehl('notfall_setzen')); h.corrupt(null); h.vor(ANZEIGE_MS);
  assert.equal((await h.run('/hub.html')).status,503,'Notschalter bleibt auch bei Stoerung wirksam');
});
test('Anzeige: Zustand wird 5 Sekunden vorgehalten, die schaltende Instanz ist sofort aktuell',async()=>{
  const f=fixture(); await f.send(schalten('wartung')); const vorher=f.reads();
  for(let i=0;i<5;i++) assert.equal((await f.run('/hub.html')).status,503);
  assert.equal(f.reads(),vorher,'innerhalb der Vorhaltezeit kein Speicherabruf');
  f.vor(ANZEIGE_MS); assert.equal((await f.run('/hub.html')).status,503); assert.equal(f.reads(),vorher+1);
  await f.send(schalten('online',2)); assert.equal((await f.run('/hub.html')).status,200);
});
test('Andere Instanz: Umschalten wirkt spaetestens nach der Vorhaltezeit',async()=>{
  const f=fixture(); await f.send(schalten('online')); const zweite={anzeige:neueAnzeige()};
  assert.equal((await f.run('/hub.html',{},zweite)).status,200);
  await f.send(schalten('wartung',2));
  assert.equal((await f.run('/hub.html',{},zweite)).status,200,'noch vorgehalten');
  f.vor(ANZEIGE_MS-1); assert.equal((await f.run('/hub.html',{},zweite)).status,200);
  f.vor(1); assert.equal((await f.run('/hub.html',{},zweite)).status,503);
});
test('Frisch eingeloester Zugang wirkt auch in einer Instanz mit vorgehaltenem Zustand, erfundene Cookies fluten nicht',async()=>{
  const f=fixture(); await f.send(schalten('intern')); const zweite={anzeige:neueAnzeige()};
  assert.equal((await f.run('/hub.html',{},zweite)).status,403);
  const cookie=(await f.run(ZUGANG,f.access())).headers.get('set-cookie').split(';')[0];
  assert.equal((await f.run('/hub.html',{headers:{cookie}},zweite)).status,200);
  const vorher=f.reads();
  for(let i=0;i<20;i++) assert.equal((await f.run('/hub.html',{headers:{cookie:'__Host-kai_betrieb='+'c'.repeat(64)}},zweite)).status,403);
  assert.equal(f.reads()-vorher,0,'innerhalb einer Sekunde keine weitere erzwungene Lesung');
  f.vor(1000); await f.run('/hub.html',{headers:{cookie:'__Host-kai_betrieb='+'c'.repeat(64)}},zweite);
  assert.equal(f.reads()-vorher,1,'danach hoechstens eine je Sekunde');
});
test('Notfallweg 2 (Variable): sperrt Partnerbereich ohne Speicher und trotz gueltigem Zugang, Kunden frei, KAI sieht Notschalter',async()=>{
  const f=fixture(); await f.send(schalten('intern'));
  const cookie=(await f.run(ZUGANG,f.access())).headers.get('set-cookie').split(';')[0];
  assert.equal((await f.run('/hub.html',{headers:{cookie}})).status,200,'Zugang wirkt ohne Variable');
  const vorher=f.reads();
  const kaputt={notfall:true, speicher:()=>{throw new Error('Speicher ausgefallen');}};
  for(const p of ['/hub.html','/dashboard/detail.html','/%68ub.html','/team']) {
    const r=await f.run(p,{headers:{cookie}},kaputt);
    assert.equal(r.status,503,p); assert.equal(r.headers.get('x-kai-betrieb'),'wartung',p); assert.match(r.headers.get('cache-control'),/no-store/);
  }
  assert.equal(f.reads(),vorher,'Notfallweg 2 liest den Speicher nicht');
  for(const p of ['/kidz/konzept','/programm.html','/api/share','/dashboard/index.html']) assert.equal(await (await f.run(p,{},kaputt)).text(),'ECHTE SEITE',p);
  const ist=JSON.parse(await (await f.send(befehl(),{notfall:true})).text()).ist;
  assert.deepEqual([ist.notfall,ist.gesperrt,ist.betriebszustand],[true,true,'wartung']);
  await f.send(befehl('notfall_aufheben'),{notfall:true});
  assert.equal((await f.run('/hub.html',{headers:{cookie}},{notfall:true})).status,503,'KAI hebt die Variable nicht auf');
  assert.equal((await f.run('/hub.html',{headers:{cookie}})).status,200,'ohne Variable gilt wieder der gespeicherte Zustand');
});
test('Middleware-Filter: alle Seiten und die Steuerung laufen hindurch, statische Ordner und uebrige Funktionen nicht',()=>{
  const quelle=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8');
  const m=quelle.match(/matcher:\s*\[\s*'([^']+)'\s*\]/); assert.ok(m,'matcher fehlt');
  const re=new RegExp('^'+m[1]+'$');
  for(const p of ['/','/hub.html','/hub','/%68ub.html','/%2568ub.html','/dashboard/','/dashboard/detail.html','/team.html','/kidz/konzept','/empfehlung/abc','/programm.html','/api/betrieb/steuerung','/api/betrieb/zugang','/lib/betrieb/kern.mjs','/middleware.ts','/package.json','/sw.js']) assert.ok(re.test(p),p);
  for(const p of ['/assets/x.webp','/assets/video/film.mp4','/css/style.css','/js/config.js','/js/betrieb-pwa.js','/api/share','/api/promoter-register','/api/bruecke']) assert.ok(!re.test(p),p);
});
test('Inhalte werden escaped, Wirkungen koennen nicht frei erfunden werden',async()=>{
  const f=fixture(), d=schalten('wartung'); d.texte.ueberschrift='<script>alert(1)</script>'; await f.send(d);
  const html=await (await f.run('/hub.html')).text(); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.equal((await f.send({...schalten('intern',2),wirkung:wirkung('online')})).status,403);
});
test('Sperrprofil deckt alle Seiten mit bisherigem Wartungsskript ab',()=>{
  // Kritische direkt benannte Seiten, der ganze Dashboard-Arbeitsbereich kommt hinzu.
  for(const p of ['/hub.html','/team.html','/berater.html','/praemien.html','/vorlagen.html','/programm-verwalten.html','/changelog.html','/dashboard/kidz-gewinnspiel.html','/dashboard/kidz-elternabend.html']) assert.equal(portalPfad(p),true,p);
});
test('Schraegstrich hinter einer Partnerdatei umgeht die Sperre nicht (Befund Abnahme 15.09.2026)',async()=>{
  // Vercel liefert /hub.html/, /hub.html%2F und /hub.html/. als hub.html aus.
  for(const p of ['/hub.html/','/hub.html%2F','/hub.html%2f','/hub.html/.','/team.html/','/berater.html/','/dashboard/overview.html/']) assert.equal(portalPfad(p),true,p);
  for(const p of ['/dashboard/','/dashboard/index.html/','/kidz/konzept/','/programm.html/']) assert.equal(portalPfad(p),false,p);
  const f=fixture(); await f.send(schalten('wartung'));
  for(const p of ['/hub.html/','/hub.html%2F','/team.html/']) assert.equal((await f.run(p)).status,503,p);
  assert.equal(await (await f.run('/dashboard/index.html/')).text(),'ECHTE SEITE');
});
