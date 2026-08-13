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

async function countPageview() {
  // Vorschau-Dienste von WhatsApp und anderen Netzwerken fuehren dieses
  // Browser-Skript nicht aus. Automatisierte Browserpruefungen werden zusaetzlich
  // ausgeschlossen, damit sie die echte Reichweite nicht aufblasen.
  if (navigator.webdriver || !['http:', 'https:'].includes(window.location.protocol)) return;

  const trackingSource = ALLOWED_SOURCES.has(source) ? source : 'direkt';
  const trackingAdvisor = advisor.length <= 80 && SAFE_SLUG.test(advisor) ? advisor : '';
  try {
    const response = await fetch('/api/kidz-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: trackingSource, beraterSlug: trackingAdvisor }),
      keepalive: true,
    });
    if (!response.ok && response.status !== 204) throw new Error(`Tracking: ${response.status}`);
  } catch (_) {}
}

countPageview();
