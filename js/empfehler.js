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
  parseDbDate,
} from './supabase.js';
import { applyBeraterBrand } from './berater-brand.js';

const params = new URLSearchParams(window.location.search);
const codeFromUrl = params.get('code');
const codeFromStorage = (() => { try { return localStorage.getItem('empfehler_code'); } catch (_) { return null; } })();
const code = codeFromUrl || codeFromStorage;

if (!code) {
  window.location.href = 'programm.html';
} else {
  try { localStorage.setItem('empfehler_code', code); } catch (_) {}
  init();
}

const STATUS_LABEL = {
  offen: 'Offen',
  anrufwunsch: 'Anrufwunsch',
  kontaktiert: 'Kontaktiert',
  kunde: 'Kunde',
  kein_interesse: 'Kein Interesse',
};

// Auswahl-Optionen 1:1 wie im ausführlichen Formular (empfehlen.html)
const VERBINDUNG_OPTS = [
  ['', '— wählen —'], ['Familie', 'Familie'], ['Lebenspartner', 'Lebenspartner'],
  ['Freund', 'Freund / Freundin'], ['Arbeitskollege', 'Arbeitskollege / -kollegin'],
  ['Vereinskollege', 'Verein / Sport'], ['Nachbar', 'Nachbar / Nachbarin'],
  ['Bekannter', 'Bekannte / Bekannter'], ['Sonstiges', 'Sonstiges'],
];
const ERREICHBARKEIT_OPTS = [
  ['', '— wenn du es weißt —'], ['vormittag', 'Vormittag (8–12 Uhr)'], ['mittag', 'Mittag (12–14 Uhr)'],
  ['nachmittag', 'Nachmittag (14–18 Uhr)'], ['abend', 'Abend (18–21 Uhr)'], ['we', 'Am Wochenende'],
];
const KANAL_OPTS = [
  ['', '— wenn du es weißt —'], ['anruf', 'Telefon-Anruf'], ['whatsapp', 'WhatsApp'],
  ['sms', 'SMS'], ['email', 'Email'],
];
function selectOptions(pairs, selected) {
  return pairs.map(([v, l]) => `<option value="${escapeAttr(v)}"${v === (selected || '') ? ' selected' : ''}>${escapeHtml(l)}</option>`).join('');
}

// Modul-Status
let empfehler = null;   // { id, code, name, berater_id, ziel_stufe }
let stufen = [];
let stats = null;
let vorlagen = [];
let beraterName = '';
let currentCount = 5;

async function init() {
  const [empRes, statsRes, listRes, stufenData] = await Promise.all([
    getEmpfehlerByCode(code),
    getEmpfehlerStats(code),
    getEmpfehlerEmpfehlungen(code),
    getBelohnungsStufen(),
  ]);

  empfehler = empRes.data;
  stats = statsRes.data;
  stufen = stufenData || [];
  const empfehlungen = listRes.data || [];

  if (empfehler?.berater_id) {
    const { data: berater } = await getBeraterPublicById(empfehler.berater_id);
    if (berater) { applyBeraterBrand(berater); beraterName = berater.name || ''; }
  }

  if (!stats || !empfehler) {
    document.getElementById('p7Hallo').textContent = 'Code unbekannt.';
    document.getElementById('p7Status').textContent = 'Bitte prüfe deinen Link oder erstelle einen neuen Code unter /programm.';
    document.querySelectorAll('section.e-section:not(:first-of-type), footer').forEach(s => s.style.display = 'none');
    return;
  }

  renderGreeting();
  renderZiel();
  renderRewardsList();
  renderFeed(empfehlungen);
  initEntryTool();

  const empfehlenUrl = `empfehlen.html?code=${encodeURIComponent(code)}`;
  const c1 = document.getElementById('p7CtaEmpfehlen');
  const c2 = document.getElementById('p7CtaNeu');
  if (c1) c1.href = empfehlenUrl;
  if (c2) c2.href = empfehlenUrl;
}

