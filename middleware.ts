import { next } from '@vercel/functions';
import { behandle } from './lib/betrieb/handler.mjs';
import { mitBlob } from './lib/betrieb/speicher-blob.mjs';
import { laufzeitUmgebung } from './lib/betrieb/umgebung.mjs';
// Plattform-Middleware, kein Next.js-Umbau. Tarifgrenze vor Veroeffentlichung pruefen.
export const config = { runtime: 'nodejs' };
export default function middleware(request: Request) {
  const env = laufzeitUmgebung(process.env);
  return behandle(request, {
    ...env,
    speicher: arbeit => mitBlob(env.blobToken, arbeit),
    next,
  });
}
