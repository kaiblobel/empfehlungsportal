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
      vorlage_slug: data.vorlage_slug || 'allgemein',
      empfehler_id: data.empfehler_id || null,
      empfaenger_beruf: data.empfaenger_beruf || null,
      empfaenger_verbindung: data.empfaenger_verbindung || null,
      empfaenger_kontext: data.empfaenger_kontext || null,
      empfehler_vorinformiert: data.empfehler_vorinformiert ?? false,
      beste_erreichbarkeit: data.beste_erreichbarkeit || null,
      bevorzugter_kanal: data.bevorzugter_kanal || null,
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

/* ---------- Vorlagen (public read) ---------- */
export async function getVorlagen() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('vorlagen')
      .select('*')
      .eq('aktiv', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getVorlagen]', err);
    return [];
  }
}

export async function getErfolgsgeschichten(vorlage_slug = null) {
  if (!supabase) return [];
  try {
    let q = supabase
      .from('erfolgsgeschichten')
      .select('*')
      .eq('aktiv', true)
      .order('sort_order', { ascending: true });
    if (vorlage_slug) {
      // Themen-spezifisch ODER themen-neutral (NULL)
      q = q.or(`vorlage_slug.eq.${vorlage_slug},vorlage_slug.is.null`);
    } else {
      q = q.is('vorlage_slug', null);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getErfolgsgeschichten]', err);
    return [];
  }
}

export async function updateVorlage(slug, data) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  try {
    const { error } = await supabase
      .from('vorlagen')
      .update(data)
      .eq('slug', slug);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[updateVorlage]', err);
    return { error: err };
  }
}

export async function getVorlage(slug) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('vorlagen')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error('[getVorlage]', err);
    return null;
  }
}


/* ---------- Empfehler / Belohnungen (Phase 7) ---------- */
export async function createEmpfehler({ name, email, telefon }) {
  if (!supabase) return { data: null, error: { message: 'Supabase nicht konfiguriert' } };
  try {
    const { data, error } = await supabase.rpc('create_empfehler', {
      p_name: name, p_email: email || '', p_telefon: telefon || '',
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[createEmpfehler]', err);
    return { data: null, error: err };
  }
}

export async function getEmpfehlerByCode(code) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase.rpc('get_empfehler_by_code', { p_code: code });
    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('[getEmpfehlerByCode]', err);
    return { data: null, error: err };
  }
}

export async function getEmpfehlerStats(code) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase.rpc('get_empfehler_stats', { p_code: code });
    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('[getEmpfehlerStats]', err);
    return { data: null, error: err };
  }
}

export async function getEmpfehlerEmpfehlungen(code) {
  if (!supabase) return { data: [], error: null };
  try {
    const { data, error } = await supabase.rpc('get_empfehler_empfehlungen', { p_code: code });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getEmpfehlerEmpfehlungen]', err);
    return { data: [], error: err };
  }
}

export async function getBelohnungsStufen() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('belohnungs_stufen')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getBelohnungsStufen]', err);
    return [];
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

/* ---------- Phase 50a · Multi-Tenant Berater-Admin ---------- */
export async function listBerater() {
  if (!supabase) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('berater')
      .select('id, name, slug, email, rolle, telefon, foto_url, whatsapp, bookings_url, ist_aktiv, created_at, auth_user_id')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[listBerater]', err);
    return { data: [], error: err };
  }
}

export async function createBerater(berater) {
  if (!supabase) return { data: null, error: { message: 'No Supabase client' } };
  try {
    const { data, error } = await supabase
      .from('berater')
      .insert([berater])
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[createBerater]', err);
    return { data: null, error: err };
  }
}

export async function updateBerater(id, updates) {
  if (!supabase) return { data: null, error: { message: 'No Supabase client' } };
  try {
    const { data, error } = await supabase
      .from('berater')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[updateBerater]', err);
    return { data: null, error: err };
  }
}

export async function setBeraterAktiv(id, ist_aktiv) {
  return updateBerater(id, { ist_aktiv });
}