/* ---------- Nach neuer Empfehlung: Stats/Feed/Ziel/Belohnungen frisch ---------- */
async function refresh() {
  const [statsRes, listRes] = await Promise.all([
    getEmpfehlerStats(code),
    getEmpfehlerEmpfehlungen(code),
  ]);
  stats = statsRes.data || stats;
  renderZiel();
  renderRewardsList();
  renderFeed(listRes.data || []);
}

function renderGreeting() {
  const firstName = (stats.name || empfehler.name || '').split(' ')[0] || 'Hallo';
  document.getElementById('p7Hallo').textContent = `Hallo ${firstName}.`;

  if (params.get('neu') === '1') {
    document.getElementById('p7Greet').textContent = 'Glückwunsch';
    document.getElementById('p7Status').textContent = 'Dein persönlicher Empfehler-Link ist da. Wähle unten dein Ziel und leg direkt los.';
  } else {
    document.getElementById('p7Status').textContent = 'Schön, dass du da bist. Hier ist dein Stand — und dein persönliches Eingabefeld.';
  }

  document.getElementById('p7StatsBig').textContent = stats.kunde || 0;

  const nextEl = document.getElementById('p7NextStufe');
  const reached = stats.kunde || 0;
  const next = stufen.find(s => s.stufe > reached);
  if (next) {
    const diff = next.stufe - reached;
    nextEl.innerHTML = `Noch <strong>${diff}</strong> bis zur ${next.icon || '★'} <strong>${escapeHtml(next.titel)}</strong>`;
  } else {
    nextEl.innerHTML = `Du hast alle Stufen erreicht. <strong>Wahnsinn.</strong>`;
  }
}

/* ---------- Ziel-Banner (gewählte Belohnung + Fortschritt: beides) ---------- */
function renderZiel() {
  const el = document.getElementById('p7ZielBanner');
  if (!el) return;
  const zielStufe = empfehler.ziel_stufe;
  const abgegeben = stats.gesamt ?? 0;
  const kunde = stats.kunde ?? 0;

  if (!zielStufe) {
    el.hidden = false;
    el.className = 'e-ziel is-empty';
    el.innerHTML = `<span class="e-ziel-hint">Wähle unten deine Wunsch-Belohnung als Ziel — z.&nbsp;B. den Weber-Grill. Dann siehst du hier jederzeit deinen Fortschritt.</span>`;
    return;
  }
  const s = stufen.find(x => x.stufe === zielStufe);
  const titel = s ? s.titel : `Stufe ${zielStufe}`;
  const icon = s ? (s.icon || '★') : '★';
  const rest = Math.max(0, zielStufe - kunde);
  el.hidden = false;
  el.className = 'e-ziel';
  el.innerHTML = `
    <div class="e-ziel-head">
      <span class="e-ziel-label">Dein Ziel</span>
      <span class="e-ziel-titel">${icon} ${escapeHtml(titel)}</span>
    </div>
    <div class="e-ziel-progress">
      <span class="e-ziel-num"><strong>${abgegeben}</strong> abgegeben</span>
      <span class="e-ziel-sep">·</span>
      <span class="e-ziel-num"><strong>${kunde}</strong> Kunde geworden</span>
      <span class="e-ziel-sep">·</span>
      <span class="e-ziel-goal">${rest === 0 ? 'Ziel erreicht 🎉' : `noch <strong>${rest}</strong> bis zur Belohnung`}</span>
    </div>`;
}

