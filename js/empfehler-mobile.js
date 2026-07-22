import {
  getEmpfehlerByCode,
  getEmpfehlerStats,
  getEmpfehlerEmpfehlungen,
  getBelohnungsStufen,
  getBeraterPublicById,
  getVorlagen,
  createEmpfehlung,
  setEmpfehlerZiel,
  updateEmpfehlungKontext,
  updateEmpfehlerStandardNachricht,
} from './supabase.js';
import { parseDbDate } from './date-utils.js';
import { applyBeraterBrand } from './berater-brand.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const params = new URLSearchParams(window.location.search);
const codeFromUrl = params.get('code');
const codeFromStorage = (() => {
  try { return localStorage.getItem('empfehler_code'); } catch (_) { return null; }
})();
const code = codeFromUrl || codeFromStorage;

const TOPIC_META = {
  allgemein: { symbol: 'OFFEN', subtitle: 'Kai findet das Richtige im Gespräch', tone: '' },
  baufi: { symbol: 'HAUS', subtitle: 'Kauf, Neubau oder Anschluss', tone: 'tone-marine' },
  foerderungen: { symbol: 'PLUS', subtitle: 'Chancen und Zuschüsse prüfen', tone: 'tone-sage' },
  selbstaendige: { symbol: 'FIRMA', subtitle: 'Privat und geschäftlich gut aufgestellt', tone: 'tone-marine' },
  investment: { symbol: 'WERT', subtitle: 'Vermögen sinnvoll aufbauen', tone: 'tone-sage' },
  absicherung: { symbol: 'SCHUTZ', subtitle: 'Familie und Einkommen schützen', tone: 'tone-terra' },
  karriere: { symbol: 'WEG', subtitle: 'Berufliche Möglichkeiten entdecken', tone: 'tone-marine' },
  kinder: { symbol: 'START', subtitle: 'Früh die richtigen Weichen stellen', tone: 'tone-terra' },
};

const STATUS_LABEL = {
  offen: 'Noch offen',
  anrufwunsch: 'Gespräch gewünscht',
  kontaktiert: 'Im Gespräch',
  kunde: 'Kunde geworden',
  kein_interesse: 'Kein Interesse',
};

const VERBINDUNG_OPTS = [
  ['', 'Bitte wählen'], ['Familie', 'Familie'], ['Lebenspartner', 'Lebenspartner'],
  ['Freund', 'Freund oder Freundin'], ['Arbeitskollege', 'Arbeitskollege oder Arbeitskollegin'],
  ['Vereinskollege', 'Verein oder Sport'], ['Nachbar', 'Nachbar oder Nachbarin'],
  ['Bekannter', 'Bekannte oder Bekannter'], ['Sonstiges', 'Sonstiges'],
];
const ERREICHBARKEIT_OPTS = [
  ['', 'Wenn du es weißt'], ['vormittag', 'Vormittag, 8 bis 12 Uhr'], ['mittag', 'Mittag, 12 bis 14 Uhr'],
  ['nachmittag', 'Nachmittag, 14 bis 18 Uhr'], ['abend', 'Abend, 18 bis 21 Uhr'], ['we', 'Am Wochenende'],
];
const KANAL_OPTS = [
  ['', 'Wenn du es weißt'], ['anruf', 'Telefon'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'E-Mail'],
];

const messageTemplates = {
  warm: (name, topic, advisor) => `Hi ${name}, ich möchte dir ${advisor} empfehlen. Er hat mir selbst schon sehr geholfen und schaut sich das Thema ${topic} wirklich persönlich an. Hier kannst du ganz in Ruhe sehen, worum es geht:`,
  short: (name, topic, advisor) => `Hi ${name}, ich glaube, ${advisor} könnte dir beim Thema ${topic} helfen. Schau dir das gern einmal unverbindlich an:`,
  neutral: (name, topic, advisor) => `Hi ${name}, falls ${topic} für dich gerade ein Thema ist: Hier findest du eine persönliche Übersicht von ${advisor}. Du entscheidest in Ruhe, ob du Kontakt möchtest:`,
};

const GOAL_IMAGE_FALLBACKS = [
  [/restaurant/i, '/assets/images/programm/restaurant.jpg'],
  [/weber|grill|apple watch/i, '/assets/images/programm/applewatch.jpg'],
  [/gold/i, '/assets/images/programm/goldbarren.jpg'],
  [/ipad/i, '/assets/images/programm/ipad.jpg'],
  [/mallorca|urlaub|reise/i, '/assets/images/programm/mallorca.jpg'],
  [/bonus/i, '/assets/images/programm/kundenlos.jpg'],
];

let empfehler = null;
let stats = null;
let empfehlungen = [];
let stufen = [];
let vorlagen = [];
let beraterName = 'Kai';
let refreshTimer = null;
let isRefreshing = false;
let pendingRecommendationId = null;
let pendingRecommendationName = '';
let sessionChanges = [];
let activePlanIndex = null;

const draftKey = () => `empfehler_mobile_draft_${code}`;
const snapshotKey = () => `empfehler_mobile_snapshot_${code}`;
const notificationKey = () => `empfehler_mobile_frequency_${code}`;
const goalPlanKey = () => `empfehler_mobile_goal_plan_${code}`;
const funnel = { step: 1, name: '', phone: '', topic: '', topicTitle: '', template: 'warm', message: '' };

if (!code) {
  window.location.href = 'programm.html';
} else {
  try { localStorage.setItem('empfehler_code', code); } catch (_) {}
  init();
}

