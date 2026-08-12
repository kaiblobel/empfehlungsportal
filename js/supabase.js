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

/* ---------- Empfehler-Flow (INSERT via SECURITY-DEFINER-RPC) ---------- */
// Direkter .insert().select() liefert für nicht-eingeloggte Promoter 401 (keine
// anon-SELECT-Policy). Der RPC fügt ein und gibt link_token zurück — anon-fähig.
export async function createEmpfehlung(data) {
  if (!supabase) return { data: { link_token: 'demo-token' }, error: null };
  try {
    const { data: rows, error } = await supabase.rpc('create_empfehlung_public', {
      p_empfaenger_name: data.empfaenger_name,
      p_empfaenger_telefon: data.empfaenger_telefon,
      p_empfehler_name: data.empfehler_name || null,
      p_empfehler_nachricht: data.empfehler_nachricht || null,
      p_nachricht: data.nachricht || null,
      p_typ: data.typ || 'direkt',
      p_vorlage_slug: data.vorlage_slug || 'allgemein',
      p_empfehler_id: data.empfehler_id || null,
      p_berater_id: data.berater_id || window.ENV_BERATER_ID,
      p_empfaenger_beruf: data.empfaenger_beruf || null,
      p_empfaenger_verbindung: data.empfaenger_verbindung || null,
      p_empfaenger_kontext: data.empfaenger_kontext || null,
      p_empfehler_vorinformiert: data.empfehler_vorinformiert ?? false,
      p_beste_erreichbarkeit: data.beste_erreichbarkeit || null,
      p_bevorzugter_kanal: data.bevorzugter_kanal || null,
    });
    if (error) throw error;
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { data: row || null, error: null };
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

/* ---------- Geteilte Programm-Inhalte: Dubletten filtern ---------- */
// Vorlagen und Belohnungen sind inhaltlich EIN geteilter Satz, den alle Berater
// zeigen. In der Tabelle liegen aber Klon-Zeilen einzelner Berater (gleiche
// Stufe bzw. gleicher Slug, gleicher Titel) — und die öffentliche Lese-Policy
// gibt alle frei. Ohne diesen Filter erscheint in Präsentation, Promoter-Bereich
// und Empfehlungs-Formular jede Belohnung und jedes Thema doppelt.
// Behalten wird pro Schlüssel genau eine Zeile: die des gewünschten Beraters,
// sonst die des Haupt-Beraters, sonst die erste gefundene.
function eineZeileProSchluessel(rows, keyFn, beraterId = null) {
  const haupt = window.ENV_BERATER_ID || null;
  const rang = (r) => {
    if (beraterId && r.berater_id === beraterId) return 0;
    if (haupt && r.berater_id === haupt) return 1;
    return 2;
  };
  const beste = new Map();
  for (const row of rows) {
    const k = keyFn(row);
    const da = beste.get(k);
    if (!da || rang(row) < rang(da)) beste.set(k, row);
  }
  return [...beste.values()];
}

/* ---------- Vorlagen (public read) ---------- */
// Multi-Tenant: beraterId optional. Wenn gesetzt, werden nur die Inhalte
// dieses Beraters geladen (jeder Berater pflegt eigene). Ohne beraterId
// bleibt das alte globale Verhalten (Rückwärtskompatibilität).
export async function getVorlagen(beraterId = null) {
  if (!supabase) return [];
  try {
    let q = supabase
      .from('vorlagen')
      .select('*')
      .eq('aktiv', true)
      .order('sort_order', { ascending: true });
    if (beraterId) q = q.eq('berater_id', beraterId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getVorlagen]', err);
    return [];
  }
}

// Themenwelten für die Anzeige (Präsentation, Empfehlungs-Formular, Promoter-
// Bereich): immer alle Zeilen laden und pro Slug nur eine behalten. Bewusst
// ohne .eq()-Filter — Berater ohne eigene Vorlagen bekommen so den geteilten
// Satz statt einer leeren Themen-Auswahl.
export async function getVorlagenPublic(beraterId = null) {
  const alle = await getVorlagen();
  return eineZeileProSchluessel(alle, (v) => v.slug, beraterId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export async function updateVorlage(slug, data, beraterId = null) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  try {
    // slug ist nur noch pro Berater eindeutig → zusätzlich nach berater_id
    // filtern (RLS schützt zusätzlich, aber so trifft das Update genau die
    // eigene Zeile).
    let q = supabase.from('vorlagen').update(data).eq('slug', slug);
    if (beraterId) q = q.eq('berater_id', beraterId);
    const { error } = await q;
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[updateVorlage]', err);
    return { error: err };
  }
}

export async function getVorlage(slug, beraterId = null) {
  if (!supabase) return null;
  try {
    let q = supabase
      .from('vorlagen')
      .select('*')
      .eq('slug', slug);
    if (beraterId) q = q.eq('berater_id', beraterId);
    // slug ist nur noch pro Berater eindeutig → bei mehreren Treffern den
    // ersten nehmen (maybeSingle würde bei >1 Row fehlschlagen).
    const { data, error } = await q.order('sort_order', { ascending: true }).limit(1);
    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error('[getVorlage]', err);
    return null;
  }
}


/* ---------- Empfehler / Belohnungen (Phase 7) ---------- */
export async function createEmpfehler({ name, email, telefon, beraterSlug, istTest = false }) {
  if (!supabase) return { data: null, error: { message: 'Supabase nicht konfiguriert' } };
  try {
    const { data, error } = await supabase.rpc('create_empfehler', {
      p_name: name, p_email: email || '', p_telefon: telefon || '',
      p_berater_slug: beraterSlug || null,
      p_ist_test: istTest === true,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[createEmpfehler]', err);
    return { data: null, error: err };
  }
}

/* ---------- Phase 78 · Promoter-Profil (Berater bearbeitet eigene) ---------- */
// Vollen Promoter-Datensatz laden (RLS-scoped auf eigenen Berater).
export async function getEmpfehler(id) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase.from('empfehler').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return { data: data || null, error: null };
  } catch (err) {
    console.error('[getEmpfehler]', err);
    return { data: null, error: err };
  }
}
// Promoter-Stammdaten bearbeiten (durch "empfehler scoped update"-Policy gedeckt).
export async function updateEmpfehler(id, fields) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  const { error } = await supabase.from('empfehler').update(fields).eq('id', id);
  return { error };
}
// Promoter per Code finden (für den Anlege-Flow: nach create die neue id holen).
export async function getEmpfehlerIdByCode(code) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('empfehler').select('id').eq('code', code).maybeSingle();
    return data?.id || null;
  } catch (_) { return null; }
}

