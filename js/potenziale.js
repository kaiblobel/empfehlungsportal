/** Phase 170 · Kontakt-Coach im privaten Potenzialbuch */
import {
  POTENTIAL_CIRCLES,
  POTENTIAL_STRENGTHS,
  cleanPotentialText,
  normalizePotentialText,
  potentialInitials,
  potentialPhoneDigits,
  formatPotentialPhone,
  findPotentialDuplicate,
  potentialCircleKeys,
  potentialCircleLabels,
  potentialContactStrength,
  parsePotentialDate,
  potentialStartOfDay,
  potentialDueState,
} from './potenziale-utils.mjs';
import {
  cockpitAccessState,
  cockpitClientUrl,
  cockpitFehlertext,
  cockpitLinkMap,
  cockpitRequest,
} from './potenziale-cockpit.mjs';
import {
  PotentialVoiceRecorder,
  addDaysIso,
  blobToBase64,
  cleanCoachLines,
  coachLinesText,
  coachRequest,
} from './potenziale-coach.mjs';

const PAGE_PARAMS = new URLSearchParams(window.location.search);
const PREVIEW_REQUESTED = PAGE_PARAMS.get('preview') === 'potenzialbuch';
const PREVIEW_MODE = PREVIEW_REQUESTED && (
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
  || window.location.hostname.includes('git-codex-po-')
);
const PREVIEW_COCKPIT_LOCKED = PREVIEW_MODE && PAGE_PARAMS.get('cockpit') === 'gesperrt';
const ACTIVE_STATUSES = new Set(['offen', 'angesprochen', 'im_gespraech', 'termin']);
const TALK_STATUSES = new Set(['im_gespraech', 'termin']);
const STATUS_LABELS = {
  offen: 'Offen',
  angesprochen: 'Angesprochen',
  im_gespraech: 'Im Gespräch',
  termin: 'Termin',
  uebernommen: 'Übernommen',
  kein_interesse: 'Kein Interesse',
};

const listEl = document.getElementById('potentialList');
const errorEl = document.getElementById('potentialError');
const searchEl = document.getElementById('potentialSearch');
const filtersEl = document.getElementById('potentialFilters');
const strengthFiltersEl = document.getElementById('potentialStrengthFilters');
const circleFiltersEl = document.getElementById('potentialCircleFilters');
const modal = document.getElementById('potentialModal');
const coachModal = document.getElementById('coachModal');
const transferModal = document.getElementById('transferModal');
const form = document.getElementById('potentialForm');
const duplicateWarning = document.getElementById('duplicateWarning');
const duplicateConfirm = document.getElementById('duplicateConfirm');
const formError = document.getElementById('formError');
const transferError = document.getElementById('transferError');
const transferLoading = document.getElementById('transferLoading');
const transferChoices = document.getElementById('transferChoices');
const transferSuccess = document.getElementById('transferSuccess');
const toastEl = document.getElementById('potentialToast');

let advisor = null;
let dashboardApi = null;
let storeApi = null;
let potentials = [];
let accessToken = '';
let cockpitLinks = new Map();
let cockpitAccess = 'unavailable';
let activeFilter = 'alle';
let activeStrengthFilter = 'alle';
const activeCircleFilters = new Set();
let transferTarget = null;
let restoreFocusEl = null;
let toastTimer = null;
let connectedClientLink = null;
let coachMode = 'contact';
let coachTarget = null;
let coachAfterProposal = null;
let activeRecorder = null;
let activeRecordButton = null;

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  if (PREVIEW_MODE) { showToast('In der Vorschau ist kein Login aktiv.'); return; }
  dashboardApi ||= await import('./dashboard.js');
  dashboardApi.logout();
});
document.getElementById('newPotentialBtn')?.addEventListener('click', (event) => openForm(null, event.currentTarget));
document.getElementById('voicePotentialBtn')?.addEventListener('click', (event) => openVoiceContact(event.currentTarget));
searchEl?.addEventListener('input', render);
filtersEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter || 'alle';
  filtersEl.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
  render();
});
strengthFiltersEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-strength-filter]');
  if (!button) return;
  activeStrengthFilter = button.dataset.strengthFilter || 'alle';
  strengthFiltersEl.querySelectorAll('[data-strength-filter]').forEach((item) => item.classList.toggle('active', item === button));
  render();
});
circleFiltersEl?.addEventListener('change', (event) => {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  if (checkbox.checked) activeCircleFilters.add(checkbox.value);
  else activeCircleFilters.delete(checkbox.value);
  updateCircleFilterCount();
  render();
});
document.getElementById('clearCircleFilters')?.addEventListener('click', () => {
  activeCircleFilters.clear();
  circleFiltersEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => { checkbox.checked = false; });
  updateCircleFilterCount();
  render();
});
form?.addEventListener('submit', saveForm);
form?.addEventListener('input', handleFormChange);
form?.addEventListener('change', handleFormChange);
document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeForm));
document.querySelectorAll('[data-close-transfer]').forEach((element) => element.addEventListener('click', closeTransfer));
document.querySelectorAll('[data-close-coach]').forEach((element) => element.addEventListener('click', closeCoach));
document.getElementById('coachRecordBtn')?.addEventListener('click', () => toggleRecording('coachRecordBtn', 'coachRecordState', 'coachVoiceText'));
document.getElementById('coachAfterRecordBtn')?.addEventListener('click', () => toggleRecording('coachAfterRecordBtn', 'coachAfterRecordState', 'coachAfterText'));
document.getElementById('coachAnalyzeBtn')?.addEventListener('click', analyzeVoiceContact);
document.getElementById('coachCallBtn')?.addEventListener('click', callFromCoach);
document.getElementById('coachAfterBtn')?.addEventListener('click', () => showCoachScreen('after'));
document.getElementById('coachBackBtn')?.addEventListener('click', () => showCoachScreen('compass'));
document.getElementById('coachAfterEditBtn')?.addEventListener('click', () => showCoachScreen('after'));
document.getElementById('coachAfterAnalyzeBtn')?.addEventListener('click', analyzeAfterCall);
document.getElementById('coachAfterSaveBtn')?.addEventListener('click', saveAfterCall);
transferChoices?.addEventListener('click', handleTransferChoice);
document.getElementById('openConnectedClientBtn')?.addEventListener('click', openConnectedClient);
listEl?.addEventListener('click', handleListAction);
document.addEventListener('click', (event) => {
  if (!event.target.closest('.potential-card-menu') && !event.target.closest('.potential-more')) closeMenus();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!coachModal.hidden) closeCoach();
  else if (!transferModal.hidden) closeTransfer();
  else if (!modal.hidden) closeForm();
  else closeMenus();
});

document.querySelectorAll('[data-strength-symbol]').forEach((element) => {
  element.innerHTML = strengthIcon(element.dataset.strengthSymbol);
});

(async () => {
  if (PREVIEW_MODE) {
    advisor = { id: 'preview-berater', name: 'Testberater' };
    accessToken = 'preview-token';
    potentials = previewPotentials();
    setText('hName', 'Testberater');
    const boundary = document.querySelector('.potential-boundary p');
    if (boundary) boundary.innerHTML = '<strong>Vorschau mit erfundenen Kontakten.</strong> Du kannst alles ausprobieren. Nichts wird gespeichert oder an Supabase gesendet.';
    await loadCockpitLinks();
    render();
    return;
  }
  dashboardApi = await import('./dashboard.js');
  storeApi = await import('./supabase.js');
  const session = await dashboardApi.requireAuth();
  if (!session) return;
  accessToken = session.access_token || '';
  await dashboardApi.applyBeraterHeader();
  advisor = await dashboardApi.getCurrentBerater();
  if (!advisor?.id) {
    showLoadError('Dein Beraterkonto konnte nicht eindeutig zugeordnet werden. Es wurden keine Kontaktdaten geladen.');
    return;
  }
  await loadPotentials();
})();

async function loadPotentials() {
  setLoading();
  errorEl.hidden = true;
  const { data, error } = await storeLoad();
  if (error) {
    console.error('[potenziale:load]', error);
    const message = ['42P01', 'PGRST205'].includes(error.code)
      ? 'Das Potenzialbuch ist im Code vorbereitet. Die zugehörige Datenbankmigration wurde noch nicht angewendet.'
      : 'Das Potenzialbuch konnte gerade nicht geladen werden. Es werden keine unvollständigen Daten angezeigt.';
    showLoadError(message);
    return;
  }
  potentials = data || [];
  await loadCockpitLinks();
  render();
  highlightRequestedPotential();
}

async function loadCockpitLinks() {
  if (PREVIEW_MODE) {
    cockpitLinks = new Map();
    cockpitAccess = PREVIEW_COCKPIT_LOCKED ? 'locked' : 'available';
    return;
  }
  const result = await cockpitRequest(fetch, accessToken, { action: 'status' });
  cockpitAccess = cockpitAccessState(result);
  cockpitLinks = cockpitAccess === 'available' ? cockpitLinkMap(result) : new Map();
}

function render() {
  renderKpis();
  const query = normalizePotentialText(searchEl?.value);
  const filtered = potentials.filter((item) => {
    if (activeFilter !== 'alle' && item.status !== activeFilter) return false;
    const strength = potentialContactStrength(item);
    if (activeStrengthFilter !== 'alle' && strength.key !== activeStrengthFilter) return false;
    const circles = potentialCircleKeys(item);
    if (activeCircleFilters.size && ![...activeCircleFilters].every((circle) => circles.includes(circle))) return false;
    if (!query) return true;
    return [item.name, item.telefon, item.email, item.kreis, item.notiz, strength.label, ...potentialCircleLabels(item)]
      .some((value) => normalizePotentialText(value).includes(query));
  });

  if (!filtered.length) {
    const hasAny = potentials.length > 0;
    listEl.innerHTML = `
      <div class="potential-empty">
        <div><span class="potential-empty-mark">${hasAny ? '⌕' : '+'}</span>
          <h3>${hasAny ? 'Kein Kontakt passt zu deiner Auswahl' : 'Dein Potenzialbuch ist noch leer'}</h3>
          <p>${hasAny ? 'Ändere den Filter oder die Suche. Deine Einträge bleiben unverändert.' : 'Beginne mit einem Namen. Telefonnummer, Notiz und nächster Schritt können später dazukommen.'}</p>
          ${hasAny ? '' : '<button class="potential-primary" type="button" data-action="new">Ersten Kontakt eintragen</button>'}
        </div>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(renderCard).join('');
}

function renderKpis() {
  const today = potentialStartOfDay();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  setText('kpiOpen', potentials.filter((item) => ACTIVE_STATUSES.has(item.status)).length);
  setText('kpiDue', potentials.filter((item) => {
    const date = parsePotentialDate(item.naechster_kontakt_am);
    return ACTIVE_STATUSES.has(item.status) && date && date <= weekEnd;
  }).length);
  setText('kpiTalks', potentials.filter((item) => TALK_STATUSES.has(item.status)).length);
  setText('kpiTransferred', potentials.filter((item) => cockpitLinks.has(item.id) || item.status === 'uebernommen').length);
}

function renderCard(item) {
  const due = potentialDueState(item.naechster_kontakt_am);
  const contact = primaryContact(item);
  const strength = potentialContactStrength(item);
  const circleLabels = potentialCircleLabels(item);
  const cockpitLink = cockpitLinks.get(item.id) || null;
  const isLinked = Boolean(cockpitLink);
  const cockpitAvailable = cockpitAccess === 'available';
  const statusLabel = cockpitLink ? `Cockpit: ${cockpitLink.relationshipLabel}` : (STATUS_LABELS[item.status] || item.status);
  const statusKey = cockpitLink ? 'uebernommen' : item.status;
  const avatarTone = item.ziel === 'partner'
    ? '--avatar-bg:rgba(46,82,102,.10);--avatar-fg:#2E5266'
    : '--avatar-bg:#F2EDDF;--avatar-fg:#7B6B43';
  const meta = [
    item.ziel === 'partner' ? 'Potenzialpartner' : 'Potenzialkunde',
    ...circleLabels,
    item.telefon ? formatPotentialPhone(item.telefon) : '',
    item.email,
  ].filter(Boolean);
  return `
    <article class="potential-card${due.kind === 'overdue' ? ' overdue' : ''}${isLinked ? ' cockpit-linked' : ''}" data-id="${escapeHtml(item.id)}">
      <header class="potential-card-head">
        <span class="potential-avatar" style="${avatarTone}">${escapeHtml(potentialInitials(item.name))}</span>
        <div class="potential-person"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(circleLabels.slice(0, 3).join(' · ') || (item.ziel === 'partner' ? 'Potenzialpartner' : 'Potenzialkunde'))}</p></div>
        <span class="potential-status" data-status="${escapeHtml(statusKey)}">${escapeHtml(statusLabel)}</span>
      </header>
      <div class="potential-strength-line">
        <span class="potential-strength-badge" data-strength="${strength.key}">${strengthIcon(strength.key)}<strong>${escapeHtml(strength.label)}</strong></span>
        <span class="potential-strength-reason">${escapeHtml(strength.reason)}</span>
      </div>
      <div class="potential-meta">${meta.map((value) => `<span>${escapeHtml(value)}</span>`).join('')}</div>
      <p class="potential-note">${escapeHtml(item.notiz || 'Noch keine Gesprächsnotiz. Ein kurzer Gedanke reicht für den nächsten Schritt.')}</p>
      <div class="potential-card-spacer"></div>
      <div class="potential-next ${due.kind}"><span aria-hidden="true">${due.icon}</span><span>${due.label}</span></div>
      <div class="potential-actions">
        ${isLinked
          ? '<button class="potential-transfer" type="button" data-action="open-cockpit">Kundenakte öffnen</button>'
          : `<button class="potential-contact" type="button" data-action="coach">Gespräch vorbereiten</button>${cockpitAvailable ? cockpitTransferButton() : cockpitLockedButton()}`}
        <button class="potential-more" type="button" data-action="menu" aria-label="Weitere Aktionen" aria-expanded="false">•••</button>
      </div>
      <div class="potential-card-menu" hidden>
        <button type="button" data-action="edit">Bearbeiten</button>
        ${!isLinked ? `<button type="button" data-action="contact">${escapeHtml(contact.label)}</button>` : ''}
        ${isLinked ? '<button type="button" data-action="open-cockpit">Kundenakte im Cockpit öffnen</button>' : (cockpitAvailable ? '<button type="button" data-action="transfer">Mit Cockpit verbinden</button>' : cockpitLockedMenuButton())}
        <button class="danger" type="button" data-action="delete">Kontakt löschen</button>
      </div>
    </article>`;
}

function cockpitTransferButton() {
  return '<button class="potential-transfer" type="button" data-action="transfer">Mit Cockpit verbinden</button>';
}

function cockpitLockedButton() {
  const pending = cockpitAccess === 'locked';
  const badge = pending ? 'Demnächst' : 'Nicht verfügbar';
  const label = pending
    ? 'Cockpit-Verbindung, noch nicht freigeschaltet'
    : 'Cockpit-Verbindung, zurzeit nicht verfügbar';
  const title = pending
    ? 'Sobald dein Cockpit-Zugang freigegeben ist, kannst du diesen Kontakt verbinden.'
    : 'Die Cockpit-Freigabe konnte gerade nicht geprüft werden.';
  return `<button class="potential-transfer cockpit-locked" type="button" disabled aria-label="${label}" title="${title}"><span aria-hidden="true">▣</span><span>Cockpit-Verbindung</span><em>${badge}</em></button>`;
}

function cockpitLockedMenuButton() {
  const label = cockpitAccess === 'locked' ? 'Cockpit-Verbindung · Demnächst' : 'Cockpit-Verbindung · Nicht verfügbar';
  return `<button class="cockpit-menu-locked" type="button" disabled>${label}</button>`;
}

async function handleListAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'new') { openForm(null, button); return; }
  const card = button.closest('[data-id]');
  const item = potentials.find((candidate) => candidate.id === card?.dataset.id);
  if (!item) return;
  if (action === 'menu') {
    const menu = card.querySelector('.potential-card-menu');
    const opening = menu.hidden;
    closeMenus();
    menu.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    return;
  }
  closeMenus();
  if (action === 'edit') openForm(item, button);
  else if (action === 'coach') await openConversationCoach(item, button);
  else if (action === 'contact') await startContact(item);
  else if (action === 'transfer') await openTransfer(item, button);
  else if (action === 'open-cockpit') openCockpitLink(cockpitLinks.get(item.id));
  else if (action === 'delete') await removePotential(item);
}

function openForm(item, trigger) {
  restoreFocusEl = trigger || document.activeElement;
  form.reset();
  clearFormErrors();
  clearDuplicateWarning();
  document.getElementById('voiceReviewNotice').hidden = true;
  document.getElementById('potentialId').value = item?.id || '';
  document.getElementById('potentialName').value = item?.name || '';
  document.getElementById('potentialPhone').value = item?.telefon ? formatPotentialPhone(item.telefon) : '';
  document.getElementById('potentialEmail').value = item?.email || '';
  document.getElementById('potentialGoal').value = item?.ziel || 'kunde';
  document.getElementById('potentialCircle').value = item?.kreis || '';
  const selectedCircles = new Set(potentialCircleKeys(item || {}));
  form.querySelectorAll('input[name="kreise"]').forEach((checkbox) => { checkbox.checked = selectedCircles.has(checkbox.value); });
  document.getElementById('potentialRelationship').value = item?.beziehungsnaehe || 'bekannt';
  document.getElementById('potentialFrequency').value = item?.kontakthaeufigkeit || 'selten';
  document.getElementById('potentialStrengthOverride').value = item?.kontaktstaerke_override || '';
  document.getElementById('potentialDirect').checked = Boolean(item?.direkt_erreichbar);
  document.getElementById('potentialStatus').value = item?.status || 'offen';
  document.getElementById('potentialNextContact').value = item?.naechster_kontakt_am || '';
  document.getElementById('potentialNote').value = item?.notiz || '';
  writeContactProfile(item?.kontaktbild || {});
  setText('potentialDialogEyebrow', item ? 'Potenzial bearbeiten' : 'Neues Potenzial');
  setText('potentialDialogTitle', item ? item.name : 'Kontakt eintragen');
  setText('savePotentialBtn', item ? 'Änderungen speichern' : 'Kontakt speichern');
  updateStrengthPreview();
  modal.hidden = false;
  document.body.classList.add('potential-modal-open');
  requestAnimationFrame(() => document.getElementById('potentialName').focus());
}

function closeForm() {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('potential-modal-open');
  restoreFocusEl?.focus?.();
}

async function saveForm(event) {
  event.preventDefault();
  clearFormErrors();
  const id = document.getElementById('potentialId').value;
  const existing = potentials.find((item) => item.id === id) || null;
  const payload = readForm();
  if (!validate(payload)) return;

  const duplicate = findPotentialDuplicate(potentials, payload, id);
  if (duplicate && !duplicateConfirm.checked) {
    duplicateWarning.hidden = false;
    setText('duplicateText', `${duplicate.name} hat bereits passende Kontaktdaten im Potenzialbuch. Prüfe den Eintrag oder bestätige bewusst, dass es sich um einen anderen Kontakt handelt.`);
    duplicateWarning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  if (payload.status !== 'uebernommen' && existing?.status === 'uebernommen') payload.cockpit_uebernommen_at = null;
  if (payload.status === 'uebernommen' && existing?.status !== 'uebernommen') {
    showFormError('Die Cockpit-Übernahme muss über die Kontrollansicht bestätigt werden.');
    return;
  }
  if (existing && existing.status !== payload.status && ['angesprochen', 'im_gespraech', 'termin'].includes(payload.status)) {
    payload.zuletzt_angesprochen_at = new Date().toISOString();
  }

  setFormBusy(true);
  const result = existing
    ? await storeUpdate(existing.id, payload)
    : await storeCreate(payload);
  setFormBusy(false);
  if (result.error) {
    console.error('[potenziale:save]', result.error);
    showFormError('Der Kontakt konnte nicht gespeichert werden. Deine Eingaben bleiben im Formular erhalten.');
    return;
  }
  if (existing) potentials = potentials.map((item) => item.id === existing.id ? result.data : item);
  else potentials = [result.data, ...potentials];
  closeForm();
  render();
  showToast(existing ? 'Änderungen gespeichert.' : `${result.data.name} ist jetzt im Potenzialbuch.`);
}

function readForm() {
  const phone = cleanPotentialText(document.getElementById('potentialPhone').value);
  const kontaktbild = readContactProfile();
  const payload = {
    name: cleanPotentialText(document.getElementById('potentialName').value),
    telefon: phone ? formatPotentialPhone(phone) : null,
    email: cleanPotentialText(document.getElementById('potentialEmail').value).toLowerCase() || null,
    ziel: document.getElementById('potentialGoal').value === 'partner' ? 'partner' : 'kunde',
    kreis: cleanPotentialText(document.getElementById('potentialCircle').value) || null,
    kreise: [...form.querySelectorAll('input[name="kreise"]:checked')].map((checkbox) => checkbox.value),
    beziehungsnaehe: document.getElementById('potentialRelationship').value,
    kontakthaeufigkeit: document.getElementById('potentialFrequency').value,
    direkt_erreichbar: document.getElementById('potentialDirect').checked,
    kontaktstaerke_override: document.getElementById('potentialStrengthOverride').value || null,
    status: STATUS_LABELS[document.getElementById('potentialStatus').value] ? document.getElementById('potentialStatus').value : 'offen',
    naechster_kontakt_am: document.getElementById('potentialNextContact').value || null,
    notiz: cleanPotentialText(document.getElementById('potentialNote').value) || null,
    kontaktbild,
  };
  payload.kontaktbild_aktualisiert_at = Object.values(kontaktbild).some((value) => Array.isArray(value) ? value.length : Boolean(value))
    ? new Date().toISOString()
    : null;
  return payload;
}

function readContactProfile() {
  return {
    kontaktziel: cleanPotentialText(document.getElementById('potentialContactGoal').value),
    gemeinsameGeschichte: cleanPotentialText(document.getElementById('potentialSharedHistory').value),
    lebenssituation: cleanCoachLines(document.getElementById('potentialLifeSituation').value),
    interessen: cleanCoachLines(document.getElementById('potentialInterests').value),
    sichereFakten: cleanCoachLines(document.getElementById('potentialFacts').value),
    vermutungen: cleanCoachLines(document.getElementById('potentialAssumptions').value),
    unsicherheit: cleanPotentialText(document.getElementById('potentialUncertainty').value),
  };
}

function writeContactProfile(profile = {}) {
  document.getElementById('potentialContactGoal').value = cleanPotentialText(profile.kontaktziel || '');
  document.getElementById('potentialSharedHistory').value = cleanPotentialText(profile.gemeinsameGeschichte || '');
  document.getElementById('potentialLifeSituation').value = coachLinesText(profile.lebenssituation);
  document.getElementById('potentialInterests').value = coachLinesText(profile.interessen);
  document.getElementById('potentialFacts').value = coachLinesText(profile.sichereFakten);
  document.getElementById('potentialAssumptions').value = coachLinesText(profile.vermutungen);
  document.getElementById('potentialUncertainty').value = cleanPotentialText(profile.unsicherheit || '');
}

function validate(payload) {
  let valid = true;
  if (payload.name.length < 2) {
    showFieldError('potentialName', 'nameError', 'Bitte trage mindestens zwei Zeichen ein.');
    valid = false;
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    showFieldError('potentialEmail', 'emailError', 'Bitte prüfe die E-Mail-Adresse.');
    valid = false;
  }
  if (payload.telefon && potentialPhoneDigits(payload.telefon).length < 7) {
    showFieldError('potentialPhone', 'phoneError', 'Bitte prüfe die Telefonnummer.');
    valid = false;
  }
  return valid;
}

async function startContact(item) {
  const contact = primaryContact(item);
  if (contact.type === 'edit') { openForm(item); return; }
  if (contact.href) window.open(contact.href, '_blank', 'noopener,noreferrer');
  const updates = { zuletzt_angesprochen_at: new Date().toISOString() };
  if (item.status === 'offen') updates.status = 'angesprochen';
  const { data, error } = await storeUpdate(item.id, updates);
  if (error) {
    console.warn('[potenziale:contact]', error);
    showToast('Kontakt geöffnet. Der Status konnte jedoch nicht aktualisiert werden.');
    return;
  }
  potentials = potentials.map((candidate) => candidate.id === item.id ? data : candidate);
  render();
  showToast(`${item.name} ist als angesprochen vorgemerkt.`);
}

function openVoiceContact(trigger) {
  coachMode = 'contact';
  coachTarget = null;
  coachAfterProposal = null;
  restoreFocusEl = trigger || document.activeElement;
  setText('coachEyebrow', 'Neuer Kontakt per Sprache');
  setText('coachTitle', 'Erzähl einfach, was du weißt');
  setText('coachIntro', 'Name, Beziehung, gemeinsame Geschichte, Lebenssituation und dein Ziel. Du musst keine Reihenfolge einhalten.');
  document.getElementById('coachVoiceText').value = '';
  document.getElementById('coachError').hidden = true;
  showCoachScreen('capture');
  coachModal.hidden = false;
  document.body.classList.add('potential-modal-open');
  requestAnimationFrame(() => document.getElementById('coachRecordBtn')?.focus());
}

async function openConversationCoach(item, trigger) {
  if (cockpitLinks.has(item.id)) { openCockpitLink(cockpitLinks.get(item.id)); return; }
  coachMode = 'conversation';
  coachTarget = item;
  coachAfterProposal = null;
  restoreFocusEl = trigger || document.activeElement;
  setText('coachEyebrow', 'Gesprächskompass');
  setText('coachTitle', `Gespräch mit ${item.name}`);
  setText('coachIntro', 'Ein persönlicher Einstieg und offene Fragen. Kein Skript zum Ablesen.');
  document.getElementById('coachAfterText').value = '';
  document.getElementById('coachCompassError').hidden = true;
  coachModal.hidden = false;
  document.body.classList.add('potential-modal-open');
  if (item.gespraechsvorbereitung?.einstieg) {
    renderCompass(item.gespraechsvorbereitung, item);
    showCoachScreen('compass');
    return;
  }
  showCoachScreen('compass');
  document.getElementById('coachContactSummary').textContent = `Für ${item.name} wird ein persönlicher Gesprächskompass erstellt …`;
  document.getElementById('coachOpener').textContent = '';
  document.getElementById('coachQuestions').innerHTML = '';
  document.getElementById('coachWarnings').innerHTML = '';
  document.getElementById('coachNextStep').textContent = '';
  await generateCompass(item);
}

function closeCoach() {
  if (coachModal.hidden) return;
  activeRecorder?.cancel();
  activeRecorder = null;
  activeRecordButton = null;
  coachModal.hidden = true;
  coachTarget = null;
  coachAfterProposal = null;
  document.body.classList.remove('potential-modal-open');
  restoreFocusEl?.focus?.();
}

function showCoachScreen(screen) {
  document.getElementById('coachCapture').hidden = screen !== 'capture';
  document.getElementById('coachCompass').hidden = screen !== 'compass';
  document.getElementById('coachAfter').hidden = screen !== 'after';
  document.getElementById('coachAfterReview').hidden = screen !== 'after-review';
}

async function toggleRecording(buttonId, stateId, textareaId) {
  const button = document.getElementById(buttonId);
  const state = document.getElementById(stateId);
  const textarea = document.getElementById(textareaId);
  if (activeRecorder && activeRecordButton === button) {
    button.disabled = true;
    state.textContent = 'Aufnahme wird umgewandelt …';
    try {
      const { blob, mimeType } = await activeRecorder.stop();
      const audioBase64 = await blobToBase64(blob);
      const result = await runCoach('transcribe', { audioBase64, mimeType });
      if (!result.ok) throw new Error(result.reason || 'transcription_failed');
      textarea.value = [textarea.value.trim(), result.text].filter(Boolean).join('\n');
      state.textContent = 'Aufnahme umgewandelt. Text bitte prüfen.';
    } catch (error) {
      state.textContent = error.message === 'audio_too_large'
        ? 'Die Aufnahme war zu lang. Bitte kürzer einsprechen.'
        : 'Die Aufnahme konnte nicht umgewandelt werden. Du kannst den Text eintippen.';
    } finally {
      button.disabled = false;
      button.classList.remove('recording');
      button.querySelector('strong').textContent = buttonId === 'coachAfterRecordBtn' ? 'Ergebnis einsprechen' : 'Aufnahme starten';
      activeRecorder = null;
      activeRecordButton = null;
    }
    return;
  }
  activeRecorder?.cancel();
  try {
    activeRecorder = new PotentialVoiceRecorder();
    await activeRecorder.start();
    activeRecordButton = button;
    button.classList.add('recording');
    button.querySelector('strong').textContent = 'Aufnahme beenden';
    state.textContent = 'Aufnahme läuft. Sprich frei und ohne feste Reihenfolge.';
  } catch (_) {
    activeRecorder = null;
    state.textContent = 'Kein Mikrofonzugriff. Du kannst die Beschreibung eintippen.';
  }
}

async function analyzeVoiceContact() {
  const text = cleanPotentialText(document.getElementById('coachVoiceText').value);
  const error = document.getElementById('coachError');
  error.hidden = true;
  if (text.length < 10) { error.textContent = 'Bitte beschreibe den Kontakt mit mindestens einem vollständigen Satz.'; error.hidden = false; return; }
  setCoachButtonBusy('coachAnalyzeBtn', true, 'Wird geordnet …');
  const result = await runCoach('kontaktbild', { text });
  setCoachButtonBusy('coachAnalyzeBtn', false, 'Auswerten und prüfen');
  if (!result.ok) { error.textContent = coachErrorText(result.reason); error.hidden = false; return; }
  const data = result.data || {};
  closeCoach();
  openForm(null, restoreFocusEl);
  applyContactExtraction(data);
  document.getElementById('voiceReviewNotice').hidden = false;
  document.getElementById('potentialName').focus();
}

function applyContactExtraction(data) {
  document.getElementById('potentialName').value = cleanPotentialText(data.name || '');
  document.getElementById('potentialPhone').value = data.telefon ? formatPotentialPhone(data.telefon) : '';
  document.getElementById('potentialEmail').value = cleanPotentialText(data.email || '').toLowerCase();
  document.getElementById('potentialGoal').value = data.ziel === 'partner' ? 'partner' : 'kunde';
  document.getElementById('potentialCircle').value = cleanPotentialText(data.eigenerKreis || '');
  const circles = new Set(Array.isArray(data.kreise) ? data.kreise : []);
  form.querySelectorAll('input[name="kreise"]').forEach((checkbox) => { checkbox.checked = circles.has(checkbox.value); });
  document.getElementById('potentialRelationship').value = ['fluechtig','bekannt','gut_bekannt','eng_vertraut'].includes(data.beziehungsnaehe) ? data.beziehungsnaehe : 'bekannt';
  document.getElementById('potentialFrequency').value = ['kein_kontakt','selten','gelegentlich','regelmaessig'].includes(data.kontakthaeufigkeit) ? data.kontakthaeufigkeit : 'selten';
  document.getElementById('potentialDirect').checked = Boolean(data.direktErreichbar);
  document.getElementById('potentialNote').value = cleanPotentialText(data.notizVorschlag || '');
  writeContactProfile({
    kontaktziel: data.kontaktziel,
    gemeinsameGeschichte: data.gemeinsameGeschichte,
    lebenssituation: data.lebenssituation,
    interessen: data.interessen,
    sichereFakten: data.sichereFakten,
    vermutungen: data.vermutungen,
    unsicherheit: data.unsicherheit,
  });
  updateStrengthPreview();
}

async function generateCompass(item) {
  const error = document.getElementById('coachCompassError');
  error.hidden = true;
  const result = await runCoach('gespraech', { data: conversationContext(item) });
  if (!result.ok) { error.textContent = coachErrorText(result.reason); error.hidden = false; return; }
  const preparation = result.data || {};
  renderCompass(preparation, item);
  const saved = await storeUpdate(item.id, { gespraechsvorbereitung: preparation, gespraechsvorbereitung_at: new Date().toISOString() });
  if (!saved.error) {
    potentials = potentials.map((candidate) => candidate.id === item.id ? saved.data : candidate);
    coachTarget = saved.data;
  }
}

function conversationContext(item) {
  return {
    name: item.name,
    ziel: item.ziel,
    kreise: potentialCircleLabels(item),
    beziehungsnaehe: item.beziehungsnaehe,
    kontakthaeufigkeit: item.kontakthaeufigkeit,
    bisherigeNotiz: item.notiz || '',
    bestaetigtesKontaktbild: item.kontaktbild || {},
  };
}

function renderCompass(preparation, item) {
  const strength = potentialContactStrength(item);
  document.getElementById('coachContactSummary').textContent = `${item.name} · ${strength.label} · ${preparation.ton || 'natürlich und offen'}`;
  document.getElementById('coachOpener').textContent = preparation.einstieg || '';
  document.getElementById('coachQuestions').innerHTML = renderCoachList(preparation.fragen, 'Noch keine Fragen vorbereitet.');
  document.getElementById('coachWarnings').innerHTML = renderCoachList(preparation.nichtVorschnell, 'Keine besonderen Hinweise.');
  document.getElementById('coachNextStep').textContent = preparation.naechsterSchritt || '';
  const contact = primaryContact(item);
  document.getElementById('coachCallBtn').textContent = contact.type === 'edit' ? 'Kontaktdaten ergänzen' : contact.label;
}

function renderCoachList(items, empty) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return (values.length ? values : [empty]).map((value) => `<li>${escapeHtml(value)}</li>`).join('');
}

async function callFromCoach() {
  if (!coachTarget) return;
  await startContact(coachTarget);
  coachTarget = potentials.find((item) => item.id === coachTarget.id) || coachTarget;
  showCoachScreen('after');
}

async function analyzeAfterCall() {
  const text = cleanPotentialText(document.getElementById('coachAfterText').value);
  const error = document.getElementById('coachAfterError');
  error.hidden = true;
  if (text.length < 5) { error.textContent = 'Bitte trage kurz ein, was im Gespräch herauskam.'; error.hidden = false; return; }
  setCoachButtonBusy('coachAfterAnalyzeBtn', true, 'Wird geordnet …');
  const result = await runCoach('nachbereitung', { text, data: conversationContext(coachTarget) });
  setCoachButtonBusy('coachAfterAnalyzeBtn', false, 'Auswerten und prüfen');
  if (!result.ok) { error.textContent = coachErrorText(result.reason); error.hidden = false; return; }
  coachAfterProposal = result.data || {};
  document.getElementById('coachAfterSummary').textContent = coachAfterProposal.kurzfassung || '';
  document.getElementById('coachAfterStatus').value = STATUS_LABELS[coachAfterProposal.status] && coachAfterProposal.status !== 'uebernommen' ? coachAfterProposal.status : 'angesprochen';
  document.getElementById('coachAfterDate').value = addDaysIso(coachAfterProposal.naechsterKontaktTage || 0);
  document.getElementById('coachAfterNote').value = cleanPotentialText(coachAfterProposal.notizErgaenzung || '');
  document.getElementById('coachAfterReviewError').hidden = true;
  showCoachScreen('after-review');
}

async function saveAfterCall() {
  if (!coachTarget || !coachAfterProposal) return;
  const noteAddition = cleanPotentialText(document.getElementById('coachAfterNote').value);
  const status = document.getElementById('coachAfterStatus').value;
  const date = document.getElementById('coachAfterDate').value || null;
  const datedNote = noteAddition ? `${new Date().toLocaleDateString('de-DE')}: ${noteAddition}` : '';
  const updates = {
    status: STATUS_LABELS[status] && status !== 'uebernommen' ? status : 'angesprochen',
    naechster_kontakt_am: date,
    zuletzt_angesprochen_at: new Date().toISOString(),
    notiz: [coachTarget.notiz, datedNote].filter(Boolean).join('\n\n').slice(0, 4000) || null,
  };
  setCoachButtonBusy('coachAfterSaveBtn', true, 'Wird gespeichert …');
  const result = await storeUpdate(coachTarget.id, updates);
  setCoachButtonBusy('coachAfterSaveBtn', false, 'Ergebnis übernehmen');
  if (result.error) {
    const error = document.getElementById('coachAfterReviewError');
    error.textContent = 'Das Ergebnis konnte nicht gespeichert werden. Deine Angaben bleiben geöffnet.';
    error.hidden = false;
    return;
  }
  potentials = potentials.map((item) => item.id === coachTarget.id ? result.data : item);
  const name = coachTarget.name;
  closeCoach();
  render();
  showToast(`Gespräch mit ${name} ist nachgetragen.`);
}

async function runCoach(action, payload) {
  if (!PREVIEW_MODE) return coachRequest(fetch, accessToken, action, payload);
  if (action === 'transcribe') return { ok: true, text: 'Martin kenne ich vom Fußball. Wir hatten länger keinen Kontakt. Er hat vor zwei Jahren gebaut, ist verheiratet und hat zwei Kinder. Ich möchte natürlich wieder ins Gespräch kommen.' };
  if (action === 'kontaktbild') return { ok: true, data: previewKontaktbild() };
  if (action === 'gespraech') return { ok: true, data: previewCompass(payload.data || {}) };
  if (action === 'nachbereitung') return { ok: true, data: { kurzfassung:'Das Haus ist fertig. Ein weiterer Austausch zur Familienabsicherung ist vereinbart.',bestaetigteFakten:['Das Haus ist fertig'],verworfeneVermutungen:['Finanzierung ist aktuell kein Thema'],notizErgaenzung:'Haus fertig. Finanzierung soll unverändert bleiben. Nächster Austausch zur Familienabsicherung vereinbart.',status:'im_gespraech',naechsterKontaktTage:7 } };
  return { ok: false, reason: 'invalid_action' };
}

function previewKontaktbild() {
  return { name:'Martin Beispiel',telefon:'0172 5550199',email:'',ziel:'kunde',kreise:['verein_hobby','fluechtige_bekanntschaft'],eigenerKreis:'',beziehungsnaehe:'bekannt',kontakthaeufigkeit:'selten',direktErreichbar:true,kontaktziel:'Kontakt natürlich auffrischen und offen hören, was gerade wichtig ist.',gemeinsameGeschichte:'Aus dem Fußballverein. Seit längerer Zeit kein persönlicher Austausch.',lebenssituation:['Verheiratet','Zwei Kinder','Hat vor etwa zwei Jahren ein Haus gebaut'],interessen:['Fußball'],sichereFakten:['Kennt Kai aus dem Fußballverein','Ist verheiratet und hat zwei Kinder','Hat vor etwa zwei Jahren gebaut'],vermutungen:['Finanzierung könnte noch ein Thema sein','Familienabsicherung könnte relevant sein'],unsicherheit:'Nach längerer Pause natürlich wieder Kontakt aufnehmen, ohne Verkaufsgefühl.',notizVorschlag:'Aus dem Fußballverein. Kontakt nach längerer Pause persönlich auffrischen.' };
}

function previewCompass(context = {}) {
  const name = cleanPotentialText(context.name || 'Martin').split(' ')[0];
  const tennis = /tennis/i.test(context.bisherigeNotiz || '');
  const connection = tennis ? 'unser Tennisspielen' : 'unsere gemeinsame Zeit';
  return { ziel:'Kontakt persönlich auffrischen',ton:'vertraut, ruhig und ohne Verkaufsdruck',einstieg:`Hallo ${name}, ich musste letztens an ${connection} denken und wollte einfach mal hören, wie es dir geht. Was ist bei dir gerade los?`,fragen:['Was hat sich bei dir in letzter Zeit am meisten verändert?','Was beschäftigt dich im Moment besonders?','Gibt es gerade etwas, bei dem du gern mehr Klarheit hättest?'],nichtVorschnell:['Finanzierung oder Absicherung erst ansprechen, wenn die Person selbst einen Bezug herstellt.'],naechsterSchritt:'Bei echtem Interesse einen ruhigen zweiten Termin vereinbaren.' };
}

function setCoachButtonBusy(id, busy, label) {
  const button = document.getElementById(id);
  button.disabled = busy;
  button.textContent = label;
}

function coachErrorText(reason) {
  if (reason === 'coach_not_configured') return 'Der Kontakt-Coach ist noch nicht freigeschaltet.';
  if (reason === 'login_required') return 'Bitte melde dich erneut an.';
  return 'Der Kontakt-Coach ist gerade nicht erreichbar. Deine Eingabe bleibt erhalten.';
}

async function openTransfer(item, trigger) {
  transferTarget = item;
  connectedClientLink = null;
  restoreFocusEl = trigger || document.activeElement;
  transferError.hidden = true;
  transferLoading.hidden = false;
  transferChoices.hidden = true;
  transferChoices.innerHTML = '';
  transferSuccess.hidden = true;
  document.getElementById('transferPreview').innerHTML = transferPreview(item);
  transferModal.hidden = false;
  document.body.classList.add('potential-modal-open');
  requestAnimationFrame(() => transferModal.querySelector('[data-close-transfer]')?.focus());

  if (item.ziel === 'partner') {
    transferLoading.hidden = true;
    showTransferError(cockpitFehlertext('partner_uses_partner_record'));
    return;
  }

  if (PREVIEW_MODE) {
    transferLoading.hidden = true;
    renderTransferChoices([
      { id: '11111111-1111-4111-8111-111111111111', name: item.name, relationshipLabel: 'Interessent', matchedBy: ['telefon', 'email'] },
    ], true);
    return;
  }

  const result = await cockpitRequest(fetch, accessToken, { action: 'vorschau', potentialId: item.id });
  if (transferTarget?.id !== item.id) return;
  transferLoading.hidden = true;
  if (!result.ok) {
    showTransferError(cockpitFehlertext(result.reason));
    return;
  }
  renderTransferChoices(result.candidates || [], result.canCreate !== false);
}

function closeTransfer() {
  if (transferModal.hidden) return;
  transferModal.hidden = true;
  transferTarget = null;
  connectedClientLink = null;
  document.body.classList.remove('potential-modal-open');
  restoreFocusEl?.focus?.();
}

function highlightRequestedPotential() {
  const requestedId = new URLSearchParams(window.location.search).get('potenzial');
  if (!requestedId || !potentials.some((item) => item.id === requestedId)) return;
  const card = [...listEl.querySelectorAll('[data-id]')].find((item) => item.dataset.id === requestedId);
  if (!card) return;
  card.classList.add('deep-linked');
  card.setAttribute('tabindex', '-1');
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.focus({ preventScroll: true });
}

function renderTransferChoices(candidates, canCreate) {
  const hasCandidates = candidates.length > 0;
  const candidateHtml = candidates.map((candidate) => {
    const trefferdetails = (candidate.matchedBy || []).map((value) => value === 'telefon' ? 'Telefonnummer' : 'E-Mail').join(' und ');
    return `<button class="potential-transfer-choice" type="button" data-connect-mode="existing" data-client-id="${escapeHtml(candidate.id)}">
      <span class="potential-transfer-choice-icon">✓</span>
      <span><strong>Vorhandene Akte von ${escapeHtml(candidate.name)} nutzen</strong><small>${escapeHtml(trefferdetails || 'Kontaktangaben')} stimmen überein · ${escapeHtml(candidate.relationshipLabel || 'Interessent')}</small></span>
      <em>Empfohlen</em>
    </button>`;
  }).join('');
  const createHtml = canCreate ? `<button class="potential-transfer-choice new" type="button" data-connect-mode="new" data-confirm-new="${hasCandidates ? 'true' : 'false'}">
    <span class="potential-transfer-choice-icon">＋</span>
    <span><strong>Neue Interessentenakte anlegen</strong><small>${hasCandidates ? 'Nur wählen, wenn die gefundene Person nicht dieselbe ist.' : 'Im Cockpit wurde keine Person mit gleicher Telefonnummer oder E-Mail gefunden.'}</small></span>
  </button>` : '';

  transferChoices.innerHTML = `
    <h3 class="potential-transfer-question">${hasCandidates ? 'Das Cockpit hat eine passende Person gefunden:' : 'Wie soll es weitergehen?'}</h3>
    ${candidateHtml}${createHtml}
    <p class="potential-transfer-note">Das System verbindet niemals allein aufgrund eines Namens. Die feste Beraterzuordnung kann im Browser nicht verändert werden.</p>`;
  transferChoices.hidden = false;
}

async function handleTransferChoice(event) {
  const button = event.target.closest('[data-connect-mode]');
  if (!button || !transferTarget) return;
  transferError.hidden = true;
  transferChoices.querySelectorAll('button').forEach((item) => { item.disabled = true; });
  const mode = button.dataset.connectMode;
  const clientId = button.dataset.clientId || undefined;
  const confirmNew = button.dataset.confirmNew === 'true';

  let result;
  if (PREVIEW_MODE) {
    result = {
      ok: true,
      clientId: clientId || '22222222-2222-4222-8222-222222222222',
      clientPath: `/clients/${clientId || '22222222-2222-4222-8222-222222222222'}`,
      relationshipStage: 'interessent',
      relationshipLabel: 'Interessent',
      stageChangedAt: new Date().toISOString(),
    };
  } else {
    result = await cockpitRequest(fetch, accessToken, {
      action: 'verbinden',
      potentialId: transferTarget.id,
      mode,
      clientId,
      confirmNew,
    });
  }

  if (!result.ok) {
    showTransferError(cockpitFehlertext(result.reason));
    transferChoices.querySelectorAll('button').forEach((item) => { item.disabled = false; });
    return;
  }

  const now = new Date().toISOString();
  connectedClientLink = {
    potentialId: transferTarget.id,
    clientId: result.clientId,
    clientPath: result.clientPath,
    cockpitBaseUrl: result.cockpitBaseUrl,
    relationshipStage: result.relationshipStage,
    relationshipLabel: result.relationshipLabel || 'Interessent',
    linkedAt: now,
    stageChangedAt: result.stageChangedAt || now,
  };
  cockpitLinks.set(transferTarget.id, connectedClientLink);

  const updates = { status: 'uebernommen', cockpit_uebernommen_at: now };
  const { data, error } = await storeUpdate(transferTarget.id, updates);
  if (!error && data) potentials = potentials.map((item) => item.id === transferTarget.id ? data : item);

  transferChoices.hidden = true;
  transferSuccess.hidden = false;
  render();
  showToast(`${transferTarget.name} ist jetzt fest mit dem Cockpit verbunden.`);
}

function openConnectedClient() {
  openCockpitLink(connectedClientLink);
}

function openCockpitLink(link) {
  if (!link) return;
  window.open(cockpitClientUrl(link), '_blank', 'noopener,noreferrer');
}

async function removePotential(item) {
  const confirmed = window.confirm(`„${item.name}“ wirklich aus dem Potenzialbuch löschen? Dieser Eintrag kann danach nicht wiederhergestellt werden.`);
  if (!confirmed) return;
  const { error } = await storeDelete(item.id);
  if (error) {
    console.error('[potenziale:delete]', error);
    showToast('Der Kontakt konnte nicht gelöscht werden.');
    return;
  }
  potentials = potentials.filter((candidate) => candidate.id !== item.id);
  render();
  showToast(`${item.name} wurde aus dem Potenzialbuch entfernt.`);
}

function transferPreview(item) {
  const strength = potentialContactStrength(item);
  const fields = [
    ['Name', item.name, ''],
    ['Ziel', item.ziel === 'partner' ? 'Potenzialpartner' : 'Interessent', ''],
    ['Telefon', item.telefon ? formatPotentialPhone(item.telefon) : 'Nicht hinterlegt', ''],
    ['E-Mail', item.email || 'Nicht hinterlegt', ''],
    ['Kreise', potentialCircleLabels(item).join(', ') || 'Nicht hinterlegt', ''],
    ['Kontaktstärke', `${strength.label} · ${strength.reason}`, ''],
    ['Notiz', item.notiz || 'Keine Notiz vorhanden', 'wide'],
  ];
  return fields.map(([label, value, cls]) => `<div class="potential-transfer-item ${cls}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function primaryContact(item) {
  const digits = potentialPhoneDigits(item.telefon);
  if (/^49(?:15|16|17)/.test(digits)) return { type: 'whatsapp', label: 'Per WhatsApp ansprechen', href: `https://wa.me/${digits}` };
  if (digits) return { type: 'phone', label: 'Jetzt anrufen', href: `tel:+${digits}` };
  if (item.email) return { type: 'email', label: 'E-Mail schreiben', href: `mailto:${encodeURIComponent(item.email)}` };
  return { type: 'edit', label: 'Kontaktdaten ergänzen', href: '' };
}

function strengthIcon(key) {
  const icon = POTENTIAL_STRENGTHS[key]?.icon || 'snowflake';
  const paths = {
    snowflake: '<path d="M12 2v20M4.2 6.5l15.6 9M4.2 17.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
    'cloud-sun': '<path d="M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4M16 9a4 4 0 0 0-7.5 2A4 4 0 1 0 6 19h10a4 4 0 0 0 0-8Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    flame: '<path d="M12 22c4.4 0 8-3.2 8-8 0-3-1.4-5.6-4.2-8.2.1 2-1 3.5-2.2 4.2.2-3.2-1.6-6-4.4-8C9.4 5.1 7 7.2 5.8 9.4 4.7 11.2 4 12.8 4 15a8 8 0 0 0 8 7Z"/><path d="M9.5 17.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0-1.2-.6-2.3-1.8-3.5 0 1-.5 1.5-1.1 1.9-.2-1.3-.9-2.4-2-3.2.1 1.7-.1 3-.1 4.8Z"/>',
    'flame-spark': '<path d="M11 22c4.1 0 7-3 7-7.2 0-2.7-1.2-4.9-3.6-7.2.1 1.8-.8 3.1-1.9 3.7.2-2.8-1.4-5.3-3.8-7.1.2 2.8-2.4 4.7-3.4 6.6A8 8 0 0 0 4 15a7 7 0 0 0 7 7Z"/><path d="M19 2v4M17 4h4M20 8v2M19 9h2"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[icon]}</svg>`;
}

function updateCircleFilterCount() {
  const element = document.getElementById('potentialCircleFilterCount');
  if (!element) return;
  if (!activeCircleFilters.size) element.textContent = 'Alle';
  else if (activeCircleFilters.size === 1) {
    const key = [...activeCircleFilters][0];
    element.textContent = POTENTIAL_CIRCLES.find(([value]) => value === key)?.[1] || '1 Kreis';
  } else element.textContent = `${activeCircleFilters.size} Kreise`;
}

function updateStrengthPreview() {
  const element = document.getElementById('potentialStrengthPreview');
  if (!element) return;
  const strength = potentialContactStrength(readForm());
  element.innerHTML = `
    <span class="potential-strength-badge" data-strength="${strength.key}">${strengthIcon(strength.key)}<strong>${escapeHtml(strength.label)}</strong></span>
    <span><strong>${strength.overridden ? 'Manuell festgelegt' : 'Automatisch berechnet'}</strong><small>${escapeHtml(strength.reason)}. Die Einstufung beschreibt eure Beziehungsstärke, nicht das Kaufinteresse.</small></span>`;
}

function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = String(value); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }

function setLoading() {
  listEl.innerHTML = '<div class="potential-loading"><span></span><span></span><span></span></div>';
}
function showLoadError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  listEl.innerHTML = '<div class="potential-empty"><div><span class="potential-empty-mark">!</span><h3>Potenzialbuch gerade nicht verfügbar</h3><p>Es wurden keine fremden oder unvollständigen Daten angezeigt.</p></div></div>';
}
function showFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  input.closest('.potential-field')?.classList.add('invalid');
  setText(errorId, message);
  input.focus();
}
function clearFormErrors() {
  form.querySelectorAll('.potential-field').forEach((field) => field.classList.remove('invalid'));
  form.querySelectorAll('.potential-field-error').forEach((element) => { element.textContent = ''; });
  formError.hidden = true;
}
function clearDuplicateWarning() {
  duplicateWarning.hidden = true;
  duplicateConfirm.checked = false;
}
function handleFormChange(event) {
  if (event.target === duplicateConfirm) return;
  clearDuplicateWarning();
  updateStrengthPreview();
}
function showFormError(message) { formError.textContent = message; formError.hidden = false; }
function showTransferError(message) {
  transferLoading.hidden = true;
  transferChoices.hidden = true;
  transferSuccess.hidden = true;
  transferError.textContent = message;
  transferError.hidden = false;
}
function setFormBusy(busy) {
  document.getElementById('savePotentialBtn').disabled = busy;
  document.getElementById('savePotentialBtn').textContent = busy ? 'Wird gespeichert …' : (document.getElementById('potentialId').value ? 'Änderungen speichern' : 'Kontakt speichern');
}
function closeMenus() {
  document.querySelectorAll('.potential-card-menu').forEach((menu) => { menu.hidden = true; });
  document.querySelectorAll('.potential-more').forEach((button) => button.setAttribute('aria-expanded', 'false'));
}
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.hidden = false;
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3600);
}

async function storeLoad() {
  if (PREVIEW_MODE) return { data: potentials, error: null };
  return storeApi.getPotenziale(advisor.id);
}

async function storeCreate(fields) {
  if (!PREVIEW_MODE) return storeApi.createPotenzial(advisor.id, fields);
  const now = new Date().toISOString();
  return { data: { ...fields, id: `preview-${Date.now()}`, berater_id: advisor.id, created_at: now, updated_at: now }, error: null };
}

async function storeUpdate(id, fields) {
  if (!PREVIEW_MODE) return storeApi.updatePotenzial(id, advisor.id, fields);
  const current = potentials.find((item) => item.id === id);
  if (!current) return { data: null, error: { message: 'Vorschaukontakt nicht gefunden' } };
  return { data: { ...current, ...fields, updated_at: new Date().toISOString() }, error: null };
}

async function storeDelete(id) {
  if (!PREVIEW_MODE) return storeApi.deletePotenzial(id, advisor.id);
  return { error: potentials.some((item) => item.id === id) ? null : { message: 'Vorschaukontakt nicht gefunden' } };
}

function previewPotentials() {
  const today = potentialStartOfDay();
  const isoDay = (offset) => {
    const value = new Date(today);
    value.setDate(value.getDate() + offset);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const now = new Date().toISOString();
  return [
    { id:'preview-1',berater_id:'preview-berater',name:'Jana Mustermann',telefon:'0151 23456789',email:'jana@example.com',ziel:'kunde',kreis:null,kreise:['schulzeit','verein_hobby','enger_freundeskreis'],beziehungsnaehe:'eng_vertraut',kontakthaeufigkeit:'regelmaessig',direkt_erreichbar:true,kontaktstaerke_override:null,status:'offen',notiz:'Wir kennen uns aus der Schule, spielen gemeinsam Tennis und sind eng befreundet.',naechster_kontakt_am:isoDay(1),zuletzt_angesprochen_at:null,cockpit_uebernommen_at:null,created_at:now,updated_at:now },
    { id:'preview-2',berater_id:'preview-berater',name:'Martin Beispiel',telefon:'0172 5550199',email:null,ziel:'partner',kreis:'Unternehmernetzwerk',kreise:['arbeit_frueher','freunde'],beziehungsnaehe:'gut_bekannt',kontakthaeufigkeit:'gelegentlich',direkt_erreichbar:true,kontaktstaerke_override:null,status:'im_gespraech',notiz:'Früherer Kollege und Freund. Interessiert an einer beruflichen Perspektive.',naechster_kontakt_am:isoDay(5),zuletzt_angesprochen_at:now,cockpit_uebernommen_at:null,created_at:now,updated_at:now },
    { id:'preview-3',berater_id:'preview-berater',name:'Lea Sommer',telefon:null,email:'lea@example.com',ziel:'kunde',kreis:null,kreise:['nachbarschaft'],beziehungsnaehe:'bekannt',kontakthaeufigkeit:'gelegentlich',direkt_erreichbar:true,kontaktstaerke_override:null,status:'termin',notiz:'Wir sprechen uns regelmäßig in der Nachbarschaft.',naechster_kontakt_am:isoDay(3),zuletzt_angesprochen_at:now,cockpit_uebernommen_at:null,created_at:now,updated_at:now },
    { id:'preview-4',berater_id:'preview-berater',name:'Tobias Winter',telefon:'0355 123456',email:null,ziel:'kunde',kreis:null,kreise:['schulzeit'],beziehungsnaehe:'bekannt',kontakthaeufigkeit:'selten',direkt_erreichbar:false,kontaktstaerke_override:null,status:'angesprochen',notiz:'Aus der Schulzeit. Wir haben nur selten Kontakt.',naechster_kontakt_am:isoDay(-2),zuletzt_angesprochen_at:now,cockpit_uebernommen_at:null,created_at:now,updated_at:now },
    { id:'preview-5',berater_id:'preview-berater',name:'Anne Beispiel',telefon:'0160 1112233',email:'anne@example.com',ziel:'kunde',kreis:null,kreise:['familie'],beziehungsnaehe:'gut_bekannt',kontakthaeufigkeit:'regelmaessig',direkt_erreichbar:true,kontaktstaerke_override:null,status:'uebernommen',notiz:'Als Interessentin manuell im Cockpit angelegt.',naechster_kontakt_am:null,zuletzt_angesprochen_at:now,cockpit_uebernommen_at:now,created_at:now,updated_at:now },
    { id:'preview-6',berater_id:'preview-berater',name:'Robert Test',telefon:null,email:null,ziel:'partner',kreis:'Tankstelle',kreise:['alltag','fluechtige_bekanntschaft'],beziehungsnaehe:'fluechtig',kontakthaeufigkeit:'selten',direkt_erreichbar:false,kontaktstaerke_override:null,status:'kein_interesse',notiz:'Kurze Gespräche beim Tanken, kein privater Kontaktweg.',naechster_kontakt_am:null,zuletzt_angesprochen_at:now,cockpit_uebernommen_at:null,created_at:now,updated_at:now },
  ];
}
