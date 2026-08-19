import { getBelohnungsStufenPublic, getVorlagenPublic, getBeraterPublicBySlug, supabase } from './supabase.js';
import { icon as lucideIcon, ICONS } from './icons.js';
import { applyBeraterBrand, merkeBerater, gemerkterBerater, versteckeKontaktwege } from './berater-brand.js';
import { baueReise, meilensteinHtml, geldBlockHtml } from './belohnungs-reise.js';

// Multi-Tenant: Berater-Einstieg via ?berater=slug (z. B. ?berater=sven-augustin).
// Wird unten zum Branding und für den persönlichen QR-Einstieg genutzt.
const presentationParams = new URLSearchParams(window.location.search);
const beraterSlug = presentationParams.get('berater');

// Die Präsentation bleibt für Kunden sauber. Der Rückweg erscheint nur,
// wenn sie ausdrücklich aus dem eingeloggten HUB geöffnet wurde.
const presenterHubBack = document.getElementById('presenterHubBack');
const presenterLength = document.getElementById('presenterLength');
const openedFromHub = presentationParams.get('from') === 'hub';
if (presenterHubBack && openedFromHub) {
  presenterHubBack.hidden = false;
}
if (presenterLength && openedFromHub) presenterLength.hidden = false;

// Drei Längen, EINE Präsentation — nichts wird doppelt gepflegt:
//   ausführlich → alles
//   kurz        → die sechs vertiefenden Abschnitte fallen weg
//   60 Sek.     → nur Video + QR-Einstieg
// "60 Sek." ist bewusst ein Modus und kein Sprunglink: ein Sprung ans Ende
// liesse dreizehn Abschnitte darüber liegen, durch die Kai zurückscrollen
// müsste. So bleibt eine vollständige Mini-Präsentation stehen, die trotzdem
// in der Anmeldung endet. Der URL-Parameter macht die Auswahl aktualisierbar
// und als internen Präsentationslink speicherbar.
(function initPresentationLength() {
  if (!presenterLength) return;
  const buttons = [...presenterLength.querySelectorAll('[data-presentation-mode]')];
  const allSections = [...document.querySelectorAll('section.section')];
  const extendedSections = allSections.filter(section => section.hasAttribute('data-short-hide'));
  // Was im 60-Sekunden-Modus stehen bleibt: das Video und der Weg zur Anmeldung.
  // Ohne den QR-Block waere es eine Vorfuehrung ohne Ausgang.
  const VIDEO_MODE_KEEP = ['video', 'anmelden'];
  const videoSection = document.getElementById('video');
  const qrSection = document.getElementById('anmelden');

  function setMode(mode, { updateUrl = false } = {}) {
    const short = mode === 'short';
    const videoOnly = mode === 'video';
    const currentSection = allSections.find(section => {
      const box = section.getBoundingClientRect();
      return box.top <= window.innerHeight * 0.42 && box.bottom >= window.innerHeight * 0.42;
    });

    document.body.classList.toggle('presentation-short', short);
    document.body.classList.toggle('presentation-video', videoOnly);

    if (videoOnly) {
      allSections.forEach(section => { section.hidden = !VIDEO_MODE_KEEP.includes(section.id); });
      // In der langen Fassung steht das Video bewusst GANZ am Ende, hinter dem
      // QR-Block. Bleiben nur diese beiden uebrig, waere die Reihenfolge falsch
      // herum: erst anmelden, dann sehen warum. Fuer diesen Modus tauschen wir
      // sie, sonst nirgends.
      if (videoSection && qrSection) qrSection.before(videoSection);
    } else {
      allSections.forEach(section => { section.hidden = false; });
      extendedSections.forEach(section => { section.hidden = short; });
      // Zurueck an seinen Platz: direkt hinter den QR-Block.
      if (videoSection && qrSection) qrSection.after(videoSection);
    }

    buttons.forEach(button => {
      const active = button.dataset.presentationMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (short) url.searchParams.set('modus', 'kurz');
      else if (videoOnly) url.searchParams.set('modus', 'video');
      else url.searchParams.delete('modus');
      window.history.replaceState({}, '', url);
    }

    // Steht Kai gerade in einem Abschnitt, der jetzt verschwindet, wuerde die
    // Seite unter ihm wegspringen. Dann bewusst an den Anfang der neuen Laenge.
    if (videoOnly) {
      document.getElementById('video')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (short && currentSection?.hasAttribute('data-short-hide')) {
      document.getElementById('reflexion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    setMode(button.dataset.presentationMode, { updateUrl: true });
  }));
  const startModus = presentationParams.get('modus');
  setMode(startModus === 'kurz' ? 'short' : startModus === 'video' ? 'video' : 'full');
})();

// === Förder-Rechner (Phase 50m): Live-Tool für den Live-Pitch ===
(function initFoerderRechner() {
  const alterEl    = document.getElementById('foerderAlter');
  const alterValEl = document.getElementById('foerderAlterVal');
  const einkEl     = document.getElementById('foerderEinkommen');
  const einkValEl  = document.getElementById('foerderEinkommenVal');
  const amountEl   = document.getElementById('foerderAmount');
  const breakdownEl= document.getElementById('foerderBreakdown');
  const familieBtns= document.querySelectorAll('[data-field="familie"] button');
  const kinderBtns = document.querySelectorAll('[data-field="kinder"] button');
  const personBtns = document.querySelectorAll('[data-foerder-person]');
  const personLineEl = document.getElementById('foerderPersonLine');
  if (!alterEl || !amountEl) return;

  const fmtEUR = (n) => Math.round(n).toLocaleString('de-DE');

  // Hilfsfunktion: Counter-Up-Animation
  let animFrom = 0;
  function animateAmount(target) {
    const start = animFrom;
    const delta = target - start;
    const dur = 420;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = start + delta * eased;
      amountEl.textContent = fmtEUR(val);
      if (p < 1) requestAnimationFrame(step);
      else { animFrom = target; amountEl.textContent = fmtEUR(target); }
    }
    requestAnimationFrame(step);
  }

  function getState() {
    const familie = document.querySelector('[data-field="familie"] button.active')?.dataset.val || 'single';
    const kinder  = Number(document.querySelector('[data-field="kinder"] button.active')?.dataset.val || 0);
    return {
      alter:     Number(alterEl.value),
      einkommen: Number(einkEl.value),
      familie,
      kinder,
    };
  }

  function calc(state) {
    const lines = [];
    let sum = 0;

    // Riester-Grundzulage (175 € selbst) + 300 € pro Kind (ab Geb 2008)
    const riester = 175 + state.kinder * 300;
    if (riester > 0) { lines.push({ label: 'Riester (Grund- + Kinderzulagen)', val: riester }); sum += riester; }
    // Wenn verheiratet: Partner-Riester ebenfalls
    if (state.familie === 'verheiratet') {
      const partnerRiester = 175;
      lines.push({ label: 'Partner-Riester', val: partnerRiester });
      sum += partnerRiester;
    }

    // Vermögenswirksame Leistungen (VL)
    const vl = 480; // 40 € / Monat
    lines.push({ label: 'Vermögenswirksame Leistungen', val: vl });
    sum += vl;

    // Arbeitnehmersparzulage (Einkommens-abhängig)
    const grenzeAn = state.familie === 'verheiratet' ? 40000 : 20000;
    if (state.einkommen <= grenzeAn) {
      const an = 43;
      lines.push({ label: 'Arbeitnehmer-Sparzulage', val: an });
      sum += an;
    }

    // Wohnungsbauprämie
    const grenzeWop = state.familie === 'verheiratet' ? 70000 : 35000;
    if (state.einkommen <= grenzeWop) {
      const wop = 70;
      lines.push({ label: 'Wohnungsbauprämie', val: wop });
      sum += wop;
    }

    // Betriebliche Altersvorsorge (Steuerersparnis)
    // Annahme: 4 % vom Brutto in BAV, ~30 % Steuer-/SV-Vorteil
    const bav = Math.round(state.einkommen * 0.04 * 0.30);
    if (bav > 0) {
      lines.push({ label: 'BAV-Vorteil (Steuer + SV)', val: bav });
      sum += bav;
    }

    // Kinderspezifische Boni (Kinderfreibetrag-Vorteile durch Optimierung)
    if (state.kinder > 0) {
      const kinderBoni = state.kinder * 200;
      lines.push({ label: 'Kinder-Steueroptimierung', val: kinderBoni });
      sum += kinderBoni;
    }

    // Krankenkassen-Bonus (Wechsel zu günstigerer KK + Fit-/Bonus-Programme)
    // Bis 185 € pro erwachsener Person, plus für Kinder im Schnitt 75 €
    const kvErwachsene = state.familie === 'verheiratet' ? 2 : 1;
    const kvBonus = kvErwachsene * 185 + state.kinder * 75;
    lines.push({ label: 'KV-Bonus + Fit-Programm', val: kvBonus });
    sum += kvBonus;

    return { sum, lines };
  }

  function render() {
    const state = getState();
    alterValEl.textContent = state.alter;
    einkValEl.textContent  = state.einkommen.toLocaleString('de-DE');

    const { sum, lines } = calc(state);
    animateAmount(sum);

    breakdownEl.innerHTML = lines.map(l =>
      `<li><span>${l.label}</span><span>${fmtEUR(l.val)} €</span></li>`
    ).join('');

    // Die Summe stand früher zusätzlich in der Alltag-Sektion. Dort ist sie
    // bewusst weg: eine Eurosumme neben „Empfiehl meine Beratung" liest sich
    // für den Empfehlungsgeber wie sein eigener Anteil. Sie erscheint jetzt
    // nur noch hier im Rechner, wo der Zusammenhang klar ist.
  }

  alterEl.addEventListener('input', render);
  einkEl.addEventListener('input', render);
  familieBtns.forEach(btn => btn.addEventListener('click', () => {
    familieBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  }));
  kinderBtns.forEach(btn => btn.addEventListener('click', () => {
    kinderBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  }));

  const personLines = {
    freund: 'Für deinen besten Freund könnte dein Tipp der Moment sein, an dem er seine Zukunft endlich anpackt.',
    familie: 'Für jemanden aus deiner Familie könnte dein Tipp bedeuten, Chancen nicht länger liegen zu lassen.',
    kollege: 'Für deinen Lieblingskollegen könnte dein Tipp der Anstoß sein, sich endlich einen klaren Überblick zu verschaffen.',
  };
  personBtns.forEach(btn => btn.addEventListener('click', () => {
    personBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (personLineEl) personLineEl.textContent = personLines[btn.dataset.foerderPerson] || personLines.freund;
  }));

  render();
})();

// === Mehrwert-Sammlung (Phase 50k): editierbare Felder im Live-Pitch ===
(function initMehrwert() {
  const list = document.getElementById('mehrwertList');
  if (!list) return;
  const STORAGE_KEY = 'mehrwert_slots_v1';

  function loadSlots() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveSlots(slots) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slots)); } catch {}
  }

  const fields = list.querySelectorAll('.mehrwert-input');
  const saved = loadSlots();

  fields.forEach(f => {
    const slot = f.dataset.slot;
    if (saved[slot]) f.textContent = saved[slot];
    f.addEventListener('input', () => {
      const slots = loadSlots();
      slots[slot] = f.textContent.trim();
      saveSlots(slots);
    });
    // Beim Klick ans Ende des Textes springen (besser als Anfang)
    f.addEventListener('focus', () => {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(f);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    });
  });

  const clearBtn = document.getElementById('mehrwertClear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Alle Felder leeren?')) return;
      fields.forEach(f => { f.textContent = ''; });
      saveSlots({});
    });
  }
})();


// === Tastatur beim Vortragen (Phase 131) ==================================
// Eine Taste, ein Abschnitt — ohne Folien-Modus. Der Browser scrollt mit den
// Pfeiltasten sonst in 40-Pixel-Schritten; beim Vortragen will man springen.
// Abschnitte, die höher als der Bildschirm sind (Belohnungs-Reise, FAQ),
// werden zuerst seitenweise durchgeblättert und erst am Ende verlassen.
(function initVortragTasten() {
  const abschnitte = () => [...document.querySelectorAll('section.section')].filter(section => !section.hidden);

  // In Eingabefeldern gehören die Pfeiltasten dem Feld — besonders wichtig
  // wegen der Mehrwert-Zeilen, in die Kai im Gespräch mittippt.
  const inEingabe = (el) => !!el && (
    el.isContentEditable ||
    ['input', 'textarea', 'select'].includes(el.tagName?.toLowerCase())
  );

  const overlayOffen = () =>
    document.body.classList.contains('market-overview-open') ||
    document.body.classList.contains('topic-preview-open');

  /** Welcher Abschnitt füllt gerade den Bildschirm? */
  function aktuellerIndex(liste) {
    const marke = window.scrollY + window.innerHeight * 0.35;
    let idx = 0;
    liste.forEach((s, i) => { if (s.offsetTop <= marke) idx = i; });
    return idx;
  }

  function springe(richtung) {
    const liste = abschnitte();
    if (!liste.length) return;
    const i = aktuellerIndex(liste);
    const s = liste[i];
    const box = s.getBoundingClientRect();

    // Hoher Abschnitt: erst innerhalb blättern, statt ihn zu überspringen
    if (s.offsetHeight > window.innerHeight + 8) {
      const schritt = window.innerHeight * 0.85;
      if (richtung > 0 && box.bottom > window.innerHeight + 8) {
        window.scrollBy({ top: schritt, behavior: 'smooth' });
        return;
      }
      if (richtung < 0 && box.top < -8) {
        window.scrollBy({ top: -schritt, behavior: 'smooth' });
        return;
      }
    }

    const ziel = Math.min(liste.length - 1, Math.max(0, i + richtung));
    liste[ziel].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (overlayOffen()) return;                 // Übersicht/Vorschau hat Vorrang
    if (inEingabe(document.activeElement)) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault(); springe(1); break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); springe(-1); break;
      case ' ':
        // Leertaste nur, wenn sie nicht gerade einen Knopf auslöst
        if (document.activeElement?.tagName?.toLowerCase() === 'button') return;
        e.preventDefault(); springe(1); break;
      case 'Home': {
        e.preventDefault();
        abschnitte()[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'End': {
        e.preventDefault();
        const l = abschnitte();
        l[l.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  });
})();

// === Marktübersicht im Teamwork-Abschnitt ===
// Seit Phase 287 zeigt sie alles offen: Symbol, Titel und zwei kurze Stichworte
// je Feld, dazu Pfeile vom Zentrum nach außen. Am Symbol sitzt ein Plus; wer es
// antippt, bekommt den ausführlichen Text im Band unter dem Rad. Vorher lag der
// Text in einer Spalte rechts, die dem Rad die halbe Breite nahm.
(function initMarketOverview() {
  const openBtn = document.getElementById('marketOpen');
  const overlay = document.getElementById('marketOverlay');
  const closeBtn = document.getElementById('marketClose');
  if (!openBtn || !overlay || !closeBtn) return;

  const rad = document.getElementById('marketMap');
  const stellen = Array.from(overlay.querySelectorAll('.markt-stelle'));
  const speichen = rad ? rad.querySelector('.markt-speichen') : null;
  const kicker = document.getElementById('marketDetailKicker');
  const title = document.getElementById('marketDetailTitle');
  const hint = document.getElementById('marketDetailHint');
  const list = document.getElementById('marketDetailList');
  let hideTimer = null;

  // Winkel und Radius werden gerechnet, nicht getippt: von Hand eingetippte
  // Koordinaten schwankten früher zwischen 31 und 45 Grad, die Karte stand
  // sichtbar schief. Das halbe Segment Drehung (180/n) sorgt dafür, dass kein
  // Feld genau oben oder unten sitzt; dort hätte der Block keinen Platz.
  // Die Streckung macht aus dem Kreis eine Ellipse, weil zehn Textblöcke
  // senkrecht mehr Abstand brauchen als waagerecht.
  const RADIUS = 28;
  const STRECKUNG = 1.45;

  (function verteile() {
    if (!stellen.length) return;
    const n = stellen.length;
    stellen.forEach((el, i) => {
      const bog = (90 - 180 / n - i * (360 / n)) * Math.PI / 180;
      const cos = Math.cos(bog), sin = Math.sin(bog);
      el.style.setProperty('--sx', (50 + RADIUS * cos).toFixed(3) + '%');
      el.style.setProperty('--sy', (50 - RADIUS * sin * STRECKUNG).toFixed(3) + '%');
      el.dataset.seite = cos < 0 ? 'links' : 'rechts';

      if (!speichen) return;
      const von = 13, bis = RADIUS - 9, spitze = 1.7;
      const x1 = 50 + von * cos, y1 = 50 - von * sin * STRECKUNG;
      const x2 = 50 + bis * cos, y2 = 50 - bis * sin * STRECKUNG;
      const ax = x2 - spitze * Math.cos(bog - 0.45);
      const ay = y2 + spitze * Math.sin(bog - 0.45) * STRECKUNG;
      const bx = x2 - spitze * Math.cos(bog + 0.45);
      const by = y2 + spitze * Math.sin(bog + 0.45) * STRECKUNG;
      speichen.insertAdjacentHTML('beforeend',
        '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
        '<path d="M ' + ax + ' ' + ay + ' L ' + x2 + ' ' + y2 + ' L ' + bx + ' ' + by + '"/>');
    });
  })();

  function resetDetails() {
    stellen.forEach(el => el.setAttribute('aria-pressed', 'false'));
    kicker.textContent = 'Deine Ziele';
    title.textContent = 'Ganzheitlich gedacht.';
    hint.hidden = false;
    list.hidden = true;
    list.replaceChildren();
  }

  function showDetails(node) {
    // Nochmal auf dasselbe Feld tippen schließt es wieder: das Plus ist dann
    // Schalter und nicht Einbahnstraße.
    if (node.getAttribute('aria-pressed') === 'true') { resetDetails(); return; }

    stellen.forEach(el => el.setAttribute('aria-pressed', String(el === node)));
    kicker.textContent = 'Im Blick behalten';
    title.textContent = node.dataset.title || '';
    hint.hidden = true;
    list.replaceChildren();
    (node.dataset.details || '').split('|').filter(Boolean).forEach(detail => {
      const item = document.createElement('li');
      item.textContent = detail;
      list.appendChild(item);
    });
    list.hidden = false;
  }

  function openOverview() {
    window.clearTimeout(hideTimer);
    resetDetails();
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('market-overview-open');
    requestAnimationFrame(() => {
      overlay.classList.add('offen');
      closeBtn.focus({ preventScroll: true });
    });
  }

  function closeOverview() {
    overlay.classList.remove('offen');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('market-overview-open');
    hideTimer = window.setTimeout(() => {
      overlay.hidden = true;
      openBtn.focus({ preventScroll: true });
    }, 320);
  }

  openBtn.addEventListener('click', openOverview);
  closeBtn.addEventListener('click', closeOverview);
  stellen.forEach(node => node.addEventListener('click', () => showDetails(node)));

  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('offen')) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverview();
    }
  }, true);
})();

// === NPS-Skala (Phase 50i): Reflexions-Frage mit Skala 1-10 ===
(function initNps() {
  const scale = document.getElementById('npsScale');
  if (!scale) return;

  const section = scale.closest('.pre-hero');

  const responses = {
    low:  document.getElementById('npsResponseLow'),
    mid:  document.getElementById('npsResponseMid'),
    high: document.getElementById('npsResponseHigh'),
  };

  function hideAllResponses() {
    Object.values(responses).forEach(el => {
      if (!el) return;
      el.hidden = true;
      el.classList.remove('show');
    });
  }

  function bandFor(score) {
    if (score <= 6) return 'low';
    if (score <= 8) return 'mid';
    return 'high';
  }

  const regler = document.getElementById('npsReglerInput');
  const reglerWert = document.getElementById('npsReglerWert');

  // Eine Auswahl, zwei Bedienwege. Knoepfe und Schieberegler laufen ueber
  // dieselbe Funktion, damit die Antwort nicht davon abhaengt, womit gewaehlt
  // wurde, und beide immer denselben Stand zeigen.
  function waehle(score, { scrollen = true } = {}) {
    scale.querySelectorAll('.nps-btn').forEach(b => {
      const gewaehlt = Number(b.dataset.score) === score;
      b.classList.toggle('selected', gewaehlt);
      b.setAttribute('aria-checked', String(gewaehlt));
    });

    if (regler) {
      regler.value = String(score);
      regler.setAttribute('aria-valuetext', `${score} von 10`);
    }
    if (reglerWert) reglerWert.textContent = String(score);

    hideAllResponses();
    const card = responses[bandFor(score)];
    if (card) {
      section?.classList.add('has-nps-response');
      card.hidden = false;
      requestAnimationFrame(() => card.classList.add('show'));
      // Zur Antwort scrollen, damit sie im Gespräch sofort im Blick ist
      if (scrollen) {
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 160);
      }
    }

    try { sessionStorage.setItem('nps_score', String(score)); } catch (_) {}
  }

  scale.querySelectorAll('.nps-btn').forEach(btn => {
    btn.addEventListener('click', () => waehle(Number(btn.dataset.score)));
  });

  if (regler) {
    // Der Regler steht sichtbar auf seinem Startwert, die Anzeige zeigte aber
    // einen Strich. Das las sich wie ein Fehler: Knopf bei 8, daneben "–".
    // Jetzt sagt die Zahl von Anfang an, wo der Regler steht. Gewaehlt ist
    // damit noch nichts — das passiert erst beim Loslassen (change).
    const start = Number(regler.value);
    if (reglerWert) reglerWert.textContent = String(start);
    regler.setAttribute('aria-valuetext', `${start} von 10`);

    // Waehrend des Ziehens nur die Zahl mitfuehren. Wuerde bei jedem Schritt
    // die Antwort erscheinen und die Seite dorthin scrollen, rutscht einem der
    // Regler unter dem Finger weg.
    regler.addEventListener('input', () => {
      const score = Number(regler.value);
      if (reglerWert) reglerWert.textContent = String(score);
      regler.setAttribute('aria-valuetext', `${score} von 10`);
    });
    regler.addEventListener('change', () => waehle(Number(regler.value)));
  }

  // Wenn in derselben Sitzung schon geantwortet wurde, den Stand wiederherstellen.
  // Ohne Scrollen: die Seite soll beim Laden oben stehen bleiben.
  try {
    const prev = Number(sessionStorage.getItem('nps_score'));
    if (prev >= 1 && prev <= 10) waehle(prev, { scrollen: false });
  } catch (_) {}
})();

