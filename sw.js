/**
 * Phase 21 · Service Worker für PWA-Installation
 *
 * Strategie:
 *  - Pre-Cache: Hub-Shell + CSS + Lucide-Icons-Module beim Install
 *  - Network-First mit Cache-Fallback für HTML und js/config.js
 *  - Cache-First für statische Assets (CSS/JS/Images/Fonts)
 *  - Niemals cachen: Supabase-API, externe CDN-Fonts
 *
 * WICHTIG bei jeder Veröffentlichung: CACHE_VERSION hochzählen. Sonst liefert
 * der Zwischenspeicher weiter alte Dateien aus. config.js ist seit Phase 133
 * davon ausgenommen (Network-First), weil sie die sichtbare Versionsnummer
 * trägt — die darf nie veraltet sein.
 */

const CACHE_VERSION = 'v286-2026-08-19-phase310';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;

const SHELL_URLS = [
  '/hub.html',
  '/team.html',
  '/dashboard/overview.html',
  '/dashboard/potenziale.html',
  '/dashboard/kidz-elternabend.html',
  '/thema.html',
  '/css/style.css?v=34',
  '/css/dashboard.css?v=55',
  '/css/hub.css?v=59',
  '/css/dna.css?v=11',
  '/css/analysen.css?v=3',
  '/css/promoter-dashboard.css?v=3',
  '/css/potenziale.css?v=11',
  '/css/empfehlung-detail.css?v=2',
  '/css/kidz-gewinnspiel-admin.css?v=6',
  '/css/kidz-elternabend-admin.css?v=1',
  '/css/themen-vorschau.css?v=12',
  '/js/nav.js?v=67',
  '/js/icons.js',
  '/js/context-menu.js',
  '/js/cmdk.js',
  '/js/hub.js?v=55',
  '/js/team.js?v=3',
  '/js/analysen.js?v=3',
  '/js/potenziale.js?v=10',
  '/js/potenziale-coach.mjs',
  '/js/potenziale-cockpit.mjs',
  '/js/potenziale-utils.mjs',
  '/js/empfehlung-detail.js?v=3',
  '/js/kidz-elternabend-admin.js?v=5',
  '/js/themen-vorschau.js?v=10',
  '/js/hot-lead-watcher.js',
  '/js/dashboard.js',
  '/js/supabase.js',
  '/js/date-utils.js',
  '/js/referral-tracking.js?v=3',
  '/js/config.js',
  '/manifest.json',
  '/assets/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_URLS.map((url) => new Request(url, { cache: 'reload' })))
        .catch((err) => console.warn('[sw] precache partial', err))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.endsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET cachen
  if (request.method !== 'GET') return;

  // Niemals cachen
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'ws:' || url.protocol === 'wss:'
  ) {
    return; // Let the network handle
  }

  // HTML: network-first
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/hub.html')))
    );
    return;
  }

  // config.js trägt die Versionsnummer und die Umgebung — und sie hat als
  // einzige Datei KEINE Version im Namen. Cache-First hat dazu geführt, dass
  // nach einer Veröffentlichung noch tagelang die alte Versionsnummer in der
  // Seitenleiste stand, obwohl längst neuer Code lief. Deshalb: immer erst
  // das Netz fragen, der Zwischenspeicher ist nur der Notnagel ohne Verbindung.
  if (url.pathname.endsWith('/js/config.js')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Video: NICHT anfassen. Der Browser holt Video in Bereichs-Anfragen (206);
  // die lassen sich nicht in den Cache legen (cache.put wirft bei 206), und auf
  // dem iPhone reagiert die Wiedergabe empfindlich, wenn ein Service Worker
  // dazwischenfunkt. Ohne respondWith macht der Browser es selbst — richtig.
  if (url.pathname.endsWith('.mp4')) return;

  // Static assets: cache-first
  if (
    ['script', 'style', 'font', 'image'].includes(request.destination) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});

/* PHASE 23 - Web-Push handlers */

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: 'Empfehlungsportal', body: event.data.text() }; }
  const title = payload.title || 'Empfehlungsportal';
  const options = {
    body: payload.body || '',
    icon: '/assets/icons/icon.svg',
    badge: '/assets/icons/icon.svg',
    tag: payload.tag || 'hot-lead',
    data: { url: payload.url || '/hub.html' },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/hub.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(url.split('?')[0]) && 'focus' in w) return w.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
