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

  // Nur die eigenen Zeilen bearbeiten. Ohne Filter stünde jede Themenseite
  // mehrfach in der Liste (die Zeilen anderer Berater sind öffentlich lesbar).
  currentBeraterId = berater.id;
  const list = await getVorlagen(currentBeraterId);
  const wrap = document.getElementById('cmsList');
  if (!list.length) {
    wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-secondary);">Themen-Seiten konnten nicht geladen werden.</div>';
    return;
  }
  wrap.innerHTML = list.map(renderCard).join('');
  attachHandlers(list);
})();

/**
 * Auswahl statt Tippen: Symbole, die für Themen taugen. Vorher musste hier der
 * englische Lucide-Name eingetippt werden.
 */
const SYMBOL_AUSWAHL = [
  ['Compass', 'Kompass'], ['Home', 'Haus'], ['Banknote', 'Geldschein'],
  ['Briefcase', 'Aktentasche'], ['TrendingUp', 'Aufwärtstrend'], ['ShieldCheck', 'Schutzschild'],
  ['Heart', 'Herz'], ['Sparkles', 'Funken'], ['Users', 'Menschen'], ['FileText', 'Dokument'],
];

function renderSymbolAuswahl(aktuell) {
  const gewaehlt = aktuell || 'Compass';
  const knoepfe = SYMBOL_AUSWAHL.map(([name, titel]) => `
    <button type="button" class="cms-symbol${name === gewaehlt ? ' active' : ''}"
            data-symbol="${escapeAttr(name)}" title="${escapeAttr(titel)}" aria-label="${escapeAttr(titel)}">
      ${ICONS[name] || ''}
    </button>`).join('');
  return `<div class="cms-symbols">${knoepfe}<input type="hidden" data-f="icon" value="${escapeAttr(gewaehlt)}" /></div>`;
}

/**
 * Bewusst nur die Felder, die auch irgendwo ankommen (Phase 126).
 * Bild, die drei Vorteile und der Subtext standen zwar im Editor, wurden aber
 * von keiner Seite mehr gelesen: die Empfänger-Seite wurde umgebaut und ihre
 * Anker (eFinanzImg, eV1Titel …) existieren nicht mehr. Die Werte bleiben in
 * der Datenbank stehen — sie werden hier nur nicht mehr angeboten.
 */
function renderCard(v) {
  // Die Vorschau muss die Seite zeigen, auf der eine echte Empfehlung landet.
  // Vorher oeffnete sie fuer jedes Thema die allgemeine Empfaengerseite; man sah
  // also nie das, was der Empfohlene wirklich zu sehen bekommt.
  const sonderwege = {
    baufi: 'baufi.html?vorlage=baufi',
    allgemein: 'empfaenger.html?vorlage=allgemein',
    kinder: 'kidz-empfehlung.html',
  };
  const vorschau = sonderwege[v.slug] || `thema.html?vorlage=${encodeURIComponent(v.slug)}`;
  return `
    <details class="cms-card" data-slug="${v.slug}">
      <summary>
        ${renderIcon(v.icon)}
        <span class="titel">${escapeHtml(v.titel)}</span>
        <span class="slug">${escapeHtml(v.slug)}</span>
        ${v.in_arbeit ? '<span class="cms-pill wip">In Arbeit</span>' : ''}
      </summary>
      <div class="cms-body">

        <div class="cms-group">
          <div class="cms-group-title">In der Themen-Auswahl</div>
          <p class="cms-group-sub">So erscheint das Thema in deiner Präsentation und im Empfehlungs-Formular des Promoters.</p>

          <div class="cms-field">
            <label>Name des Themas</label>
            <input data-f="titel" type="text" value="${escapeAttr(v.titel || '')}" />
          </div>

          <div class="cms-field">
            <label>Symbol</label>
            <span class="cms-hint">Steht links neben dem Namen.</span>
            ${renderSymbolAuswahl(v.icon)}
          </div>

          <div class="cms-field">
            <label>Unterzeile</label>
            <span class="cms-hint">Die kleine Zeile unter dem Namen — ein Satz, worum es geht.</span>
            <input data-f="headline" type="text" value="${escapeAttr(v.headline || '')}" />
          </div>

          <div class="cms-field cms-field-schmal">
            <label>Reihenfolge</label>
            <span class="cms-hint">Kleinere Zahl steht weiter oben.</span>
            <input data-f="sort_order" type="number" value="${v.sort_order ?? 0}" />
          </div>
        </div>

        <div class="cms-group">
          <div class="cms-group-title">Der Knopf zum Finanzcheck</div>
          <p class="cms-group-sub">Der Weg, den dein Kontakt von der Themen-Seite aus weitergeht.</p>

          <div class="cms-field">
            <label>Beschriftung</label>
            <input data-f="cta_text" type="text" value="${escapeAttr(v.cta_text || '')}" />
          </div>
          <div class="cms-field">
            <label>Wohin er führt</label>
            <input data-f="quickcheck_url" type="text" value="${escapeAttr(v.quickcheck_url || '')}" />
          </div>
        </div>

        <div class="cms-group">
          <div class="cms-group-title">Nur für dich</div>
          <label class="cms-switch">
            <input type="checkbox" data-f-check="in_arbeit" ${v.in_arbeit ? 'checked' : ''} />
            <span class="cms-switch-track"></span>
            <span class="cms-switch-text">
              <strong>Noch in Arbeit</strong>
              <span>Markiert das Thema nur in dieser Liste. Für deine Kontakte ändert sich nichts.</span>
            </span>
          </label>
        </div>

        <div class="cms-actions">
          <button class="cms-save" type="button" data-save="${v.slug}">Speichern</button>
          <a class="cms-preview-link" href="${vorschau}" target="_blank">Vorschau öffnen ↗</a>
        </div>
      </div>
    </details>`;
}

