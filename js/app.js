import {
  createEmpfehlung,
  updateLinkGeoeffnet,
  updateAusgetragen,
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
  const preview = document.getElementById('messagePreview');
  const shareBtn = document.getElementById('shareBtn');
  const form = document.getElementById('empfehlForm');

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

    if (!vorname || !nachname || !telefon) {
      showToast('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    const tempMsg = buildMessage(vorname, typ, '');
    const { data, error } = await createEmpfehlung({
      empfaenger_name: `${vorname} ${nachname}`,
      empfaenger_telefon: telefon,
      empfehler_name: empfehler || null,
      nachricht: tempMsg,
      typ,
    });

    const token = data?.link_token || 'demo';
    const link = `${window.location.origin}/empfaenger.html?token=${token}`;
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

/* ---------- EMPFAENGER ---------- */
if (page === 'empfaenger') {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  document.getElementById('beraterFoto').src = window.ENV_BERATER_FOTO;
  document.getElementById('beraterName').textContent = window.ENV_BERATER_NAME;
  document.getElementById('beraterTitel').textContent = window.ENV_BERATER_TITEL;

  const link = document.getElementById('austragenLink');
  if (link && token) link.href = `austragen.html?token=${token}`;

  if (token) {
    updateLinkGeoeffnet(token);
  }
}

/* ---------- AUSTRAGEN ---------- */
if (page === 'austragen') {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) updateAusgetragen(token);
}
