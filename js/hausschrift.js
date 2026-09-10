/**
 * Phase 342 · Die Hausschrift DVAG-Type, nur fuer angemeldete Berater.
 *
 * Die Schriftdateien sind lizenziertes Firmenmaterial, und dieses Repo ist
 * oeffentlich. Deshalb liegen sie nicht unter assets/, sondern gesperrt in der
 * Tabelle public.hausschrift. Heraus kommen sie nur ueber hausschrift_datei(),
 * und die antwortet nur, wenn die Anmeldung zu einem Berater gehoert
 * (current_berater_id). Alle anderen bekommen nichts, auch keinen Fehler.
 *
 * Bis die Schrift da ist, oder wenn sie fehlt, steht die Seite in der
 * Ersatzschrift aus dem CSS (Inter). Es gibt keinen leeren Text und keine
 * Meldung. Pro Tab wird jede Datei nur einmal geholt (sessionStorage).
 *
 * Eingebunden auf Seiten, die die Hausschrift tragen sollen. Stand Phase 342:
 * dashboard/promoter.html.
 */
import { supabase } from './supabase.js';

const SCHNITTE = [
  { datei: 'dvagtype_lt.woff2', weight: '300' },
  { datei: 'dvagtype_rg.woff2', weight: '400' },
  { datei: 'dvagtype_bd.woff2', weight: '700' },
];
const SPEICHER = 'hausschrift:1:';

function zuBytes(base64) {
  const roh = atob(base64);
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i += 1) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

async function holen(datei) {
  try {
    const gemerkt = sessionStorage.getItem(SPEICHER + datei);
    if (gemerkt) return gemerkt;
  } catch (_) { /* Speicher gesperrt, dann eben holen */ }
  const { data, error } = await supabase.rpc('hausschrift_datei', { p_datei: datei });
  if (error || !data) return null;
  try { sessionStorage.setItem(SPEICHER + datei, data); } catch (_) { /* voll oder gesperrt */ }
  return data;
}

export async function hausschriftLaden() {
  if (!supabase || typeof FontFace === 'undefined') return;
  const { data } = await supabase.auth.getSession();
  if (!data?.session) return;
  await Promise.all(SCHNITTE.map(async ({ datei, weight }) => {
    const base64 = await holen(datei);
    if (!base64) return;
    try {
      const schrift = new FontFace('DVAG-Type', zuBytes(base64), { weight, style: 'normal', display: 'swap' });
      await schrift.load();
      document.fonts.add(schrift);
    } catch (err) {
      console.warn('[hausschrift]', datei, err);
    }
  }));
}

hausschriftLaden();
