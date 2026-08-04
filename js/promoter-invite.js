/**
 * Phase 117 · Einladungs-Link für Promoter teilen (Berater-Dashboard)
 *
 * Der Link `/empfehler.html?code=…` IST der Zugang des Promoters zu seinem
 * Bereich: Ziel wählen, Thema wählen, empfehlen. Bis Phase 117 gab es im
 * Dashboard keinen Weg, ihn zu verschicken — man musste den Code aus der Liste
 * abtippen. Dieses Modal liefert ihn überall gleich aus: nach dem Anlegen
 * automatisch, später jederzeit erneut (Rechtsklick in der Liste,
 * Promoter-Detailseite). Ein Promoter, der seinen Link verloren hat, bekommt
 * ihn so in zwei Klicks neu.
 *
 * Bewusst kein Versand über den Server: der Berater schickt selbst, per
 * WhatsApp oder Mail, aus seinem eigenen Namen.
 */

const MODAL_ID = 'promoterInviteModal';

/** Öffentlicher Link zum persönlichen Bereich eines Promoters. */
export function promoterInviteLink(code, { neu = false } = {}) {
  const base = `${window.location.origin}/empfehler.html?code=${encodeURIComponent(code)}`;
  return neu ? `${base}&neu=1` : base;
}

/** Telefon → E.164, sonst lehnt wa.me deutsche 0…-Nummern ab. */
function normalizePhoneDE(raw) {
  let n = (raw || '').replace(/[^\d+]/g, '');
  if (!n) return '';
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) return '+' + n.slice(2);
  if (n.startsWith('0')) return '+49' + n.slice(1);
  return '+' + n;
}

function vorname(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/** Einladungstext, den der Promoter bekommt. */
export function inviteMessage({ name, link, beraterName }) {
  const anrede = vorname(name) || 'du';
  const absender = vorname(beraterName) || '';
  const zeilen = [
    `Hallo ${anrede}, hier ist dein persönlicher Empfehlungs-Bereich:`,
    link,
    '',
    'Dort suchst du dir dein Wunschziel aus und kannst mich mit wenigen Klicks weiterempfehlen. Der Link gehört nur dir — bitte nicht weitergeben.',
  ];
  if (absender) zeilen.push('', 'Viele Grüße', absender);
  return zeilen.join('\n');
}

function ensureModal() {
  let modal = document.getElementById(MODAL_ID);
  if (modal) return modal;

  const style = document.createElement('style');
  style.textContent = `
    #${MODAL_ID} .pi-sub { margin: 0 0 16px; font-size: 13.5px; line-height: 1.5; color: var(--ink-muted, #6E6660); }
    #${MODAL_ID} .pi-link-row { display: flex; gap: 8px; margin-bottom: 14px; }
    #${MODAL_ID} .pi-link { flex: 1; min-width: 0; border: 1px solid var(--hairline, #E8E5E0); border-radius: 9px;
      padding: 9px 12px; font: inherit; font-size: 13px; background: var(--ivory, #FAF8F5); color: var(--ink, #1A1A1A); }
    #${MODAL_ID} .pi-ways { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    #${MODAL_ID} .pi-way { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 10px;
      border: 1px solid var(--hairline, #E8E5E0); background: #fff; color: var(--ink, #1A1A1A);
      font: inherit; font-size: 14px; font-weight: 500; text-decoration: none; cursor: pointer; }
    #${MODAL_ID} .pi-way:hover { background: var(--ivory, #FAF8F5); }
    #${MODAL_ID} .pi-way small { display: block; font-weight: 400; font-size: 12px; color: var(--ink-muted, #6E6660); }
    #${MODAL_ID} .pi-way-ico { width: 26px; text-align: center; font-size: 16px; flex-shrink: 0; }
    #${MODAL_ID} .pi-note { margin: 0; font-size: 12px; line-height: 1.45; color: var(--ink-muted, #6E6660); }
  `;
  document.head.appendChild(style);

  modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.className = 'edit-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="edit-modal-backdrop" data-pi-close></div>
    <div class="edit-modal-card" role="dialog" aria-modal="true" aria-labelledby="piTitle">
      <h3 class="edit-modal-title" id="piTitle">Einladungs-Link</h3>
      <p class="pi-sub" id="piSub"></p>
      <div class="pi-link-row">
        <input class="pi-link" id="piLink" type="text" readonly aria-label="Einladungs-Link" />
        <button class="edit-btn primary" id="piCopy" type="button">Kopieren</button>
      </div>
      <div class="pi-ways" id="piWays"></div>
      <p class="pi-note">Dieser Link ist sein persönlicher Zugang. Bitte nur an ihn direkt schicken, nicht in Gruppen.</p>
      <div class="edit-actions">
        <button class="edit-btn" type="button" data-pi-close>Schließen</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => { modal.hidden = true; }, 200);
  };
  modal.querySelectorAll('[data-pi-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  return modal;
}

