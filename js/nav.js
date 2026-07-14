/**
 * Phase 13 · Globale App-Navigation (Sidebar Desktop · Bottom-Nav Mobile · Hamburger-Drawer)
 *
 * Mount: <div id="appNav"></div> in jeder Auth-Page direkt nach <body>.
 * Wir injizieren Sidebar (visible ≥1024px), Bottom-Nav (≤1023px, 3 Items), Hamburger-Drawer (≤1023px, alle Items).
 */
import { icon } from './icons.js';
import { initCmdK } from './cmdk.js';
import { mountContextMenu } from './context-menu.js';
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
  { id: 'programm',    label: 'Programm',      icon: 'Gift',            href: path('programm-verwalten.html'),        bottom: false, adminOnly: true,
    subs: [
      { label: 'Belohnungen',       href: path('programm-verwalten.html#belohnungen') },
      { label: 'Erfolgsgeschichten',href: path('programm-verwalten.html#erfolgsgeschichten') },
      { label: 'Themen-Seiten',     href: path('vorlagen.html'), icon: 'FileText' },
    ] },
  { id: 'champions',   label: 'Champions (Promoter)', icon: 'Trophy',     href: path('dashboard/empfehler.html'),       bottom: false },
  { id: 'praesentation',label: 'Präsentation', icon: 'Presentation',    href: path('programm.html?mode=slides'),      bottom: false },
  { id: 'analysen',    label: 'Analysen',      icon: 'BarChart3',       href: path('dashboard/overview.html'),        bottom: false },
  { id: 'berater',     label: 'Berater',       icon: 'Users',           href: path('berater.html'),                   bottom: false, adminOnly: true },
  { id: 'praemien',    label: 'Prämien',       icon: 'Banknote',        href: path('praemien.html'),                  bottom: false, adminOnly: true },
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
  // Programm-Verwaltung ist auch aktiv, wenn man auf der Themen-Seiten-CMS ist (dorthin gefaltet)
  if (item.id === 'programm' && (cur.endsWith('/programm-verwalten.html') || cur.endsWith('/vorlagen.html'))) return true;
  if (item.id === 'champions' && cur.endsWith('/dashboard/empfehler.html')) return true;
  return false;
}

/** Render an item as sidebar-row */
function sidebarItem(item) {
  const active = isActive(item) ? ' active' : '';
  // Admin-only Items (z. B. Berater-Verwaltung) standardmäßig verstecken; werden
  // nur eingeblendet, wenn der eingeloggte Berater Admin ist (siehe revealAdminItems).
  const adminCls = item.adminOnly ? ' nav-admin-only' : '';
  const adminStyle = item.adminOnly ? ' style="display:none"' : '';
  const hasSubs = Array.isArray(item.subs) && item.subs.length > 0;

  if (!hasSubs) {
    return `
    <div class="nav-group${active}${adminCls}"${adminStyle} data-nav-id="${item.id}">
      <a class="nav-item${active}" href="${item.href}">
        <span class="nav-item-icon">${icon(item.icon, { size: 18 })}</span>
        <span class="nav-item-label">${item.label}</span>
      </a>
    </div>`;
  }

  // Item mit Unterpunkten: Chevron als eigener Button neben dem Link (nicht IM <a>).
  const subs = `<div class="nav-subs"><div class="nav-subs-inner">${item.subs.map(s => `
    <a class="nav-sub" href="${s.href}">
      ${s.icon ? `<span class="nav-sub-icon">${icon(s.icon, { size: 14 })}</span>` : ''}
      <span>${s.label}</span>
    </a>`).join('')}</div></div>`;
  return `
    <div class="nav-group has-subs${active}${adminCls}"${adminStyle} data-nav-id="${item.id}">
      <div class="nav-item-row">
        <a class="nav-item${active}" href="${item.href}">
          <span class="nav-item-icon">${icon(item.icon, { size: 18 })}</span>
          <span class="nav-item-label">${item.label}</span>
        </a>
        <button class="nav-sub-toggle" type="button" aria-expanded="false" aria-label="Unterpunkte ein-/ausklappen">
          ${icon('ChevronDown', { size: 14 })}
        </button>
      </div>
      ${subs}
    </div>`;
}

/** Public: render the navigation into #appNav. */
export function renderNav(opts = {}) {
  const sidebar = document.getElementById('appNav');
  if (sidebar) {
    const appVer = (typeof window !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : '';
    sidebar.innerHTML = `
      <aside class="nav-sidebar">
        <div class="nav-brand">
          <span class="nav-brand-mark"></span>
          <span class="nav-brand-text">Empfehlungs-HUB</span>
        </div>
        <nav class="nav-list">${NAV_ITEMS.map(sidebarItem).join('')}</nav>
        ${appVer ? `<a class="nav-version" href="/changelog.html" title="${window.APP_PHASE || ''}">${appVer}</a>` : ''}
        <button class="nav-collapse-toggle" type="button" aria-label="Menü ein-/ausblenden" title="Menü ein-/ausblenden (⌘\\)">
          <span class="nav-collapse-icon-expand">${icon('ChevronLeft', { size: 18 })}</span>
          <span class="nav-collapse-icon-collapse">${icon('ChevronRight', { size: 18 })}</span>
        </button>
      </aside>
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

    // Phase 75: Untermenüs als Klick-Accordion (kein Hover-Aufklappen mehr).
    // Offene Gruppen werden gemerkt; der aktuelle Bereich ist automatisch offen.
    const OPEN_KEY = 'navOpenGroups';
    let openGroups;
    try { openGroups = new Set(JSON.parse(localStorage.getItem(OPEN_KEY) || '[]')); }
    catch (_) { openGroups = new Set(); }
    // Aktive Gruppe(n) automatisch aufnehmen (einmalig, dann gemerkt).
    let openChanged = false;
    NAV_ITEMS.forEach((it) => {
      if (it.subs && isActive(it) && !openGroups.has(it.id)) { openGroups.add(it.id); openChanged = true; }
    });
    const persistOpen = () => { try { localStorage.setItem(OPEN_KEY, JSON.stringify([...openGroups])); } catch (_) {} };
    if (openChanged) persistOpen();
    // Initialzustand auf alle Gruppen (Sidebar + Drawer) anwenden.
    const applyOpenState = () => {
      sidebar.querySelectorAll('.nav-group.has-subs').forEach((g) => {
        const isOpen = openGroups.has(g.dataset.navId);
        g.classList.toggle('open', isOpen);
        const btn = g.querySelector('.nav-sub-toggle');
        if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    };
    applyOpenState();
    // Chevron-Klick (Delegation deckt Sidebar UND Drawer ab).
    sidebar.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-sub-toggle');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const group = btn.closest('.nav-group');
      const id = group?.dataset.navId;
      if (!id) return;
      if (openGroups.has(id)) openGroups.delete(id); else openGroups.add(id);
      persistOpen();
      applyOpenState();
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

    // Multi-Tenant: Funnel-Links (programm/empfehlen) mit dem Slug des
    // eingeloggten Beraters versehen → Adressleiste zeigt den teilbaren Link.
    applyBeraterSlugToLinks(sidebar);
  }
}

async function applyBeraterSlugToLinks(root) {
  try {
    const { supabase } = await import('./supabase.js');
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const m = await import('./dashboard.js');
    const b = await m.getCurrentBerater();
    if (!b) return;
    // Admin-only Items (Berater-Verwaltung) nur für Admins einblenden.
    if (b.ist_admin) {
      root.querySelectorAll('.nav-admin-only').forEach((el) => { el.style.display = ''; });
      // Badge: offene Prämien am Prämien-Menüpunkt — ploppt auf, sobald eine Empfehlung Kunde wird.
      try {
        const { getOffenePraemienCount } = await import('./supabase.js');
        const n = await getOffenePraemienCount();
        if (n > 0) {
          root.querySelectorAll('a.nav-item[href$="praemien.html"]').forEach((a) => {
            if (a.querySelector('.nav-badge')) return;
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = n > 99 ? '99+' : String(n);
            badge.title = `${n} offene Prämie${n === 1 ? '' : 'n'} zum Auszahlen`;
            a.appendChild(badge);
          });
        }
      } catch (e) { /* Badge ist optional */ }
    }
    if (!b.slug) return;
    root.querySelectorAll('a[href*="programm.html"], a[href*="empfehlen.html"]').forEach((a) => {
      const u = new URL(a.getAttribute('href'), window.location.origin);
      const isFunnel = u.pathname.endsWith('/programm.html') || u.pathname.endsWith('/empfehlen.html');
      if (isFunnel && !u.searchParams.has('berater')) {
        u.searchParams.set('berater', b.slug);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      }
    });
  } catch (e) {
    console.warn('[nav] berater-slug patch failed', e);
  }
}

// Auto-init if a #appNav exists on DOMContentLoaded
if (typeof document !== 'undefined') {
  const init = () => { renderNav(); initCmdK(); mountContextMenu(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