/* ---------- Belohnungs-Treppe (klickbar: Ziel wählen) ---------- */
function renderRewardsList() {
  const wrap = document.getElementById('p7RewardsList');
  const reached = stats.kunde || 0;
  const zielStufe = empfehler.ziel_stufe;

  wrap.innerHTML = stufen.map(s => {
    const isReached = reached >= s.stufe;
    const isHighlight = s.highlight;
    const isZiel = zielStufe === s.stufe;
    const cls = isReached ? 'reached' : 'pending';
    const mark = isReached
      ? '<span class="e-reward-status">Erreicht</span>'
      : `<span class="e-reward-status">${s.stufe - reached} bis hier</span>`;
    const goalBtn = isZiel
      ? `<button type="button" class="e-reward-goal is-active" data-stufe="${s.stufe}">Dein Ziel ✓</button>`
      : `<button type="button" class="e-reward-goal" data-stufe="${s.stufe}">Als Ziel wählen</button>`;
    return `
      <div class="e-reward ${isHighlight ? 'highlight' : ''} ${cls} ${isZiel ? 'is-ziel' : ''}">
        <div class="e-reward-icon">${s.icon || '★'}</div>
        <div class="e-reward-body">
          <div class="e-reward-stufe">Stufe ${s.stufe}</div>
          <h3 class="e-reward-titel">${escapeHtml(s.titel)}</h3>
          <p class="e-reward-text">${escapeHtml(s.beschreibung)}</p>
          ${s.wert_label ? `<span class="e-reward-wert">Wert: ${escapeHtml(s.wert_label)}</span>` : ''}
          ${goalBtn}
        </div>
        ${mark}
      </div>`;
  }).join('');

  wrap.querySelectorAll('.e-reward-goal').forEach(btn => {
    btn.addEventListener('click', () => chooseZiel(Number(btn.dataset.stufe)));
  });
}

async function chooseZiel(stufe) {
  const prev = empfehler.ziel_stufe;
  empfehler.ziel_stufe = stufe;
  renderZiel();
  renderRewardsList();
  // Eingabe-Tool auf die benötigte Anzahl vorbelegen + hinscrollen
  setCount(stufe);
  document.getElementById('p7Eintragen')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const s = stufen.find(x => x.stufe === stufe);
  toast(`Ziel gesetzt: ${s ? s.titel : 'Stufe ' + stufe} 🎯`);
  const { error } = await setEmpfehlerZiel(code, stufe);
  if (error) { empfehler.ziel_stufe = prev; renderZiel(); renderRewardsList(); toast('Konnte Ziel nicht speichern.'); }
}

/* ---------- Eingabe-Tool (Kontakte eintragen → Link erstellen & senden) ---------- */
const DRAFT_KEY = () => `empfehler_entry_draft_${code}`;
let rowsEl, chipsEl, freeEl;

function initEntryTool() {
  rowsEl = document.getElementById('p7Rows');
  chipsEl = document.getElementById('p7Chips');
  freeEl = document.getElementById('p7Free');
  if (!rowsEl || !chipsEl) return;

  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.potenzial-chip[data-count]');
    if (!chip) return;
    if (freeEl) freeEl.value = '';
    setCount(Number(chip.dataset.count));
  });
  if (freeEl) freeEl.addEventListener('input', () => { const v = Number(freeEl.value); if (v >= 1) setCount(v); });

  rowsEl.addEventListener('input', saveDraft);
  rowsEl.addEventListener('change', saveDraft);
  rowsEl.addEventListener('click', onRowSend);

  document.getElementById('p7Clear')?.addEventListener('click', () => { clearDraft(); renderRows(currentCount); });

  const draft = loadDraft();
  if (draft && Array.isArray(draft.rows) && draft.rows.length) setCount(draft.count || draft.rows.length, draft.rows);
  else setCount(currentCount);
}

function themeOptions(selected) {
  return vorlagen.length
    ? vorlagen.map(v => `<option value="${escapeAttr(v.slug)}"${v.slug === selected ? ' selected' : ''}>${escapeHtml(v.titel || v.slug)}</option>`).join('')
    : '<option value="allgemein">Allgemein</option>';
}

