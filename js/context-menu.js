/**
 * Phase 83 · Globales Rechtsklick-Menü (Berater-Bereich)
 *
 * Zentral aus nav.js eingehängt → erscheint auf allen Auth-Seiten (die laden nav.js),
 * NIE auf den öffentlichen Kundenseiten (die laden nav.js nicht).
 *
 * Koexistenz mit den bestehenden reichhaltigen Item-Menüs
 * (Empfehlungen/Champions/Prämien): Die rufen bei Rechtsklick auf eine Zeile
 * `preventDefault()`. Da unser Listener im Bubble-Phase NACH den Zeilen-Listenern
 * läuft, sehen wir dort `defaultPrevented === true` und halten uns bewusst zurück.
 * Überall sonst zeigen wir das globale Menü statt des rohen Browser-Menüs.
 *
 * In Eingabefeldern (input/textarea/contenteditable) bleibt bewusst das native
 * Menü (Einfügen, Rechtschreibung) — das erwartet man dort.
 */
import { icon } from './icons.js';

let menuEl = null;
let flashEl = null;
let isAdmin = false;

/* ---------- Seitentitel für den Menü-Kopf ---------- */
const PAGE_TITLES = [
  [/\/hub\.html/,                'Dashboard'],
  [/\/dashboard\/empfehlungen/,  'Empfehlungen'],
  [/\/dashboard\/detail/,        'Empfehlung'],
  [/\/dashboard\/neu/,           'Neue Empfehlung'],
  [/\/dashboard\/empfehler/,     'Champions'],
  [/\/dashboard\/promoter/,      'Promoter'],
  [/\/dashboard\/overview/,      'Analysen'],
  [/\/dashboard\/settings/,      'Einstellungen'],
  [/\/praemien/,                 'Prämien'],
  [/\/berater\.html/,            'Berater'],
  [/\/vorlagen/,                 'Themen-Seiten'],
  [/\/programm-verwalten/,       'Programm'],
  [/\/changelog/,                'Changelog'],
];
function pageTitle() {
  const p = location.pathname.toLowerCase();
  for (const [re, t] of PAGE_TITLES) if (re.test(p)) return t;
  return 'Empfehlungs-HUB';
}

/* ---------- kleine Helfer ---------- */
function go(p) { location.href = p; }

function flash(msg) {
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.className = 'ctx-flash';
    flashEl.style.cssText =
      'position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(12px);' +
      'z-index:3000;background:#1A1A1A;color:#fff;padding:9px 16px;border-radius:10px;' +
      'font:500 13px/1.3 Inter,sans-serif;box-shadow:0 10px 30px rgba(20,18,12,.28);' +
      'opacity:0;transition:opacity .2s ease,transform .2s ease;pointer-events:none;';
    document.body.appendChild(flashEl);
  }
  flashEl.textContent = msg;
  requestAnimationFrame(() => {
    flashEl.style.opacity = '1';
    flashEl.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    flashEl.style.opacity = '0';
    flashEl.style.transform = 'translateX(-50%) translateY(12px)';
  }, 1600);
}

async function copy(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    flash('Kopiert');
  } catch (_) {
    flash('Kopieren nicht möglich');
  }
}

/** Command-Palette (cmdk.js) öffnen — hört auf ⌘/Strg + K. */
function openSearch() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
}

/* ---------- Aktionen je nach Rechtsklick-Kontext ---------- */
function buildActions(e) {
  const acts = [];
  const sel = (window.getSelection && String(window.getSelection())) || '';
  const selText = sel.trim();
  const link = e.target.closest ? e.target.closest('a[href]') : null;

  // Kontext-bezogene Aktionen (nur wenn zutreffend)
  if (selText) {
    const short = selText.length > 26 ? selText.slice(0, 26) + '…' : selText;
    acts.push({ label: `„${short}" kopieren`, icon: 'Copy', run: () => copy(selText) });
  }
  if (link) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('tel:')) {
      acts.push({ label: 'Anrufen', icon: 'PhoneCall', run: () => { location.href = href; } });
      acts.push({ label: 'Nummer kopieren', icon: 'Copy', run: () => copy(href.replace(/^tel:/, '')) });
    } else if (href.startsWith('mailto:')) {
      acts.push({ label: 'E-Mail schreiben', icon: 'Mail', run: () => { location.href = href; } });
      acts.push({ label: 'Adresse kopieren', icon: 'Copy', run: () => copy(href.replace(/^mailto:/, '')) });
    } else if (href && href !== '#' && !href.startsWith('javascript:')) {
      const abs = new URL(href, location.href).href;
      acts.push({ label: 'Öffnen', icon: 'ArrowRight', run: () => { location.href = abs; } });
      acts.push({ label: 'In neuem Tab öffnen', icon: 'ExternalLink', run: () => window.open(abs, '_blank', 'noopener') });
      acts.push({ label: 'Link kopieren', icon: 'Link2', run: () => copy(abs) });
    }
  }
  if (acts.length) acts.push({ sep: true });

  // Primär-Aktionen
  acts.push({ label: 'Neue Empfehlung', icon: 'Plus', run: () => go('/dashboard/neu.html') });
  acts.push({ label: 'Suche öffnen', icon: 'Search', kbd: '⌘K', run: openSearch });
  acts.push({ sep: true });

  // Sprünge
  acts.push({ label: 'Zum Dashboard', icon: 'LayoutDashboard', run: () => go('/hub.html') });
  acts.push({ label: 'Empfehlungen', icon: 'Users', run: () => go('/dashboard/empfehlungen.html') });
  acts.push({ label: 'Champions', icon: 'Trophy', run: () => go('/dashboard/empfehler.html') });
  if (isAdmin) acts.push({ label: 'Prämien', icon: 'Banknote', run: () => go('/praemien.html') });
  acts.push({ label: 'Einstellungen', icon: 'Settings', run: () => go('/dashboard/settings.html') });
  acts.push({ sep: true });

  acts.push({ label: 'Seite aktualisieren', icon: 'RefreshCw', muted: true, run: () => location.reload() });
  return acts;
}

/* ---------- Rendern & Positionieren ---------- */
function ensureMenu() {
  if (menuEl) return menuEl;
  menuEl = document.createElement('div');
  menuEl.id = 'globalCtxMenu';
  menuEl.className = 'ctx-menu';
  menuEl.setAttribute('role', 'menu');
  menuEl.hidden = true;
  document.body.appendChild(menuEl);
  return menuEl;
}

function hide() {
  if (menuEl) menuEl.hidden = true;
}

function actionHtml(a, i) {
  if (a.sep) return '<div class="ctx-sep"></div>';
  const cls = 'ctx-item' + (a.danger ? ' ctx-danger' : '') + (a.muted ? ' ctx-open' : '');
  const ic = a.icon ? `<span class="ctx-ico" style="display:inline-flex;flex:0 0 16px;color:var(--ink-soft,#9A938A)">${icon(a.icon, { size: 16 })}</span>` : '';
  const kbd = a.kbd ? `<span style="margin-left:auto;font-size:11px;color:var(--ink-soft,#9A938A);letter-spacing:.02em">${a.kbd}</span>` : '';
  return `<button class="${cls}" type="button" role="menuitem" data-i="${i}">${ic}<span style="flex:1 1 auto">${a.label}</span>${kbd}</button>`;
}

function show(x, y, actions) {
  const m = ensureMenu();
  m.innerHTML =
    `<div class="ctx-head">${pageTitle()}</div>` +
    actions.map(actionHtml).join('');
  m.hidden = false;
  const mw = m.offsetWidth, mh = m.offsetHeight;
  const px = Math.min(x, window.innerWidth - mw - 8);
  const py = Math.min(y, window.innerHeight - mh - 8);
  m.style.left = Math.max(8, px) + 'px';
  m.style.top = Math.max(8, py) + 'px';

  m._actions = actions;
}

/* ---------- Mount ---------- */
export function mountContextMenu() {
  if (window.__ctxMenuMounted) return;
  window.__ctxMenuMounted = true;

  // Admin-Status einmalig ermitteln (steuert die Sichtbarkeit des Prämien-Sprungs).
  (async () => {
    try {
      const m = await import('./dashboard.js');
      const b = await m.getCurrentBerater();
      isAdmin = !!(b && b.ist_admin);
    } catch (_) { /* bleibt false */ }
  })();

  document.addEventListener('contextmenu', (e) => {
    // Eine bestehende Zeilen-/Karten-Aktion hat den Rechtsklick schon übernommen.
    if (e.defaultPrevented) return;
    // In Eingabefeldern das native Menü lassen (Einfügen, Rechtschreibung).
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;

    e.preventDefault();
    show(e.clientX, e.clientY, buildActions(e));
  });

  document.addEventListener('click', (e) => {
    if (!menuEl || menuEl.hidden) return;
    if (!(e.target instanceof Element)) { hide(); return; }
    const btn = e.target.closest('.ctx-item');
    if (btn && menuEl.contains(btn)) {
      const idx = Number(btn.dataset.i);
      const a = (menuEl._actions || [])[idx];
      hide();
      if (a && typeof a.run === 'function') a.run();
      return;
    }
    if (!menuEl.contains(e.target)) hide();
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', () => { if (menuEl && !menuEl.hidden) hide(); }, true);
  window.addEventListener('resize', hide);
}
