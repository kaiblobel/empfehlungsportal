import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { supabase } from './supabase.js';

const KIDZ_ADRESSE = 'https://kidz.teamwachsbleiche.de';

const entriesBox = document.getElementById('entries');
const searchInput = document.getElementById('searchInput');
const advisorFilter = document.getElementById('advisorFilter');
const statusFilter = document.getElementById('statusFilter');
const timeFilter = document.getElementById('timeFilter');
const exportBtn = document.getElementById('exportBtn');
const copyInviteBtn = document.getElementById('copyInviteBtn');
const participantFilterChoices = new Map();
let entries = [];
let currentAdvisor = null;
let realtimeChannel = null;

const STATUS_LABELS = {
  vorgemerkt: 'Vorgemerkt',
  eingeladen: 'Eingeladen',
  bestaetigt: 'Bestätigt',
  teilgenommen: 'Teilgenommen',
  abgesagt: 'Abgesagt',
};
const TIME_LABELS = {
  'werktag-abends': 'Werktag abends',
  'samstag-vormittags': 'Samstag vormittags',
  flexibel: 'Flexibel',
};

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

function promoterName(entry) {
  return entry.empfehler?.name || '';
}

function visibleEntries() {
  const needle = searchInput.value.trim().toLowerCase();
  const participantChoice = participantFilterChoices.get(advisorFilter.value);
  return entries.filter((entry) => {
    if (statusFilter.value && entry.status !== statusFilter.value) return false;
    if (timeFilter.value && entry.time_preference !== timeFilter.value) return false;
    if (participantChoice?.kind === 'advisor' && entry.berater?.slug !== participantChoice.slug) return false;
    if (participantChoice?.kind === 'promoter' && promoterName(entry) !== participantChoice.name) return false;
    if (!needle) return true;
    return [
      entry.name, entry.email, entry.telefon, entry.reference, entry.source,
      entry.question, entry.berater?.name, promoterName(entry), STATUS_LABELS[entry.status],
    ].some((value) => String(value || '').toLowerCase().includes(needle));
  });
}

function statusOptions(current) {
  return Object.entries(STATUS_LABELS).map(([value, label]) => (
    `<option value="${value}"${value === current ? ' selected' : ''}>${label}</option>`
  )).join('');
}

function render() {
  const visible = visibleEntries();
  // Phase 208: Die Kacheln rechnen ohne Testvormerkungen, die Liste zeigt sie
  // weiter, dort mit Kennzeichen.
  const echte = entries.filter((entry) => !entry.ist_test);
  document.getElementById('totalCount').textContent = String(echte.length);
  document.getElementById('invitedCount').textContent = String(echte.filter((entry) => entry.status === 'eingeladen').length);
  document.getElementById('confirmedCount').textContent = String(echte.filter((entry) => entry.status === 'bestaetigt').length);
  document.getElementById('attendedCount').textContent = String(echte.filter((entry) => entry.status === 'teilgenommen').length);
  document.getElementById('resultMeta').textContent = `${visible.length} von ${entries.length}`;
  exportBtn.disabled = entries.length === 0;

  if (!visible.length) {
    entriesBox.innerHTML = '<div class="kg-admin-empty">Für diesen Filter gibt es noch keine Vormerkungen.</div>';
    return;
  }

  entriesBox.innerHTML = visible.map((entry) => `
    <article class="kg-admin-entry" data-entry-id="${escapeHtml(entry.id)}">
      <div>
        <strong>${escapeHtml(entry.name)}</strong>
        ${entry.ist_test ? '<span class="badge badge-test">Test</span>' : ''}
        <span>${escapeHtml(entry.reference)}</span>
        ${entry.question ? `<span class="kea-admin-question">${escapeHtml(entry.question)}</span>` : ''}
      </div>
      <div>
        <strong>${escapeHtml(entry.email || entry.telefon || 'Kein Kontaktweg')}</strong>
        <span>${escapeHtml(entry.email && entry.telefon ? entry.telefon : '')}</span>
        <span class="kea-admin-time">${escapeHtml(TIME_LABELS[entry.time_preference] || entry.time_preference)}</span>
      </div>
      <div>
        <small>Zugeordnet zu</small>
        <strong>${escapeHtml(entry.berater?.name || 'Kai Blobel')}</strong>
        ${promoterName(entry) ? `<span>Eingeladen von ${escapeHtml(promoterName(entry))}</span>` : ''}
      </div>
      <div>
        <small>${escapeHtml(formatDate(entry.created_at))}</small>
        <span>${escapeHtml(entry.source)}</span>
        ${entry.contacted_at ? `<span>Kontaktiert: ${escapeHtml(formatDate(entry.contacted_at))}</span>` : ''}
      </div>
      <div>
        <label class="sr-only" for="status-${escapeHtml(entry.id)}">Status für ${escapeHtml(entry.name)}</label>
        <select class="kea-admin-status" id="status-${escapeHtml(entry.id)}" data-status-id="${escapeHtml(entry.id)}">
          ${statusOptions(entry.status)}
        </select>
        <span class="kea-admin-status-note" data-status-note="${escapeHtml(entry.id)}"></span>
      </div>
    </article>
  `).join('');
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv() {
  const header = [
    'Vormerkung', 'Name', 'E-Mail', 'Mobilnummer', 'Zeitwunsch', 'Frage',
    'Vermögensberater', 'Eingeladen von', 'Quelle', 'Status', 'Angemeldet am', 'Kontaktiert am',
  ];
  const rows = entries.map((entry) => [
    entry.reference, entry.name, entry.email, entry.telefon,
    TIME_LABELS[entry.time_preference] || entry.time_preference, entry.question,
    entry.berater?.name || 'Kai Blobel', promoterName(entry), entry.source,
    STATUS_LABELS[entry.status] || entry.status, formatDate(entry.created_at),
    entry.contacted_at ? formatDate(entry.contacted_at) : '',
  ]);
  const content = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `KIDZ Elternabend Vormerkungen ${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadEntries() {
  const { data, error } = await supabase
    .from('kidz_elternabend_anmeldungen')
    .select('id,reference,name,email,telefon,source,time_preference,question,status,scheduled_for,conditions_version,consent_at,contacted_at,created_at,berater_id,empfehler_id,ist_test,berater:berater_id(name,slug),empfehler:empfehler_id(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  entries = (data || []).map((entry) => ({
    ...entry,
    empfehler: entry.empfehler,
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
    .filter((entry) => promoterName(entry))
    .map((entry) => [promoterName(entry), { name: promoterName(entry), slug: promoterName(entry) }])).values()];
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
    console.warn('[kidz-elternabend-filter]', error);
  }

  const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de');
  appendParticipantFilterGroup('Vermögensberater', catalog.advisors.sort(byName), 'advisor');
  appendParticipantFilterGroup('Promoter', catalog.promoters.sort(byName), 'promoter');
}

async function updateStatus(select) {
  const id = String(select.dataset.statusId || '');
  const entry = entries.find((item) => item.id === id);
  const status = String(select.value || '');
  const note = document.querySelector(`[data-status-note="${CSS.escape(id)}"]`);
  if (!entry || !STATUS_LABELS[status]) return;

  const previous = entry.status;
  select.disabled = true;
  if (note) note.textContent = 'Wird gespeichert ...';
  const patch = { status };
  if (status === 'eingeladen' && !entry.contacted_at) patch.contacted_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('kidz_elternabend_anmeldungen')
    .update(patch)
    .eq('id', id)
    .select('status,contacted_at')
    .single();

  if (error) {
    select.value = previous;
    throw error;
  }
  entry.status = data.status;
  entry.contacted_at = data.contacted_at;
  if (note) note.textContent = 'Gespeichert';
  select.disabled = false;
  render();
}

async function copyPersonalInviteLink() {
  const advisor = currentAdvisor || await getCurrentBerater();
  const slug = String(advisor?.slug || '').trim();
  if (!slug) {
    copyInviteBtn.textContent = 'Beraterkonto nicht zugeordnet';
    return;
  }
  // Feste Adresse, nicht die des angemeldeten Fensters.
  const url = `${KIDZ_ADRESSE}/kidz/elternabend?berater=${encodeURIComponent(slug)}&quelle=berater-einladung`;
  await navigator.clipboard.writeText(url);
  copyInviteBtn.textContent = 'Einladungslink kopiert';
  setTimeout(() => { copyInviteBtn.textContent = 'Meinen Einladungslink kopieren'; }, 2200);
}

function subscribeToChanges() {
  realtimeChannel = supabase
    .channel('kidz-elternabend-anmeldungen')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'kidz_elternabend_anmeldungen',
    }, () => loadEntries().catch((error) => console.error('[kidz-elternabend-realtime]', error)))
    .subscribe();
}

applyBeraterHeader();
document.getElementById('logoutBtn').addEventListener('click', logout);
searchInput.addEventListener('input', render);
advisorFilter.addEventListener('change', render);
statusFilter.addEventListener('change', render);
timeFilter.addEventListener('change', render);
exportBtn.addEventListener('click', exportCsv);
copyInviteBtn.addEventListener('click', () => copyPersonalInviteLink().catch(() => {
  copyInviteBtn.textContent = 'Kopieren nicht möglich';
}));
entriesBox.addEventListener('change', (event) => {
  const select = event.target.closest('[data-status-id]');
  if (!select) return;
  updateStatus(select).catch((error) => {
    console.error('[kidz-elternabend-status]', error);
    select.disabled = false;
    const note = document.querySelector(`[data-status-note="${CSS.escape(String(select.dataset.statusId || ''))}"]`);
    if (note) note.textContent = 'Speichern nicht möglich';
  });
});
window.addEventListener('beforeunload', () => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});

const session = await requireAuth();
if (session) {
  try {
    currentAdvisor = await getCurrentBerater();
    await loadEntries();
    await configureParticipantFilter();
    subscribeToChanges();
  } catch (error) {
    console.error('[kidz-elternabend-admin]', error);
    entriesBox.innerHTML = '<div class="kg-admin-empty">Die Vormerkungen konnten noch nicht geladen werden. Die Datenbankfreigabe fehlt oder die Verbindung ist gerade unterbrochen.</div>';
    document.getElementById('resultMeta').textContent = 'Noch nicht verfügbar';
  }
}
