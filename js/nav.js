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

/**
 * Nav-Item-Definitionen — bewusst in zwei Blöcken:
 *   1. Tagesgeschäft: was du täglich anfasst.
 *   2. Verwaltung (unter der Trennlinie): was du gelegentlich einrichtest.
 * Ein `divider: true`-Eintrag setzt die Trennlinie samt Blocktitel.
 */
export const NAV_ITEMS = [
  // "Empfehlungsportal" oben in der Leiste ist der Produktname — die Seite selbst
  // heißt "Überblick", damit nicht zwei Wörter dasselbe meinen.
  { id: 'dashboard',   label: 'Überblick',     icon: 'LayoutDashboard', href: path('hub.html'),                       bottom: true },
  { id: 'empfehlungen',label: 'Empfehlungen',  icon: 'Users',           href: path('dashboard/empfehlungen.html'),    bottom: true },
  // "Champions" bleibt dem Hub-Abschnitt der Top 3 vorbehalten — hier steht die
  // vollständige Liste, und die heißt auf jeder Folgeseite Promoter.
  { id: 'champions',   label: 'Promoter',      icon: 'Trophy',          href: path('dashboard/empfehler.html'),       bottom: false },
  { id: 'potenziale',  label: 'Potenzialbuch', icon: 'NotebookPen',     href: path('dashboard/potenziale.html'),      bottom: false },
  { id: 'kidz',        label: 'KIDZ',           icon: 'Sparkles',     href: path('dashboard/kidz-gewinnspiel.html'), bottom: false,
    subs: [
      // Die Elternseite stand bisher nur in den Einstellungen und war von außen
      // gar nicht zu finden: kidz.teamwachsbleiche.de führt aufs Sommerfest,
      // und von dort verlinkt nichts aufs Konzept. Hier steht sie da, wo die
      // Partner ohnehin arbeiten.
      { label: 'Das KIDZ-Programm', href: '/kidz/konzept', kunde: true },
      { label: 'Sommerfest-Gewinnspiel', href: path('dashboard/kidz-gewinnspiel.html') },
      { label: 'Elternabend', href: path('dashboard/kidz-elternabend.html') },
    ] },
  // Teamleistung ist tägliche Führung und deshalb kein Verwaltungsmenü.
  { id: 'team',        label: 'Team',          icon: 'Users',           href: path('team.html'),                       bottom: false },
  // Auszahlungen ist der einzige Punkt mit Zähler (offene Auszahlungen) — also eine
  // wartende Aufgabe und damit Tagesgeschäft, nicht Verwaltung.
  // Phase 210: für jeden Berater. Die Leseregel zeigt ihm nur die Prämien
  // seiner eigenen Promoter, dem Admin alle.
  { id: 'praemien',    label: 'Auszahlungen',  icon: 'Banknote',        href: path('praemien.html'),                  bottom: false },
  { id: 'praesentation',label: 'Präsentation', icon: 'Presentation',    href: path('programm.html?from=hub'),           bottom: false },
  { id: 'analysen',    label: 'Analysen',      icon: 'BarChart3',       href: path('dashboard/overview.html'),        bottom: false },

  { divider: true, label: 'Verwaltung' },

  { id: 'programm',    label: 'Bonusprogramm', icon: 'Gift',            href: path('programm-verwalten.html'),        bottom: false, adminOnly: true,
    subs: [
      { label: 'Belohnungen',       href: path('programm-verwalten.html#belohnungen') },
      { label: 'Themen-Seiten',     href: path('vorlagen.html'), icon: 'FileText' },
    ] },
  { id: 'beraterkonten', label: 'Beraterkonten', icon: 'Briefcase',     href: path('berater.html'),                   bottom: false, adminOnly: true },
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
  if (item.id === 'team' && cur.endsWith('/team.html')) return true;
  if (item.id === 'beraterkonten' && cur.endsWith('/berater.html')) return true;
  // Programm-Verwaltung ist auch aktiv, wenn man auf der Themen-Seiten-CMS ist (dorthin gefaltet)
  if (item.id === 'programm' && (cur.endsWith('/programm-verwalten.html') || cur.endsWith('/vorlagen.html'))) return true;
  if (item.id === 'champions' && cur.endsWith('/dashboard/empfehler.html')) return true;
  if (item.id === 'potenziale' && cur.endsWith('/dashboard/potenziale.html')) return true;
  if (item.id === 'kidz' && (cur.endsWith('/dashboard/kidz-gewinnspiel.html') || cur.endsWith('/dashboard/kidz-elternabend.html'))) return true;
  return false;
}

