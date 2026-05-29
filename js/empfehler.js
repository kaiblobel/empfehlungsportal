import {
  getEmpfehlerByCode,
  getEmpfehlerStats,
  getEmpfehlerEmpfehlungen,
  getBelohnungsStufen,
} from './supabase.js';

const params = new URLSearchParams(window.location.search);
const codeFromUrl = params.get('code');
const codeFromStorage = (() => { try { return localStorage.getItem('empfehler_code'); } catch (_) { return null; } })();
const code = codeFromUrl || codeFromStorage;

if (!code) {
  // Ohne Code: zurück zur Promoter-Page
  window.location.href = 'programm.html';
} else {
  // Code in LocalStorage merken
  try { localStorage.setItem('empfehler_code', code); } catch (_) {}
  init();
}

const STATUS_LABEL = {
  offen: 'Offen',
  anrufwunsch: 'Anrufwunsch',
  kontaktiert: 'Kontaktiert',
  kunde: 'Kunde',
  kein_interesse: 'Kein Interesse',
};

async function init() {
  // Stats + Empfehlungen + Belohnungs-Stufen parallel laden
  const [statsRes, listRes, stufen] = await Promise.all([
    getEmpfehlerStats(code),
    getEmpfehlerEmpfehlungen(code),
    getBelohnungsStufen(),
  ]);

  const stats = statsRes.data;
  const empfehlungen = listRes.data || [];

  if (!stats) {
    document.getElementById('p7Hallo').textContent = 'Code unbekannt.';
    document.getElementById('p7Status').textContent = 'Bitte prüfe deinen Link oder erstelle einen neuen Code unter /programm.';
    document.querySelectorAll('section.p7-section:not(:first-of-type), footer').forEach(s => s.style.display = 'none');
    return;
  }

  renderGreeting(stats, stufen);
  renderLinkCard();
  renderRewardsList(stats, stufen);
  renderFeed(empfehlungen);

  document.getElementById('p7CtaNeu').href = `empfehlen.html?typ=direkt&empfehler=${encodeURIComponent(code)}`;
}

function renderGreeting(stats, stufen) {
  const firstName = (stats.name || '').split(' ')[0] || 'Hallo';
  document.getElementById('p7Hallo').textContent = `Hallo ${firstName}.`;

  // URL-Param 'neu=1' nach Anmeldung
  if (params.get('neu') === '1') {
    document.getElementById('p7Greet').textContent = 'Glückwunsch';
    document.getElementById('p7Status').textContent = 'Dein persönlicher Empfehler-Code ist da. Hier sind dein Link und dein Fortschritt.';
  } else {
    const erfolgreich = stats.kunde || 0;
    document.getElementById('p7Status').textContent = `Schön, dass du da bist. Hier ist dein aktueller Stand und dein persönlicher Empfehlungs-Link.`;
  }

  document.getElementById('p7StatsBig').textContent = stats.kunde || 0;

  const nextEl = document.getElementById('p7NextStufe');
  const reached = stats.kunde || 0;
  const next = stufen.find(s => s.stufe > reached);
  if (next) {
    const diff = next.stufe - reached;
    nextEl.innerHTML = `Noch <strong>${diff}</strong> bis zur ${next.icon} <strong>${next.titel}</strong>`;
  } else {
    nextEl.innerHTML = `Du hast alle Stufen erreicht. <strong>Wahnsinn.</strong>`;
  }
}

function renderLinkCard() {
  const baseLink = `${window.location.origin}/empfehlen.html?typ=direkt&empfehler=${encodeURIComponent(code)}`;
  document.getElementById('p7LinkText').textContent = baseLink;

  document.getElementById('p7Copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(baseLink);
      toast('Link kopiert.');
    } catch (_) {
      toast('Kopieren nicht möglich.');
    }
  });

  const waText = `Hi, ich bin seit einiger Zeit Kunde bei Kai Blobel und wollte dir kurz die Möglichkeit geben, ihn auch kennenzulernen. Schau es dir an: ${baseLink}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  const waBtn = document.getElementById('p7Whatsapp');
  waBtn.href = waUrl;
  waBtn.setAttribute('target', '_blank');
  waBtn.setAttribute('rel', 'noopener');

  waBtn.addEventListener('click', async (e) => {
    // 1. Web Share API (nativer iOS/Android-Share-Sheet, bietet WhatsApp + alle anderen Apps)
    if (navigator.share) {
      e.preventDefault();
      try {
        await navigator.share({
          title: 'Kai Blobel — Persönliche Empfehlung',
          text: waText,
        });
        return;
      } catch (err) {
        // User hat abgebrochen oder Share fehlgeschlagen → Fallback unten
        if (err.name === 'AbortError') return;
      }
    }
    // 2. Kein Web Share API: <a href> auf wa.me wird vom Browser geöffnet (Desktop: WhatsApp Web; Mobile: WhatsApp-App)
    //    Falls auch das nicht klappt, Clipboard-Fallback:
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(waText);
        toast('Nachricht in die Zwischenablage kopiert. Füg sie in WhatsApp ein.');
      } catch (_) {}
    }, 500);
  });
}

function renderRewardsList(stats, stufen) {
  const wrap = document.getElementById('p7RewardsList');
  const reached = stats.kunde || 0;

  wrap.innerHTML = stufen.map(s => {
    const isReached = reached >= s.stufe;
    const isHighlight = s.highlight;
    const cls = isReached ? 'reached' : 'pending';
    const mark = isReached
      ? '<span class="status-mark">Erreicht ✓</span>'
      : `<span class="status-mark">${s.stufe - reached} bis hier</span>`;
    return `
      <div class="p7-reward ${isHighlight ? 'highlight' : ''} ${cls}">
        <div class="icon">${s.icon || '🎁'}</div>
        <div class="body">
          <div class="num">${s.stufe}. Empfehlung</div>
          <h3 class="titel">${escapeHtml(s.titel)}</h3>
          <p class="text">${escapeHtml(s.beschreibung)}</p>
          ${s.wert_label ? `<span class="wert">Wert: ${escapeHtml(s.wert_label)}</span>` : ''}
        </div>
        ${mark}
      </div>
    `;
  }).join('');
}

function renderFeed(empfehlungen) {
  const wrap = document.getElementById('p7Feed');
  if (!empfehlungen.length) {
    wrap.innerHTML = '<div class="p7-empty">Du hast noch keine Empfehlung abgegeben. Teile deinen Link und starte durch.</div>';
    return;
  }
  wrap.innerHTML = '<div class="p7-feed">' + empfehlungen.map(e => `
    <div class="p7-feed-row">
      <div>
        <div class="name">${escapeHtml(e.empfaenger_name || '–')}</div>
        <div class="meta">${formatDate(e.created_at)}${e.anrufwunsch ? ' · ' + escapeHtml(e.anrufwunsch) : ''}</div>
      </div>
      <span class="badge-mini badge-mini-${e.status || 'offen'}">${STATUS_LABEL[e.status || 'offen']}</span>
    </div>
  `).join('') + '</div>';
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function toast(text) {
  const t = document.getElementById('p7Toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
