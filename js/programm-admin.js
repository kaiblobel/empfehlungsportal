/**
 * Phase 135 · Programm-Verwaltung (admin-only)
 * Editor für Belohnungen (belohnungs_stufen).
 * Schreiben direkt per Client — durch RLS (is_current_berater_admin) abgesichert.
 */
import {
  getBelohnungsStufen, updateBelohnungsStufe, insertBelohnungsStufe, deleteBelohnungsStufe,
} from './supabase.js';
import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';

const KATEGORIEN = ['geld', 'sache', 'spende'];

let beraterId = null;

document.getElementById('logoutBtn').addEventListener('click', logout);
applyBeraterHeader();

(async () => {
  const session = await requireAuth();
  if (!session) return;
  const berater = await getCurrentBerater();
  if (!berater?.ist_admin) { window.location.href = '/hub.html'; return; }
  beraterId = berater.id;
  await renderBelohnungen();

  document.getElementById('newStufeBtn').addEventListener('click', onNewStufe);
})();

/* ---------- Belohnungen ---------- */
async function renderBelohnungen() {
  const wrap = document.getElementById('belohnungenList');
  // Nur die eigenen Stufen bearbeiten — sonst steht hier jede Belohnung
  // mehrfach (die Zeilen anderer Berater sind öffentlich lesbar).
  const list = (await getBelohnungsStufen(beraterId)).slice().sort((a, b) => a.stufe - b.stufe);
  if (!list.length) {
    wrap.innerHTML = '<div style="padding:20px;color:var(--text-secondary);font-size:14px;">Noch keine Stufen. Lege eine mit „+ Neue Stufe" an.</div>';
    return;
  }
  wrap.innerHTML = list.map(stufeCard).join('');
  attachStufeHandlers();
}

function stufeCard(s) {
  const kats = Array.isArray(s.kategorien) ? s.kategorien : [];
  const katChecks = KATEGORIEN.map(k => `
    <label class="pv-check"><input type="checkbox" data-kat="${k}" ${kats.includes(k) ? 'checked' : ''}/> ${k}</label>`).join('');
  return `
    <details class="cms-card" data-stufe="${s.stufe}">
      <summary>
        <span class="titel">Stufe ${s.stufe} · ${escapeHtml(s.titel)}</span>
        <span class="slug">${escapeHtml(s.wert_label || '')}</span>
      </summary>
      <div class="cms-body">
        <div class="cms-row-2">
          <div><label>Titel</label><input data-f="titel" value="${escapeAttr(s.titel || '')}" /></div>
          <div><label>Wert-Label (z. B. „100 €")</label><input data-f="wert_label" value="${escapeAttr(s.wert_label || '')}" /></div>
        </div>
        <div><label>Beschreibung</label><textarea data-f="beschreibung">${escapeHtml(s.beschreibung || '')}</textarea></div>
        <div>
          <label>Bild-URL</label>
          <input data-f="bild_url" value="${escapeAttr(s.bild_url || '')}" />
          ${s.bild_url ? `<img class="cms-img-preview" src="${escapeAttr(s.bild_url)}" alt="" onerror="this.style.display='none'"/>` : ''}
        </div>
        <div class="cms-row-2">
          <div><label>Stufe (Nummer)</label><input data-f="stufe" type="number" value="${s.stufe}" /></div>
          <div><label>Sort-Order</label><input data-f="sort_order" type="number" value="${s.sort_order ?? s.stufe}" /></div>
        </div>
        <div class="cms-row-2">
          <div><label>Icon (Lucide-Name, optional)</label><input data-f="icon" value="${escapeAttr(s.icon || '')}" /></div>
          <div><label>&nbsp;</label><label class="pv-check"><input type="checkbox" data-f-check="highlight" ${s.highlight ? 'checked' : ''}/> Premium-Stufe (highlight)</label></div>
        </div>
        <div><label>Kategorien</label><div class="pv-check-row">${katChecks}</div></div>
        <div class="cms-row-2">
          <div><label>Info-Knopf: Überschrift</label><input data-f="info_titel" value="${escapeAttr(s.info_titel || '')}" placeholder="z. B. Wie das mit dem Auto laeuft" /></div>
          <div><label>&nbsp;</label><span class="cms-hint">Leerer Info-Text = kein Knopf an der Karte.</span></div>
        </div>
        <div>
          <label>Info-Knopf: Text (Leerzeile trennt Absätze, **fett** wird fett)</label>
          <textarea data-f="info_text" rows="8">${escapeHtml(s.info_text || '')}</textarea>
        </div>
        <div class="cms-actions">
          <button class="cms-save" type="button" data-save-stufe="${s.stufe}">Speichern</button>
          <button class="cms-delete" type="button" data-del-stufe="${s.stufe}">Löschen</button>
        </div>
      </div>
    </details>`;
}

function collectStufe(card) {
  const g = (f) => card.querySelector(`[data-f="${f}"]`);
  const kats = [...card.querySelectorAll('[data-kat]')].filter(c => c.checked).map(c => c.dataset.kat);
  return {
    titel: (g('titel').value || '').trim() || 'Ohne Titel',
    wert_label: (g('wert_label').value || '').trim() || null,
    beschreibung: (g('beschreibung').value || '').trim() || '—',
    bild_url: (g('bild_url').value || '').trim() || null,
    stufe: parseInt(g('stufe').value, 10),
    sort_order: parseInt(g('sort_order').value, 10) || null,
    icon: (g('icon').value || '').trim() || null,
    highlight: card.querySelector('[data-f-check="highlight"]').checked,
    kategorien: kats.length ? kats : null,
    info_titel: (g('info_titel').value || '').trim() || null,
    info_text: (g('info_text').value || '').trim() || null,
  };
}

function attachStufeHandlers() {
  document.querySelectorAll('[data-save-stufe]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const origStufe = parseInt(btn.dataset.saveStufe, 10);
      const card = btn.closest('.cms-card');
      const data = collectStufe(card);
      if (!Number.isInteger(data.stufe)) { toast('Stufe muss eine Zahl sein.'); return; }
      btn.disabled = true; btn.textContent = 'Speichere…';
      const { error } = await updateBelohnungsStufe(origStufe, beraterId, data);
      btn.disabled = false; btn.textContent = 'Speichern';
      if (error) { toast('Fehler: ' + (error.message || '')); return; }
      toast('Stufe gespeichert.');
      await renderBelohnungen();
    });
  });
  document.querySelectorAll('[data-del-stufe]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const stufe = parseInt(btn.dataset.delStufe, 10);
      if (!confirm(`Stufe ${stufe} wirklich löschen?`)) return;
      const { error } = await deleteBelohnungsStufe(stufe, beraterId);
      if (error) { toast('Fehler: ' + (error.message || '')); return; }
      toast('Stufe gelöscht.');
      await renderBelohnungen();
    });
  });
}

async function onNewStufe() {
  const list = await getBelohnungsStufen(beraterId);
  const nextStufe = list.reduce((m, s) => Math.max(m, s.stufe), 0) + 1;
  const { error } = await insertBelohnungsStufe({
    stufe: nextStufe, titel: 'Neue Stufe', beschreibung: '—', berater_id: beraterId, sort_order: nextStufe,
  });
  if (error) { toast('Anlegen fehlgeschlagen: ' + (error.message || '')); return; }
  toast(`Stufe ${nextStufe} angelegt.`);
  await renderBelohnungen();
}

/* ---------- Helpers ---------- */
const toastEl = document.getElementById('hToast');
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
function escapeAttr(s) { return escapeHtml(s); }
