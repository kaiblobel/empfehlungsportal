import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { supabase, markiereGesehen } from './supabase.js';

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
const copyWhatsAppBtn = document.getElementById('copyWhatsAppBtn');
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
// Die Berater fuer das Zuordnungs-Auswahlfeld auf der Karte. Wird beim Aufbau
// des Filters gefuellt, aus derselben Quelle.
let beraterAuswahl = [];
// Phase 360: Der Schalter fuer die Teamsicht. Steht er an, sieht jeder Berater
// alle Anmeldungen des Festes und darf sie zuordnen. Durchgesetzt wird das in
// der Datenbank (kidz_team_sicht), hier wird nur angezeigt, was sie erlaubt.
let teamSichtOffen = false;
// Namen der Berater fuer fremde Anmeldungen. Ohne Admin-Recht ist die Tabelle
// berater nicht lesbar, die Einbettung berater:berater_id bleibt dann leer.
const beraterNamen = new Map();
let pageviewStats = { total: 0, whatsapp: 0 };
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
      <div><small>Zugeordnet zu</small>${zuordnungsFeld(entry)}${entry.empfehler?.name ? `<span>Eingeladen von ${escapeHtml(entry.empfehler.name)}</span>` : ''}<span class="kg-admin-assign-hinweis" data-assign-note="${escapeHtml(entry.id)}" hidden></span></div>
      <div><small>${escapeHtml(formatDate(entry.created_at))}</small><span>${escapeHtml(sourceLabel(entry.source))}</span>${entry.begleitpersonen === null || entry.begleitpersonen === undefined ? '' : `<span>${1 + entry.begleitpersonen} ${1 + entry.begleitpersonen === 1 ? 'Person' : 'Personen'}</span>`}</div>
      <div>
        ${entry.source === ONSITE_SOURCE ? '<span class="kg-admin-badge kg-admin-badge-onsite">Vor Ort · Papier</span>' : ''}
        ${istEigen(entry) ? `
        <button class="kg-admin-manage" type="button" data-guess-participant="${escapeHtml(entry.id)}">${hasGuess ? `Schätzung: ${escapeHtml(String(entry.schaetzung_cm))} cm` : 'Schätzung eintragen'}</button>
        <button class="kg-admin-manage" type="button" data-interest-participant="${escapeHtml(entry.id)}">KIDZ for Future: ${entry.elternabend_interesse ? 'Interesse' : 'Nein'}</button>` : `
        <span>${hasGuess ? `Schätzung: ${escapeHtml(String(entry.schaetzung_cm))} cm` : 'Ohne Schätzung'}</span>
        <span>KIDZ for Future: ${entry.elternabend_interesse ? 'Interesse' : 'Nein'}</span>`}
        ${currentAdvisor?.ist_admin ? `<button class="kg-admin-manage" type="button" data-manage-participant="${escapeHtml(entry.id)}">Teilnahme verwalten</button>` : ''}
      </div>
    </article>
  `;
  }).join('');
}

/**
 * Darf der Angemeldete zuordnen? Administratoren immer, alle anderen nur bei
 * offener Teamsicht (Phase 360). Die Datenbank prueft dasselbe noch einmal.
 */
function darfZuordnen() {
  return Boolean(currentAdvisor?.ist_admin || teamSichtOffen);
}

/**
 * Gehoert die Anmeldung dem Angemeldeten? Nur dann gibt es die Knoepfe fuer
 * Schaetzung und KIDZ for Future. Bei fremden Anmeldungen weist die Datenbank
 * das Schreiben ab, und die Schaetzung saehe ohne Rueckmeldung gespeichert aus.
 */
function istEigen(entry) {
  return Boolean(currentAdvisor?.ist_admin
    || (currentAdvisor?.id && entry.berater_id === currentAdvisor.id));
}

/**
 * Die Zuordnung auf der Karte.
 *
 * Ein Auswahlfeld fuer alle, die zuordnen duerfen, sonst der Name als Text.
 * Nach dem Fest lagen 170 von 225 Kontakten beim Vorgabeberater, weil die
 * meisten sich ueber den allgemeinen Link angemeldet haben. Wer wen kennt,
 * weiss nur das Team: Jeder Berater geht die Liste mit seinen Promotern durch
 * und ordnet zu, solange Kai die Teamsicht offen hat.
 */
function zuordnungsFeld(entry) {
  const name = entry.berater?.name || 'Kai Blobel';
  if (!darfZuordnen() || !beraterAuswahl.length) {
    return `<strong>${escapeHtml(name)}</strong>`;
  }
  const aktuell = String(entry.berater?.slug || '');
  const optionen = beraterAuswahl
    .map((b) => `<option value="${escapeHtml(b.slug)}"${b.slug === aktuell ? ' selected' : ''}>${escapeHtml(b.name)}</option>`)
    .join('');
  const fehlt = beraterAuswahl.some((b) => b.slug === aktuell)
    ? ''
    : `<option value="" selected>${escapeHtml(name)}</option>`;
  return `<select class="kg-admin-assign" data-assign-participant="${escapeHtml(entry.id)}" aria-label="Zugeordnet zu, änderbar">${fehlt}${optionen}</select>`;
}

/**
 * Eine Zuordnung aendern.
 *
 * Ohne Rueckfrage: Bei 170 Kontakten waere ein Bestaetigungsdialog eine Qual,
 * und anders als beim Haekchen fuer KIDZ for Future geht es hier nicht um eine
 * Einwilligung, sondern um eine interne Zustaendigkeit. Ein Fehlgriff ist mit
 * einer zweiten Auswahl behoben.
 *
 * Die Liste wird bewusst NICHT neu aufgebaut. Wer nach einem Berater gefiltert
 * hat, verliert sonst mitten im Durchgang die Stelle, weil der gerade bearbeitete
 * Eintrag unter den Fingern verschwindet. Die Karte bekommt nur einen Vermerk,
 * sortiert wird beim naechsten Laden.
 */
async function assignParticipant(participantId, slug, feld) {
  const eintrag = entries.find((item) => item.id === participantId);
  const notiz = document.querySelector(`[data-assign-note="${CSS.escape(participantId)}"]`);
  const zeigen = (text, art) => {
    if (!notiz) return;
    notiz.textContent = text;
    notiz.dataset.art = art;
    notiz.hidden = false;
  };
  if (!eintrag || !slug) return;
  const vorher = String(eintrag.berater?.slug || '');
  if (slug === vorher) return;

  feld.disabled = true;
  zeigen('wird gespeichert ...', 'wartet');
  try {
    const { data, error } = await supabase.rpc('set_kidz_gewinnspiel_berater', {
      p_participation_id: participantId,
      p_berater_slug: slug,
    });
    if (error) throw error;
    if (!data?.ok) {
      const grund = {
        forbidden: 'Die Teamsicht ist gerade aus. Zuordnen darf dann nur ein Admin.',
        not_found: 'Die Anmeldung wurde nicht gefunden. Bitte die Liste neu laden.',
        invalid_advisor: 'Dieser Name ist kein aktiver Berater.',
      }[data?.reason] || 'Die Zuordnung konnte nicht gespeichert werden.';
      feld.value = vorher;
      zeigen(grund, 'fehler');
      return;
    }
    const gewaehlt = beraterAuswahl.find((b) => b.slug === slug);
    eintrag.berater = { name: data.berater || gewaehlt?.name || '', slug };
    if (data.berater_id) eintrag.berater_id = data.berater_id;
    zeigen(`gespeichert, jetzt bei ${data.berater || gewaehlt?.name || 'dem neuen Berater'}`, 'fertig');
  } catch (error) {
    feld.value = vorher;
    zeigen(error.message || 'Die Zuordnung konnte nicht gespeichert werden.', 'fehler');
  } finally {
    feld.disabled = false;
  }
}

function renderPageviews() {
  document.getElementById('pageviewCount').textContent = String(pageviewStats.total);
  document.getElementById('whatsappPageviewCount').textContent = String(pageviewStats.whatsapp);
}

async function loadPageviews() {
  const { data, error } = await supabase
    .from('kidz_seitenaufrufe_tag')
    .select('source,aufrufe')
    .eq('event_key', EVENT_KEY)
    .eq('page_key', 'sommerfest');
  if (error) throw error;

  pageviewStats = (data || []).reduce((sum, row) => {
    const views = Number(row.aufrufe) || 0;
    sum.total += views;
    if (row.source === 'whatsapp') sum.whatsapp += views;
    return sum;
  }, { total: 0, whatsapp: 0 });
  renderPageviews();
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv() {
  const header = ['Teilnahmebestätigung', 'Erfassungsweg', 'Personen', 'Schätzung in cm', 'Name', 'E-Mail', 'Mobilnummer', 'Vermögensberater', 'Eingeladen von', 'Quelle', 'KIDZ for Future', 'Teilnahmebedingungen', 'Angemeldet am'];
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
    berater: entry.berater || beraterNamen.get(entry.berater_id) || null,
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

/**
 * Die Berater fuer das Zuordnungs-Auswahlfeld holen.
 *
 * Muss laufen, BEVOR die Liste zum ersten Mal gezeichnet wird. Sonst faellt
 * zuordnungsFeld() auf den festen Namen zurueck, und das Auswahlfeld erscheint
 * gar nicht. Genau das ist nach Phase 338 passiert: Die Liste wurde erst im
 * Filteraufbau geholt, also nach dem Zeichnen, und danach wurde nie wieder
 * gezeichnet.
 *
 * Promoter fliegen raus: Sie stehen in derselben Auswahlliste, laden aber nur
 * ein und betreuen nicht. Die Datenbank weist sie ohnehin ab.
 *
 * Bei einem Fehler bleibt die Liste leer, dann steht wie bisher der feste Name
 * da. Lieber kein Auswahlfeld als ein leeres.
 */
async function ladeBeraterAuswahl() {
  try {
    const response = await fetch('/api/kidz-advisors', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const choices = Array.isArray(payload.advisors) ? payload.advisors : [];
    beraterAuswahl = choices
      .filter((choice) => !String(choice.slug || '').startsWith('promoter-'))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
  } catch (error) {
    console.warn('[kidz-berater-auswahl]', error);
    beraterAuswahl = [];
  }
}

/** Phase 360: Stand des Schalters holen. Ohne Antwort gilt die enge Sicht. */
async function ladeTeamSicht() {
  const { data, error } = await supabase
    .from('kidz_team_sicht')
    .select('alle_sehen')
    .eq('event_key', EVENT_KEY)
    .maybeSingle();
  if (error) console.warn('[kidz-team-sicht]', error);
  teamSichtOffen = !error && data?.alle_sehen === true;
}

/** Namen der Berater fuer fremde Anmeldungen, nur bei offener Teamsicht. */
async function ladeBeraterNamen() {
  beraterNamen.clear();
  if (!teamSichtOffen || currentAdvisor?.ist_admin) return;
  const { data, error } = await supabase.rpc('kidz_team_berater');
  if (error) {
    console.warn('[kidz-team-berater]', error);
    return;
  }
  (data || []).forEach((b) => beraterNamen.set(b.id, { name: b.name, slug: b.slug }));
}

function zeigeTeamSicht() {
  const istAdmin = Boolean(currentAdvisor?.ist_admin);
  const schalter = document.getElementById('teamSichtSchalter');
  const feld = document.getElementById('teamSichtAn');
  const lage = document.getElementById('teamSichtLage');
  const hinweis = document.getElementById('teamSichtHinweis');
  if (schalter) schalter.hidden = !istAdmin;
  if (feld) feld.checked = teamSichtOffen;
  if (lage) {
    lage.textContent = teamSichtOffen
      ? 'An: Jeder Berater sieht alle Teilnehmer und kann sie zuordnen.'
      : 'Aus: Jeder Berater sieht nur seine eigenen Teilnehmer.';
  }
  if (hinweis) hinweis.hidden = istAdmin || !teamSichtOffen;
}

/**
 * Den Schalter umlegen. Nur fuer Administratoren, die Datenbank laesst es
 * anderen ohnehin nicht zu. Die eigene Liste aendert sich dabei nicht: Ein
 * Admin sieht immer alles. Die Berater merken es beim naechsten Laden.
 */
async function schalteTeamSicht(an) {
  const feld = document.getElementById('teamSichtAn');
  const lage = document.getElementById('teamSichtLage');
  if (!currentAdvisor?.ist_admin || !feld) return;
  feld.disabled = true;
  if (lage) lage.textContent = 'wird gespeichert ...';
  try {
    const { data, error } = await supabase
      .from('kidz_team_sicht')
      .update({ alle_sehen: an })
      .eq('event_key', EVENT_KEY)
      .select('alle_sehen')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Der Schalter wurde nicht gespeichert.');
    teamSichtOffen = data.alle_sehen === true;
    zeigeTeamSicht();
  } catch (error) {
    console.warn('[kidz-team-sicht] umlegen', error);
    zeigeTeamSicht();
    if (lage) lage.textContent = `Hat nicht geklappt: ${error.message || 'bitte nochmal versuchen'}`;
  } finally {
    feld.disabled = false;
  }
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
  //
  // Phase 360: Ob die übrigen Berater alles sehen, entscheidet Kais Schalter.
  // Dann bekommen auch sie einen Hinweis und den Filter nach Beratern.
  const adminHinweis = document.getElementById('adminSichtHinweis');
  if (adminHinweis) adminHinweis.hidden = !currentAdvisor?.ist_admin;
  zeigeTeamSicht();

  if (!currentAdvisor?.ist_admin && !teamSichtOffen) {
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
  // Falls die Liste beim Start nicht geladen werden konnte, hier noch einmal.
  if (!beraterAuswahl.length) beraterAuswahl = [...catalog.advisors].sort(byName);
  appendParticipantFilterGroup('Vermögensberater', catalog.advisors.sort(byName), 'advisor');
  appendParticipantFilterGroup('Promoter', catalog.promoters.sort(byName), 'promoter');

  // Sicherheitsnetz: Wurde die Liste erst hier gefuellt, traegt die bereits
  // gezeichnete Karte noch den festen Namen statt des Auswahlfelds.
  render();
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

async function copyWhatsAppLink() {
  const advisor = currentAdvisor || await getCurrentBerater();
  const slug = String(advisor?.slug || '').trim();
  if (!slug) {
    copyWhatsAppBtn.textContent = 'Beraterkonto nicht zugeordnet';
    return;
  }
  const url = `${KIDZ_ADRESSE}/kidz/sommerfest?berater=${encodeURIComponent(slug)}&quelle=whatsapp`;
  await navigator.clipboard.writeText(url);
  copyWhatsAppBtn.textContent = 'WhatsApp-Link kopiert';
  setTimeout(() => { copyWhatsAppBtn.textContent = 'WhatsApp-Link kopieren'; }, 2200);
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
copyWhatsAppBtn.addEventListener('click', () => copyWhatsAppLink().catch(() => {
  copyWhatsAppBtn.textContent = 'Kopieren nicht möglich';
}));
/**
 * Das Haekchen fuer KIDZ for Future nachtragen.
 *
 * Am Veranstaltungstag sagt jemand am Stand "zum Elternabend will ich auch",
 * ist aber schon angemeldet. Ohne diesen Weg muesste die Person das Formular
 * noch einmal ausfuellen. Es ist eine Einwilligung, deshalb wird gefragt, statt
 * dass ein Fehlklick sie setzt oder loescht.
 *
 * Der Weg fuehrt ueber eine Funktion in der Datenbank, nicht ueber ein direktes
 * Schreiben in die Tabelle. Grund: Das Aenderungsrecht auf
 * kidz_gewinnspiel_teilnahmen ist spaltenweise vergeben, und
 * elternabend_interesse steht bewusst nicht darin. Es ist eine Einwilligung;
 * haette der Browser das Spaltenrecht, koennte er sie frei schreiben und der
 * einzige Schutz waere diese Datei hier. Die Datenbank prueft stattdessen
 * selbst, ob der Aufrufer fuer diese Anmeldung zustaendig ist
 * (schema-phase324-kidz-interesse-nachtragen.sql).
 */
async function toggleInterest(participantId) {
  const entry = entries.find((item) => item.id === participantId);
  if (!entry) return;
  const neu = !entry.elternabend_interesse;
  const frage = neu
    ? `${entry.name} möchte Infos zu KIDZ for Future erhalten. Eintragen?`
    : `Den Wunsch nach Infos zu KIDZ for Future bei ${entry.name} wieder entfernen?`;
  if (!window.confirm(frage)) return;

  try {
    const { data, error } = await supabase.rpc('set_kidz_gewinnspiel_interesse', {
      p_participation_id: participantId,
      p_interesse: neu,
    });
    if (error) throw error;
    if (!data?.ok) {
      const grund = {
        forbidden: 'Diese Anmeldung gehört zu einem anderen Berater.',
        not_found: 'Die Anmeldung wurde nicht gefunden. Bitte die Liste neu laden.',
        no_advisor_account: 'Zu diesem Zugang gehört kein Beraterkonto.',
      }[data?.reason] || 'Der Eintrag konnte nicht gespeichert werden.';
      window.alert(grund);
      return;
    }
    entries = entries.map((item) => (item.id === participantId
      ? { ...item, elternabend_interesse: data.interesse === true }
      : item));
    render();
  } catch (error) {
    window.alert(error.message || 'Der Eintrag konnte nicht gespeichert werden.');
  }
}

document.getElementById('teamSichtAn')?.addEventListener('change', (event) => {
  schalteTeamSicht(event.target.checked);
});

entriesBox.addEventListener('change', (event) => {
  const feld = event.target.closest('[data-assign-participant]');
  if (!feld) return;
  assignParticipant(String(feld.dataset.assignParticipant || ''), String(feld.value || ''), feld);
});

entriesBox.addEventListener('click', (event) => {
  const guessButton = event.target.closest('[data-guess-participant]');
  if (guessButton) {
    openGuessDialog(String(guessButton.dataset.guessParticipant || ''));
    return;
  }
  const interestButton = event.target.closest('[data-interest-participant]');
  if (interestButton) {
    toggleInterest(String(interestButton.dataset.interestParticipant || ''));
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
    // Erst der Schalter, dann die Namen: Beides braucht die Liste beim Zeichnen.
    await ladeTeamSicht();
    await ladeBeraterNamen();
    // Die Beraterliste muss FERTIG sein, bevor die Liste gezeichnet wird, sonst
    // faellt das Auswahlfeld fuer die Zuordnung auf den festen Namen zurueck.
    // Deshalb hier nacheinander und nicht nebenher: Nebenher hiesse nur "zur
    // gleichen Zeit gestartet", nicht "vorher fertig".
    await ladeBeraterAuswahl();
    await Promise.all([
      loadEntries(),
      loadPageviews().catch((error) => {
        console.error('[kidz-pageviews-admin]', error);
        document.getElementById('pageviewStatus').textContent = 'Zähler noch nicht freigeschaltet';
      }),
    ]);
    await configureParticipantFilter();
    // Phase 211: Wer hier ist, hat die Liste gesehen. Läuft nebenher, der
    // Zähler im Menü ist es nicht wert, das Laden aufzuhalten.
    markiereGesehen('kidz_gewinnspiel');
  } catch (error) {
    console.error('[kidz-gewinnspiel-admin]', error);
    entriesBox.innerHTML = '<div class="kg-admin-empty">Die Teilnahmen konnten noch nicht geladen werden. Die Datenbankfreigabe fehlt oder die Verbindung ist gerade unterbrochen.</div>';
    document.getElementById('resultMeta').textContent = 'Noch nicht verfügbar';
  }
}