// Lokale SVG-Backups für Topic-Icons (Mobile-Safari/Cache-Resilienz)
const TOPIC_ICON_SVG = {
  Compass:     '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  Home:        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  Banknote:    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>',
  Briefcase:   '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>',
  TrendingUp:  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  ShieldCheck: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  Sparkles:    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
};

// Foto im Hero: NICHT vorab auf den ENV-Standard setzen. Sonst sieht jeder
// andere Berater beim Laden erst Kais Portrait, bis sein eigenes da ist.
// Gemerktes Branding aus einem früheren Aufruf steht dagegen sofort.
const brandKey = beraterSlug || 'me';
const sofortBerater = gemerkterBerater(brandKey);
if (sofortBerater) applyBeraterBrand(sofortBerater);

// Multi-Tenant: Welcher Berater wird gebrandet?
// 1. ?berater=slug in der URL (öffentlicher Funnel-Link für Kunden)
// 2. sonst: eingeloggter Berater (Dashboard-Preview seiner eigenen Seite)
async function resolveBerater() {
  if (beraterSlug) {
    const { data } = await getBeraterPublicBySlug(beraterSlug);
    if (data) return data;
  }
  // Kein Slug → falls ein Berater eingeloggt ist, ihn nehmen (Vorschau).
  // getSession ist lokal (kein Netz-Request für anonyme Besucher).
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const m = await import('./dashboard.js');
      return await m.getCurrentBerater();
    }
  } catch (_) {}
  return null;
}

// Branding-Berater (Foto/Name/Kontakt) einmal auflösen. Die Programm-INHALTE
// (Vorlagen/Belohnungen) sind dagegen GETEILT — global geladen, nur Admin pflegt sie.
const beraterPromise = resolveBerater();

const qrSlugs = new Set([
  'josephine-buerger',
  'kai-blobel',
  'max-kudlek',
  'sandro-wernicke',
  'sven-augustin',
]);

function setPromoterEntry(data) {
  const qr = document.getElementById('t-PromoterQr');
  const link = document.getElementById('t-PromoterStartLink');
  if (!qr || !link) return;

  // Ein ausdrücklich gesetzter, aber ungültiger Berater-Slug darf nie still
  // auf Kai zurückfallen. Ohne Slug bleibt die normale Kai-Präsentation aktiv.
  const slug = data?.slug || (beraterSlug ? '' : 'kai-blobel');
  if (!slug) {
    qr.hidden = true;
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.textContent = 'Berater-Link nicht verfügbar';
    return;
  }

  const startUrl = `/p/${encodeURIComponent(slug)}/praesentation`;
  link.href = startUrl;
  if (qrSlugs.has(slug)) {
    qr.src = `/assets/qr/promoter-${slug}-praesentation.svg`;
    qr.hidden = false;
  } else {
    // Für neu angelegte Berater bleibt der direkte Einstieg nutzbar. Der
    // druckbare QR-Code wird zusammen mit den Berater-Unterlagen erzeugt.
    qr.hidden = true;
  }
}

beraterPromise.then((data) => {
  if (!data) {
    // Lässt sich kein Berater auflösen (kein Slug, niemand angemeldet), bleibt
    // stehen, was im HTML steht: das Bürofoto des Standard-Beraters.
    //
    // Hier stand früher ein Rückfall auf ENV_BERATER_FOTO, also auf das
    // Portrait. Das war richtig, solange an dieser Stelle das Portrait hing.
    // Seit dort das Bürofoto steht, hat der Rückfall es beim Laden sichtbar
    // überschrieben: erst der Tresen, dann wieder das Porträt.
    //
    // Bei den Kontaktwegen gilt das Gegenteil, Phase 300: Stand ein Slug in
    // der Adresse und ließ er sich nicht auflösen, wollte der Besucher
    // ausdrücklich zu jemand anderem. Dann darf hier nicht die Nummer des
    // Standard-Beraters stehen bleiben, sonst ruft ein Kunde bei einer Person
    // an, die er nie gemeint hat. Ohne Slug bleibt alles wie es ist.
    if (beraterSlug) versteckeKontaktwege();
    setPromoterEntry(null);
    return;
  }
  window.__beraterPublic = data;
  applyBeraterBrand(data);
  merkeBerater(brandKey, data);
  setPromoterEntry(data);
  reicheBeraterAnFolgeseitenWeiter(data);
});

/**
 * Phase 192 · Der Berater muss die Seite verlassen dürfen, ohne verloren zu gehen.
 *
 * Der Fußbereich verlinkt "Empfehlung aussprechen" auf empfehlen.html — bisher
 * ohne jeden Parameter. Wer Sven's Programmseite gezeigt bekam und dort klickte,
 * landete auf einer Seite, die als Kai gebrandet war, und seine Empfehlung wurde
 * Kai zugeordnet. Die Berater-Auflösung im Dashboard-Menü (nav.js) greift hier
 * nicht: der Kunde ist nicht angemeldet.
 */
function reicheBeraterAnFolgeseitenWeiter(b) {
  const slug = b?.slug;
  if (!slug) return;
  document.querySelectorAll('a[href*="empfehlen.html"]').forEach((a) => {
    const roh = a.getAttribute('href');
    if (!roh) return;
    const u = new URL(roh, window.location.origin);
    if (u.searchParams.has('berater') || u.searchParams.has('code')) return;
    u.searchParams.set('berater', slug);
    a.setAttribute('href', u.pathname + u.search + u.hash);
  });
}

// Die Einblend-Animation ist bewusst entfernt. Sie lag vorher auf praktisch
// jedem Element der Seite, und genau dieses gleichförmige Auffahren beim
// Scrollen ist eines der Merkmale, an denen man generierte Seiten erkennt.
// Ruhe wirkt hier wertiger als Bewegung.

// === Belohnungs-Reise (Phase 127) ===========================================
// Eine einzige senkrechte Reise von Stufe 1 bis 20, gerendert aus den echten
// Zeilen in belohnungs_stufen. Bewusst OHNE abgeleitete Zwischenstufen: die
// alte Fassung hat aus den Lücken 100-€-Boni erfunden, die
// sync_praemien_for_empfehler() später nie als Prämie angelegt hat.
(async () => {
  const wrap = document.getElementById('t-Reise');
  if (!wrap) return;

  const brandBerater = await beraterPromise.catch(() => null);
  const rows = await getBelohnungsStufenPublic(brandBerater?.id || window.ENV_BERATER_ID);
  const reise = baueReise(rows);

  if (!reise.stationen.length) {
    wrap.innerHTML = '<li class="reise-leer">Die Belohnungen konnten gerade nicht geladen werden. Bitte lade die Seite neu.</li>';
    return;
  }

  // Lücken werden gemeldet, nicht gefüllt. Der Besucher sieht eine ruhige
  // Reise ohne erfundene Stufen, die Einzelheiten stehen in der Konsole.
  if (reise.fehlt.length) {
    console.warn('[Belohnungen] Diese Stufen fehlen in der Datenbank und werden nicht angezeigt:', reise.fehlt.join(', '));
  }

  const fmtEUR = (n) => Math.round(n).toLocaleString('de-DE');

  // Nur die fuenf grossen Meilensteine bekommen eine Karte. Die zehn
  // Geldstufen unterscheiden sich fast nur durch die Nummer; einzeln
  // untereinander ergaben sie eine lange, gleichfoermige Liste. Sie stehen
  // jetzt als ein Satz darunter. Markup kommt weiter aus dem reinen Modul,
  // damit Praesentation und Pruefseite nicht auseinanderlaufen.
  const meilensteine = reise.stationen.filter((s) => s.art === 'meilenstein');
  const finale = meilensteine[meilensteine.length - 1];
  wrap.innerHTML = meilensteine.map((st) => meilensteinHtml(st, st === finale)).join('');

  const summaryEl = document.getElementById('t-ReiseGeldSummary');
  if (summaryEl) summaryEl.innerHTML = geldBlockHtml(reise);

  // Gesamtwert aus den echten Stufen — keine feste Zahl im HTML mehr.
  const counterEl = document.querySelector('.rewards-total-counter');
  if (counterEl) {
    const target = Math.round(reise.gesamtwert) || (parseInt(counterEl.dataset.target, 10) || 0);
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const duration = 1600;
        const start = performance.now();
        const formatter = new Intl.NumberFormat('de-DE');
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          counterEl.textContent = formatter.format(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        counterIO.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    counterIO.observe(counterEl);
    // Wer die Bewegung reduziert hat, sieht die Zahl sofort.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      counterEl.textContent = fmtEUR(target);
      counterIO.unobserve(counterEl);
    }
  }

  // Schlusszeile an die tatsächliche Stufenzahl anpassen
  const finishEl = document.getElementById('t-ReiseFinish');
  if (finishEl) {
    const hoechste = reise.stationen[reise.stationen.length - 1].stufe;
    finishEl.textContent = `${hoechste} Stufen, ein sichtbarer Weg und echte Vorfreude.`;
  }

})();

// Themen-Auswahl mit direkter Vorschau der fertigen Themenwelten
// === Themenauswahl · die Weiche im Gespräch ================================
// Früher führte jede Kachel in dieselbe Vorschau. Jetzt sagt jedes Thema
// selbst, was beim Antippen passieren soll:
//
//   rechner  → was hätte die empfohlene Person davon (Förderrechner)
//   vorschau → die fertige Themenseite, so wie die Person sie bekommt
//   impuls   → die Seite entsteht noch, es gibt einen Satz zum Weiterreden
//
// Das löst nebenbei ein inhaltliches Problem: Die Eurosumme aus dem Rechner
// sieht nur noch, wer über Förderung oder ganz allgemein empfiehlt. Wer an
// Baufinanzierung oder an Kinder denkt, bekommt sie nie zu sehen und fragt
// sich auch nicht, wo denn sein Anteil bleibt.
(async function initThemenweiche() {
  const starkWrap = document.getElementById('themenStark');
  const weitereWrap = document.getElementById('themenWeitere');
  const overlay = document.getElementById('themaOverlay');
  const rahmen = document.getElementById('themaRahmen');
  if (!starkWrap || !weitereWrap || !overlay) return;

  const bloecke = {
    ueberblick: document.getElementById('themaUeberblick'),
    rechner: document.getElementById('themaRechner'),
    vorschau: document.getElementById('themaVorschau'),
    impuls: document.getElementById('themaImpuls'),
  };

  // Vier Themen tragen die Auswahl. Jedes bekommt die Darstellung, die zu ihm
  // passt: zwei echte Aufnahmen, das KIDZ-Zeichen, und der allgemeine Einstieg
  // ohne Bild. Ungleich ist hier Absicht, vier gleiche Bildkacheln lesen sich
  // wie ein Baukasten.
  const THEMEN_STARK = [
    {
      slug: 'allgemein', titel: 'Ganz allgemein', typ: 'ueberblick', art: 'ink',
      // Kein Stockfoto, sondern ein Blick auf das, was dahinter liegt: die vier
      // Darstellungen aus dem Überblick als Kontaktbogen. Die Kachel zeigt
      // damit, was sie öffnet, statt eine Stimmung zu behaupten.
      bild: '/assets/images/praesentation/ueberblick-vorschau.webp',
      zeile: 'Für alle, die erst einmal wissen wollen, wo sie stehen.',
      punkte: ['Vorteil', 'Strategie', 'Zwei Konten', 'Kompetenz', 'Reform 2027'],
      tun: 'Das ganze Bild ansehen',
    },
    {
      slug: 'foerderungen', titel: 'Staatliche Förderungen', typ: 'rechner', art: 'foto',
      bild: '/assets/images/praesentation/thema-foerderung.webp',
      zeile: 'Was der Staat dazugibt, und wer davon wirklich etwas hat.',
      tun: 'Vorteil berechnen',
    },
    {
      slug: 'baufi', titel: 'Baufinanzierung', typ: 'vorschau', art: 'foto',
      bild: '/assets/images/praesentation/thema-baufi.webp',
      zeile: 'Kauf, Neubau oder Anschluss, ohne dass das Leben nur noch aus Rate besteht.',
      tun: 'Seite ansehen',
      url: '/baufi.html?vorlage=baufi&modus=referral&von=Thomas&an=Max',
      adresse: 'Finanzierungskompass für Max',
    },
    {
      slug: 'kinder', titel: 'KIDZ', untertitel: 'Kinderleicht in die Zukunft',
      typ: 'vorschau', art: 'logo',
      // Das Zeichen füllt die Fläche, statt als kleines Quadrat mit weißem
      // Rand auf grauem Grund zu stehen. Freigestellt aus kidz-logo.png.
      bild: '/assets/images/praesentation/thema-kidz.webp',
      zeile: 'Finanzielle Kompetenz, Gesundheit und Absicherung von Anfang an.',
      tun: 'Seite ansehen',
      // Kinder-Empfehlungen laufen ueber die eigene KIDZ-Einleitung, die von
      // dort aufs Konzept weiterfuehrt. Dasselbe Ziel nutzt der Versand-Router.
      url: '/kidz-empfehlung.html?modus=referral&von=Thomas&an=Max',
      adresse: 'KIDZ für Max',
    },
  ];

  const THEMEN_WEITERE = [
    { slug: 'selbstaendige', titel: 'Selbständige',           impuls: 'Privat und geschäftlich sind zwei Baustellen. Meist ist eine davon seit Jahren offen.' },
    { slug: 'investment',    titel: 'Geldanlage',             impuls: 'Viele sparen, ohne zu wissen wofür. Ein Ziel verändert die ganze Rechnung.' },
    { slug: 'absicherung',   titel: 'Absicherung & Familie',  impuls: 'Die meisten sind für das Falsche versichert. Das, was wirklich weh täte, bleibt offen.' },
    { slug: 'karriere',      titel: 'Berufliche Perspektive', impuls: 'Nicht jeder, der unzufrieden ist, sucht aktiv. Manchmal reicht der Hinweis, dass es etwas gibt.' },
    { slug: 'banking',       titel: 'Banking & Kredit',       impuls: 'Konten, Rücklagen, Finanzierung. Selten hat das jemand mal zusammen angeschaut.' },
    { slug: 'energie',       titel: 'Energie',                impuls: 'Strom, Gas, vielleicht Photovoltaik. Da liegt oft Geld, das niemand hebt.' },
  ];

  // Die Vorschau läuft im Rahmen ohne Login. Ohne ?berater=slug fällt sie auf
  // den Standard-Berater zurück, dann sähe z. B. Sandro auf seiner eigenen
  // Seite Kais Portrait.
  let vorschauBerater = null;
  const mitBerater = (url) => {
    const slug = vorschauBerater?.slug;
    if (!slug) return url;
    return `${url}${url.includes('?') ? '&' : '?'}berater=${encodeURIComponent(slug)}`;
  };
  beraterPromise.then((b) => { vorschauBerater = b; }).catch(() => {});

  let zuTimer = null;

  function themaAuf(thema) {
    window.clearTimeout(zuTimer);
    document.getElementById('themaTitel').textContent =
      thema.untertitel ? `${thema.titel} · ${thema.untertitel}` : thema.titel;
    document.getElementById('themaZeile').textContent = thema.zeile || '';
    document.getElementById('themaKicker').textContent =
      thema.typ === 'ueberblick' ? 'Worum es überhaupt geht'
      : thema.typ === 'rechner' ? 'Was hätte die empfohlene Person davon?'
      : thema.typ === 'vorschau' ? 'So kommt deine Empfehlung an'
      : 'Zum Weiterreden';

    Object.entries(bloecke).forEach(([typ, el]) => { if (el) el.hidden = typ !== thema.typ; });

    if (thema.typ === 'vorschau' && rahmen) {
      document.getElementById('themaAdresse').textContent = thema.adresse || 'Persönliche Empfehlung';
      rahmen.src = mitBerater(thema.url);
    }
    if (thema.typ === 'impuls') {
      document.getElementById('themaImpulsText').textContent = `„${thema.impuls}“`;
    }

    overlay.hidden = false;
    document.body.classList.add('thema-offen');
    requestAnimationFrame(() => {
      overlay.classList.add('offen');
      document.getElementById('themaSchliessen')?.focus({ preventScroll: true });
    });
  }

  function themaZu() {
    overlay.classList.remove('offen');
    document.body.classList.remove('thema-offen');
    zuTimer = window.setTimeout(() => {
      overlay.hidden = true;
      if (rahmen) rahmen.src = 'about:blank';
    }, 210);
  }

  THEMEN_STARK.forEach(thema => {
    const k = document.createElement('button');
    k.type = 'button';
    k.className = `thema-kachel thema-kachel-${thema.art}`;
    k.dataset.slug = thema.slug;
    const kopf = thema.bild
      ? `<span class="thema-kachel-bild"><img src="${escapeAttr(thema.bild)}" alt="" loading="lazy" decoding="async"></span>`
      : '';
    const titel = thema.untertitel
      ? `<strong>${escapeHtml(thema.titel)}</strong><em>${escapeHtml(thema.untertitel)}</em>`
      : `<strong>${escapeHtml(thema.titel)}</strong>`;
    // Was hinter der Kachel steckt, steht auf der Kachel. Sonst sieht die
    // ruhige Fläche nach weniger aus, als sie enthält.
    const inhalt = thema.punkte
      ? `<span class="thema-kachel-punkte">${thema.punkte.map(escapeHtml).join(' · ')}</span>`
      : '';
    k.innerHTML = `
      ${kopf}
      <span class="thema-kachel-text">
        ${titel}
        <span>${escapeHtml(thema.zeile)}</span>
        ${inhalt}
        <span class="thema-kachel-tun">${escapeHtml(thema.tun)}</span>
      </span>`;
    k.addEventListener('click', () => themaAuf(thema));
    starkWrap.appendChild(k);
  });

  THEMEN_WEITERE.forEach(thema => {
    const z = document.createElement('button');
    z.type = 'button';
    z.className = 'thema-zeile';
    z.dataset.slug = thema.slug;
    z.textContent = thema.titel;
    z.addEventListener('click', () => themaAuf({ ...thema, typ: 'impuls', zeile: '' }));
    weitereWrap.appendChild(z);
  });

  // Aus dem Überblick heraus zum Rechner. Das Overlay bleibt offen, nur der
  // Inhalt wechselt — im Termin ist das ein Schritt weiter, kein Neuanfang.
  document.getElementById('ueberblickRechner')?.addEventListener('click', () => {
    const allgemein = THEMEN_STARK.find(t => t.slug === 'allgemein');
    themaAuf({ ...allgemein, typ: 'rechner', zeile: 'Was für die empfohlene Person drin sein könnte.' });
  });

  // Der Sprung auf die ausführliche Seite. Der Berater muss mit, sonst zeigt
  // sie den Standard-Berater statt dem, dessen Präsentation gerade läuft.
  //
  // Die Adresse wird erst beim Klick gebaut: vorschauBerater kommt aus dem
  // Netz und steht beim Aufbau der Seite noch nicht fest. Fest gesetzt wäre
  // der Slug in der Hälfte der Fälle nicht dabei.
  document.getElementById('ueberblickSeite')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(mitBerater(e.currentTarget.getAttribute('href')), '_blank', 'noopener');
  });

  document.getElementById('themaSchliessen')?.addEventListener('click', themaZu);
  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); themaZu(); }
  }, true);
})();

// === Die fünf Einstiegswege aufklappen =====================================
// Aufklappen statt drehen: ein 3D-Flip ist der Effekt, den jedes Template kann.
(function initEinstiegswege() {
  const klapp = document.getElementById('alltagKlapp');
  const details = document.getElementById('alltagDetails');
  if (!klapp || !details) return;
  klapp.addEventListener('click', () => {
    const offen = details.hidden;
    details.hidden = !offen;
    klapp.setAttribute('aria-expanded', String(offen));
    klapp.textContent = offen ? 'Wieder zuklappen' : 'Welche fünf?';
  });
})();

// === Promoter-Vorschau =====================================================
// Zeigt im Termin, wie der persönliche Bereich nach der Anmeldung aussieht.
// Der Rahmen lädt erst beim Öffnen, damit die Präsentation nicht ungefragt
// eine zweite Seite nachzieht.
(function initPromoterVorschau() {
  const overlay = document.getElementById('vorschauOverlay');
  const rahmen = document.getElementById('vorschauRahmen');
  const oeffnen = document.getElementById('vorschauOeffnen');
  const schliessen = document.getElementById('vorschauSchliessen');
  if (!overlay || !rahmen || !oeffnen || !schliessen) return;

  // Nicht auf einen Entwurf zeigen: Was in .vercelignore steht, wird nicht mit
  // ausgeliefert (Phase 166), die Vorschau lief live in einen 404. Der frühere
  // Entwurfsordner mockups/ ist seit Phase 301 ganz weg.
  // Der Slug reist mit: Die Vorschau zeigt sonst den Standard-Berater, und ein
  // Berater praesentiert seinem Kunden einen fremden Namen (Phase 308).
  const VORSCHAU_URL = '/promoter-vorschau.html';
  function vorschauAdresse() {
    const slug = window.__beraterPublic?.slug || beraterSlug || '';
    return slug ? `${VORSCHAU_URL}?berater=${encodeURIComponent(slug)}` : VORSCHAU_URL;
  }

  // Die Vorschauseite hat oben eine eigene Umschaltleiste für Ansicht und
  // Farbe. Im Kundengespräch verwirrt die nur.
  function rahmenAufraeumen() {
    try {
      const doc = rahmen.contentDocument;
      if (!doc) return;
      const leiste = doc.querySelector('.vorschau-leiste');
      if (leiste) leiste.style.display = 'none';
      doc.defaultView.scrollTo(0, 0);
    } catch (e) {
      console.warn('[Vorschau] Rahmen konnte nicht aufgeräumt werden:', e);
    }
  }

  function auf() {
    rahmen.addEventListener('load', rahmenAufraeumen, { once: true });
    rahmen.src = vorschauAdresse();
    overlay.hidden = false;
    document.body.classList.add('thema-offen');
    requestAnimationFrame(() => overlay.classList.add('offen'));
  }
  function zu() {
    overlay.classList.remove('offen');
    document.body.classList.remove('thema-offen');
    window.setTimeout(() => { overlay.hidden = true; rahmen.src = 'about:blank'; }, 230);
  }

  oeffnen.addEventListener('click', auf);
  schliessen.addEventListener('click', zu);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) zu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) zu();
  });
})();


// Die Karriere-Karte dreht sich nicht mehr, sie klappt auf. Die Logik dazu
// steht oben bei initEinstiegswege.