/**
 * Modal öffnen.
 * @param {object} p
 * @param {string} p.name      Name des Promoters
 * @param {string} p.code      Promoter-Code
 * @param {string} [p.telefon] für den WhatsApp-Weg
 * @param {string} [p.email]   für den Mail-Weg
 * @param {boolean} [p.neu]    frisch angelegt → Link mit &neu=1 (Begrüßungstext)
 */
export function openPromoterInvite({ name, code, telefon, email, neu = false }) {
  if (!code) return;
  const modal = ensureModal();
  const link = promoterInviteLink(code, { neu });
  const beraterName = window.ENV_BERATER_NAME || '';
  const text = inviteMessage({ name, link, beraterName });

  modal.querySelector('#piTitle').textContent = neu
    ? `${name || 'Promoter'} ist angelegt`
    : `Einladungs-Link für ${name || 'den Promoter'}`;
  modal.querySelector('#piSub').textContent = neu
    ? 'Schick ihm jetzt den Link. Damit landet er in seinem Bereich, wählt sein Ziel und kann dich sofort weiterempfehlen.'
    : 'Link verloren? Einfach nochmal schicken — er bleibt derselbe und funktioniert weiterhin.';

  const linkEl = modal.querySelector('#piLink');
  linkEl.value = link;

  // Versandwege: nur anzeigen, was hinterlegt ist
  const ways = modal.querySelector('#piWays');
  ways.replaceChildren();

  const tel = normalizePhoneDE(telefon);
  if (tel) {
    const wa = document.createElement('a');
    wa.className = 'pi-way';
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.href = `https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    wa.innerHTML = `<span class="pi-way-ico" aria-hidden="true">💬</span><span>Per WhatsApp senden<small>${tel}</small></span>`;
    ways.appendChild(wa);
  }
  if (email) {
    const ml = document.createElement('a');
    ml.className = 'pi-way';
    ml.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Dein persönlicher Empfehlungs-Link')}&body=${encodeURIComponent(text)}`;
    ml.innerHTML = `<span class="pi-way-ico" aria-hidden="true">✉️</span><span>Per E-Mail senden<small>${email}</small></span>`;
    ways.appendChild(ml);
  }
  // Für jeden anderen Kanal (SMS, Signal, Messenger): fertige Nachricht kopieren
  const copyMsg = document.createElement('button');
  copyMsg.type = 'button';
  copyMsg.className = 'pi-way';
  copyMsg.innerHTML = '<span class="pi-way-ico" aria-hidden="true">📋</span><span>Nachricht kopieren<small>Fertiger Text mit Link — zum Einfügen</small></span>';
  copyMsg.addEventListener('click', async () => {
    const label = copyMsg.querySelector('span:last-child');
    try {
      await navigator.clipboard.writeText(text);
      label.innerHTML = 'Nachricht kopiert ✓<small>Einfach einfügen und abschicken</small>';
      setTimeout(() => {
        label.innerHTML = 'Nachricht kopieren<small>Fertiger Text mit Link — zum Einfügen</small>';
      }, 2200);
    } catch (_) {}
  });
  ways.appendChild(copyMsg);

  if (!tel && !email) {
    const hint = document.createElement('p');
    hint.className = 'pi-note';
    hint.textContent = 'Für WhatsApp oder E-Mail direkt von hier fehlen Telefon und Adresse. Trag sie im Promoter-Profil nach, dann geht es mit einem Klick.';
    ways.appendChild(hint);
  }

  // Der Knopf neben dem Feld kopiert genau das, was im Feld steht: den Link.
  const copyBtn = modal.querySelector('#piCopy');
  copyBtn.textContent = 'Kopieren';
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch (_) {
      linkEl.select();
      try { document.execCommand('copy'); } catch (_) {}
    }
    copyBtn.textContent = 'Kopiert ✓';
    setTimeout(() => { copyBtn.textContent = 'Kopieren'; }, 1800);
  };

  modal.hidden = false;
  requestAnimationFrame(() => {
    modal.classList.add('open');
    linkEl.focus({ preventScroll: true });
    linkEl.select();
  });
}
