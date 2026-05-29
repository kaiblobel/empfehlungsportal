import { supabase } from './supabase.js';
import { requireAuth, logout, formatDate, loadFunnel } from './dashboard.js';
import { icon, hydrateIcons } from './icons.js';

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('hPhoto').src = window.ENV_BERATER_FOTO || '';
document.getElementById('hName').textContent = window.ENV_BERATER_NAME || 'Berater';

const NOW = new Date();
const HOUR = NOW.getHours();

(async () => {
  const session = await requireAuth();
  if (!session) return;

  setGreeting();
  startClock();
  hydrateIcons();

  const [kpiRows, kpiSubs, heroStats, hotLeads, timelineEvents, funnel, topPromoters] = await Promise.all([
    loadKPIs(),
    loadKPISubStats(),
    loadHeroStats(),
    loadHotLeads(),
    loadTimelineEvents(),
    loadFunnel(),
    loadTopPromoters(),
  ]);

  renderKPIs(kpiRows, kpiSubs);
  renderHeroStats(heroStats);
  renderHotLeads(hotLeads);
  renderFunnel(funnel);
  renderTopPromoters(topPromoters);
  renderTimeline(timelineEvents);
})();

/* ---------- Header Clock ---------- */
function startClock() {
  const el = document.getElementById('hClock');
  if (!el) return;
  const tick = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `${hh}:${mm}`;
  };
  tick();
  setInterval(tick, 1000 * 30); // alle 30s aktualisieren
}

/* ---------- Greeting ---------- */
function setGreeting() {
  const greetEl = document.getElementById('hGreet');
  const name = (window.ENV_BERATER_NAME || 'Kai').split(' ')[0];
  let prefix;
  if (HOUR >= 5 && HOUR < 11) prefix = 'Guten Morgen';
  else if (HOUR >= 11 && HOUR < 17) prefix = 'Guten Tag';
  else if (HOUR >= 17 && HOUR < 22) prefix = 'Guten Abend';
  else prefix = 'Noch wach';
  greetEl.textContent = `${prefix}, ${name}.`;
}

/* ---------- KPIs ---------- */
async function loadKPIs() {
  const safeCount = async (q) => {
    try { const { count } = await q; return count ?? 0; } catch { return null; }
  };
  const safeSum = async () => {
    try {
      const { data } = await supabase.from('empfehlungen').select('link_klicks');
      return (data || []).reduce((s, r) => s + (r.link_klicks || 0), 0);
    } catch { return null; }
  };
  return Promise.all([
    safeCount(supabase.from('empfehler').select('id', { count: 'exact', head: true })),
    safeSum(),
    safeCount(supabase.from('empfehlungen').select('id', { count: 'exact', head: true })),
    safeCount(supabase.from('empfehlungen').select('id', { count: 'exact', head: true }).eq('status', 'kunde')),
  ]);
}
function renderKPIs([empfehler, klicks, gesamt, kunden], subs) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    el.innerHTML = v === null ? '—' : String(v);
  };
  set('kpiEmpfehler', empfehler);
  set('kpiKlicks', klicks);
  set('kpiGesamt', gesamt);
  set('kpiKunden', kunden);

  // Sub-Stats
  if (subs) {
    const sub = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    sub('subEmpfehler', subs.empfehler ? `<strong>+${subs.empfehler}</strong> diese Woche` : 'noch keine diese Woche');
    sub('subKlicks',    subs.klicks    ? `<strong>${subs.klicks}</strong> heute`           : 'noch keine heute');
    sub('subGesamt',    subs.gesamt    ? `<strong>${subs.gesamt}</strong> diese Woche`    : 'noch keine diese Woche');
    sub('subKunden',    subs.kunden    ? `<strong>+${subs.kunden}</strong> diese Woche`   : 'noch keine diese Woche');
  }
}

/* ---------- KPI Sub-Stats ---------- */
async function loadKPISubStats() {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const safe = async (q) => { try { const { count } = await q; return count ?? 0; } catch { return 0; } };
  const sumKlicks = async () => {
    try {
      const { data } = await supabase.from('empfehlungen')
        .select('link_klicks, link_geoeffnet_at')
        .gte('link_geoeffnet_at', todayStart.toISOString());
      return (data || []).reduce((s, r) => s + (r.link_klicks || 0), 0);
    } catch { return 0; }
  };
  const [empfehler, klicks, gesamt, kunden] = await Promise.all([
    safe(supabase.from('empfehler').select('id', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())),
    sumKlicks(),
    safe(supabase.from('empfehlungen').select('id', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())),
    safe(supabase.from('empfehlungen').select('id', { count: 'exact', head: true })
      .eq('status', 'kunde').gte('created_at', weekStart.toISOString())),
  ]);
  return { empfehler, klicks, gesamt, kunden };
}

