/**
 * Kontakt-Coach fuer das private Potenzialbuch.
 *
 * Die Route validiert zuerst den Portal-Login. Audio wird nur im Arbeitsspeicher
 * an OpenAI weitergereicht und weder hier noch in Supabase gespeichert.
 */

const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';
const OPENAI_URL = 'https://api.openai.com/v1';
const MAX_AUDIO_BYTES = 3_200_000;
const MAX_TEXT_LENGTH = 20_000;
const AUDIO_TYPES = new Map([
  ['audio/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/ogg', 'ogg'],
]);

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(payload));
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;
  try { return new URL(origin).host.toLowerCase() === String(req.headers.host || '').toLowerCase(); }
  catch (_) { return false; }
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (!req.body) return {};
  try { return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body)); }
  catch (_) { return {}; }
}

function bearer(req) {
  const value = String(req.headers.authorization || '');
  return /^Bearer\s+[^\s]+$/i.test(value) && value.length <= 8200 ? value : '';
}

async function authenticate(authorization) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user && typeof user.id === 'string' ? user : null;
}

function cleanText(value, max = MAX_TEXT_LENGTH) {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function textSchema(name, properties) {
  return {
    type: 'json_schema',
    name,
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties,
      required: Object.keys(properties),
    },
  };
}

const string = { type: 'string' };
const strings = { type: 'array', items: { type: 'string' }, maxItems: 12 };
const kontaktbildFormat = textSchema('kontaktbild', {
  name: string,
  telefon: string,
  email: string,
  ziel: { type: 'string', enum: ['kunde', 'partner'] },
  kreise: { type: 'array', items: { type: 'string', enum: ['familie','enger_freundeskreis','freunde','schulzeit','ausbildung_studium','arbeit_aktuell','arbeit_frueher','nachbarschaft','verein_hobby','alltag','fluechtige_bekanntschaft','sonstiges'] }, maxItems: 12 },
  eigenerKreis: string,
  beziehungsnaehe: { type: 'string', enum: ['fluechtig','bekannt','gut_bekannt','eng_vertraut'] },
  kontakthaeufigkeit: { type: 'string', enum: ['kein_kontakt','selten','gelegentlich','regelmaessig'] },
  direktErreichbar: { type: 'boolean' },
  kontaktziel: string,
  gemeinsameGeschichte: string,
  lebenssituation: strings,
  interessen: strings,
  sichereFakten: strings,
  vermutungen: strings,
  unsicherheit: string,
  notizVorschlag: string,
});

const gespraechFormat = textSchema('gespraechskompass', {
  ziel: string,
  ton: string,
  einstieg: string,
  fragen: { type: 'array', items: string, minItems: 3, maxItems: 6 },
  nichtVorschnell: strings,
  naechsterSchritt: string,
});

const nachbereitungFormat = textSchema('gespraechsnachbereitung', {
  kurzfassung: string,
  bestaetigteFakten: strings,
  verworfeneVermutungen: strings,
  notizErgaenzung: string,
  status: { type: 'string', enum: ['offen','angesprochen','im_gespraech','termin','kein_interesse'] },
  naechsterKontaktTage: { type: 'integer', minimum: 0, maximum: 365 },
});

function responseText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') return content.text;
    }
  }
  return '';
}

