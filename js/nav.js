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
      // `bald: true` sperrt den Weg über das Menü, ohne den Punkt zu verstecken:
      // Die Partner sehen, dass die Elternseite kommt, kommen aber noch nicht
      // hin, weil sie noch nicht fertig ist. Die Seite selbst und ihre Adresse
      // (kidz.teamwachsbleiche.de/konzept) bleiben unangetastet und erreichbar.
      // Zum Freischalten reicht es, diese eine Zeile wieder zu entfernen.
      // Heißt seit Phase 285 „KIDZ-Konzept" statt „Das KIDZ-Programm": kürzer,
      // deckt sich mit der Adresse und bricht in der Leiste nicht mehr um.
      { label: 'KIDZ-Konzept', href: '/kidz/konzept', kunde: true, bald: true },
      { label: 'Sommerfest-Gewinnspiel', href: path('dashboard/kidz-gewinnspiel.html') },
      { label: 'KIDZ for Future', href: path('dashboard/kidz-elternabend.html') },
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
  // `bald: true` wird bewusst als <span> ohne href gerendert, nicht als
  // ausgegrauter Link: ein <a href> bliebe über Mittelklick, Kontextmenü und
  // Tastatur erreichbar, und der Slug-Anhänger data-berater-link hätte dort
  // nichts zu suchen.
  const subs = `<div class="nav-subs"><div class="nav-subs-inner">${item.subs.map(s => s.bald ? `
    <span class="nav-sub nav-sub-bald" aria-disabled="true" title="Die Seite ist in Arbeit und noch nicht freigegeben.">
      ${s.icon ? `<span class="nav-sub-icon">${icon(s.icon, { size: 14 })}</span>` : ''}
      <span>${s.label}</span>
      <span class="nav-sub-marke">bald</span>
    </span>` : `
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
        <div class="nav-waffel-slot">
          <button class="nav-waffel" type="button" aria-label="Anwendungen" aria-expanded="false" hidden>${icon('Waffel', { size: 18 })}</button>
        </div>
        <nav class="nav-list">${NAV_ITEMS.map(sidebarItem).join('')}</nav>
        ${appVer ? `<a class="nav-version" href="/changelog.html" title="${window.APP_PHASE || ''}">${appVer}</a>` : ''}
        <button class="nav-collapse-toggle" type="button" aria-label="Menü ein-/ausblenden" title="Menü ein-/ausblenden (⌘\\)">
          <span class="nav-collapse-icon-expand">${icon('ChevronLeft', { size: 18 })}</span>
          <span class="nav-collapse-icon-collapse">${icon('ChevronRight', { size: 18 })}</span>
        </button>
      </aside>
      <button class="nav-waffel nav-waffel-mobile" type="button" aria-label="Anwendungen" aria-expanded="false" hidden>${icon('Waffel', { size: 18 })}</button>
      <button class="nav-hamburger" type="button" aria-label="Menü öffnen">${icon('Menu', { size: 22 })}</button>
      <div class="nav-drawer" hidden>
        <div class="nav-drawer-panel">
          <button class="nav-drawer-close" type="button" aria-label="Menü schließen">${icon('X', { size: 22 })}</button>
          <div class="nav-brand" aria-label="Empfehlungsportal, Regionaldirektion Kai Blobel und Team"><span class="nav-brand-mark"></span><span class="nav-brand-copy"><span class="nav-brand-name">Empfehlungsportal</span><span class="nav-brand-signature"><span>Regionaldirektion</span><span>Kai Blobel &amp; Team</span></span></span></div>
          <div class="nav-waffel-slot nav-waffel-slot-drawer"><button class="nav-waffel" type="button" aria-label="Anwendungen" aria-expanded="false" hidden>${icon('Waffel', { size: 18 })}</button></div>
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
      ${waffelMarkup()}
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

/**
 * Anwesenheit melden — von jeder Seite des Beraterbereichs aus.
 *
 * Vorher stand das nur in js/hub.js. „Online" hieß damit faktisch „hat den
 * Überblick offen": Wer bei den Empfehlungen, im Potenzialbuch oder in der
 * Präsentation arbeitete, verschwand aus der Anzeige, obwohl er die ganze
 * Zeit im Portal war.
 *
 * Die Navigation wird auf jeder dieser Seiten aufgebaut, deshalb hängt es
 * hier. Der Takt von einer Minute ist derselbe wie bisher auf dem Überblick.
 * Ein Fehler bleibt folgenlos: Eine nicht gemeldete Anwesenheit ist ärgerlich,
 * eine Seite, die deshalb nicht lädt, wäre schlimmer.
 */
function meldeAnwesenheit() {
  let laeuft = false;
  const melden = async () => {
    if (laeuft || document.hidden) return;
    laeuft = true;
    try {
      const m = await import('./supabase.js');
      await m.touchPresence();
    } catch (_) { /* ohne Anmeldung oder ohne Netz: nichts zu tun */ }
    laeuft = false;
  };
  melden();
  setInterval(melden, 60000);
  // Nach dem Zurückwechseln zum Fenster sofort melden, nicht erst zum
  // nächsten Takt. Sonst steht jemand nach einer Pause bis zu eine Minute
  // lang auf offline, obwohl er längst wieder da ist.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) melden(); });
}

/* ------------------------------ Waffelmenue ------------------------------
   Der Anwendungswechsler steht getrennt vom Markenblock. Inhalt kommt fertig
   von der zentralen Freigabematrix in KAI. (ueber den Gleichursprungs-Vermittler
   /api/waffel-config, der den Portal-Token prueft; das Tor-Wort zur KAI.-Route
   bleibt auf dem Server). Fail-closed: leerer Bestand oder Ladefehler heisst
   leeres Menue, fuer normale Berater verschwindet der Knopf ganz; nur Admins
   sehen dann "Waffelmenue einrichten". Sichtbarkeit ist KEIN Zugriffsschutz,
   jede Zielanwendung prueft weiterhin selbst Anmeldung und Berechtigung.

   AUSSEHEN: Massgeblich ist das Original in KAI.
   (kai-hub/src/components/waffel/WaffelMenue.tsx). Uebernommen ist die ganze
   Anatomie — Kopf mit Unterzeile, Suchfeld als blosse Linie, Symbole frei in
   Markengold ohne Kachel darunter, Haarlinien zwischen den Zeilen, kein Pfeil
   am Zeilenende, die eigene Anwendung als Marke "Aktuell", Verwalten-Fuss.

   Drei bewusste Abweichungen, jeweils mit Grund:
     * RUNDUNG. KAI. und Cockpit sind eckig, die Hausform des Portals hat
       10 bis 14 Pixel Radius (CLAUDE.md, Card-System). Die Anatomie des Menues
       zu uebernehmen heisst nicht, mitten in der Anwendung die Hausform zu
       brechen. Uebernommen ist der Aufbau, nicht der fremde Radius.
     * FARBE. Das Portal hat kein Fuehrungsblau. An dessen Stelle steht Petrol
       (--dna-petrol), die Farbe, die hier alles Positive traegt. Keine festen
       Hex-Werte mehr; vorher stand hier ein hartes #1677B8.
     * SUCHFELD ERST AB SECHS EINTRAEGEN. KAI. fuehrt 25 Anwendungen, da hilft
       es immer. Hier sind es je nach Freigabe oft zwei oder drei, und darueber
       ein Suchfeld zu setzen waere Zierde. Dieselbe Entscheidung wie im Navi.

   Fremde Ziele oeffnen in einem neuen Tab: Portal und Navi teilen eine
   Anmeldung, Cockpit und KAI. eine zweite. Ein Sprung ueber diese Grenze fuehrt
   zur Anmeldemaske, und die laufende Portal-Sitzung soll dabei nicht
   verlorengehen. */

/** Ab so vielen Eintraegen lohnt das Suchfeld. */
const WAFFEL_SUCHE_AB = 6;

const WAFFEL_ICONS = new Set([
  'Archive', 'BookOpen', 'Calculator', 'Coins', 'Gift', 'Globe',
  'GraduationCap', 'LayoutGrid', 'LineChart', 'PieChart', 'Presentation',
  'ShieldCheck', 'ShoppingBag', 'Sparkles', 'Store', 'Users', 'Wallet', 'Wrench',
]);