async function init() {
  bindStaticControls();
  const [empRes, statsRes, listRes, stufenData] = await Promise.all([
    getEmpfehlerByCode(code),
    getEmpfehlerStats(code),
    getEmpfehlerEmpfehlungen(code),
    getBelohnungsStufen(),
  ]);

  empfehler = empRes.data;
  stats = statsRes.data;
  empfehlungen = listRes.data || [];
  stufen = stufenData || [];

  if (!empfehler || !stats) {
    showInvalidCode();
    return;
  }

  const [beraterRes, templateData] = await Promise.all([
    empfehler.berater_id ? getBeraterPublicById(empfehler.berater_id) : Promise.resolve({ data: null }),
    getVorlagen(empfehler.berater_id || null),
  ]);
  if (beraterRes.data) {
    applyBeraterBrand(beraterRes.data);
    beraterName = (beraterRes.data.name || 'Kai').split(' ')[0];
  }
  vorlagen = templateData.length ? templateData : [{ slug: 'allgemein', titel: 'Allgemein' }];

  detectChanges(empfehlungen);
  renderAll();
  enableActions();
  restoreLocalPreferences();
  startRefreshCycle();
}

function showInvalidCode() {
  $('#dashboardMain').hidden = true;
  $('#bottomNav').hidden = true;
  $('#errorState').hidden = false;
  $('#helloName').textContent = 'Zugang nicht gefunden';
}

function enableActions() {
  $$('.start-funnel').forEach(button => { button.disabled = false; });
}

function renderAll() {
  renderGreeting();
  renderMetrics();
  renderActivities();
  renderReward();
  renderGoalList();
  renderTopics();
  renderRecommendations();
  renderSettings();
  renderNotices();
  $('#resumeDraft').classList.toggle('visible', Boolean(loadDraft()));
}

function renderGreeting() {
  const firstName = (stats.name || empfehler.name || '').trim().split(' ')[0] || 'Hallo';
  $('#helloName').textContent = `Hallo ${firstName}`;
  const total = stats.gesamt || 0;
  $('#heroProof').textContent = total
    ? `${total} ${total === 1 ? 'Mensch' : 'Menschen'} empfohlen. Jeder Kontakt bleibt für dich sichtbar.`
    : 'Deine erste Empfehlung dauert weniger als eine Minute.';
  if (params.get('neu') === '1') {
    $('#heroText').textContent = 'Dein persönlicher Bereich ist bereit. Mit vier kurzen Schritten kannst du direkt jemanden empfehlen.';
  }
}

function renderMetrics() {
  $('#recommendedCount').textContent = stats.gesamt || 0;
  $('#openedCount').textContent = empfehlungen.filter(item => item.link_geoeffnet).length;
  $('#customerCount').textContent = stats.kunde || 0;
}

function activityFor(item) {
  const name = firstName(item.empfaenger_name) || 'Deine Empfehlung';
  if (item.status === 'kunde') return { rank: 5, icon: 'ZIEL', tone: 'sage', title: `${name} ist Kunde geworden`, text: 'Deine Empfehlung hat wirklich geholfen.', time: formatRelative(item.created_at) };
  if (item.status === 'anrufwunsch') return { rank: 4, icon: 'TER', tone: 'marine', title: `${name} möchte ein Gespräch`, text: `${beraterName} übernimmt den nächsten Schritt persönlich.`, time: formatRelative(item.created_at) };
  if (item.status === 'kontaktiert') return { rank: 3, icon: 'KON', tone: 'marine', title: `${name} ist jetzt im Gespräch`, text: 'Der persönliche Kontakt ist hergestellt.', time: formatRelative(item.created_at) };
  if (item.link_geoeffnet) return { rank: 2, icon: 'AUF', tone: '', title: `${name} hat deinen Link geöffnet`, text: 'Der erste wichtige Schritt ist geschafft.', time: formatRelative(item.link_geoeffnet_at || item.created_at) };
  if (item.empfehler_vorinformiert) return { rank: 1, icon: 'VER', tone: '', title: `Empfehlung an ${name} versendet`, text: 'Du erfährst hier, sobald der Link geöffnet wird.', time: formatRelative(item.created_at) };
  return { rank: 0, icon: 'NEU', tone: 'terra', title: `Link für ${name} erstellt`, text: 'Der Versand wurde noch nicht bestätigt.', time: formatRelative(item.created_at) };
}

function renderActivities() {
  const wrap = $('#activityList');
  if (!empfehlungen.length) {
    wrap.innerHTML = '<div class="empty-card">Noch keine Neuigkeit. Deine erste Empfehlung erscheint sofort hier.</div>';
    return;
  }
  const items = [...empfehlungen]
    .map(activityFor)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 3);
  wrap.innerHTML = items.map(item => `
    <article class="activity-card">
      <div class="activity-icon ${item.tone}">${escapeHtml(item.icon)}</div>
      <div class="activity-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></div>
      <span class="time">${escapeHtml(item.time)}</span>
    </article>`).join('');
}

function selectedGoal() {
  const reached = stats.kunde || 0;
  return stufen.find(item => item.stufe === empfehler.ziel_stufe)
    || stufen.find(item => item.stufe > reached)
    || stufen[stufen.length - 1]
    || null;
}

function goalImage(item) {
  if (item?.bild_url) return item.bild_url;
  const title = item?.titel || '';
  return GOAL_IMAGE_FALLBACKS.find(([pattern]) => pattern.test(title))?.[1] || '';
}

