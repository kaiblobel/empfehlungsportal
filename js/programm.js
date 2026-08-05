import { getBelohnungsStufenPublic, getVorlagenPublic, getBeraterPublicBySlug, supabase } from './supabase.js';
import { icon as lucideIcon, ICONS } from './icons.js';
import { applyBeraterBrand, merkeBerater, gemerkterBerater } from './berater-brand.js';
import { baueReise, reiseHtml } from './belohnungs-reise.js';

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
  const alltagSumEl= document.getElementById('alltagFoerderSum');
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

    // Hero-Card in der Alltag-Sektion mit synchronisieren
    if (alltagSumEl) {
      alltagSumEl.innerHTML = `${fmtEUR(sum)}&nbsp;€`;
    }
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

// === Interaktive Marktübersicht im Teamwork-Abschnitt ===
(function initMarketOverview() {
  const openBtn = document.getElementById('marketOpen');
  const overlay = document.getElementById('marketOverlay');
  const closeBtn = document.getElementById('marketClose');
  if (!openBtn || !overlay || !closeBtn) return;

  const nodes = Array.from(overlay.querySelectorAll('.market-node'));
  const kicker = document.getElementById('marketDetailKicker');
  const title = document.getElementById('marketDetailTitle');
  const hint = document.getElementById('marketDetailHint');
  const list = document.getElementById('marketDetailList');
  let hideTimer = null;

  nodes.forEach(node => {
    const iconName = node.dataset.marketIcon;
    const iconEl = node.querySelector('.market-node-icon');
    if (iconEl && ICONS[iconName]) iconEl.innerHTML = lucideIcon(iconName, { size: 24 });
  });

  function resetDetails() {
    nodes.forEach(node => {
      node.classList.remove('is-active');
      node.setAttribute('aria-pressed', 'false');
    });
    kicker.textContent = 'Deine Ziele';
    title.textContent = 'Ganzheitlich gedacht.';
    hint.textContent = 'Wähle ein Themenfeld aus.';
    hint.hidden = false;
    list.hidden = true;
    list.replaceChildren();
  }

  function showDetails(node) {
    nodes.forEach(item => {
      const isActive = item === node;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });

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
      overlay.classList.add('is-open');
      closeBtn.focus({ preventScroll: true });
    });
  }

  function closeOverview() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('market-overview-open');
    hideTimer = window.setTimeout(() => {
      overlay.hidden = true;
      openBtn.focus({ preventScroll: true });
    }, 320);
  }

  openBtn.addEventListener('click', openOverview);
  closeBtn.addEventListener('click', closeOverview);
  nodes.forEach(node => node.addEventListener('click', () => showDetails(node)));

  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('is-open')) return;
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

  scale.querySelectorAll('.nps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const score = Number(btn.dataset.score);
      // Visuell: alle deaktivieren, geklickte markieren
      scale.querySelectorAll('.nps-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-checked', 'true');

      hideAllResponses();
      const band = bandFor(score);
      const card = responses[band];
      if (card) {
        section?.classList.add('has-nps-response');
        card.hidden = false;
        requestAnimationFrame(() => card.classList.add('show'));
        // Zur Antwort scrollen, damit sie im Gespräch sofort im Blick ist
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 160);
      }

      // Score lokal merken für Re-Render bei Reload
      try { sessionStorage.setItem('nps_score', String(score)); } catch (_) {}
    });
  });

  // Wenn der User schon mal geantwortet hat (gleiche Session), Antwort vorausgewählt
  try {
    const prev = Number(sessionStorage.getItem('nps_score'));
    if (prev >= 1 && prev <= 10) {
      const btn = scale.querySelector(`.nps-btn[data-score="${prev}"]`);
      if (btn) btn.click();
    }
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
const fotoVideo = document.getElementById('t-FotoVideo');

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
    // Kein Berater auflösbar → Standard-Berater (ENV) als letzter Fallback,
    // damit das Portrait nicht leer bleibt.
    if (!sofortBerater) {
      const el = document.getElementById('t-Foto');
      if (el) { el.src = window.ENV_BERATER_FOTO || ''; el.alt = window.ENV_BERATER_NAME || ''; }
    }
    setPromoterEntry(null);
    return;
  }
  window.__beraterPublic = data;
  applyBeraterBrand(data);
  merkeBerater(brandKey, data);
  if (data.foto_url && fotoVideo) fotoVideo.src = data.foto_url;
  setPromoterEntry(data);
});

// IntersectionObserver — Fade-Up
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// === Belohnungs-Reise (Phase 127) ===========================================
// Eine einzige senkrechte Reise von Stufe 1 bis 15, gerendert aus den echten
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

  // Markup kommt aus dem reinen Modul — dieselbe Quelle nutzt die Prüfseite
  // mockups/benefits-pruefung.html, damit beide nicht auseinanderlaufen.
  wrap.innerHTML = reiseHtml(reise);

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
(async function initTopicShowcase() {
  const wrap = document.getElementById('t-Topics');
  const preview = document.getElementById('topicPreview');
  const previewClose = document.getElementById('topicPreviewClose');
  const previewBack = document.getElementById('topicPreviewBack');
  const previewFrame = document.getElementById('topicPreviewFrame');
  const previewTitle = document.getElementById('topicPreviewTitle');
  const previewText = document.getElementById('topicPreviewText');
  const previewIcon = document.getElementById('topicPreviewIcon');
  const previewOpen = document.getElementById('topicPreviewOpen');
  const previewAddress = document.getElementById('topicPreviewAddress');
  if (!wrap) return;

  // Das Modal darf nicht im Stapelkontext des Themen-Abschnitts bleiben.
  // Direkt unter body liegt es zuverlässig über allen Präsentationsfolien.
  if (preview && preview.parentElement !== document.body) document.body.appendChild(preview);

  const readyPages = {
    allgemein: {
      title: 'Ganz allgemein',
      kicker: 'Für alle, die erst einmal Klarheit wollen',
      question: 'Vielleicht steckt in den eigenen Finanzen mehr, als man gerade sieht.',
      text: 'Ein persönlicher Einstieg ohne festes Thema. Sieben Fragen führen zu einer ersten Orientierung.',
      icon: 'Compass',
      url: '/empfaenger.html?von=Thomas&an=Max',
      address: 'Persönliche Empfehlung für Max',
      tone: 'champagne',
      status: 'Fertige Themenseite',
      action: 'Vorschau ansehen'
    },
    baufi: {
      title: 'Baufinanzierung',
      kicker: 'Für Kauf, Neubau und Anschluss',
      question: 'Was ist möglich, ohne dass das Leben nur noch aus Rate besteht?',
      text: 'Ein interaktiver Finanzierungskompass, der zuerst die Situation versteht und dann den nächsten sinnvollen Schritt zeigt.',
      icon: 'Home',
      url: '/baufi.html?von=Thomas&an=Max',
      address: 'Finanzierungskompass für Max',
      tone: 'olive',
      status: 'Fertige Themenseite',
      action: 'Vorschau ansehen'
    },
    foerderungen: {
      title: 'Staatliche Förderungen',
      kicker: 'Fördermöglichkeiten verständlich sortiert',
      question: 'Welche Zuschüsse und Vorteile könnten zu deiner Situation passen?',
      text: 'Das technische Gerüst steht. Inhalte und fachliche Aussagen werden als nächster Schritt ergänzt.',
      icon: 'Banknote',
      url: '/thema.html?vorlage=foerderungen&von=Thomas&an=Max',
      address: 'Förderungen für Max',
      tone: 'champagne',
      status: 'In Arbeit',
      action: 'Gerüst ansehen'
    },
    selbstaendige: {
      title: 'Selbständige',
      kicker: 'Privat und geschäftlich gut aufgestellt',
      question: 'Was braucht ein stabiles Fundament für deinen eigenen Weg?',
      text: 'Das technische Gerüst steht. Inhalte und fachliche Aussagen werden als nächster Schritt ergänzt.',
      icon: 'Briefcase',
      url: '/thema.html?vorlage=selbstaendige&von=Thomas&an=Max',
      address: 'Selbständigen-Thema für Max',
      tone: 'marine',
      status: 'In Arbeit',
      action: 'Gerüst ansehen'
    },
    investment: {
      title: 'Geldanlage und Investment',
      kicker: 'Vermögen sinnvoll aufbauen',
      question: 'Wie kann dein Geld langfristig zu deinem Leben passen?',
      text: 'Das technische Gerüst steht. Inhalte und fachliche Aussagen werden als nächster Schritt ergänzt.',
      icon: 'TrendingUp',
      url: '/thema.html?vorlage=investment&von=Thomas&an=Max',
      address: 'Investment-Thema für Max',
      tone: 'olive',
      status: 'In Arbeit',
      action: 'Gerüst ansehen'
    },
    absicherung: {
      title: 'Absicherung und Familie',
      kicker: 'Schützen, was dir wichtig ist',
      question: 'Was sollte wirklich abgesichert sein und was nicht?',
      text: 'Das technische Gerüst steht. Inhalte und fachliche Aussagen werden als nächster Schritt ergänzt.',
      icon: 'ShieldCheck',
      url: '/thema.html?vorlage=absicherung&von=Thomas&an=Max',
      address: 'Absicherung für Max',
      tone: 'marine',
      status: 'In Arbeit',
      action: 'Gerüst ansehen'
    },
    karriere: {
      title: 'Berufliche Perspektive',
      kicker: 'Neue Möglichkeiten entdecken',
      question: 'Was wäre möglich, wenn dein nächster Schritt wirklich zu dir passt?',
      text: 'Das technische Gerüst steht. Inhalte und fachliche Aussagen werden als nächster Schritt ergänzt.',
      icon: 'Sparkles',
      url: '/thema.html?vorlage=karriere&von=Thomas&an=Max',
      address: 'Berufliche Perspektive für Max',
      tone: 'olive',
      status: 'In Arbeit',
      action: 'Gerüst ansehen'
    },
    kinder: {
      title: 'Für deine Kinder',
      kicker: 'Früh die richtigen Weichen stellen',
      question: 'Wie kann aus einem kleinen Anfang später etwas Großes werden?',
      text: 'Das technische Gerüst steht. Inhalte und fachliche Aussagen werden als nächster Schritt ergänzt.',
      icon: 'Heart',
      url: '/thema.html?vorlage=kinder&von=Thomas&an=Max',
      address: 'Vorsorge für Max und seine Familie',
      tone: 'champagne',
      status: 'In Arbeit',
      action: 'Gerüst ansehen'
    }
  };

  // Die Themenseiten laufen im iframe ohne Token und ohne Login-Kontext des
  // Elternfensters. Ohne ?berater=slug fallen sie auf den Standard-Berater
  // zurück — dann sieht z. B. Sandro auf seiner eigenen Seite Kais Portrait.
  let previewBerater = null;
  const withBerater = (url) => {
    const slug = previewBerater?.slug;
    if (!slug) return url;
    return `${url}${url.includes('?') ? '&' : '?'}berater=${encodeURIComponent(slug)}`;
  };

  const renderIcon = (iconKey, size = 28) => {
    if (ICONS[iconKey]) return lucideIcon(iconKey, { size });
    if (TOPIC_ICON_SVG[iconKey]) return TOPIC_ICON_SVG[iconKey];
    return lucideIcon('Compass', { size });
  };

  const renderFeature = (page, template = {}) => `
    <button class="topic-feature topic-feature-${page.tone}" type="button" data-page-key="${escapeAttr(template.slug || '')}">
      <span class="topic-feature-status"><i aria-hidden="true"></i>${escapeHtml(page.status || 'Fertige Themenseite')}</span>
      <span class="topic-feature-icon" aria-hidden="true">${renderIcon(page.icon, 34)}</span>
      <span class="topic-feature-kicker">${escapeHtml(page.kicker)}</span>
      <strong>${escapeHtml(page.title)}</strong>
      <span class="topic-feature-question">${escapeHtml(page.question)}</span>
      <span class="topic-feature-action">${escapeHtml(page.action || 'Vorschau ansehen')} <span aria-hidden="true">→</span></span>
      <span class="topic-feature-orbit" aria-hidden="true"></span>
    </button>
  `;

  const renderCompact = (template) => {
    const page = readyPages[template.slug];
    return `
    <button class="topic-compact" type="button" data-slug="${escapeAttr(template.slug || '')}" data-page-key="${escapeAttr(template.slug || '')}"${page ? '' : ' disabled'}>
      <span class="topic-compact-icon" aria-hidden="true">${renderIcon(template.icon || 'Compass', 22)}</span>
      <span class="topic-compact-copy">
        <span class="topic-compact-status">${escapeHtml(page?.status || 'Geplant')}</span>
        <strong>${escapeHtml(template.titel || '')}</strong>
        <small>${escapeHtml(template.headline || template.subtext || '')}</small>
      </span>
      <span class="topic-compact-arrow" aria-hidden="true">→</span>
    </button>
  `;
  };

  let hideTimer = null;

  function openTopicPreview(pageKey) {
    const page = readyPages[pageKey];
    if (!page || !preview) return;
    window.clearTimeout(hideTimer);
    previewTitle.textContent = page.title;
    previewText.textContent = page.text;
    previewIcon.innerHTML = renderIcon(page.icon, 34);
    const url = withBerater(page.url);
    previewOpen.href = url;
    previewAddress.textContent = page.address;
    previewFrame.title = `Vorschau: ${page.title}`;
    previewFrame.src = url;
    preview.hidden = false;
    preview.setAttribute('aria-hidden', 'false');
    document.body.classList.add('topic-preview-open');
    requestAnimationFrame(() => {
      preview.classList.add('is-open');
      previewClose?.focus({ preventScroll: true });
    });
  }

  function closeTopicPreview() {
    if (!preview) return;
    preview.classList.remove('is-open');
    preview.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('topic-preview-open');
    hideTimer = window.setTimeout(() => {
      preview.hidden = true;
      previewFrame.src = 'about:blank';
      wrap.querySelector('[data-page-key]')?.focus({ preventScroll: true });
    }, 320);
  }

  try {
    const brandBerater = await beraterPromise.catch(() => null);
    previewBerater = brandBerater;
    const templates = await getVorlagenPublic(brandBerater?.id || window.ENV_BERATER_ID);
    const generalTemplate = templates.find(v => v.slug === 'allgemein') || { slug: 'allgemein', titel: 'Ganz allgemein', icon: 'Compass' };
    const baufiTemplate = templates.find(v => v.slug === 'baufi') || { slug: 'baufi', titel: 'Baufinanzierung', icon: 'Home' };
    const compactTemplates = templates.filter(v => !['allgemein', 'baufi'].includes(v.slug));

    wrap.innerHTML = `
      <div class="topics-featured">
        ${renderFeature(readyPages.allgemein, generalTemplate)}
        ${renderFeature(readyPages.baufi, baufiTemplate)}
      </div>
      <div class="topics-more-head">
        <span>Weitere Themenwelten</span>
        <small>Für das, was im Leben gerade ansteht</small>
      </div>
      <div class="topics-compact-grid">
        ${compactTemplates.map(renderCompact).join('')}
      </div>
    `;

    wrap.querySelectorAll('[data-page-key]').forEach(card => {
      card.addEventListener('click', () => openTopicPreview(card.dataset.pageKey));
    });
  } catch (e) {
    console.warn('[Themen] Konnte nicht geladen werden:', e);
    wrap.innerHTML = '';
  }

  previewClose?.addEventListener('click', closeTopicPreview);
  previewBack?.addEventListener('click', closeTopicPreview);
  document.addEventListener('keydown', event => {
    if (!preview?.classList.contains('is-open')) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTopicPreview();
    }
  }, true);
})();

// Karriere-Karte (alltag) drehen – Tap/Klick + Tastatur, mobil-sicher
document.querySelectorAll('.alltag-flip').forEach((card) => {
  const toggle = () => card.classList.toggle('flipped');
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
});

// Sticky-CTA Reveal nach Hero-Scroll
const sticky = document.getElementById('t-StickyCta');
const hero = document.querySelector('.hero');
const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    sticky.classList.toggle('visible', !e.isIntersecting);
  });
}, { threshold: 0.05 });
if (hero) heroObserver.observe(hero);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }

