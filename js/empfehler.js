import {
  getEmpfehlerByCode,
  getEmpfehlerStats,
  getEmpfehlerEmpfehlungen,
  getBelohnungsStufen,
  getBeraterPublicById,
} from './supabase.js';
import { applyBeraterBrand } from './berater-brand.js';

const params = new URLSearchParams(window.location.search);
const codeFromUrl = params.get('code');
const codeFromStorage = (() => { try { return localStorage.getItem('empfehler_code'); } catch (_) { return null; } })();
const code = codeFromUrl || codeFromStorage;

if (!code) {
  // Ohne Code: zurück zur Promoter-Page
  window.location.href = 'programm.html';
} else {
  // Code in LocalStorage merken
  try { localStorage.setItem('empfehler_code', code); } catch (_) {}
  init();
}

const STATUS_LABEL = {
  offen: 'Offen',
  anrufwunsch: 'Anrufwunsch',
  kontaktiert: 'Kontaktiert',
  kunde: 'Kunde',
  kein_interesse: 'Kein Interesse',
};

async function init() {
  // Empfehler (für Branding-Berater) + Stats + Empfehlungen + Belohnungen (global) laden
  const [empRes, statsRes, listRes, stufen] = await Promise.all([
    getEmpfehlerByCode(code),
    getEmpfehlerStats(code),
    getEmpfehlerEmpfehlungen(code),
    getBelohnungsStufen(),
  ]);

  // Promoter-Dashboard auf den Berater des Promoters branden (Foto/Name/Rolle/Titel)
  if (empRes.data?.berater_id) {
    const { data: berater } = await getBeraterPublicById(empRes.data.berater_id);
    if (berater) applyBeraterBrand(berater);
  }

  const stats = statsRes.data;
  const empfehlungen = listRes.data || [];

  if (!stats) {
    document.getElementById('p7Hallo').textContent = 'Code unbekannt.';
    document.getElementById('p7Status').textContent = 'Bitte prüfe deinen Link oder erstelle einen neuen Code unter /programm.';
    document.querySelectorAll('section.e-section:not(:first-of-type), footer').forEach(s => s.style.display = 'none');
    return;
  }

  renderGreeting(stats, stufen);
  renderRewardsList(stats, stufen);
  renderFeed(empfehlungen);

  // Beide CTAs gehen zum Empfehlungs-Formular mit dem Empfehler-Code im URL-Param
  const empfehlenUrl = `empfehlen.html?code=${encodeURIComponent(code)}`;
  document.getElementById('p7CtaEmpfehlen').href = empfehlenUrl;
  document.getElementById('p7CtaNeu').href = empfehlenUrl;
}

function renderGreeting(stats, stufen) {
  const firstName = (stats.name || '').split(' ')[0] || 'Hallo';
  document.getElementById('p7Hallo').textContent = `Hallo ${firstName}.`;

  // URL-Param 'neu=1' nach Anmeldung
  if (params.get('neu') === '1') {
    document.getElementById('p7Greet').textContent = 'Glückwunsch';
    document.getElementById('p7Status').textContent = 'Dein persönlicher Empfehler-Code ist da. Hier sind dein Link und dein Fortschritt.';
  } else {
    const erfolgreich = stats.kunde || 0;
    document.getElementById('p7Status').textContent = `Schön, dass du da bist. Hier ist dein aktueller Stand und dein persönlicher Empfehlungs-Link.`;
  }

  document.getElementById('p7StatsBig').textContent = stats.kunde || 0;

  const nextEl = document.getElementById('p7NextStufe');
  const reached = stats.kunde || 0;
  const next = stufen.find(s => s.stufe > reached);
  if (next) {
    const diff = next.stufe - reached;
    nextEl.innerHTML = `Noch <strong>${diff}</strong> bis zur ${next.icon} <strong>${next.titel}</strong>`;
  } else {
    nextEl.innerHTML = `Du hast alle Stufen erreicht. <strong>Wahnsinn.</strong>`;
  }
}

function renderRewardsList(stats, stufen) {
  const wrap = document.getElementById('p7RewardsList');
  const reached = stats.kunde || 0;

  wrap.innerHTML = stufen.map(s => {
    const isReached = reached >= s.stufe;
    const isHighlight = s.highlight;
    const cls = isReached ? 'reached' : 'pending';
    const mark = isReached
      ? '<span class="e-reward-status">Erreicht</span>'
      : `<span class="e-reward-status">${s.stufe - reached} bis hier</span>`;
    return `
      <div class="e-reward ${isHighlight ? 'highlight' : ''} ${cls}">
        <div class="e-reward-icon">${s.icon || '★'}</div>
        <div class="e-reward-body">
          <div class="e-reward-stufe">Stufe ${s.stufe}</div>
          <h3 class="e-reward-titel">${escapeHtml(s.titel)}</h3>
          <p class="e-reward-text">${escapeHtml(s.beschreibung)}</p>
          ${s.wert_label ? `<span class="e-reward-wert">Wert: ${escapeHtml(s.wert_label)}</span>` : ''}
        </div>
        ${mark}
      </div>
    `;
  }).join('');
}

function renderFeed(empfehlungen) {
  const wrap = document.getElementById('p7Feed');
  if (!empfehlungen.length) {
    wrap.innerHTML = '<div class="e-empty">Noch keine Empfehlung. Teile deinen Link und starte durch.</div>';
    return;
  }
  wrap.innerHTML = '<div class="e-feed">' + empfehlungen.map(e => `
    <div class="e-feed-row">
      <div>
        <div class="e-feed-name">${escapeHtml(e.empfaenger_name || '–')}</div>
        <div class="e-feed-meta">${formatDate(e.created_at)}${e.anrufwunsch ? ' · ' + escapeHtml(e.anrufwunsch) : ''}</div>
      </div>
      <span class="e-badge e-badge-${e.status || 'offen'}">${STATUS_LABEL[e.status || 'offen']}</span>
    </div>
  `).join('') + '</div>';
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function toast(text) {
  const t = document.getElementById('p7Toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