/* ---------- Hero Stats Text ---------- */
async function loadHeroStats() {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);

  const safe = async (q) => { try { const { count } = await q; return count ?? 0; } catch { return 0; } };
  const [opened, anruf, kunden] = await Promise.all([
    safe(supabase.from('empfehlungen').select('id', { count: 'exact', head: true })
      .gte('link_geoeffnet_at', todayStart.toISOString())),
    safe(supabase.from('empfehlungen').select('id', { count: 'exact', head: true })
      .not('anrufwunsch', 'is', null)
      .gte('anrufwunsch_at', todayStart.toISOString())),
    safe(supabase.from('empfehlungen').select('id', { count: 'exact', head: true })
      .eq('status', 'kunde')
      .gte('created_at', weekStart.toISOString())),
  ]);
  return { opened, anruf, kunden };
}
function renderHeroStats({ opened, anruf, kunden }) {
  const el = document.getElementById('hStats');
  if (!opened && !anruf && !kunden) {
    el.innerHTML = 'Dein Empfehlungssystem läuft.';
    return;
  }
  const parts = [];
  if (opened) parts.push(`Heute wurden <strong>${opened} ${opened === 1 ? 'Empfehlung' : 'Empfehlungen'}</strong> geöffnet`);
  if (anruf)  parts.push(`<strong>${anruf} ${anruf === 1 ? 'neuer Anrufwunsch' : 'neue Anrufwünsche'}</strong>`);
  if (kunden) parts.push(`<strong>${kunden} ${kunden === 1 ? 'neuer Kunde' : 'neue Kunden'}</strong> diese Woche`);
  el.innerHTML = parts.join(', ') + '.';
}

/* ---------- Hot Leads ---------- */
async function loadHotLeads() {
  try {
    const { data } = await supabase
      .from('empfehlungen')
      .select('id, empfaenger_name, status, anrufwunsch, anrufwunsch_at, interessiert, interessiert_at, created_at')
      .or('status.eq.anrufwunsch,interessiert.eq.true')
      .not('status', 'in', '(kontaktiert,kunde,kein_interesse)')
      .limit(20);
    if (!data) return [];
    return data
      .map(r => {
        const isCall = r.status === 'anrufwunsch';
        const eventAt = isCall ? r.anrufwunsch_at : (r.interessiert_at || r.created_at);
        return { ...r, _ts: eventAt ? new Date(eventAt).getTime() : 0, _kind: isCall ? 'anrufwunsch' : 'interesse' };
      })
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 5);
  } catch { return []; }
}

function renderHotLeads(list) {
  const wrap = document.getElementById('hHotLeads');
  const label = document.getElementById('hHotLabel');
  if (!list.length) {
    if (label) label.textContent = 'Status';
    wrap.innerHTML = `
      <div class="h-empty-positive">
        <strong>Keine offenen Hot Leads.</strong> Alles unter Kontrolle.
      </div>`;
    return;
  }
  if (label) label.textContent = 'Aufmerksamkeit erforderlich';
  wrap.innerHTML = list.map(r => {
    const cls = r._kind;
    const labelTxt = cls === 'anrufwunsch' ? 'Anrufwunsch' : 'Interesse bekundet';
    const detail = cls === 'anrufwunsch' && r.anrufwunsch
      ? `${escapeHtml(r.anrufwunsch)}`
      : '';
    return `
      <div class="h-lead ${cls}">
        <span class="h-lead-dot"></span>
        <div class="h-lead-body">
          <h3 class="h-lead-name">${escapeHtml(r.empfaenger_name || '–')}</h3>
          <div class="h-lead-meta">
            <span class="label ${cls}">${labelTxt}</span>
            ${detail ? `<span>${detail}</span>` : ''}
            <span>${relativeTime(r._ts)}</span>
          </div>
        </div>
        <a class="h-lead-cta" href="dashboard/detail.html?id=${r.id}">Jetzt öffnen</a>
      </div>`;
  }).join('');
}

