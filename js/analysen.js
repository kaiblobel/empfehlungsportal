/** Phase 142 · Echte Analysen ohne zweite Übersicht. */
import { supabase, getVorlagenPublic } from './supabase.js';
import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { hydrateIcons } from './icons.js';
import { parseDbDate } from './date-utils.js';

const DAY_MS = 86400000;
const allowedDays = [7, 30, 90];
const rangeEl = document.getElementById('analysisRange');
const errorEl = document.getElementById('analysisError');
let currentDays = 30;
let trendChart = null;
let loadRequest = 0;

document.getElementById('logoutBtn')?.addEventListener('click', logout);
rangeEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-days]');
  if (!button) return;
  const days = Number(button.dataset.days);
  if (!allowedDays.includes(days) || days === currentDays) return;
  currentDays = days;
  rangeEl.querySelectorAll('[data-days]').forEach((item) => item.classList.toggle('active', item === button));
  loadAnalysis();
});

(async () => {
  const session = await requireAuth();
  if (!session) return;
  await applyBeraterHeader();
  hydrateIcons();
  await loadAnalysis();
})();

async function loadAnalysis() {
  const requestId = ++loadRequest;
  setLoading();
  errorEl.hidden = true;
  try {
    const advisor = await getCurrentBerater();
    const { currentStart, previousStart, periodEnd } = periodBounds(currentDays);
    const [recommendationResult, templates] = await Promise.all([
      supabase
        .from('empfehlungen')
        .select('created_at,link_klicks,link_geoeffnet,interessiert,status,vorlage_slug,empfehler_id,empfehler_name')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', periodEnd.toISOString())
        .order('created_at', { ascending: true }),
      getVorlagenPublic(advisor?.id || null),
    ]);
    if (recommendationResult.error) throw recommendationResult.error;
    if (requestId !== loadRequest) return;

    const rows = recommendationResult.data || [];
    const currentRows = rows.filter((row) => {
      const time = rowTime(row);
      return time >= currentStart.getTime() && time < periodEnd.getTime();
    });
    const previousRows = rows.filter((row) => {
      const time = rowTime(row);
      return time >= previousStart.getTime() && time < currentStart.getTime();
    });

    const current = summarize(currentRows);
    const previous = summarize(previousRows);
    const templateNames = new Map((templates || []).map((item) => [item.slug, item.titel || item.slug]));

    renderKpis(current, previous, currentDays);
    renderTrend(currentRows, currentStart, currentDays);
    renderFunnel(current);
    renderTopics(currentRows, templateNames, currentDays);
    renderPromoters(currentRows);
  } catch (error) {
    if (requestId !== loadRequest) return;
    console.error('[analysen]', error);
    renderFailure();
  }
}

function periodBounds(days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentStart = new Date(today);
  currentStart.setDate(today.getDate() - (days - 1));
  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - days);
  const periodEnd = new Date(today);
  periodEnd.setDate(today.getDate() + 1);
  return { currentStart, previousStart, periodEnd };
}

function summarize(rows) {
  return rows.reduce((sum, row) => {
    sum.referrals += 1;
    sum.clicks += number(row.link_klicks);
    if (isOpened(row)) sum.opened += 1;
    if (isConversation(row)) sum.conversations += 1;
    if (row.status === 'kunde') sum.customers += 1;
    return sum;
  }, { referrals: 0, clicks: 0, opened: 0, conversations: 0, customers: 0 });
}

function renderKpis(current, previous, days) {
  setText('valueReferrals', current.referrals);
  setText('valueClicks', current.clicks);
  setText('valueConversations', current.conversations);
  setText('valueCustomers', current.customers);
  setText('subReferrals', `in den letzten ${days} Tagen`);
  setText('subClicks', `${decimal(current.referrals ? current.clicks / current.referrals : 0)} Klicks je Empfehlung`);
  setText('subConversations', `${percent(current.conversations, current.referrals)} der Empfehlungen`);
  setText('subCustomers', `${percent(current.customers, current.referrals)} Gesamtumwandlung`);

  const metrics = [
    ['deltaReferrals', current.referrals, previous.referrals],
    ['deltaClicks', current.clicks, previous.clicks],
    ['deltaConversations', current.conversations, previous.conversations],
    ['deltaCustomers', current.customers, previous.customers],
  ];
  metrics.forEach(([id, value, before]) => renderDelta(id, value, before));

  const hasPrevious = Object.values(previous).some((value) => value > 0);
  setText('compareHint', hasPrevious ? `Vergleich mit den vorherigen ${days} Tagen` : 'Vorperiode noch ohne vollständige Daten');
}

function renderDelta(id, value, previous) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!previous) {
    el.textContent = value ? 'Vergleich folgt' : 'Noch keine Daten';
    el.className = 'analysis-delta neutral';
    return;
  }
  const change = Math.round(((value - previous) / previous) * 100);
  el.textContent = `${change > 0 ? '+' : change < 0 ? '−' : '±'}${Math.abs(change)} %`;
  el.className = `analysis-delta${change < 0 ? ' down' : change === 0 ? ' neutral' : ''}`;
}

