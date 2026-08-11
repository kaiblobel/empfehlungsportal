import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { supabase } from './supabase.js';

const EVENT_KEY = 'kidz-sommerfest-2026';
const entriesBox = document.getElementById('entries');
const searchInput = document.getElementById('searchInput');
const parentOnly = document.getElementById('parentOnly');
const advisorFilter = document.getElementById('advisorFilter');
const exportBtn = document.getElementById('exportBtn');
const copyInviteBtn = document.getElementById('copyInviteBtn');
let entries = [];

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
    if (advisorFilter.value && entry.berater_id !== advisorFilter.value) return false;
    if (!needle) return true;
    return [entry.name, entry.email, entry.telefon, entry.reference, entry.source, entry.berater?.name]
      .some((value) => String(value || '').toLowerCase().includes(needle));
  });
}

function render() {
  const visible = visibleEntries();
  document.getElementById('totalCount').textContent = String(entries.length);
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
      <div><small>Zugeordnet zu</small><strong>${escapeHtml(entry.berater?.name || 'Kai Blobel')}</strong></div>
      <div><small>${escapeHtml(formatDate(entry.created_at))}</small><span>${escapeHtml(entry.source)}</span></div>
      <div><small>Elternabend</small><span class="kg-admin-badge ${entry.elternabend_interesse ? '' : 'kg-admin-badge-none'}">${entry.elternabend_interesse ? 'Interesse' : 'Nein'}</span></div>
    </article>
  `).join('');
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv() {
  const header = ['Bestätigung', 'Name', 'E-Mail', 'Mobilnummer', 'Vermögensberater', 'Quelle', 'Elternabend-Interesse', 'Einwilligung', 'Erfasst am'];
  const rows = entries.map((entry) => [
    entry.reference, entry.name, entry.email, entry.telefon, entry.berater?.name || 'Kai Blobel', entry.source,
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
    .select('reference,name,email,telefon,source,elternabend_interesse,conditions_version,consent_at,created_at,berater_id,berater:berater_id(name,slug)')
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

async function copyPersonalInviteLink() {
  const advisor = await getCurrentBerater();
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

applyBeraterHeader();
document.getElementById('logoutBtn').addEventListener('click', logout);
searchInput.addEventListener('input', render);
parentOnly.addEventListener('change', render);
advisorFilter.addEventListener('change', render);
exportBtn.addEventListener('click', exportCsv);
copyInviteBtn.addEventListener('click', () => copyPersonalInviteLink().catch(() => {
  copyInviteBtn.textContent = 'Kopieren nicht möglich';
}));

const session = await requireAuth();
if (session) {
  try {
    await loadEntries();
  } catch (error) {
    console.error('[kidz-gewinnspiel-admin]', error);
    entriesBox.innerHTML = '<div class="kg-admin-empty">Die Teilnahmen konnten noch nicht geladen werden. Die Datenbankfreigabe fehlt oder die Verbindung ist gerade unterbrochen.</div>';
    document.getElementById('resultMeta').textContent = 'Noch nicht verfügbar';
  }
}
