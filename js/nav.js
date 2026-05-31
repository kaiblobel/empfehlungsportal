/**
 * Phase 13 · Globale App-Navigation (Sidebar Desktop · Bottom-Nav Mobile · Hamburger-Drawer)
 *
 * Mount: <div id="appNav"></div> in jeder Auth-Page direkt nach <body>.
 * Wir injizieren Sidebar (visible ≥1024px), Bottom-Nav (≤1023px, 3 Items), Hamburger-Drawer (≤1023px, alle Items).
 */
import { icon } from './icons.js';
import { initCmdK } from './cmdk.js';
import './pwa.js'; // registers service worker

const ROOT = (typeof window !== 'undefined' && window.location.origin) || '';

/**
 * Berechnet absoluten Pfad zu einer Ziel-Seite, robust gegen current path depth.
 * `/hub.html`, `/dashboard/empfehlungen.html`, etc.
 */
function path(p) {
  return p.startsWith('/') ? p : '/' + p;
}

/** Nav-Item-Definitionen */
export const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',     icon: 'LayoutDashboard', href: path('hub.html'),                       bottom: true },
  { id: 'empfehlungen',label: 'Empfehlungen',  icon: 'Users',           href: path('dashboard/empfehlungen.html'),    bottom: true,
    subs: [
      { label: 'Alle',         href: path('dashboard/empfehlungen.html') },
      { label: 'Anrufwünsche', href: path('dashboard/empfehlungen.html?status=anrufwunsch'), icon: 'PhoneCall' },
      { label: 'Interesse',    href: path('dashboard/empfehlungen.html?status=interessiert'), icon: 'HeartHandshake' },
      { label: 'Offen',        href: path('dashboard/empfehlungen.html?status=offen') },
    ] },
  { id: 'programm',    label: 'Programm',      icon: 'Gift',            href: path('programm.html'),                  bottom: true,
    subs: [
      { label: 'Belohnungen', href: path('programm.html') },
      { label: 'Champions',   href: path('dashboard/empfehler.html'),  icon: 'Trophy' },
    ] },
  { id: 'vorlagen',    label: 'Themen-Seiten', icon: 'FileText',        href: path('vorlagen.html'),                  bottom: false,
    subs: [
      { label: 'Allgemein',      href: path('vorlagen.html#allgemein') },
      { label: 'Baufinanzierung',href: path('vorlagen.html#baufi') },
      { label: 'Förderung',      href: path('vorlagen.html#foerderungen') },
      { label: 'Investment',     href: path('vorlagen.html#investment') },
      { label: 'Selbständige',   href: path('vorlagen.html#selbstaendige') },
      { label: 'Absicherung',    href: path('vorlagen.html#absicherung') },
    ] },
  { id: 'praesentation',label: 'Präsentation', icon: 'Presentation',    href: path('index.html'),                     bottom: false },
  { id: 'analysen',    label: 'Analysen',      icon: 'BarChart3',       href: path('dashboard/overview.html'),        bottom: false },
  { id: 'einstellungen',label: 'Einstellungen',icon: 'Settings',        href: path('dashboard/settings.html'),        bottom: false },
];

/** URL-aware active-state detection. */
function isActive(item) {
  const cur = window.location.pathname.toLowerCase();
  const target = new URL(item.href, window.location.origin).pathname.toLowerCase();
  if (target === cur) return true;
  // Special-case: /dashboard/empfehlungen.html als parent für detail/neu
  if (item.id === 'empfehlungen' && (cur.endsWith('/dashboard/empfehlungen.html') || cur.endsWith('/dashboard/detail.html') || cur.endsWith('/dashboard/neu.html'))) return true;
  if (item.id === 'analysen' && cur.endsWith('/dashboard/overview.html')) return true;
  if (item.id === 'einstellungen' && cur.endsWith('/dashboard/settings.html')) return true;
  return false;
}

