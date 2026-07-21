/**
 * Phase 15 · Prämien-Admin
 * Zeigt verdiente Prämien (erreichte Belohnungsstufen je Empfehler) und lässt sie
 * als ausgezahlt markieren / Variante + Notiz festhalten. Admin-only.
 */
import { getPraemien, updatePraemie, syncPraemien, auszahlenPraemie, getKundenJeEmpfehler, deletePraemie, parseDbDate } from './supabase.js';
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
  const rows = (data || []).slice();
  // Kunde-gewordene Empfehlungen je Promoter holen → Stufe N dem N. gewonnenen Kunden zuordnen.
  const ids = [...new Set(rows.map(p => p.empfehler_id).filter(Boolean))];
  const kundenMap = await getKundenJeEmpfehler(ids);
  for (const p of rows) {
    const liste = kundenMap[p.empfehler_id] || [];
    p._kunde = liste[p.stufe - 1]?.empfaenger_name || null;
  }
  // Offen zuerst, dann ausgezahlt/verzichtet; innerhalb nach Stufe absteigend.
  const rank = { offen: 0, ausgezahlt: 1, verzichtet: 2 };
  _all = rows.sort((a, b) =>
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

const ICON_GEWONNEN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function formatWertBig(p) {
  const b = parseBetrag(p.wert_label);
  if (b) return `${Number(b).toLocaleString('de-DE')}&nbsp;€`;
  return p.wert_label ? escapeHtml(p.wert_label) : '';
}

function renderCard(p) {
  const name = p.empfehler?.name || 'Unbekannter Empfehler';
  const wertBig = formatWertBig(p);
  const bezug = p._kunde
    ? `${ICON_GEWONNEN} Verdient durch <strong>${escapeHtml(p._kunde)}</strong> · ${p.stufe}. gewonnener Kunde`
    : `${ICON_GEWONNEN} ${p.stufe}. gewonnener Kunde`;
  const variante = p.variante ? `gewählt: ${escapeHtml(p.variante)}` : '';
  const datum = p.status === 'ausgezahlt' && p.ausgezahlt_at
    ? `ausgezahlt ${parseDbDate(p.ausgezahlt_at).toLocaleDateString('de-DE')}` : '';
  const belegnr = p.beleg_nr ? `<span class="pr-belegnr">Beleg ${escapeHtml(p.beleg_nr)}</span>` : '';
  const metaInner = [variante, datum, belegnr].filter(Boolean).join(' · ');
  const meta = metaInner ? `<div class="pr-meta">${metaInner}</div>` : '';
  const actions = p.status === 'offen'
    ? `<button class="pr-btn primary" data-pay="${p.id}">Auszahlen…</button>
       <button class="pr-btn" data-edit="${p.id}">Details</button>`
    : `<button class="pr-btn" data-beleg="${p.id}">Beleg öffnen</button>
       <button class="pr-btn" data-reopen="${p.id}">Auf „offen"</button>`;
  return `
    <article class="pr-card is-${escapeAttr(p.status)}" data-id="${p.id}">
      <div class="pr-main">
        <div class="pr-row1">
          <span class="pr-name">${escapeHtml(name)}</span>
          <span class="pr-status ${escapeAttr(p.status)}">${statusLabel(p.status)}</span>
        </div>
        <div class="pr-headline">
          ${wertBig ? `<span class="pr-value-big">${wertBig}</span>` : ''}
          <span class="pr-titel">${escapeHtml(p.titel)}</span>
        </div>
        <div class="pr-bezug">${bezug}</div>
        ${meta}
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
    openAuszahlModal(b.dataset.pay)));
  listEl.querySelectorAll('[data-beleg]').forEach(b => b.addEventListener('click', () =>
    window.open(`beleg.html?id=${encodeURIComponent(b.dataset.beleg)}`, '_blank')));
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

/* ---------- Auszahl-Dialog ---------- */
const modal = document.getElementById('prModal');
const mSub = document.getElementById('prModalSub');
const mBetrag = document.getElementById('prfBetrag');
const mArt = document.getElementById('prfArt');
const mVariante = document.getElementById('prfVariante');
const mAdresse = document.getElementById('prfAdresse');
const mDatum = document.getElementById('prfDatum');
const mNotiz = document.getElementById('prfNotiz');
const mConfirm = document.getElementById('prfConfirm');
let _payId = null;

function openAuszahlModal(id) {
  const p = _all.find(x => x.id === id);
  if (!p) return;
  _payId = id;
  const betrag = parseBetrag(p.wert_label);
  const wertText = betrag ? `${Number(betrag).toLocaleString('de-DE')} €` : (p.wert_label || p.titel);
  mSub.textContent = `${p.empfehler?.name || 'Empfehler'} · ${wertText}${p._kunde ? ` · für ${p._kunde}` : ''} · ${p.titel}`;
  mBetrag.value = parseBetrag(p.wert_label);
  mArt.value = guessArt(p);
  mVariante.value = p.variante || '';
  mAdresse.value = p.empfaenger_adresse || '';
  mDatum.value = new Date().toISOString().slice(0, 10);
  mNotiz.value = p.notiz || '';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
  _payId = null;
}
document.getElementById('prModalClose').addEventListener('click', closeModal);
document.getElementById('prModalBd').addEventListener('click', closeModal);
document.getElementById('prfCancel').addEventListener('click', closeModal);

mConfirm.addEventListener('click', async () => {
  if (!_payId) return;
  const id = _payId;
  // Beleg-Tab synchron öffnen (sonst blockt der Popup-Blocker nach dem await)
  const w = window.open('', '_blank');
  mConfirm.disabled = true; mConfirm.textContent = 'Zahle aus…';
  const { error } = await auszahlenPraemie(id, {
    betrag: mBetrag.value, art: mArt.value, variante: mVariante.value.trim(),
    adresse: mAdresse.value.trim(), notiz: mNotiz.value.trim(), datum: mDatum.value || null,
  });
  mConfirm.disabled = false; mConfirm.textContent = 'Auszahlen & Beleg erstellen';
  if (error) { if (w) w.close(); toast('Auszahlung fehlgeschlagen: ' + (error.message || '')); return; }
  closeModal();
  toast('Ausgezahlt. Beleg geöffnet.');
  const url = `beleg.html?id=${encodeURIComponent(id)}`;
  if (w) w.location = url; else window.open(url, '_blank');
  await refresh(false);
});

function parseBetrag(wert) {
  if (!wert) return '';
  const m = String(wert).match(/[\d.]+/);
  return m ? m[0].replace(/\./g, '') : '';
}
function guessArt(p) {
  const t = (p.titel || '').toLowerCase();
  if (/bonus|geld/.test(t)) return 'Überweisung';
  if (/spende/.test(t)) return 'Spende';
  return 'Sachleistung';
}

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

/* ---------- Schnell-Menü (Rechtsklick auf eine Prämie) ---------- */
const prCtxMenu = document.getElementById('prCtxMenu');
const prCtxHead = document.getElementById('prCtxHead');
let ctxId = null;

function hidePrCtx() {
  prCtxMenu.hidden = true;
  ctxId = null;
  listEl.querySelectorAll('.pr-card.ctx-active').forEach(el => el.classList.remove('ctx-active'));
}

function openPrCtx(x, y, card) {
  const id = card.dataset.id;
  const p = _all.find(pr => pr.id === id);
  if (!p) return;
  ctxId = id;
  prCtxHead.textContent = p.empfehler?.name || 'Prämie';
  // Kontextabhängige Einträge: offen vs. ausgezahlt/verzichtet
  const offen = p.status === 'offen';
  prCtxMenu.querySelectorAll('.ctx-item').forEach(b => {
    const a = b.dataset.act;
    let show = true;
    if (a === 'pay' || a === 'variante' || a === 'skip') show = offen;
    else if (a === 'beleg' || a === 'reopen') show = !offen;
    b.hidden = !show;
  });
  card.classList.add('ctx-active');
  prCtxMenu.hidden = false;
  const mw = prCtxMenu.offsetWidth, mh = prCtxMenu.offsetHeight;
  const px = Math.min(x, window.innerWidth - mw - 8);
  const py = Math.min(y, window.innerHeight - mh - 8);
  prCtxMenu.style.left = Math.max(8, px) + 'px';
  prCtxMenu.style.top = Math.max(8, py) + 'px';
}

listEl.addEventListener('contextmenu', (e) => {
  const card = e.target.closest('.pr-card');
  if (!card) return;
  e.preventDefault();
  openPrCtx(e.clientX, e.clientY, card);
});

prCtxMenu.addEventListener('click', async (e) => {
  const btn = e.target.closest('.ctx-item');
  if (!btn || !ctxId) return;
  const id = ctxId;
  const act = btn.dataset.act;
  hidePrCtx();

  if (act === 'pay') { openAuszahlModal(id); return; }
  if (act === 'beleg') { window.open(`beleg.html?id=${encodeURIComponent(id)}`, '_blank'); return; }
  if (act === 'reopen') { await setStatus(id, 'offen'); return; }
  if (act === 'skip') { await setStatus(id, 'verzichtet'); return; }
  if (act === 'variante') {
    const card = listEl.querySelector(`.pr-card[data-id="${id}"]`);
    if (card) {
      card.classList.add('open');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const inp = card.querySelector('[data-f="variante"]');
      if (inp) setTimeout(() => inp.focus(), 260);
    }
    return;
  }
  if (act === 'delete') {
    const p = _all.find(x => x.id === id);
    const nm = p?.empfehler?.name || 'diese Prämie';
    if (!confirm(`Prämie von ${nm} (${p?.titel || ''}) wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
    const { error } = await deletePraemie(id);
    if (error) { toast('Löschen fehlgeschlagen: ' + (error.message || '')); return; }
    toast('Prämie gelöscht.');
    await refresh(false);
  }
});

document.addEventListener('click', (e) => {
  if (!prCtxMenu.hidden && !prCtxMenu.contains(e.target)) hidePrCtx();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePrCtx(); });
window.addEventListener('scroll', () => { if (!prCtxMenu.hidden) hidePrCtx(); }, true);
window.addEventListener('resize', hidePrCtx);
