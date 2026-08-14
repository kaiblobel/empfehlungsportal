import {
  getBeraterPublicById,
  getBeraterPublicBySlug,
  getEmpfehlungByToken,
  markInteressiert,
  supabase,
} from './supabase.js';
import { applyBeraterBrand, merkeBerater, gemerkterBerater } from './berater-brand.js';

const root = document.getElementById('finance-v4');
const params = new URLSearchParams(window.location.search);
const token = params.get('token') || document.querySelector('meta[name="referral-token"]')?.content || '';
const cleanAdvisorMatch = window.location.pathname.match(/^\/baufinanzierung\/([a-z0-9-]+)\/?$/i);
const advisorSlug = params.get('berater') || (cleanAdvisorMatch ? decodeURIComponent(cleanAdvisorMatch[1]) : '');
const referralMode = Boolean(token || params.get('modus') === 'referral' || params.get('von') || params.get('an'));
const defaultBookingUrl = 'https://outlook.office.com/book/RegionaldirektionKaiBlobel@dvag02.onmicrosoft.com/s/vIk8AVAbE0CCK6qZpumyTA2?ismsaljsauthenabled=true';

let bookingUrl = defaultBookingUrl;
let advisorFirst = 'Kai';
let interestMarked = false;
let personalizationObserver = null;

function setStatus(text) {
  const status = document.getElementById('booking-status');
  if (status) status.textContent = text;
}

function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'E';
}

function setRecommendation(data = {}) {
  const promoter = String(data.empfehler_name || params.get('von') || 'Jemand aus deinem Umfeld').trim();
  const recipient = String(data.empfaenger_name || params.get('an') || '').trim().split(/\s+/)[0] || '';
  const message = String(data.empfehler_nachricht || '').trim();

  const avatar = document.getElementById('ref-avatar');
  const refName = document.getElementById('ref-name');
  const heroReferrer = document.getElementById('hero-referrer');
  const contactReferrer = document.getElementById('contact-referrer');
  const heroRecipient = document.getElementById('hero-recipient');
  const note = document.getElementById('recommendation-message');

  if (avatar) avatar.textContent = initials(promoter);
  if (refName) refName.textContent = promoter;
  if (heroReferrer) heroReferrer.textContent = promoter;
  if (contactReferrer) contactReferrer.textContent = promoter;
  if (heroRecipient) heroRecipient.textContent = recipient ? `${recipient}, für dich` : 'Für dich';
  if (note && message) {
    note.textContent = `„${message}“`;
    note.hidden = false;
  }
}

function applyEntryMode() {
  document.body.dataset.entryMode = referralMode ? 'referral' : 'public';
  const recommendation = root?.querySelector('.recommendation');
  const eyebrow = document.getElementById('hero-eyebrow');
  const title = document.getElementById('hero-title');
  const lead = document.getElementById('hero-lead');
  const contactNote = document.getElementById('contact-note');
  const optOut = document.getElementById('optout-button');

  if (referralMode) {
    if (recommendation) recommendation.hidden = false;
    if (contactNote) contactNote.hidden = false;
    if (optOut) optOut.hidden = false;
    return;
  }

  if (recommendation) recommendation.hidden = true;
  if (eyebrow) eyebrow.textContent = 'Baufinanzierung mit Überblick';
  if (title) {
    const emphasis = document.createElement('span');
    emphasis.textContent = 'Plan, der zu deinem Leben passt.';
    title.replaceChildren(document.createTextNode('Dein Vorhaben. Ein '), emphasis);
  }
  if (lead) lead.textContent = 'Ordne dein Vorhaben in wenigen Schritten ein. Danach siehst du, welche Fragen für deine Situation wichtig sind und wie wir Finanzierung langfristig betrachten.';
  if (contactNote) contactNote.hidden = true;
  if (optOut) optOut.hidden = true;
}

function initSectionNavigation() {
  const nav = document.getElementById('section-nav');
  const hero = root?.querySelector('.hero');
  if (!nav || !hero) return;

  const links = [...nav.querySelectorAll('[data-section-link]')];
  const targetFor = (key) => key === 'funding'
    ? document.getElementById('funding-check-section')
    : document.getElementById(key);
  let scheduled = false;

  const update = () => {
    scheduled = false;
    const showAfter = hero.offsetTop + Math.min(hero.offsetHeight * 0.58, 430);
    nav.classList.toggle('is-visible', window.scrollY > showAfter);

    const marker = window.scrollY + (window.innerWidth <= 520 ? 92 : 155);
    const candidates = links.map((link) => {
      const key = link.dataset.sectionLink;
      const target = targetFor(key);
      if (!target || target.hidden) return null;
      const top = target.getBoundingClientRect().top + window.scrollY;
      return { key, top };
    }).filter(Boolean).sort((a, b) => a.top - b.top);
    const active = candidates.filter((entry) => entry.top <= marker).at(-1)?.key || '';
    links.forEach((link) => {
      const current = link.dataset.sectionLink === active;
      link.classList.toggle('is-active', current);
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  links.forEach((link) => link.addEventListener('click', () => window.setTimeout(schedule, 280)));
  update();
}

function personalizeTextNode(node) {
  if (!node?.nodeValue || advisorFirst === 'Kai') return;
  node.nodeValue = node.nodeValue
    .replace(/\bKais\b/g, `${advisorFirst}s`)
    .replace(/\bKai\b/g, advisorFirst);
}

function personalizeSubtree(start) {
  if (!start || advisorFirst === 'Kai') return;
  if (start.nodeType === Node.TEXT_NODE) {
    personalizeTextNode(start);
    return;
  }
  if (start.nodeType !== Node.ELEMENT_NODE || start.matches('script, style')) return;
  if (start.hasAttribute('aria-label')) {
    start.setAttribute('aria-label', start.getAttribute('aria-label')
      .replace(/\bKais\b/g, `${advisorFirst}s`)
      .replace(/\bKai\b/g, advisorFirst));
  }
  start.querySelectorAll('[aria-label]').forEach((element) => {
    element.setAttribute('aria-label', element.getAttribute('aria-label')
      .replace(/\bKais\b/g, `${advisorFirst}s`)
      .replace(/\bKai\b/g, advisorFirst));
  });
  const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) personalizeTextNode(node);
}

function startPersonalization(firstName) {
  advisorFirst = firstName || 'Kai';
  if (advisorFirst === 'Kai') return;
  personalizeSubtree(root);
  personalizationObserver?.disconnect();
  personalizationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(personalizeSubtree));
  });
  personalizationObserver.observe(root, { childList: true, subtree: true });
}

async function markLeadInterest() {
  if (!token || interestMarked) return;
  interestMarked = true;
  const { error } = await markInteressiert(token);
  if (error) interestMarked = false;
}

window.addEventListener('baufi:track', (event) => {
  const meaningfulEvents = new Set([
    'compass_completed',
    'restschuld_check_completed',
    'restschuld_discussion_clicked',
    'funding_check_completed',
    'funding_discussion_clicked',
    'calendar_clicked',
  ]);
  if (meaningfulEvents.has(event.detail?.name)) void markLeadInterest();
});

root?.querySelectorAll('[data-scroll="contact"]').forEach((button) => {
  button.addEventListener('click', () => void markLeadInterest());
});

window.baufiOpenCalendar = () => {
  void markLeadInterest();
  setStatus(`Der Kalender von ${advisorFirst} wurde in einem neuen Fenster geöffnet.`);
  window.open(bookingUrl, '_blank', 'noopener');
};

window.baufiOptOut = () => {
  if (!token) {
    setStatus('In dieser Vorschau ist keine echte Empfehlung verknüpft. Es wurden keine Daten gespeichert.');
    return;
  }
  window.location.assign(`/austragen.html?token=${encodeURIComponent(token)}`);
};

// Gemerktes Branding aus einem früheren Aufruf steht sofort — sonst blitzt
// beim Laden das Standard-Portrait auf, bis der echte Berater da ist.
const brandKey = advisorSlug || (token ? `tok_${token}` : 'me');
const sofortBerater = gemerkterBerater(brandKey);
if (sofortBerater) {
  applyBeraterBrand(sofortBerater);
  if (sofortBerater.bookings_url) bookingUrl = sofortBerater.bookings_url;
}

(async () => {
  applyEntryMode();
  initSectionNavigation();
  setRecommendation();
  let recommendation = null;
  if (token) {
    const result = await getEmpfehlungByToken(token);
    recommendation = result.data || null;
    if (recommendation) setRecommendation(recommendation);
  }

  let advisor = null;
  if (recommendation?.berater_id) {
    const result = await getBeraterPublicById(recommendation.berater_id);
    advisor = result.data || null;
  } else if (advisorSlug) {
    const result = await getBeraterPublicBySlug(advisorSlug);
    advisor = result.data || null;
  }
  // Kein Token, kein Slug → eingeloggter Berater (Vorschau der eigenen
  // Themenseite aus dem Dashboard). Sonst bliebe das Kai-Default im HTML stehen.
  if (!advisor) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const m = await import('./dashboard.js');
        advisor = await m.getCurrentBerater();
      }
    } catch (_) {}
  }

  // Kein Berater auflösbar → Standard-Berater (ENV) als letzter Fallback,
  // damit die Portraits nicht leer bleiben.
  if (!advisor) {
    if (!sofortBerater) {
      document.querySelectorAll('[data-bb="foto"]').forEach((el) => {
        el.src = window.ENV_BERATER_FOTO || '';
        if (!el.alt) el.alt = window.ENV_BERATER_NAME || '';
      });
    }
    return;
  }
  applyBeraterBrand(advisor);
  merkeBerater(brandKey, advisor);
  const firstName = String(advisor.name || '').trim().split(/\s+/)[0] || 'Kai';
  startPersonalization(firstName);
  if (advisor.bookings_url) bookingUrl = advisor.bookings_url;
  else if (advisor.id !== window.ENV_BERATER_ID) {
    const button = document.getElementById('calendar-button');
    if (button) button.hidden = true;
  }
})();