function renderReward() {
  const card = $('#rewardCard');
  const goal = selectedGoal();
  if (!goal) {
    card.innerHTML = '<div class="empty-inline">Aktuell ist noch kein Wunschziel hinterlegt.</div>';
    return;
  }
  const reached = stats.kunde || 0;
  const remaining = Math.max(0, goal.stufe - reached);
  const progress = Math.min(100, Math.round((reached / Math.max(1, goal.stufe)) * 100));
  const image = goalImage(goal);
  card.innerHTML = `
    <div class="reward-top">
      <div class="reward-mark${image ? ' has-image' : ''}">${image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(goal.titel)}">` : escapeHtml(goal.icon || 'ZIEL')}</div>
      <div class="reward-copy"><strong>${remaining ? `Noch ${remaining} bis ${escapeHtml(goal.titel)}` : `${escapeHtml(goal.titel)} erreicht`}</strong><span>${empfehler.ziel_stufe ? 'Dein ausgewähltes Wunschziel.' : 'Das ist dein nächstes erreichbares Ziel.'}</span></div>
    </div>
    <div class="progress" aria-label="${reached} von ${goal.stufe} erfolgreichen Empfehlungen"><i style="width:${progress}%"></i></div>
    <div class="progress-meta"><span>${reached} ${reached === 1 ? 'erfolgreiche Empfehlung' : 'erfolgreiche Empfehlungen'}</span><span>Ziel: ${goal.stufe}</span></div>`;
}

function renderGoalList() {
  const wrap = $('#goalList');
  wrap.innerHTML = stufen.map(item => {
    const active = item.stufe === empfehler.ziel_stufe;
    const remaining = Math.max(0, item.stufe - (stats.kunde || 0));
    const image = goalImage(item);
    return `<button type="button" class="goal-option${active ? ' active' : ''}" data-goal="${item.stufe}">
      <span class="goal-option-media">${image ? `<img src="${escapeAttr(image)}" alt="" loading="lazy">` : escapeHtml(item.icon || '★')}</span>
      <span><strong>${escapeHtml(item.titel)}</strong><span>${remaining ? `Noch ${remaining} erfolgreiche ${remaining === 1 ? 'Empfehlung' : 'Empfehlungen'}` : 'Bereits erreicht'}</span></span>
      <b>${active ? 'Dein Ziel' : 'Wählen'}</b>
    </button>`;
  }).join('');
  $$('[data-goal]', wrap).forEach(button => button.addEventListener('click', () => chooseGoal(Number(button.dataset.goal))));
}

async function chooseGoal(goal) {
  const previous = empfehler.ziel_stufe;
  empfehler.ziel_stufe = goal;
  renderReward();
  renderGoalList();
  const { error } = await setEmpfehlerZiel(code, goal);
  if (error) {
    empfehler.ziel_stufe = previous;
    renderReward();
    renderGoalList();
    toast('Das Ziel konnte nicht gespeichert werden.');
    return;
  }
  closeOverlay($('#goalOverlay'));
  renderGoalPlan();
  openOverlay($('#goalPlanOverlay'));
  toast('Dein Wunschziel ist gespeichert. Die passenden Plätze sind vorbereitet.');
}

function loadGoalPlan() {
  try {
    const value = JSON.parse(localStorage.getItem(goalPlanKey()) || '[]');
    return Array.isArray(value) ? value.slice(0, 15) : [];
  } catch (_) { return []; }
}

function saveGoalPlan(entries) {
  try { localStorage.setItem(goalPlanKey(), JSON.stringify(entries.slice(0, 15))); } catch (_) {}
}

function captureGoalPlan() {
  const entries = loadGoalPlan();
  $$('.goal-slot').forEach(row => {
    const index = Number(row.dataset.planIndex);
    entries[index] = {
      name: $('[data-plan-name]', row)?.value.trim() || '',
      phone: $('[data-plan-phone]', row)?.value.trim() || '',
    };
  });
  saveGoalPlan(entries);
  return entries;
}

function renderGoalPlan() {
  const goal = selectedGoal();
  if (!goal) return;
  const reached = stats.kunde || 0;
  const remaining = Math.max(0, goal.stufe - reached);
  const entries = loadGoalPlan();
  const image = goalImage(goal);
  $('#goalPlanSummary').innerHTML = `
    ${image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(goal.titel)}">` : `<div class="goal-fallback">${escapeHtml(goal.icon || '★')}</div>`}
    <div><small>Dein Wunschziel</small><strong>${escapeHtml(goal.titel)}</strong><span>${remaining ? `Noch ${remaining} erfolgreiche ${remaining === 1 ? 'Empfehlung' : 'Empfehlungen'} bis zu deinem Ziel.` : 'Dieses Ziel hast du bereits erreicht.'}</span></div>`;
  const list = $('#goalPlanList');
  if (!remaining) {
    list.innerHTML = '<div class="goal-plan-empty">Ziel erreicht. Du kannst jederzeit ein neues Wunschziel wählen.</div>';
    return;
  }
  list.innerHTML = Array.from({ length: remaining }, (_, index) => {
    const entry = entries[index] || {};
    const ready = Boolean(entry.name && entry.phone);
    return `<div class="goal-slot" data-plan-index="${index}">
      <span class="goal-slot-number">${index + 1}</span>
      <input data-plan-name value="${escapeAttr(entry.name || '')}" placeholder="Vorname" autocomplete="off" maxlength="80" aria-label="Vorname für Empfehlung ${index + 1}">
      <input data-plan-phone type="tel" inputmode="tel" value="${escapeAttr(entry.phone || '')}" placeholder="Handynummer" autocomplete="off" maxlength="40" aria-label="Handynummer für Empfehlung ${index + 1}">
      <button class="goal-slot-start" type="button" data-start-plan="${index}" aria-label="Empfehlung ${index + 1} starten"${ready ? '' : ' disabled'}>→</button>
    </div>`;
  }).join('');
  $$('.goal-slot input', list).forEach(input => input.addEventListener('input', () => {
    const row = input.closest('.goal-slot');
    const name = $('[data-plan-name]', row).value.trim();
    const phone = $('[data-plan-phone]', row).value.trim();
    $('[data-start-plan]', row).disabled = !(name && phone);
    captureGoalPlan();
  }));
  $$('[data-start-plan]', list).forEach(button => button.addEventListener('click', () => startPlannedRecommendation(Number(button.dataset.startPlan))));
}

function startPlannedRecommendation(index) {
  const entries = captureGoalPlan();
  const entry = entries[index];
  if (!entry?.name || !entry?.phone) return;
  activePlanIndex = index;
  closeOverlay($('#goalPlanOverlay'));
  openFunnel(false);
  funnel.name = entry.name;
  funnel.phone = entry.phone;
  $('#contactName').value = entry.name;
  $('#contactPhone').value = entry.phone;
  saveDraft();
}

function renderTopics() {
  const wrap = $('#topicGrid');
  wrap.innerHTML = vorlagen.map(template => {
    const meta = TOPIC_META[template.slug] || TOPIC_META.allgemein;
    const active = template.slug === funnel.topic;
    return `<button class="topic-card ${meta.tone}${active ? ' active' : ''}" type="button" data-topic="${escapeAttr(template.slug)}" data-title="${escapeAttr(template.titel || template.slug)}">
      <span class="topic-symbol">${escapeHtml(meta.symbol)}</span>
      <strong>${escapeHtml(template.titel || template.slug)}</strong>
      <span>${escapeHtml(meta.subtitle)}</span>
    </button>`;
  }).join('');
  $$('[data-topic]', wrap).forEach(card => card.addEventListener('click', () => {
    $$('[data-topic]', wrap).forEach(item => item.classList.remove('active'));
    card.classList.add('active');
    funnel.topic = card.dataset.topic;
    funnel.topicTitle = card.dataset.title;
    $('#step2Error').classList.remove('visible');
    saveDraft();
  }));
}

function renderRecommendations() {
  const wrap = $('#recommendationList');
  if (!empfehlungen.length) {
    wrap.innerHTML = '<div class="empty-card">Noch keine Empfehlung. Tippe auf „Jetzt empfehlen“ und leg direkt los.</div>';
    return;
  }
  wrap.innerHTML = empfehlungen.map((item, index) => recommendationHtml(item, index)).join('');

  $$('[data-share]', wrap).forEach(button => button.addEventListener('click', () => shareExisting(button.dataset.share)));
  $$('[data-confirm-send]', wrap).forEach(button => button.addEventListener('click', () => openSendConfirmation(button.dataset.confirmSend)));
  $$('[data-details]', wrap).forEach(button => button.addEventListener('click', () => {
    const panel = $(`#details-${escapeSelector(button.dataset.details)}`);
    if (!panel) return;
    panel.hidden = !panel.hidden;
    button.textContent = panel.hidden ? 'Infos ergänzen' : 'Infos schließen';
  }));
  $$('[data-save-details]', wrap).forEach(button => button.addEventListener('click', () => saveRecommendationDetails(button.dataset.saveDetails)));
}

function recommendationHtml(item, index) {
  const name = item.empfaenger_name || 'Empfehlung';
  const theme = vorlagen.find(template => template.slug === item.vorlage_slug)?.titel || item.vorlage_slug || 'Allgemein';
  const opened = Boolean(item.link_geoeffnet);
  const status = item.status || 'offen';
  const sent = Boolean(item.empfehler_vorinformiert || opened || status !== 'offen');
  const thirdDone = opened || ['anrufwunsch', 'kontaktiert', 'kunde'].includes(status);
  let pill = sent ? 'Versand bestätigt' : 'Link erstellt';
  let pillClass = sent ? 'marine' : '';
  let thirdLabel = 'Geöffnet';
  if (opened) pill = 'Link geöffnet';
  if (status === 'anrufwunsch') { pill = 'Gespräch gewünscht'; pillClass = 'marine'; thirdLabel = 'Terminwunsch'; }
  if (status === 'kontaktiert') { pill = 'Im Gespräch'; pillClass = 'marine'; thirdLabel = 'Kontakt'; }
  if (status === 'kunde') { pill = 'Kunde geworden'; pillClass = 'sage'; thirdLabel = 'Kunde'; }
  if (status === 'kein_interesse') { pill = 'Kein Interesse'; pillClass = 'terra'; thirdLabel = 'Rückmeldung'; }
  const link = recommendationLink(item);
  const detailId = escapeAttr(item.id);
  return `<article class="recommendation-card" data-id="${detailId}">
    <div class="rec-top">
      <div class="avatar ${index % 3 === 1 ? 'sage' : index % 3 === 2 ? 'terra' : ''}">${escapeHtml(initials(name))}</div>
      <div class="rec-name"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(theme)} · ${escapeHtml(formatRelative(item.created_at))}</span></div>
      <span class="pill ${pillClass}">${escapeHtml(pill)}</span>
    </div>
    <div class="timeline"><span class="done">Erstellt</span><span class="${sent ? 'done' : ''}">Versendet</span><span class="${thirdDone ? 'done' : ''}">${escapeHtml(thirdLabel)}</span></div>
    <div class="rec-actions">
      ${!sent ? `<button class="rec-action primary-small" type="button" data-confirm-send="${detailId}">Versand bestätigen</button>` : ''}
      ${link ? `<button class="rec-action" type="button" data-share="${detailId}">Link teilen</button>` : ''}
      <button class="rec-action" type="button" data-details="${detailId}">Infos ergänzen</button>
    </div>
    ${detailsHtml(item)}
  </article>`;
}

function detailsHtml(item) {
  const id = escapeAttr(item.id);
  return `<div class="rec-details" id="details-${id}" hidden>
    <div class="detail-field"><label>Beruf oder Position</label><input type="text" data-f="beruf" value="${escapeAttr(item.empfaenger_beruf || '')}" placeholder="z. B. Architektin, selbständig"></div>
    <div class="detail-field"><label>Verbindung zu dir</label><select data-f="verbindung">${selectOptions(VERBINDUNG_OPTS, item.empfaenger_verbindung)}</select></div>
    <div class="detail-field"><label>Was sollte ${escapeHtml(beraterName)} wissen?</label><textarea data-f="kontext" maxlength="300" placeholder="z. B. kauft gerade ein Haus">${escapeHtml(item.empfaenger_kontext || '')}</textarea></div>
    <div class="detail-two">
      <div class="detail-field"><label>Beste Erreichbarkeit</label><select data-f="erreichbarkeit">${selectOptions(ERREICHBARKEIT_OPTS, item.beste_erreichbarkeit)}</select></div>
      <div class="detail-field"><label>Bevorzugter Kanal</label><select data-f="kanal">${selectOptions(KANAL_OPTS, item.bevorzugter_kanal)}</select></div>
    </div>
    <label class="detail-check"><input type="checkbox" data-f="vorinformiert"${item.empfehler_vorinformiert ? ' checked' : ''}> Ich habe ${escapeHtml(firstName(item.empfaenger_name))} schon Bescheid gegeben.</label>
    <div class="detail-field"><label>Persönlicher Satz für diese Empfehlung</label><textarea data-f="nachricht" maxlength="240" placeholder="Optional">${escapeHtml(item.empfehler_nachricht || '')}</textarea></div>
    <button class="rec-action primary-small" type="button" data-save-details="${id}">Infos speichern</button>
  </div>`;
}

async function saveRecommendationDetails(id) {
  const panel = $(`#details-${escapeSelector(id)}`);
  const item = empfehlungen.find(entry => entry.id === id);
  if (!panel || !item) return;
  const field = name => $(`[data-f="${name}"]`, panel);
  const values = {
    beruf: field('beruf').value.trim(),
    verbindung: field('verbindung').value,
    kontext: field('kontext').value.trim(),
    erreichbarkeit: field('erreichbarkeit').value,
    kanal: field('kanal').value,
    vorinformiert: field('vorinformiert').checked,
    nachricht: field('nachricht').value.trim(),
  };
  const button = $('[data-save-details]', panel);
  button.disabled = true;
  button.textContent = 'Speichert';
  const { error } = await updateEmpfehlungKontext(code, id, values);
  button.disabled = false;
  button.textContent = 'Infos speichern';
  if (error) { toast('Die Infos konnten nicht gespeichert werden.'); return; }
  await refreshData({ quiet: true });
  toast('Die Infos sind bei Kai angekommen.');
}

function renderSettings() {
  const textarea = $('#defaultMessage');
  textarea.value = empfehler.standard_nachricht || '';
  $('#defaultMessageCount').textContent = `${textarea.value.length}/240`;
}

function bindStaticControls() {
  $$('.start-funnel').forEach(button => button.addEventListener('click', () => openFunnel(false)));
  $('#resumeDraft').addEventListener('click', () => openFunnel(true));
  $('#closeFunnel').addEventListener('click', closeFunnel);
  $('#nextStep').addEventListener('click', nextStep);
  $('#saveLater').addEventListener('click', previousOrSave);
  $$('.template-card').forEach(card => card.addEventListener('click', () => selectMessageTemplate(card)));
  $('#confirmSent').addEventListener('click', confirmSent);
  $('#confirmLater').addEventListener('click', () => {
    closeOverlay($('#confirmOverlay'));
    $('#history').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Im Verlauf gemerkt. Du kannst den Versand später bestätigen.');
  });
  $('#changeGoal').addEventListener('click', () => openOverlay($('#goalOverlay')));
  $('#closeGoal').addEventListener('click', () => closeOverlay($('#goalOverlay')));
  $('#closeGoalPlan').addEventListener('click', () => { captureGoalPlan(); closeOverlay($('#goalPlanOverlay')); });
  $('#goalPlanLater').addEventListener('click', () => { captureGoalPlan(); closeOverlay($('#goalPlanOverlay')); toast('Deine vorbereiteten Empfehlungen bleiben gespeichert.'); });
  $('#changeGoalFromPlan').addEventListener('click', () => { captureGoalPlan(); closeOverlay($('#goalPlanOverlay')); openOverlay($('#goalOverlay')); });
  $('#noticeOpen').addEventListener('click', openNotices);
  $('#noticeClose').addEventListener('click', closeNotices);
  $('#noticePanel').addEventListener('click', event => { if (event.target === $('#noticePanel')) closeNotices(); });
  $('#markRead').addEventListener('click', markNoticesRead);
  $('#refreshButton').addEventListener('click', () => refreshData({ quiet: false }));
  $('#navHome').addEventListener('click', () => $('#top').scrollIntoView({ behavior: 'smooth' }));
  $('#navHistory').addEventListener('click', () => $('#history').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  $('#defaultMessage').addEventListener('input', event => { $('#defaultMessageCount').textContent = `${event.target.value.length}/240`; });
  $('#saveDefaultMessage').addEventListener('click', saveDefaultMessage);
  $$('#notifyChoices .choice-chip').forEach(chip => chip.addEventListener('click', () => saveNotificationChoice(chip)));
  $('#funnelOverlay').addEventListener('click', event => { if (event.target === $('#funnelOverlay')) closeFunnel(); });
  window.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', window.scrollY > 8), { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if ($('#funnelOverlay').classList.contains('open')) closeFunnel();
    if ($('#noticePanel').classList.contains('open')) closeNotices();
    if ($('#goalOverlay').classList.contains('open')) closeOverlay($('#goalOverlay'));
    if ($('#goalPlanOverlay').classList.contains('open')) { captureGoalPlan(); closeOverlay($('#goalPlanOverlay')); }
  });
}

function openFunnel(useDraft) {
  if (useDraft) {
    const draft = loadDraft();
    if (draft) Object.assign(funnel, draft);
  } else {
    Object.assign(funnel, { step: 1, name: '', phone: '', topic: '', topicTitle: '', template: 'warm', message: '' });
  }
  $('#contactName').value = funnel.name || '';
  $('#contactPhone').value = funnel.phone || '';
  $('#personalMessage').value = funnel.message || '';
  $$('.template-card').forEach(card => card.classList.toggle('active', card.dataset.template === funnel.template));
  renderTopics();
  renderFunnelStep();
  openOverlay($('#funnelOverlay'));
  if (funnel.step === 1) setTimeout(() => $('#contactName').focus(), 220);
}

function closeFunnel() {
  captureFunnelFields();
  if (hasDraftContent()) {
    saveDraft();
    toast('Dein Entwurf ist auf diesem Gerät gespeichert.');
  }
  closeOverlay($('#funnelOverlay'));
}

function previousOrSave() {
  captureFunnelFields();
  if (funnel.step > 1) {
    funnel.step -= 1;
    saveDraft();
    renderFunnelStep();
    return;
  }
  closeFunnel();
}

function nextStep() {
  captureFunnelFields();
  if (funnel.step === 1 && (!funnel.name || !funnel.phone)) {
    $('#step1Error').textContent = !funnel.name ? 'Bitte trage den Vornamen ein.' : 'Bitte trage die Handynummer ein.';
    $('#step1Error').classList.add('visible');
    (!funnel.name ? $('#contactName') : $('#contactPhone')).focus();
    return;
  }
  $('#step1Error').classList.remove('visible');
  if (funnel.step === 2 && !funnel.topic) {
    $('#step2Error').classList.add('visible');
    return;
  }
  if (funnel.step < 4) {
    funnel.step += 1;
    if (funnel.step === 3 && !funnel.message) funnel.message = buildMessage();
    saveDraft();
    renderFunnelStep();
    return;
  }
  createAndShareRecommendation();
}

function renderFunnelStep() {
  $$('.step').forEach(step => step.classList.toggle('active', Number(step.dataset.step) === funnel.step));
  $$('#stepProgress i').forEach((bar, index) => bar.classList.toggle('on', index < funnel.step));
  $('#stepNumber').textContent = `${funnel.step} von 4`;
  $('#nextStep').textContent = funnel.step === 4 ? (funnel.phone ? 'Link erstellen und WhatsApp öffnen' : 'Link erstellen und teilen') : 'Weiter';
  $('#saveLater').textContent = funnel.step === 1 ? 'Für später speichern' : 'Zurück';
  if (funnel.step === 3) $('#personalMessage').value = funnel.message || buildMessage();
  if (funnel.step === 4) renderMessagePreview();
  $('.step-content').scrollTop = 0;
}

function captureFunnelFields() {
  funnel.name = $('#contactName').value.trim();
  funnel.phone = $('#contactPhone').value.trim();
  funnel.message = $('#personalMessage').value.trim();
}

function selectMessageTemplate(card) {
  $$('.template-card').forEach(item => item.classList.remove('active'));
  card.classList.add('active');
  funnel.template = card.dataset.template;
  funnel.message = buildMessage();
  $('#personalMessage').value = funnel.message;
  saveDraft();
}

function buildMessage() {
  const name = funnel.name || 'Anna';
  const topic = funnel.topicTitle || 'deinem Finanzthema';
  return messageTemplates[funnel.template](name, topic, beraterName);
}

function renderMessagePreview() {
  funnel.message = funnel.message || buildMessage();
  $('#previewName').textContent = funnel.name;
  $('#previewInitials').textContent = initials(funnel.name);
  $('#previewTopic').textContent = funnel.topicTitle;
  $('#messagePreview').innerHTML = `${escapeHtml(funnel.message).replace(/\n/g, '<br>')}<span class="message-link">Dein persönlicher Empfehlungslink</span>`;
}

