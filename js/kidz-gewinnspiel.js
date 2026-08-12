const ALLOWED_SOURCES = new Set(['vor-ort-qr', 'flyer', 'kidz-station', 'berater-einladung', 'facebook', 'instagram', 'whatsapp', 'direkt']);
const LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

const form = document.getElementById('kgForm');
const submit = document.getElementById('kgSubmit');
const errorBox = document.getElementById('kgError');
const captchaBox = document.getElementById('kgCaptcha');
const successBox = document.getElementById('kgSuccess');
const advisorSelect = document.getElementById('kgAdvisor');
const guessField = document.getElementById('kgGuessField');
const guessInput = document.getElementById('kgGuess');
const guessTag = document.getElementById('kgGuessTag');
const guessHint = document.getElementById('kgGuessHint');
const parentEveningRow = document.getElementById('kgParentEveningRow');
const parentEveningInput = document.getElementById('kgParentEvening');
const promoterFallbacks = [...advisorSelect.options]
  .filter((option) => option.value.startsWith('promoter-'))
  .map((option) => ({ name: option.textContent, slug: option.value }));
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
  flyerDialog.showModal();
});

flyerClose.addEventListener('click', closeFlyer);
flyerToForm.addEventListener('click', closeFlyer);
flyerTabEvent.addEventListener('click', () => showFlyerPage('event'));
flyerTabPrizes.addEventListener('click', () => showFlyerPage('prizes'));
flyerDialog.addEventListener('click', (event) => {
  if (event.target === flyerDialog) closeFlyer();
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

async function loadConfig() {
  try {
    const response = await fetch('/api/kidz-config', { headers: { Accept: 'application/json' } });
    return await response.json();
  } catch (_) {
    return {};
  }
}

/**
 * Zwei Felder gehören zum Veranstaltungstag. Ob der Tag da ist, entscheidet der
 * Server, nicht die Uhr im Gerät. Antwortet der Server nicht, bleiben beide zu.
 *
 * Das Schätzfeld bleibt vorher sichtbar, aber gesperrt: Man soll die zweite
 * Gewinnchance kennen. Das Elternabend-Häkchen verschwindet ganz, weil bis zum
 * Fest zum Sommerfest eingeladen wird und der Elternabend sonst nirgends
 * vorkommt.
 */
function applyEventDay(isEventDay) {
  parentEveningRow.hidden = !isEventDay;
  if (!isEventDay) parentEveningInput.checked = false;

  guessField.classList.toggle('is-closed', !isEventDay);
  guessInput.disabled = !isEventDay;
  if (!isEventDay) {
    guessInput.value = '';
    return;
  }
  guessInput.placeholder = 'z. B. 240';
  guessTag.textContent = 'Optional';
  guessHint.textContent = 'Du stehst vor dem Ball? Dann trag hier deine Schätzung ein. Wer am nächsten dran liegt, gewinnt das Survival Event.';
}

async function getTurnstileSiteKey(config) {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return LOCAL_TURNSTILE_SITE_KEY;
  const configuredKey = String(window.ENV_TURNSTILE_SITE_KEY || '').trim();
  if (configuredKey) return configuredKey;
  return String(config?.turnstileSiteKey || '').trim();
}

async function waitForTurnstile() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (window.turnstile?.render) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function initializeCaptcha(config) {
  const sitekey = await getTurnstileSiteKey(config);
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

function clientValidation(name, email, telefon, consent, schaetzung) {
  if (name.length < 2) return 'Bitte gib deinen Vor- und Nachnamen ein.';
  if (!email && !telefon) return 'Bitte gib eine E-Mail-Adresse oder Mobilnummer an.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Bitte prüfe deine E-Mail-Adresse.';
  if (schaetzung !== null && (!Number.isInteger(schaetzung) || schaetzung < 10 || schaetzung > 999)) {
    return 'Bitte gib den geschätzten Ballumfang als ganze Zahl zwischen 10 und 999 cm an.';
  }
  if (!consent) return 'Bitte bestätige die Teilnahmebedingungen und Datenschutzhinweise.';
  if (!captchaToken) return 'Bitte führe den Sicherheitscheck durch.';
  return '';
}

function readGuess() {
  if (guessInput.disabled) return null;
  const raw = String(guessInput.value || '').trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const name = document.getElementById('kgName').value.trim();
  const email = document.getElementById('kgEmail').value.trim();
  const telefon = document.getElementById('kgPhone').value.trim();
  const consent = document.getElementById('kgConsent').checked;
  const parentEvening = !parentEveningRow.hidden && parentEveningInput.checked;
  const beraterSlug = advisorSelect.value;
  const schaetzung = readGuess();
  const validationError = clientValidation(name, email, telefon, consent, schaetzung);
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
        schaetzung,
        source: readSource(),
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 409) throw new Error('Du bist bereits zum Gewinnspiel angemeldet. Deine Schätzung für den Ballumfang kannst du beim Sommerfest abgeben.');
    if (response.status === 429) throw new Error('Es gab gerade zu viele Versuche. Bitte probiere es später noch einmal.');
    if (response.status === 503) throw new Error('Die Anmeldung ist noch nicht freigeschaltet. Bitte sprich uns an der KIDZ-Station an.');
    if (!response.ok || !result?.reference) throw new Error('Deine Teilnahme konnte gerade nicht gespeichert werden. Bitte versuche es noch einmal.');

    form.hidden = true;
    document.querySelector('.kg-form-intro').hidden = true;
    successBox.hidden = false;
    document.getElementById('kgSuccessNote').textContent = schaetzung === null
      ? 'Wir haben deine Anmeldung. Deine Schätzung für den Ballumfang gibst du am 6. September vor Ort ab.'
      : `Wir haben deine Anmeldung und deine Schätzung von ${schaetzung} cm. Wir messen den Ball heute noch nach.`;
    document.getElementById('kgReference').textContent = `Teilnahmebestätigung: ${result.reference}`;
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showError(error.message || 'Deine Teilnahme konnte gerade nicht gespeichert werden.');
    submit.textContent = 'Kostenlos am Gewinnspiel teilnehmen';
    resetCaptcha();
  }
});

const config = await loadConfig();
applyEventDay(config?.eventDay === true || config?.guessOpen === true);
await Promise.all([loadAdvisors(), initializeCaptcha(config)]);
