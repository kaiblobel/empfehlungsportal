const ALLOWED_SOURCES = new Set(['vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt']);
const LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

const form = document.getElementById('kgForm');
const submit = document.getElementById('kgSubmit');
const errorBox = document.getElementById('kgError');
const captchaBox = document.getElementById('kgCaptcha');
const successBox = document.getElementById('kgSuccess');
const advisorSelect = document.getElementById('kgAdvisor');
const menu = document.getElementById('kgMenu');
const flyerDialog = document.getElementById('kgFlyerDialog');
const flyerOpen = document.getElementById('kgFlyerOpen');
const flyerClose = document.getElementById('kgFlyerClose');
const flyerToForm = document.getElementById('kgFlyerToForm');
const flyerDownload = document.getElementById('kgFlyerDownload');
const flyerTabEvent = document.getElementById('kgFlyerTabEvent');
const flyerTabPrizes = document.getElementById('kgFlyerTabPrizes');
const flyerEvent = document.getElementById('kgFlyerEvent');
const flyerPrizes = document.getElementById('kgFlyerPrizes');

let captchaToken = '';
let captchaWidgetId = null;

function closeFlyer() {
  if (flyerDialog.open) flyerDialog.close();
}

function showFlyerPage(page) {
  const showPrizes = page === 'prizes';
  flyerEvent.hidden = showPrizes;
  flyerPrizes.hidden = !showPrizes;
  flyerTabEvent.setAttribute('aria-selected', String(!showPrizes));
  flyerTabPrizes.setAttribute('aria-selected', String(showPrizes));
  flyerDownload.href = showPrizes
    ? '/assets/images/kidz-sommerfest-gewinnspiel-v2.png'
    : '/assets/images/kidz-sommerfest-flyer.jpg';
}

flyerOpen.addEventListener('click', () => {
  menu.removeAttribute('open');
  flyerDialog.showModal();
});

flyerClose.addEventListener('click', closeFlyer);
flyerToForm.addEventListener('click', closeFlyer);
flyerTabEvent.addEventListener('click', () => showFlyerPage('event'));
flyerTabPrizes.addEventListener('click', () => showFlyerPage('prizes'));
flyerDialog.addEventListener('click', (event) => {
  if (event.target === flyerDialog) closeFlyer();
});
document.addEventListener('click', (event) => {
  if (menu.open && !menu.contains(event.target)) menu.removeAttribute('open');
});

function readSource() {
  const params = new URLSearchParams(window.location.search);
  const value = String(params.get('quelle') || 'direkt').trim().toLowerCase();
  return ALLOWED_SOURCES.has(value) ? value : 'direkt';
}

function requestedAdvisorSlug() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get('berater') || '').trim().toLowerCase();
}

async function loadAdvisors() {
  const requested = requestedAdvisorSlug();
  try {
    const response = await fetch('/api/kidz-advisors', { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (response.ok && Array.isArray(result.advisors) && result.advisors.length) {
      advisorSelect.innerHTML = '<option value="">Niemand aus dem Team oder nicht bekannt</option>';
      result.advisors.forEach((advisor) => {
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

async function initializeCaptcha() {
  const sitekey = await getTurnstileSiteKey();
  if (!sitekey) {
    showError('Die Gewinnspiel-Anmeldung ist noch nicht freigeschaltet. Bitte sprich uns an der KIDZ-Station an.');
    return;
  }
  if (!await waitForTurnstile()) {
    showError('Der Sicherheitscheck konnte nicht geladen werden. Bitte lade die Seite neu.');
    return;
  }

  captchaWidgetId = window.turnstile.render(captchaBox, {
    sitekey,
    theme: 'light',
    language: 'de',
    callback(token) {
      captchaToken = token;
      clearError();
      submit.disabled = false;
    },
    'expired-callback'() {
      captchaToken = '';
      submit.disabled = true;
    },
    'error-callback'() {
      captchaToken = '';
      submit.disabled = true;
      showError('Der Sicherheitscheck ist fehlgeschlagen. Bitte versuche es erneut.');
    },
  });
}

function resetCaptcha() {
  captchaToken = '';
  submit.disabled = true;
  if (captchaWidgetId !== null && window.turnstile?.reset) window.turnstile.reset(captchaWidgetId);
}

function clientValidation(name, email, telefon, consent) {
  if (name.length < 2) return 'Bitte gib deinen Vor- und Nachnamen ein.';
  if (!email && !telefon) return 'Bitte gib eine E-Mail-Adresse oder Mobilnummer an.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Bitte prüfe deine E-Mail-Adresse.';
  if (!consent) return 'Bitte bestätige die Teilnahmebedingungen und Datenschutzhinweise.';
  if (!captchaToken) return 'Bitte führe den Sicherheitscheck durch.';
  return '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const name = document.getElementById('kgName').value.trim();
  const email = document.getElementById('kgEmail').value.trim();
  const telefon = document.getElementById('kgPhone').value.trim();
  const consent = document.getElementById('kgConsent').checked;
  const parentEvening = document.getElementById('kgParentEvening').checked;
  const beraterSlug = advisorSelect.value;
  const validationError = clientValidation(name, email, telefon, consent);
  if (validationError) {
    showError(validationError);
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Teilnahme wird gespeichert ...';

  try {
    const response = await fetch('/api/kidz-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        telefon,
        consent,
        parentEvening,
        beraterSlug,
        captchaToken,
        source: readSource(),
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 409) throw new Error('Du bist bereits für die Bonusverlosung angemeldet. Zeige deine erste Bestätigung am Veranstaltungstag am Eingang.');
    if (response.status === 429) throw new Error('Es gab gerade zu viele Versuche. Bitte probiere es später noch einmal.');
    if (response.status === 503) throw new Error('Die Anmeldung ist noch nicht freigeschaltet. Bitte sprich uns an der KIDZ-Station an.');
    if (!response.ok || !result?.reference) throw new Error('Deine Teilnahme konnte gerade nicht gespeichert werden. Bitte versuche es noch einmal.');

    form.hidden = true;
    document.querySelector('.kg-form-intro').hidden = true;
    successBox.hidden = false;
    document.getElementById('kgReference').textContent = `Teilnahmebestätigung: ${result.reference}`;
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showError(error.message || 'Deine Teilnahme konnte gerade nicht gespeichert werden.');
    submit.textContent = 'Kostenlos an der Bonusverlosung teilnehmen';
    resetCaptcha();
  }
});

await Promise.all([loadAdvisors(), initializeCaptcha()]);
