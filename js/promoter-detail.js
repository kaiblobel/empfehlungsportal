/**
 * Phase 78 · Promoter-Detailseite (Berater-Ansicht)
 * Profil (bearbeitbar) + Kennzahlen + Empfehlungsliste mit gesendeten Links.
 */
import { requireAuth, logout, applyBeraterHeader, formatDate } from './dashboard.js';
import { getEmpfehler, updateEmpfehler, getEmpfehlerStats, getEmpfehlerEmpfehlungen } from './supabase.js';

const STATUS_LABEL = {
  offen: 'Offen', anrufwunsch: 'Anrufwunsch', kontaktiert: 'Kontaktiert',
  kunde: 'Kunde', kein_interesse: 'Kein Interesse',
};

applyBeraterHeader();
document.getElementById('logoutBtn').addEventListener('click', logout);

const id = new URLSearchParams(location.search).get('id');
let promoter = null;

(async () => {
  const session = await requireAuth();
  if (!session) return;
  const body = document.getElementById('pdBody');
  if (!id) { body.innerHTML = '<div class="pd-card">Kein Promoter angegeben.</div>'; return; }

  const { data, error } = await getEmpfehler(id);
  if (error || !data) {
    body.innerHTML = '<div class="pd-card">Promoter nicht gefunden (oder kein Zugriff).</div>';
    return;
  }
  promoter = data;
  document.querySelector('.app-header-sub').textContent = promoter.name || 'Promoter-Detail';

  const [statsRes, feedRes] = await Promise.all([
    getEmpfehlerStats(promoter.code),
    getEmpfehlerEmpfehlungen(promoter.code),
  ]);
  renderAll(statsRes.data, feedRes.data || []);
})();

function renderAll(stats, feed) {
  const p = promoter;
  const origin = window.location.origin;
  const s = stats || {};
  document.getElementById('pdBody').innerHTML = `
    <div class="pd-actions">
      <a class="pd-btn primary" href="../empfehlen.html?code=${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Neue Empfehlung aussprechen</a>
      <a class="pd-btn" href="../empfehler.html?code=${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Promoter-Ansicht öffnen ↗</a>
    </div>

    <div class="pd-stats">
      <div class="pd-stat"><div class="pd-stat-num">${s.gesamt ?? feed.length}</div><div class="pd-stat-lbl">Empfehlungen</div></div>
      <div class="pd-stat"><div class="pd-stat-num" style="color:#1F6B30;">${s.kunde ?? 0}</div><div class="pd-stat-lbl">Kunde geworden</div></div>
      <div class="pd-stat"><div class="pd-stat-num">${s.offen ?? 0}</div><div class="pd-stat-lbl">Offen</div></div>
      <div class="pd-stat"><div class="pd-stat-num">${s.anrufwunsch ?? 0}</div><div class="pd-stat-lbl">Anrufwunsch</div></div>
    </div>

    <div class="pd-card">
      <h3>Profil</h3>
      <div class="pd-field"><label>Name</label><input id="pdName" value="${escapeAttr(p.name || '')}" /></div>
      <div class="pd-row-2">
        <div class="pd-field"><label>Telefon</label><input id="pdTel" type="tel" value="${escapeAttr(p.telefon || '')}" /></div>
        <div class="pd-field"><label>E-Mail</label><input id="pdEmail" type="email" value="${escapeAttr(p.email || '')}" /></div>
      </div>
      <div class="pd-field"><label>Adresse</label><textarea id="pdAdresse">${escapeHtml(p.adresse || '')}</textarea></div>
      <div class="pd-field"><label>Motive / Interessen</label><textarea id="pdMotive">${escapeHtml(p.motive || '')}</textarea></div>
      <div class="pd-field"><label>Interne Notiz</label><textarea id="pdNotiz">${escapeHtml(p.notiz || '')}</textarea></div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
        <button class="pd-btn primary" id="pdSave" type="button">Speichern</button>
        <span style="font-size:12.5px;color:var(--ink-muted,#6E6660);">Code: ${escapeHtml(p.code)} · angelegt ${formatDate(p.created_at)}</span>
      </div>
    </div>

    <div class="pd-card">
      <h3>Empfehlungen &amp; gesendete Links</h3>
      <div id="pdFeed"></div>
    </div>
  `;

  renderFeed(feed, origin);
  document.getElementById('pdSave').addEventListener('click', onSave);
}

