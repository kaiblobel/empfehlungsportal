import { supabase } from '../js/supabase.js';

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
  if (supabase) await supabase.auth.signOut();
  window.location.href = 'index.html';
}

function redirectLogin() {
  if (!window.location.pathname.endsWith('/dashboard/index.html') &&
      !window.location.pathname.endsWith('/dashboard/')) {
    window.location.href = 'index.html';
  }
}


/* ---------- KPIs ---------- */

export async function loadKPIs() {
  if (!supabase) return { promotoren: 0, klicks: 0, gesamt: 0, kunden: 0 };

  const [all, promoRes, klicksRes, kundenRes] = await Promise.all([
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }),
    supabase.from('empfehlungen').select('empfehler_name').not('empfehler_name', 'is', null),
    supabase.from('empfehlungen').select('link_klicks'),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('status', 'kunde'),
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

export async function loadEmpfehlungen({ filter = 'alle', search = '', limit = 200 } = {}) {
  if (!supabase) return [];
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


/* ---------- Empfehler (Phase 7) ---------- */

export async function loadEmpfehlerList() {
  if (!supabase) return [];
  try {
    const { data: empfehlerRows, error: e1 } = await supabase
      .from('empfehler')
      .select('id, code, name, email, telefon, created_at')
      .order('created_at', { ascending: false });
    if (e1) throw e1;

    const { data: counts, error: e2 } = await supabase
      .from('empfehlungen')
      .select('empfehler_id, status')
      .not('empfehler_id', 'is', null);
    if (e2) throw e2;

    const byId = new Map();
    (counts || []).forEach(r => {
      const m = byId.get(r.empfehler_id) || { gesamt: 0, kunde: 0 };
      m.gesamt += 1;
      if (r.status === 'kunde') m.kunde += 1;
      byId.set(r.empfehler_id, m);
    });

    return (empfehlerRows || []).map(e => {
      const m = byId.get(e.id) || { gesamt: 0, kunde: 0 };
      return { ...e, gesamt: m.gesamt, kunde: m.kunde };
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
      .select('id', { count: 'exact', head: true });
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

  const [g, o, i, k] = await Promise.all([
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('link_geoeffnet', true),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('interessiert', true),
    supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('status', 'kunde'),
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
    .gte('created_at', since.toISOString());

  if (error || !data) return out;

  data.forEach(r => {
    const ts = new Date(r.created_at);
    ts.setHours(0, 0, 0, 0);
    const idx = out.findIndex(d => d.date.getTime() === ts.getTime());
    if (idx !== -1) out[idx].count += 1;
  });

  return out;
}


/* ---------- Formatter ---------- */

export function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
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
  const d = new Date(ts);
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