function attachHandlers(list) {
  // Symbol-Auswahl: Klick setzt das versteckte Feld, das gespeichert wird.
  document.querySelectorAll('.cms-symbols').forEach(gruppe => {
    const feld = gruppe.querySelector('[data-f="icon"]');
    gruppe.querySelectorAll('.cms-symbol').forEach(btn => {
      btn.addEventListener('click', () => {
        gruppe.querySelectorAll('.cms-symbol').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (feld) feld.value = btn.dataset.symbol;
      });
    });
  });

  document.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slug = btn.dataset.save;
      const card = btn.closest('.cms-card');
      const fields = card.querySelectorAll('[data-f]');
      const data = {};
      fields.forEach(f => {
        const k = f.dataset.f;
        // Reihenfolge ist eine Zahl: die 0 muss eine 0 bleiben. Vorher lief sie
        // durch `v || null` und wurde beim Speichern zu NULL — die erste
        // Themenseite (sort_order 0) rutschte damit ans Ende der Auswahl.
        if (k === 'sort_order') { data[k] = parseInt(f.value, 10) || 0; return; }
        const v = String(f.value).trim();
        data[k] = v || null;
      });
      // In-Arbeit-Marker (Checkbox, nicht data-f)
      const wip = card.querySelector('[data-f-check="in_arbeit"]');
      if (wip) data.in_arbeit = wip.checked;

      btn.disabled = true;
      btn.textContent = 'Speichere…';

      // berater_id mitgeben, sonst trifft das Update auch die gleichnamige
      // Themenseite eines anderen Beraters.
      const { error } = await updateVorlage(slug, data, currentBeraterId);

      if (error) {
        toast('Speichern fehlgeschlagen: ' + (error.message || ''));
        btn.disabled = false;
        btn.textContent = 'Speichern';
        return;
      }

      toast('Gespeichert. Die Änderung ist sofort live.');
      btn.disabled = false;
      btn.textContent = 'Speichern';

      // Kopfzeile der Karte mitziehen, damit Name und Symbol stimmen
      const summary = card.querySelector('summary');
      const titelEl = summary?.querySelector('.titel');
      if (titelEl && data.titel) titelEl.textContent = data.titel;
      const iconEl = summary?.querySelector('.icon');
      if (iconEl && data.icon) iconEl.outerHTML = renderIcon(data.icon);
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