// Sticky-Knopf und Kopfleiste erscheinen, sobald der Einstieg durchgescrollt
// ist. Vorher hing das an `.hero` — den Abschnitt gibt es nicht mehr, seit
// Hero und Zufriedenheitsfrage zusammengelegt sind, und der Knopf wäre nie
// aufgetaucht.
const sticky = document.getElementById('t-StickyCta');
const ctaTop = document.querySelector('.cta-top');
const einstieg = document.querySelector('.einstieg');
if (einstieg) {
  const einstiegObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const durch = !e.isIntersecting;
      sticky?.classList.toggle('is-visible', durch);
      ctaTop?.classList.toggle('is-visible', durch);
    });
  }, { threshold: 0.05 });
  einstiegObserver.observe(einstieg);
}

// === Geführte mobile Präsentation (Phase 163) ==============================
// Auf kleinen Bildschirmen führt eine feste Leiste unten durch die Abschnitte:
// Zurück · „2 von 14" · Weiter — auf dem letzten Abschnitt „Fertig".
// Die Abschnittszahl steht nirgends fest: gezählt wird bei jedem Schritt neu,
// was sichtbar ist. Dadurch stimmen Ausführlich, Kurz und 60 Sekunden von
// selbst, auch direkt nach einem Wechsel der Präsentationslänge.
(function initMobileGuide() {
  const guide = document.getElementById('mobileGuide');
  const prevBtn = document.getElementById('mobileGuidePrev');
  const nextBtn = document.getElementById('mobileGuideNext');
  const progressEl = document.getElementById('mobileGuideProgress');
  if (!guide || !prevBtn || !nextBtn || !progressEl) return;

  const kleinerSchirm = window.matchMedia('(max-width: 767px)');
  const ruhigeBewegung = window.matchMedia('(prefers-reduced-motion: reduce)');

  const sichtbareAbschnitte = () =>
    [...document.querySelectorAll('section.section')].filter(section => !section.hidden);

  // Gleiche Lesart wie bei der Tastatursteuerung: der Abschnitt, der die
  // obere Bildschirmhälfte füllt, ist der aktuelle.
  function aktuellerIndex(liste) {
    const marke = window.scrollY + window.innerHeight * 0.35;
    let idx = 0;
    liste.forEach((section, i) => { if (section.offsetTop <= marke) idx = i; });
    return idx;
  }

  function zeichne() {
    if (!kleinerSchirm.matches) return;
    const liste = sichtbareAbschnitte();
    if (!liste.length) return;
    const i = aktuellerIndex(liste);

    // aria-live sitzt auf der Fortschrittsanzeige — nur bei echter Änderung
    // schreiben, sonst wiederholt der Screenreader denselben Stand.
    const stand = `${i + 1} von ${liste.length}`;
    if (progressEl.textContent !== stand) progressEl.textContent = stand;

    prevBtn.disabled = i === 0;

    const letzter = i === liste.length - 1;
    const naechsteBeschriftung = letzter ? 'Fertig' : 'Weiter';
    if (nextBtn.textContent !== naechsteBeschriftung) {
      nextBtn.textContent = naechsteBeschriftung;
      nextBtn.setAttribute('aria-label', letzter
        ? 'Präsentation abschließen und zum Anfang zurückkehren'
        : 'Weiter zum nächsten Abschnitt');
    }
  }

  // Beim Scrollen mit dem Finger weicht die Leiste, damit sie keinen Inhalt
  // verdeckt; ruht das Scrollen, steht sie wieder. Erkannt wird das am
  // direkten Signal (Finger auf dem Schirm, Mausrad) — Sprünge über die
  // Knöpfe erzeugen keines von beiden, dabei bleibt die Leiste also stehen
  // und verschwindet nicht unter dem Daumen, der gerade klickt.
  let ruheTimer = 0;

  function planeRueckkehr() {
    window.clearTimeout(ruheTimer);
    ruheTimer = window.setTimeout(() => {
      guide.classList.remove('weicht');
      zeichne();
    }, 320);
  }

  function verstecke() {
    if (!kleinerSchirm.matches) return;
    guide.classList.add('weicht');
    planeRueckkehr();
  }

  window.addEventListener('touchmove', verstecke, { passive: true });
  window.addEventListener('wheel', verstecke, { passive: true });

  function springeZu(section) {
    section?.scrollIntoView({
      behavior: ruhigeBewegung.matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  prevBtn.addEventListener('click', () => {
    const liste = sichtbareAbschnitte();
    const i = aktuellerIndex(liste);
    if (i > 0) springeZu(liste[i - 1]);
  });

  nextBtn.addEventListener('click', () => {
    const liste = sichtbareAbschnitte();
    const i = aktuellerIndex(liste);
    // „Fertig" schließt den Rundgang und kehrt zum Einstieg zurück —
    // nichts geht verloren, Kai kann sofort von vorn beginnen.
    if (i < liste.length - 1) springeZu(liste[i + 1]);
    else springeZu(liste[0]);
  });

  function schalte() {
    const aktiv = kleinerSchirm.matches;
    guide.hidden = !aktiv;
    guide.classList.remove('weicht');
    window.clearTimeout(ruheTimer);
    document.body.classList.toggle('mobile-guided', aktiv);
    if (aktiv) zeichne();
  }

  // Beim Scrollen den Stand nachführen — gebündelt auf einen Frame. Läuft
  // die Seite nach dem Loslassen des Fingers noch aus, hält jedes
  // Scroll-Ereignis die gewichene Leiste weiter unten, bis 320 ms Ruhe sind.
  let angefragt = false;
  window.addEventListener('scroll', () => {
    if (!kleinerSchirm.matches) return;
    if (guide.classList.contains('weicht')) planeRueckkehr();
    if (angefragt) return;
    angefragt = true;
    requestAnimationFrame(() => { angefragt = false; zeichne(); });
  }, { passive: true });

  // Wechselt die Präsentationslänge, ändern Abschnitte ihr hidden-Attribut.
  // Der Beobachter bestimmt Fortschritt und Position danach neu — ohne
  // Kopplung an den Längen-Umschalter.
  const beobachter = new MutationObserver(() => zeichne());
  document.querySelectorAll('section.section').forEach(section =>
    beobachter.observe(section, { attributes: true, attributeFilter: ['hidden'] }));

  if (kleinerSchirm.addEventListener) kleinerSchirm.addEventListener('change', schalte);
  else if (kleinerSchirm.addListener) kleinerSchirm.addListener(schalte);
  window.addEventListener('resize', zeichne);
  schalte();
})();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }

