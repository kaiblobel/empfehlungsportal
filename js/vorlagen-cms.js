import { getVorlagen, updateVorlage } from './supabase.js';
import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { ICONS } from './icons.js';

let currentBeraterId = null;

function renderIcon(name) {
  if (name && ICONS[name]) {
    return `<span class="icon icon-svg" aria-hidden="true">${ICONS[name]}</span>`;
  }
  return `<span class="icon">${escapeHtml(name || '📋')}</span>`;
}

document.getElementById('logoutBtn').addEventListener('click', logout);
applyBeraterHeader();

(async () => {
  const session = await requireAuth();
  if (!session) return;

  // Themen-Seiten sind GETEILT und nur vom Admin editierbar. Nicht-Admins raus.
  const berater = await getCurrentBerater();
  if (!berater?.ist_admin) {
    window.location.href = '/hub.html';
    return;
  }

  const list = await getVorlagen();
  const wrap = document.getElementById('cmsList');
  if (!list.length) {
    wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-secondary);">Themen-Seiten konnten nicht geladen werden.</div>';
    return;
  }
  wrap.innerHTML = list.map(renderCard).join('');
  attachHandlers(list);
})();

function renderCard(v) {
  return `
    <details class="cms-card" data-slug="${v.slug}">
      <summary>
        ${renderIcon(v.icon)}
        <span class="titel">${escapeHtml(v.titel)}</span>
        <span class="slug">${escapeHtml(v.slug)}</span>
        ${v.in_arbeit ? '<span class="wip-badge" style="margin-left:8px;padding:2px 9px;border-radius:999px;background:#FBEEC8;color:#8A6D1B;font-size:11px;font-weight:700;">🚧 In Arbeit</span>' : ''}
      </summary>
      <div class="cms-body">
        <label class="pv-check" style="display:inline-flex;align-items:center;gap:7px;margin-bottom:6px;font-size:13.5px;">
          <input type="checkbox" data-f-check="in_arbeit" ${v.in_arbeit ? 'checked' : ''}/> In Arbeit (Markierung nur für dich, Kunden sehen die Seite normal)
        </label>
        <div class="cms-row-2">
          <div><label>Titel</label><input data-f="titel" value="${escapeAttr(v.titel || '')}" /></div>
          <div><label>Icon (Lucide-Name, z. B. Home, Banknote, ShieldCheck)</label><input data-f="icon" value="${escapeAttr(v.icon || '')}" /></div>
        </div>
        <div><label>Subtext (Hero-Body auf Empfänger-Seite)</label><textarea data-f="subtext">${escapeHtml(v.subtext || '')}</textarea></div>
        <div><label>Headline (Finanzcheck)</label><input data-f="headline" value="${escapeAttr(v.headline || '')}" /></div>
        <div>
          <label>Hero-Bild URL</label>
          <input data-f="hero_bild_url" value="${escapeAttr(v.hero_bild_url || '')}" />
          ${v.hero_bild_url ? `<img class="cms-img-preview" src="${escapeAttr(v.hero_bild_url)}" alt="" onerror="this.style.display='none'"/>` : ''}
        </div>
        <div><label>Quickcheck-URL (CTA-Link)</label><input data-f="quickcheck_url" value="${escapeAttr(v.quickcheck_url || '')}" /></div>
        <div><label>CTA-Text</label><input data-f="cta_text" value="${escapeAttr(v.cta_text || '')}" /></div>

        <div class="cms-row-2">
          <div><label>Vorteil 1 · Titel</label><input data-f="vorteil_1_titel" value="${escapeAttr(v.vorteil_1_titel || '')}" /></div>
          <div><label>Sort-Order</label><input data-f="sort_order" type="number" value="${v.sort_order ?? 0}" /></div>
        </div>
        <div><label>Vorteil 1 · Text</label><textarea data-f="vorteil_1_text">${escapeHtml(v.vorteil_1_text || '')}</textarea></div>
        <div><label>Vorteil 2 · Titel</label><input data-f="vorteil_2_titel" value="${escapeAttr(v.vorteil_2_titel || '')}" /></div>
        <div><label>Vorteil 2 · Text</label><textarea data-f="vorteil_2_text">${escapeHtml(v.vorteil_2_text || '')}</textarea></div>
        <div><label>Vorteil 3 · Titel</label><input data-f="vorteil_3_titel" value="${escapeAttr(v.vorteil_3_titel || '')}" /></div>
        <div><label>Vorteil 3 · Text</label><textarea data-f="vorteil_3_text">${escapeHtml(v.vorteil_3_text || '')}</textarea></div>

        <div class="cms-actions">
          <button class="cms-save" type="button" data-save="${v.slug}">Speichern</button>
          <a class="cms-preview-link" href="empfaenger.html?token=d127cf3f-2d6b-4cd7-9640-64a0941e11ac&vorlage=${v.slug}" target="_blank">Vorschau öffnen ↗</a>
        </div>
      </div>
    </details>`;
}

function attachHandlers(list) {
  document.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slug = btn.dataset.save;
      const card = btn.closest('.cms-card');
      const fields = card.querySelectorAll('[data-f]');
      const data = {};
      fields.forEach(f => {
        const k = f.dataset.f;
        let v = f.value;
        if (k === 'sort_order') v = parseInt(v, 10) || 0;
        if (typeof v === 'string') v = v.trim();
        data[k] = v || null;
      });
      // In-Arbeit-Marker (Checkbox, nicht data-f)
      const wip = card.querySelector('[data-f-check="in_arbeit"]');
      if (wip) data.in_arbeit = wip.checked;

      btn.disabled = true;
      btn.textContent = 'Speichere…';

      const { error } = await updateVorlage(slug, data);

      if (error) {
        toast('Speichern fehlgeschlagen: ' + (error.message || ''));
        btn.disabled = false;
        btn.textContent = 'Speichern';
        return;
      }

      toast(`Vorlage "${slug}" gespeichert.`);
      btn.disabled = false;
      btn.textContent = 'Speichern';

      // Bild-Preview ggf. updaten
      const preview = card.querySelector('.cms-img-preview');
      const imgEl = card.querySelector('[data-f="hero_bild_url"]');
      if (preview && imgEl) preview.src = imgEl.value || '';
    });
  });
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
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }
