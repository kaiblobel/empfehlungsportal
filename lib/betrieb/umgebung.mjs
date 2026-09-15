import { HOST } from './profil.mjs';
// Notfallweg 2 (Entscheidung Kai 15.09.2026): Variable auf genau "1" setzen und neu veroeffentlichen.
// Sperrt den Partnerbereich ohne Speicher, ohne KAI. und auch bei gueltigem internen Zugang.
// Produktion: BETRIEB_PORTAL_NOTFALL. Vorschau: nur BETRIEB_VORSCHAU_NOTFALL.
//
// Speicher-Schluessel: Vercel legt ihn beim Verbinden eines Blob-Stores als BLOB_READ_WRITE_TOKEN an,
// je Umgebung getrennt (Vorschau-Store nur Preview, Produktions-Store nur Production). So bleibt der
// Schluessel ausschliesslich in Vercel und muss nie kopiert werden. Die ausdruecklichen Namen
// BETRIEB_VORSCHAU_BLOB_TOKEN / BETRIEB_BLOB_TOKEN gehen vor, falls sie gesetzt sind.
export function laufzeitUmgebung(env) {
  if (env.VERCEL_ENV === 'preview') {
    const host = env.BETRIEB_VORSCHAU_HOST || '';
    return {
      aktiv: env.BETRIEB_VORSCHAU_AKTIV === '1' && /^[a-z0-9-]+\.vercel\.app$/.test(host) && host !== HOST,
      key: env.BETRIEB_VORSCHAU_GEHEIMNIS,
      blobToken: env.BETRIEB_VORSCHAU_BLOB_TOKEN || env.BLOB_READ_WRITE_TOKEN,
      notfall: env.BETRIEB_VORSCHAU_NOTFALL === '1',
      host,
    };
  }
  // Fremde/Entwicklungsumgebungen koennen keine Produktionsvariable aktivieren.
  return { aktiv: env.VERCEL_ENV === 'production' && env.BETRIEB_PORTAL_AKTIV === '1',
    key: env.BETRIEB_GEHEIMNIS_EMPFEHLUNG, blobToken: env.BETRIEB_BLOB_TOKEN || env.BLOB_READ_WRITE_TOKEN,
    notfall: env.VERCEL_ENV === 'production' && env.BETRIEB_PORTAL_NOTFALL === '1', host: HOST };
}
