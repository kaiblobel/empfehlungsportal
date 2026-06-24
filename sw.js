/**
 * Phase 21 · Service Worker für PWA-Installation
 *
 * Strategie:
 *  - Pre-Cache: Hub-Shell + CSS + Lucide-Icons-Module beim Install
 *  - Network-First mit Cache-Fallback für HTML
 *  - Cache-First für statische Assets (CSS/JS/Images/Fonts)
 *  - Niemals cachen: Supabase-API, externe CDN-Fonts
 */

const CACHE_VERSION = 'v68-2026-06-24';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;

const SHELL_URLS = [
  '/hub.html',
  '/css/style.css?v=32',
  '/css/dashboard.css?v=37',
  '/css/hub.css?v=41',
  '/js/nav.js?v=41',
  '/js/icons.js',
  '/js/cmdk.js',
  '/js/hub.js?v=39',
  '/js/hot-lead-watcher.js',
  '/js/dashboard.js',
  '/js/supabase.js',
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
  try { payload = event.data.json(); } catch { payload = { title: 'Empfehlungs-HUB', body: event.data.text() }; }
  const title = payload.title || 'Empfehlungs-HUB';
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
