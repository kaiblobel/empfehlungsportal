import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const url = window.ENV_SUPABASE_URL;
const key = window.ENV_SUPABASE_ANON_KEY;

let client = null;
if (url && key && !url.startsWith('PLACEHOLDER') && !key.startsWith('PLACEHOLDER')) {
  client = createClient(url, key);
} else {
  console.warn('[Supabase] Konfiguration fehlt – nutze Platzhalterwerte. Bitte config.js befüllen.');
}

export const supabase = client;

/* ---------- Empfehler-Flow (INSERT bleibt direkt) ---------- */
export async function createEmpfehlung(data) {
  if (!supabase) return { data: { link_token: 'demo-token' }, error: null };
  try {
    const payload = {
      berater_id: window.ENV_BERATER_ID,
      empfaenger_name: data.empfaenger_name,
      empfaenger_telefon: data.empfaenger_telefon,
      empfehler_name: data.empfehler_name || null,
      empfehler_nachricht: data.empfehler_nachricht || null,
      nachricht: data.nachricht || null,
      typ: data.typ || 'direkt',
    };
    const { data: inserted, error } = await supabase
      .from('empfehlungen')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return { data: inserted, error: null };
  } catch (err) {
    console.error('[createEmpfehlung]', err);
    return { data: null, error: err };
  }
}

/* ---------- Empfänger-Flow (via SECURITY-DEFINER-RPCs) ---------- */
export async function updateLinkGeoeffnet(token) {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase.rpc('mark_link_geoeffnet_rpc', { p_token: token });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[updateLinkGeoeffnet]', err);
    return { error: err };
  }
}

export async function markInteressiert(token) {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase.rpc('mark_interessiert_rpc', { p_token: token });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[markInteressiert]', err);
    return { error: err };
  }
}

export async function markAnrufwunsch(token, slot) {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase.rpc('mark_anrufwunsch_rpc', { p_token: token, p_slot: slot });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[markAnrufwunsch]', err);
    return { error: err };
  }
}

export async function updateAusgetragen(token) {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase.rpc('mark_ausgetragen_rpc', { p_token: token });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[updateAusgetragen]', err);
    return { error: err };
  }
}

export async function getEmpfehlungByToken(token) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase.rpc('get_empfehlung_public', { p_token: token });
    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('[getEmpfehlungByToken]', err);
    return { data: null, error: err };
  }
}

/* ---------- Dashboard (authenticated, direkter Zugriff) ---------- */
export async function getBerater(id) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('berater')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[getBerater]', err);
    return { data: null, error: err };
  }
}
