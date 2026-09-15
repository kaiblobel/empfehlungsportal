// Nur Primaer-Endpunkt, TLS, kein Replica-Lesen und kein Prozess-Cache.
// Ein CAS schreibt Zustand, Nonces und Zugangs-Widerrufe atomar zusammen.
export const SCHLUESSEL = 'kai:betrieb:empfehlung:v1';
export const CAS = `if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2]); return 1`;
export async function mitSpeicher(url, arbeit, { lokal = false } = {}) {
  const u = new URL(url);
  if (u.protocol !== 'rediss:' && !(lokal && u.protocol === 'redis:' && ['127.0.0.1', 'localhost'].includes(u.hostname))) throw new Error('speicher-konfiguration');
  const { createClient } = await import('redis');
  const client = createClient({ url, disableOfflineQueue: true, socket: { connectTimeout: 1500, reconnectStrategy: false } });
  client.on('error', () => {}); // Keine Adresse/Zugangsdaten im Protokoll.
  let timer;
  try {
    return await Promise.race([
      (async () => {
        await client.connect();
        return await arbeit({ read: () => client.get(SCHLUESSEL), cas: async (alt, neu) =>
          (await client.eval(CAS, { keys: [SCHLUESSEL], arguments: [alt, neu] })) === 1 });
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('speicher-zeitlimit')), 2500); }),
    ]);
  } finally { clearTimeout(timer); if (client.isOpen) client.destroy(); }
}
