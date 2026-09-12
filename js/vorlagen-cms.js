import { getVorlagen, updateVorlage } from './supabase.js';
import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';
import { ICONS } from './icons.js';

let currentBeraterId = null;
let themen = [];

document.getElementById('logoutBtn').addEventListener('click', logout);
applyBeraterHeader();

(async () => {
  const session = await requireAuth();
  if (!session) return;

  // Themen-Seiten sind GETEILT und nur vom Admin editierbar. Nicht-Admins raus.
  const berater = await getCurrentBerater();
  if (!berater?.ist_admin) {
    window.location.href = '/hub.html';
    return;
  }

  // Nur die eigenen Zeilen bearbeiten. Ohne Filter stünde jede Themenseite
  // mehrfach in der Liste (die Zeilen anderer Berater sind öffentlich lesbar).
  currentBeraterId = berater.id;
  themen = await getVorlagen(currentBeraterId);
  if (!themen.length) {
    document.getElementById('cmsList').innerHTML =
      '<div style="padding:24px;text-align:center;color:var(--text-secondary);">Themen-Seiten konnten nicht geladen werden.</div>';
    return;
  }
  renderListe();
})();

/**
 * Auswahl statt Tippen: Symbole, die für Themen taugen. Vorher musste hier der
 * englische Lucide-Name eingetippt werden.
 */
const SYMBOL_AUSWAHL = [
  ['Compass', 'Kompass'], ['Home', 'Haus'], ['Banknote', 'Geldschein'],
  ['Briefcase', 'Aktentasche'], ['TrendingUp', 'Aufwärtstrend'], ['ShieldCheck', 'Schutzschild'],
  ['Heart', 'Herz'], ['Sparkles', 'Funken'], ['Users', 'Menschen'], ['FileText', 'Dokument'],
];

/**
 * Das einzige Thema, dessen Knopf aus der Datenbank kommt (js/app.js liest
 * cta_text und quickcheck_url nur auf empfaenger.html). Baufinanzierung stand
 * bis Phase 365 im Hinweis auf der Seite, lädt die Vorlage aber gar nicht —
 * der Knopf dort steht fest im Programm.
 */
const THEMA_MIT_EIGENEM_KNOPF = 'allgemein';

const SVG_PFEIL_HOCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
const SVG_PFEIL_RUNTER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
const SVG_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

function renderIcon(name) {
  if (name && ICONS[name]) {
    return `<span class="icon icon-svg" aria-hidden="true">${ICONS[name]}</span>`;
  }
  return `<span class="icon">${escapeHtml(name || '📋')}</span>`;
}

function renderSymbolAuswahl(aktuell) {
  const gewaehlt = aktuell || 'Compass';
  const knoepfe = SYMBOL_AUSWAHL.map(([name, titel]) => `
    <button type="button" class="cms-symbol${name === gewaehlt ? ' active' : ''}"
            data-symbol="${escapeAttr(name)}" title="${escapeAttr(titel)}" aria-label="${escapeAttr(titel)}">
      ${ICONS[name] || ''}
    </button>`).join('');
  return `<div class="cms-symbols">${knoepfe}<input type="hidden" data-f="icon" value="${escapeAttr(gewaehlt)}" /></div>`;
}

/**
 * Die Vorschau muss die Seite zeigen, auf der eine echte Empfehlung landet.
 * Vorher oeffnete sie fuer jedes Thema die allgemeine Empfaengerseite; man sah
 * also nie das, was der Empfohlene wirklich zu sehen bekommt.
 */
function vorschauLink(slug) {
  const sonderwege = {
    baufi: 'baufi.html?vorlage=baufi',
    allgemein: 'empfaenger.html?vorlage=allgemein',
    kinder: 'kidz-empfehlung.html',
  };
  return sonderwege[slug] || `thema.html?vorlage=${encodeURIComponent(slug)}`;
}

/**
 * Seit Phase 365 steht hier nur noch, was auch irgendwo ankommt.
 *
 * Nicht mehr im Editor:
 * - Unterzeile (headline): die Empfaengerseite wurde umgebaut, ihr Anker
 *   eFinanzHeadline existiert nicht mehr. Das Feld schrieb nur noch in die
 *   Datenbank hinein.
 * - Der Knopf-Block bei allen Themen ausser "Allgemein": alle anderen laufen
 *   auf thema.html, baufi.html oder kidz-empfehlung.html, deren Inhalte fest
 *   im Programm stehen.
 * - Die Kennung (slug) in der Kopfzeile und das Zahlenfeld fuer die
 *   Reihenfolge. Verschoben wird mit zwei Pfeilen.
 *
 * Bild, Vorteile und Subtext sind schon seit Phase 126 draussen. Die Werte
 * bleiben in der Datenbank stehen, sie werden hier nur nicht mehr angeboten.
 */
function renderCard(v, i) {
  const istErstes = i === 0;
  const istLetztes = i === themen.length - 1;
  const gesperrt = !!v.in_arbeit;
  const eigenerKnopf = v.slug === THEMA_MIT_EIGENEM_KNOPF;

  const knopfGruppe = `
        <div class="cms-group">
          <div class="cms-group-title">Der Knopf zum Finanzcheck</div>
          <p class="cms-group-sub">Nur dieses Thema hat einen Knopf, den du selbst beschriften kannst.</p>

          <div class="cms-field">
            <label>Beschriftung</label>
            <input data-f="cta_text" type="text" value="${escapeAttr(v.cta_text || '')}" />
          </div>
          <div class="cms-field">
            <label>Wohin er führt</label>
            <input data-f="quickcheck_url" type="text" value="${escapeAttr(v.quickcheck_url || '')}" />
          </div>
        </div>`;

  const festHinweis = `
        <div class="cms-group">
          <p class="cms-fest">Die Texte und der Knopf dieser Seite stehen fest im Programm.
            <b>Wenn dort etwas geändert werden soll, sag Bescheid.</b></p>
        </div>`;

  return `
    <details class="cms-card thema-card" id="${escapeAttr(v.slug)}" data-slug="${escapeAttr(v.slug)}">
      <summary>
        ${renderIcon(v.icon)}
        <span class="titel">${escapeHtml(v.titel)}</span>
        <span class="cms-zustand${gesperrt ? ' gesperrt' : ''}">${gesperrt ? 'Gesperrt' : 'Frei'}</span>
        <span class="cms-sortier">
          <button type="button" data-hoch title="nach oben" aria-label="nach oben"${istErstes ? ' disabled' : ''}>${SVG_PFEIL_HOCH}</button>
          <button type="button" data-runter title="nach unten" aria-label="nach unten"${istLetztes ? ' disabled' : ''}>${SVG_PFEIL_RUNTER}</button>
        </span>
        <span class="cms-chevron" aria-hidden="true">${SVG_CHEVRON}</span>
      </summary>
      <div class="cms-body">

        <div class="cms-group">
          <div class="cms-group-title">Name und Symbol</div>
          <p class="cms-group-sub">So heißt das Thema im Empfehlungs-Formular und in der Liste deines Promoters.</p>

          <div class="cms-field">
            <label>Name des Themas</label>
            <input data-f="titel" type="text" value="${escapeAttr(v.titel || '')}" />
          </div>

          <div class="cms-field">
            <label>Symbol</label>
            <span class="cms-hint">Erscheint im Empfehlungs-Formular neben dem Namen.</span>
            ${renderSymbolAuswahl(v.icon)}
          </div>
        </div>

        ${eigenerKnopf ? knopfGruppe : festHinweis}

        <div class="cms-group">
          <label class="cms-switch">
            <input type="checkbox" data-f-check="in_arbeit" ${gesperrt ? 'checked' : ''} />
            <span class="cms-switch-track"></span>
            <span class="cms-switch-text">
              <strong>Für Empfehlungen sperren</strong>
              <span>Solange der Schalter an ist, kann niemand dieses Thema auswählen. Schon verschickte Links führen auf die allgemeine Seite.</span>
            </span>
          </label>
        </div>

        <div class="cms-actions">
          <button class="cms-save" type="button" data-save="${escapeAttr(v.slug)}" disabled>Gespeichert</button>
          <a class="cms-preview-link" href="${vorschauLink(v.slug)}" target="_blank">Vorschau öffnen ↗</a>
        </div>
      </div>
    </details>`;
}

function renderListe() {
  // Beim Verschieben wird die Liste neu gezeichnet. Was offen war, bleibt offen.
  const offen = [...document.querySelectorAll('.thema-card[open]')].map(el => el.dataset.slug);
  const wrap = document.getElementById('cmsList');
  wrap.innerHTML = themen.map(renderCard).join('');
  offen.forEach(slug => {
    const karte = wrap.querySelector(`.thema-card[data-slug="${CSS.escape(slug)}"]`);
    if (karte) karte.open = true;
  });
  attachHandlers();
  oeffneAusAdresse();
}

// Die Befehlspalette springt mit vorlagen.html#<slug> hierher.
function oeffneAusAdresse() {
  const slug = decodeURIComponent(window.location.hash.replace('#', ''));
  if (!slug) return;
  const karte = document.getElementById(slug);
  if (karte && karte.classList.contains('thema-card')) {
    karte.open = true;
    karte.scrollIntoView({ block: 'center' });
  }
}

