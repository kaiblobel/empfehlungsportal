const ALLOWED_SOURCES = new Set(['vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt']);
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const incoming = new URLSearchParams(window.location.search);
const target = new URL('/kidz/gewinnspiel', window.location.origin);
const source = String(incoming.get('quelle') || '').trim().toLowerCase();
const advisor = String(incoming.get('berater') || '').trim().toLowerCase();

if (ALLOWED_SOURCES.has(source)) target.searchParams.set('quelle', source);
if (advisor.length <= 80 && SAFE_SLUG.test(advisor)) target.searchParams.set('berater', advisor);

document.querySelectorAll('[data-registration-link]').forEach((link) => {
  link.href = `${target.pathname}${target.search}#anmeldung`;
});
