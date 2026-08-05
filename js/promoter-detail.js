/**
 * Phase 148 · Promoter-Arbeitsprofil
 * Verdichtete Berateransicht mit Kennzahlen, Ziel, Profil und Empfehlungen.
 */
import { requireAuth, logout, applyBeraterHeader, formatDate } from './dashboard.js';
import { getEmpfehler, updateEmpfehler, getEmpfehlerStats, getEmpfehlerEmpfehlungen, getBelohnungsStufenPublic } from './supabase.js';
import { openPromoterInvite } from './promoter-invite.js';

const STATUS_LABEL = {
  offen: 'Offen', anrufwunsch: 'Anrufwunsch', kontaktiert: 'Kontaktiert',
  kunde: 'Kunde', kein_interesse: 'Kein Interesse',
};

applyBeraterHeader();
document.getElementById('logoutBtn').addEventListener('click', logout);

const id = new URLSearchParams(location.search).get('id');
let promoter = null;
let stats = {};
let stufen = [];
let feedRows = [];

(async () => {
  const session = await requireAuth();
  if (!session) return;
  const body = document.getElementById('pdBody');
  if (!id) { body.innerHTML = '<div class="pd-card pd-empty">Kein Promoter angegeben.</div>'; return; }

  const { data, error } = await getEmpfehler(id);
  if (error || !data) {
    body.innerHTML = '<div class="pd-card pd-empty">Promoter nicht gefunden oder kein Zugriff.</div>';
    return;
  }
  promoter = data;
  document.querySelector('.app-header-sub').textContent = promoter.name || 'Promoterprofil';

  const [statsRes, feedRes, stufenData] = await Promise.all([
    getEmpfehlerStats(promoter.code),
    getEmpfehlerEmpfehlungen(promoter.code),
    getBelohnungsStufenPublic(promoter.berater_id || null),
  ]);
  stats = statsRes.data || {};
  feedRows = feedRes.data || [];
  stufen = stufenData || [];
  renderAll();
})();

function zielStufen(aktuellesZiel) {
  const highlights = stufen.filter(s => s.highlight);
  const liste = highlights.length ? highlights.slice() : stufen.slice();
  const gewaehlt = stufen.find(s => s.stufe === Number(aktuellesZiel));
  if (gewaehlt && !liste.some(s => s.stufe === gewaehlt.stufe)) liste.push(gewaehlt);
  return liste.sort((a, b) => a.stufe - b.stufe);
}

function zielDaten() {
  const kunden = Number(stats.kunde) || 0;
  const ziel = Number(promoter.ziel_stufe) || 0;
  const stufe = stufen.find(item => item.stufe === ziel);
  return {
    kunden,
    ziel,
    titel: stufe?.titel || (ziel ? `Stufe ${ziel}` : 'Noch kein Wunschziel'),
    rest: ziel ? Math.max(0, ziel - kunden) : null,
    fortschritt: ziel ? Math.min(100, Math.round((kunden / ziel) * 100)) : 0,
  };
}

function renderAll() {
  const p = promoter;
  const total = Number(stats.gesamt ?? feedRows.length) || 0;
  const kunden = Number(stats.kunde) || 0;
  const quote = total ? Math.round((kunden / total) * 100) : 0;
  const offen = Number(stats.offen) || 0;
  const ziel = zielDaten();
  const zielKpi = ziel.ziel ? (ziel.rest === 0 ? 'Erreicht' : String(ziel.rest)) : '-';
  const zielKpiLabel = ziel.ziel ? (ziel.rest === 0 ? 'Wunschziel' : `Kunde${ziel.rest === 1 ? '' : 'n'} bis zum Ziel`) : 'Wunschziel gewählt';

  document.getElementById('pdBody').innerHTML = `
    <section class="pd-profile-hero">
      <div class="pd-profile-person">
        <span class="pd-profile-initial">${initialen(p.name)}</span>
        <div class="pd-profile-copy">
          <div class="pd-eyebrow">Promoterprofil</div>
          <h1>${escapeHtml(p.name || 'Promoter')}</h1>
          <div class="pd-profile-meta">Promoter seit ${formatDate(p.created_at)} <span class="pd-active-pill"><i></i>aktiv</span></div>
        </div>
      </div>
      <div class="pd-actions">
        <a class="pd-btn" href="../empfehler.html?code=${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Promoter-Ansicht ↗</a>
        <a class="pd-btn" href="../empfehlen.html?code=${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Neue Empfehlung</a>
        <button class="pd-btn primary" id="pdInvite" type="button">Einladungs-Link senden</button>
      </div>
    </section>

    <section class="pd-stats" aria-label="Promoter-Kennzahlen">
      ${statCard('↗', total, 'Empfehlungen', total ? `${total} insgesamt` : 'Noch keine')}
      ${statCard('✓', kunden, 'Kunden geworden', kunden ? `${kunden} erfolgreich` : 'Noch offen')}
      ${statCard('%', `${quote} %`, 'Kundenquote', quote >= 50 ? 'stark' : 'im Aufbau')}
      ${statCard('◇', zielKpi, zielKpiLabel, ziel.ziel ? ziel.titel : 'noch offen')}
    </section>

    <section class="pd-layout">
      <article class="pd-card">
        <div class="pd-card-head"><h2>Empfehlungen und gesendete Links</h2><span>${total} Kontakt${total === 1 ? '' : 'e'}</span></div>
        <div id="pdFeed"></div>
      </article>

      <aside class="pd-side">
        <article class="pd-card pd-card-pad">
          <div class="pd-goal-head"><h2>Gemeinsames Ziel</h2>${ziel.ziel ? `<span class="pd-goal-stage">Stufe ${ziel.ziel}</span>` : ''}</div>
          <div id="pdZielInfo"></div>
          <div class="pd-field">
            <label for="pdZiel">Ziel-Belohnung</label>
            <select id="pdZiel">
              <option value="">Kein Ziel gewählt</option>
              ${zielStufen(p.ziel_stufe).map(st => `<option value="${st.stufe}"${Number(p.ziel_stufe) === st.stufe ? ' selected' : ''}>Stufe ${st.stufe} · ${escapeHtml(st.titel)}</option>`).join('')}
            </select>
          </div>
        </article>

        <article class="pd-card pd-card-pad">
          <h2>Kontakt und Beziehungspflege</h2>
          <div class="pd-info-list">
            ${infoRow('☎', 'Telefon', p.telefon)}
            ${infoRow('@', 'E-Mail', p.email)}
            ${infoRow('⌂', 'Adresse', p.adresse)}
            ${infoRow('#', 'Promoter-Code', p.code)}
          </div>
          <div class="pd-note"><label>Motive und Interessen</label><p>${escapeHtml(p.motive || 'Noch nichts hinterlegt.')}</p></div>
          <div class="pd-note"><label>Interne Notiz</label><p>${escapeHtml(p.notiz || 'Noch keine interne Notiz.')}</p></div>
          <button class="pd-edit-toggle" id="pdEditToggle" type="button">Profil bearbeiten</button>
          <div class="pd-editor" id="pdEditor" hidden>
            <div class="pd-field"><label for="pdName">Name</label><input id="pdName" value="${escapeAttr(p.name || '')}" /></div>
            <div class="pd-row-2">
              <div class="pd-field"><label for="pdTel">Telefon</label><input id="pdTel" type="tel" value="${escapeAttr(p.telefon || '')}" /></div>
              <div class="pd-field"><label for="pdEmail">E-Mail</label><input id="pdEmail" type="email" value="${escapeAttr(p.email || '')}" /></div>
            </div>
            <div class="pd-field"><label for="pdAdresse">Adresse</label><textarea id="pdAdresse">${escapeHtml(p.adresse || '')}</textarea></div>
            <div class="pd-field"><label for="pdMotive">Motive und Interessen</label><textarea id="pdMotive">${escapeHtml(p.motive || '')}</textarea></div>
            <div class="pd-field"><label for="pdNotiz">Interne Notiz</label><textarea id="pdNotiz">${escapeHtml(p.notiz || '')}</textarea></div>
            <div class="pd-save-row"><button class="pd-btn primary" id="pdSave" type="button">Speichern</button><span class="pd-save-meta">angelegt ${formatDate(p.created_at)}</span></div>
          </div>
        </article>
      </aside>
    </section>`;

  renderFeed();
  renderZielInfo();
  document.getElementById('pdInvite').addEventListener('click', () => openPromoterInvite({
    name: promoter.name,
    code: promoter.code,
    telefon: promoter.telefon,
    email: promoter.email,
  }));
  document.getElementById('pdZiel').addEventListener('change', onZielChange);
  document.getElementById('pdEditToggle').addEventListener('click', toggleEditor);
  document.getElementById('pdSave').addEventListener('click', onSave);
}

function statCard(icon, value, label, hint) {
  return `<article class="pd-stat"><div class="pd-stat-top"><span class="pd-stat-icon">${icon}</span><small>${escapeHtml(hint)}</small></div><strong class="pd-stat-num">${escapeHtml(value)}</strong><span class="pd-stat-lbl">${escapeHtml(label)}</span></article>`;
}

function infoRow(icon, label, value) {
  return `<div class="pd-info-row"><span class="pd-info-icon">${icon}</span><div><label>${escapeHtml(label)}</label><span>${escapeHtml(value || 'Nicht hinterlegt')}</span></div></div>`;
}

