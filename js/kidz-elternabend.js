import { getBeraterPublicBySlug } from './supabase.js';
import { applyBeraterBrand, merkeBerater, gemerkterBerater } from './berater-brand.js';

const ALLOWED_SOURCES = new Set([
  'elternabend-qr', 'kidz-station', 'berater-einladung', 'sommerfest-danke',
  'facebook', 'instagram', 'whatsapp', 'direkt',
]);
const LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
const SUBMIT_LABEL = 'Unverbindlich vormerken';
// Begrüßung je Herkunft. Alle anderen Aufrufe behalten den allgemeinen Satz aus dem HTML.
const GREETINGS = {
  'sommerfest-danke': 'Schön, dass ihr beim Sommerfest dabei wart.',
};

const form = document.getElementById('keaForm');
const submit = document.getElementById('keaSubmit');
const errorBox = document.getElementById('keaError');
const captchaBox = document.getElementById('keaCaptcha');
const successBox = document.getElementById('keaSuccess');
const referenceBox = document.getElementById('keaReference');
const advisorSelect = document.getElementById('keaAdvisor');
const promoterFallbacks = [...advisorSelect.options]
  .filter((option) => option.value.startsWith('promoter-'))
  .map((option) => ({ name: option.textContent, slug: option.value }));

let captchaToken = '';
let captchaWidgetId = null;

function readSource() {
  const value = String(new URLSearchParams(window.location.search).get('quelle') || 'direkt').trim().toLowerCase();
  return ALLOWED_SOURCES.has(value) ? value : 'direkt';
}

function showGreeting(text = GREETINGS[readSource()]) {
  const greeting = document.getElementById('keaGreeting');
  if (!greeting || !text) return;
  greeting.textContent = text;
  greeting.classList.add('is-personal');
}

function requestedAdvisorSlug() {
  return String(new URLSearchParams(window.location.search).get('berater') || '').trim().toLowerCase();
}

