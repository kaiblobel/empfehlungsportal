const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/potenzial-coach.js');

function responseRecorder() {
  return { statusCode:200, headers:{}, body:'', setHeader(name,value){ this.headers[name]=value; }, end(value=''){ this.body=value; return value; } };
}

function request(body, headers = {}) {
  return { method:'POST', headers:{ host:'portal.example', origin:'https://portal.example', authorization:'Bearer test-token', ...headers }, body };
}

test('Kontakt-Coach lehnt fremden Ursprung und fehlenden Login vor KI-Aufruf ab', async () => {
  const fremd = responseRecorder();
  await handler(request({ action:'kontaktbild', text:'Martin ist ein Bekannter.' }, { origin:'https://fremd.example' }), fremd);
  assert.equal(fremd.statusCode, 403);

  const ohne = responseRecorder();
  await handler({ method:'POST', headers:{ host:'portal.example' }, body:{ action:'kontaktbild' } }, ohne);
  assert.equal(ohne.statusCode, 401);
});

test('Kontakt-Coach validiert den Portal-Nutzer vor OpenAI und nutzt striktes JSON ohne Speicherung', async (t) => {
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; });
  const calls = [];
  const answer = { name:'Martin',telefon:'',email:'',ziel:'kunde',kreise:[],eigenerKreis:'',beziehungsnaehe:'bekannt',kontakthaeufigkeit:'selten',direktErreichbar:true,kontaktziel:'Kontakt auffrischen',gemeinsameGeschichte:'Fußball',lebenssituation:[],interessen:['Fußball'],sichereFakten:['Kennt den Berater vom Fußball'],vermutungen:[],unsicherheit:'',notizVorschlag:'Vom Fußball.' };
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id:'user-1' }), { status:200 });
    return new Response(JSON.stringify({ output_text:JSON.stringify(answer) }), { status:200 });
  };
  const res = responseRecorder();
  await handler(request({ action:'kontaktbild', text:'Martin kenne ich seit Jahren vom Fußballverein.' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /auth\/v1\/user$/);
  const openaiBody = JSON.parse(calls[1].options.body);
  assert.equal(openaiBody.store, false);
  assert.equal(openaiBody.text.format.strict, true);
  assert.equal(openaiBody.text.format.schema.additionalProperties, false);
  assert.equal(JSON.parse(res.body).data.name, 'Martin');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('Kontakt-Coach begrenzt Audio und speichert weder Audio noch Rohtranskript', () => {
  assert.equal(handler._test.MAX_AUDIO_BYTES, 3_200_000);
  assert.equal(JSON.stringify(handler._test.kontaktbildFormat).includes('audio'), false);
  assert.equal(JSON.stringify(handler._test.kontaktbildFormat).includes('transkript'), false);
});

