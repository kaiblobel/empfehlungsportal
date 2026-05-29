import {
  createEmpfehlung,
  updateLinkGeoeffnet,
  updateAusgetragen,
  markInteressiert,
  markAnrufwunsch,
  getEmpfehlungByToken,
  getVorlagen,
  getVorlage,
} from './supabase.js';

const page = document.body.dataset.page;

function buildMessage(vorname, typ, link) {
  const name = vorname?.trim() || '[Vorname]';
  if (typ === 'info') {
    return `Hallo ${name}, ich möchte dich kurz mit jemandem bekannt machen, dem ich sehr vertraue. Schau dir das kurz an, bevor Kai sich bei dir meldet. ${link}`;
  }
  return `Hallo ${name}, ich bin seit einiger Zeit Kunde bei Kai Blobel und wollte dich kurz informieren: Kai wird sich in den nächsten Tagen bei dir melden. Er hat mir sehr geholfen und ich dachte sofort an dich. ${link}`;
}

function showToast(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- INDEX (Slide-Flow) ---------- */
if (page === 'index') {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  const progressBar = document.getElementById('progressBar');
  const counter = document.getElementById('counter');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  let current = 0;
  let checklistTriggered = false;

  function render() {
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    const pct = ((current + 1) / total) * 100;
    progressBar.style.width = pct + '%';
    counter.textContent = `${current + 1} / ${total}`;
    prevBtn.disabled = current === 0;
    nextBtn.textContent = current === total - 1 ? 'Fertig' : 'Weiter';

    if (slides[current].dataset.slide === '8' && !checklistTriggered) {
      checklistTriggered = true;
      const items = document.querySelectorAll('#checklist li');
      items.forEach((li, idx) => {
        setTimeout(() => li.classList.add('visible'), 200 + idx * 400);
      });
    }
  }

  function go(delta) {
    const next = current + delta;
    if (next < 0 || next >= total) return;
    current = next;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => {
    if (current === total - 1) return;
    go(1);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });

  // Touch-Swipe
  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) go(1); else go(-1);
    }
  }, { passive: true });

  render();
}

/* ---------- EMPFEHLEN ---------- */
if (page === 'empfehlen') {
  const params = new URLSearchParams(window.location.search);
  const typ = params.get('typ') === 'info' ? 'info' : 'direkt';

  const headline = document.getElementById('formHeadline');
  headline.textContent = typ === 'info'
    ? 'Wen möchtest du vorab informieren?'
    : 'Wen möchtest du empfehlen?';

  const vornameEl = document.getElementById('vorname');
  const nachnameEl = document.getElementById('nachname');
  const telefonEl = document.getElementById('telefon');
  const empfehlerEl = document.getElementById('empfehlerName');
  const nachrichtEl = document.getElementById('empfehlerNachricht');
  const charCount = document.getElementById('charCount');
  const preview = document.getElementById('messagePreview');
  const shareBtn = document.getElementById('shareBtn');
  const form = document.getElementById('empfehlForm');

  if (nachrichtEl && charCount) {
    nachrichtEl.addEventListener('input', () => {
      charCount.textContent = `${nachrichtEl.value.length}/200`;
    });
  }

  // ----- Vorlagen-Grid -----
  const vorlageSlugEl = document.getElementById('vorlageSlug');
  const grid = document.getElementById('vorlagenGrid');
  if (grid) {
    (async () => {
      const list = await getVorlagen();
      if (!list.length) {
        grid.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Vorlagen konnten nicht geladen werden.</p>';
        return;
      }
      grid.innerHTML = list.map(v => `
        <button type="button" class="vorlage-kachel${v.slug === 'allgemein' ? ' selected' : ''}" data-slug="${v.slug}">
          <span class="icon">${v.icon || ''}</span>
          <span class="titel">${escapeHtml(v.titel)}</span>
        </button>
      `).join('');
      grid.querySelectorAll('.vorlage-kachel').forEach(btn => {
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.vorlage-kachel').forEach(b => b.classList.toggle('selected', b === btn));
          if (vorlageSlugEl) vorlageSlugEl.value = btn.dataset.slug;
        });
      });
    })();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
  }

  function previewLink() {
    return `${window.location.origin}/empfaenger.html?token=…`;
  }

  function updatePreview() {
    preview.textContent = buildMessage(vornameEl.value, typ, previewLink());
  }
  [vornameEl, nachnameEl, telefonEl].forEach((el) => el.addEventListener('input', updatePreview));
  updatePreview();

  function sanitizePhone(raw) {
    return (raw || '').replace(/[^\d+]/g, '').replace(/^00/, '+').replace(/^\+/, '');
  }

  async function submitFlow(viaWhatsapp) {
    const vorname = vornameEl.value.trim();
    const nachname = nachnameEl.value.trim();
    const telefon = sanitizePhone(telefonEl.value);
    const empfehler = empfehlerEl.value.trim();
    const empfehlerNachricht = nachrichtEl ? nachrichtEl.value.trim() : '';
    const vorlageSlug = vorlageSlugEl ? vorlageSlugEl.value : 'allgemein';

    if (!vorname || !nachname || !telefon) {
      showToast('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    const tempMsg = buildMessage(vorname, typ, '');
    const { data, error } = await createEmpfehlung({
      empfaenger_name: `${vorname} ${nachname}`,
      empfaenger_telefon: telefon,
      empfehler_name: empfehler || null,
      empfehler_nachricht: empfehlerNachricht || null,
      nachricht: tempMsg,
      typ,
      vorlage_slug: vorlageSlug,
    });

    const token = data?.link_token || 'demo';
    const link = `${window.location.origin}/empfaenger.html?token=${token}&vorlage=${vorlageSlug}`;
    const finalMsg = buildMessage(vorname, typ, link);

    if (error && !data) {
      showToast('Speichern fehlgeschlagen. Bitte erneut versuchen.');
      return;
    }

    if (viaWhatsapp) {
      const url = `https://wa.me/${telefon}?text=${encodeURIComponent(finalMsg)}`;
      window.location.href = url;
      setTimeout(() => { window.location.href = 'danke.html'; }, 1500);
    } else {
      if (navigator.share) {
        try {
          await navigator.share({ text: finalMsg, url: link });
          window.location.href = 'danke.html';
        } catch (e) {
          // user cancelled
        }
      } else {
        try {
          await navigator.clipboard.writeText(finalMsg);
          showToast('Nachricht in die Zwischenablage kopiert');
          setTimeout(() => { window.location.href = 'danke.html'; }, 1200);
        } catch (e) {
          showToast('Teilen nicht möglich');
        }
      }
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitFlow(true);
  });
  shareBtn.addEventListener('click', () => submitFlow(false));
}

/* ---------- EMPFAENGER (Phase 6) ---------- */
if (page === 'empfaenger') {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const urlVorlage = params.get('vorlage');

  // Foto im Hero
  const foto = document.getElementById('p5Foto');
  if (foto) foto.src = window.ENV_BERATER_FOTO;

  // Austragen-Link mit Token
  const optoutLink = document.getElementById('austragenLink');
  if (optoutLink && token) optoutLink.href = `austragen.html?token=${token}`;

  // Link-Öffnung tracken
  if (token) updateLinkGeoeffnet(token);

  // IntersectionObserver — Fade-up beim Scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.p5-reveal').forEach((el) => io.observe(el));

  // Empfehlung + Vorlage parallel laden, dann Seite befüllen
  (async () => {
    // 1) URL-Param hat Priorität, ansonsten erst DB-Wert
    let empData = null;
    if (token) {
      const r = await getEmpfehlungByToken(token);
      empData = r.data || null;
    }

    const slugResolved = (urlVorlage || empData?.vorlage_slug || 'allgemein').toLowerCase();

    // 2) Vorlage laden, Fallback auf 'allgemein'
    let v = await getVorlage(slugResolved);
    if (!v) v = await getVorlage('allgemein');
    if (v) applyVorlage(v);

    // 3) Empfehler-Karte
    if (empData) renderEmpfehlerKarte(empData);

    // 4) Anrufwunsch-State
    if (empData?.anrufwunsch) revealConfirm(empData.anrufwunsch);
  })();

  function applyVorlage(v) {
    // Hero-Subtext
    const heroBody = document.getElementById('p5HeroBody');
    if (heroBody && v.subtext) heroBody.textContent = v.subtext;

    // Quickcheck-Sektion
    const heroImg = document.getElementById('p5QuickHero');
    if (heroImg && v.hero_bild_url) {
      heroImg.src = v.hero_bild_url;
      heroImg.style.display = '';
    }
    const headline = document.getElementById('p5QuickHeadline');
    if (headline && v.headline) headline.textContent = v.headline;
    const cta = document.getElementById('p5QuickCta');
    if (cta) {
      if (v.cta_text)      cta.textContent = v.cta_text;
      if (v.quickcheck_url) cta.href       = v.quickcheck_url;
    }

    // Drei Vorteile
    const setText = (id, t) => { const el = document.getElementById(id); if (el && t) el.textContent = t; };
    setText('p5V1Titel', v.vorteil_1_titel);
    setText('p5V1Text',  v.vorteil_1_text);
    setText('p5V2Titel', v.vorteil_2_titel);
    setText('p5V2Text',  v.vorteil_2_text);
    setText('p5V3Titel', v.vorteil_3_titel);
    setText('p5V3Text',  v.vorteil_3_text);

    // Badge (nur wenn nicht 'allgemein')
    const badge = document.getElementById('p5BadgeVorlage');
    if (badge && v.slug !== 'allgemein') {
      const ic = document.getElementById('p5BadgeIcon');
      const ti = document.getElementById('p5BadgeTitel');
      if (ic) ic.textContent = v.icon || '';
      if (ti) ti.textContent = v.titel || '';
      badge.style.display = '';
    }
  }

  function renderEmpfehlerKarte(d) {
    const inner = document.getElementById('p5EmpfehlerInner');
    if (!inner) return;
    const name = (d.empfehler_name || '').trim();
    const msg  = (d.empfehler_nachricht || '').trim();

    let html;
    if (name && msg) {
      html = `
        <p class="p5-eyebrow">Persönliche Empfehlung</p>
        <h2 class="p5-h2">${escapeHtml(name)} hat an dich gedacht.</h2>
        <p class="p5-body" style="margin-bottom:6px;">
          Diese Empfehlung kommt nicht aus einer Datenbank.
          ${escapeHtml(name)} hat dich ganz bewusst vorgeschlagen,
          weil er glaubt, dass dieses Gespräch für dich wertvoll sein könnte.
        </p>
        <div class="p5-quote-card">
          <p class="p5-quote">„${escapeHtml(msg)}"</p>
          <span class="p5-quote-cite">— ${escapeHtml(name)}</span>
        </div>`;
    } else if (name) {
      html = `
        <p class="p5-eyebrow">Persönliche Empfehlung</p>
        <h2 class="p5-h2">${escapeHtml(name)} hat an dich gedacht.</h2>
        <p class="p5-body">
          ${escapeHtml(name)} hat dich ganz bewusst vorgeschlagen,
          weil er glaubt, dass ein Gespräch für dich interessant sein könnte.
        </p>`;
    } else {
      html = `
        <p class="p5-eyebrow">Persönliche Empfehlung</p>
        <h2 class="p5-h2">Jemand hat an dich gedacht.</h2>
        <p class="p5-body">
          Eine Person aus deinem Umfeld glaubt,
          dass dieses Gespräch für dich interessant sein könnte.
        </p>`;
    }
    inner.innerHTML = html;
    // Reveal-Animation auch für neue Elemente
    inner.querySelectorAll('p, h2, div').forEach((el) => {
      el.classList.add('p5-reveal');
      io.observe(el);
    });
  }

  // Anrufwunsch-Form
  const form = document.getElementById('p5Anrufform');
  const slotEl = document.getElementById('p5Slot');
  const submitBtn = document.getElementById('p5SubmitBtn');
  const confirmEl = document.getElementById('p5Confirm');

  function revealConfirm(slot) {
    if (form) form.style.display = 'none';
    if (confirmEl) {
      confirmEl.classList.add('visible');
      const sub = document.getElementById('p5ConfirmSub');
      if (sub && slot) sub.textContent = `Ich rufe dich zu deinem gewünschten Zeitfenster (${slot}) an.`;
    }
  }

  if (form && submitBtn && slotEl) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const slot = slotEl.value;
      if (!slot) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sende…';
      if (token) {
        const { error } = await markAnrufwunsch(token, slot);
        if (error) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Anrufwunsch bestätigen';
          alert('Übermittlung fehlgeschlagen, bitte erneut versuchen.');
          return;
        }
      }
      revealConfirm(slot);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
  }
}

/* ---------- AUSTRAGEN ---------- */
if (page === 'austragen') {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) updateAusgetragen(token);
}
