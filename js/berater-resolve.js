/**
 * Zentrale Berater-Ermittlung — IO-Schicht.
 * Führt den reinen Plan aus berater-resolve-core.js aus: Weiterleitung,
 * Fehler-/Neutral-Zustand oder Laden des Beraters über Token/Code/Slug/Login.
 *
 * Grundsatz: Ein ungültiger/inaktiver Berater, ein ungültiger Token/Code/Slug
 * führt zum Fehlerzustand — NIEMALS auf Kai. Die einzige Kai-Zuordnung ist die
 * enge, dokumentierte Legacy-Weiterleitung (nur /programm, /empfehlen).
 */
import {
  planResolution, buildLegacyRedirectUrl, KAI_SLUG,
} from './berater-resolve-core.js';
import {
  getBeraterPublicBySlug, getBeraterPublicById, getEmpfehlungByToken,
  getEmpfehlerByCode, supabase,
} from './supabase.js';

function readStoredCode() {
  try { return (localStorage.getItem('empfehler_code') || '').trim() || null; }
  catch (_) { return null; }
}

async function hasSession() {
  try {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    return !!(data && data.session);
  } catch (_) { return false; }
}

/**
 * @returns {Promise<{state:'ok'|'error'|'neutral'|'redirecting', berater:object|null, source:string}>}
 */
export async function resolveBerater() {
  const plan = planResolution({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    hasSession: await hasSession(),
    storedCode: readStoredCode(),
  });

  if (plan.by === 'redirect') {
    location.replace(buildLegacyRedirectUrl(location.pathname, location.search, location.hash));
    return { state: 'redirecting', berater: null, source: plan.source };
  }
  if (plan.by === 'error') return { state: 'error', berater: null, source: plan.source };
  if (plan.by === 'neutral') return { state: 'neutral', berater: null, source: plan.source };

  let berater = null;
  try {
    if (plan.by === 'token') {
      const { data } = await getEmpfehlungByToken(plan.value);
      if (data && data.berater_id) berater = (await getBeraterPublicById(data.berater_id)).data;
    } else if (plan.by === 'code') {
      const { data } = await getEmpfehlerByCode(plan.value);
      if (data && data.berater_id) berater = (await getBeraterPublicById(data.berater_id)).data;
    } else if (plan.by === 'slug') {
      berater = (await getBeraterPublicBySlug(plan.value)).data;
    } else if (plan.by === 'session') {
      const m = await import('./dashboard.js');
      berater = await m.getCurrentBerater();
    }
  } catch (_) {
    berater = null;
  }

  if (berater) return { state: 'ok', berater, source: plan.source };
  // Eingeloggt, aber (noch) kein Berater-Datensatz → neutral, kein harter Fehler.
  if (plan.by === 'session') return { state: 'neutral', berater: null, source: plan.source };
  // Ungültiger/inaktiver Berater, ungültiger Token/Code/Slug → Fehler, nie Kai.
  return { state: 'error', berater: null, source: plan.source };
}

export { KAI_SLUG };
