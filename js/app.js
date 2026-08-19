import {
  createEmpfehlung,
  updateAusgetragen,
  markInteressiert,
  markAnrufwunsch,
  getEmpfehlungByToken,
  getVorlagen,
  getVorlagenPublic,
  getVorlage,
  getEmpfehlerByCode,
  getBeraterPublicById,
  getBeraterPublicBySlug,
  supabase,
} from './supabase.js';
import { ICONS } from './icons.js';
import { applyBeraterBrand, merkeBerater, gemerkterBerater } from './berater-brand.js';

const page = document.body.dataset.page;

// 24 Nachricht-Vorlagen, 3 pro Thema. Bewusst natürlich/kurz formuliert.
// Platzhalter: {{vorname}} = Vorname der empfohlenen Person,
// {{berater}} = Vorname des jeweiligen Beraters (Multi-Tenant: Kai, Sven, …).
const NACHRICHT_VORLAGEN = {
  allgemein: [
    'Hey {{vorname}}, ich wollte dir mal {{berater}} empfehlen. Hat mir bei einigen Finanz-Sachen sehr geholfen, ich dachte sofort an dich.',
    'Hi {{vorname}}, du hattest letztens erzählt, dass du dich mal mit deinen Verträgen beschäftigen wolltest. Schau dir das hier kurz an, {{berater}} hat bei mir viel sortiert.',
    'Du {{vorname}}, falls du gerade auch jemanden für deine Finanzen suchst, kann ich dir {{berater}} sehr empfehlen. Er hat mir richtig den Überblick gegeben.',
  ],
  baufi: [
    'Hey {{vorname}}, du suchst doch noch jemanden für eure Finanzierung. {{berater}} hat unsere Baufi gemacht, ich kann ihn nur empfehlen.',
    'Hi {{vorname}}, du hattest erzählt, dass ihr ein Haus kauft. Bei unserer Baufinanzierung hat {{berater}} uns viel Geld gespart, vielleicht hilft dir das auch.',
    '{{vorname}}, du bist doch gerade beim Thema Hauskauf. {{berater}} kennt sich bei Baufi richtig gut aus, der ist auf jeden Fall ein guter Tipp.',
  ],
  foerderungen: [
    'Hey {{vorname}}, {{berater}} hat mir gezeigt, wie viel staatliche Förderung viele jedes Jahr einfach liegen lassen. Wollte dir das mal weitergeben.',
    'Hi {{vorname}}, du hast bestimmt Anspruch auf einige Förderungen, die kaum einer auf dem Schirm hat. {{berater}} zeigt dir das in 20 Minuten.',
    '{{vorname}}, der Staat schenkt Geld weg und keiner sagt es einem. {{berater}} hat mir gezeigt, was ich alles holen kann, das lohnt sich für dich bestimmt auch.',
  ],
  selbstaendige: [
    'Hey {{vorname}}, als Selbstständige ist Altersvorsorge ja immer so eine Sache. {{berater}} hat mir geholfen, das endlich mal zu sortieren.',
    'Hi {{vorname}}, du bist ja auch dein eigener Chef. {{berater}} berät viele Selbstständige zu Vorsorge und Krankenkasse, kann ich nur empfehlen.',
    '{{vorname}}, kennst du {{berater}} schon? Der hat bei mir die ganze Selbstständigen-Vorsorge auf Linie gebracht, ohne Versicherungs-Geschwurbel.',
  ],
  investment: [
    'Hey {{vorname}}, du wolltest doch schon länger anfangen zu investieren. {{berater}} hat mit mir einen einfachen Plan gemacht, das ist genau richtig zum Einstieg.',
    'Hi {{vorname}}, dein Geld liegt doch noch auf dem Sparkonto. {{berater}} hat mir geholfen, da was Vernünftiges aufzusetzen, ohne große Versprechen.',
    '{{vorname}}, ich lege jetzt seit einiger Zeit dank {{berater}} vernünftig an. Vielleicht ist das auch was für dich.',
  ],
  absicherung: [
    'Hey {{vorname}}, jetzt wo bei euch ein Kind kommt, lohnt es sich, die Versicherungen mal anzuschauen. {{berater}} hat das bei uns gemacht.',
    'Hi {{vorname}}, du hattest mal gefragt, ob ich für sowas einen Tipp habe. {{berater}} hat unsere Versicherungen sortiert, das war echt entspannt.',
    '{{vorname}}, gerade als Familie hat man viele Versicherungen am Laufen. {{berater}} hat bei uns ausgemistet, was nichts taugt. Wir zahlen jetzt weniger und sind besser dran.',
  ],
  karriere: [
    'Hey {{vorname}}, du hast doch mal gesagt, du wärst eigentlich bereit für was Neues beruflich. {{berater}} sucht aktuell Leute fürs Team. Schau dir das mal kurz an.',
    'Hi {{vorname}}, ich kenne jemanden, der eine echte Karriere-Chance bietet. Du suchst doch was, in dem du dich mehr entfalten kannst. {{berater}} zeigt dir alles in Ruhe.',
    '{{vorname}}, du redest doch schon eine Weile davon, dass du was Eigenes machen willst. Bei {{berater}} gibt es einen echten Einstieg mit klarer Perspektive. Vielleicht ist das deins.',
  ],
  kinder: [
    'Hey {{vorname}}, wir hatten doch über die Zukunft der Kinder gesprochen. {{berater}} zeigt ganz verständlich, wie auch kleine Beträge über viele Jahre etwas aufbauen können.',
    'Hi {{vorname}}, falls Vorsorge für die Kinder bei euch gerade ein Thema ist: {{berater}} hat uns geholfen, die Möglichkeiten einmal in Ruhe zu sortieren.',
    '{{vorname}}, ich musste bei dem Thema Kinder und Zukunft direkt an euch denken. Schau dir die Übersicht von {{berater}} gern unverbindlich an.',
  ],
  banking: [
    'Hey {{vorname}}, falls du deine Konten, Rücklagen oder eine private Finanzierung einmal sortieren möchtest: {{berater}} hat mir dabei sehr verständlich geholfen.',
    'Hi {{vorname}}, wir hatten doch über mehr Überblick bei den laufenden Finanzen gesprochen. Schau dir die Übersicht von {{berater}} einmal in Ruhe an.',
    '{{vorname}}, beim Thema Konto, Sparziele und Kredit musste ich direkt an dich denken. Vielleicht hilft dir die Einordnung von {{berater}} weiter.',
  ],
  energie: [
    'Hey {{vorname}}, du wolltest doch Strom, Gas oder Photovoltaik einmal genauer prüfen. {{berater}} kann dir helfen, die Möglichkeiten in Ruhe einzuordnen.',
    'Hi {{vorname}}, bei euren Energiekosten könnte sich ein genauer Blick lohnen. Ich schicke dir dazu die Übersicht von {{berater}}.',
    '{{vorname}}, wir hatten über Photovoltaik und laufende Energiekosten gesprochen. Vielleicht ist die Einordnung von {{berater}} ein guter erster Schritt.',
  ],
};

function vorlagenForSlug(slug) {
  return NACHRICHT_VORLAGEN[slug] || NACHRICHT_VORLAGEN.allgemein;
}

function fillTemplate(template, vorname, beraterVorname) {
  const name = (vorname || '').trim();
  return template
    .replace(/\{\{vorname\}\}/g, name || '[Vorname]')
    .replace(/\{\{berater\}\}/g, (beraterVorname || '').trim() || 'mir');
}

function vorlagenIconHtml(iconName) {
  if (iconName && ICONS[iconName]) {
    return ICONS[iconName];
  }
  return iconName ? String(iconName).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  ) : '';
}

function buildMessage(vorname, typ, link, beraterName, beraterVorname) {
  const name = vorname?.trim() || '[Vorname]';
  const bName = (beraterName || '').trim() || 'jemandem, dem ich vertraue';
  const bVor  = (beraterVorname || '').trim() || 'Er';
  if (typ === 'info') {
    return `Hallo ${name}, ich möchte dich kurz mit jemandem bekannt machen, dem ich sehr vertraue. Schau dir das kurz an, bevor ${bVor} sich bei dir meldet. ${link}`;
  }
  return `Hallo ${name}, ich bin seit einiger Zeit Kunde bei ${bName} und wollte dich kurz informieren: ${bVor} wird sich in den nächsten Tagen bei dir melden. Er hat mir sehr geholfen und ich dachte sofort an dich. ${link}`;
}

/**
 * Normalisiert eine eingegebene Telefonnummer auf internationales E.164-Format
 * (mit führendem +). Deutsche Nummern mit führender 0 bekommen +49 vorangestellt.
 * Ohne diese Normalisierung lehnt WhatsApp (wa.me) deutsche 0…-Nummern als
 * ungültig ab — genau das war der "geht nicht"-Fehler beim Versenden.
 */
function normalizePhoneDE(raw) {
  let n = (raw || '').replace(/[^\d+]/g, '');
  if (!n) return '';
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) return '+' + n.slice(2);
  if (n.startsWith('0')) return '+49' + n.slice(1);
  return '+' + n;
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
  // (Phase 50f: alter Auto-Redirect zum Hub entfernt - die Praesentation ist
  // jetzt eine bewusst angeklickte Sidebar-Page und kein Default mehr.)

  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  const progressBar = document.getElementById('progressBar');
  const counter = document.getElementById('counter');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  let current = 0;

  function render() {
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    const pct = ((current + 1) / total) * 100;
    progressBar.style.width = pct + '%';
    counter.textContent = `${current + 1} / ${total}`;
    prevBtn.disabled = current === 0;
    nextBtn.textContent = current === total - 1 ? 'Fertig' : 'Weiter';

    const list = slides[current].querySelector('.ed-list[data-staggered]');
    if (list && !list.dataset.triggered) {
      list.dataset.triggered = '1';
      list.querySelectorAll('li').forEach((li, idx) => {
        setTimeout(() => li.classList.add('visible'), 320 + idx * 130);
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

  // Multi-Tenant: Berater-Name für Nachricht-Texte. Default = ENV (Kai),
  // wird überschrieben sobald der Promoter-Berater geladen ist. Ist der Berater
  // von einem früheren Aufruf gemerkt, steht sofort der richtige Name da.
  let beraterName = window.ENV_BERATER_NAME || 'Kai Blobel';
  let beraterVorname = beraterName.split(' ')[0];
  const brandKey = params.get('berater') || 'me';
  const sofortBerater = gemerkterBerater(brandKey);
  if (sofortBerater) {
    applyBeraterBrand(sofortBerater);
    if (sofortBerater.name) {
      beraterName = sofortBerater.name;
      beraterVorname = beraterName.split(' ')[0];
    }
  }

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
      charCount.textContent = `${nachrichtEl.value.length}/240`;
    });
  }

  const kontextEl = document.getElementById('empfaengerKontext');
  const kontextCount = document.getElementById('kontextCount');
  if (kontextEl && kontextCount) {
    kontextEl.addEventListener('input', () => {
      kontextCount.textContent = `${kontextEl.value.length}/300`;
    });
  }

  // ----- Empfehler-Code (Phase 7) -----
  // Code aus URL > LocalStorage. Die CTAs erzeugen ?code=…; ?empfehler= als
  // Alias (Rückwärtskompatibilität) — sonst greift auf fremdem Gerät kein Code
  // und der Berater fällt fälschlich auf den ENV-Default (Kai) zurück.
  const urlParams = new URLSearchParams(window.location.search);
  const urlCode = urlParams.get('code') || urlParams.get('empfehler');
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

  // Multi-Tenant: Berater bestimmen + Formular-Texte auf ihn branden.
  // 1. über den Promoter-Code (echter Kunden-Flow)
  // 2. über ?berater=slug (z. B. Link aus dem Dashboard)
  // 3. über eingeloggten Berater (Dashboard-Vorschau)
  let berater = null;
  if (empfehlerData?.berater_id) {
    berater = (await getBeraterPublicById(empfehlerData.berater_id)).data;
  }
  if (!berater) {
    const slugParam = new URLSearchParams(window.location.search).get('berater');
    if (slugParam) berater = (await getBeraterPublicBySlug(slugParam)).data;
  }
  if (!berater) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const m = await import('./dashboard.js');
        berater = await m.getCurrentBerater();
      }
    } catch (_) {}
  }
  if (berater) {
    applyBeraterBrand(berater);
    merkeBerater(brandKey, berater);
    if (berater.name) {
      beraterName = berater.name;
      beraterVorname = berater.name.split(' ')[0];
    }
  }

  // ----- Vorlagen-Grid + Nachricht-Vorlagen -----
  const vorlageSlugEl = document.getElementById('vorlageSlug');
  const grid = document.getElementById('vorlagenGrid');
  const nachrichtVorlagenWrap = document.getElementById('nachrichtVorlagen');

  function renderNachrichtVorlagen(slug) {
    if (!nachrichtVorlagenWrap) return;
    const vorname = vornameEl?.value || '';
    const templates = vorlagenForSlug(slug);
    nachrichtVorlagenWrap.innerHTML = templates.map((tpl, i) => {
      const filled = fillTemplate(tpl, vorname, beraterVorname);
      return `
        <button type="button" class="nachricht-vorlage" data-template="${escapeHtml(tpl)}">
          <span class="nachricht-vorlage-label">Vorlage ${i + 1}</span>
          <span class="nachricht-vorlage-text">${escapeHtml(filled)}</span>
        </button>
      `;
    }).join('');
    nachrichtVorlagenWrap.querySelectorAll('.nachricht-vorlage').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.template || '';
        const filled = fillTemplate(raw, vornameEl?.value || '', beraterVorname);
        if (nachrichtEl) {
          nachrichtEl.value = filled.slice(0, 240);
          nachrichtEl.dispatchEvent(new Event('input'));
          nachrichtEl.focus();
        }
        nachrichtVorlagenWrap.querySelectorAll('.nachricht-vorlage').forEach(b => b.classList.toggle('chosen', b === btn));
      });
    });
  }

  // Bei Vorname-Eingabe Vorlagen aktualisieren (Platzhalter mitlaufen)
  if (vornameEl) {
    vornameEl.addEventListener('input', () => {
      const slug = vorlageSlugEl?.value || 'allgemein';
      renderNachrichtVorlagen(slug);
    });
  }

  // Initial render: Nachricht-Vorlagen sofort sichtbar machen, auch wenn
  // das Themen-Grid asynchron noch lädt
  renderNachrichtVorlagen('allgemein');

  if (grid) {
    (async () => {
      // Themen des Beraters, pro Slug nur einmal — sonst steht jede Themenwelt
      // doppelt im Raster (öffentlich lesbar sind die Zeilen aller Berater).
      const list = await getVorlagenPublic(empfehlerData?.berater_id || berater?.id || null);
      if (!list.length) {
        grid.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Themen-Seiten konnten nicht geladen werden.</p>';
        renderNachrichtVorlagen('allgemein');
        return;
      }
      grid.innerHTML = list.map(v => `
        <button type="button" class="vorlage-kachel${v.slug === 'allgemein' ? ' selected' : ''}" data-slug="${v.slug}">
          <span class="icon">${vorlagenIconHtml(v.icon)}</span>
          <span class="titel">${escapeHtml(v.titel)}</span>
        </button>
      `).join('');
      grid.querySelectorAll('.vorlage-kachel').forEach(btn => {
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.vorlage-kachel').forEach(b => b.classList.toggle('selected', b === btn));
          if (vorlageSlugEl) vorlageSlugEl.value = btn.dataset.slug;
          renderNachrichtVorlagen(btn.dataset.slug);
        });
      });
      // Initiales Render mit "allgemein"
      renderNachrichtVorlagen(vorlageSlugEl?.value || 'allgemein');
    })();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
  }

  function previewLink() {
    return `${window.location.origin}/empfehlung/…`;
  }

  function updatePreview() {
    preview.textContent = buildMessage(vornameEl.value, typ, previewLink(), beraterName, beraterVorname);
  }
  [vornameEl, nachnameEl, telefonEl].forEach((el) => el.addEventListener('input', updatePreview));
  updatePreview();

  let submitting = false;
  async function submitFlow(viaWhatsapp) {
    if (submitting) return;                 // Doppel-Submit sperren: ein Klick = ein Lead
    submitting = true;
    if (shareBtn) shareBtn.disabled = true;
    const release = () => { submitting = false; if (shareBtn) shareBtn.disabled = false; };

    const vorname = vornameEl.value.trim();
    const nachname = nachnameEl.value.trim();
    const telefon = normalizePhoneDE(telefonEl.value);
    const empfehler = empfehlerEl.value.trim();
    const empfehlerNachricht = nachrichtEl ? nachrichtEl.value.trim() : '';
    const vorlageSlug = vorlageSlugEl ? vorlageSlugEl.value : 'allgemein';
    const beruf = (document.getElementById('empfaengerBeruf')?.value || '').trim();
    const verbindung = document.getElementById('empfaengerVerbindung')?.value || '';
    const kontext = (document.getElementById('empfaengerKontext')?.value || '').trim();
    const vorinformiert = document.getElementById('empfehlerVorinformiert')?.checked || false;
    const erreichbarkeit = document.getElementById('besteErreichbarkeit')?.value || '';
    const kanal = document.getElementById('bevorzugterKanal')?.value || '';

    if (!vorname || !nachname || !telefon) {
      showToast('Bitte alle Pflichtfelder ausfüllen');
      release();
      return;
    }

    const tempMsg = buildMessage(vorname, typ, '', beraterName, beraterVorname);
    const { data, error } = await createEmpfehlung({
      empfaenger_name: `${vorname} ${nachname}`,
      empfaenger_telefon: telefon,
      empfehler_name: empfehler || null,
      empfehler_nachricht: empfehlerNachricht || null,
      nachricht: tempMsg,
      typ,
      vorlage_slug: vorlageSlug,
      empfehler_id: empfehlerData?.id || null,
      // Phase 192 · Der über ?berater=slug aufgelöste Berater zählt auch beim
      // Speichern, nicht nur fürs Branding. Vorher blieb das Feld ohne
      // Promoter-Code leer und die Empfehlung fiel still auf den
      // Standard-Berater (ENV_BERATER_ID = Kai) zurück — die Seite trug dann
      // Svens Namen und Foto, der Lead landete aber bei Kai.
      berater_id: empfehlerData?.berater_id || berater?.id || null,
      empfaenger_beruf: beruf || null,
      empfaenger_verbindung: verbindung || null,
      empfaenger_kontext: kontext || null,
      empfehler_vorinformiert: vorinformiert,
      beste_erreichbarkeit: erreichbarkeit || null,
      bevorzugter_kanal: kanal || null,
    });

    const token = data?.link_token || 'demo';
    // Die Kurzadresse geht über die Server-Funktion mit passender Social-Vorschau.
    // Alte /e?token=- und /empfaenger.html?token=-Links bleiben gültig.
    const link = `${window.location.origin}/empfehlung/${encodeURIComponent(token)}`;
    const finalMsg = buildMessage(vorname, typ, link, beraterName, beraterVorname);

    if (error && !data) {
      showToast('Speichern fehlgeschlagen. Bitte erneut versuchen.');
      release();
      return;
    }

    if (viaWhatsapp) {
      // wa.me erwartet die Nummer nur als Ziffern (internationale Vorwahl ohne +).
      const waNum = telefon.replace(/\D/g, '');
      const url = `https://wa.me/${waNum}?text=${encodeURIComponent(finalMsg)}`;
      window.location.href = url;
      setTimeout(() => { window.location.href = 'danke.html'; }, 1500);
    } else {
      if (navigator.share) {
        try {
          await navigator.share({ text: finalMsg, url: link });
          window.location.href = 'danke.html';
        } catch (e) {
          release(); // Nutzer hat abgebrochen → erneuter Versuch möglich
        }
      } else {
        try {
          await navigator.clipboard.writeText(finalMsg);
          showToast('Nachricht in die Zwischenablage kopiert');
          setTimeout(() => { window.location.href = 'danke.html'; }, 1200);
        } catch (e) {
          showToast('Teilen nicht möglich');
          release();
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
  const token = params.get('token') || document.querySelector('meta[name="referral-token"]')?.content || '';
  const urlVorlage = params.get('vorlage');

  // Fotos im Hero + Bio-Sektion stehen ohne Quelle im HTML und bleiben leer,
  // bis der Berater feststeht. Sonst sieht der Empfänger eines anderen Beraters
  // kurz das Standard-Foto von Kai. Ist der Berater von einem früheren Aufruf
  // gemerkt, steht er sofort — dann blitzt gar nichts auf.
  const foto = document.getElementById('eFoto');
  const bioFoto = document.getElementById('eBioFoto');
  const brandKey = params.get('berater') || (token ? `tok_${token}` : 'me');
  const sofort = gemerkterBerater(brandKey);
  if (sofort) applyBeraterBrand(sofort);

  // Austragen-Link
  const optoutLink = document.getElementById('austragenLink');
  if (optoutLink && token) optoutLink.href = `austragen.html?token=${token}`;
  const optoutFooter = document.getElementById('austragenFooter');
  if (optoutFooter && token) optoutFooter.href = `austragen.html?token=${token}`;

  // Weg zum ausfuehrlichen Ueberblick. Token und Berater muessen mit, sonst
  // steht dort der Standard-Berater und der Anrufwunsch haengt an nichts.
  const ueberblickLink = document.getElementById('eUeberblick');
  if (ueberblickLink) {
    const ziel = new URL(ueberblickLink.getAttribute('href'), window.location.origin);
    if (token) ziel.searchParams.set('token', token);
    const slug = String(params.get('berater') || '').trim().toLowerCase();
    if (slug && slug.length <= 80 && /^[a-z0-9-]+$/.test(slug)) {
      ziel.searchParams.set('berater', slug);
    }
    ueberblickLink.href = `${ziel.pathname}${ziel.search}`;
  }

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

  // Steht hier ein anderer als der Standard-Berater? Dann darf applyVorlage
  // den Finanzcheck-Knopf nicht mehr anfassen: applyBeraterBrand hat ihn
  // vorher entweder auf dessen eigenen Buchungslink gesetzt oder ausgeblendet,
  // und die Vorlage würde ihn zurück auf Kais Finanzcheck biegen.
  let fremderBerater = false;

  // Empfehlung und passende Themen-Vorlage laden
  (async () => {
    let empData = null;
    if (token) {
      const r = await getEmpfehlungByToken(token);
      empData = r.data || null;
    }

    // Multi-Tenant: Berater dieser Empfehlung laden + Seite auf ihn branden.
    // 1. berater_id der Empfehlung (echter Empfänger-Link mit Token)
    // 2. ?berater=slug (Vorschau-/Funnel-Link ohne Token)
    // 3. eingeloggter Berater (Vorschau der eigenen Themenseite aus dem Dashboard)
    let berater = null;
    if (empData?.berater_id) {
      berater = (await getBeraterPublicById(empData.berater_id)).data;
    }
    if (!berater) {
      const slugParam = params.get('berater');
      if (slugParam) berater = (await getBeraterPublicBySlug(slugParam)).data;
    }
    if (!berater) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const m = await import('./dashboard.js');
          berater = await m.getCurrentBerater();
        }
      } catch (_) {}
    }
    // Kein Berater auflösbar → Standard-Berater (ENV) als letzter Fallback,
    // damit die Portraits nicht leer bleiben.
    if (berater) {
      applyBeraterBrand(berater);
      merkeBerater(brandKey, berater);
      fremderBerater = window.ENV_BERATER_ID
        ? berater.id !== window.ENV_BERATER_ID
        : berater.slug !== 'kai-blobel';
    } else if (!sofort) {
      [foto, bioFoto].forEach((el) => {
        if (!el) return;
        el.src = window.ENV_BERATER_FOTO || '';
        el.alt = window.ENV_BERATER_NAME || '';
      });
    }

    const slugResolved = (urlVorlage || empData?.vorlage_slug || 'allgemein').toLowerCase();

    const v = (await getVorlage(slugResolved)) || (await getVorlage('allgemein'));

    if (v) applyVorlage(v);

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
      // Bei einem fremden Berater hat applyBeraterBrand über diesen Knopf schon
      // entschieden. Die Vorlage trägt Kais Finanzcheck und würde ihn sonst
      // zurückbiegen: Der Empfohlene eines Partners landete in Kais Strecke.
      if (v.quickcheck_url && !fremderBerater) {
        const current = new URL(cta.href, location.href);
        const target = new URL(v.quickcheck_url, location.href);
        ['from', 'schwerpunkt', 'v'].forEach(key => {
          const value = current.searchParams.get(key);
          if (value && !target.searchParams.has(key)) target.searchParams.set(key, value);
        });
        cta.href = target.toString();
      }
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
        if (ic) ic.innerHTML = vorlagenIconHtml(v.icon);
        if (ti) ti.textContent = v.titel || '';
        badge.style.display = '';
      }
    }
  }

  function renderEmpfehlerKarte(d) {
    const inner = document.getElementById('eEmpfehlerInner');
    const name = (d.empfehler_name || '').trim();
    const msg  = (d.empfehler_nachricht || '').trim();
    const standard = (d.empfehler_standard_nachricht || '').trim();
    const personal = msg || standard; // Empfaenger-Satz schlaegt Promoter-Standard
    const recipient = (d.empfaenger_name || '').trim().split(/\s+/)[0] || '';
    const promoterLabel = name || 'Dein Empfehlungsgeber';
    document.querySelectorAll('[data-promoter]').forEach((el) => { el.textContent = promoterLabel; });
    const mark = document.querySelector('.recommendation-mark, .promoter-avatar:not([data-static-icon])');
    if (mark && name) mark.textContent = name.charAt(0).toUpperCase();
    const initial = document.getElementById('ePromoterInitial');
    if (initial && !initial.hasAttribute('data-static-icon')) initial.textContent = (promoterLabel.charAt(0) || 'E').toUpperCase();
    const card = document.getElementById('ePromoterCard');
    if (card) card.classList.toggle('has-personal', !!personal);
    const message = document.getElementById('ePromoterMessage');
    if (message) {
      const beraterVorname = document.querySelector('[data-bb="vorname"]')?.textContent?.trim() || 'Kai';
      message.textContent = personal
        ? `„${personal}“`
        : `Ich habe dir ${beraterVorname} empfohlen und dir diese Seite nach unserem Gespräch weitergeschickt.`;
    }
    const recipientPrefix = document.querySelector('[data-recipient-prefix]');
    const headlineStart = document.querySelector('[data-headline-start]');
    if (recipientPrefix && recipient) {
      recipientPrefix.textContent = `${recipient}, `;
      if (headlineStart) headlineStart.textContent = 'ein';
    }
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
      // Kein Token = unvollständiger Link → NICHT still bestätigen, sonst liest
      // der Empfänger „Danke, ich rufe an", obwohl nichts gespeichert wurde.
      if (!token) {
        anrufBtn.disabled = false;
        anrufBtn.textContent = 'Anrufwunsch bestätigen';
        alert('Dieser Link ist unvollständig. Bitte öffne den Original-Link aus deiner Nachricht.');
        return;
      }
      const { error } = await markAnrufwunsch(token, slot);
      if (error) {
        anrufBtn.disabled = false;
        anrufBtn.textContent = 'Anrufwunsch bestätigen';
        alert('Übermittlung fehlgeschlagen, bitte erneut versuchen.');
        return;
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
