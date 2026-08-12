/**
 * Phase 141 · Teamübersicht
 * Aggregierte Teamkennzahlen und datensparsame Aktivität ohne Kundendaten.
 */
import { getTeamActivitySecure, getTeamMetrics, getTeamBestand } from './supabase.js';
import { requireAuth, logout, applyBeraterHeader } from './dashboard.js';
import { icon, hydrateIcons } from './icons.js';
import { parseDbDate } from './date-utils.js';

const range = document.getElementById('teamRange');
const membersEl = document.getElementById('teamMembers');
const detailEl = document.getElementById('teamDetail');
const activityEl = document.getElementById('teamActivity');
const errorEl = document.getElementById('teamError');
const rankingEl = document.getElementById('teamPodium');
const rankingMetricEl = document.getElementById('teamRankingMetric');

let currentDays = 30;
let metrics = [];
let activity = [];
let selectedId = null;
let rankingMetric = 'kunden';

// Phase 195/196 · Bestand des eigenen Astes: Promoter, Empfehlungen, Prämien
// und KIDZ-Anmeldungen als Zahlen. Bis dahin griff die Führungslinie nur bei
// den aggregierten Teamkennzahlen.
let bestandsZahlen = [];

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
rankingMetricEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-ranking]');
  if (!button || button.dataset.ranking === rankingMetric) return;
  rankingMetric = button.dataset.ranking;
  rankingMetricEl.querySelectorAll('[data-ranking]').forEach((item) => item.classList.toggle('active', item === button));
  renderRanking();
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
  const [metricRows, activityRows, bestandRows] = await Promise.all([
    getTeamMetrics(currentDays),
    getTeamActivitySecure(currentDays),
    getTeamBestand(currentDays),
  ]);
  metrics = metricRows || [];
  activity = activityRows || [];
  bestandsZahlen = bestandRows || [];

  if (!metrics.length) {
    setLoading(false);
    renderEmpty();
    return;
  }

  if (!metrics.some((row) => row.berater_id === selectedId)) selectedId = metrics[0].berater_id;
  renderTeamKPIs();
  renderRanking();
  renderMembers();
  renderDetail();
  renderActivity();
  hydrateIcons();
}

function setLoading(isLoading) {
  if (!isLoading) return;
  membersEl.innerHTML = '<div class="team-member-skeleton"></div><div class="team-member-skeleton"></div>';
  rankingEl.innerHTML = '<div class="team-ranking-skeleton"></div>';
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
  rankingEl.innerHTML = '<div class="team-empty">Noch keine Ergebnisse für ein Teamranking.</div>';
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

const RANKINGS = {
  kunden: {
    score: (row) => number(row.kunden),
    value: (row) => `${number(row.kunden)} Kunde${number(row.kunden) === 1 ? '' : 'n'}`,
    note: 'Gewertet nach gewonnenen Kunden. Bei Gleichstand zählen Empfehlungen und Aktivität.',
  },
  empfehlungen: {
    score: (row) => number(row.empfehlungen),
    value: (row) => `${number(row.empfehlungen)} Empfehlung${number(row.empfehlungen) === 1 ? '' : 'en'}`,
    note: 'Gewertet nach Empfehlungen im gewählten Zeitraum.',
  },
  promoter: {
    score: (row) => number(row.aktive_promoter),
    value: (row) => `${number(row.aktive_promoter)} aktive Promoter`,
    note: 'Gewertet nach aktiven Promotern im gewählten Zeitraum.',
  },
  quote: {
    score: (row) => number(row.empfehlungen) >= 3 ? Math.round((number(row.kunden) / number(row.empfehlungen)) * 100) : -1,
    value: (row) => `${Math.round((number(row.kunden) / number(row.empfehlungen)) * 100)} % Kundenquote`,
    note: 'Die Kundenquote wird erst ab drei Empfehlungen gewertet.',
  },
};

function renderRanking() {
  const config = RANKINGS[rankingMetric] || RANKINGS.kunden;
  const ranking = [...metrics]
    .filter((row) => config.score(row) > 0)
    .sort((a, b) => config.score(b) - config.score(a)
      || number(b.kunden) - number(a.kunden)
      || number(b.empfehlungen) - number(a.empfehlungen)
      || dateValue(b.last_seen) - dateValue(a.last_seen)
      || String(a.berater_name || '').localeCompare(String(b.berater_name || ''), 'de', { sensitivity: 'base' }))
    .slice(0, 3);
  setText('teamRankingNote', config.note);
  if (!ranking.length) {
    rankingEl.className = 'team-podium';
    rankingEl.innerHTML = '<div class="team-empty">Für diese Wertung gibt es im gewählten Zeitraum noch kein Ergebnis.</div>';
    return;
  }
  rankingEl.className = `team-podium count-${ranking.length}`;
  rankingEl.innerHTML = ranking.map((row, index) => {
    const rank = index + 1;
    return `<button class="team-podium-place rank-${rank}" type="button" data-ranking-member="${escapeAttr(row.berater_id)}">
      <span class="team-podium-person">${avatar(row, 'team-podium-avatar')}<strong>${escapeHtml(row.berater_name || 'Berater')}</strong><small>${escapeHtml(config.value(row))}</small></span>
      <span class="team-podium-step"><span class="team-podium-cup">${rank === 1 ? icon('Trophy', { size: 14 }) : ''}</span><b>${rank}</b></span>
    </button>`;
  }).join('');
  rankingEl.querySelectorAll('[data-ranking-member]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.rankingMember;
      renderMembers();
      renderDetail();
      hydrateIcons();
      document.getElementById('teamDetail')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
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
    </div>
    ${astListen(row.berater_id)}`;
}

/* ---------- Phase 195 · Bestand des eigenen Astes ----------
 *
 * Die Führungslinie greift jetzt auch bei Promotern, Empfehlungen, Prämien und
 * KIDZ-Anmeldungen. Was sie NICHT tut: Namen zeigen. Diese Seite bleibt
 * datensparsam, wie sie es seit Phase 141 ist. Eine Führungskraft sieht, wie
 * ihr Ast steht, nicht wer dahintersteckt. Wer einen einzelnen Fall bearbeiten
 * will, macht das in seiner eigenen Akte.
 *
 * Die Zahlen kommen aus den Datenbankfunktionen team_promoter, team_empfehlungen,
 * team_praemien und team_kidz, die den Ast über mein_team() begrenzen.
 */
function astListen(beraterId) {
  const b = bestandsZahlen.find((item) => item.berater_id === beraterId);
  if (!b) return '';

  const promoter = number(b.promoter_gesamt);
  const empfehlungen = number(b.empfehlungen_gesamt);
  const praemien = number(b.praemien_offen) + number(b.praemien_ausgezahlt);
  const kidz = number(b.kidz_anmeldungen);

  if (!promoter && !empfehlungen && !praemien && !kidz) {
    return '<div class="team-empty compact">Noch kein Bestand: keine Promoter, Empfehlungen, Prämien oder KIDZ-Anmeldungen.</div>';
  }

  return `
    <div class="team-detail-listen">
      ${bestand('Promoter', promoter, [
        [b.promoter_aktiv, 'mit mindestens einer Empfehlung'],
        [promoter - number(b.promoter_aktiv), 'noch ohne Empfehlung'],
        [b.promoter_selbst_angemeldet, 'selbst angemeldet'],
      ])}

      ${bestand(`Empfehlungen · ${currentDays} Tage`, empfehlungen, [
        [b.empfehlungen_offen, 'offen'],
        [b.empfehlungen_kontaktiert, 'kontaktiert'],
        [b.empfehlungen_termin, 'Termin'],
        [b.empfehlungen_kunde, 'Kunde geworden'],
        [b.empfehlungen_kein_interesse, 'kein Interesse'],
        [b.anrufwuensche, 'mit Anrufwunsch'],
      ])}

      ${bestand('Prämien', praemien, [
        [b.praemien_offen, 'noch auszuzahlen'],
        [b.praemien_ausgezahlt, 'ausgezahlt'],
      ])}

      ${bestand('KIDZ-Anmeldungen', kidz, [])}
    </div>`;
}

function bestand(titel, gesamt, zeilen) {
  if (!gesamt) return '';
  const sichtbar = zeilen.filter(([wert]) => number(wert) > 0);
  return `
    <section class="team-liste">
      <div class="h-label">${escapeHtml(titel)}</div>
      <strong class="team-liste-summe">${number(gesamt)}</strong>
      ${sichtbar.length ? `<ul>${sichtbar.map(([wert, text]) =>
        `<li><b>${number(wert)}</b><span>${escapeHtml(text)}</span></li>`).join('')}</ul>` : ''}
    </section>`;
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
function dateValue(value) { const result = parseDbDate(value).getTime(); return Number.isFinite(result) ? result : 0; }
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
