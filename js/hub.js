import { supabase } from './supabase.js';
import { requireAuth, logout, formatDate, loadFunnel } from './dashboard.js';
import { icon, hydrateIcons } from './icons.js';
import { watchHotLeads } from './hot-lead-watcher.js';

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('hPhoto').src = window.ENV_BERATER_FOTO || '';
document.getElementById('hName').textContent = window.ENV_BERATER_NAME || 'Berater';

const NOW = new Date();
const HOUR = NOW.getHours();

const LAST_VISIT_KEY = 'hubLastVisit';
const RANGE_KEY = 'hubFilterRange';
const previousVisitTs = parseInt(localStorage.getItem(LAST_VISIT_KEY) || '0', 10);
localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
let currentRange = parseInt(sessionStorage.getItem(RANGE_KEY) || '30', 10);

(async () => {
  const session = await requireAuth();
  if (!session) return;

  setGreeting();
  startClock();
  hydrateIcons();
  initFilterChips();

  const [kpiRows, kpiSubs, heroStats, hotLeads, timelineEvents, funnel, topPromoters, trendRows] = await Promise.all([
    loadKPIs(),
    loadKPISubStats(),
    loadHeroStats(),
    loadHotLeads(),
    loadTimelineEvents(),
    loadFunnel(),
    loadTopPromoters(),
    loadTrend(currentRange),
  ]);

  renderKPIs(kpiRows, kpiSubs);
  renderHeroStats(heroStats);
  renderHotLeads(hotLeads);
  renderFunnel(funnel);
  renderTopPromoters(topPromoters);
  renderTimeline(timelineEvents);
  renderTrendChart(trendRows);

  // Realtime Hot-Lead-Watcher (Phase 18)
  watchHotLeads({
    onChange: async () => {
      const fresh = await loadHotLeads();
      renderHotLeads(fresh);
    },
  });

  // Realtime Hub-Stream (Phase 29) — Timeline live aktualisieren
  startHubStream();
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

  // Trend-Sub-Stats (Phase 17 · Snapshot-basiert)
  if (subs) {
    const sub = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    sub('subEmpfehler', formatTrend(subs.empfehler));
    sub('subKlicks',    formatTrend(subs.klicks));
    sub('subGesamt',    formatTrend(subs.gesamt));
    sub('subKunden',    formatTrend(subs.kunden));
  }
}

function formatTrend(t) {
  if (!t || t.base === null) return 'noch keine Vergleichswerte';
  const diff = t.curr - t.base;
  if (diff === 0) return 'stabil zur Vorwoche';
  if (t.base === 0 && diff > 0) return `<strong>+${diff}</strong> diese Woche`;
  if (t.base === 0) return 'noch keine Vergleichswerte';
  const pct = Math.round((diff / t.base) * 100);
  const arrow = diff > 0 ? '↑' : '↓';
  return `<strong>${arrow} ${Math.abs(pct)}%</strong> vs. Vorwoche`;
}

/* ---------- KPI Sub-Stats (Phase 17 · Trend-Vergleich via Snapshot-Tabelle) ---------- */
async function loadKPISubStats() {
  try {
    const { data, error } = await supabase.rpc('kpi_trend', { days_back: 7 });
    if (error || !data || !data.length) return null;
    const row = data[0];
    if (row.baseline_day === null) return null;
    return {
      empfehler: { curr: row.curr_aktive_empfehler,    base: row.base_aktive_empfehler },
      klicks:    { curr: row.curr_link_klicks,         base: row.base_link_klicks },
      gesamt:    { curr: row.curr_empfehlungen_gesamt, base: row.base_empfehlungen_gesamt },
      kunden:    { curr: row.curr_kunden,              base: row.base_kunden },
    };
  } catch (e) {
    console.warn('[loadKPISubStats trend]', e);
    return null;
  }
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
      .select('id, empfaenger_name, status, anrufwunsch, anrufwunsch_at, interessiert, interessiert_at, link_geoeffnet_at, created_at')
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
    const heat = heatScore(r);
    const heatTitle = heatTitleFor(heat);
    return `
      <div class="h-lead ${cls}">
        <span class="h-lead-dot"></span>
        <div class="h-lead-body">
          <h3 class="h-lead-name">${heat ? `<span class="h-lead-heat" title="${heatTitle}">${heat}</span> ` : ''}${escapeHtml(r.empfaenger_name || '–')}</h3>
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

function heatScore(r) {
  if (!r.link_geoeffnet_at || !r._ts) return '';
  const openedAt = new Date(r.link_geoeffnet_at).getTime();
  const delta = r._ts - openedAt;
  if (delta < 0) return '';
  const hr = delta / 3600000;
  if (hr < 1) return '🔥🔥🔥';
  if (hr < 24) return '🔥🔥';
  if (hr < 72) return '🔥';
  return '';
}
function heatTitleFor(h) {
  if (h === '🔥🔥🔥') return 'Sofort-Reaktion (< 1h nach Öffnen)';
  if (h === '🔥🔥') return 'Schnelle Reaktion (< 24h)';
  if (h === '🔥') return 'Reaktion innerhalb 3 Tagen';
  return '';
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
  wrap.innerHTML = events.map(e => {
    const isNew = previousVisitTs > 0 && e.ts > previousVisitTs;
    return `
    <a class="h-tl-row" href="dashboard/detail.html?id=${e.id}">
      <div class="h-tl-time">${timelineTime(e.ts)}</div>
      <div class="h-tl-axis"><span class="h-tl-dot ${e.kind}"></span></div>
      <div class="h-tl-text"><strong>${escapeHtml(e.name)}</strong> ${e.text}${isNew ? '<span class="h-badge-new">NEU</span>' : ''}</div>
    </a>`;
  }).join('') +
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

/* ---------- Phase 29 · Trend-Chart ---------- */
let trendChartInstance = null;

async function loadTrend(daysBack) {
  try {
    const { data, error } = await supabase.rpc('kpi_trend_daily', { days_back: daysBack });
    if (error || !data) return [];
    return data;
  } catch { return []; }
}

function renderTrendChart(rows) {
  const canvas = document.getElementById('hTrendChart');
  if (!canvas || !window.Chart) return;
  if (!rows.length) return;

  const labels = rows.map(r => {
    const d = new Date(r.day);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  });
  const datasets = [
    { label: 'Aktive Empfehler', data: rows.map(r => r.aktive_empfehler),    borderColor: '#C9B98A', backgroundColor: 'rgba(201,185,138,0.08)', tension: 0.35, borderWidth: 2,   pointRadius: 0, pointHoverRadius: 5, fill: true  },
    { label: 'Link-Klicks',      data: rows.map(r => r.link_klicks),         borderColor: '#7A8B6F', backgroundColor: 'rgba(122,139,111,0.06)', tension: 0.35, borderWidth: 2,   pointRadius: 0, pointHoverRadius: 5, fill: false },
    { label: 'Empfehlungen',     data: rows.map(r => r.empfehlungen_gesamt), borderColor: '#C28447', backgroundColor: 'rgba(194,132,71,0.06)',  tension: 0.35, borderWidth: 2,   pointRadius: 0, pointHoverRadius: 5, fill: false },
    { label: 'Kunden',           data: rows.map(r => r.kunden),              borderColor: '#2E5266', backgroundColor: 'rgba(46,82,102,0.06)',   tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, fill: false },
  ];

  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleFont: { family: 'Inter, sans-serif', size: 11, weight: '600' },
          bodyFont:  { family: 'Inter, sans-serif', size: 12 },
          padding: 10, cornerRadius: 6, displayColors: true, boxPadding: 4,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6B6660', font: { family: 'Inter, sans-serif', size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          border: { color: '#E8E5E0' },
        },
        y: {
          grid: { color: '#F0EDE8', drawBorder: false },
          ticks: { color: '#6B6660', font: { family: 'Inter, sans-serif', size: 10 }, padding: 8 },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ---------- Phase 29 · Filter-Chips ---------- */
function initFilterChips() {
  const row = document.getElementById('hFilterRow');
  if (!row) return;
  row.querySelectorAll('.h-chip').forEach(chip => {
    const r = parseInt(chip.dataset.range, 10);
    chip.classList.toggle('active', r === currentRange);
    chip.addEventListener('click', async () => {
      const newRange = parseInt(chip.dataset.range, 10);
      if (newRange === currentRange) return;
      currentRange = newRange;
      sessionStorage.setItem(RANGE_KEY, String(newRange));
      row.querySelectorAll('.h-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const label = document.getElementById('hChartRangeLabel');
      if (label) label.textContent = `Letzte ${newRange} Tage`;
      const rows = await loadTrend(newRange);
      renderTrendChart(rows);
    });
  });
  // Label initial setzen falls aus Session restored
  const label = document.getElementById('hChartRangeLabel');
  if (label) label.textContent = `Letzte ${currentRange} Tage`;
}

/* ---------- Phase 29 · Realtime Hub-Stream ---------- */
function startHubStream() {
  try {
    supabase
      .channel('hub-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'empfehlungen' }, async () => {
        const fresh = await loadTimelineEvents();
        renderTimeline(fresh);
        toast('Neue Empfehlung eingetroffen');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'empfehlungen' }, async (payload) => {
        const before = payload.old || {};
        const after  = payload.new || {};
        const changedTimeline =
          (before.link_geoeffnet_at !== after.link_geoeffnet_at) ||
          (before.interessiert_at   !== after.interessiert_at)   ||
          (before.anrufwunsch_at    !== after.anrufwunsch_at)    ||
          (before.status            !== after.status);
        if (!changedTimeline) return;
        const fresh = await loadTimelineEvents();
        renderTimeline(fresh);
      })
      .subscribe();
  } catch (e) {
    console.warn('[hub-stream]', e);
  }
}
