import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { supabase } from './supabase.js';

const EVENT_KEY = 'kidz-sommerfest-2026';
const KIDZ_ADRESSE = 'https://kidz.teamwachsbleiche.de';
const ONSITE_SOURCE = 'flyer';
const SOURCE_LABELS = {
  flyer: 'Vor Ort · Papierzettel',
  'vor-ort-qr': 'Vor Ort · QR-Code',
  'kidz-station': 'KIDZ-Station',
  'berater-einladung': 'Einladung Berater',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  direkt: 'Direkt',
};
const entriesBox = document.getElementById('entries');
const searchInput = document.getElementById('searchInput');
const parentOnly = document.getElementById('parentOnly');
const onsiteOnly = document.getElementById('onsiteOnly');
const advisorFilter = document.getElementById('advisorFilter');
const exportBtn = document.getElementById('exportBtn');
const copyInviteBtn = document.getElementById('copyInviteBtn');
const deleteDialog = document.getElementById('deleteDialog');
const deleteForm = document.getElementById('deleteForm');
const deletePerson = document.getElementById('deletePerson');
const deleteReason = document.getElementById('deleteReason');
const deleteStatus = document.getElementById('deleteStatus');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const onsiteBtn = document.getElementById('onsiteBtn');
const onsiteDialog = document.getElementById('onsiteDialog');
const onsiteForm = document.getElementById('onsiteForm');
const onsiteName = document.getElementById('onsiteName');
const onsiteEmail = document.getElementById('onsiteEmail');
const onsitePhone = document.getElementById('onsitePhone');
const onsiteGuess = document.getElementById('onsiteGuess');
const onsiteBegleitung = document.getElementById('onsiteBegleitung');
const onsiteAdvisor = document.getElementById('onsiteAdvisor');
const onsiteAdvisorLabel = document.getElementById('onsiteAdvisorLabel');
const onsiteAdvisorNote = document.getElementById('onsiteAdvisorNote');
const onsiteParentEvening = document.getElementById('onsiteParentEvening');
const onsiteConsent = document.getElementById('onsiteConsent');
const onsiteStatus = document.getElementById('onsiteStatus');
const onsiteCounter = document.getElementById('onsiteCounter');
const onsiteSaveBtn = document.getElementById('onsiteSaveBtn');
const onsiteCloseBtn = document.getElementById('onsiteCloseBtn');
const onsiteNoContactBtn = document.getElementById('onsiteNoContactBtn');
const guessDialog = document.getElementById('guessDialog');
const guessForm = document.getElementById('guessForm');
const guessPerson = document.getElementById('guessPerson');
const guessValue = document.getElementById('guessValue');
const guessStatus = document.getElementById('guessStatus');
const guessSaveBtn = document.getElementById('guessSaveBtn');
const guessCancelBtn = document.getElementById('guessCancelBtn');
let entries = [];
let currentAdvisor = null;
let selectedParticipantId = '';
let guessParticipantId = '';
const participantFilterChoices = new Map();
const onsiteTally = { saved: 0, duplicate: 0, noContact: 0 };

function sourceLabel(value) {
  return SOURCE_LABELS[String(value || '').toLowerCase()] || String(value || '');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[char]));
}

function formatDate(value) {
  if (!value) return 'Ohne Zeitangabe';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
}

function visibleEntries() {
  const needle = searchInput.value.trim().toLowerCase();
  const participantChoice = participantFilterChoices.get(advisorFilter.value);
  return entries.filter((entry) => {
    if (parentOnly.checked && !entry.elternabend_interesse) return false;
    if (onsiteOnly.checked && entry.source !== ONSITE_SOURCE) return false;
    if (participantChoice?.kind === 'advisor' && entry.berater?.slug !== participantChoice.slug) return false;
    if (participantChoice?.kind === 'promoter' && entry.empfehler?.name !== participantChoice.name) return false;
    if (!needle) return true;
    return [entry.name, entry.email, entry.telefon, entry.reference, entry.source, sourceLabel(entry.source), entry.berater?.name, entry.empfehler?.name]
      .some((value) => String(value || '').toLowerCase().includes(needle));
  });
}

function render() {
  const visible = visibleEntries();
  // Phase 208: Die Kacheln rechnen ohne Testanmeldungen, die Liste zeigt sie
  // weiter, dort mit Kennzeichen.
  const echte = entries.filter((entry) => !entry.ist_test);
  document.getElementById('totalCount').textContent = String(echte.length);
  // Jede Anmeldung ist mindestens eine Person; Begleitung wird dazugezaehlt.
  document.getElementById('personCount').textContent = String(
    echte.reduce((summe, entry) => summe + 1 + (entry.begleitpersonen ?? 0), 0));
  document.getElementById('parentCount').textContent = String(echte.filter((entry) => entry.elternabend_interesse).length);
  document.getElementById('advisorCount').textContent = String(new Set(echte.map((entry) => entry.berater_id)).size);
  document.getElementById('resultMeta').textContent = `${visible.length} von ${entries.length}`;
  exportBtn.disabled = entries.length === 0;

  if (!visible.length) {
    entriesBox.innerHTML = '<div class="kg-admin-empty">Für diesen Filter gibt es noch keine Teilnahmen.</div>';
    return;
  }

  entriesBox.innerHTML = visible.map((entry) => {
    const hasGuess = entry.schaetzung_cm !== null && entry.schaetzung_cm !== undefined;
    return `
    <article class="kg-admin-entry">
      <div><strong>${escapeHtml(entry.name)}</strong>${entry.ist_test ? '<span class="badge badge-test">Test</span>' : ''}<span>${escapeHtml(entry.reference)}</span></div>
      <div><strong>${escapeHtml(entry.email || entry.telefon || 'Kein Kontaktweg')}</strong><span>${escapeHtml(entry.email && entry.telefon ? entry.telefon : '')}</span></div>
      <div><small>Zugeordnet zu</small><strong>${escapeHtml(entry.berater?.name || 'Kai Blobel')}</strong>${entry.empfehler?.name ? `<span>Eingeladen von ${escapeHtml(entry.empfehler.name)}</span>` : ''}</div>
      <div><small>${escapeHtml(formatDate(entry.created_at))}</small><span>${escapeHtml(sourceLabel(entry.source))}</span>${entry.begleitpersonen === null || entry.begleitpersonen === undefined ? '' : `<span>${1 + entry.begleitpersonen} ${1 + entry.begleitpersonen === 1 ? 'Person' : 'Personen'}</span>`}</div>
      <div>
        ${entry.source === ONSITE_SOURCE ? '<span class="kg-admin-badge kg-admin-badge-onsite">Vor Ort · Papier</span>' : ''}
        <button class="kg-admin-manage" type="button" data-guess-participant="${escapeHtml(entry.id)}">${hasGuess ? `Schätzung: ${escapeHtml(String(entry.schaetzung_cm))} cm` : 'Schätzung eintragen'}</button>
        <span class="kg-admin-badge ${entry.elternabend_interesse ? '' : 'kg-admin-badge-none'}">Elternabend: ${entry.elternabend_interesse ? 'Interesse' : 'Nein'}</span>
        ${currentAdvisor?.ist_admin ? `<button class="kg-admin-manage" type="button" data-manage-participant="${escapeHtml(entry.id)}">Teilnahme verwalten</button>` : ''}
      </div>
    </article>
  `;
  }).join('');
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv() {
  const header = ['Teilnahmebestätigung', 'Erfassungsweg', 'Personen', 'Schätzung in cm', 'Name', 'E-Mail', 'Mobilnummer', 'Vermögensberater', 'Eingeladen von', 'Quelle', 'Elternabend-Interesse', 'Teilnahmebedingungen', 'Angemeldet am'];
  const rows = entries.map((entry) => [
    entry.reference,
    entry.source === ONSITE_SOURCE ? 'Vor Ort (Papier)' : 'Online',
    entry.begleitpersonen === null || entry.begleitpersonen === undefined ? '' : 1 + entry.begleitpersonen,
    entry.schaetzung_cm ?? '',
    entry.name, entry.email, entry.telefon, entry.berater?.name || 'Kai Blobel', entry.empfehler?.name || '', sourceLabel(entry.source),
    entry.elternabend_interesse ? 'Ja' : 'Nein', entry.conditions_version, formatDate(entry.created_at),
  ]);
  const content = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `2026-09-06 KIDZ Gewinnspiel Teilnahmen ${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadEntries() {
  const { data, error } = await supabase
    .from('kidz_gewinnspiel_teilnahmen')
    .select('id,reference,name,email,telefon,source,schaetzung_cm,schaetzung_am,begleitpersonen,elternabend_interesse,conditions_version,consent_at,created_at,berater_id,empfehler_id,ist_test,berater:berater_id(name,slug),empfehler:empfehler_id(name)')
    .eq('event_key', EVENT_KEY)
    .order('created_at', { ascending: false });
  if (error) throw error;
  entries = (data || []).map((entry) => ({
    ...entry,
    empfehler: entry.empfehler ? {
      ...entry.empfehler,
      name: entry.empfehler.name,
    } : entry.empfehler,
  }));
  render();
}

function appendParticipantFilterGroup(label, choices, kind) {
  if (!choices.length) return;
  const group = document.createElement('optgroup');
  group.label = label;
  choices.forEach(({ name, slug }) => {
    const value = `${kind}:${slug}`;
    participantFilterChoices.set(value, { kind, name, slug });
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name;
    group.append(option);
  });
  advisorFilter.append(group);
}

function participantCatalogFromEntries() {
  const advisors = [...new Map(entries
    .filter((entry) => entry.berater?.slug)
    .map((entry) => [entry.berater.slug, { name: entry.berater.name || 'Kai Blobel', slug: entry.berater.slug }])).values()];
  const promoters = [...new Map(entries
    .filter((entry) => entry.empfehler?.name)
    .map((entry) => [entry.empfehler.name, { name: entry.empfehler.name, slug: entry.empfehler.name }])).values()];
  return { advisors, promoters };
}

async function configureParticipantFilter() {
  advisorFilter.innerHTML = '<option value="">Alle Berater und Promoter</option>';
  participantFilterChoices.clear();

  // Phase 209: Als Admin sieht man hier das ganze Portal. Das gehört
  // dazugeschrieben, sonst hält man die Zahlen für die eigenen.
  const adminHinweis = document.getElementById('adminSichtHinweis');
  if (adminHinweis) adminHinweis.hidden = !currentAdvisor?.ist_admin;

  if (!currentAdvisor?.ist_admin) {
    advisorFilter.hidden = true;
    advisorFilter.disabled = true;
    return;
  }

  let catalog = participantCatalogFromEntries();
  try {
    const response = await fetch('/api/kidz-advisors', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const choices = Array.isArray(payload.advisors) ? payload.advisors : [];
    catalog = {
      advisors: choices.filter((choice) => !String(choice.slug || '').startsWith('promoter-')),
      promoters: choices.filter((choice) => String(choice.slug || '').startsWith('promoter-')),
    };
  } catch (error) {
    console.warn('[kidz-participant-filter]', error);
  }

  const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de');
  appendParticipantFilterGroup('Vermögensberater', catalog.advisors.sort(byName), 'advisor');
  appendParticipantFilterGroup('Promoter', catalog.promoters.sort(byName), 'promoter');
}

async function copyPersonalInviteLink() {
  const advisor = currentAdvisor || await getCurrentBerater();
  const slug = String(advisor?.slug || '').trim();
  if (!slug) {
    copyInviteBtn.textContent = 'Beraterkonto nicht zugeordnet';
    return;
  }
  // Feste Adresse, nicht die des angemeldeten Fensters: Sonst verschickt jemand,
  // der ueber die alte Portaladresse eingeloggt ist, auch eine alte Adresse.
  const url = `${KIDZ_ADRESSE}/kidz/gewinnspiel?berater=${encodeURIComponent(slug)}&quelle=berater-einladung`;
  await navigator.clipboard.writeText(url);
  copyInviteBtn.textContent = 'Einladungslink kopiert';
  setTimeout(() => { copyInviteBtn.textContent = 'Meinen Einladungslink kopieren'; }, 2200);
}

function openDeleteDialog(participantId) {
  if (!currentAdvisor?.ist_admin) return;
  const entry = entries.find((item) => item.id === participantId);
  if (!entry) return;
  selectedParticipantId = participantId;
  deletePerson.textContent = `${entry.name} · ${entry.reference}`;
  deleteReason.value = '';
  deleteStatus.textContent = '';
  deleteConfirmBtn.disabled = false;
  deleteDialog.showModal();
  deleteReason.focus();
}

function closeDeleteDialog() {
  if (deleteDialog.open) deleteDialog.close();
  selectedParticipantId = '';
  deleteStatus.textContent = '';
}

async function deleteParticipant() {
  const participantId = selectedParticipantId;
  const reason = deleteReason.value;
  if (!participantId || !['test', 'duplicate', 'erasure_request'].includes(reason)) {
    deleteStatus.textContent = 'Bitte zuerst einen Löschgrund auswählen.';
    deleteReason.focus();
    return;
  }

  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = 'Wird gelöscht ...';
  deleteStatus.textContent = '';

  const { data, error } = await supabase.rpc('delete_kidz_gewinnspiel_participation', {
    p_participation_id: participantId,
    p_reason: reason,
  });
  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.reason === 'not_found'
      ? 'Die Teilnahme ist nicht mehr vorhanden.'
      : 'Die Teilnahme konnte nicht gelöscht werden.');
  }

  entries = entries.filter((entry) => entry.id !== participantId);
  closeDeleteDialog();
  render();
  const resultMeta = document.getElementById('resultMeta');
  resultMeta.textContent = 'Teilnahme gelöscht';
  setTimeout(render, 2600);
}

function readGuessField(input) {
  const raw = String(input.value || '').trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return Number.NaN;
  const guess = Math.trunc(value);
  return guess >= 10 && guess <= 999 ? guess : Number.NaN;
}

function updateOnsiteCounter() {
  const parts = [`${onsiteTally.saved} erfasst`];
  if (onsiteTally.duplicate) parts.push(`${onsiteTally.duplicate} Dubletten`);
  if (onsiteTally.noContact) parts.push(`${onsiteTally.noContact} ohne Kontakt`);
  onsiteCounter.textContent = onsiteTally.saved || onsiteTally.duplicate || onsiteTally.noContact
    ? `In dieser Sitzung: ${parts.join(' · ')}`
    : '';
}

function updateOnsiteSaveState() {
  const hasName = onsiteName.value.trim().length >= 2;
  const hasContact = Boolean(onsiteEmail.value.trim() || onsitePhone.value.trim());
  onsiteSaveBtn.disabled = !(hasName && hasContact && onsiteConsent.checked);
}

function fillOnsiteAdvisorChoices() {
  onsiteAdvisor.innerHTML = '';
  const isAdmin = Boolean(currentAdvisor?.ist_admin);
  onsiteAdvisor.hidden = !isAdmin;
  onsiteAdvisorLabel.hidden = !isAdmin;
  onsiteAdvisorNote.hidden = isAdmin;

  if (!isAdmin) {
    onsiteAdvisorNote.textContent = `Der Zettel wird dir zugeordnet: ${currentAdvisor?.name || 'dein Beraterkonto'}.`;
    return;
  }

  const own = document.createElement('option');
  own.value = '';
  own.textContent = `Mir selbst (${currentAdvisor?.name || 'Kai Blobel'})`;
  onsiteAdvisor.append(own);
  [...advisorFilter.querySelectorAll('optgroup')].forEach((sourceGroup) => {
    const group = document.createElement('optgroup');
    group.label = sourceGroup.label;
    [...sourceGroup.options].forEach((option) => {
      const choice = participantFilterChoices.get(option.value);
      if (!choice) return;
      const next = document.createElement('option');
      next.value = choice.kind === 'promoter' ? choice.slug : choice.slug;
      next.textContent = option.textContent;
      group.append(next);
    });
    if (group.children.length) onsiteAdvisor.append(group);
  });
}

function resetOnsiteFields(keepAdvisor = true) {
  onsiteName.value = '';
  onsiteEmail.value = '';
  onsitePhone.value = '';
  onsiteGuess.value = '';
  onsiteBegleitung.selectedIndex = 0;
  onsiteParentEvening.checked = false;
  if (!keepAdvisor) onsiteAdvisor.selectedIndex = 0;
  updateOnsiteSaveState();
  onsiteName.focus();
}

function openOnsiteDialog() {
  fillOnsiteAdvisorChoices();
  resetOnsiteFields(false);
  onsiteConsent.checked = false;
  onsiteStatus.textContent = '';
  onsiteStatus.className = 'kg-admin-dialog-status';
  updateOnsiteCounter();
  updateOnsiteSaveState();
  onsiteDialog.showModal();
  onsiteName.focus();
}

function closeOnsiteDialog() {
  if (onsiteDialog.open) onsiteDialog.close();
  onsiteStatus.textContent = '';
}

function setOnsiteStatus(message, kind) {
  onsiteStatus.textContent = message;
  onsiteStatus.className = `kg-admin-dialog-status${kind ? ` is-${kind}` : ''}`;
}

async function saveOnsiteEntry() {
  const guess = readGuessField(onsiteGuess);
  if (Number.isNaN(guess)) {
    setOnsiteStatus('Die Schätzung muss eine ganze Zahl zwischen 10 und 999 cm sein.', 'hint');
    onsiteGuess.focus();
    return;
  }

  onsiteSaveBtn.disabled = true;
  onsiteSaveBtn.textContent = 'Wird erfasst ...';
  setOnsiteStatus('', '');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.');

    const response = await fetch('/api/kidz-nacherfassung', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: onsiteName.value.trim(),
        email: onsiteEmail.value.trim(),
        telefon: onsitePhone.value.trim(),
        schaetzung: guess,
        begleitpersonen: onsiteBegleitung.value === '' ? null : Number(onsiteBegleitung.value),
        parentEvening: onsiteParentEvening.checked,
        beraterSlug: currentAdvisor?.ist_admin ? onsiteAdvisor.value : '',
        consent: true,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 409) {
      onsiteTally.duplicate += 1;
      setOnsiteStatus(result.reference
        ? `Steht schon in der Liste: ${result.reference}. Zettel als Dublette abhaken.`
        : 'Diese Person ist bereits angemeldet. Nichts weiter zu tun.', 'hint');
      resetOnsiteFields();
      updateOnsiteCounter();
      return;
    }
    if (response.status === 401) throw new Error('Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.');
    if (response.status === 403) throw new Error('Für diese Zuordnung darfst du nicht erfassen.');
    if (response.status === 503) throw new Error('Die Nacherfassung ist noch nicht freigeschaltet.');
    if (!response.ok || !result?.reference) throw new Error('Der Zettel konnte nicht erfasst werden.');

    onsiteTally.saved += 1;
    setOnsiteStatus(`Erfasst: ${result.reference}`, 'ok');
    resetOnsiteFields();
    updateOnsiteCounter();
    await loadEntries();
  } catch (error) {
    setOnsiteStatus(error.message || 'Der Zettel konnte nicht erfasst werden.', '');
  } finally {
    onsiteSaveBtn.textContent = 'Erfassen und nächster Zettel';
    updateOnsiteSaveState();
  }
}

function openGuessDialog(participantId) {
  const entry = entries.find((item) => item.id === participantId);
  if (!entry) return;
  guessParticipantId = participantId;
  guessPerson.textContent = `${entry.name} · ${entry.reference}`;
  guessValue.value = entry.schaetzung_cm ?? '';
  guessStatus.textContent = '';
  guessSaveBtn.disabled = false;
  guessDialog.showModal();
  guessValue.focus();
}

function closeGuessDialog() {
  if (guessDialog.open) guessDialog.close();
  guessParticipantId = '';
  guessStatus.textContent = '';
}

async function saveGuess() {
  const guess = readGuessField(guessValue);
  if (Number.isNaN(guess)) {
    guessStatus.textContent = 'Bitte eine ganze Zahl zwischen 10 und 999 cm eintragen.';
    guessValue.focus();
    return;
  }

  guessSaveBtn.disabled = true;
  guessSaveBtn.textContent = 'Wird gespeichert ...';

  try {
    const { error } = await supabase
      .from('kidz_gewinnspiel_teilnahmen')
      .update({ schaetzung_cm: guess, schaetzung_am: guess === null ? null : new Date().toISOString() })
      .eq('id', guessParticipantId);
    if (error) throw error;

    entries = entries.map((entry) => (entry.id === guessParticipantId
      ? { ...entry, schaetzung_cm: guess }
      : entry));
    closeGuessDialog();
    render();
  } catch (error) {
    guessStatus.textContent = error.message || 'Die Schätzung konnte nicht gespeichert werden.';
  } finally {
    guessSaveBtn.disabled = false;
    guessSaveBtn.textContent = 'Schätzung speichern';
  }
}

applyBeraterHeader();
document.getElementById('logoutBtn').addEventListener('click', logout);
searchInput.addEventListener('input', render);
parentOnly.addEventListener('change', render);
onsiteOnly.addEventListener('change', render);
advisorFilter.addEventListener('change', render);
exportBtn.addEventListener('click', exportCsv);
copyInviteBtn.addEventListener('click', () => copyPersonalInviteLink().catch(() => {
  copyInviteBtn.textContent = 'Kopieren nicht möglich';
}));
entriesBox.addEventListener('click', (event) => {
  const guessButton = event.target.closest('[data-guess-participant]');
  if (guessButton) {
    openGuessDialog(String(guessButton.dataset.guessParticipant || ''));
    return;
  }
  const manageButton = event.target.closest('[data-manage-participant]');
  if (manageButton) {
    openDeleteDialog(String(manageButton.dataset.manageParticipant || ''));
    return;
  }
});
onsiteBtn.addEventListener('click', openOnsiteDialog);
onsiteCloseBtn.addEventListener('click', closeOnsiteDialog);
onsiteNoContactBtn.addEventListener('click', () => {
  onsiteTally.noContact += 1;
  setOnsiteStatus('Zettel ohne Kontaktweg gezählt, nichts gespeichert.', 'hint');
  resetOnsiteFields();
  updateOnsiteCounter();
});
[onsiteName, onsiteEmail, onsitePhone].forEach((field) => field.addEventListener('input', updateOnsiteSaveState));
onsiteConsent.addEventListener('change', updateOnsiteSaveState);
onsiteDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeOnsiteDialog();
});
onsiteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveOnsiteEntry();
});
guessCancelBtn.addEventListener('click', closeGuessDialog);
guessDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeGuessDialog();
});
guessForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveGuess();
});
deleteCancelBtn.addEventListener('click', closeDeleteDialog);
deleteDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeDeleteDialog();
});
deleteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  deleteParticipant().catch((error) => {
    console.error('[kidz-delete]', error);
    deleteStatus.textContent = error.message || 'Die Teilnahme konnte nicht gelöscht werden.';
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = 'Teilnahme endgültig löschen';
  }).finally(() => {
    if (!deleteDialog.open) deleteConfirmBtn.textContent = 'Teilnahme endgültig löschen';
  });
});

const session = await requireAuth();
if (session) {
  try {
    currentAdvisor = await getCurrentBerater();
    await loadEntries();
    await configureParticipantFilter();
  } catch (error) {
    console.error('[kidz-gewinnspiel-admin]', error);
    entriesBox.innerHTML = '<div class="kg-admin-empty">Die Teilnahmen konnten noch nicht geladen werden. Die Datenbankfreigabe fehlt oder die Verbindung ist gerade unterbrochen.</div>';
    document.getElementById('resultMeta').textContent = 'Noch nicht verfügbar';
  }
}
