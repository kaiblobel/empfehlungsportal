/**
 * Phase 19 · Cmd+K / Ctrl+K Quick-Search Modal
 *
 * Sucht parallel über:
 *  - Empfehlungen (Empfänger-Name)
 *  - Empfehler (Name + Code)
 *  - Themen-Seiten (6 statisch)
 *  - Navigation (Top-Level + Sub-Items)
 *
 * Keyboard: Cmd/Ctrl+K öffnet, Esc schließt, ↑↓ navigiert, Enter aktiviert.
 */
import { supabase } from './supabase.js';
import { icon } from './icons.js';

// Lazy NAV_ITEMS resolver - vermeidet circular dep mit nav.js
async function getNavItems() {
  try { const m = await import('./nav.js'); return m.NAV_ITEMS || []; }
  catch { return []; }
}

let modal = null;
let inputEl = null;
let listEl = null;
let items = [];
let activeIdx = 0;
let dataCache = null;
let navItems = [];

const STATIC_THEMEN = [
  { slug: 'allgemein', titel: 'Allgemein' },
  { slug: 'baufi', titel: 'Baufinanzierung' },
  { slug: 'foerderungen', titel: 'Förderung' },
  { slug: 'investment', titel: 'Investment' },
  { slug: 'selbstaendige', titel: 'Selbständige' },
  { slug: 'absicherung', titel: 'Absicherung' },
];

export function initCmdK() {
  if (modal) return;

  modal = document.createElement('div');
  modal.className = 'cmdk-overlay';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="cmdk-panel" role="dialog" aria-label="Schnellsuche">
      <div class="cmdk-input-wrap">
        <span class="cmdk-icon">${icon('Activity', { size: 16 })}</span>
        <input class="cmdk-input" type="search" placeholder="Suchen … (Empfehlungen · Empfehler · Themen · Navigation)" autocomplete="off" />
        <kbd class="cmdk-kbd">Esc</kbd>
      </div>
      <div class="cmdk-list" role="listbox"></div>
      <div class="cmdk-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> Navigieren</span>
        <span><kbd>Enter</kbd> Öffnen</span>
        <span><kbd>Esc</kbd> Schließen</span>
      </div>
    </div>`;
  document.body.appendChild(modal);
  inputEl = modal.querySelector('.cmdk-input');
  listEl = modal.querySelector('.cmdk-list');

  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  inputEl.addEventListener('input', () => render());
  inputEl.addEventListener('keydown', onKey);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open();
    } else if (e.key === 'Escape' && modal && !modal.hidden) {
      close();
    }
  });
}

async function open() {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add('cmdk-open');
  inputEl.value = '';
  inputEl.focus();
  if (!navItems.length) navItems = await getNavItems();
  if (!dataCache) dataCache = await loadData();
  render();
}

function close() {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('cmdk-open');
}

function onKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(items.length - 1, activeIdx + 1); highlight(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(0, activeIdx - 1); highlight(); }
  else if (e.key === 'Enter') { e.preventDefault(); activate(items[activeIdx]); }
}

async function loadData() {
  try {
    const [empfehlungen, empfehler] = await Promise.all([
      supabase.from('empfehlungen')
        .select('id, empfaenger_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('empfehler')
        .select('id, name, code')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    return {
      empfehlungen: empfehlungen.data || [],
      empfehler: empfehler.data || [],
    };
  } catch {
    return { empfehlungen: [], empfehler: [] };
  }
}

function render() {
  const q = (inputEl.value || '').trim().toLowerCase();
  const matches = [];

  // Nav-Items (immer zeigen wenn matched)
  for (const n of navItems) {
    if (!q || n.label.toLowerCase().includes(q)) {
      matches.push({ kind: 'Navigation', label: n.label, sub: 'Modul', icon: n.icon, href: n.href });
    }
    if (n.subs) for (const s of n.subs) {
      if (!q || s.label.toLowerCase().includes(q)) {
        matches.push({ kind: 'Navigation', label: s.label, sub: n.label, icon: s.icon || n.icon, href: s.href });
      }
    }
  }

  // Themen
  for (const t of STATIC_THEMEN) {
    if (!q || t.titel.toLowerCase().includes(q) || t.slug.includes(q)) {
      matches.push({ kind: 'Thema', label: t.titel, sub: `Vorlage · ${t.slug}`, icon: 'FileText', href: `/vorlagen.html#${t.slug}` });
    }
  }

  if (dataCache) {
    // Empfehlungen
    for (const e of dataCache.empfehlungen) {
      const name = e.empfaenger_name || '';
      if (!q || name.toLowerCase().includes(q)) {
        matches.push({
          kind: 'Empfehlung',
          label: name || '–',
          sub: `Status: ${e.status || 'offen'}`,
          icon: 'Users',
          href: `/dashboard/detail.html?id=${e.id}`,
        });
      }
    }
    // Empfehler
    for (const e of dataCache.empfehler) {
      const name = e.name || '';
      const code = e.code || '';
      if (!q || name.toLowerCase().includes(q) || code.includes(q)) {
        matches.push({
          kind: 'Empfehler',
          label: name || '–',
          sub: code ? `Code · ${code}` : 'Empfehler',
          icon: 'Trophy',
          href: `/dashboard/empfehler.html`,
        });
      }
    }
  }

  items = matches.slice(0, 30);
  activeIdx = 0;

  if (!items.length) {
    listEl.innerHTML = `<div class="cmdk-empty">Nichts gefunden.</div>`;
    return;
  }

  listEl.innerHTML = items.map((m, i) => `
    <button class="cmdk-item${i === 0 ? ' active' : ''}" data-idx="${i}" role="option">
      <span class="cmdk-item-icon">${icon(m.icon || 'Activity', { size: 16 })}</span>
      <span class="cmdk-item-body">
        <span class="cmdk-item-label">${escapeHtml(m.label)}</span>
        <span class="cmdk-item-sub">${escapeHtml(m.sub || '')}</span>
      </span>
      <span class="cmdk-item-kind">${m.kind}</span>
    </button>`).join('');

  listEl.querySelectorAll('.cmdk-item').forEach((el) => {
    el.addEventListener('click', () => {
      activeIdx = Number(el.dataset.idx);
      activate(items[activeIdx]);
    });
    el.addEventListener('mouseenter', () => {
      activeIdx = Number(el.dataset.idx);
      highlight();
    });
  });
}

function highlight() {
  listEl.querySelectorAll('.cmdk-item').forEach((el, i) => {
    el.classList.toggle('active', i === activeIdx);
  });
  const active = listEl.querySelector('.cmdk-item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function activate(item) {
  if (!item) return;
  close();
  window.location.href = item.href;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
