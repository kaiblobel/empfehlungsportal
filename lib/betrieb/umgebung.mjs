import { HOST } from './profil.mjs';
export function laufzeitUmgebung(env) {
  if (env.VERCEL_ENV === 'preview') {
    const host = env.BETRIEB_VORSCHAU_HOST || '';
    return {
      aktiv: env.BETRIEB_VORSCHAU_AKTIV === '1' && /^[a-z0-9-]+\.vercel\.app$/.test(host) && host !== HOST,
      key: env.BETRIEB_VORSCHAU_GEHEIMNIS,
      redisUrl: env.BETRIEB_VORSCHAU_REDIS_URL,
      host,
    };
  }
  // Fremde/Entwicklungsumgebungen koennen keine Produktionsvariable aktivieren.
  return { aktiv: env.VERCEL_ENV === 'production' && env.BETRIEB_PORTAL_AKTIV === '1',
    key: env.BETRIEB_GEHEIMNIS_EMPFEHLUNG, redisUrl: env.BETRIEB_REDIS_URL, host: HOST };
}
