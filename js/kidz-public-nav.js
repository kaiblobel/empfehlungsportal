const ALLOWED_KIDZ_SOURCES = new Set(['vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt']);
const SAFE_KIDZ_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const currentUrl = new URL(window.location.href);
const source = String(currentUrl.searchParams.get('quelle') || '').trim().toLowerCase();
const advisor = String(currentUrl.searchParams.get('berater') || '').trim().toLowerCase();

document.querySelectorAll('[data-kidz-destination]').forEach((link) => {
  const target = new URL(link.dataset.kidzDestination, currentUrl.origin);
  if (ALLOWED_KIDZ_SOURCES.has(source)) target.searchParams.set('quelle', source);
  if (advisor.length <= 80 && SAFE_KIDZ_SLUG.test(advisor)) target.searchParams.set('berater', advisor);
  link.href = `${target.pathname}${target.search}${target.hash}`;

  const samePage = target.pathname === currentUrl.pathname;
  const targetSection = target.hash || '#sommerfest';
  const currentSection = currentUrl.hash || (currentUrl.pathname === '/kidz/sommerfest' ? '#sommerfest' : '');
  if (samePage && targetSection === currentSection) link.setAttribute('aria-current', 'page');
});

const kidzMenu = document.getElementById('kidzPublicMenu');
document.addEventListener('click', (event) => {
  if (!kidzMenu?.open) return;
  if (!kidzMenu.contains(event.target) || event.target.closest('a')) kidzMenu.removeAttribute('open');
});
