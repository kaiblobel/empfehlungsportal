import {
  getBeraterPublicById,
  getBeraterPublicBySlug,
  getEmpfehlungByToken,
  markInteressiert,
  supabase,
} from './supabase.js';
import { applyBeraterBrand, merkeBerater, gemerkterBerater } from './berater-brand.js';

const THEMES = {
  foerderungen: { title: 'Staatliche Förderungen', kicker: 'Förderungen verständlich gemacht' },
  selbstaendige: { title: 'Selbständige', kicker: 'Privat und geschäftlich gut aufgestellt' },
  investment: { title: 'Geldanlage und Investment', kicker: 'Vermögen sinnvoll aufbauen' },
  absicherung: { title: 'Absicherung und Familie', kicker: 'Schützen, was dir wichtig ist' },
  karriere: { title: 'Berufliche Perspektive', kicker: 'Neue Möglichkeiten entdecken' },
  kinder: { title: 'Für deine Kinder', kicker: 'Früh die richtigen Weichen stellen' },
};

const params = new URLSearchParams(window.location.search);
const token = params.get('token') || '';
const brandKey = params.get('berater') || (token ? `tok_${token}` : 'me');
const interestButton = document.getElementById('interestButton');
const feedback = document.getElementById('themeFeedback');
const optOutLink = document.getElementById('optOutLink');
const generalLink = document.getElementById('generalLink');
let currentTheme = null;
let interestMarked = false;

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function initials(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'E';
}

function resolveTheme(slug) {
  return THEMES[String(slug || '').toLowerCase()] || null;
}

function renderTheme(slug) {
  const theme = resolveTheme(slug);
  currentTheme = theme;
  const safeSlug = theme ? String(slug).toLowerCase() : 'neutral';
  document.body.dataset.theme = safeSlug;
  document.getElementById('themeTitle').textContent = theme?.title || 'deinem Finanzthema';
  document.getElementById('themeKicker').textContent = theme?.kicker || 'Deine Themenwelt';
  document.title = `${theme?.title || 'Themenseite'} · Empfehlungsportal`;
}

function renderRecommendation(data = {}) {
  const promoter = String(data.empfehler_name || params.get('von') || 'Jemand aus deinem Umfeld').trim();
  const recipient = firstName(data.empfaenger_name || params.get('an'));
  const personalMessage = String(data.empfehler_nachricht || data.empfehler_standard_nachricht || '').trim();

  document.getElementById('refAvatar').textContent = initials(promoter);
  document.getElementById('refName').textContent = promoter;
  if (personalMessage) document.getElementById('refMessage').textContent = `„${personalMessage}“`;
  document.getElementById('recipientPrefix').textContent = recipient ? `${recipient}, ` : '';
  document.getElementById('headingStart').textContent = recipient ? 'diese' : 'Diese';
}

function setFeedback(text, state = '') {
  feedback.textContent = text;
  feedback.classList.toggle('is-success', state === 'success');
  feedback.classList.toggle('is-error', state === 'error');
}

function setInterestComplete() {
  interestMarked = true;
  interestButton.disabled = true;
  interestButton.textContent = 'Interesse ist vorgemerkt';
  setFeedback(`Danke. Dein Interesse an „${currentTheme?.title || 'diesem Thema'}“ ist bei deinem Ansprechpartner vorgemerkt.`, 'success');
}

async function markLeadInterest() {
  if (interestMarked) return true;
  if (!token) {
    setFeedback('Dies ist eine Vorschau ohne echte Empfehlung. Es wurden keine Daten gespeichert.');
    return false;
  }

  interestButton.disabled = true;
  interestButton.textContent = 'Wird vorgemerkt …';
  const { error } = await markInteressiert(token);
  if (error) {
    interestButton.disabled = false;
    interestButton.textContent = 'Dieses Thema interessiert mich';
    setFeedback('Das hat gerade nicht geklappt. Bitte versuche es noch einmal.', 'error');
    return false;
  }
  setInterestComplete();
  return true;
}

function preserveGeneralLink() {
  const target = new URL('/empfaenger.html', window.location.origin);
  for (const key of ['token', 'berater', 'von', 'an']) {
    const value = params.get(key);
    if (value) target.searchParams.set(key, value);
  }
  target.searchParams.set('vorlage', 'allgemein');
  generalLink.href = `${target.pathname}${target.search}`;

  if (token) optOutLink.href = `/austragen.html?token=${encodeURIComponent(token)}`;
  else optOutLink.hidden = true;
}

interestButton.addEventListener('click', () => { void markLeadInterest(); });
document.querySelectorAll('[data-track-booking]').forEach((link) => {
  link.addEventListener('click', () => { void markLeadInterest(); });
});

preserveGeneralLink();
renderTheme(params.get('vorlage'));
renderRecommendation();

const cachedAdvisor = gemerkterBerater(brandKey);
if (cachedAdvisor) applyBeraterBrand(cachedAdvisor);

(async () => {
  let recommendation = null;
  if (token) {
    const result = await getEmpfehlungByToken(token);
    recommendation = result.data || null;
    if (recommendation) {
      renderRecommendation(recommendation);
      renderTheme(params.get('vorlage') || recommendation.vorlage_slug);
      if (recommendation.interessiert) setInterestComplete();
    }
  }

  let advisor = null;
  if (recommendation?.berater_id) {
    advisor = (await getBeraterPublicById(recommendation.berater_id)).data;
  }
  if (!advisor && params.get('berater')) {
    advisor = (await getBeraterPublicBySlug(params.get('berater'))).data;
  }
  if (!advisor) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const module = await import('./dashboard.js');
        advisor = await module.getCurrentBerater();
      }
    } catch (_) {}
  }

  if (advisor) {
    applyBeraterBrand(advisor);
    merkeBerater(brandKey, advisor);
  } else if (!cachedAdvisor) {
    document.querySelectorAll('[data-bb="foto"]').forEach((image) => {
      image.src = window.ENV_BERATER_FOTO || '';
      image.alt = window.ENV_BERATER_NAME || '';
    });
  }
})();
