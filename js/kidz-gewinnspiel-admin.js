import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { supabase } from './supabase.js';

const EVENT_KEY = 'kidz-sommerfest-2026';
const entriesBox = document.getElementById('entries');
const searchInput = document.getElementById('searchInput');
const parentOnly = document.getElementById('parentOnly');
const withoutTicketOnly = document.getElementById('withoutTicketOnly');
const advisorFilter = document.getElementById('advisorFilter');
const exportBtn = document.getElementById('exportBtn');
const copyInviteBtn = document.getElementById('copyInviteBtn');
const deleteDialog = document.getElementById('deleteDialog');
const deleteForm = document.getElementById('deleteForm');
const deletePerson = document.getElementById('deletePerson');
const deleteReason = document.getElementById('deleteReason');
const deleteTicketWarning = document.getElementById('deleteTicketWarning');
const deleteStatus = document.getElementById('deleteStatus');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
let entries = [];
let currentAdvisor = null;
let selectedParticipantId = '';

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
  return entries.filter((entry) => {
    if (parentOnly.checked && !entry.elternabend_interesse) return false;
    if (withoutTicketOnly.checked && entry.ticket_number) return false;
    if (advisorFilter.value && entry.berater_id !== advisorFilter.value) return false;
    if (!needle) return true;
    return [entry.name, entry.email, entry.telefon, entry.reference, entry.ticket_number, entry.source, entry.berater?.name, entry.empfehler?.name]
      .some((value) => String(value || '').toLowerCase().includes(needle));
  });
}