/** Render an item as sidebar-row */
function sidebarItem(item) {
  // Trennlinie + Blocktitel zwischen Tagesgeschäft und Verwaltung.
  // Die Verwaltung sieht nur, wer Admin ist — deshalb wird auch die Linie
  // zusammen mit den Admin-Punkten ein-/ausgeblendet.
  if (item.divider) {
    return `
    <div class="nav-divider nav-admin-only" style="display:none">
      <span class="nav-divider-label">${item.label || ''}</span>
    </div>`;
  }
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
  // `kunde: true` heißt: der Unterpunkt führt auf eine Seite, die der Partner
  // weitergibt. Die öffnet in einem eigenen Tab (das Portal bleibt stehen) und
  // bekommt über data-berater-link seinen Absender angehängt, damit Anmeldungen
  // beim richtigen Partner landen.
  const subs = `<div class="nav-subs"><div class="nav-subs-inner">${item.subs.map(s => `
    <a class="nav-sub" href="${s.href}"${s.kunde ? ' target="_blank" rel="noopener" data-berater-link' : ''}>
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
        <div class="nav-brand" aria-label="Empfehlungsportal, Regionaldirektion Kai Blobel und Team">
          <span class="nav-brand-mark"></span>
          <span class="nav-brand-copy">
            <span class="nav-brand-name">Empfehlungsportal</span>
            <span class="nav-brand-signature"><span>Regionaldirektion</span><span>Kai Blobel &amp; Team</span></span>
          </span>
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
          <div class="nav-brand" aria-label="Empfehlungsportal, Regionaldirektion Kai Blobel und Team"><span class="nav-brand-mark"></span><span class="nav-brand-copy"><span class="nav-brand-name">Empfehlungsportal</span><span class="nav-brand-signature"><span>Regionaldirektion</span><span>Kai Blobel &amp; Team</span></span></span></div>
          <nav class="nav-list">${NAV_ITEMS.map(sidebarItem).join('')}</nav>
          <button class="nav-drawer-logout" type="button" id="navDrawerLogout">${icon('LogOut', { size: 16 })}<span>Abmelden</span></button>
        </div>
      </div>
      <nav class="nav-bottom" aria-label="Hauptbereiche">
        ${NAV_ITEMS.filter(it => ['dashboard', 'empfehlungen', 'champions'].includes(it.id)).map(it => `
          <a class="nav-bottom-item${isActive(it) ? ' active' : ''}" href="${it.href}"${isActive(it) ? ' aria-current="page"' : ''}>
            ${icon(it.icon, { size: 20 })}<span>${it.label}</span>
          </a>`).join('')}
        <button class="nav-bottom-item nav-bottom-more" type="button" aria-label="Vollständiges Menü öffnen">${icon('Menu', { size: 20 })}<span>Mehr</span></button>
      </nav>
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
    // Phase 165: Bottom-Navigation auf dem Handy — "Mehr" öffnet denselben
    // Drawer wie der Hamburger. Die Körperklasse gibt dem Seiteninhalt Luft
    // über der festen Leiste (nur bis 767px wirksam, siehe CSS).
    sidebar.querySelector('.nav-bottom-more')?.addEventListener('click', toggleDrawer);
    document.body.classList.add('hat-bottom-nav');
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

    // Admin-Punkte sofort zeigen, wenn beim letzten Besuch klar war, dass du
    // Admin bist. Ohne das erscheinen sie erst nach der Netz-Antwort und das
    // Menü springt beim Laden. Die Prüfung unten korrigiert notfalls.
    if (readAdminFlag()) revealAdminItems(sidebar, true);

    // Multi-Tenant: Funnel-Links (programm/empfehlen) mit dem Slug des
    // eingeloggten Beraters versehen → Adressleiste zeigt den teilbaren Link.
    applyBeraterSlugToLinks(sidebar);
  }
}

/* ---------- Admin-Punkte: gemerkter Status gegen das Aufploppen ---------- */
const ADMIN_CACHE_KEY = 'berater_ist_admin_v1';