function waffelHtmlSicher(wert) {
  return String(wert == null ? '' : wert)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function waffelMarkup() {
  return `
      <style>
        .waffel-overlay{position:fixed;inset:0;z-index:120;background:rgba(19,25,29,.35)}
        .waffel-panel{position:absolute;top:12px;left:12px;display:flex;flex-direction:column;width:min(440px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:hidden;background:var(--dna-card,#fff);color:var(--dna-ink,#13191D);border:1px solid var(--dna-line,#E3E7E9);border-radius:12px;box-shadow:0 18px 44px rgba(19,25,29,.18);font-family:Inter,system-ui,sans-serif}
        .waffel-kopf{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 16px 12px}
        .waffel-kopf strong{display:block;font-size:14px;font-weight:600}
        .waffel-kopf p{margin:2px 0 0;font-size:12px;color:var(--dna-muted,#6A747C)}
        .waffel-schliessen{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:var(--dna-muted,#6A747C);cursor:pointer}
        .waffel-schliessen:hover{background:var(--dna-paper-2,#F1F4F5);color:var(--dna-ink,#13191D)}
        /* Eingabefeld in der Hausform: eine Linie unten, kein Kasten. */
        .waffel-suche{display:flex;align-items:center;gap:8px;margin:0 16px 12px;padding:6px 2px;border-bottom:1px solid var(--dna-line-strong,#D5DBDE)}
        .waffel-suche:focus-within{border-bottom-color:var(--dna-petrol,#0B4650)}
        .waffel-suche[hidden]{display:none}
        .waffel-suche svg{flex:0 0 auto;color:var(--dna-gold,#C8AA22)}
        .waffel-suche input{width:100%;border:0;background:transparent;outline:0;font-size:14px;color:var(--dna-ink,#13191D)}
        .waffel-liste{min-height:0;overflow-y:auto;border-top:1px solid var(--dna-line,#E3E7E9)}
        .waffel-liste a{display:flex;align-items:center;gap:16px;padding:14px 16px;color:var(--dna-ink,#13191D);text-decoration:none}
        .waffel-liste a + a{border-top:1px solid var(--dna-line,#E3E7E9)}
        .waffel-liste a:hover{background:var(--dna-paper-2,#F1F4F5)}
        .waffel-liste a:focus-visible{outline:2px solid var(--dna-petrol,#0B4650);outline-offset:-2px}
        /* Symbol frei in Markengold, ohne Kachel darunter. Der Name steht
           daneben, die Farbe muss also nichts transportieren. */
        .waffel-zeichen{flex:0 0 auto;width:32px;height:32px;color:var(--dna-gold,#C8AA22)}
        .waffel-eintrag-name{display:block;font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .waffel-eintrag-zweck{display:block;font-size:12px;color:var(--dna-muted,#6A747C);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .waffel-aktuell{flex:0 0 auto;padding:2px 8px;border:1px solid var(--dna-petrol,#0B4650);border-radius:6px;color:var(--dna-petrol,#0B4650);font-size:11px;font-weight:600}
        .waffel-leer{padding:32px 16px;text-align:center;font-size:14px;color:var(--dna-muted,#6A747C)}
        .waffel-fuss{border-top:1px solid var(--dna-line,#E3E7E9);padding:16px}
        .waffel-fuss a{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--dna-line,#E3E7E9);border-radius:10px;color:var(--dna-petrol,#0B4650);text-decoration:none}
        .waffel-fuss a:hover{background:var(--dna-paper-2,#F1F4F5)}
        .waffel-fuss strong{display:block;font-size:12px}
        .waffel-fuss-untertitel{display:block;font-size:11px;color:var(--dna-muted,#6A747C)}
        .nav-waffel{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:1px solid var(--dna-line,#E3E7E9);border-radius:10px;background:transparent;color:var(--dna-muted,#6A747C);cursor:pointer}
        .nav-waffel[hidden]{display:none!important}
        /* Sichtbar 36 Pixel, anfassbar 44 — die Untergrenze fuer einen
           Daumen. Der Knopf soll dabei nicht groesser wirken. */
        .nav-waffel{position:relative}
        .nav-waffel::after{content:'';position:absolute;inset:-4px}
        .nav-waffel:hover,.nav-waffel[aria-expanded="true"]{border-color:var(--dna-petrol,#0B4650);color:var(--dna-petrol,#0B4650)}
        .nav-waffel svg{width:18px;height:18px}
        .nav-waffel-slot{display:flex;justify-content:flex-start;padding:0 0 0 2px;margin-top:-18px;margin-bottom:-18px}
        .nav-waffel-slot-drawer{position:absolute;top:66px;right:18px;margin:0;padding:0}
        .nav-waffel-mobile{position:fixed;top:16px;right:64px;z-index:110;background:var(--dna-card,#fff);box-shadow:0 4px 14px rgba(19,25,29,.10)}
        @media (min-width:1024px){.nav-waffel-mobile{display:none!important}}
        body.nav-collapsed .nav-waffel-slot{justify-content:center;padding:0}
      </style>
      <div class="waffel-overlay" hidden>
        <div class="waffel-panel" role="dialog" aria-modal="true" aria-label="Anwendungen">
          <div class="waffel-kopf">
            <div><strong>Anwendungen</strong><p>Schnell zwischen Werkzeugen wechseln</p></div>
            <button class="waffel-schliessen" type="button" aria-label="Schließen">${icon('X', { size: 16 })}</button>
          </div>
          <label class="waffel-suche" hidden>${icon('Search', { size: 16 })}<input type="search" placeholder="Anwendung suchen …" aria-label="Anwendung suchen"></label>
          <div class="waffel-liste" data-waffel-liste></div>
          <div class="waffel-fuss" data-waffel-fuss hidden><a href="#"></a></div>
        </div>
      </div>`;
}

function waffelEintragHtml(e) {
  const zeichen = WAFFEL_ICONS.has(e.symbol) ? e.symbol : 'LayoutGrid';
  const aktuell = e.key === 'empfehlung';
  // Fremde Anwendung: neuer Tab, damit die laufende Portal-Sitzung bleibt.
  // noopener trennt den geoeffneten Tab vom oeffnenden Fenster.
  const fremd = !aktuell && /^https?:\/\//i.test(String(e.url || ''));
  const ziel = fremd ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${waffelHtmlSicher(e.url)}"${ziel} data-waffel-eintrag${aktuell ? ' aria-current="page"' : ''}>
    <span class="waffel-zeichen">${icon(zeichen, { size: 32, strokeWidth: 1.5 })}</span>
    <span style="min-width:0;flex:1"><span class="waffel-eintrag-name">${waffelHtmlSicher(e.name)}</span><span class="waffel-eintrag-zweck">${waffelHtmlSicher(e.zweck)}</span></span>
    ${aktuell ? '<span class="waffel-aktuell">Aktuell</span>' : ''}</a>`;
}

function zeigeWaffel(root, daten) {
  const eintraege = Array.isArray(daten && daten.eintraege) ? daten.eintraege : [];
  const istAdmin = !!(daten && daten.istAdmin);
  // Die Adresse kommt vom Server; steht keine da, entfaellt der Fuss.
  const verwaltenUrl = daten && typeof daten.verwaltenUrl === 'string' ? daten.verwaltenUrl : '';
  const knoepfe = root.querySelectorAll('.nav-waffel');
  if (eintraege.length === 0 && !(istAdmin && verwaltenUrl)) {
    knoepfe.forEach((k) => { k.hidden = true; });
    return;
  }
  knoepfe.forEach((k) => { k.hidden = false; });

  const liste = root.querySelector('[data-waffel-liste]');
  const fuss = root.querySelector('[data-waffel-fuss]');
  if (!liste) return;

  function render(filter) {
    const s2 = String(filter || '').trim().toLowerCase();
    const sicht = s2
      ? eintraege.filter((e) => (e.name || '').toLowerCase().includes(s2) || (e.zweck || '').toLowerCase().includes(s2))
      : eintraege;
    liste.innerHTML = sicht.length
      ? sicht.map(waffelEintragHtml).join('')
      : `<p class="waffel-leer">${eintraege.length === 0 ? 'Noch keine Anwendungen freigegeben.' : 'Nichts gefunden.'}</p>`;
  }
  render('');

  if (fuss) {
    if (istAdmin && verwaltenUrl) {
      fuss.hidden = false;
      const titel = eintraege.length === 0 ? 'Waffelmenü einrichten' : 'Waffelmenü verwalten';
      const link = fuss.querySelector('a');
      link.href = verwaltenUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = `${icon('Settings2', { size: 16 })}<span style="min-width:0"><strong>${titel}</strong><span class="waffel-fuss-untertitel">Sichtbarkeit je Oberfläche, zentral in KAI.</span></span>`;
    } else {
      fuss.hidden = true;
    }
  }

  const overlay = root.querySelector('.waffel-overlay');
  const suchzeile = root.querySelector('.waffel-suche');
  const feld = root.querySelector('.waffel-suche input');
  // Bei wenigen Eintraegen waere ein Suchfeld nur Zierde.
  const mitSuche = eintraege.length >= WAFFEL_SUCHE_AB;
  if (suchzeile) suchzeile.hidden = !mitSuche;

  let zuletztFokussiert = null;
  let vorherigerUeberlauf = '';
  function oeffne() {
    zuletztFokussiert = document.activeElement;
    vorherigerUeberlauf = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay.hidden = false;
    knoepfe.forEach((k) => k.setAttribute('aria-expanded', 'true'));
    if (mitSuche && feld) { feld.value = ''; render(''); feld.focus(); }
  }
  function schliesse() {
    overlay.hidden = true;
    document.body.style.overflow = vorherigerUeberlauf;
    knoepfe.forEach((k) => k.setAttribute('aria-expanded', 'false'));
    if (zuletztFokussiert && zuletztFokussiert.focus) zuletztFokussiert.focus();
  }
  knoepfe.forEach((k) => k.addEventListener('click', oeffne));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) schliesse(); });
  const zu = overlay.querySelector('.waffel-schliessen');
  if (zu) zu.addEventListener('click', schliesse);
  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') {
      schliesse();
      return;
    }

    const fokusziele = Array.from(overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hidden && !element.closest('[hidden]'));
    if (e.key === 'Tab' && fokusziele.length > 0) {
      const erstes = fokusziele[0];
      const letztes = fokusziele[fokusziele.length - 1];
      if (e.shiftKey && document.activeElement === erstes) {
        e.preventDefault();
        letztes.focus();
      } else if (!e.shiftKey && document.activeElement === letztes) {
        e.preventDefault();
        erstes.focus();
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const links = Array.from(overlay.querySelectorAll('a[data-waffel-eintrag]'));
      if (links.length === 0) return;
      const index = links.indexOf(document.activeElement);
      if (document.activeElement === feld && e.key === 'ArrowDown') {
        e.preventDefault();
        links[0].focus();
      } else if (index >= 0) {
        e.preventDefault();
        const schritt = e.key === 'ArrowDown' ? 1 : -1;
        links[(index + schritt + links.length) % links.length].focus();
      }
    }
  });
  if (feld) feld.addEventListener('input', () => render(feld.value));
}

function lokaleWaffelVorschau() {
  if (!['127.0.0.1', 'localhost'].includes(window.location.hostname)) return null;
  const params = new URLSearchParams(window.location.search);
  const ansicht = params.get('waffel-vorschau');
  if (!['voll', 'leer'].includes(ansicht)) return null;
  const istAdmin = params.get('rolle') !== 'berater';
  return {
    istAdmin,
    verwaltenUrl: istAdmin ? 'https://kai-hub-roan.vercel.app/waffel' : '',
    eintraege: ansicht === 'leer' ? [] : [
      { key: 'kai', name: 'KAI.', zweck: 'Deine Arbeitszentrale.', url: 'https://kai-hub-roan.vercel.app', symbol: 'Sparkles' },
      { key: 'cockpit', name: 'Berater Cockpit', zweck: 'Kunden, Partner und Termine.', url: 'https://www.beratercockpit.de', symbol: 'Users' },
      { key: 'empfehlung', name: 'Empfehlungsportal', zweck: 'Empfehlungen und Prämien.', url: 'https://empfehlungsportal.vercel.app', symbol: 'Gift' },
      { key: 'navi', name: 'Umsatz-Navi', zweck: 'Zahlen der Woche im Team.', url: 'https://navi.teamwachsbleiche.de', symbol: 'LineChart' },
      { key: 'finanzcheck', name: 'Finanzcheck', zweck: 'Der Einstieg für neue Kunden.', url: 'https://finanzcheck.kaiblobel.de', symbol: 'Calculator' },
      { key: 'content', name: 'Content Studio', zweck: 'Beiträge vorbereiten.', url: 'https://content.kaiblobel.de', symbol: 'Presentation' },
    ],
  };
}

async function initWaffel() {
  const root = document.getElementById('appNav');
  if (!root || !root.querySelector('.waffel-overlay')) return;

  // Nur auf dem eigenen Rechner: sichere Vorschau ohne Anmeldung und ohne
  // Datenzugriff. Auf jeder echten Adresse bleibt allein die zentrale Matrix
  // maßgeblich.
  const vorschau = lokaleWaffelVorschau();
  if (vorschau) {
    zeigeWaffel(root, vorschau);
    return;
  }

  try {
    const { supabase } = await import('./supabase.js');
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session && session.access_token;
    if (!token) return;
    const antwort = await fetch('/api/waffel-config', {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!antwort.ok) return;
    const daten = await antwort.json();
    zeigeWaffel(root, daten);
  } catch (_) {
    // still und fail-closed: das Menue bleibt leer.
  }
}

// Erst starten, nachdem auch die darunter stehenden Menuebausteine angelegt
// sind. Modulskripte laufen oft erst nach DOMContentLoaded; ein frueherer
// Sofortstart wuerde sonst auf noch nicht initialisierte const-Werte treffen.
if (typeof document !== 'undefined') {
  const init = () => { renderNav(); initWaffel(); initCmdK(); mountContextMenu(); meldeAnwesenheit(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
