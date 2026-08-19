import { supabase } from '../js/supabase.js';
import { parseDbDate } from './date-utils.js';
import { initialsAvatar } from './berater-brand.js';

/* ---------- Auth ---------- */

export async function requireAuth() {
  if (!supabase) {
    redirectLogin();
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) {
    redirectLogin();
    return null;
  }
  return data.session;
}

export async function redirectIfAuthed() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    window.location.href = 'overview.html';
  }
}

export async function login(email, password) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function logout() {
  // Gemerktes Branding und den Admin-Merker mitnehmen, sonst begrüßt der
  // nächste Login kurz mit Foto, Namen und Menü des vorherigen Beraters.
  try {
    localStorage.removeItem(BRAND_CACHE_KEY);
    localStorage.removeItem('berater_ist_admin_v1');
  } catch (_) {}
  if (supabase) await supabase.auth.signOut();
  window.location.href = '/dashboard/index.html';
}


/* ---------- Eingeloggter Berater (Multi-Tenant Branding) ---------- */

let _currentBerater = null;

/**
 * Wirft den gemerkten Berater weg, damit der nächste Aufruf neu lädt.
 *
 * Nötig seit Phase 302: Wer sein Profil in den Einstellungen ändert, hätte
 * sonst bis zum nächsten Tab-Neustart sein altes Foto und seinen alten Namen
 * im Kopf der Seite stehen. Der Merker im localStorage wird von
 * applyBeraterHeader ohnehin neu geschrieben, sobald die frischen Daten da
 * sind — deshalb reicht es, hier den Modul-Merker zu leeren.
 */
export function vergissBerater() {
  _currentBerater = null;
  window.CURRENT_BERATER = null;
}

/**
 * Lädt den zum eingeloggten Auth-User gehörenden Berater-Datensatz (gecacht).
 * Quelle für Foto/Name/Rolle im Dashboard-Header statt der globalen ENV_*.
 */
export async function getCurrentBerater() {
  if (_currentBerater) return _currentBerater;
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('berater')
    // Muss dieselben Felder liefern wie get_berater_public. Dies ist der dritte
    // Weg zum Berater (eingeloggte Vorschau); fehlt hier ein Feld, sieht der
    // Berater seine eigene Seite anders als seine Kunden sie sehen.
    .select('id, name, rolle, foto_url, slug, bookings_url, whatsapp, telefon, email, impressum_url, datenschutz_url, ist_admin, buero_foto_url, team_foto_url, buero_bildzeile, adresse')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) {
    console.error('[getCurrentBerater]', error);
    return null;
  }
  _currentBerater = data || null;
  window.CURRENT_BERATER = _currentBerater;
  return _currentBerater;
}

/**
 * Setzt Foto + Name (und optional #profName) im Dashboard-Header aus dem
 * eingeloggten Berater. Deckt beide ID-Konventionen ab (hPhoto/hName und
 * hdrPhoto/hdrName). ENV_* bleibt nur Fallback, falls noch kein Foto gepflegt.
 * Gibt den Berater-Datensatz zurück.
 */
const BRAND_CACHE_KEY = 'berater_brand_v1';

function setzeHeaderWerte({ foto, name }) {
  const set = (id, prop, val) => {
    const el = document.getElementById(id);
    if (el && val) el[prop] = val;
  };
  set('hPhoto', 'src', foto);
  set('hdrPhoto', 'src', foto);
  set('hName', 'textContent', name);
  set('hdrName', 'textContent', name);
  set('profName', 'textContent', name);
}

/**
 * Zuletzt bekanntes Branding des eingeloggten Beraters. Bewusst OHNE Rückfall
 * auf die ENV-Werte: die gehören dem Haupt-Berater, und jeder andere sah beim
 * Laden sonst kurz dessen Foto und Namen im eigenen Header.
 */