async function structured(openaiKey, instructions, input, format) {
  const response = await fetch(`${OPENAI_URL}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.POTENZIAL_AI_MODEL || 'gpt-5-mini',
      store: false,
      instructions,
      input,
      text: { format },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`openai_${response.status}`);
  const raw = responseText(payload);
  if (!raw) throw new Error('openai_empty');
  return JSON.parse(raw);
}

async function transcribe(openaiKey, body) {
  const mimeType = cleanText(body.mimeType, 80).split(';')[0].toLowerCase();
  const extension = AUDIO_TYPES.get(mimeType);
  if (!extension || typeof body.audioBase64 !== 'string') return { error: 'invalid_audio' };
  let audio;
  try { audio = Buffer.from(body.audioBase64, 'base64'); } catch (_) { return { error: 'invalid_audio' }; }
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) return { error: 'audio_too_large' };
  const form = new FormData();
  form.append('model', 'gpt-transcribe');
  form.append('language', 'de');
  form.append('file', new Blob([audio], { type: mimeType }), `aufnahme.${extension}`);
  const response = await fetch(`${OPENAI_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.text !== 'string') throw new Error(`transcription_${response.status}`);
  return { text: cleanText(payload.text) };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, reason: 'method_not_allowed' });
  }
  if (!sameOrigin(req)) return send(res, 403, { ok: false, reason: 'origin_rejected' });
  const authorization = bearer(req);
  if (!authorization) return send(res, 401, { ok: false, reason: 'login_required' });

  let user;
  try { user = await authenticate(authorization); }
  catch (_) { return send(res, 503, { ok: false, reason: 'auth_unavailable' }); }
  if (!user) return send(res, 401, { ok: false, reason: 'login_required' });

  const openaiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!openaiKey) return send(res, 503, { ok: false, reason: 'coach_not_configured' });
  const body = readBody(req);
  const action = cleanText(body.action, 40);

  try {
    if (action === 'transcribe') {
      const result = await transcribe(openaiKey, body);
      if (result.error) return send(res, 400, { ok: false, reason: result.error });
      return send(res, 200, { ok: true, text: result.text });
    }

    if (action === 'kontaktbild') {
      const text = cleanText(body.text);
      if (text.length < 10) return send(res, 400, { ok: false, reason: 'text_too_short' });
      const data = await structured(openaiKey,
        'Du ordnest freie Notizen eines deutschen Finanzberaters. Erfinde nichts. Trenne sichere Aussagen strikt von Vermutungen. Leere Angaben bleiben leer. Formuliere menschlich, knapp und respektvoll. Finanzthemen sind niemals automatisch relevant.',
        text, kontaktbildFormat);
      return send(res, 200, { ok: true, data });
    }

    if (action === 'gespraech') {
      const data = cleanText(JSON.stringify(body.data || {}));
      if (data.length < 10) return send(res, 400, { ok: false, reason: 'data_missing' });
      const result = await structured(openaiKey,
        'Erstelle einen authentischen Gespraechskompass, kein Verkaufsskript. Nutze nur bestaetigte Fakten. Vermutungen duerfen nur unter nichtVorschnell erscheinen. Der Einstieg muss zur echten Beziehung passen. Stelle offene Fragen und wahre die Entscheidungsfreiheit der Person.',
        data, gespraechFormat);
      return send(res, 200, { ok: true, data: result });
    }

    if (action === 'nachbereitung') {
      const text = cleanText(body.text);
      const context = cleanText(JSON.stringify(body.data || {}), 10_000);
      if (text.length < 5) return send(res, 400, { ok: false, reason: 'text_too_short' });
      const result = await structured(openaiKey,
        'Ordne die Nachbereitung eines Telefonats. Erfinde nichts. Nur im Bericht ausdruecklich bestaetigte Fakten duerfen als Fakten erscheinen. Formuliere eine sachliche kurze Notizergaenzung und einen vorsichtigen Statusvorschlag.',
        `Bisheriger Kontext: ${context}\n\nBericht nach dem Gespraech: ${text}`, nachbereitungFormat);
      return send(res, 200, { ok: true, data: result });
    }
    return send(res, 400, { ok: false, reason: 'invalid_action' });
  } catch (error) {
    console.error('[potenzial-coach]', error?.message || 'Verarbeitung fehlgeschlagen');
    return send(res, 502, { ok: false, reason: 'coach_unavailable' });
  }
}

module.exports = handler;
module.exports._test = { sameOrigin, cleanText, responseText, kontaktbildFormat, gespraechFormat, nachbereitungFormat, MAX_AUDIO_BYTES };