async function loadAdvisors() {
  const requested = requestedAdvisorSlug();
  try {
    const response = await fetch('/api/kidz-advisors', { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (response.ok && Array.isArray(result.advisors) && result.advisors.length) {
      const choices = [...result.advisors];
      promoterFallbacks.forEach((promoter) => {
        if (!choices.some((choice) => choice.slug === promoter.slug)) choices.push(promoter);
      });
      advisorSelect.innerHTML = '<option value="">Niemand aus dem Team oder nicht bekannt</option>';
      choices.forEach((advisor) => {
        const option = document.createElement('option');
        option.value = advisor.slug;
        option.textContent = advisor.name;
        advisorSelect.append(option);
      });
    }
  } catch (_) {}

  if (requested && [...advisorSelect.options].some((option) => option.value === requested)) {
    advisorSelect.value = requested;
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = '';
  errorBox.hidden = true;
}

async function getTurnstileSiteKey() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return LOCAL_TURNSTILE_SITE_KEY;
  const configuredKey = String(window.ENV_TURNSTILE_SITE_KEY || '').trim();
  if (configuredKey) return configuredKey;
  try {
    const response = await fetch('/api/kidz-config', { headers: { Accept: 'application/json' } });
    const result = await response.json();
    return response.ok ? String(result.turnstileSiteKey || '').trim() : '';
  } catch (_) {
    return '';
  }
}

async function waitForTurnstile() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (window.turnstile?.render) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function updateSubmitState() {
  submit.disabled = !captchaToken;
}

async function mountTurnstile() {
  const sitekey = await getTurnstileSiteKey();
  if (!sitekey || !await waitForTurnstile()) {
    showError('Der Sicherheitscheck konnte nicht geladen werden. Bitte lade die Seite neu.');
    return;
  }
  captchaWidgetId = window.turnstile.render(captchaBox, {
    sitekey,
    theme: 'light',
    callback(token) {
      captchaToken = token;
      clearError();
      updateSubmitState();
    },
    'expired-callback'() {
      captchaToken = '';
      updateSubmitState();
    },
    'error-callback'() {
      captchaToken = '';
      updateSubmitState();
      showError('Der Sicherheitscheck ist fehlgeschlagen. Bitte versuche es erneut.');
    },
  });
}

function resetTurnstile() {
  captchaToken = '';
  updateSubmitState();
  if (window.turnstile?.reset && captchaWidgetId !== null) window.turnstile.reset(captchaWidgetId);
}

function messageFor(reason) {
  const messages = {
    invalid_input: 'Bitte prüfe deinen Namen und die Zustimmung.',
    invalid_contact: 'Bitte trage eine gültige E-Mail-Adresse oder Mobilnummer ein.',
    captcha_required: 'Bitte führe zuerst den Sicherheitscheck durch.',
    captcha_failed: 'Der Sicherheitscheck ist fehlgeschlagen. Bitte versuche es erneut.',
    already_exists: 'Für diesen Kontakt besteht bereits eine Vormerkung.',
    invalid_advisor: 'Die ausgewählte Zuordnung ist nicht mehr verfügbar. Bitte lade die Seite neu.',
    rate_limited: 'Es gab zu viele Anfragen. Bitte versuche es später erneut.',
    not_configured: 'Die Vormerkung ist noch nicht freigeschaltet.',
  };
  return messages[reason] || 'Die Vormerkung konnte gerade nicht gespeichert werden. Bitte versuche es erneut.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const telefon = String(formData.get('telefon') || '').trim();
  if (!form.reportValidity()) return;
  if (!email && !telefon) {
    showError('Bitte trage eine E-Mail-Adresse oder Mobilnummer ein.');
    document.getElementById('keaEmail').focus();
    return;
  }
  if (!captchaToken) {
    showError('Bitte führe zuerst den Sicherheitscheck durch.');
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Wird vorgemerkt ...';
  try {
    const response = await fetch('/api/kidz-elternabend-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email,
        telefon,
        timePreference: formData.get('timePreference'),
        question: formData.get('question'),
        beraterSlug: formData.get('beraterSlug'),
        source: readSource(),
        consent: formData.get('consent') === 'on',
        captchaToken,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw Object.assign(new Error('registration_failed'), { reason: result.reason });

    form.hidden = true;
    successBox.hidden = false;
    referenceBox.textContent = result.reference ? `Vormerkung: ${result.reference}` : '';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Tastatur und Vorleseprogramm landen bei der Bestätigung, nicht im Nichts,
    // denn das Formular mit dem gerade gedrückten Knopf ist verschwunden.
    successBox.focus({ preventScroll: true });
  } catch (error) {
    showError(messageFor(error.reason));
    resetTurnstile();
  } finally {
    submit.textContent = SUBMIT_LABEL;
    if (!form.hidden) updateSubmitState();
  }
});

// Handy: der Knopf am unteren Rand erscheint erst, wenn der Knopf im Einstieg aus dem Bild
// ist, und verschwindet, sobald das Formular erreicht ist. So verdeckt er nie ein Feld.
// Berechnet wird bei jedem Scrollen direkt aus der Lage auf dem Schirm. Vorher meldete ein
// Beobachter nur Durchgänge durchs Bild: Sprang die Seite ohne Zwischenbild ans Ende (Zurück-
// Taste mit wiederhergestellter Position), blieb der Knopf stehen und lag über dem Fuß.
function watchMobileCta() {
  const bar = document.getElementById('keaMobileCta');
  const heroActions = document.querySelector('.kea-hero-actions');
  const register = document.getElementById('anmeldung');
  if (!bar || !heroActions || !register) return;
  let pending = false;
  const update = () => {
    pending = false;
    const heroVisible = heroActions.getBoundingClientRect().bottom > 0;
    const formReached = register.getBoundingClientRect().top < window.innerHeight;
    bar.hidden = heroVisible || formReached;
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}

// Ein Berater erscheint nur über seinen persönlichen Anmeldelink (?berater=…). Ohne Link
// zeigt die Seite niemanden, auch nicht den Standard-Berater. Promoter sind keine Berater
// und bekommen deshalb keinen Personenabschnitt, ihre Zuordnung läuft über die Auswahl.
const SAFE_SLUG = /^[a-z0-9-]+$/;

function invitingAdvisorSlug() {
  const slug = requestedAdvisorSlug();
  return slug && slug.length <= 80 && SAFE_SLUG.test(slug) && !slug.startsWith('promoter-') ? slug : '';
}

function setAdvisorVisible(visible) {
  document.getElementById('gastgeber').hidden = !visible;
  document.getElementById('keaNavHost').hidden = !visible;
}

function showAdvisor(berater) {
  applyBeraterBrand(berater);
  const isDefault = window.ENV_BERATER_ID ? berater.id === window.ENV_BERATER_ID : berater.slug === 'kai-blobel';
  document.querySelectorAll('[data-andere-berater]').forEach((el) => { el.hidden = isDefault; });
  setAdvisorVisible(true);
  if (!GREETINGS[readSource()] && berater.name) showGreeting(`Persönlich eingeladen von ${berater.name}`);
}

async function loadInvitingAdvisor() {
  const slug = invitingAdvisorSlug();
  if (!slug) return;
  const remembered = gemerkterBerater(slug);
  if (remembered) showAdvisor(remembered);
  const { data, error } = await getBeraterPublicBySlug(slug);
  if (data) {
    showAdvisor(data);
    merkeBerater(slug, data);
  } else if (!error) {
    // Das Kürzel gibt es nicht (mehr). Dann steht niemand da, auch kein gemerkter Stand.
    setAdvisorVisible(false);
  }
}

showGreeting();
watchMobileCta();
loadAdvisors();
loadInvitingAdvisor();
mountTurnstile();
