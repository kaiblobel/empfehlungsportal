/** Phase 168 · Kontaktstärke im privaten Potenzialbuch */
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

const COCKPIT_URL = 'https://www.beratercockpit.de/clients';
const PREVIEW_REQUESTED = new URLSearchParams(window.location.search).get('preview') === 'potenzialbuch';
const PREVIEW_MODE = PREVIEW_REQUESTED && (
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
  || window.location.hostname.includes('git-codex-po-')
);
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
const transferModal = document.getElementById('transferModal');
const form = document.getElementById('potentialForm');
const duplicateWarning = document.getElementById('duplicateWarning');
const duplicateConfirm = document.getElementById('duplicateConfirm');
const formError = document.getElementById('formError');
const transferError = document.getElementById('transferError');
const toastEl = document.getElementById('potentialToast');

let advisor = null;
let dashboardApi = null;
let storeApi = null;
let potentials = [];
let activeFilter = 'alle';
let activeStrengthFilter = 'alle';
const activeCircleFilters = new Set();
let transferTarget = null;
let restoreFocusEl = null;
let toastTimer = null;

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  if (PREVIEW_MODE) { showToast('In der Vorschau ist kein Login aktiv.'); return; }
  dashboardApi ||= await import('./dashboard.js');
  dashboardApi.logout();
});
document.getElementById('newPotentialBtn')?.addEventListener('click', (event) => openForm(null, event.currentTarget));
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
document.getElementById('copyAndOpenBtn')?.addEventListener('click', copyAndOpenCockpit);
document.getElementById('confirmTransferBtn')?.addEventListener('click', confirmTransfer);
listEl?.addEventListener('click', handleListAction);
document.addEventListener('click', (event) => {
  if (!event.target.closest('.potential-card-menu') && !event.target.closest('.potential-more')) closeMenus();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!transferModal.hidden) closeTransfer();
  else if (!modal.hidden) closeForm();
  else closeMenus();
});

document.querySelectorAll('[data-strength-symbol]').forEach((element) => {
  element.innerHTML = strengthIcon(element.dataset.strengthSymbol);
});

(async () => {
  if (PREVIEW_MODE) {
    advisor = { id: 'preview-berater', name: 'Testberater' };
    potentials = previewPotentials();
    setText('hName', 'Testberater');
    const boundary = document.querySelector('.potential-boundary p');
    if (boundary) boundary.innerHTML = '<strong>Vorschau mit erfundenen Kontakten.</strong> Du kannst alles ausprobieren. Nichts wird gespeichert oder an Supabase gesendet.';
    render();
    return;
  }
  dashboardApi = await import('./dashboard.js');
  storeApi = await import('./supabase.js');
  const session = await dashboardApi.requireAuth();
  if (!session) return;
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
  render();
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
  setText('kpiTransferred', potentials.filter((item) => item.status === 'uebernommen').length);
}

function renderCard(item) {
  const due = potentialDueState(item.naechster_kontakt_am);
  const contact = primaryContact(item);
  const strength = potentialContactStrength(item);
  const circleLabels = potentialCircleLabels(item);
  const isTransferred = item.status === 'uebernommen';
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
    <article class="potential-card${due.kind === 'overdue' ? ' overdue' : ''}" data-id="${escapeHtml(item.id)}">
      <header class="potential-card-head">
        <span class="potential-avatar" style="${avatarTone}">${escapeHtml(potentialInitials(item.name))}</span>
        <div class="potential-person"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(circleLabels.slice(0, 3).join(' · ') || (item.ziel === 'partner' ? 'Potenzialpartner' : 'Potenzialkunde'))}</p></div>
        <span class="potential-status" data-status="${escapeHtml(item.status)}">${escapeHtml(STATUS_LABELS[item.status] || item.status)}</span>
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
        ${isTransferred
          ? '<button class="potential-transfer" type="button" data-action="edit">Eintrag ansehen</button>'
          : `<button class="potential-contact" type="button" data-action="contact">${contact.label}</button><button class="potential-transfer" type="button" data-action="transfer">Ins Cockpit</button>`}
        <button class="potential-more" type="button" data-action="menu" aria-label="Weitere Aktionen" aria-expanded="false">•••</button>
      </div>
      <div class="potential-card-menu" hidden>
        <button type="button" data-action="edit">Bearbeiten</button>
        ${isTransferred ? '' : '<button type="button" data-action="transfer">Als Interessent übernehmen</button>'}
        <button class="danger" type="button" data-action="delete">Kontakt löschen</button>
      </div>
    </article>`;
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
  else if (action === 'contact') await startContact(item);
  else if (action === 'transfer') openTransfer(item, button);
  else if (action === 'delete') await removePotential(item);
}

function openForm(item, trigger) {
  restoreFocusEl = trigger || document.activeElement;
  form.reset();
  clearFormErrors();
  clearDuplicateWarning();
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
  return {
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
  };
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

function openTransfer(item, trigger) {
  transferTarget = item;
  restoreFocusEl = trigger || document.activeElement;
  transferError.hidden = true;
  document.getElementById('confirmTransferBtn').disabled = true;
  document.getElementById('copyAndOpenBtn').disabled = false;
  document.getElementById('copyAndOpenBtn').textContent = 'Daten kopieren und Cockpit öffnen';
  document.getElementById('transferPreview').innerHTML = transferPreview(item);
  transferModal.hidden = false;
  document.body.classList.add('potential-modal-open');
  requestAnimationFrame(() => document.getElementById('copyAndOpenBtn').focus());
}

function closeTransfer() {
  if (transferModal.hidden) return;
  transferModal.hidden = true;
  transferTarget = null;
  document.body.classList.remove('potential-modal-open');
  restoreFocusEl?.focus?.();
}

async function copyAndOpenCockpit() {
  if (!transferTarget) return;
  transferError.hidden = true;
  if (!PREVIEW_MODE) window.open(COCKPIT_URL, '_blank', 'noopener,noreferrer');
  const copied = await copyText(transferText(transferTarget));
  if (!copied) {
    showTransferError('Das Kopieren wurde vom Browser verhindert. Das Cockpit wurde geöffnet, die Daten müssen dort bitte manuell eingetragen werden.');
    return;
  }
  document.getElementById('confirmTransferBtn').disabled = false;
  document.getElementById('copyAndOpenBtn').textContent = 'Daten kopiert, Cockpit geöffnet';
  showToast('Kontaktdaten kopiert. Lege den Interessenten jetzt im Cockpit an.');
}

async function confirmTransfer() {
  if (!transferTarget) return;
  const button = document.getElementById('confirmTransferBtn');
  button.disabled = true;
  const updates = {
    status: 'uebernommen',
    cockpit_uebernommen_at: new Date().toISOString(),
  };
  const { data, error } = await storeUpdate(transferTarget.id, updates);
  if (error) {
    console.error('[potenziale:transfer]', error);
    showTransferError('Die Übernahme konnte im Potenzialbuch nicht bestätigt werden. Der Kontakt im Cockpit bleibt davon unberührt.');
    button.disabled = false;
    return;
  }
  potentials = potentials.map((item) => item.id === transferTarget.id ? data : item);
  const name = transferTarget.name;
  closeTransfer();
  render();
  showToast(`${name} wurde als ins Cockpit übernommen markiert.`);
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

function transferText(item) {
  const strength = potentialContactStrength(item);
  return [
    'Neuer Interessent aus dem Potenzialbuch',
    `Name: ${item.name}`,
    `Ziel: ${item.ziel === 'partner' ? 'Potenzialpartner' : 'Potenzialkunde'}`,
    `Telefon: ${item.telefon ? formatPotentialPhone(item.telefon) : 'nicht hinterlegt'}`,
    `E-Mail: ${item.email || 'nicht hinterlegt'}`,
    `Kreise: ${potentialCircleLabels(item).join(', ') || 'nicht hinterlegt'}`,
    `Kontaktstärke: ${strength.label} (${strength.reason})`,
    `Notiz: ${item.notiz || 'keine Notiz'}`,
  ].join('\n');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch (_) { return false; }
  }
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
function showTransferError(message) { transferError.textContent = message; transferError.hidden = false; }
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
