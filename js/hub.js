import { supabase } from './supabase.js';
import { requireAuth, logout, formatDate, getStatusBadge } from './dashboard.js';

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('hPhoto').src = window.ENV_BERATER_FOTO || '';
document.getElementById('hName').textContent = window.ENV_BERATER_NAME || 'Berater';

const NOW = new Date();
const HOUR = NOW.getHours();
const TEST_TOKEN = 'd127cf3f-2d6b-4cd7-9640-64a0941e11ac';
const SUPABASE_PROJECT = 'kkseqhmfubzfyloffkwe';

(async () => {
  const session = await requireAuth();
  if (!session) return;

  setGreeting();
  fillDevSection(session);

  // Daten parallel laden
  const [kpiRows, heroStats, feed] = await Promise.all([
    loadKPIs(),
    loadHeroStats(),
    loadRecentFeed(),
  ]);

  renderKPIs(kpiRows);
  renderHeroStats(heroStats);
  renderFeed(feed);
  pingStatus();
})();

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
function renderKPIs([empfehler, klicks, gesamt, kunden]) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    el.innerHTML = v === null ? '—' : String(v);
  };
  set('kpiEmpfehler', empfehler);
  set('kpiKlicks', klicks);
  set('kpiGesamt', gesamt);
  set('kpiKunden', kunden);
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

/* ---------- Feed ---------- */
async function loadRecentFeed() {
  try {
    const { data } = await supabase
      .from('empfehlungen')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    return data || [];
  } catch { return []; }
}
function renderFeed(list) {
  const wrap = document.getElementById('hFeed');
  if (!list.length) {
    wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:14px;">Noch keine Empfehlungen.</div>';
    return;
  }
  wrap.innerHTML = list.map(r => {
    const status = r.status || 'offen';
    return `
      <a class="h-feed-row" href="dashboard/detail.html?id=${r.id}">
        <span class="h-feed-dot h-feed-dot-${status}"></span>
        <div class="h-feed-main">
          <div class="h-feed-name">${escapeHtml(r.empfaenger_name || '–')}</div>
          <div class="h-feed-meta">
            ${getStatusBadge(status)}
            <span>${relativeTime(r.created_at)}</span>
          </div>
        </div>
        <span class="arrow">›</span>
      </a>`;
  }).join('') + '<a class="h-feed-all" href="dashboard/empfehlungen.html">Alle anzeigen →</a>';
}

/* ---------- Status Pings ---------- */
async function pingStatus() {
  const check = async (url) => {
    try {
      // no-cors: opaque response, throw nur bei DNS/Connection-Fail
      await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', redirect: 'follow' });
      return true;
    } catch { return false; }
  };
  const [vercel, supa, gh] = await Promise.all([
    check('https://empfehlungsportal.vercel.app/'),
    check(`https://${SUPABASE_PROJECT}.supabase.co/`),
    check('https://github.com/kaiblobel/empfehlungsportal'),
  ]);
  setStatus('statusVercel', vercel);
  setStatus('statusSupabase', supa);
  setStatus('statusGithub', gh);
  // Telegram bleibt unknown
}
function setStatus(id, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  if (ok) { el.textContent = '🟢 Online'; el.className = 'status ok'; }
  else    { el.textContent = '🔴 Offline'; el.className = 'status fail'; }
}

/* ---------- Dev Section ---------- */
function fillDevSection(session) {
  const email = session?.user?.email || '—';
  const expiry = session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString('de-DE') : '—';
  const userId = session?.user?.id || '—';
  document.getElementById('devEmail').textContent = email;
  document.getElementById('devExpiry').textContent = expiry;
  document.getElementById('devUserId').textContent = userId;
}

/* ---------- Toast ---------- */
const toastEl = document.getElementById('hToast');
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// "BALD VERFÜGBAR"-Tiles
document.querySelectorAll('.h-tile.disabled').forEach(t => {
  t.addEventListener('click', (e) => {
    e.preventDefault();
    toast('Kommt bald.');
  });
});

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function relativeTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'gerade eben';
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} Min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} Std`;
  const days = Math.floor(sec / 86400);
  if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return formatDate(ts);
}