export function gemerktesBranding() {
  try {
    const roh = localStorage.getItem(BRAND_CACHE_KEY);
    const d = roh ? JSON.parse(roh) : null;
    if (d && (d.foto || d.name)) return d;
  } catch (_) {}
  return { foto: '', name: '' };
}

export async function applyBeraterHeader() {
  // Sofort das zuletzt bekannte Foto setzen. Ohne das steht beim Neuladen ein
  // <img> ohne Quelle im Header, bis der Berater-Datensatz aus dem Netz da ist
  // — der Browser zeigt in dieser Zeit sein Kaputt-Bild-Symbol.
  setzeHeaderWerte(gemerktesBranding());

  const b = await getCurrentBerater();
  // Ohne eigenes Foto ein neutraler Initialen-Avatar — nicht das Foto des
  // Haupt-Beraters.
  const name = b?.name || window.ENV_BERATER_NAME || 'Berater';
  const foto = b?.foto_url || (b ? initialsAvatar(name) : (window.ENV_BERATER_FOTO || ''));
  setzeHeaderWerte({ foto, name });
  try { localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify({ foto, name })); } catch (_) {}
  return b;
}

function redirectLogin() {
  if (!window.location.pathname.endsWith('/dashboard/index.html') &&
      !window.location.pathname.endsWith('/dashboard/')) {
    window.location.href = '/dashboard/index.html';
  }
}


/* ---------- KPIs ---------- */

export async function loadKPIs() {
  if (!supabase) return { promotoren: 0, klicks: 0, gesamt: 0, kunden: 0 };

  // Phase 208: Kennzahlen rechnen ohne Testdaten.
  const [all, promoRes, klicksRes, kundenRes] = await Promise.all([
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('ist_test', false),
    supabase.from('empfehlungen').select('empfehler_name').eq('ist_test', false).not('empfehler_name', 'is', null),
    supabase.from('empfehlungen').select('link_klicks').eq('ist_test', false),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('ist_test', false).eq('status', 'kunde'),
  ]);

  const promotorenSet = new Set();
  (promoRes.data || []).forEach(r => {
    if (r.empfehler_name && r.empfehler_name.trim()) promotorenSet.add(r.empfehler_name.trim().toLowerCase());
  });
  const klicks = (klicksRes.data || []).reduce((sum, r) => sum + (r.link_klicks || 0), 0);

  return {
    promotoren: promotorenSet.size,
    klicks,
    gesamt: all.count || 0,
    kunden: kundenRes.count || 0,
  };
}


/* ---------- Listen ---------- */

/**
 * Empfehlungsliste. `bereich` ist 'mein' (Voreinstellung) oder 'team'.
 *
 * Phase 199 · Im Teamfall kommen die Empfehlungen des eigenen Astes über die
 * Datenbankfunktion team_empfehlungen. Die Leseregel auf der Tabelle bleibt
 * bewusst eng, damit die Kacheln und Trichterzahlen die eigenen bleiben.
 * Die Teamsicht liefert weniger Felder als die eigene Liste; das Bearbeiten
 * fremder Empfehlungen ist ohnehin nicht erlaubt und wird dort ausgeblendet.
 */
