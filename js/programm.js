import { getBelohnungsStufen, getVorlagen, createEmpfehler } from './supabase.js';
import { icon as lucideIcon, ICONS } from './icons.js';

// === NPS-Skala (Phase 50i): Reflexions-Frage mit Skala 1-10 ===
(function initNps() {
  const scale = document.getElementById('npsScale');
  if (!scale) return;

  const responses = {
    low:  document.getElementById('npsResponseLow'),
    mid:  document.getElementById('npsResponseMid'),
    high: document.getElementById('npsResponseHigh'),
  };

  function hideAllResponses() {
    Object.values(responses).forEach(el => { if (el) el.hidden = true; });
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
        card.hidden = false;
        requestAnimationFrame(() => card.classList.add('show'));
        // Smooth-Scroll zur Reaktions-Karte
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 160);
      }

      // Score lokal merken (für später analytics / Re-Render bei Reload)
      try { sessionStorage.setItem('nps_score', String(score)); } catch (_) {}

      // GTM-Event (wenn dataLayer vorhanden)
      try {
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'nps_answer',
            nps_score: score,
            nps_band: band,
          });
        }
      } catch (_) {}
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
};

// Foto im Hero + Video-Poster
const beraterFoto = window.ENV_BERATER_FOTO || '';
document.getElementById('t-Foto').src = beraterFoto;
const fotoVideo = document.getElementById('t-FotoVideo');
if (fotoVideo) fotoVideo.src = beraterFoto;

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
        : `${i}. Empfehlung · Standardvergütung 100 €`;
      html += `
        <button
          class="roadmap-stufe ${isPremium ? 'premium' : 'standard'}"
          data-stufe="${i}"
          data-target="${targetId}"
          aria-label="${label}"
          type="button"
        >
          <span class="roadmap-num">${i}</span>
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

  function renderStufen(mode) {
    const filtered = mode === 'alle'
      ? stufen
      : stufen.filter(s => Array.isArray(s.kategorien) && s.kategorien.includes(mode));

    if (!filtered.length) {
      wrap.innerHTML = `<p class="t-body" style="color:var(--text-muted); text-align:center; padding:24px;">Für diesen Modus sind aktuell keine Belohnungen hinterlegt.</p>`;
      return;
    }

    wrap.innerHTML = filtered.map(s => `
      <article class="reward ${s.highlight ? 'highlight' : ''} reveal visible" id="reward-stufe-${s.stufe}">
        ${s.bild_url ? `<img class="reward-img" src="${escapeAttr(s.bild_url)}" alt="${escapeAttr(s.titel)}" loading="lazy" />` : ''}
        <div class="reward-body">
          <span class="t-meta reward-meta">${s.stufe}. Empfehlung</span>
          <h3>${escapeHtml(s.titel)}</h3>
          <p>${escapeHtml(s.beschreibung)}</p>
          ${s.wert_label ? `<span class="wert">Wert ${escapeHtml(s.wert_label)}</span>` : ''}
        </div>
      </article>
    `).join('');
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
})();

// Themen-Auswahl (Vorlagen aus DB)
(async () => {
  const wrap = document.getElementById('t-Topics');
  if (!wrap) return;
  try {
    const vorlagen = await getVorlagen();
    if (!vorlagen?.length) {
      wrap.innerHTML = '';
      return;
    }
    wrap.innerHTML = vorlagen.map(v => {
      const iconKey = v.icon || '';
      // Mehrfach-Fallback: ICONS-Map → lokales TOPIC_ICON_SVG → Default-Sparkle
      let iconHtml;
      if (ICONS[iconKey]) {
        iconHtml = lucideIcon(iconKey, { size: 28 });
      } else if (TOPIC_ICON_SVG[iconKey]) {
        iconHtml = TOPIC_ICON_SVG[iconKey];
      } else {
        iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
      }
      return `
        <article class="topic-card reveal" data-slug="${escapeAttr(v.slug || '')}">
          <span class="topic-icon">${iconHtml}</span>
          <h3 class="topic-title">${escapeHtml(v.titel)}</h3>
          <p class="topic-sub">${escapeHtml(v.headline || '')}</p>
        </article>
      `;
    }).join('');
    wrap.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } catch (e) {
    console.warn('[Themen] Konnte nicht geladen werden:', e);
    wrap.innerHTML = '';
  }
})();

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

  const { data: code, error } = await createEmpfehler({ name, email, telefon });

  if (error || !code) {
    errBox.textContent = 'Konnte nicht angelegt werden: ' + (error?.message || 'unbekannt');
    errBox.classList.add('show');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Meinen Empfehlungs-Link erstellen';
    return;
  }

  try { localStorage.setItem('empfehler_code', code); } catch (_) {}

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
    empfehlenBtn.href = empfehlenUrl;
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

  // Fallback wenn Modal nicht da: direkt zum Empfehlen-Formular
  window.location.href = empfehlenUrl;
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }
