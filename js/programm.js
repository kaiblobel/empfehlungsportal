import { getBelohnungsStufen, getVorlagen, createEmpfehler } from './supabase.js';
import { icon as lucideIcon, ICONS } from './icons.js';

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

const row1 = document.querySelector('[data-row="1"]');
const row2 = document.querySelector('[data-row="2"]');
if (row1) fillTestimonialTrack(row1, TESTIMONIALS.row1);
if (row2) fillTestimonialTrack(row2, TESTIMONIALS.row2);

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
      const iconHtml = ICONS[iconKey]
        ? lucideIcon(iconKey, { size: 28 })
        : `<span class="topic-icon-fallback">${escapeHtml(iconKey || '✦')}</span>`;
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
  window.location.href = `empfehler.html?code=${encodeURIComponent(code)}&neu=1`;
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }
