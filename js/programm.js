import { getBelohnungsStufen, getVorlagen, createEmpfehler, getBeraterPublicBySlug, createEmpfehlung, getEmpfehlerByCode, supabase } from './supabase.js';
import { icon as lucideIcon, ICONS } from './icons.js';
import { applyBeraterBrand } from './berater-brand.js';

// Multi-Tenant: Berater-Einstieg via ?berater=slug (z. B. ?berater=sven-augustin).
// Wird unten zum Branding genutzt + an create_empfehler durchgereicht.
const beraterSlug = new URLSearchParams(window.location.search).get('berater');

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

// === Präsentations-Modus (Phase 50j): Slide-Modus für Live-Pitch ===
(function initPresentationMode() {
  const toggleBtn = document.getElementById('presentToggle');
  const nav = document.getElementById('presentNav');
  if (!toggleBtn || !nav) return;

  const prevBtn = document.getElementById('presentPrev');
  const nextBtn = document.getElementById('presentNext');
  const exitBtn = document.getElementById('presentExit');
  const currentEl = document.getElementById('presentCurrent');
  const totalEl = document.getElementById('presentTotal');

  // Sektionen ausser dem letzten Footer als Slides erfassen
  const allSections = Array.from(document.querySelectorAll('main > section.section, section.section'));
  // Einzelne Inhalte bleiben auf der Webseite erhalten, werden aber nicht als Folie gezeigt.
  const slides = allSections.filter(section => section.dataset.presentation !== 'skip');
  totalEl.textContent = String(slides.length);

  let isActive = false;
  let currentIdx = 0;
  let wheelLocked = false;

  function indexFromPageScroll() {
    const y = window.scrollY + window.innerHeight / 2;
    let idx = 0;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].offsetTop <= y) idx = i;
    }
    return idx;
  }

  function updateNavState() {
    currentEl.textContent = String(currentIdx + 1);
    prevBtn.disabled = currentIdx === 0;
    nextBtn.disabled = currentIdx === slides.length - 1;
  }

  function activate(startAtBeginning = false) {
    currentIdx = startAtBeginning ? 0 : indexFromPageScroll();
    document.documentElement.classList.add('present-active');
    document.body.classList.add('presentation-mode');
    nav.hidden = false;
    toggleBtn.setAttribute('aria-pressed', 'true');
    isActive = true;
    document.addEventListener('keydown', onKey, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });
    goTo(currentIdx, true);
  }

  function deactivate() {
    const exitSlide = slides[currentIdx];
    document.documentElement.classList.remove('present-active');
    document.body.classList.remove('presentation-mode');
    nav.hidden = true;
    toggleBtn.setAttribute('aria-pressed', 'false');
    isActive = false;
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('wheel', onWheel);
    slides.forEach(slide => {
      slide.classList.remove('present-before', 'present-current', 'present-after');
      slide.removeAttribute('aria-hidden');
    });
    requestAnimationFrame(() => exitSlide?.scrollIntoView({ behavior: 'auto', block: 'start' }));
  }

  function goTo(idx, instant = false) {
    if (idx < 0) idx = 0;
    if (idx >= slides.length) idx = slides.length - 1;
    currentIdx = idx;
    if (instant) document.documentElement.classList.add('present-no-motion');
    slides.forEach((slide, slideIdx) => {
      slide.classList.toggle('present-before', slideIdx < idx);
      slide.classList.toggle('present-current', slideIdx === idx);
      slide.classList.toggle('present-after', slideIdx > idx);
      slide.setAttribute('aria-hidden', slideIdx === idx ? 'false' : 'true');
      if (slideIdx === idx) slide.scrollTop = 0;
    });
    updateNavState();
    if (instant) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.documentElement.classList.remove('present-no-motion');
      }));
    }
  }

  function next() { goTo(currentIdx + 1); }
  function prev() { goTo(currentIdx - 1); }

  function onKey(e) {
    if (!isActive) return;
    if (document.body.classList.contains('market-overview-open') || document.body.classList.contains('topic-preview-open')) return;
    // Editor-Fokus nicht abfangen
    const tag = (e.target?.tagName || '').toLowerCase();
    if (e.target?.isContentEditable) return;
    if (['input','textarea','select','button'].includes(tag) && e.target !== document.body) {
      // Pfeile in Inputs erlauben
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        prev();
        break;
      case 'Escape':
        e.preventDefault();
        deactivate();
        break;
      case 'Home':
        e.preventDefault();
        goTo(0);
        break;
      case 'End':
        e.preventDefault();
        goTo(slides.length - 1);
        break;
    }
  }

  function onWheel(e) {
    if (!isActive || Math.abs(e.deltaY) < 18) return;
    if (document.body.classList.contains('market-overview-open') || document.body.classList.contains('topic-preview-open')) {
      e.preventDefault();
      return;
    }
    const activeSlide = slides[currentIdx];
    const hasInnerScroll = activeSlide.scrollHeight > activeSlide.clientHeight + 2;
    const atTop = activeSlide.scrollTop <= 1;
    const atBottom = activeSlide.scrollTop + activeSlide.clientHeight >= activeSlide.scrollHeight - 1;

    if (hasInnerScroll && ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop))) return;

    e.preventDefault();
    if (wheelLocked) return;
    wheelLocked = true;
    if (e.deltaY > 0) next();
    else prev();
    window.setTimeout(() => { wheelLocked = false; }, 720);
  }

  toggleBtn.addEventListener('click', () => isActive ? deactivate() : activate(false));
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  exitBtn.addEventListener('click', deactivate);

  // Auto-Activate bei ?mode=slides (für direkten Link aus Sidebar)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'slides') {
      // Kurz warten bis Layout steht
      setTimeout(() => activate(true), 80);
    }
  } catch (_) {}
})();

// === Interaktive Marktübersicht auf Folie 3 ===
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
        // Auf der normalen Seite zur Antwort scrollen. Im Präsentationsmodus
        // erscheint sie direkt auf dem Porträt und bleibt vollständig sichtbar.
        if (!document.body.classList.contains('presentation-mode')) {
          setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 160);
        }
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

// Foto im Hero + Video-Poster (ENV-Fallback; Multi-Tenant überschreibt unten)
const beraterFoto = window.ENV_BERATER_FOTO || '';
document.getElementById('t-Foto').src = beraterFoto;
const fotoVideo = document.getElementById('t-FotoVideo');
if (fotoVideo) fotoVideo.src = beraterFoto;

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

beraterPromise.then((data) => {
  if (!data) return;
  window.__beraterPublic = data; // für Potenzialliste (Berater-Vorname in WhatsApp-Text)
  applyBeraterBrand(data);
  if (data.foto_url && fotoVideo) fotoVideo.src = data.foto_url;
  // Die Testimonials sind echte Google-Bewertungen von Kai. Für andere
  // Berater ausblenden, statt fremde Rezensionen unter ihrem Namen zu zeigen.
  if (data.slug && data.slug !== 'kai-blobel') {
    const tSection = document.getElementById('bewertungen');
    if (tSection) tSection.style.display = 'none';
  }
});

// === Testimonials Marquee: dynamisch befüllen mit genug Wiederholungen ===
const TESTIMONIALS = {
  row1: [
    { initials: 'MB', color: 'champagne', name: 'Martin Böhm',       context: 'Google-Bewertung',     quote: 'Erstklassige Beratung und Betreuung, kann ich nur weiterempfehlen.' },
    { initials: 'SH', color: 'terracotta', name: 'Sandra Heinze',    context: 'Local Guide · Google', quote: 'Fachlich exzellent, menschlich super angenehm.' },
    { initials: 'JB', color: 'champagne', name: 'Josephine Bürger',  context: 'Google-Bewertung',     quote: 'Modern, sympathisch und ehrlich.' },
    { initials: 'CK', color: 'terracotta', name: 'Cindy Kühn',       context: 'Google-Bewertung',     quote: 'Angenehme und vertrauensvolle Zusammenarbeit.' },
  ],
  row2: [
    { initials: 'MG', color: 'sage',   name: 'Mike Gerber',     context: 'Local Guide · Google', quote: 'Ich werde seit vielen Jahren in unterschiedlichen Finanzangelegenheiten erfolgreich durch Herrn Blobel beraten.' },
    { initials: 'TM', color: 'marine', name: 'Torsten Memczak', context: 'Google-Bewertung',     quote: 'Seit 2006 betreut mich Herr Blobel und hilft mir bei Versicherungsfragen.' },
    { initials: 'LS', color: 'sage',   name: 'Lucas Schmidt',   context: 'Google-Bewertung',     quote: 'Sehr nette und kompetente Beratung bei jeglichen Fragen und Themen.' },
    { initials: 'MM', color: 'marine', name: 'Mathias M.',      context: 'Local Guide · Google', quote: 'Sehr lockere Gespräche. Die Atmosphäre passt auch.' },
  ],
};

function renderTestimonialCard(t, hidden) {
  return `
    <article class="testimonial-card"${hidden ? ' aria-hidden="true"' : ''}>
      <div class="testimonial-stars" aria-label="5 von 5">★★★★★</div>
      <p class="testimonial-quote">„${escapeHtml(t.quote)}"</p>
      <div class="testimonial-author">
        <span class="testimonial-avatar" data-color="${escapeAttr(t.color)}">${escapeHtml(t.initials)}</span>
        <div class="testimonial-author-text">
          <span class="testimonial-name">${escapeHtml(t.name)}</span>
          <span class="testimonial-context">${escapeHtml(t.context)}</span>
        </div>
      </div>
    </article>
  `;
}

function fillTestimonialTrack(track, items) {
  // Eine "Einheit" = alle Items 1x. Wir rendern 6 Einheiten:
  // 3 sichtbar + 3 als nahtloser Loop-Puffer. Animation läuft 0 -> -50%.
  // Das stellt sicher, dass auch auf breiten Monitoren immer Cards den
  // Viewport füllen und kein Leerraum sichtbar wird.
  const REPEATS = 6;
  let html = '';
  for (let r = 0; r < REPEATS; r++) {
    const hidden = r >= REPEATS / 2; // zweite Hälfte ist aria-hidden Duplikat
    for (const t of items) html += renderTestimonialCard(t, hidden);
  }
  track.innerHTML = html;
}

// JS rendert nur wenn Track leer ist — sonst behalte statische HTML-Cards (Mobile-Safari-Sicherheit)
const row1 = document.querySelector('[data-row="1"]');
const row2 = document.querySelector('[data-row="2"]');
if (row1 && row1.children.length === 0) fillTestimonialTrack(row1, TESTIMONIALS.row1);
if (row2 && row2.children.length === 0) fillTestimonialTrack(row2, TESTIMONIALS.row2);

// IntersectionObserver — Fade-Up
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Belohnungs-Cards rendern (mit Bild) + Modus-Filter + Roadmap + Total-Counter
(async () => {
  const stufen = await getBelohnungsStufen();
  const wrap = document.getElementById('t-Rewards');
  if (!stufen.length) {
    wrap.innerHTML = '<p class="t-body" style="color:var(--text-muted);">Belohnungen konnten nicht geladen werden.</p>';
    return;
  }

  // Lucide-Icons für Modus-Chips hydrieren
  document.querySelectorAll('.reward-mode-icon[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    if (ICONS[name]) el.innerHTML = lucideIcon(name, { size: 22 });
  });

  // === Roadmap rendern (Stufen 1-15) ===
  const roadmapEl = document.getElementById('t-Roadmap');
  if (roadmapEl) {
    const MAX_STUFE = 15;
    const stufenMap = new Map(stufen.map(s => [s.stufe, s]));
    let html = '<div class="roadmap-line" aria-hidden="true"></div><div class="roadmap-stufen">';
    for (let i = 1; i <= MAX_STUFE; i++) {
      const s = stufenMap.get(i);
      const isPremium = !!s;
      const targetId = isPremium ? `reward-stufe-${i}` : '';
      const label = isPremium
        ? escapeAttr(`${s.stufe}. Empfehlung · ${s.titel}`)
        : `${i}. Empfehlung · Empfehlungsbonus 100 €`;
      const shortLabel = isPremium ? escapeHtml(s.titel.split(' ')[0]) : '';
      html += `
        <button
          class="roadmap-stufe ${isPremium ? 'premium' : 'standard'}"
          data-stufe="${i}"
          data-target="${targetId}"
          aria-label="${label}"
          type="button"
        >
          <span class="roadmap-num">${i}</span>
          ${isPremium && shortLabel ? `<span class="roadmap-reward-label">${shortLabel}</span>` : ''}
          <span class="roadmap-tip">${label}</span>
        </button>
      `;
    }
    html += '</div>';
    roadmapEl.innerHTML = html;

    // Click → Smooth-Scroll zur Galerie-Karte
    roadmapEl.querySelectorAll('.roadmap-stufe.premium').forEach(btn => {
      btn.addEventListener('click', () => {
        const tgt = document.getElementById(btn.dataset.target);
        if (tgt) {
          tgt.scrollIntoView({ behavior: 'smooth', block: 'center' });
          tgt.classList.add('reward-flash');
          setTimeout(() => tgt.classList.remove('reward-flash'), 1400);
        }
      });
    });
  }

  // === Counter-Up für Total-Card ===
  const counterEl = document.querySelector('.rewards-total-counter');
  if (counterEl) {
    const target = parseInt(counterEl.dataset.target, 10) || 0;
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const duration = 1600;
          const start = performance.now();
          const formatter = new Intl.NumberFormat('de-DE');
          const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
            counterEl.textContent = formatter.format(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          counterIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    counterIO.observe(counterEl);
  }

  // === Belohnungs-Galerie: Premium-Karten + gruppierte Bonus-Kacheln ===
  // (Bonus als feste Kachel je Lücke: Stufe 3–4 eine Kachel, 8–9 eine Kachel …)
  const BONUS_IMG = '/assets/images/programm/kundenlos.jpg';
  const BONUS_DESC = '100 € als Wunschgutschein, PayPal-Auszahlung oder Spende deiner Wahl.';

  const rewardCardHTML = (s) => {
    const isBonus = /bonus/i.test(s.titel || '');
    const img = isBonus ? BONUS_IMG : s.bild_url;
    const titel = isBonus ? 'Empfehlungsbonus' : s.titel;
    return `
      <article class="reward ${s.highlight ? 'highlight' : ''} reveal visible" id="reward-stufe-${s.stufe}">
        ${img ? `<img class="reward-img" src="${escapeAttr(img)}" alt="${escapeAttr(titel)}" loading="lazy" />` : ''}
        <div class="reward-body">
          <span class="t-meta reward-meta">${s.stufe}. Empfehlung</span>
          <h3>${escapeHtml(titel)}</h3>
          <p>${escapeHtml(s.beschreibung || '')}</p>
          ${s.wert_label ? `<span class="wert">Wert ${escapeHtml(s.wert_label)}</span>` : ''}
          <button type="button" class="reward-eintragen" data-start="1">Jetzt starten →</button>
        </div>
      </article>`;
  };

  // Gruppierte Bonus-Kachel für einen Stufenbereich (a..b)
  const bonusCardHTML = (a, b) => {
    const meta = (a === b) ? `${a}. Empfehlung` : `${a}.–${b}. Empfehlung`;
    const wert = (a === b) ? '100 €' : 'je 100 €';
    return `
      <article class="reward reward-bonus reveal visible">
        <img class="reward-img" src="${BONUS_IMG}" alt="Empfehlungsbonus" loading="lazy" />
        <div class="reward-body">
          <span class="t-meta reward-meta">${meta}</span>
          <h3>Empfehlungsbonus</h3>
          <p>${escapeHtml(BONUS_DESC)}</p>
          <span class="wert">Wert ${wert}</span>
        </div>
      </article>`;
  };

  function renderStufen(mode) {
    if (mode === 'alle') {
      const premium = stufen.filter(s => !/bonus/i.test(s.titel || '')).slice().sort((a, b) => a.stufe - b.stufe);
      let html = '';
      let prev = 0;
      premium.forEach(p => {
        const a = prev + 1, b = p.stufe - 1;
        if (a <= b) html += bonusCardHTML(a, b);
        html += rewardCardHTML(p);
        prev = p.stufe;
      });
      wrap.innerHTML = html;
      return;
    }
    const list = stufen.filter(s => Array.isArray(s.kategorien) && s.kategorien.includes(mode));
    if (!list.length) {
      wrap.innerHTML = `<p class="t-body" style="color:var(--text-muted); text-align:center; padding:24px;">Für diesen Modus sind aktuell keine Belohnungen hinterlegt.</p>`;
      return;
    }
    wrap.innerHTML = list.map(rewardCardHTML).join('');
  }

  // Initial: alle
  renderStufen('alle');

  // Modus-Switch-Buttons
  const chips = document.querySelectorAll('.reward-mode-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      renderStufen(chip.dataset.mode);
    });
  });

  // "Jetzt starten" → zum Anmelde-Formular (Promoter anlegen); das Eintragen der
  // Empfehlungen passiert danach auf dem individuellen Link (empfehler.html?code=…).
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.reward-eintragen');
    if (!btn) return;
    document.getElementById('anmelden')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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

  const readyPages = {
    allgemein: {
      title: 'Ganz allgemein',
      kicker: 'Für alle, die erst einmal Klarheit wollen',
      question: 'Vielleicht steckt in den eigenen Finanzen mehr, als man gerade sieht.',
      text: 'Ein persönlicher Einstieg ohne festes Thema. Sieben Fragen führen zu einer ersten Orientierung.',
      icon: 'Compass',
      url: '/empfaenger.html?von=Thomas&an=Max',
      address: 'Persönliche Empfehlung für Max',
      tone: 'champagne'
    },
    baufi: {
      title: 'Baufinanzierung',
      kicker: 'Für Kauf, Neubau und Anschluss',
      question: 'Was ist möglich, ohne dass das Leben nur noch aus Rate besteht?',
      text: 'Ein interaktiver Finanzierungskompass, der zuerst die Situation versteht und dann den nächsten sinnvollen Schritt zeigt.',
      icon: 'Home',
      url: '/baufi.html?von=Thomas&an=Max',
      address: 'Finanzierungskompass für Max',
      tone: 'olive'
    }
  };

  const renderIcon = (iconKey, size = 28) => {
    if (ICONS[iconKey]) return lucideIcon(iconKey, { size });
    if (TOPIC_ICON_SVG[iconKey]) return TOPIC_ICON_SVG[iconKey];
    return lucideIcon('Compass', { size });
  };

  const renderFeature = (page, template = {}) => `
    <button class="topic-feature topic-feature-${page.tone}" type="button" data-page-key="${escapeAttr(template.slug || '')}">
      <span class="topic-feature-status"><i aria-hidden="true"></i> Fertige Themenseite</span>
      <span class="topic-feature-icon" aria-hidden="true">${renderIcon(page.icon, 34)}</span>
      <span class="topic-feature-kicker">${escapeHtml(page.kicker)}</span>
      <strong>${escapeHtml(page.title)}</strong>
      <span class="topic-feature-question">${escapeHtml(page.question)}</span>
      <span class="topic-feature-action">Vorschau ansehen <span aria-hidden="true">→</span></span>
      <span class="topic-feature-orbit" aria-hidden="true"></span>
    </button>
  `;

  const renderCompact = (template) => `
    <article class="topic-compact" data-slug="${escapeAttr(template.slug || '')}">
      <span class="topic-compact-icon" aria-hidden="true">${renderIcon(template.icon || 'Compass', 22)}</span>
      <span class="topic-compact-copy">
        <strong>${escapeHtml(template.titel || '')}</strong>
        <small>${escapeHtml(template.headline || template.subtext || '')}</small>
      </span>
    </article>
  `;

  let hideTimer = null;

  function openTopicPreview(pageKey) {
    const page = readyPages[pageKey];
    if (!page || !preview) return;
    window.clearTimeout(hideTimer);
    previewTitle.textContent = page.title;
    previewText.textContent = page.text;
    previewIcon.innerHTML = renderIcon(page.icon, 34);
    previewOpen.href = page.url;
    previewAddress.textContent = page.address;
    previewFrame.title = `Vorschau: ${page.title}`;
    previewFrame.src = page.url;
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
    const templates = await getVorlagen();
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

// Anmelde-Form
const form = document.getElementById('t-AnmeldeForm');
const submitBtn = document.getElementById('t-Submit');
const errBox = document.getElementById('t-Err');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.remove('show');

  const name = document.getElementById('t-Name').value.trim();
  const email = document.getElementById('t-Email').value.trim();
  const telefon = document.getElementById('t-Telefon').value.trim();

  if (!name || name.length < 2) {
    errBox.textContent = 'Bitte gib deinen Namen ein.';
    errBox.classList.add('show');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Erstelle…';

  const { data: code, error } = await createEmpfehler({ name, email, telefon, beraterSlug });

  if (error || !code) {
    errBox.textContent = 'Konnte nicht angelegt werden: ' + (error?.message || 'unbekannt');
    errBox.classList.add('show');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Meinen Empfehlungs-Link erstellen';
    return;
  }

  try { localStorage.setItem('empfehler_code', code); } catch (_) {}
  // Potenzialliste live freischalten (falls der Kunde auf der Seite bleibt)
  if (typeof window.__potenzialActivate === 'function') window.__potenzialActivate(code);

  // === Erfolgs-Modal anzeigen ===
  // Dashboard-Link bleibt für den Empfehler selbst (NICHT teilen).
  // Empfehlungs-CTA führt zu empfehlen.html?code=... wo der Empfehler die
  // konkrete Empfehlung mit Thema-Auswahl ausspricht.
  const personalLink = `${window.location.origin}/empfehler.html?code=${encodeURIComponent(code)}`;
  const dashboardUrl = `empfehler.html?code=${encodeURIComponent(code)}&neu=1`;
  const empfehlenUrl = `empfehlen.html?code=${encodeURIComponent(code)}`;

  const modal = document.getElementById('t-SuccessModal');
  const linkInput = document.getElementById('t-SuccessLink');
  const empfehlenBtn = document.getElementById('t-SuccessEmpfehlen');
  const dashBtn = document.getElementById('t-SuccessDashboard');
  const copyBtn = document.getElementById('t-SuccessCopy');
  const closeBtn = document.getElementById('t-SuccessClose');
  const backdrop = document.getElementById('t-SuccessBackdrop');
  const subText = document.getElementById('t-SuccessSub');

  if (modal && linkInput && empfehlenBtn) {
    linkInput.value = personalLink;
    empfehlenBtn.href = dashboardUrl; // primär → individueller Link (dort wird eingetragen)
    dashBtn.href = dashboardUrl;

    if (subText && name) {
      const firstName = name.split(' ')[0];
      subText.textContent = `Willkommen, ${firstName}. Sag mir, wen du empfehlen möchtest.`;
    }

    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';

    const closeModal = (targetUrl) => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => {
        modal.hidden = true;
        if (targetUrl) window.location.href = targetUrl;
      }, 280);
    };

    closeBtn?.addEventListener('click', () => closeModal(dashboardUrl), { once: true });
    backdrop?.addEventListener('click', () => closeModal(dashboardUrl), { once: true });

    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(personalLink);
        copyBtn.textContent = 'Kopiert ✓';
        setTimeout(() => { copyBtn.textContent = 'Kopieren'; }, 1800);
      } catch (e) {
        linkInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Kopiert ✓';
        setTimeout(() => { copyBtn.textContent = 'Kopieren'; }, 1800);
      }
    });

    return;
  }

  // Fallback wenn Modal nicht da: direkt zum individuellen Link
  window.location.href = dashboardUrl;
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }

// Telefon → E.164 (lokale Kopie aus app.js; wa.me lehnt deutsche 0…-Nummern ab)
function normalizePhoneDE(raw) {
  let n = (raw || '').replace(/[^\d+]/g, '');
  if (!n) return '';
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) return '+' + n.slice(2);
  if (n.startsWith('0')) return '+49' + n.slice(1);
  return '+' + n;
}
// WhatsApp-Nachricht (lokale Kopie aus app.js, typ='info'-Variante)
function buildPotenzialMessage(vorname, link, beraterVorname) {
  const name = (vorname || '').trim() || 'du';
  const bVor = (beraterVorname || '').trim() || 'Er';
  return `Hallo ${name}, ich möchte dich kurz mit jemandem bekannt machen, dem ich sehr vertraue. Schau dir das kurz an, bevor ${bVor} sich bei dir meldet. ${link}`;
}

// === Potenzialliste (Phase 71): Kontakte direkt eintragen + Link erzeugen ===
(function initPotenzialliste() {
  const guard = document.getElementById('potenzialGuard');
  const tool = document.getElementById('potenzialTool');
  const rowsEl = document.getElementById('potenzialRows');
  const chipsEl = document.getElementById('potenzialChips');
  const freeEl = document.getElementById('potenzialFree');
  if (!guard || !tool || !rowsEl || !chipsEl) return;

  let empfehlerData = null; // { id, berater_id }
  let vorlagen = [];
  let currentCount = 5;

  // --- Zwischenspeicher (localStorage), damit im Gespräch nichts verloren geht ---
  const DRAFT_KEY = 'potenzial_draft_v1';
  function saveDraft() {
    if (!empfehlerData) return;
    const rows = [...rowsEl.querySelectorAll('.potenzial-row')].map(r => ({
      name: r.querySelector('[data-f="name"]').value,
      tel: r.querySelector('[data-f="tel"]').value,
      thema: r.querySelector('[data-f="thema"]').value,
      done: r.dataset.done === '1',
      link: r.dataset.link || '',
      msg: r.dataset.msg || '',
      teln: r.dataset.tel || '',
    }));
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ code: empfehlerData.code, count: currentCount, rows })); } catch (_) {}
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return (d && d.code === empfehlerData?.code) ? d : null;
    } catch (_) { return null; }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} }

  function beraterVorname() {
    const b = window.__beraterPublic || null;
    return (b?.name || '').trim().split(' ')[0] || '';
  }

  function themeOptions(selected) {
    const opts = vorlagen.length
      ? vorlagen.map(v => `<option value="${escapeAttr(v.slug)}"${v.slug === selected ? ' selected' : ''}>${escapeHtml(v.titel || v.slug)}</option>`).join('')
      : '<option value="allgemein">Allgemein</option>';
    return opts;
  }

  function renderRows(n, saved) {
    const rows = [];
    for (let i = 1; i <= n; i++) {
      const s = saved && saved[i - 1] ? saved[i - 1] : null;
      const nameV = s ? escapeAttr(s.name || '') : '';
      const telV = s ? escapeAttr(s.tel || '') : '';
      const done = !!(s && s.done);
      const btnLabel = done ? (s.teln ? 'Erneut senden' : 'Link kopieren') : 'Link erstellen &amp; senden';
      const btnCls = done ? 'btn-secondary' : 'btn-primary';
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
          <button type="button" class="potenzial-send btn ${btnCls}" data-send="${i}">${btnLabel}</button>
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

  async function activate(code) {
    if (!code) { guard.hidden = false; tool.hidden = true; return; }
    let data = null;
    try { const res = await getEmpfehlerByCode(code); data = res?.data || null; } catch (_) {}
    if (!data) { guard.hidden = false; tool.hidden = true; return; }
    empfehlerData = data;
    try { vorlagen = await getVorlagen(); } catch (_) { vorlagen = []; }
    guard.hidden = true;
    tool.hidden = false;
    const draft = loadDraft();
    if (draft && Array.isArray(draft.rows) && draft.rows.length) {
      setCount(draft.count || draft.rows.length, draft.rows);
    } else {
      setCount(currentCount);
    }
  }
  // Für den Register-Handler erreichbar machen (Kunde bleibt auf der Seite)
  window.__potenzialActivate = activate;

  // Anzahl-Chips
  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.potenzial-chip[data-count]');
    if (!chip) return;
    if (freeEl) freeEl.value = '';
    setCount(Number(chip.dataset.count));
  });
  if (freeEl) {
    freeEl.addEventListener('input', () => {
      const v = Number(freeEl.value);
      if (v >= 1) setCount(v);
    });
  }

  // Eingaben zwischenspeichern (Name/Telefon tippen, Thema wählen)
  rowsEl.addEventListener('input', saveDraft);
  rowsEl.addEventListener('change', saveDraft);

  // Kopplung: Belohnungs-Galerie ruft dies auf → Anzahl vorbelegen + hinscrollen
  window.__potenzialPrefill = (n) => {
    setCount(Number(n) || currentCount);
    document.getElementById('potenzialliste')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Link erstellen & senden (pro Zeile) — bzw. erneut teilen/kopieren wenn schon erstellt
  rowsEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.potenzial-send');
    if (!btn || !empfehlerData) return;
    const row = btn.closest('.potenzial-row');
    if (!row) return;

    // Bereits erstellt → erneut teilen/kopieren
    if (row.dataset.done === '1') {
      e.preventDefault();
      const link = row.dataset.link;
      const tel = row.dataset.tel;
      if (tel) {
        window.open(`https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(row.dataset.msg || link)}`, '_blank');
      } else {
        try {
          await navigator.clipboard.writeText(link);
          const st = row.querySelector('.potenzial-status');
          if (st) st.innerHTML = 'Kopiert ✓';
        } catch (_) {}
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
        empfehler_id: empfehlerData.id,
        berater_id: empfehlerData.berater_id || window.ENV_BERATER_ID,
        typ: 'info',
      });
      if (error) throw error;
      const token = data?.link_token || 'demo';
      const link = `${window.location.origin}/e?token=${token}&vorlage=${encodeURIComponent(slug)}`;
      row.dataset.done = '1';
      row.classList.add('is-done');
      const vorname = name.split(' ')[0];
      const msg = buildPotenzialMessage(vorname, link, beraterVorname());
      // WhatsApp öffnen, wenn Nummer da; sonst Link kopieren
      if (tel) {
        const waNum = tel.replace(/\D/g, '');
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        try { await navigator.clipboard.writeText(link); } catch (_) {}
      }
      statusEl.innerHTML = 'Link erstellt ✓';
      statusEl.className = 'potenzial-status is-done';
      btn.textContent = tel ? 'Erneut senden' : 'Link kopieren';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
      btn.disabled = false;
      row.dataset.link = link;
      row.dataset.msg = msg;
      row.dataset.tel = tel;
      // Zeile gegen Änderung sperren + Zustand sichern
      row.querySelectorAll('.potenzial-f').forEach(f => { f.readOnly = true; f.disabled = f.tagName === 'SELECT'; });
      saveDraft();
    } catch (err) {
      console.warn('[potenzial] createEmpfehlung fehlgeschlagen', err);
      statusEl.textContent = 'Fehler, bitte nochmal';
      statusEl.className = 'potenzial-status is-error';
      btn.disabled = false;
      btn.textContent = prevLabel;
    }
  });

  // Mini-Registrierung direkt im Block (kein Hochscrollen zum großen Formular)
  const regForm = document.getElementById('potenzialRegForm');
  const regErr = document.getElementById('potenzialRegErr');
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (regErr) regErr.hidden = true;
    const nameEl = document.getElementById('potenzialRegName');
    const telEl = document.getElementById('potenzialRegTel');
    const regBtn = document.getElementById('potenzialRegBtn');
    const name = (nameEl?.value || '').trim();
    const tel = (telEl?.value || '').trim();
    if (!name || name.length < 2) {
      if (regErr) { regErr.textContent = 'Bitte gib deinen Namen ein.'; regErr.hidden = false; }
      return;
    }
    regBtn.disabled = true;
    const prev = regBtn.textContent;
    regBtn.textContent = 'Moment…';
    try {
      const { data: code, error } = await createEmpfehler({ name, email: '', telefon: tel, beraterSlug });
      if (error || !code) throw (error || new Error('kein Code'));
      try { localStorage.setItem('empfehler_code', code); } catch (_) {}
      await activate(code);
    } catch (err) {
      console.warn('[potenzial] Registrierung fehlgeschlagen', err);
      if (regErr) { regErr.textContent = 'Hat nicht geklappt, bitte nochmal.'; regErr.hidden = false; }
      regBtn.disabled = false;
      regBtn.textContent = prev;
    }
  });

  // "Liste leeren" — Draft verwerfen + frische Zeilen
  document.getElementById('potenzialClear')?.addEventListener('click', () => {
    clearDraft();
    renderRows(currentCount);
  });

  // Beim Laden: vorhandenen Promoter-Code aus localStorage nutzen
  let savedCode = '';
  try { savedCode = localStorage.getItem('empfehler_code') || ''; } catch (_) {}
  activate(savedCode);
})();