async function createAndShareRecommendation() {
  const button = $('#nextStep');
  button.disabled = true;
  button.textContent = 'Link wird erstellt';
  const normalizedPhone = normalizePhoneDE(funnel.phone);
  const shareWindow = normalizedPhone ? window.open('', '_blank') : null;
  const { data, error } = await createEmpfehlung({
    empfaenger_name: funnel.name,
    empfaenger_telefon: normalizedPhone || null,
    nachricht: funnel.message || buildMessage(),
    vorlage_slug: funnel.topic || 'allgemein',
    empfehler_id: empfehler.id,
    berater_id: empfehler.berater_id || window.ENV_BERATER_ID,
    typ: 'info',
  });

  button.disabled = false;
  button.textContent = normalizedPhone ? 'Link erstellen und WhatsApp öffnen' : 'Link erstellen und teilen';
  if (error || !data?.link_token) {
    if (shareWindow) shareWindow.close();
    toast('Der Link konnte nicht erstellt werden. Bitte versuche es noch einmal.');
    return;
  }

  const link = `${window.location.origin}/e?token=${encodeURIComponent(data.link_token)}&vorlage=${encodeURIComponent(funnel.topic || 'allgemein')}`;
  const message = `${funnel.message || buildMessage()} ${link}`;
  pendingRecommendationId = data.id;
  pendingRecommendationName = funnel.name;
  if (activePlanIndex !== null) {
    const entries = loadGoalPlan();
    entries[activePlanIndex] = { name: '', phone: '' };
    saveGoalPlan(entries);
    activePlanIndex = null;
  }
  clearDraft();
  closeOverlay($('#funnelOverlay'));

  if (normalizedPhone && shareWindow) {
    shareWindow.location.href = `https://wa.me/${normalizedPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  } else {
    await shareLink({ title: `Empfehlung für ${funnel.name}`, text: funnel.message || buildMessage(), url: link });
  }

  await refreshData({ quiet: true });
  $('#confirmTitle').textContent = `Der Link für ${pendingRecommendationName} ist erstellt.`;
  openOverlay($('#confirmOverlay'));
}

function openSendConfirmation(id) {
  const item = empfehlungen.find(entry => entry.id === id);
  if (!item) return;
  pendingRecommendationId = id;
  pendingRecommendationName = firstName(item.empfaenger_name);
  $('#confirmTitle').textContent = `Der Link für ${pendingRecommendationName} ist erstellt.`;
  openOverlay($('#confirmOverlay'));
}

async function confirmSent() {
  const item = empfehlungen.find(entry => entry.id === pendingRecommendationId);
  if (!item) {
    closeOverlay($('#confirmOverlay'));
    toast('Bitte aktualisiere den Verlauf und versuche es erneut.');
    return;
  }
  $('#confirmSent').disabled = true;
  const { error } = await updateEmpfehlungKontext(code, item.id, contextFields(item, true));
  $('#confirmSent').disabled = false;
  if (error) { toast('Die Bestätigung konnte nicht gespeichert werden.'); return; }
  closeOverlay($('#confirmOverlay'));
  await refreshData({ quiet: true });
  $('#history').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('Versand bestätigt. Ab jetzt bleibt der Status automatisch aktuell.');
}

function contextFields(item, vorinformiert = item.empfehler_vorinformiert) {
  return {
    beruf: item.empfaenger_beruf || '',
    verbindung: item.empfaenger_verbindung || '',
    kontext: item.empfaenger_kontext || '',
    erreichbarkeit: item.beste_erreichbarkeit || '',
    kanal: item.bevorzugter_kanal || '',
    vorinformiert,
    nachricht: item.empfehler_nachricht || '',
  };
}

async function shareExisting(id) {
  const item = empfehlungen.find(entry => entry.id === id);
  if (!item) return;
  const link = recommendationLink(item);
  if (!link) return;
  const text = `Hi ${firstName(item.empfaenger_name)}, hier ist noch einmal dein persönlicher Link von ${beraterName}:`;
  await shareLink({ title: `Empfehlung für ${firstName(item.empfaenger_name)}`, text, url: link });
}

async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; } catch (error) { if (error?.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast('Link und Nachricht wurden kopiert.');
  } catch (_) {
    window.prompt('Diesen Link kopieren:', url);
  }
}

function recommendationLink(item) {
  if (!item.link_token) return '';
  return `${window.location.origin}/e?token=${encodeURIComponent(item.link_token)}${item.vorlage_slug ? `&vorlage=${encodeURIComponent(item.vorlage_slug)}` : ''}`;
}

function saveDraft() {
  captureFunnelFields();
  if (!hasDraftContent()) return;
  try { localStorage.setItem(draftKey(), JSON.stringify(funnel)); } catch (_) {}
  $('#resumeDraft').classList.add('visible');
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (_) { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(draftKey()); } catch (_) {}
  $('#resumeDraft').classList.remove('visible');
}

function hasDraftContent() {
  return Boolean(funnel.name || funnel.phone || funnel.topic || funnel.message);
}

async function saveDefaultMessage() {
  const button = $('#saveDefaultMessage');
  const text = $('#defaultMessage').value.trim();
  button.disabled = true;
  button.textContent = 'Speichert';
  const { error } = await updateEmpfehlerStandardNachricht(code, text);
  button.disabled = false;
  button.textContent = 'Nachricht speichern';
  if (error) { toast('Die Nachricht konnte nicht gespeichert werden.'); return; }
  empfehler.standard_nachricht = text;
  toast('Deine persönliche Nachricht ist gespeichert.');
}

function restoreLocalPreferences() {
  let frequency = 'sofort';
  try { frequency = localStorage.getItem(notificationKey()) || 'sofort'; } catch (_) {}
  $$('#notifyChoices .choice-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.frequency === frequency));
}

function saveNotificationChoice(chip) {
  $$('#notifyChoices .choice-chip').forEach(item => item.classList.remove('active'));
  chip.classList.add('active');
  try { localStorage.setItem(notificationKey(), chip.dataset.frequency); } catch (_) {}
  toast(`Erinnerungen: ${chip.textContent}`);
}

function detectChanges(list) {
  let previous = null;
  try { previous = JSON.parse(localStorage.getItem(snapshotKey()) || 'null'); } catch (_) {}
  const current = Object.fromEntries(list.map(item => [item.id, `${item.status}|${Boolean(item.link_geoeffnet)}|${Boolean(item.empfehler_vorinformiert)}`]));
  sessionChanges = [];
  if (previous) {
    list.forEach(item => {
      if (previous[item.id] && previous[item.id] !== current[item.id]) sessionChanges.push(item);
    });
  } else {
    try { localStorage.setItem(snapshotKey(), JSON.stringify(current)); } catch (_) {}
  }
  $('#unreadDot').hidden = sessionChanges.length === 0;
}

function renderNotices() {
  const list = $('#noticeList');
  if (!empfehlungen.length) {
    list.innerHTML = '<div class="empty-card">Noch keine Neuigkeit vorhanden.</div>';
    return;
  }
  const entries = [...empfehlungen].slice(0, 6).map(item => ({ item, activity: activityFor(item), changed: sessionChanges.some(change => change.id === item.id) }));
  list.innerHTML = `<div class="eyebrow">Aktuell</div>` + entries.map(({ activity, changed }) => `
    <article class="notice-item${changed ? ' new' : ''}"><strong>${escapeHtml(activity.title)}</strong><p>${escapeHtml(activity.text)} · ${escapeHtml(activity.time)}</p></article>`).join('');
}

function openNotices() {
  renderNotices();
  $('#noticePanel').classList.add('open');
  $('#noticePanel').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  markNoticesRead(false);
}

function closeNotices() {
  $('#noticePanel').classList.remove('open');
  $('#noticePanel').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function markNoticesRead(showToast = true) {
  sessionChanges = [];
  $('#unreadDot').hidden = true;
  const current = Object.fromEntries(empfehlungen.map(item => [item.id, `${item.status}|${Boolean(item.link_geoeffnet)}|${Boolean(item.empfehler_vorinformiert)}`]));
  try { localStorage.setItem(snapshotKey(), JSON.stringify(current)); } catch (_) {}
  if (showToast) toast('Alles als gelesen markiert.');
}

function startRefreshCycle() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') refreshData({ quiet: true });
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshData({ quiet: true });
  });
}

async function refreshData({ quiet = true } = {}) {
  if (isRefreshing || !empfehler) return;
  isRefreshing = true;
  if (!quiet) {
    $('#refreshButton').disabled = true;
    $('#refreshButton').textContent = 'Lädt';
  }
  const [statsRes, listRes] = await Promise.all([getEmpfehlerStats(code), getEmpfehlerEmpfehlungen(code)]);
  if (statsRes.data) stats = statsRes.data;
  if (!listRes.error) {
    const previousSignatures = Object.fromEntries(empfehlungen.map(item => [item.id, `${item.status}|${Boolean(item.link_geoeffnet)}|${Boolean(item.empfehler_vorinformiert)}`]));
    empfehlungen = listRes.data || [];
    const changedNow = empfehlungen.filter(item => previousSignatures[item.id] && previousSignatures[item.id] !== `${item.status}|${Boolean(item.link_geoeffnet)}|${Boolean(item.empfehler_vorinformiert)}`);
    if (changedNow.length) {
      sessionChanges = [...changedNow, ...sessionChanges.filter(old => !changedNow.some(item => item.id === old.id))];
      $('#unreadDot').hidden = false;
    }
  }
  renderGreeting();
  renderMetrics();
  renderActivities();
  renderReward();
  renderGoalList();
  renderRecommendations();
  renderNotices();
  if (!quiet) {
    $('#refreshButton').disabled = false;
    $('#refreshButton').textContent = 'Aktualisieren';
    toast('Dein Stand ist aktuell.');
  }
  isRefreshing = false;
}

function openOverlay(overlay) {
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeOverlay(overlay) {
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  if (!$$('.overlay.open').length && !$('#noticePanel').classList.contains('open')) document.body.style.overflow = '';
}

function normalizePhoneDE(raw) {
  let phone = String(raw || '').replace(/[^\d+]/g, '');
  if (!phone) return '';
  if (phone.startsWith('+')) return phone;
  if (phone.startsWith('00')) return `+${phone.slice(2)}`;
  if (phone.startsWith('0')) return `+49${phone.slice(1)}`;
  return `+${phone}`;
}

function selectOptions(pairs, selected) {
  return pairs.map(([value, label]) => `<option value="${escapeAttr(value)}"${value === (selected || '') ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function formatRelative(timestamp) {
  if (!timestamp) return '';
  const date = parseDbDate(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function firstName(value) { return String(value || '').trim().split(/\s+/)[0] || ''; }
function initials(value) { return String(value || '?').trim().slice(0, 2).toUpperCase(); }
function escapeSelector(value) { return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, ''); }

function toast(text) {
  const element = $('#toast');
  element.textContent = text;
  element.classList.add('show');
  clearTimeout(element._timer);
  element._timer = setTimeout(() => element.classList.remove('show'), 2800);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function escapeAttr(value) { return escapeHtml(value); }
