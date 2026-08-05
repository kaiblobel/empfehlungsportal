/**
 * Phase 141 · Teamübersicht
 * Aggregierte Teamkennzahlen und datensparsame Aktivität ohne Kundendaten.
 */
import { getTeamActivitySecure, getTeamMetrics } from './supabase.js';
import { requireAuth, logout, applyBeraterHeader } from './dashboard.js';
import { icon, hydrateIcons } from './icons.js';
import { parseDbDate } from './date-utils.js';

const range = document.getElementById('teamRange');
const membersEl = document.getElementById('teamMembers');
const detailEl = document.getElementById('teamDetail');
const activityEl = document.getElementById('teamActivity');
const errorEl = document.getElementById('teamError');

let currentDays = 30;
let metrics = [];
let activity = [];
let selectedId = null;

document.getElementById('logoutBtn')?.addEventListener('click', logout);
range?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-days]');
  if (!button) return;
  const days = Number(button.dataset.days);
  if (![7, 30, 90].includes(days) || days === currentDays) return;
  currentDays = days;
  range.querySelectorAll('[data-days]').forEach((item) => item.classList.toggle('active', item === button));
  loadTeam();
});

(async () => {
  const session = await requireAuth();
  if (!session) return;
  await applyBeraterHeader();
  hydrateIcons();
  await loadTeam();
})();

async function loadTeam() {
  setLoading(true);
  errorEl.hidden = true;
  const [metricRows, activityRows] = await Promise.all([
    getTeamMetrics(currentDays),
    getTeamActivitySecure(currentDays),
  ]);
  metrics = metricRows || [];
  activity = activityRows || [];

  if (!metrics.length) {
    setLoading(false);
    renderEmpty();
    return;
  }

  if (!metrics.some((row) => row.berater_id === selectedId)) selectedId = metrics[0].berater_id;
  renderTeamKPIs();
  renderMembers();
  renderDetail();
  renderActivity();
  hydrateIcons();
}

function setLoading(isLoading) {
  if (!isLoading) return;
  membersEl.innerHTML = '<div class="team-member-skeleton"></div><div class="team-member-skeleton"></div>';
  detailEl.hidden = true;
  activityEl.innerHTML = '<div class="team-activity-skeleton"></div><div class="team-activity-skeleton"></div><div class="team-activity-skeleton"></div>';
}

function renderEmpty() {
  setText('teamPromoters', '—');
  setText('teamClicks', '—');
  setText('teamReferrals', '—');
  setText('teamCustomers', '—');
  setText('teamConversion', '— Umwandlung');
  membersEl.innerHTML = '';
  activityEl.innerHTML = '<div class="team-empty">Noch keine Teamaktivität im gewählten Zeitraum.</div>';
  errorEl.hidden = false;
  errorEl.textContent = 'Die sicheren Teamkennzahlen sind noch nicht freigeschaltet. Es wurden keine fremden Beraterdaten geladen.';
}

function renderTeamKPIs() {
  const totals = metrics.reduce((sum, row) => ({
    promoters: sum.promoters + number(row.aktive_promoter),
    clicks: sum.clicks + number(row.link_klicks),
    referrals: sum.referrals + number(row.empfehlungen),
    customers: sum.customers + number(row.kunden),
  }), { promoters: 0, clicks: 0, referrals: 0, customers: 0 });
  const conversion = totals.referrals ? Math.round((totals.customers / totals.referrals) * 100) : 0;
  setText('teamPromoters', totals.promoters);
  setText('teamClicks', totals.clicks);
  setText('teamReferrals', totals.referrals);
  setText('teamCustomers', totals.customers);
  setText('teamPromoterNote', `${metrics.length} aktive Berater`);
  setText('teamConversion', `${conversion} % Umwandlung`);
}

function renderMembers() {
  membersEl.innerHTML = metrics.map((row) => `
    <button class="team-member${row.berater_id === selectedId ? ' active' : ''}" type="button" data-member-id="${escapeAttr(row.berater_id)}">
      <span class="team-member-head">
        ${avatar(row, 'team-member-avatar')}
        <span class="team-member-identity"><strong>${escapeHtml(row.berater_name || 'Berater')}</strong><span>${escapeHtml(row.berater_rolle || 'Berater')} · ${lastSeen(row.last_seen)}</span></span>
        <span class="team-member-status" title="Aktiver Berater"></span>
      </span>
      <span class="team-member-metrics">
        ${miniMetric(row.aktive_promoter, 'Promoter')}
        ${miniMetric(row.link_klicks, 'Klicks')}
        ${miniMetric(row.empfehlungen, 'Empfehlungen')}
        ${miniMetric(row.kunden, 'Kunden')}
      </span>
      <span class="team-member-more">Entwicklung ansehen ${icon('ArrowRight', { size: 14 })}</span>
    </button>
  `).join('');

  membersEl.querySelectorAll('[data-member-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.memberId;
      renderMembers();
      renderDetail();
      hydrateIcons();
    });
  });
}

function renderDetail() {
  const row = metrics.find((item) => item.berater_id === selectedId);
  if (!row) { detailEl.hidden = true; return; }
  const referrals = number(row.empfehlungen);
  const customers = number(row.kunden);
  const conversion = referrals ? Math.round((customers / referrals) * 100) : 0;
  const personalActivity = activity.filter((item) => item.berater_id === row.berater_id).slice(0, 4);

  detailEl.hidden = false;
  detailEl.innerHTML = `
    <header class="team-detail-head">
      ${avatar(row, 'team-detail-avatar')}
      <div><div class="h-label">Persönliche Entwicklung · ${currentDays} Tage</div><h3>${escapeHtml(row.berater_name || 'Berater')}</h3><p>${escapeHtml(row.berater_rolle || 'Berater')} · ${lastSeen(row.last_seen)}</p></div>
    </header>
    <div class="team-detail-grid">
      <div>
        <div class="team-detail-metrics">
          ${detailMetric(row.aktive_promoter, 'Aktive Promoter')}
          ${detailMetric(row.link_klicks, 'Link-Klicks')}
          ${detailMetric(row.empfehlungen, 'Empfehlungen')}
          ${detailMetric(row.kunden, 'Kunden')}
        </div>
        <div class="team-conversion"><div><span>Empfehlung zu Kunde</span><strong>${conversion} %</strong></div><div class="team-conversion-track"><span style="width:${conversion}%"></span></div></div>
      </div>
      <div class="team-personal-activity">
        ${personalActivity.length ? personalActivity.map(personalActivityHtml).join('') : '<div class="team-empty compact">Noch keine Aktivität in diesem Zeitraum.</div>'}
      </div>
    </div>`;
}

function renderActivity() {
  if (!activity.length) {
    activityEl.innerHTML = '<div class="team-empty">Noch keine Teamaktivität im gewählten Zeitraum.</div>';
    return;
  }
  activityEl.innerHTML = activity.slice(0, 12).map(activityHtml).join('');
}

const EVENT_META = {
  empfehlung: { label: 'Empfehlung', text: 'hat eine Empfehlung erhalten', icon: 'Send', color: '#C28447' },
  promoter: { label: 'Promoter', text: 'hat einen neuen Promoter gewonnen', icon: 'UserPlus', color: '#C9B98A' },
  kunde: { label: 'Kunde', text: 'hat einen Kunden gewonnen', icon: 'Star', color: '#2E5266' },
};

function activityHtml(row) {
  const meta = EVENT_META[row.event] || EVENT_META.empfehlung;
  return `<article class="team-activity-row" style="--event-color:${meta.color}">
    <span class="team-activity-icon">${icon(meta.icon, { size: 15 })}</span>
    <div><div><strong>${escapeHtml(row.berater_name || 'Berater')}</strong><time>${ago(row.event_at)}</time></div><p>${meta.text}.</p></div>
  </article>`;
}

function personalActivityHtml(row) {
  const meta = EVENT_META[row.event] || EVENT_META.empfehlung;
  return `<div class="team-personal-event"><i style="--event-color:${meta.color}"></i><span>${meta.text}.</span><time>${ago(row.event_at)}</time></div>`;
}

function miniMetric(value, label) { return `<span><b>${number(value)}</b><small>${label}</small></span>`; }
function detailMetric(value, label) { return `<div><b>${number(value)}</b><span>${label}</span></div>`; }
function number(value) { return Number(value) || 0; }
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = String(value); }

function avatar(row, className) {
  const name = row.berater_name || 'Berater';
  const initials = name.trim().split(/\s+/).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase();
  return `<span class="${className}">${row.berater_foto ? `<img src="${escapeAttr(row.berater_foto)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${escapeHtml(initials)}</span>` : `<span>${escapeHtml(initials)}</span>`}</span>`;
}

function lastSeen(value) {
  if (!value) return 'noch nicht aktiv';
  return `aktiv ${ago(value)}`;
}

function ago(value) {
  const timestamp = parseDbDate(value).getTime();
  if (!Number.isFinite(timestamp)) return 'kürzlich';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'gerade';
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min`;
  if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)} Std`;
  if (seconds < 604800) return `vor ${Math.floor(seconds / 86400)} Tagen`;
  return new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
