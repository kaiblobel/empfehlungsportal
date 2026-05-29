import { getBelohnungsStufen, createEmpfehler } from './supabase.js';

// Foto setzen
document.getElementById('p7Foto').src = window.ENV_BERATER_FOTO || '';

// IntersectionObserver Fade-Up
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.p7-reveal').forEach((el) => io.observe(el));

// Belohnungs-Treppe rendern
(async () => {
  const stufen = await getBelohnungsStufen();
  const wrap = document.getElementById('p7Rewards');
  if (!stufen.length) {
    wrap.innerHTML = '<p style="color:var(--text-secondary);">Belohnungen konnten nicht geladen werden.</p>';
    return;
  }
  wrap.innerHTML = stufen.map(s => `
    <div class="p7-reward ${s.highlight ? 'highlight' : ''} p7-reveal">
      <div class="icon">${s.icon || '🎁'}</div>
      <div class="body">
        <div class="num">${s.stufe}. Empfehlung</div>
        <h3 class="titel">${escapeHtml(s.titel)}</h3>
        <p class="text">${escapeHtml(s.beschreibung)}</p>
        ${s.wert_label ? `<span class="wert">Wert: ${escapeHtml(s.wert_label)}</span>` : ''}
      </div>
    </div>
  `).join('');
  wrap.querySelectorAll('.p7-reveal').forEach((el) => io.observe(el));
})();

// Anmelde-Formular
const form = document.getElementById('p7AnmeldeForm');
const submitBtn = document.getElementById('p7Submit');
const errBox = document.getElementById('p7Err');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.remove('show');

  const name = document.getElementById('p7Name').value.trim();
  const email = document.getElementById('p7Email').value.trim();
  const telefon = document.getElementById('p7Telefon').value.trim();

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
    submitBtn.textContent = 'Empfehler-Code erstellen →';
    return;
  }

  // Code in LocalStorage merken
  try { localStorage.setItem('empfehler_code', code); } catch (_) {}

  // Redirect zum Empfehler-Dashboard
  window.location.href = `empfehler.html?code=${encodeURIComponent(code)}&neu=1`;
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
