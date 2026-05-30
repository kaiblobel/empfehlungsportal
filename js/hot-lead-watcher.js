/**
 * Phase 18 · Hot-Lead-Watcher (pragmatische Notifications)
 *
 * Lauscht via Supabase-Realtime auf INSERT/UPDATE in `empfehlungen` und
 * triggert wenn ein Status zu 'anrufwunsch' wird oder interessiert auf true
 * gesetzt wird:
 *   - Toast unten zentriert
 *   - Tab-Title-Flash wenn Tab nicht im Fokus ("● (n) Empfehlungs-HUB")
 *   - Optional: Callback (Hub-Hot-Leads-Refresh)
 *
 * Kein Service Worker, kein Push — funktioniert nur solange Tab offen ist.
 * Premium-SaaS-Standard für aktive Sessions.
 */
import { supabase } from './supabase.js';

let pendingCount = 0;
let originalTitle = '';
let flashTimer = null;

function getTitle() { return originalTitle || document.title; }

function startTitleFlash() {
  originalTitle = originalTitle || document.title;
  if (flashTimer) return;
  let on = false;
  flashTimer = setInterval(() => {
    if (!document.hidden) { stopTitleFlash(); return; }
    on = !on;
    document.title = on ? `● (${pendingCount}) ${getTitle()}` : getTitle();
  }, 1500);
}
function stopTitleFlash() {
  if (flashTimer) { clearInterval(flashTimer); flashTimer = null; }
  document.title = getTitle();
  pendingCount = 0;
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) stopTitleFlash();
});

function showToast(text, href) {
  let toast = document.getElementById('hToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'hToast';
    toast.className = 'h-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = href ? `<a href="${href}" style="color:inherit;text-decoration:none;">${text}</a>` : text;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 5000);
}

/**
 * @param {object} opts
 * @param {(payload: any) => void} [opts.onChange] — Callback bei jedem Hot-Lead-Event (z.B. Hub-Refresh)
 */
export function watchHotLeads(opts = {}) {
  if (!supabase) return null;

  const channel = supabase
    .channel('hot-leads-watcher')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'empfehlungen' },
      (payload) => maybeNotify(payload.new, null, opts))
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'empfehlungen' },
      (payload) => maybeNotify(payload.new, payload.old, opts))
    .subscribe();

  return () => supabase.removeChannel(channel);
}

function maybeNotify(neu, alt, opts) {
  if (!neu) return;
  const becameAnrufwunsch = neu.status === 'anrufwunsch' && (!alt || alt.status !== 'anrufwunsch');
  const becameInteressiert = neu.interessiert === true && (!alt || alt.interessiert !== true);

  if (!becameAnrufwunsch && !becameInteressiert) return;

  pendingCount++;

  const name = neu.empfaenger_name || 'Jemand';
  let label, href;
  if (becameAnrufwunsch) {
    label = `Anrufwunsch: ${name}${neu.anrufwunsch ? ' · ' + neu.anrufwunsch : ''}`;
    href = `/dashboard/detail.html?id=${neu.id}`;
  } else {
    label = `Interesse: ${name}`;
    href = `/dashboard/detail.html?id=${neu.id}`;
  }

  showToast(label, href);
  if (document.hidden) startTitleFlash();

  if (typeof opts.onChange === 'function') {
    try { opts.onChange(neu); } catch {}
  }
}
