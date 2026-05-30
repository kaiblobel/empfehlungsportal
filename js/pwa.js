/**
 * Phase 21 · PWA-Helper
 *  - Registriert sw.js
 *  - Lauscht auf beforeinstallprompt
 *  - Bietet showInstallPrompt() für manuellen Trigger
 */

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
});

export async function showInstallPrompt() {
  if (!deferredPrompt) return { available: false };
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return { available: true, outcome: choice.outcome };
}

export function canInstall() {
  return !!deferredPrompt;
}

// Registrierung
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[pwa] sw register failed', err));
  });
}
