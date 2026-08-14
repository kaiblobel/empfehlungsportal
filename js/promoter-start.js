import { getBeraterPublicBySlug } from '/js/supabase.js';

const ALLOWED_SOURCES = new Set(['praesentation', 'aufsteller', 'direkt', 'portal']);
const LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

const form = document.getElementById('psForm');
const submit = document.getElementById('psSubmit');
const errorBox = document.getElementById('psError');
const captchaBox = document.getElementById('psCaptcha');
const existingLink = document.getElementById('psExistingLink');

let advisor = null;
let captchaToken = '';
let captchaWidgetId = null;

function readContext() {
  const params = new URLSearchParams(window.location.search);
  const pathMatch = window.location.pathname.match(/^\/p\/([^/]+)\/([^/]+)\/?$/i);
  const slug = String(params.get('berater') || pathMatch?.[1] || window.ENV_BERATER_SLUG || 'kai-blobel')
    .trim().toLowerCase();
  const requestedSource = String(params.get('quelle') || pathMatch?.[2] || 'direkt').trim().toLowerCase();
  return {
    slug,
    source: ALLOWED_SOURCES.has(requestedSource) ? requestedSource : 'direkt',
  };
}

const context = readContext();

function initials(name) {
  return String(name || '?').trim().split(/\s+/).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase() || '?';
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = '';
  errorBox.hidden = true;
}

function setLegalLink(element, href) {
  if (href) {
    element.href = href;
    element.hidden = false;
  } else {
    element.hidden = true;
  }
}

function applyAdvisor(data) {
  advisor = data;
  const displayName = data.name || 'Dein Beraterteam';
  document.getElementById('psAdvisorName').textContent = `${displayName} & Team`;
  document.getElementById('psFooterName').textContent = `${displayName} & Team`;
  document.getElementById('psInitials').textContent = initials(displayName);
  document.title = `Jemanden weiterempfehlen | ${displayName}`;

  setLegalLink(document.getElementById('psPrivacy'), data.datenschutz_url);
  setLegalLink(document.getElementById('psFooterPrivacy'), data.datenschutz_url);
  setLegalLink(document.getElementById('psImprint'), data.impressum_url);
}

function restoreExistingAccess() {
  try {
    const code = localStorage.getItem('empfehler_code');
    if (!code) return;
    existingLink.href = `/empfehler.html?code=${encodeURIComponent(code)}`;
    existingLink.hidden = false;
  } catch (_) {}
}

async function getTurnstileSiteKey() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return LOCAL_TURNSTILE_SITE_KEY;
  const configuredKey = String(window.ENV_TURNSTILE_SITE_KEY || '').trim();
  if (configuredKey) return configuredKey;
  try {
    const response = await fetch('/api/promoter-config', { headers: { Accept: 'application/json' } });
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
    showError('Die Selbstanmeldung ist noch nicht freigeschaltet. Bitte sprich deinen Berater direkt an.');
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
      submit.disabled = !advisor;
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
  if (captchaWidgetId !== null && window.turnstile?.reset) {
    window.turnstile.reset(captchaWidgetId);
  }
}

function clientValidation(name, email, telefon, consent) {
  if (name.length < 2) return 'Bitte gib deinen Namen ein.';
  if (!email && !telefon) return 'Bitte gib eine E-Mail-Adresse oder Mobilnummer an.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Bitte prüfe deine E-Mail-Adresse.';
  if (!consent) return 'Bitte bestätige den Datenschutzhinweis.';
  if (!captchaToken) return 'Bitte führe den Sicherheitscheck durch.';
  return '';
}

async function loadAdvisor() {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(context.slug)) {
    showError('Dieser Berater-Link ist ungültig. Bitte prüfe den QR-Code.');
    return;
  }

  const { data, error } = await getBeraterPublicBySlug(context.slug);
  if (error || !data) {
    showError('Dieser Berater-Link ist nicht mehr aktiv. Bitte wende dich direkt an deinen Berater.');
    return;
  }
  applyAdvisor(data);
  if (captchaToken) submit.disabled = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const name = document.getElementById('psName').value.trim();
  const email = document.getElementById('psEmail').value.trim();
  const telefon = document.getElementById('psPhone').value.trim();
  const consent = document.getElementById('psConsent').checked;
  const validationError = clientValidation(name, email, telefon, consent);
  if (validationError) {
    showError(validationError);
    return;
  }
  if (!advisor) {
    showError('Der Berater konnte nicht geladen werden. Bitte prüfe den QR-Code.');
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Dein Bereich wird erstellt ...';

  try {
    const response = await fetch('/api/promoter-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        telefon,
        consent,
        captchaToken,
        beraterSlug: context.slug,
        source: context.source,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 409) {
      throw new Error('Du hast bereits einen persönlichen Empfehlungsbereich. Nutze deinen vorhandenen Zugangslink oder bitte deinen Berater, ihn dir erneut zu senden.');
    }
    if (response.status === 429) {
      throw new Error('Es gab gerade zu viele Versuche. Bitte probiere es später noch einmal.');
    }
    if (response.status === 503) {
      throw new Error('Die Selbstanmeldung ist noch nicht freigeschaltet. Bitte sprich deinen Berater direkt an.');
    }
    if (!response.ok || !result?.code) {
      throw new Error('Dein Bereich konnte gerade nicht erstellt werden. Bitte versuche es noch einmal.');
    }

    try { localStorage.setItem('empfehler_code', result.code); } catch (_) {}
    window.location.assign(`/empfehler.html?code=${encodeURIComponent(result.code)}&neu=1`);
  } catch (error) {
    showError(error.message || 'Dein Bereich konnte gerade nicht erstellt werden.');
    submit.textContent = 'Empfehlungsbereich öffnen';
    resetCaptcha();
  }
});

restoreExistingAccess();
await Promise.all([loadAdvisor(), initializeCaptcha()]);