/** Render an item as sidebar-row */
function sidebarItem(item) {
  const active = isActive(item) ? ' active' : '';
  const subs = item.subs ? `<div class="nav-subs">${item.subs.map(s => `
    <a class="nav-sub" href="${s.href}">
      ${s.icon ? `<span class="nav-sub-icon">${icon(s.icon, { size: 14 })}</span>` : ''}
      <span>${s.label}</span>
    </a>`).join('')}</div>` : '';
  return `
    <div class="nav-group${active}">
      <a class="nav-item${active}" href="${item.href}">
        <span class="nav-item-icon">${icon(item.icon, { size: 18 })}</span>
        <span class="nav-item-label">${item.label}</span>
      </a>
      ${subs}
    </div>`;
}

/** Public: render the navigation into #appNav. */
export function renderNav(opts = {}) {
  const sidebar = document.getElementById('appNav');
  if (sidebar) {
    sidebar.innerHTML = `
      <aside class="nav-sidebar">
        <div class="nav-brand">
          <span class="nav-brand-mark"></span>
          <span class="nav-brand-text">Empfehlungs-HUB</span>
        </div>
        <nav class="nav-list">${NAV_ITEMS.map(sidebarItem).join('')}</nav>
      </aside>
      <button class="nav-collapse-toggle" type="button" aria-label="Menü ein-/ausblenden" title="Menü ein-/ausblenden">${icon('Menu', { size: 20 })}</button>
      <button class="nav-hamburger" type="button" aria-label="Menü öffnen">${icon('Menu', { size: 22 })}</button>
      <div class="nav-drawer" hidden>
        <div class="nav-drawer-panel">
          <button class="nav-drawer-close" type="button" aria-label="Menü schließen">${icon('X', { size: 22 })}</button>
          <div class="nav-brand"><span class="nav-brand-mark"></span><span class="nav-brand-text">Empfehlungs-HUB</span></div>
          <nav class="nav-list">${NAV_ITEMS.map(sidebarItem).join('')}</nav>
          <button class="nav-drawer-logout" type="button" id="navDrawerLogout">${icon('LogOut', { size: 16 })}<span>Abmelden</span></button>
        </div>
      </div>
    `;

    const ham = sidebar.querySelector('.nav-hamburger');
    const drawer = sidebar.querySelector('.nav-drawer');
    const panel = sidebar.querySelector('.nav-drawer-panel');
    const close = sidebar.querySelector('.nav-drawer-close');
    const logout = sidebar.querySelector('#navDrawerLogout');
    const collapseBtn = sidebar.querySelector('.nav-collapse-toggle');

    // Phase 42: Persistenter Sidebar-Collapse auf Desktop (≥1024px)
    const COLLAPSE_KEY = 'navCollapsed';
    if (localStorage.getItem(COLLAPSE_KEY) === '1') {
      document.body.classList.add('nav-collapsed');
    }
    collapseBtn?.addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('nav-collapsed');
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    });
    // Cmd/Ctrl + \ Shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        collapseBtn?.click();
      }
    });

    // Phase 37: Drawer-Animation via CSS transform + body.nav-drawer-open
    // hidden-Attribut bleibt für a11y, aber CSS-Visibility wird über die Klasse gesteuert.
    let closeTimer = null;
    const openDrawer = () => {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      drawer.hidden = false;
      // Force reflow vor Klassen-Toggle damit transition läuft
      requestAnimationFrame(() => document.body.classList.add('nav-drawer-open'));
    };
    const closeDrawer = () => {
      document.body.classList.remove('nav-drawer-open');
      closeTimer = setTimeout(() => { drawer.hidden = true; closeTimer = null; }, 240);
    };
    const isOpen = () => document.body.classList.contains('nav-drawer-open');
    const toggleDrawer = () => { isOpen() ? closeDrawer() : openDrawer(); };

    ham?.addEventListener('click', toggleDrawer);
    close?.addEventListener('click', closeDrawer);
    // Backdrop-Click: wenn nicht auf Panel geklickt → schließen
    drawer?.addEventListener('click', (e) => {
      if (panel && !panel.contains(e.target)) closeDrawer();
    });
    // Esc + Outside-Tap auf Touch-Devices
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) closeDrawer();
    });
    logout?.addEventListener('click', async () => {
      try {
        const m = await import('./dashboard.js');
        m.logout();
      } catch (e) { console.warn('logout failed', e); }
    });
  }
}

// Auto-init if a #appNav exists on DOMContentLoaded
if (typeof document !== 'undefined') {
  const init = () => { renderNav(); initCmdK(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