function renderFeed(feed, origin) {
  const wrap = document.getElementById('pdFeed');
  if (!feed.length) {
    wrap.innerHTML = '<div style="color:var(--ink-muted,#6E6660);font-size:14px;">Dieser Promoter hat noch keine Empfehlung ausgesprochen.</div>';
    return;
  }
  wrap.innerHTML = '<div class="feed">' + feed.map(e => {
    const geoeffnet = !!e.link_geoeffnet;
    const linkInfo = geoeffnet
      ? `<span class="pd-link-status is-open">Link geöffnet ✓${e.link_geoeffnet_at ? ' · ' + formatDate(e.link_geoeffnet_at) : ''}</span>`
      : `<span class="pd-link-status">Link noch nicht geöffnet</span>`;
    const link = e.link_token ? `${origin}/e?token=${encodeURIComponent(e.link_token)}${e.vorlage_slug ? '&vorlage=' + encodeURIComponent(e.vorlage_slug) : ''}` : '';
    const copyBtn = link ? `<button type="button" class="pd-copy" data-link="${escapeAttr(link)}">Link kopieren</button>` : '';
    const badgeColor = { kunde:'#1F6B30', anrufwunsch:'#9A5A22', kontaktiert:'#1E4E68', kein_interesse:'#B53D3D', offen:'#6E6660' }[e.status || 'offen'];
    return `
      <a class="feed-row" href="detail.html?id=${encodeURIComponent(e.id)}">
        <div class="feed-main">
          <div class="feed-name">${escapeHtml(e.empfaenger_name || '–')}</div>
          <div class="feed-meta"><span>${formatDate(e.created_at)}</span>${e.vorlage_slug ? '<span>' + escapeHtml(e.vorlage_slug) + '</span>' : ''}</div>
          <div class="pd-link-track">${linkInfo}${copyBtn}</div>
        </div>
        <span class="pd-badge" style="color:${badgeColor};border:1px solid ${badgeColor}55;">${STATUS_LABEL[e.status] || STATUS_LABEL.offen}</span>
      </a>`;
  }).join('') + '</div>';

  wrap.querySelectorAll('.pd-copy').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try { await navigator.clipboard.writeText(btn.dataset.link); const t = btn.textContent; btn.textContent = 'Kopiert ✓'; setTimeout(() => { btn.textContent = t; }, 1500); } catch (_) {}
    });
  });
}

async function onSave() {
  const btn = document.getElementById('pdSave');
  const fields = {
    name: (document.getElementById('pdName').value || '').trim() || promoter.name,
    telefon: (document.getElementById('pdTel').value || '').trim() || null,
    email: (document.getElementById('pdEmail').value || '').trim() || null,
    adresse: (document.getElementById('pdAdresse').value || '').trim() || null,
    motive: (document.getElementById('pdMotive').value || '').trim() || null,
    notiz: (document.getElementById('pdNotiz').value || '').trim() || null,
  };
  btn.disabled = true; btn.textContent = 'Speichere…';
  const { error } = await updateEmpfehler(id, fields);
  btn.disabled = false; btn.textContent = 'Speichern';
  if (error) { toast('Fehler: ' + (error.message || '')); return; }
  promoter = { ...promoter, ...fields };
  document.querySelector('.app-header-sub').textContent = fields.name;
  toast('Profil gespeichert.');
}

/* ---------- Toast ---------- */
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.classList.remove('show'); setTimeout(() => { toastEl.hidden = true; }, 250); }, 2400);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
function escapeAttr(s) { return escapeHtml(s); }