/* ---------- Multi-Tenant · Oeffentliches Berater-Branding (anon-faehig) ---------- */
export async function getBeraterPublicBySlug(slug) {
  if (!supabase || !slug) return { data: null, error: null };
  try {
    const { data, error } = await supabase.rpc('get_berater_public', { p_slug: slug });
    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('[getBeraterPublicBySlug]', err);
    return { data: null, error: err };
  }
}

export async function getBeraterPublicById(id) {
  if (!supabase || !id) return { data: null, error: null };
  try {
    const { data, error } = await supabase.rpc('get_berater_public_by_id', { p_id: id });
    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('[getBeraterPublicById]', err);
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

// Promoter reicht Kontext einer eigenen (bereits versendeten) Empfehlung nach (anon, keyed per Code).
export async function updateEmpfehlungKontext(code, id, f) {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase.rpc('update_empfehlung_kontext', {
      p_code: code,
      p_id: id,
      p_beruf: f.beruf || null,
      p_verbindung: f.verbindung || null,
      p_kontext: f.kontext || null,
      p_erreichbarkeit: f.erreichbarkeit || null,
      p_kanal: f.kanal || null,
      p_vorinformiert: !!f.vorinformiert,
      p_nachricht: f.nachricht || null,
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[updateEmpfehlungKontext]', err);
    return { error: err };
  }
}

// Ziel (gewählte Belohnungs-Stufe) am Promoter setzen/entfernen (anon, keyed per Code).
export async function setEmpfehlerZiel(code, stufe) {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase.rpc('set_empfehler_ziel', { p_code: code, p_stufe: stufe });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[setEmpfehlerZiel]', err);
    return { error: err };
  }
}

// Standard-Empfehlungssatz des Promoters (gilt fuer alle seine Empfohlenen)
export async function updateEmpfehlerStandardNachricht(code, text) {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase.rpc('update_empfehler_standard_nachricht', { p_code: code, p_text: text || null });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[updateEmpfehlerStandardNachricht]', err);
    return { error: err };
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

export async function getBelohnungsStufen(beraterId = null) {
  if (!supabase) return [];
  try {
    let q = supabase
      .from('belohnungs_stufen')
      .select('*')
      .order('sort_order', { ascending: true });
    if (beraterId) q = q.eq('berater_id', beraterId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getBelohnungsStufen]', err);
    return [];
  }
}

// Belohnungs-Stufen für die Anzeige (Präsentation, Promoter-Bereich, Promoter-
// Detail): pro Stufe nur eine Zeile, sortiert nach Stufe. Die Editoren in
// programm-admin.js nutzen weiter getBelohnungsStufen() — dort muss jede echte
// Zeile mit ihrer eigenen id sichtbar bleiben.
export async function getBelohnungsStufenPublic(beraterId = null) {
  const alle = await getBelohnungsStufen();
  return eineZeileProSchluessel(alle, (s) => s.stufe, beraterId)
    .sort((a, b) => a.stufe - b.stufe);
}

/* ---------- Phase 77 · Programm-Editoren (admin-only, direkte Mutationen via RLS) ---------- */

// Belohnungs-Stufen (Roadmap-Definition)
export async function updateBelohnungsStufe(stufe, beraterId, fields) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  return await supabase.from('belohnungs_stufen').update(fields).eq('stufe', stufe).eq('berater_id', beraterId);
}
export async function insertBelohnungsStufe(fields) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  return await supabase.from('belohnungs_stufen').insert(fields);
}
export async function deleteBelohnungsStufe(stufe, beraterId) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  return await supabase.from('belohnungs_stufen').delete().eq('stufe', stufe).eq('berater_id', beraterId);
}

