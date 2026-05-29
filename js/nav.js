/**
 * Phase 13 · Globale App-Navigation (Sidebar Desktop · Bottom-Nav Mobile · Hamburger-Drawer)
 *
 * Mount: <div id="appNav"></div> in jeder Auth-Page direkt nach <body>.
 * Wir injizieren Sidebar (visible ≥1024px), Bottom-Nav (≤1023px, 3 Items), Hamburger-Drawer (≤1023px, alle Items).
 */
import { icon } from './icons.js';

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

/** Render bottom-nav (3 Items only) */
function bottomItem(item) {
  const active = isActive(item) ? ' active' : '';
  return `
    <a class="navbottom-item${active}" href="${item.href}">
      <span class="navbottom-icon">${icon(item.icon, { size: 20 })}</span>
      <span class="navbottom-label">${item.label}</span>
    </a>`;
}

/** Public: render the navigation into #appNav (and #appNavBottom optional). */
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
      <button class="nav-hamburger" type="button" aria-label="Menü öffnen">${icon('Menu', { size: 22 })}</button>
      <div class="nav-drawer" hidden>
        <button class="nav-drawer-close" type="button" aria-label="Menü schließen">${icon('X', { size: 22 })}</button>
        <div class="nav-brand"><span class="nav-brand-mark"></span><span class="nav-brand-text">Empfehlungs-HUB</span></div>
        <nav class="nav-list">${NAV_ITEMS.map(sidebarItem).join('')}</nav>
      </div>
      <nav class="nav-bottom">${NAV_ITEMS.filter(i => i.bottom).map(bottomItem).join('')}</nav>
    `;

    const ham = sidebar.querySelector('.nav-hamburger');
    const drawer = sidebar.querySelector('.nav-drawer');
    const close = sidebar.querySelector('.nav-drawer-close');
    ham?.addEventListener('click', () => { drawer.hidden = false; document.body.classList.add('nav-drawer-open'); });
    close?.addEventListener('click', () => { drawer.hidden = true; document.body.classList.remove('nav-drawer-open'); });
    drawer?.addEventListener('click', (e) => { if (e.target === drawer) { drawer.hidden = true; document.body.classList.remove('nav-drawer-open'); } });
  }
}

// Auto-init if a #appNav exists on DOMContentLoaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNav);
  } else {
    renderNav();
  }
}
