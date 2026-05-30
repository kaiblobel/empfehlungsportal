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

/* PHASE 23 - Web-Push Subscription Helpers */

const VAPID_PUBLIC_KEY = 'BKqqAPWG-j-QlvLlNse-8kSbdTNAmFrjEIFTpwOvZfB66AmQ3qCnM_hsZlVtGNY5TLLeQCwpUaiOdLAklazTjWc';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Str = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Str);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function pushPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // Persist to Supabase
  try {
    const { supabase } = await import('./supabase.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: 'no-auth' };
    const json = sub.toJSON();
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    }, { onConflict: 'user_id,endpoint' });
  } catch (e) {
    console.warn('[pwa] persist subscription failed', e);
  }

  return { ok: true };
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return { ok: false };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true };
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  try {
    const { supabase } = await import('./supabase.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
  } catch {}
  return { ok: true };
}