/* ---------- Activity Timeline ---------- */
async function loadTimelineEvents() {
  try {
    const { data } = await supabase
      .from('empfehlungen')
      .select('id, empfaenger_name, status, anrufwunsch, anrufwunsch_at, interessiert_at, link_geoeffnet_at, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    if (!data) return [];
    const events = [];
    data.forEach(r => {
      const name = r.empfaenger_name || '–';
      if (r.created_at)        events.push({ id: r.id, ts: new Date(r.created_at).getTime(),        kind: 'created',  name, text: 'wurde empfohlen' });
      if (r.link_geoeffnet_at) events.push({ id: r.id, ts: new Date(r.link_geoeffnet_at).getTime(), kind: 'opened',   name, text: 'hat die Empfehlung geöffnet' });
      if (r.interessiert_at)   events.push({ id: r.id, ts: new Date(r.interessiert_at).getTime(),   kind: 'interest', name, text: 'hat Interesse bekundet' });
      if (r.anrufwunsch_at)    events.push({ id: r.id, ts: new Date(r.anrufwunsch_at).getTime(),    kind: 'call',     name, text: `hat einen Anrufwunsch hinterlegt${r.anrufwunsch ? ' · ' + r.anrufwunsch : ''}` });
    });
    return events.sort((a, b) => b.ts - a.ts).slice(0, 8);
  } catch { return []; }
}

function renderTimeline(events) {
  const wrap = document.getElementById('hTimeline');
  if (!events.length) {
    wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:14px;">Noch keine Aktivität.</div>';
    return;
  }
  wrap.innerHTML = events.map(e => `
    <a class="h-tl-row" href="dashboard/detail.html?id=${e.id}">
      <div class="h-tl-time">${timelineTime(e.ts)}</div>
      <div class="h-tl-axis"><span class="h-tl-dot ${e.kind}"></span></div>
      <div class="h-tl-text"><strong>${escapeHtml(e.name)}</strong> ${e.text}</div>
    </a>`).join('') +
    '<a class="h-tl-all" href="dashboard/empfehlungen.html">Alle anzeigen →</a>';
}

function timelineTime(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const sec = Math.floor((now - ts) / 1000);
  if (sec < 60) return 'jetzt';
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} Min`;
  // Heute → HH:MM, sonst kurze Datum
  const today = new Date(); today.setHours(0,0,0,0);
  if (d.getTime() >= today.getTime()) {
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.`;
}

/* ---------- Funnel ---------- */
function renderFunnel(f) {
  const wrap = document.getElementById('hFunnel');
  if (!wrap) return;
  const stages = [
    { label: 'Gesendet',  count: f.gesendet,     base: f.gesendet },
    { label: 'Geöffnet',  count: f.geoeffnet,    base: f.gesendet },
    { label: 'Interesse', count: f.interessiert, base: f.geoeffnet },
    { label: 'Kunde',     count: f.kunden,       base: f.interessiert, gold: true },
  ];
  const max = Math.max(1, f.gesendet);
  wrap.innerHTML = stages.map((s, i) => {
    const w = (s.count / max) * 100;
    const pct = s.base > 0 && i > 0 ? Math.round((s.count / s.base) * 100) + '%' : '';
    return `
      <div class="h-funnel-row${s.gold ? ' gold' : ''}">
        <div class="h-funnel-label">${s.label}</div>
        <div class="h-funnel-track"><div class="h-funnel-bar" style="width:${w}%"></div></div>
        <div class="h-funnel-count">${s.count}</div>
        <div class="h-funnel-pct">${pct}</div>
      </div>`;
  }).join('');
}

/* ---------- Top-Empfehler ---------- */
async function loadTopPromoters() {
  try {
    const { data } = await supabase
      .from('empfehlungen')
      .select('empfehler_name, status')
      .not('empfehler_name', 'is', null);
    if (!data) return [];
    const tally = new Map();
    for (const row of data) {
      const key = (row.empfehler_name || '').trim();
      if (!key) continue;
      const t = tally.get(key) || { name: key, gesamt: 0, kunde: 0 };
      t.gesamt++;
      if (row.status === 'kunde') t.kunde++;
      tally.set(key, t);
    }
    return Array.from(tally.values())
      .sort((a, b) => (b.kunde - a.kunde) || (b.gesamt - a.gesamt))
      .slice(0, 3);
  } catch { return []; }
}

function renderTopPromoters(rows) {
  const wrap = document.getElementById('hPromoters');
  if (!wrap) return;
  if (!rows.length) {
    wrap.innerHTML = `<div class="h-empty-positive">Noch keine Empfehler. Sobald Empfehlungen reinkommen, erscheinen hier deine Champions.</div>`;
    return;
  }
  const ranks = ['gold', 'silber', 'bronze'];
  wrap.innerHTML = rows.map((p, i) => `
    <a class="h-promoter h-promoter-${ranks[i]}" href="dashboard/empfehler.html">
      <span class="h-promoter-rank">${icon('Trophy', { size: 18 })}</span>
      <span class="h-promoter-body">
        <span class="h-promoter-name">${escapeHtml(p.name)}</span>
        <span class="h-promoter-meta">${p.gesamt} Empfehlung${p.gesamt !== 1 ? 'en' : ''}${p.kunde ? ` · ${p.kunde} Kunde${p.kunde !== 1 ? 'n' : ''}` : ''}</span>
      </span>
    </a>`).join('');
}

/* ---------- Toast ---------- */
const toastEl = document.getElementById('hToast');
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function relativeTime(ts) {
  if (!ts) return '';
  const tsMs = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const sec = Math.floor((Date.now() - tsMs) / 1000);
  if (sec < 60) return 'gerade eben';
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} Min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} Std`;
  const days = Math.floor(sec / 86400);
  if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return formatDate(new Date(tsMs).toISOString());
}