/* ---------- Prämien-Tracking (Admin) ---------- */

// Verdiente Prämien laden (mit Empfehler-Name/Code). RLS scoped auf eigenen Berater/Admin.
export async function getPraemien(beraterId = null) {
  if (!supabase) return { data: [], error: null };
  try {
    let q = supabase
      .from('praemien')
      .select('*, empfehler:empfehler_id ( name, code )')
      .order('earned_at', { ascending: false });
    if (beraterId) q = q.eq('berater_id', beraterId);
    const { data, error } = await q;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getPraemien]', err);
    return { data: [], error: err };
  }
}

// Felder einer Prämie ändern (Status, variante, notiz, ausgezahlt_at).
export async function updatePraemie(id, fields) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  return await supabase.from('praemien').update(fields).eq('id', id);
}

// Verdiente Prämien (Status 'offen') für alle eigenen Empfehler materialisieren.
export async function syncPraemien() {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  return await supabase.rpc('sync_praemien');
}

// Prämie auszahlen: Status + Auszahl-Details setzen, Beleg-Nr vergeben. Gibt die Zeile zurück.
export async function auszahlenPraemie(id, { betrag, art, variante, adresse, notiz, datum }) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  return await supabase.rpc('auszahlen_praemie', {
    p_id: id,
    p_betrag: (betrag === '' || betrag == null) ? null : Number(betrag),
    p_art: art || null,
    p_variante: variante || null,
    p_adresse: adresse || null,
    p_notiz: notiz || null,
    p_datum: datum || null,
  });
}

// Anzahl offener Prämien (für das Badge in der Navigation). RLS scoped auf Berater/Admin.
export async function getOffenePraemienCount() {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from('praemien')
      .select('id', { count: 'exact', head: true })
      .eq('ist_test', false)
      .eq('status', 'offen');
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.warn('[getOffenePraemienCount]', err);
    return 0;
  }
}

/**
 * Liefert je Empfehler die Kunde-gewordenen Empfehlungen (aufsteigend nach Datum).
 * Damit lässt sich Prämie-Stufe N dem N. gewonnenen Kunden zuordnen.
 * Rückgabe: Map empfehler_id → [{ empfaenger_name, created_at }, ...]
 */
export async function getKundenJeEmpfehler(empfehlerIds = []) {
  const map = {};
  if (!supabase || !empfehlerIds.length) return map;
  try {
    const { data, error } = await supabase
      .from('empfehlungen')
      .select('empfehler_id, empfaenger_name, created_at, ist_test')
      .in('empfehler_id', empfehlerIds)
      .eq('status', 'kunde')
      .order('created_at', { ascending: true });
    if (error) throw error;
    for (const row of data || []) {
      if (!row.empfehler_id) continue;
      (map[row.empfehler_id] ||= []).push(row);
    }
    return map;
  } catch (err) {
    console.warn('[getKundenJeEmpfehler]', err);
    return map;
  }
}

// Einzelne Prämie inkl. Empfehler-Stammdaten laden (für den Beleg).
export async function getPraemie(id) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('praemien')
      .select('*, empfehler:empfehler_id ( name, email, telefon )')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[getPraemie]', err);
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

/* ---------- Phase 50a · Multi-Tenant Berater-Admin ---------- */
export async function listBerater() {
  if (!supabase) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('berater')
      .select('id, name, slug, email, rolle, telefon, foto_url, whatsapp, bookings_url, impressum_url, datenschutz_url, ist_aktiv, created_at, auth_user_id, fuehrungskraft_id, ist_test')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[listBerater]', err);
    return { data: [], error: err };
  }
}

/* ---------- Phase 208 · Testdaten ---------- */

/**
 * Wie viele Testdatensätze gibt es je Bereich?
 * Rückgabe: { berater: 0, promoter: 0, empfehlungen: 0, praemien: 0, kidz: 0, potenziale: 0 }
 */
export async function getTestdatenBestand() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.rpc('testdaten_bestand');
    if (error) throw error;
    const out = {};
    (data || []).forEach((r) => { out[r.bereich] = Number(r.anzahl) || 0; });
    return out;
  } catch (err) {
    console.warn('[getTestdatenBestand]', err);
    return {};
  }
}

/**
 * Sichert alle Testdatensätze und entfernt sie. Nur für Admins.
 * Die Bestätigung ist Absicht: ein versehentlicher Klick löscht nichts.
 */
export async function entferneTestdaten() {
  if (!supabase) return { data: null, error: { message: 'Supabase nicht konfiguriert' } };
  try {
    const { data, error } = await supabase.rpc('testdaten_entfernen', {
      p_bestaetigung: 'TESTDATEN ENTFERNEN',
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[entferneTestdaten]', err);
    return { data: null, error: err };
  }
}

/**
 * Die Anmeldeadresse je Berater, aber nur wo sie von der Geschäftsadresse
 * in der Karte abweicht (Phase 209). Nur Admins bekommen etwas zurück.
 * Rückgabe: Map berater_id → Anmeldeadresse.
 */
export async function getBeraterLoginEmails() {
  const map = new Map();
  if (!supabase) return map;
  try {
    const { data, error } = await supabase.rpc('berater_login_emails');
    if (error) throw error;
    (data || []).forEach((r) => { if (r?.berater_id) map.set(r.berater_id, r.login_email); });
    return map;
  } catch (err) {
    // Die Beraterliste muss auch ohne diese Angabe funktionieren.
    console.warn('[getBeraterLoginEmails]', err);
    return map;
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

/**
 * Lädt ein Berater-Foto in den Storage-Bucket `berater-fotos` und gibt die
 * öffentliche URL zurück. Dateiname = slug + Zeitstempel (Cache-Bust + eindeutig).
 */
export async function uploadBeraterFoto(file, slug) {
  if (!supabase) return { url: null, error: { message: 'No Supabase client' } };
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const safeSlug = (slug || 'berater').replace(/[^a-z0-9-]/g, '') || 'berater';
    const path = `${safeSlug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('berater-fotos')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg', cacheControl: '3600' });
    if (error) throw error;
    const { data } = supabase.storage.from('berater-fotos').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error('[uploadBeraterFoto]', err);
    return { url: null, error: err };
  }
}

/* ---------- Phase 50a · Empfehlungs-Löschung ---------- */
export async function deleteEmpfehlung(id) {
  if (!supabase) return { error: { message: 'No Supabase client' } };
  try {
    const { error } = await supabase.from('empfehlungen').delete().eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[deleteEmpfehlung]', err);
    return { error: err };
  }
}

/* ---------- Phase 70 · Prämien-Löschung ---------- */
// RLS-Policy praemien_write (for all) deckt DELETE für authenticated Berater/Admins.
export async function deletePraemie(id) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  return await supabase.from('praemien').delete().eq('id', id);
}

/* ---------- Phase 74 · Promoter-Löschung ---------- */
// SECURITY-DEFINER-RPC: löscht nur eigene Promoter OHNE Empfehlungen.
// Rückgabe (data): 'deleted' | 'has_empfehlungen' | 'forbidden' | 'not_found'.
export async function deleteEmpfehler(id) {
  if (!supabase) return { data: null, error: { message: 'Supabase nicht konfiguriert' } };
  const { data, error } = await supabase.rpc('delete_empfehler', { p_id: id });
  return { data, error };
}

/* ---------- Phase 168 · Privates Potenzialbuch mit Kontaktstärke ---------- */
// Potenziale sind ein eigener Arbeitsbereich. Diese Funktionen schreiben
// ausschließlich in `potenziale` und berühren weder Empfehlungen noch Promoter.
const POTENZIAL_FIELDS = 'id,berater_id,name,telefon,email,ziel,kreis,kreise,beziehungsnaehe,kontakthaeufigkeit,direkt_erreichbar,kontaktstaerke_override,status,notiz,naechster_kontakt_am,zuletzt_angesprochen_at,cockpit_uebernommen_at,kontaktbild,kontaktbild_aktualisiert_at,gespraechsvorbereitung,gespraechsvorbereitung_at,created_at,updated_at';

export async function getPotenziale(beraterId) {
  if (!supabase || !beraterId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('potenziale')
    .select(POTENZIAL_FIELDS)
    .eq('berater_id', beraterId)
    .order('updated_at', { ascending: false });
  return { data: data || [], error };
}

export async function createPotenzial(beraterId, fields) {
  if (!supabase || !beraterId) return { data: null, error: { message: 'Kein Beraterkonto gefunden' } };
  const { data, error } = await supabase
    .from('potenziale')
    .insert({ ...fields, berater_id: beraterId })
    .select(POTENZIAL_FIELDS)
    .single();
  return { data, error };
}

export async function updatePotenzial(id, beraterId, fields) {
  if (!supabase || !id || !beraterId) return { data: null, error: { message: 'Potenzial nicht gefunden' } };
  const { data, error } = await supabase
    .from('potenziale')
    .update(fields)
    .eq('id', id)
    .eq('berater_id', beraterId)
    .select(POTENZIAL_FIELDS)
    .single();
  return { data, error };
}

export async function deletePotenzial(id, beraterId) {
  if (!supabase || !id || !beraterId) return { error: { message: 'Potenzial nicht gefunden' } };
  const { error } = await supabase
    .from('potenziale')
    .delete()
    .eq('id', id)
    .eq('berater_id', beraterId);
  return { error };
}

/* ---------- Phase 76 · Passwort-Verwaltung ---------- */
// Berater ändert sein EIGENES Passwort (offizielles Supabase-Auth-Primitive).
export async function updateMyPassword(newPassword) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

// Admin legt ein Berater-Login an oder setzt dessen Passwort. Beides läuft
// serverseitig über die offizielle Auth Admin API und ist admin-gated.
export async function createBeraterLogin(beraterId, password) {
  if (!supabase) return { data: null, error: { message: 'Supabase nicht konfiguriert' } };
  const { data, error } = await supabase.functions.invoke('berater-create-login', {
    body: { berater_id: beraterId, password },
  });
  // functions.invoke gibt bei HTTP-Fehlern error; Body kann trotzdem { error } enthalten
  if (data?.error && !error) return { data: null, error: { message: data.error } };
  return { data, error };
}

/* ---------- Phase 82 · Team-Momentum (nur Berater-Ebene, keine Kundendaten) ---------- */
export async function touchPresence() {
  if (!supabase) return;
  try { await supabase.rpc('touch_presence'); } catch (_) {}
}
export async function getTeamActivity(days = 14) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('team_activity', { p_days: days });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('[getTeamActivity]', err); return []; }
}
export async function getTeamPresence() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('team_presence');
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('[getTeamPresence]', err); return []; }
}

/**
 * Aggregierte Teamkennzahlen für 7, 30 oder 90 Tage. Die Datenbankfunktion
 * prüft zusätzlich, ob der eingeloggte Auth-Nutzer einem aktiven Beraterkonto
 * zugeordnet ist. Es werden keine Kunden- oder Kontaktdaten zurückgegeben.
 */
export async function getTeamMetrics(days = 30) {
  if (!supabase) return [];
  const safeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  try {
    const { data, error } = await supabase.rpc('team_metrics', { p_days: safeDays });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('[getTeamMetrics]', err); return []; }
}

/**
 * Datensparsame Teamaktivität mit eindeutiger Berater-ID für die Detailansicht.
 */
export async function getTeamActivitySecure(days = 30) {
  if (!supabase) return [];
  const safeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  try {
    const { data, error } = await supabase.rpc('team_activity_secure', { p_days: safeDays });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('[getTeamActivitySecure]', err); return []; }
}

/* ---------- Phase 195/196 · Führungslinie beim Bestand ----------
 * Bis Phase 194 griff die Führungslinie nur bei den aggregierten Teamzahlen.
 * Promoter, Empfehlungen, Prämien und KIDZ-Anmeldungen des eigenen Astes waren
 * für eine Führungskraft nicht einsehbar, und der Admin sah dort weniger als
 * bei Prämien und KIDZ.
 *
 * Was hier NICHT kommt: Namen, Telefonnummern, E-Mail-Adressen. Die
 * Teamübersicht ist seit Phase 141 datensparsam, und eine Zahl in der
 * Oberfläche mit Namen in der Antwort wäre nur scheinbar sparsam. Wer einen
 * einzelnen Fall bearbeiten will, tut das in seiner eigenen Akte.
 *
 * Die Leseregeln auf den Tabellen bleiben eng auf die eigenen Daten: sonst
 * würde jede Kachel und jede Liste im Portal plötzlich das Team mitzählen.
 */
export async function getTeamBestand(days = 30) {
  if (!supabase) return [];
  const safeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  try {
    const { data, error } = await supabase.rpc('team_bestand', { p_days: safeDays });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('[getTeamBestand]', err); return []; }
}

/* ---------- Phase 199 · Teamsicht in den Listen ----------
 * Diese beiden liefern den Ast MIT Namen, für den Umschalter in der Promoter-
 * und der Empfehlungsliste. Anlass war ein Praxisfall: Sandro hatte einen
 * echten Promoter angelegt, und der Admin fand ihn im Portal nicht, weil die
 * Leseregel schlicht "gehört mir" lautet.
 *
 * Die Teamübersicht selbst bleibt datensparsam und nutzt weiter getTeamBestand.
 */
export async function getTeamPromoter(limit = 500) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('team_promoter', { p_limit: Number(limit) || 500 });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('[getTeamPromoter]', err); return []; }
}

export async function getTeamEmpfehlungen(days = 90, limit = 500) {
  if (!supabase) return [];
  const safeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 90;
  try {
    const { data, error } = await supabase.rpc('team_empfehlungen', {
      p_days: safeDays, p_limit: Number(limit) || 500,
    });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('[getTeamEmpfehlungen]', err); return []; }
}
