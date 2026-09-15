// Ein privater Store nur fuer dieses Ziel. Keine Kundendaten, kein Cache.
// Aktuelle Origin-Lesung plus bedingtes Schreiben verhindern verlorene Aenderungen.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
export const BLOB_PFAD = 'betrieb/empfehlung-v1.json';
export async function mitBlob(token, arbeit, sdk = { get, put }) {
  if (typeof token !== 'string' || !/^vercel_blob_rw_[A-Za-z0-9_]+$/.test(token)) throw new Error('speicher-konfiguration');
  const controller = new AbortController(), signal = controller.signal;
  let timer;
  let gelesen;
  const store = {
    async read() {
      if (signal.aborted) throw new Error('speicher-zeitlimit');
      // Komprimierte Antworten koennen einen schwachen ETag tragen. Fuer ifMatch
      // muss die unveraenderte Versionskennung des gespeicherten Objekts gelten.
      const r = await sdk.get(BLOB_PFAD, { token, access: 'private', useCache: false,
        headers: { 'accept-encoding': 'identity' }, abortSignal: signal });
      if (!r || r.statusCode !== 200 || !r.blob.etag || r.blob.size > 300000) throw new Error('ablage');
      const reader = r.stream.getReader();
      let bytes = 0; const teile = [];
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > 300000) throw new Error('ablage');
          teile.push(part.value);
        }
      } finally { await reader.cancel(); }
      const raw = Buffer.concat(teile).toString('utf8');
      if (signal.aborted) throw new Error('speicher-zeitlimit');
      gelesen = { raw, etag: r.blob.etag };
      return raw;
    },
    async cas(alt, neu) {
      if (signal.aborted) throw new Error('speicher-zeitlimit');
      if (!gelesen || gelesen.raw !== alt || typeof neu !== 'string' || Buffer.byteLength(neu) > 300000) throw new Error('vergleich');
      try {
        await sdk.put(BLOB_PFAD, neu, { token, access: 'private', addRandomSuffix: false,
          allowOverwrite: true, ifMatch: gelesen.etag, contentType: 'application/json',
          cacheControlMaxAge: 60, abortSignal: signal });
        gelesen = undefined;
        return true;
      } catch (err) {
        gelesen = undefined;
        // Der Anbieter meldet bei ueberlappenden bedingten Writes auch diesen
        // 409-Konflikt; SDK 2.8.0 gibt ihn als einfachen Error zurueck.
        // Beide Faelle verlangen eine neue aktuelle Lesung, niemals Blindschreiben.
        if (err instanceof BlobPreconditionFailedError || err?.message ===
          'Vercel Blob: The conditional request cannot succeed due to a conflicting operation against this resource.') return false;
        throw new Error('ablage-schreiben', { cause: err });
      }
    },
  };
  try {
    return await Promise.race([
      arbeit(store),
      new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('speicher-zeitlimit'));},2500);}),
    ]);
  } finally { clearTimeout(timer); }
}