export async function loadEmpfehlungen({ filter = 'alle', search = '', limit = 200, bereich = 'mein' } = {}) {
  if (!supabase) return [];

  if (bereich === 'team') {
    const { getTeamEmpfehlungen } = await import('../js/supabase.js');
    const rows = await getTeamEmpfehlungen(90, limit);
    return (rows || [])
      .map((r) => ({
        id: r.id,
        empfaenger_name: r.empfaenger_name,
        status: r.status,
        interessiert: r.interessiert,
        anrufwunsch: r.anrufwunsch,
        empfehler_name: r.empfehler_name,
        created_at: r.angelegt_am,
        berater_name: r.berater_name,
        ist_test: r.ist_test === true,
        // Ohne diese beiden zeigte die Team-Ansicht bei jedem Funnel-Lead
        // "Promoter: nicht angegeben" statt der Herkunft (Phase 271).
        typ: r.typ,
        quelle: r.quelle,
        fremd: true,
      }))
      .filter((r) => (filter === 'alle' || r.status === filter)
        && (!search.trim() || String(r.empfaenger_name || '').toLowerCase().includes(search.trim().toLowerCase())));
  }

  let q = supabase
    .from('empfehlungen')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter && filter !== 'alle') q = q.eq('status', filter);
  if (search && search.trim()) q = q.ilike('empfaenger_name', `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) {
    console.error('[loadEmpfehlungen]', error);
    return [];
  }
  return data || [];
}

export async function loadRecent(limit = 10) {
  return loadEmpfehlungen({ limit });
}

export async function loadDetail(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('empfehlungen')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('[loadDetail]', error);
    return null;
  }
  return data;
}

export async function updateStatus(id, status, notiz) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  const { error } = await supabase
    .from('empfehlungen')
    .update({ status, notiz })
    .eq('id', id);
  return { error };
}

/**
 * Markiert eine Empfehlung als interessiert (Boolean-Flag, unabhängig vom Status).
 * Genutzt vom Schnell-Menü (Rechtsklick) für "Interessent".
 */
export async function setInteressiert(id, value = true) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  const { error } = await supabase
    .from('empfehlungen')
    .update({ interessiert: value })
    .eq('id', id);
  return { error };
}

/**
 * Aktualisiert Stammdaten einer Empfehlung (Name/Telefon/Thema/Notiz etc.).
 * Genutzt vom Inline-Bearbeiten-Overlay (Rechtsklick > Bearbeiten).
 * Direkter Update, gedeckt durch RLS-Policy "empfehlung auth update".
 */
export async function updateEmpfehlung(id, fields) {
  if (!supabase) return { error: { message: 'Supabase nicht konfiguriert' } };
  const { error } = await supabase
    .from('empfehlungen')
    .update(fields)
    .eq('id', id);
  return { error };
}


/* ---------- Empfehler (Phase 7) ---------- */

/**
 * Promoterliste. `bereich` ist 'mein' (Voreinstellung) oder 'team'.
 *
 * Phase 199 · Im Teamfall kommen die Promoter des eigenen Astes über die
 * Datenbankfunktion team_promoter, weil die Leseregel auf der Tabelle
 * bewusst eng bleibt: würde sie den Ast freigeben, zählte jede Kachel im
 * Portal plötzlich das ganze Team mit.
 */
export async function loadEmpfehlerList(bereich = 'mein') {
  if (!supabase) return [];
  if (bereich === 'team') {
    const { getTeamPromoter } = await import('../js/supabase.js');
    const rows = await getTeamPromoter(500);
    return (rows || []).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      email: r.email,
      telefon: r.telefon,
      ziel_stufe: null,
      created_at: r.angelegt_am,
      letzte_aktivitaet: null,
      gesamt: Number(r.empfehlungen) || 0,
      kunde: Number(r.kunden) || 0,
      berater_name: r.berater_name,
      selbst_angemeldet: r.selbst_angemeldet,
      ist_test: r.ist_test === true,
    }));
  }
  try {
    // Die Promoterliste zeigt Testpromoter mit, aber gekennzeichnet (Phase 208).
    const { data: empfehlerRows, error: e1 } = await supabase
      .from('empfehler')
      .select('id, code, name, email, telefon, ziel_stufe, created_at, ist_test')
      .order('created_at', { ascending: false });
    if (e1) throw e1;

    const { data: counts, error: e2 } = await supabase
      .from('empfehlungen')
      .select('empfehler_id, status, created_at, ist_test')
      .not('empfehler_id', 'is', null);
    if (e2) throw e2;

    // Eine Testempfehlung zählt beim Testpromoter mit und beim echten nicht.
    const istTestPromoter = new Set((empfehlerRows || []).filter(e => e.ist_test).map(e => e.id));

    const byId = new Map();
    (counts || []).forEach(r => {
      if (r.ist_test && !istTestPromoter.has(r.empfehler_id)) return;
      const m = byId.get(r.empfehler_id) || { gesamt: 0, kunde: 0, letzte_aktivitaet: null };
      m.gesamt += 1;
      if (r.status === 'kunde') m.kunde += 1;
      if (r.created_at && (!m.letzte_aktivitaet || String(r.created_at) > String(m.letzte_aktivitaet))) {
        m.letzte_aktivitaet = r.created_at;
      }
      byId.set(r.empfehler_id, m);
    });

    return (empfehlerRows || []).map(e => {
      const m = byId.get(e.id) || { gesamt: 0, kunde: 0, letzte_aktivitaet: null };
      return { ...e, gesamt: m.gesamt, kunde: m.kunde, letzte_aktivitaet: m.letzte_aktivitaet };
    });
  } catch (err) {
    console.error('[loadEmpfehlerList]', err);
    return [];
  }
}

export async function loadAktiveEmpfehlerCount() {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from('empfehler')
      .select('id', { count: 'exact', head: true })
      .eq('ist_test', false);
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('[loadAktiveEmpfehlerCount]', err);
    return 0;
  }
}


/* ---------- Funnel ---------- */

export async function loadFunnel() {
  if (!supabase) return { gesendet: 0, geoeffnet: 0, interessiert: 0, kunden: 0 };

  // Phase 208: Der Trichter rechnet ohne Testdaten.
  const [g, o, i, k] = await Promise.all([
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('ist_test', false),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true })
      .eq('ist_test', false)
      .or('link_geoeffnet.eq.true,interessiert.eq.true,status.eq.kunde'),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true })
      .eq('ist_test', false)
      .or('interessiert.eq.true,status.eq.kunde'),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('ist_test', false).eq('status', 'kunde'),
  ]);

  return {
    gesendet: g.count || 0,
    geoeffnet: o.count || 0,
    interessiert: i.count || 0,
    kunden: k.count || 0,
  };
}


/* ---------- 7-Tage-Chart ---------- */

export async function loadLast7Days() {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({ date: new Date(d), count: 0 });
  }

  if (!supabase) return out;

  const since = new Date(today);
  since.setDate(today.getDate() - 6);
  const { data, error } = await supabase
    .from('empfehlungen')
    .select('created_at')
    .eq('ist_test', false)
    .gte('created_at', since.toISOString());

  if (error || !data) return out;

  data.forEach(r => {
    const ts = parseDbDate(r.created_at);
    ts.setHours(0, 0, 0, 0);
    const idx = out.findIndex(d => d.date.getTime() === ts.getTime());
    if (idx !== -1) out[idx].count += 1;
  });

  return out;
}


/* ---------- Formatter ---------- */

export function formatDate(ts) {
  if (!ts) return '—';
  const d = parseDbDate(ts);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

export function formatDateShort(ts) {
  if (!ts) return '—';
  const d = parseDbDate(ts);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

const STATUS_LABEL = {
  offen: 'Offen',
  anrufwunsch: 'Anrufwunsch',
  kontaktiert: 'Kontaktiert',
  kunde: 'Kunde',
  kein_interesse: 'Kein Interesse',
};

export function getStatusBadge(status) {
  const s = status || 'offen';
  const label = STATUS_LABEL[s] || s;
  return `<span class="badge badge-${s}">${label}</span>`;
}

export function statusLabel(status) {
  return STATUS_LABEL[status || 'offen'] || status;
}


/* ---------- Toast ---------- */

export function toast(text, ms = 2200) {
  let el = document.getElementById('toastDash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastDash';
    el.className = 'toast-dash';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}


/* ---------- Phone helper ---------- */

export function whatsappLink(phone) {
  const cleaned = (phone || '').replace(/[^\d+]/g, '').replace(/^00/, '+').replace(/^\+/, '');
  return `https://wa.me/${cleaned}`;
}