function renderRows(n, saved) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const s = saved && saved[i - 1] ? saved[i - 1] : null;
    const nameV = s ? escapeAttr(s.name || '') : '';
    const telV = s ? escapeAttr(s.tel || '') : '';
    const done = !!(s && s.done);
    const btnLabel = done ? (s.teln ? 'Erneut senden' : 'Link kopieren') : 'Link erstellen &amp; senden';
    const statusHtml = done ? 'Link erstellt ✓' : '';
    const statusCls = done ? 'potenzial-status is-done' : 'potenzial-status';
    const dataAttrs = done
      ? ` data-done="1" data-link="${escapeAttr(s.link || '')}" data-msg="${escapeAttr(s.msg || '')}" data-tel="${escapeAttr(s.teln || '')}"`
      : '';
    rows.push(`
      <div class="potenzial-row${done ? ' is-done' : ''}" data-row="${i}"${dataAttrs}>
        <span class="potenzial-row-num">${i}</span>
        <input type="text" class="potenzial-f" data-f="name" placeholder="Name" autocomplete="off" aria-label="Name Kontakt ${i}" value="${nameV}"${done ? ' readonly' : ''} />
        <input type="tel" class="potenzial-f" data-f="tel" placeholder="Telefon" autocomplete="off" aria-label="Telefon Kontakt ${i}" value="${telV}"${done ? ' readonly' : ''} />
        <select class="potenzial-f" data-f="thema" aria-label="Thema Kontakt ${i}"${done ? ' disabled' : ''}>${themeOptions(s ? s.thema : 'allgemein')}</select>
        <button type="button" class="potenzial-send${done ? ' is-secondary' : ''}" data-send="${i}">${btnLabel}</button>
        <span class="${statusCls}" data-status="${i}">${statusHtml}</span>
      </div>`);
  }
  rowsEl.innerHTML = rows.join('');
}

function setCount(n, saved) {
  currentCount = Math.max(1, Math.min(15, n | 0));
  chipsEl.querySelectorAll('.potenzial-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.count && Number(c.dataset.count) === currentCount);
  });
  renderRows(currentCount, saved);
  saveDraft();
}