function readAdminFlag() {
  try { return localStorage.getItem(ADMIN_CACHE_KEY) === '1'; } catch (_) { return false; }
}
function writeAdminFlag(istAdmin) {
  try { localStorage.setItem(ADMIN_CACHE_KEY, istAdmin ? '1' : '0'); } catch (_) {}
}
function revealAdminItems(root, sichtbar) {
  root.querySelectorAll('.nav-admin-only').forEach((el) => {
    el.style.display = sichtbar ? '' : 'none';
  });
}

/* ---------- Zähler am Menüpunkt ---------- */

/**
 * Zwei Arten von Zahlen, bewusst unterschieden:
 *
 *   Aufgabe    (praemien)  Was auf Erledigung wartet. Bleibt stehen, bis es
 *                          erledigt ist, und pulst deshalb.
 *   Neuigkeit  (Phase 211) Was seit dem letzten Blick dazukam. Verschwindet,
 *                          sobald man hinsieht, und bleibt deshalb still.
 *
 * Beide teilen sich die Pille, die Neuigkeit trägt zusätzlich nav-badge-neu.
 */
const ZAEHLER_ZIEL = {
  empfehlungen: 'dashboard/empfehlungen.html',
  kidz_gewinnspiel: 'dashboard/kidz-gewinnspiel.html',
  kidz_elternabend: 'dashboard/kidz-elternabend.html',
};

function setzeZaehler(root, dateiname, anzahl, titel, still) {
  // Sidebar, mobiler Schubladen-Inhalt (beide .nav-item) und die untere
  // Leiste am Handy (.nav-bottom-item) auf einmal.
  root.querySelectorAll(
    `a.nav-item[href$="${dateiname}"], a.nav-bottom-item[href$="${dateiname}"]`,
  ).forEach((a) => {
    const vorhanden = a.querySelector('.nav-badge');
    if (!anzahl) { if (vorhanden) vorhanden.remove(); return; }
    const badge = vorhanden || document.createElement('span');
    badge.className = still ? 'nav-badge nav-badge-neu' : 'nav-badge';
    badge.textContent = anzahl > 99 ? '99+' : String(anzahl);
    badge.title = titel;
    if (!vorhanden) a.appendChild(badge);
  });
}

async function zeigeZaehler(root) {
  try {
    const { getOffenePraemienCount, getNeuigkeiten } = await import('./supabase.js');
    const [offene, neu] = await Promise.all([getOffenePraemienCount(), getNeuigkeiten()]);

    setzeZaehler(root, 'praemien.html', offene,
      `${offene} offene Prämie${offene === 1 ? '' : 'n'} zum Auszahlen`, false);

    for (const [bereich, datei] of Object.entries(ZAEHLER_ZIEL)) {
      // Auf der Seite, die gerade offen ist, ist nichts mehr ungesehen. Ohne
      // das bliebe die Zahl dort bis zum nächsten Seitenwechsel stehen.
      const hier = window.location.pathname.endsWith(`/${datei}`);
      const n = hier ? 0 : (neu[bereich] || 0);
      setzeZaehler(root, datei, n, `${n} neu seit deinem letzten Blick`, true);
    }
  } catch (e) { /* Zähler sind optional, das Menü nicht */ }
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
    // Admin-only Items (Verwaltungsblock) nur für Admins einblenden.
    writeAdminFlag(!!b.ist_admin);
    revealAdminItems(root, !!b.ist_admin);
    await zeigeZaehler(root);
    if (!b.slug) return;

    const haengeSlugAn = (a) => {
      const u = new URL(a.getAttribute('href'), window.location.origin);
      if (u.searchParams.has('berater')) return;
      u.searchParams.set('berater', b.slug);
      a.setAttribute('href', u.pathname + u.search + u.hash);
    };

    root.querySelectorAll('a[href*="programm.html"], a[href*="empfehlen.html"]').forEach((a) => {
      const u = new URL(a.getAttribute('href'), window.location.origin);
      if (u.pathname.endsWith('/programm.html') || u.pathname.endsWith('/empfehlen.html')) haengeSlugAn(a);
    });

    // Ausgezeichnete Links auf der Seite selbst, nicht nur in der Navigation:
    // die Vorschau-Kacheln in den Einstellungen zeigen auf Kundenseiten und
    // öffneten sie ohne Slug. Wer den Link dann weitergibt, verschickt eine
    // Seite ohne Absender.
    document.querySelectorAll('a[data-berater-link]').forEach(haengeSlugAn);
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
