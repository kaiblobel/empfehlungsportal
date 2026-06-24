/**
 * Phase 15 · Prämien-Admin
 * Zeigt verdiente Prämien (erreichte Belohnungsstufen je Empfehler) und lässt sie
 * als ausgezahlt markieren / Variante + Notiz festhalten. Admin-only.
 */
import { getPraemien, updatePraemie, syncPraemien } from './supabase.js';
import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';

document.getElementById('logoutBtn').addEventListener('click', logout);
applyBeraterHeader();

const listEl = document.getElementById('prList');
const countEl = document.getElementById('prCount');
const syncBtn = document.getElementById('prSync');
const filtersEl = document.getElementById('prFilters');

let _all = [];
let _filter = 'offen';

(async () => {
  const session = await requireAuth();
  if (!session) return;
  const me = await getCurrentBerater();
  if (!me?.ist_admin) { window.location.href = '/hub.html'; return; }
  await refresh(true);
})();

async function refresh(doSync = false) {
  if (doSync) { await syncPraemien(); }
  const { data, error } = await getPraemien();
  if (error) {
    listEl.innerHTML = `<div class="pr-empty">Prämien konnten nicht geladen werden: ${escapeHtml(error.message || '')}</div>`;
    return;
  }
  // Offen zuerst, dann ausgezahlt/verzichtet; innerhalb nach Stufe absteigend.
  const rank = { offen: 0, ausgezahlt: 1, verzichtet: 2 };
  _all = (data || []).slice().sort((a, b) =>
    (rank[a.status] - rank[b.status]) || (b.stufe - a.stufe)
  );
  render();
}

function render() {
  const rows = _filter === 'alle' ? _all : _all.filter(p => p.status === _filter);
  const offenCount = _all.filter(p => p.status === 'offen').length;
  countEl.textContent = `${offenCount} offen · ${_all.length} gesamt`;

  if (!rows.length) {
    listEl.innerHTML = `<div class="pr-empty">${_filter === 'offen'
      ? 'Keine offenen Prämien. Sobald ein Empfehler eine Stufe erreicht, erscheint sie hier.'
      : 'Keine Prämien in dieser Ansicht.'}</div>`;
    return;
  }

  listEl.innerHTML = rows.map(renderCard).join('');
  attachHandlers();
}

function renderCard(p) {
  const name = p.empfehler?.name || 'Unbekannter Empfehler';
  const wert = p.wert_label ? `<span class="pr-wert">${escapeHtml(p.wert_label)}</span> · ` : '';
  const variante = p.variante ? ` · gewählt: ${escapeHtml(p.variante)}` : '';
  const datum = p.status === 'ausgezahlt' && p.ausgezahlt_at
    ? ` · ausgezahlt ${new Date(p.ausgezahlt_at).toLocaleDateString('de-DE')}` : '';
  const actions = p.status === 'offen'
    ? `<button class="pr-btn primary" data-pay="${p.id}">Als ausgezahlt</button>
       <button class="pr-btn" data-edit="${p.id}">Details</button>`
    : `<button class="pr-btn" data-reopen="${p.id}">Auf „offen" setzen</button>
       <button class="pr-btn" data-edit="${p.id}">Details</button>`;
  return `
    <article class="pr-card is-${escapeAttr(p.status)}" data-id="${p.id}">
      <div class="pr-main">
        <div class="pr-row1">
          <span class="pr-name">${escapeHtml(name)}</span>
          <span class="pr-stufe">Stufe ${p.stufe}. Empfehlung</span>
        </div>
        <div class="pr-titel">${escapeHtml(p.titel)}</div>
        <div class="pr-meta">${wert}<span class="pr-status ${escapeAttr(p.status)}">${statusLabel(p.status)}</span>${variante}${datum}</div>
      </div>
      <div class="pr-actions">${actions}</div>
      <div class="pr-detail">
        <div>
          <label>Gewählte Variante (z. B. „Apple Watch")</label>
          <input data-f="variante" value="${escapeAttr(p.variante || '')}" placeholder="optional" />
        </div>
        <div>
          <label>Notiz</label>
          <input data-f="notiz" value="${escapeAttr(p.notiz || '')}" placeholder="optional" />
        </div>
        <div style="grid-column:1/-1; display:flex; gap:8px;">
          <button class="pr-btn primary" data-save="${p.id}">Speichern</button>
          <button class="pr-btn" data-skip="${p.id}">Als „verzichtet" markieren</button>
        </div>
      </div>
    </article>`;
}

function attachHandlers() {
  listEl.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () =>
    setStatus(b.dataset.pay, 'ausgezahlt')));
  listEl.querySelectorAll('[data-reopen]').forEach(b => b.addEventListener('click', () =>
    setStatus(b.dataset.reopen, 'offen')));
  listEl.querySelectorAll('[data-skip]').forEach(b => b.addEventListener('click', () =>
    setStatus(b.dataset.skip, 'verzichtet')));
  listEl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    b.closest('.pr-card').classList.toggle('open');
  }));
  listEl.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', async () => {
    const card = b.closest('.pr-card');
    const id = b.dataset.save;
    const variante = card.querySelector('[data-f="variante"]').value.trim() || null;
    const notiz = card.querySelector('[data-f="notiz"]').value.trim() || null;
    b.disabled = true; b.textContent = 'Speichere…';
    const { error } = await updatePraemie(id, { variante, notiz });
    b.disabled = false; b.textContent = 'Speichern';
    if (error) { toast('Speichern fehlgeschlagen: ' + (error.message || '')); return; }
    toast('Gespeichert.');
    await refresh(false);
  }));
}

async function setStatus(id, status) {
  const fields = { status };
  fields.ausgezahlt_at = status === 'ausgezahlt' ? new Date().toISOString() : null;
  const { error } = await updatePraemie(id, fields);
  if (error) { toast('Fehler: ' + (error.message || '')); return; }
  toast(status === 'ausgezahlt' ? 'Als ausgezahlt markiert.' : status === 'verzichtet' ? 'Als verzichtet markiert.' : 'Wieder offen.');
  await refresh(false);
}

filtersEl.querySelectorAll('.pr-chip').forEach(chip => chip.addEventListener('click', () => {
  filtersEl.querySelectorAll('.pr-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  _filter = chip.dataset.filter;
  render();
}));

syncBtn.addEventListener('click', async () => {
  syncBtn.disabled = true; syncBtn.textContent = 'Aktualisiere…';
  await refresh(true);
  syncBtn.disabled = false; syncBtn.textContent = 'Prämien aktualisieren';
  toast('Auf dem neuesten Stand.');
});

/* ---------- Helpers ---------- */
function statusLabel(s) {
  return { offen: 'Offen', ausgezahlt: 'Ausgezahlt', verzichtet: 'Verzichtet' }[s] || s;
}
const toastEl = document.getElementById('hToast');
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2500);
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
function escapeAttr(s) { return escapeHtml(s); }