async function onRowSend(e) {
  const btn = e.target.closest('.potenzial-send');
  if (!btn) return;
  const row = btn.closest('.potenzial-row');
  if (!row) return;

  if (row.dataset.done === '1') {
    e.preventDefault();
    const link = row.dataset.link;
    const tel = row.dataset.tel;
    if (tel) {
      window.open(`https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(row.dataset.msg || link)}`, '_blank');
    } else {
      try { await navigator.clipboard.writeText(link); const st = row.querySelector('.potenzial-status'); if (st) st.innerHTML = 'Kopiert ✓'; } catch (_) {}
    }
    return;
  }

  const name = row.querySelector('[data-f="name"]').value.trim();
  const telRaw = row.querySelector('[data-f="tel"]').value.trim();
  const slug = row.querySelector('[data-f="thema"]').value || 'allgemein';
  const statusEl = row.querySelector('.potenzial-status');
  if (!name) { statusEl.textContent = 'Name fehlt'; statusEl.className = 'potenzial-status is-error'; return; }
  if (!telRaw) { statusEl.textContent = 'Telefonnummer fehlt'; statusEl.className = 'potenzial-status is-error'; return; }

  const tel = normalizePhoneDE(telRaw);
  btn.disabled = true;
  const prevLabel = btn.textContent;
  btn.textContent = 'Erstelle…';
  try {
    const { data, error } = await createEmpfehlung({
      empfaenger_name: name,
      empfaenger_telefon: tel || null,
      vorlage_slug: slug,
      empfehler_id: empfehler.id,
      berater_id: empfehler.berater_id || window.ENV_BERATER_ID,
      typ: 'info',
    });
    if (error) throw error;
    const token = data?.link_token || 'demo';
    const link = `${window.location.origin}/e?token=${token}&vorlage=${encodeURIComponent(slug)}`;
    const vorname = name.split(' ')[0];
    const msg = buildPotenzialMessage(vorname, link, (beraterName.split(' ')[0] || ''));
    if (tel) window.open(`https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    else { try { await navigator.clipboard.writeText(link); } catch (_) {} }

    row.dataset.done = '1';
    row.classList.add('is-done');
    row.dataset.link = link; row.dataset.msg = msg; row.dataset.tel = tel;
    statusEl.innerHTML = 'Link erstellt ✓';
    statusEl.className = 'potenzial-status is-done';
    btn.textContent = tel ? 'Erneut senden' : 'Link kopieren';
    btn.classList.add('is-secondary');
    btn.disabled = false;
    row.querySelectorAll('.potenzial-f').forEach(f => { f.readOnly = true; if (f.tagName === 'SELECT') f.disabled = true; });
    saveDraft();
    refresh(); // Stats/Ziel/Belohnungen/Feed aktualisieren
  } catch (err) {
    console.warn('[empfehler] createEmpfehlung fehlgeschlagen', err);
    statusEl.textContent = 'Fehler, bitte nochmal';
    statusEl.className = 'potenzial-status is-error';
    btn.disabled = false;
    btn.textContent = prevLabel;
  }
}

function saveDraft() {
  if (!rowsEl) return;
  const rows = [...rowsEl.querySelectorAll('.potenzial-row')].map(r => ({
    name: r.querySelector('[data-f="name"]').value,
    tel: r.querySelector('[data-f="tel"]').value,
    thema: r.querySelector('[data-f="thema"]').value,
    done: r.dataset.done === '1',
    link: r.dataset.link || '', msg: r.dataset.msg || '', teln: r.dataset.tel || '',
  }));
  try { localStorage.setItem(DRAFT_KEY(), JSON.stringify({ count: currentCount, rows })); } catch (_) {}
}
function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY()) || 'null'); } catch (_) { return null; } }
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY()); } catch (_) {} }

/* ---------- Feed ---------- */
function renderFeed(empfehlungen) {
  const wrap = document.getElementById('p7Feed');
  if (!empfehlungen.length) {
    wrap.innerHTML = '<div class="e-empty">Noch keine Empfehlung. Trag oben deine Kontakte ein und leg los.</div>';
    return;
  }
  const origin = window.location.origin;
  wrap.innerHTML = '<div class="e-feed">' + empfehlungen.map(e => {
    const geoeffnet = !!e.link_geoeffnet;
    const linkInfo = geoeffnet
      ? `<span class="e-link-status is-open">Link geöffnet ✓${e.link_geoeffnet_at ? ' · ' + formatDate(e.link_geoeffnet_at) : ''}</span>`
      : `<span class="e-link-status">Link noch nicht geöffnet</span>`;
    const link = e.link_token ? `${origin}/e?token=${encodeURIComponent(e.link_token)}${e.vorlage_slug ? '&vorlage=' + encodeURIComponent(e.vorlage_slug) : ''}` : '';
    const copyBtn = link ? `<button type="button" class="e-copy" data-link="${escapeHtml(link)}">Link kopieren</button>` : '';
    const hasKontext = !!(e.empfaenger_beruf || e.empfaenger_verbindung || e.empfaenger_kontext || e.beste_erreichbarkeit || e.bevorzugter_kanal || e.empfehler_vorinformiert || e.empfehler_nachricht);
    const vorname = (e.empfaenger_name || 'die Person').split(' ')[0];
    return `
    <div class="e-feed-item" data-id="${escapeAttr(e.id)}">
      <div class="e-feed-row">
        <div class="e-feed-main">
          <div class="e-feed-name">${escapeHtml(e.empfaenger_name || '–')}</div>
          <div class="e-feed-meta">${formatDate(e.created_at)}${e.anrufwunsch ? ' · ' + escapeHtml(e.anrufwunsch) : ''}</div>
          <div class="e-feed-track">${linkInfo}${copyBtn}</div>
        </div>
        <span class="e-badge e-badge-${e.status || 'offen'}">${STATUS_LABEL[e.status || 'offen']}</span>
      </div>
      <button type="button" class="e-feed-toggle${hasKontext ? ' has-kontext' : ''}" data-toggle="${escapeAttr(e.id)}">
        ${hasKontext ? 'Infos bearbeiten ✓' : 'Infos für Kai ergänzen'} <span class="e-feed-chev">▾</span>
      </button>
      <div class="e-feed-edit" id="edit-${escapeAttr(e.id)}" hidden>
        <div class="e-fe-field"><label>Beruf / Position</label><input type="text" data-f="beruf" placeholder="z. B. Architektin, selbständig" value="${escapeAttr(e.empfaenger_beruf || '')}" /></div>
        <div class="e-fe-field"><label>Verbindung zu dir</label><select data-f="verbindung">${selectOptions(VERBINDUNG_OPTS, e.empfaenger_verbindung)}</select></div>
        <div class="e-fe-field"><label>Was sollte Kai wissen?</label><textarea data-f="kontext" maxlength="300" rows="3" placeholder="z. B. kauft gerade ein Haus, macht sich selbständig …">${escapeHtml(e.empfaenger_kontext || '')}</textarea></div>
        <div class="e-fe-row-2">
          <div class="e-fe-field"><label>Beste Erreichbarkeit</label><select data-f="erreichbarkeit">${selectOptions(ERREICHBARKEIT_OPTS, e.beste_erreichbarkeit)}</select></div>
          <div class="e-fe-field"><label>Bevorzugter Kanal</label><select data-f="kanal">${selectOptions(KANAL_OPTS, e.bevorzugter_kanal)}</select></div>
        </div>
        <label class="e-fe-check"><input type="checkbox" data-f="vorinformiert"${e.empfehler_vorinformiert ? ' checked' : ''} /> Ich habe ${escapeHtml(vorname)} schon Bescheid gegeben, dass Kai sich meldet</label>
        <div class="e-fe-field"><label>Persönliche Nachricht (optional)</label><textarea data-f="nachricht" maxlength="240" rows="2" placeholder="Ein Satz, warum du empfiehlst …">${escapeHtml(e.empfehler_nachricht || '')}</textarea></div>
        <button type="button" class="e-btn e-btn-primary e-feed-save" data-save="${escapeAttr(e.id)}" style="width:auto;min-width:180px;">Speichern</button>
      </div>
    </div>`;
  }).join('') + '</div>';

  wrap.querySelectorAll('.e-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.link); const prev = btn.textContent; btn.textContent = 'Kopiert ✓'; setTimeout(() => { btn.textContent = prev; }, 1600); } catch (_) {}
    });
  });

  wrap.querySelectorAll('.e-feed-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById('edit-' + btn.dataset.toggle);
      if (panel) { panel.hidden = !panel.hidden; btn.classList.toggle('open', !panel.hidden); }
    });
  });

  wrap.querySelectorAll('.e-feed-save').forEach(btn => {
    btn.addEventListener('click', () => onKontextSave(btn));
  });
}

async function onKontextSave(btn) {
  const id = btn.dataset.save;
  const panel = document.getElementById('edit-' + id);
  if (!panel) return;
  const val = (f) => panel.querySelector(`[data-f="${f}"]`);
  const fields = {
    beruf: val('beruf').value.trim(),
    verbindung: val('verbindung').value,
    kontext: val('kontext').value.trim(),
    erreichbarkeit: val('erreichbarkeit').value,
    kanal: val('kanal').value,
    vorinformiert: val('vorinformiert').checked,
    nachricht: val('nachricht').value.trim(),
  };
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = 'Speichere…';
  const { error } = await updateEmpfehlungKontext(code, id, fields);
  btn.disabled = false;
  btn.textContent = prev;
  if (error) { toast('Konnte nicht speichern, bitte nochmal.'); return; }
  toast('Danke — die Infos sind bei Kai. 🙌');
  await refresh();
}

/* ---------- Helfer ---------- */
function normalizePhoneDE(raw) {
  let n = (raw || '').replace(/[^\d+]/g, '');
  if (!n) return '';
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) return '+' + n.slice(2);
  if (n.startsWith('0')) return '+49' + n.slice(1);
  return '+' + n;
}
function buildPotenzialMessage(vorname, link, beraterVorname) {
  const name = (vorname || '').trim() || 'du';
  const bVor = (beraterVorname || '').trim() || 'Er';
  return `Hallo ${name}, ich möchte dich kurz mit jemandem bekannt machen, dem ich sehr vertraue. Schau dir das kurz an, bevor ${bVor} sich bei dir meldet. ${link}`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = parseDbDate(ts);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function toast(text) {
  const t = document.getElementById('p7Toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }
