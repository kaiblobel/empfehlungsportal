import { next } from '@vercel/functions';
import { behandle } from './lib/betrieb/handler.mjs';
import { mitBlob } from './lib/betrieb/speicher-blob.mjs';
import { laufzeitUmgebung } from './lib/betrieb/umgebung.mjs';
// Plattform-Middleware, kein Next.js-Umbau (ADR-0063, Adapter vercel-portal).
// Der Filter laesst nur Ordner mit reinen Dateien aus (assets, css, js) und die bestehenden
// Funktionen unter /api/ ausser /api/betrieb/. Alle Seiten laufen weiter hindurch, auch
// verschluesselt geschriebene Adressen, denn erst der Handler entschluesselt und prueft den
// Partnerbereich. Kundenseiten lesen dabei nie den Speicher. tests/betrieb.test.mjs prueft den Filter.
export const config = { runtime: 'nodejs', matcher: ['/((?!assets/|css/|js/|api/(?!betrieb/)).*)'] };
export default function middleware(request: Request) {
  const env = laufzeitUmgebung(process.env);
  return behandle(request, {
    ...env,
    speicher: arbeit => mitBlob(env.blobToken, arbeit),
    next,
  });
}
