import {
  createEmpfehlung,
  updateLinkGeoeffnet,
  updateAusgetragen,
  markInteressiert,
  markAnrufwunsch,
  getEmpfehlungByToken,
  getVorlagen,
  getVorlage,
  getEmpfehlerByCode,
  getErfolgsgeschichten,
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
        setTimeout(() => li.classList.add('visible'), 280 + idx * 140);
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

  // ----- Empfehler-Code (Phase 7) -----
  // Code aus URL > LocalStorage
  const urlCode = new URLSearchParams(window.location.search).get('empfehler');
  let empfehlerCode = urlCode || (() => { try { return localStorage.getItem('empfehler_code'); } catch (_) { return null; } })();
  let empfehlerData = null;

  if (empfehlerCode) {
    if (urlCode) { try { localStorage.setItem('empfehler_code', urlCode); } catch (_) {} }
    const { data } = await getEmpfehlerByCode(empfehlerCode);
    empfehlerData = data;
    if (empfehlerData) {
      const banner = document.getElementById('empfehlerBanner');
      const name = document.getElementById('empfehlerBannerName');
      if (banner) banner.style.display = '';
      if (name) name.textContent = empfehlerData.name;
      // Empfehler-Name in Form vorausfüllen
      if (empfehlerEl && !empfehlerEl.value) empfehlerEl.value = empfehlerData.name;
    } else {
      // Code ungültig — aus Storage löschen
      try { localStorage.removeItem('empfehler_code'); } catch (_) {}
      empfehlerCode = null;
    }
  }

  // ----- Vorlagen-Grid -----
  const vorlageSlugEl = document.getElementById('vorlageSlug');
  const grid = document.getElementById('vorlagenGrid');
  if (grid) {
    (async () => {
      const list = await getVorlagen();
      if (!list.length) {
        grid.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Themen-Seiten konnten nicht geladen werden.</p>';
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
      empfehler_id: empfehlerData?.id || null,
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

/* ---------- EMPFAENGER (Phase 9 · Trust Luxury) ---------- */
if (page === 'empfaenger') {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const urlVorlage = params.get('vorlage');

  // Fotos im Hero + Bio-Sektion
  const foto = document.getElementById('eFoto');
  const bioFoto = document.getElementById('eBioFoto');
  if (foto) foto.src = window.ENV_BERATER_FOTO || '';
  if (bioFoto) bioFoto.src = window.ENV_BERATER_FOTO || '';

  // Austragen-Link
  const optoutLink = document.getElementById('austragenLink');
  if (optoutLink && token) optoutLink.href = `austragen.html?token=${token}`;

  // Link-Öffnung tracken
  if (token) updateLinkGeoeffnet(token);

  // IntersectionObserver
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.e-reveal').forEach((el) => io.observe(el));

  // Sticky-CTA Mobile reveal
  const sticky = document.getElementById('eStickyCta');
  const hero = document.getElementById('hero');
  if (sticky && hero) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => sticky.classList.toggle('visible', !e.isIntersecting));
    }, { threshold: 0.05 }).observe(hero);
  }

  // Empfehlung + Vorlage + Erfolgsgeschichten parallel laden
  (async () => {
    let empData = null;
    if (token) {
      const r = await getEmpfehlungByToken(token);
      empData = r.data || null;
    }

    const slugResolved = (urlVorlage || empData?.vorlage_slug || 'allgemein').toLowerCase();

    // Vorlage + Erfolge parallel
    const [v, erfolge] = await Promise.all([
      (async () => (await getVorlage(slugResolved)) || (await getVorlage('allgemein')))(),
      getErfolgsgeschichten(slugResolved),
    ]);

    if (v) applyVorlage(v);
    renderErfolge(erfolge);

    if (empData) renderEmpfehlerKarte(empData);
    if (empData?.anrufwunsch) revealAnrufConfirm(empData.anrufwunsch);
  })();

  function applyVorlage(v) {
    // Finanzcheck-Sektion
    const headline = document.getElementById('eFinanzHeadline');
    if (headline && v.headline) headline.textContent = v.headline;
    const cta = document.getElementById('eFinanzCta');
    if (cta) {
      if (v.cta_text)      cta.textContent = v.cta_text;
      if (v.quickcheck_url) cta.href       = v.quickcheck_url;
    }
    const heroImg = document.getElementById('eFinanzImg');
    if (heroImg && v.hero_bild_url) heroImg.src = v.hero_bild_url;

    // Drei Vorteile (4. bleibt statisch)
    const set = (id, t) => { const el = document.getElementById(id); if (el && t) el.textContent = t; };
    set('eV1Titel', v.vorteil_1_titel);
    set('eV1Text',  v.vorteil_1_text);
    set('eV2Titel', v.vorteil_2_titel);
    set('eV2Text',  v.vorteil_2_text);
    set('eV3Titel', v.vorteil_3_titel);
    set('eV3Text',  v.vorteil_3_text);

    // Vorlage-Badge
    if (v.slug && v.slug !== 'allgemein') {
      const badge = document.getElementById('eBadge');
      if (badge) {
        const ic = document.getElementById('eBadgeIcon');
        const ti = document.getElementById('eBadgeTitel');
        if (ic) ic.textContent = v.icon || '';
        if (ti) ti.textContent = v.titel || '';
        badge.style.display = '';
      }
    }
  }

  function renderEmpfehlerKarte(d) {
    const inner = document.getElementById('eEmpfehlerInner');
    if (!inner) return;
    const name = (d.empfehler_name || '').trim();
    const msg  = (d.empfehler_nachricht || '').trim();

    let html;
    if (name && msg) {
      html = `
        <p class="e-eyebrow">Warum diese Seite</p>
        <h2 class="e-h2">${escapeHtml(name)}<br>hat an dich gedacht.</h2>
        <p class="e-body" style="margin: 0 auto;">
          Diese Empfehlung kommt nicht aus einer Datenbank — ${escapeHtml(name)} hat dich ganz bewusst vorgeschlagen.
        </p>
        <div class="e-quote-card" style="margin-top: 20px;">
          <blockquote>„${escapeHtml(msg)}"</blockquote>
          <cite>— ${escapeHtml(name)}</cite>
        </div>`;
    } else if (name) {
      html = `
        <p class="e-eyebrow">Warum diese Seite</p>
        <h2 class="e-h2">${escapeHtml(name)}<br>hat an dich gedacht.</h2>
        <p class="e-body" style="margin: 0 auto;">
          ${escapeHtml(name)} glaubt, dass ein Gespräch für dich interessant sein könnte — und hat dich bewusst vorgeschlagen.
        </p>`;
    } else {
      html = `
        <p class="e-eyebrow">Warum diese Seite</p>
        <h2 class="e-h2">Menschen empfehlen<br>keine Produkte.</h2>
        <p class="e-lede" style="margin: 8px auto 0;">Sie empfehlen Erfahrungen.</p>
        <p class="e-body" style="margin: 24px auto 0;">
          Jemand aus deinem Umfeld hat den Eindruck, dass diese Informationen für dich interessant sein könnten.
        </p>`;
    }
    inner.innerHTML = html;
    inner.querySelectorAll('p, h2, div').forEach((el) => { el.classList.add('e-reveal'); io.observe(el); });
  }

  function renderErfolge(list) {
    const wrap = document.getElementById('eResults');
    if (!wrap) return;
    if (!list?.length) {
      wrap.innerHTML = '<p class="e-body" style="margin:0 auto;">Beispiele folgen.</p>';
      return;
    }
    wrap.innerHTML = list.map(r => `
      <article class="e-result e-reveal">
        <div>
          <p class="label">Fall</p>
          <h3 class="titel">${escapeHtml(r.titel)}</h3>
          ${r.key_metric ? `<span class="metric">${escapeHtml(r.key_metric)}</span>` : ''}
        </div>
        <div>
          <div class="row">
            <p class="label" style="margin-bottom: 4px;">Vorher</p>
            <p>${escapeHtml(r.vorher)}</p>
          </div>
          <div class="row">
            <p class="label" style="margin-bottom: 4px;">Nachher</p>
            <p>${escapeHtml(r.nachher)}</p>
          </div>
        </div>
      </article>
    `).join('');
    wrap.querySelectorAll('.e-reveal').forEach((el) => io.observe(el));
  }

  // Anrufwunsch-Submit
  const anrufBtn = document.getElementById('eAnrufSubmit');
  const slotEl = document.getElementById('eSlot');
  const anrufConfirm = document.getElementById('eAnrufConfirm');

  function revealAnrufConfirm(slot) {
    if (slotEl) slotEl.style.display = 'none';
    if (anrufBtn) anrufBtn.style.display = 'none';
    if (anrufConfirm) {
      anrufConfirm.classList.add('visible');
      const t = document.getElementById('eAnrufConfirmText');
      if (t && slot) t.textContent = `Danke. Ich rufe dich zu deinem Wunsch-Zeitfenster (${slot}) an.`;
    }
  }

  if (anrufBtn && slotEl) {
    anrufBtn.addEventListener('click', async () => {
      const slot = slotEl.value;
      if (!slot) { slotEl.focus(); return; }
      anrufBtn.disabled = true;
      anrufBtn.textContent = 'Sende…';
      if (token) {
        const { error } = await markAnrufwunsch(token, slot);
        if (error) {
          anrufBtn.disabled = false;
          anrufBtn.textContent = 'Anrufwunsch bestätigen';
          alert('Übermittlung fehlgeschlagen, bitte erneut versuchen.');
          return;
        }
      }
      revealAnrufConfirm(slot);
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