function render() {
  const visible = visibleEntries();
  document.getElementById('totalCount').textContent = String(entries.length);
  document.getElementById('ticketCount').textContent = String(entries.filter((entry) => entry.ticket_number).length);
  document.getElementById('parentCount').textContent = String(entries.filter((entry) => entry.elternabend_interesse).length);
  document.getElementById('advisorCount').textContent = String(new Set(entries.map((entry) => entry.berater_id)).size);
  document.getElementById('resultMeta').textContent = `${visible.length} von ${entries.length}`;
  exportBtn.disabled = entries.length === 0;

  if (!visible.length) {
    entriesBox.innerHTML = '<div class="kg-admin-empty">Für diesen Filter gibt es noch keine Teilnahmen.</div>';
    return;
  }

  entriesBox.innerHTML = visible.map((entry) => `
    <article class="kg-admin-entry">
      <div><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(entry.reference)}</span></div>
      <div><strong>${escapeHtml(entry.email || entry.telefon || 'Kein Kontaktweg')}</strong><span>${escapeHtml(entry.email && entry.telefon ? entry.telefon : '')}</span></div>
      <div><small>Zugeordnet zu</small><strong>${escapeHtml(entry.berater?.name || 'Kai Blobel')}</strong>${entry.empfehler?.name ? `<span>Eingeladen von ${escapeHtml(entry.empfehler.name)}</span>` : ''}</div>
      <div><small>${escapeHtml(formatDate(entry.created_at))}</small><span>${escapeHtml(entry.source)}</span></div>
      <div>
        ${entry.ticket_number ? `
          <div class="kg-admin-ticket-issued"><small>Los ausgegeben</small><strong>${escapeHtml(entry.ticket_number)}</strong><span>${escapeHtml(formatDate(entry.ticket_issued_at))}</span></div>
        ` : `
          <div class="kg-admin-ticket">
            <input type="text" maxlength="12" inputmode="text" autocomplete="off" aria-label="Losnummer für ${escapeHtml(entry.name)}" placeholder="Los-Nr.">
            <button type="button" data-issue-ticket="${escapeHtml(entry.id)}">Los ausgeben</button>
          </div>
          <span class="kg-admin-ticket-status" data-ticket-status="${escapeHtml(entry.id)}"></span>
        `}
        <span class="kg-admin-badge ${entry.elternabend_interesse ? '' : 'kg-admin-badge-none'}">Elternabend: ${entry.elternabend_interesse ? 'Interesse' : 'Nein'}</span>
        ${currentAdvisor?.ist_admin ? `<button class="kg-admin-manage" type="button" data-manage-participant="${escapeHtml(entry.id)}">Teilnahme verwalten</button>` : ''}
      </div>
    </article>
  `).join('');
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv() {
  const header = ['Teilnahmebestätigung', 'Bonusverlosung', 'Hauptgewinn-Losnummer', 'Los ausgegeben am', 'Name', 'E-Mail', 'Mobilnummer', 'Vermögensberater', 'Eingeladen von', 'Quelle', 'Elternabend-Interesse', 'Teilnahmebedingungen', 'Angemeldet am'];
  const rows = entries.map((entry) => [
    entry.reference, 'Ja', entry.ticket_number, entry.ticket_issued_at ? formatDate(entry.ticket_issued_at) : '', entry.name, entry.email, entry.telefon, entry.berater?.name || 'Kai Blobel', entry.empfehler?.name || '', entry.source,
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
    .select('id,reference,name,email,telefon,source,elternabend_interesse,conditions_version,consent_at,created_at,checked_in_at,ticket_number,ticket_issued_at,berater_id,empfehler_id,berater:berater_id(name,slug),empfehler:empfehler_id(name)')
    .eq('event_key', EVENT_KEY)
    .order('created_at', { ascending: false });
  if (error) throw error;
  entries = data || [];
  const advisors = [...new Map(entries.map((entry) => [entry.berater_id, entry.berater?.name || 'Kai Blobel'])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'de'));
  advisorFilter.innerHTML = '<option value="">Alle Vermögensberater</option>';
  advisors.forEach(([id, name]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = name;
    advisorFilter.append(option);
  });
  render();
}

function normalizeTicketNumber(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

async function issueTicket(button) {
  const id = String(button.dataset.issueTicket || '');
  const input = button.closest('.kg-admin-ticket')?.querySelector('input');
  const status = document.querySelector(`[data-ticket-status="${CSS.escape(id)}"]`);
  const ticketNumber = normalizeTicketNumber(input?.value);
  if (!/^[A-Z0-9]{1,12}$/.test(ticketNumber)) {
    if (status) status.textContent = 'Bitte 1 bis 12 Buchstaben oder Ziffern eingeben.';
    input?.focus();
    return;
  }

  button.disabled = true;
  button.textContent = 'Wird gebucht ...';
  if (status) status.textContent = '';
  const { data, error } = await supabase.rpc('issue_kidz_gewinnspiel_ticket', {
    p_participation_id: id,
    p_ticket_number: ticketNumber,
  });
  if (error) throw error;
  if (!data?.ok) {
    const messages = {
      already_issued: 'Für diese Person wurde bereits ein Los ausgegeben.',
      ticket_exists: 'Diese Losnummer ist bereits vergeben.',
      not_found: 'Die Vormerkung wurde nicht gefunden oder ist nicht freigegeben.',
      invalid_ticket: 'Die Losnummer ist ungültig.',
    };
    throw new Error(messages[data?.reason] || 'Das Los konnte nicht ausgegeben werden.');
  }

  const entry = entries.find((item) => item.id === id);
  if (entry) {
    entry.ticket_number = data.ticket_number;
    entry.ticket_issued_at = data.ticket_issued_at;
    entry.checked_in_at = data.ticket_issued_at;
  }
  render();
}

async function copyPersonalInviteLink() {
  const advisor = currentAdvisor || await getCurrentBerater();
  const slug = String(advisor?.slug || '').trim();
  if (!slug) {
    copyInviteBtn.textContent = 'Beraterkonto nicht zugeordnet';
    return;
  }
  const url = `${window.location.origin}/kidz/gewinnspiel?berater=${encodeURIComponent(slug)}&quelle=berater-einladung`;
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
  deleteTicketWarning.hidden = !entry.ticket_number;
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
  resultMeta.textContent = data.had_ticket
    ? 'Teilnahme gelöscht, Losnummer wieder frei'
    : 'Teilnahme gelöscht';
  setTimeout(render, 2600);
}

applyBeraterHeader();
document.getElementById('logoutBtn').addEventListener('click', logout);
searchInput.addEventListener('input', render);
parentOnly.addEventListener('change', render);
withoutTicketOnly.addEventListener('change', render);
advisorFilter.addEventListener('change', render);
exportBtn.addEventListener('click', exportCsv);
copyInviteBtn.addEventListener('click', () => copyPersonalInviteLink().catch(() => {
  copyInviteBtn.textContent = 'Kopieren nicht möglich';
}));
entriesBox.addEventListener('click', (event) => {
  const manageButton = event.target.closest('[data-manage-participant]');
  if (manageButton) {
    openDeleteDialog(String(manageButton.dataset.manageParticipant || ''));
    return;
  }
  const button = event.target.closest('[data-issue-ticket]');
  if (!button) return;
  issueTicket(button).catch((error) => {
    console.error('[kidz-ticket]', error);
    const status = document.querySelector(`[data-ticket-status="${CSS.escape(button.dataset.issueTicket || '')}"]`);
    if (status) status.textContent = error.message || 'Das Los konnte nicht ausgegeben werden.';
    button.disabled = false;
    button.textContent = 'Los ausgeben';
  });
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
  } catch (error) {
    console.error('[kidz-gewinnspiel-admin]', error);
    entriesBox.innerHTML = '<div class="kg-admin-empty">Die Teilnahmen konnten noch nicht geladen werden. Die Datenbankfreigabe fehlt oder die Verbindung ist gerade unterbrochen.</div>';
    document.getElementById('resultMeta').textContent = 'Noch nicht verfügbar';
  }
}