function attachHandlers() {
  // Symbol-Auswahl: Klick setzt das versteckte Feld, das gespeichert wird.
  document.querySelectorAll('.cms-symbols').forEach(gruppe => {
    const feld = gruppe.querySelector('[data-f="icon"]');
    gruppe.querySelectorAll('.cms-symbol').forEach(btn => {
      btn.addEventListener('click', () => {
        gruppe.querySelectorAll('.cms-symbol').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (feld) feld.value = btn.dataset.symbol;
        markiereGeaendert(btn.closest('.thema-card'));
      });
    });
  });

  // Der Speichern-Knopf bleibt grau, solange nichts geändert wurde.
  document.querySelectorAll('.thema-card .cms-body').forEach(body => {
    const karte = body.closest('.thema-card');
    body.addEventListener('input', () => markiereGeaendert(karte));
    body.addEventListener('change', () => markiereGeaendert(karte));
  });

  document.querySelectorAll('[data-hoch]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      verschiebe(btn.closest('.thema-card').dataset.slug, -1);
    });
  });
  document.querySelectorAll('[data-runter]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      verschiebe(btn.closest('.thema-card').dataset.slug, 1);
    });
  });

  document.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', () => speichere(btn));
  });
}

function markiereGeaendert(karte) {
  const btn = karte?.querySelector('.cms-save');
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = 'Speichern';
}

async function speichere(btn) {
  const slug = btn.dataset.save;
  const card = btn.closest('.thema-card');
  const data = {};
  card.querySelectorAll('[data-f]').forEach(f => {
    const v = String(f.value).trim();
    data[f.dataset.f] = v || null;
  });
  const wip = card.querySelector('[data-f-check="in_arbeit"]');
  if (wip) data.in_arbeit = wip.checked;

  btn.disabled = true;
  btn.textContent = 'Speichere…';

  // berater_id mitgeben, sonst trifft das Update auch die gleichnamige
  // Themenseite eines anderen Beraters.
  const { error } = await updateVorlage(slug, data, currentBeraterId);

  if (error) {
    toast('Speichern fehlgeschlagen: ' + (error.message || ''));
    btn.disabled = false;
    btn.textContent = 'Speichern';
    return;
  }

  // Den geladenen Stand mitziehen, sonst zeigt die Liste nach dem Verschieben
  // wieder die alten Werte.
  const eintrag = themen.find(t => t.slug === slug);
  if (eintrag) Object.assign(eintrag, data);

  toast('Gespeichert. Die Änderung ist sofort live.');
  btn.textContent = 'Gespeichert';

  // Kopfzeile der Karte mitziehen: Name, Symbol und der Zustand.
  const summary = card.querySelector('summary');
  const titelEl = summary?.querySelector('.titel');
  if (titelEl && data.titel) titelEl.textContent = data.titel;
  const iconEl = summary?.querySelector('.icon');
  if (iconEl && data.icon) iconEl.outerHTML = renderIcon(data.icon);
  const zustandEl = summary?.querySelector('.cms-zustand');
  if (zustandEl) {
    zustandEl.classList.toggle('gesperrt', !!data.in_arbeit);
    zustandEl.textContent = data.in_arbeit ? 'Gesperrt' : 'Frei';
  }
}

/**
 * Verschieben statt Zahlen tippen. Nach dem Tausch wird die ganze Liste neu
 * durchnummeriert (0, 1, 2 …); gespeichert werden nur die Zeilen, deren Wert
 * sich dabei wirklich ändert. Das hält die Reihenfolge auch dann sauber, wenn
 * zwei Themen bisher dieselbe Nummer hatten.
 *
 * Achtung bei einem neunten Thema: "banking" und "energie" stehen nicht in der
 * Datenbank, sondern fest in getVorlagenPublic (js/supabase.js) auf 8 und 9.
 * Ab neun echten Themen träfe die Nummerierung diese beiden Plätze.
 */
async function verschiebe(slug, richtung) {
  const i = themen.findIndex(t => t.slug === slug);
  const ziel = i + richtung;
  if (i < 0 || ziel < 0 || ziel >= themen.length) return;

  const kopie = [...themen];
  [kopie[i], kopie[ziel]] = [kopie[ziel], kopie[i]];

  const zuSpeichern = [];
  kopie.forEach((t, neu) => {
    if (t.sort_order !== neu) zuSpeichern.push({ slug: t.slug, sort_order: neu });
  });

  themen = kopie.map((t, neu) => ({ ...t, sort_order: neu }));
  renderListe();

  for (const eintrag of zuSpeichern) {
    const { error } = await updateVorlage(eintrag.slug, { sort_order: eintrag.sort_order }, currentBeraterId);
    if (error) {
      toast('Reihenfolge konnte nicht gespeichert werden: ' + (error.message || ''));
      return;
    }
  }
  toast('Reihenfolge gespeichert.');
}

const toastEl = document.getElementById('hToast');
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }
