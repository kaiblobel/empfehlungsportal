import {
  getBeraterPublicById,
  getBeraterPublicBySlug,
  getEmpfehlungByToken,
  markInteressiert,
} from './supabase.js';
import { applyBeraterBrand } from './berater-brand.js';

const root = document.getElementById('finance-v4');
const params = new URLSearchParams(window.location.search);
const token = params.get('token') || '';
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

(async () => {
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
  } else if (params.get('berater')) {
    const result = await getBeraterPublicBySlug(params.get('berater'));
    advisor = result.data || null;
  }

  if (!advisor) return;
  applyBeraterBrand(advisor);
  const firstName = String(advisor.name || '').trim().split(/\s+/)[0] || 'Kai';
  startPersonalization(firstName);
  if (advisor.bookings_url) bookingUrl = advisor.bookings_url;
  else if (advisor.id !== window.ENV_BERATER_ID) {
    const button = document.getElementById('calendar-button');
    if (button) button.hidden = true;
  }
})();