function renderZielInfo() {
  const el = document.getElementById('pdZielInfo');
  if (!el) return;
  const ziel = zielDaten();
  if (!ziel.ziel) {
    el.innerHTML = '<div class="pd-goal-title">Noch kein Wunschziel gewählt</div><div class="pd-goal-copy">Der Promoter kann sein Ziel selbst wählen oder du legst es hier gemeinsam mit ihm fest.</div>';
    return;
  }
  const text = ziel.rest === 0
    ? 'Das gemeinsame Wunschziel ist erreicht.'
    : `Noch ${ziel.rest} weitere${ziel.rest === 1 ? 'r' : ''} Kunde${ziel.rest === 1 ? '' : 'n'} bis zur gewählten Belohnung.`;
  el.innerHTML = `<div class="pd-goal-title">${escapeHtml(ziel.titel)}</div><div class="pd-goal-copy">${text}</div><div class="pd-goal-numbers"><span><b>${ziel.kunden}</b> erreicht</span><span>Ziel: <b>${ziel.ziel} Kunden</b></span></div><div class="pd-progress"><i style="width:${ziel.fortschritt}%"></i></div>`;
}

async function onZielChange(e) {
  const val = e.target.value ? Number(e.target.value) : null;
  const { error } = await updateEmpfehler(id, { ziel_stufe: val });
  if (error) { toast('Fehler: ' + (error.message || '')); return; }
  promoter = { ...promoter, ziel_stufe: val };
  renderAll();
  toast(val ? 'Ziel gesetzt.' : 'Ziel entfernt.');
}

function renderFeed() {
  const wrap = document.getElementById('pdFeed');
  if (!feedRows.length) {
    wrap.innerHTML = '<div class="pd-empty">Dieser Promoter hat noch keine Empfehlung ausgesprochen.</div>';
    return;
  }
  const origin = window.location.origin;
  wrap.innerHTML = feedRows.map(e => {
    const geoeffnet = !!e.link_geoeffnet;
    const linkInfo = geoeffnet
      ? `<span class="pd-link-status is-open">● Link geöffnet${e.link_geoeffnet_at ? ' · ' + formatDate(e.link_geoeffnet_at) : ''}</span>`
      : '<span class="pd-link-status">○ Link noch nicht geöffnet</span>';
    const link = e.link_token ? `${origin}/e?token=${encodeURIComponent(e.link_token)}${e.vorlage_slug ? '&vorlage=' + encodeURIComponent(e.vorlage_slug) : ''}` : '';
    const copyBtn = link ? `<button type="button" class="pd-copy" data-link="${escapeAttr(link)}">Link kopieren</button>` : '';
    const status = e.status || 'offen';
    return `
      <div class="pd-recommendation">
        <div>
          <div class="pd-rec-person"><span class="pd-rec-initial">${initialen(e.empfaenger_name)}</span><span><a href="detail.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.empfaenger_name || 'Ohne Namen')}</a><small>${formatDate(e.created_at)}${e.vorlage_slug ? ' · ' + escapeHtml(e.vorlage_slug) : ''}</small></span></div>
          <div class="pd-link-track">${linkInfo}${copyBtn}</div>
        </div>
        <span class="pd-badge ${escapeAttr(status)}">${STATUS_LABEL[status] || STATUS_LABEL.offen}</span>
      </div>`;
  }).join('');

  wrap.querySelectorAll('.pd-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.link);
        const text = btn.textContent;
        btn.textContent = 'Kopiert ✓';
        setTimeout(() => { btn.textContent = text; }, 1500);
      } catch (_) { toast('Link konnte nicht kopiert werden.'); }
    });
  });
}

function toggleEditor() {
  const editor = document.getElementById('pdEditor');
  const button = document.getElementById('pdEditToggle');
  editor.hidden = !editor.hidden;
  button.textContent = editor.hidden ? 'Profil bearbeiten' : 'Bearbeitung schließen';
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
  btn.disabled = true;
  btn.textContent = 'Speichere...';
  const { error } = await updateEmpfehler(id, fields);
  btn.disabled = false;
  btn.textContent = 'Speichern';
  if (error) { toast('Fehler: ' + (error.message || '')); return; }
  promoter = { ...promoter, ...fields };
  document.querySelector('.app-header-sub').textContent = fields.name;
  renderAll();
  toast('Profil gespeichert.');
}

const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => { toastEl.hidden = true; }, 250);
  }, 2400);
}

function initialen(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(teil => teil[0] || '').join('').toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
}
function escapeAttr(value) { return escapeHtml(value); }