function renderTrend(rows, start, days) {
  const series = buildSeries(rows, start, days);
  setText('chartRangeLabel', `${days} Tage`);
  const canvas = document.getElementById('analysisTrendChart');
  if (!canvas || !window.Chart) return;
  if (trendChart) trendChart.destroy();
  trendChart = new window.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: series.map((item) => item.label),
      datasets: [
        { label: 'Empfehlungen', data: series.map((item) => item.referrals), backgroundColor: '#C9B98A', borderRadius: 5, maxBarThickness: 15 },
        { label: 'Kunden', data: series.map((item) => item.customers), backgroundColor: '#2E5266', borderRadius: 5, maxBarThickness: 15 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', align: 'start', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 16, color: '#6B6660', font: { size: 10, family: 'Inter' } } },
        tooltip: { backgroundColor: '#1A1A1A', padding: 10, titleFont: { family: 'Inter', size: 11 }, bodyFont: { family: 'Inter', size: 10 } },
      },
      scales: {
        x: { stacked: false, grid: { display: false }, border: { display: false }, ticks: { color: '#8C8680', maxRotation: 0, autoSkip: true, maxTicksLimit: days === 90 ? 13 : 10, font: { size: 9, family: 'Inter' } } },
        y: { beginAtZero: true, ticks: { precision: 0, color: '#8C8680', font: { size: 9, family: 'Inter' } }, grid: { color: '#EFEDE9' }, border: { display: false } },
      },
    },
  });
}

function buildSeries(rows, start, days) {
  const weekly = days === 90;
  const bucketCount = weekly ? Math.ceil(days / 7) : days;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index * (weekly ? 7 : 1));
    return { date, referrals: 0, customers: 0, label: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) };
  });
  rows.forEach((row) => {
    const diff = Math.floor((rowTime(row) - start.getTime()) / DAY_MS);
    const index = weekly ? Math.floor(diff / 7) : diff;
    if (index < 0 || index >= buckets.length) return;
    buckets[index].referrals += 1;
    if (row.status === 'kunde') buckets[index].customers += 1;
  });
  return buckets;
}

function renderFunnel(summary) {
  const stages = [
    { label: 'Empfehlungen', value: summary.referrals, tone: '#C9B98A' },
    { label: 'Geöffnet', value: summary.opened, tone: '#7A8B6F' },
    { label: 'Gespräch', value: summary.conversations, tone: '#C28447' },
    { label: 'Kunde', value: summary.customers, tone: '#2E5266' },
  ];
  const max = Math.max(1, summary.referrals);
  document.getElementById('analysisFunnel').innerHTML = stages.map((stage, index) => {
    const conversion = index ? `<div class="analysis-funnel-conversion"><span></span><span>${percent(stage.value, stages[index - 1].value)} gehen weiter</span><span></span></div>` : '';
    return `${conversion}<div class="analysis-funnel-row"><label>${stage.label}</label><div class="analysis-funnel-track"><i style="width:${Math.round((stage.value / max) * 100)}%;--funnel-tone:${stage.tone}"></i></div><strong>${stage.value}</strong></div>`;
  }).join('');
  setText('funnelTotal', `Gesamt ${percent(summary.customers, summary.referrals)}`);

  const transitions = stages.slice(1).map((stage, index) => ({ label: `${stages[index].label} → ${stage.label}`, rate: rate(stage.value, stages[index].value) }));
  const best = transitions.filter((item) => Number.isFinite(item.rate)).sort((a, b) => b.rate - a.rate)[0];
  const highlight = document.getElementById('funnelHighlight');
  if (best) {
    highlight.hidden = false;
    highlight.innerHTML = `<span>Stärkste Stufe</span><strong>${escapeHtml(best.label)} · ${Math.round(best.rate * 100)} %</strong>`;
  } else highlight.hidden = true;
}

function renderTopics(rows, templateNames, days) {
  const grouped = new Map();
  rows.forEach((row) => {
    const slug = row.vorlage_slug || 'allgemein';
    const item = grouped.get(slug) || { slug, title: templateNames.get(slug) || (slug === 'allgemein' ? 'Allgemein' : titleFromSlug(slug)), referrals: 0, customers: 0 };
    item.referrals += 1;
    if (row.status === 'kunde') item.customers += 1;
    grouped.set(slug, item);
  });
  const topics = [...grouped.values()].sort((a, b) => b.customers - a.customers || b.referrals - a.referrals).slice(0, 6);
  setText('topicRangeLabel', `${days} Tage`);
  const wrap = document.getElementById('analysisTopics');
  if (!topics.length) {
    wrap.innerHTML = '<div class="analysis-empty">Noch keine Themen-Ergebnisse in diesem Zeitraum.</div>';
    document.getElementById('topicInsight').hidden = true;
    return;
  }
  wrap.innerHTML = topics.map((topic) => {
    const conversion = Math.round(rate(topic.customers, topic.referrals) * 100) || 0;
    return `<div class="analysis-topic"><strong>${escapeHtml(topic.title)}</strong><span>${topic.referrals} Empfehlung${topic.referrals === 1 ? '' : 'en'}</span><span>${topic.customers} Kunde${topic.customers === 1 ? '' : 'n'}</span><span class="analysis-rate"><i style="--rate:${conversion}%"></i><b>${conversion} %</b></span></div>`;
  }).join('');

  const eligible = topics.filter((topic) => topic.referrals >= 2);
  const best = eligible.sort((a, b) => rate(b.customers, b.referrals) - rate(a.customers, a.referrals))[0];
  const volume = [...topics].sort((a, b) => b.referrals - a.referrals)[0];
  const insight = document.getElementById('topicInsight');
  insight.hidden = false;
  insight.innerHTML = `<span class="analysis-insight-mark">✦</span><div><strong>Das fällt auf</strong><p>${best ? `${escapeHtml(best.title)} hat mit ${percent(best.customers, best.referrals)} aktuell die stärkste Kundenquote.` : 'Für einen belastbaren Themenvergleich braucht es mindestens zwei Empfehlungen je Thema.'}${volume && volume !== best ? ` ${escapeHtml(volume.title)} bringt mit ${volume.referrals} Empfehlungen das meiste Volumen.` : ''}</p></div>`;
}

function renderPromoters(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const name = String(row.empfehler_name || '').trim();
    const key = row.empfehler_id || (name ? `name:${name.toLocaleLowerCase('de-DE')}` : '');
    if (!key) return;
    const item = grouped.get(key) || { name: name || 'Promoter', referrals: 0, customers: 0 };
    item.referrals += 1;
    if (row.status === 'kunde') item.customers += 1;
    grouped.set(key, item);
  });
  const promoters = [...grouped.values()].sort((a, b) => b.customers - a.customers || b.referrals - a.referrals);
  setText('promoterCount', `${promoters.length} aktiv`);
  const wrap = document.getElementById('analysisPromoters');
  if (!promoters.length) {
    wrap.innerHTML = '<div class="analysis-empty">Noch keine zugeordneten Promoter in diesem Zeitraum.</div>';
    document.getElementById('promoterInsight').hidden = true;
    return;
  }
  const max = Math.max(1, ...promoters.map((item) => item.referrals));
  const visible = promoters.slice(0, 6);
  wrap.innerHTML = visible.map((promoter, index) => `<div class="analysis-promoter"><span class="analysis-promoter-rank">${index + 1}</span><div><strong>${escapeHtml(promoter.name)}</strong><small>${promoter.referrals} Empfehlung${promoter.referrals === 1 ? '' : 'en'} · ${promoter.customers} Kunde${promoter.customers === 1 ? '' : 'n'}</small><div class="analysis-promoter-bar"><i style="width:${Math.round((promoter.referrals / max) * 100)}%"></i></div></div><b>${percent(promoter.customers, promoter.referrals)}</b></div>`).join('');

  const top = visible[0];
  const insight = document.getElementById('promoterInsight');
  insight.hidden = false;
  insight.innerHTML = `<span class="analysis-insight-mark">→</span><div><strong>Nächster sinnvoller Fokus</strong><p>${escapeHtml(top.name)} bringt aktuell ${top.referrals} Empfehlung${top.referrals === 1 ? '' : 'en'} und ${top.customers} Kunde${top.customers === 1 ? '' : 'n'}. Persönliche Wertschätzung und ein passender Themenimpuls lohnen sich hier besonders.</p></div>`;
}

function setLoading() {
  ['valueReferrals', 'valueClicks', 'valueConversations', 'valueCustomers'].forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = '<span class="h-skeleton"></span>'; });
  document.getElementById('analysisFunnel').innerHTML = '<div class="analysis-card-skeleton"></div>';
  document.getElementById('analysisTopics').innerHTML = '<div class="analysis-card-skeleton"></div>';
  document.getElementById('analysisPromoters').innerHTML = '<div class="analysis-card-skeleton"></div>';
}

function renderFailure() {
  errorEl.hidden = false;
  errorEl.textContent = 'Die Analyse konnte gerade nicht geladen werden. Es wurden keine fremden oder unvollständigen Daten angezeigt.';
  ['valueReferrals', 'valueClicks', 'valueConversations', 'valueCustomers'].forEach((id) => setText(id, '—'));
  document.getElementById('analysisFunnel').innerHTML = '<div class="analysis-empty">Keine Daten verfügbar.</div>';
  document.getElementById('analysisTopics').innerHTML = '<div class="analysis-empty">Keine Daten verfügbar.</div>';
  document.getElementById('analysisPromoters').innerHTML = '<div class="analysis-empty">Keine Daten verfügbar.</div>';
}

function rowTime(row) { return parseDbDate(row.created_at).getTime(); }
function isOpened(row) { return Boolean(row.link_geoeffnet || row.interessiert || row.status === 'kunde'); }
function isConversation(row) { return Boolean(row.interessiert || row.status === 'kunde'); }
function number(value) { return Number(value) || 0; }
function rate(value, base) { return base > 0 ? value / base : NaN; }
function percent(value, base) { const result = rate(value, base); return Number.isFinite(result) ? `${Math.round(result * 100)} %` : '—'; }
function decimal(value) { return Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function titleFromSlug(value) { return String(value || '').split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = String(value); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
