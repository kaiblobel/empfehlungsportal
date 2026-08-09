import test from 'node:test';
import assert from 'node:assert/strict';
import { addDaysIso, cleanCoachLines, coachLinesText, coachRequest } from '../js/potenziale-coach.mjs';

test('Coach-Anfrage sendet nur Aktion und Nutzlast mit dem aktuellen Login', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ ok:true, data:{ name:'Martin' } }), { status:200 });
  };
  const result = await coachRequest(fetchImpl, 'token-123', 'kontaktbild', { text:'Martin vom Fußball' });
  assert.equal(result.ok, true);
  assert.equal(request.url, '/api/potenzial-coach');
  assert.equal(request.options.headers.Authorization, 'Bearer token-123');
  assert.deepEqual(JSON.parse(request.options.body), { action:'kontaktbild', text:'Martin vom Fußball' });
});

test('Kontaktbild-Zeilen werden begrenzt, getrimmt und leerzeilenfrei gehalten', () => {
  assert.deepEqual(cleanCoachLines(' Haus gebaut \n\n Zwei Kinder\n verheiratet ', 2), ['Haus gebaut','Zwei Kinder']);
  assert.equal(coachLinesText(['Haus gebaut', '', 'Zwei Kinder']), 'Haus gebaut\nZwei Kinder');
});

test('Wiedervorlage wird als lokales ISO-Datum berechnet', () => {
  assert.equal(addDaysIso(7, new Date(2026, 7, 9, 12)), '2026-08-16');
});

