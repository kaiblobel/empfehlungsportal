/**
 * Phase 50a · Berater-Admin
 * CRUD für die berater-Tabelle: Liste + Anlegen + Editieren + Aktiv-Toggle.
 */
import {
  listBerater,
  createBerater,
  updateBerater,
  setBeraterAktiv,
} from './supabase.js';
import { supabase } from './supabase.js';
import { requireAuth, logout } from './dashboard.js';

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('hPhoto').src = window.ENV_BERATER_FOTO || '';
document.getElementById('hName').textContent = window.ENV_BERATER_NAME || 'Berater';

const listEl = document.getElementById('beraterList');
const countEl = document.getElementById('beraterCount');
const modal = document.getElementById('beraterModal');
const modalBackdrop = document.getElementById('beraterModalBackdrop');
const modalCloseBtn = document.getElementById('beraterModalClose');
const modalTitle = document.getElementById('beraterModalTitle');
const form = document.getElementById('beraterForm');
const formCancel = document.getElementById('beraterFormCancel');
const formErr = document.getElementById('beraterFormErr');
const addBtn = document.getElementById('beraterAddBtn');

let editId = null;

(async () => {
  const session = await requireAuth();
  if (!session) return;
  await renderList();
})();

async function renderList() {
  const { data, error } = await listBerater();
  if (error) {
    listEl.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-secondary);">Berater konnten nicht geladen werden: ${escapeHtml(error.message || '')}</div>`;
    return;
  }
  if (!data.length) {
    listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-secondary);">Noch keine Berater angelegt.</div>';
    countEl.textContent = '';
    return;
  }
  countEl.textContent = `${data.length} ${data.length === 1 ? 'Berater' : 'Berater'} im Team`;
  listEl.innerHTML = data.map(renderCard).join('');
  attachHandlers(data);
}

function renderCard(b) {
  const inaktivCls = b.ist_aktiv ? '' : ' inaktiv';
  const slugBadge = b.slug ? `<span class="berater-slug">${escapeHtml(b.slug)}</span>` : `<span class="berater-slug warn">kein Slug!</span>`;
  const authBadge = b.auth_user_id
    ? `<span class="berater-auth ok" title="Mit Auth-User verknüpft">✓ Login</span>`
    : `<span class="berater-auth pending" title="Noch kein Login angelegt">⚠ Login fehlt</span>`;
  const aktivLabel = b.ist_aktiv ? 'Aktiv' : 'Inaktiv';
  const aktivCls = b.ist_aktiv ? 'on' : 'off';
  const fotoSrc = b.foto_url || '';
  const inviteLabel = b.auth_user_id ? 'Magic-Link →' : 'Einladen →';
  const inviteCls = b.auth_user_id ? 'berater-invite-btn relink' : 'berater-invite-btn';
  const inviteTitle = b.auth_user_id
    ? 'Erneuten Magic-Link senden (z. B. nach Passwort-Vergessen)'
    : 'Einladung erstellen';
  const inviteAction = `<button class="${inviteCls}" type="button" data-invite="${b.id}" title="${inviteTitle}">${inviteLabel}</button>`;
  return `
    <details class="cms-card berater-card${inaktivCls}" data-id="${b.id}">
      <summary>
        ${fotoSrc ? `<img class="berater-photo" src="${escapeAttr(fotoSrc)}" alt="" onerror="this.style.display='none'" />` : `<span class="berater-photo placeholder">${initials(b.name)}</span>`}
        <span class="titel">${escapeHtml(b.name)}</span>
        ${slugBadge}
        ${authBadge}
        ${inviteAction}
        <span class="berater-toggle ${aktivCls}" data-toggle="${b.id}" title="${aktivLabel}">${aktivLabel}</span>
      </summary>
      <div class="cms-body">
        <div class="cms-row-2">
          <div><label>Name</label><input data-f="name" value="${escapeAttr(b.name || '')}" /></div>
          <div><label>Slug (URL-Identifier)</label><input data-f="slug" value="${escapeAttr(b.slug || '')}" pattern="[a-z0-9-]+" /></div>
        </div>
        <div class="cms-row-2">
          <div><label>Rolle</label><input data-f="rolle" value="${escapeAttr(b.rolle || '')}" placeholder="z.B. Vermögensberater" /></div>
          <div><label>E-Mail</label><input data-f="email" type="email" value="${escapeAttr(b.email || '')}" /></div>
        </div>
        <div class="cms-row-2">
          <div><label>Telefon</label><input data-f="telefon" value="${escapeAttr(b.telefon || '')}" placeholder="+49…" /></div>
          <div><label>WhatsApp (ohne +)</label><input data-f="whatsapp" value="${escapeAttr(b.whatsapp || '')}" placeholder="491701234567" /></div>
        </div>
        <div>
          <label>Foto-URL</label>
          <input data-f="foto_url" value="${escapeAttr(b.foto_url || '')}" />
          ${b.foto_url ? `<img class="cms-img-preview" src="${escapeAttr(b.foto_url)}" alt="" onerror="this.style.display='none'" />` : ''}
        </div>
        <div><label>Bookings-Link</label><input data-f="bookings_url" value="${escapeAttr(b.bookings_url || '')}" /></div>
        <div><label>Auth-User-ID <span style="color:var(--text-secondary);font-weight:400;">(read-only, wird beim ersten Login automatisch verknüpft)</span></label><input data-f="auth_user_id_readonly" value="${escapeAttr(b.auth_user_id || '')}" readonly style="opacity:0.6;cursor:not-allowed;" /></div>

        <div class="cms-actions berater-actions">
          <button class="cms-save" type="button" data-save="${b.id}">Speichern</button>
          <button class="cms-toggle-aktiv" type="button" data-toggle-aktiv="${b.id}" data-current="${b.ist_aktiv}">
            ${b.ist_aktiv ? 'Deaktivieren' : 'Aktivieren'}
          </button>
        </div>
      </div>
    </details>
  `;
}

function attachHandlers(list) {
  document.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.save;
      const card = btn.closest('.berater-card');
      const fields = card.querySelectorAll('[data-f]');
      const data = {};
      fields.forEach(f => {
        const k = f.dataset.f;
        if (k === 'auth_user_id_readonly') return;
        let v = (f.value || '').trim();
        data[k] = v || null;
      });

      btn.disabled = true;
      btn.textContent = 'Speichere…';

      const { error } = await updateBerater(id, data);

      if (error) {
        toast('Speichern fehlgeschlagen: ' + (error.message || 'unbekannt'));
        btn.disabled = false;
        btn.textContent = 'Speichern';
        return;
      }

      toast(`${data.name || 'Berater'} gespeichert.`);
      btn.disabled = false;
      btn.textContent = 'Speichern';
      await renderList();
    });
  });

  document.querySelectorAll('[data-invite]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.invite;
      const berater = list.find(b => b.id === id);
      btn.disabled = true;
      btn.textContent = 'Erstelle…';
      try {
        const { data, error } = await supabase.functions.invoke('invite-berater', {
          body: { berater_id: id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.link) throw new Error('Kein Link zurückgegeben.');
        openInviteModal({
          link: data.link,
          email: data.email,
          name: data.name || berater?.name,
          type: data.type || 'invite',
        });
      } catch (err) {
        toast('Einladung fehlgeschlagen: ' + (err.message || String(err)), 4000);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Einladen →';
      }
    });
  });

  document.querySelectorAll('[data-toggle-aktiv]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.toggleAktiv;
      const current = btn.dataset.current === 'true';
      const next = !current;
      btn.disabled = true;
      const { error } = await setBeraterAktiv(id, next);
      btn.disabled = false;
      if (error) {
        toast('Fehler: ' + (error.message || ''));
        return;
      }
      toast(next ? 'Berater aktiviert.' : 'Berater deaktiviert.');
      await renderList();
    });
  });
}

/* ---------- Modal: Neuer Berater ---------- */
addBtn.addEventListener('click', () => openModal());
modalCloseBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
formCancel.addEventListener('click', closeModal);

function openModal() {
  editId = null;
  modalTitle.textContent = 'Neuer Berater';
  form.reset();
  formErr.textContent = '';
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
  document.body.style.overflow = 'hidden';
  setTimeout(() => form.querySelector('[data-f="name"]')?.focus(), 100);
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { modal.hidden = true; }, 200);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formErr.textContent = '';

  const fields = form.querySelectorAll('[data-f]');
  const data = {};
  fields.forEach(f => {
    const k = f.dataset.f;
    let v = (f.value || '').trim();
    data[k] = v || null;
  });

  if (!data.name) {
    formErr.textContent = 'Name ist Pflicht.';
    return;
  }
  if (!data.slug) {
    formErr.textContent = 'Slug ist Pflicht (URL-Identifier wie "max-kudlek").';
    return;
  }
  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    formErr.textContent = 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.';
    return;
  }

  const submitBtn = form.querySelector('.berater-form-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Lege an…';

  const { error } = await createBerater(data);

  if (error) {
    formErr.textContent = 'Konnte nicht angelegt werden: ' + (error.message || 'unbekannt');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Berater anlegen';
    return;
  }

  toast(`${data.name} wurde angelegt.`);
  submitBtn.disabled = false;
  submitBtn.textContent = 'Berater anlegen';
  closeModal();
  await renderList();
});

/* ---------- Invite-Modal ---------- */
const inviteModal = document.getElementById('inviteModal');
const inviteBackdrop = document.getElementById('inviteModalBackdrop');
const inviteClose = document.getElementById('inviteModalClose');
const inviteLinkEl = document.getElementById('inviteLink');
const inviteCopyBtn = document.getElementById('inviteLinkCopy');
const inviteWaEl = document.getElementById('inviteWa');
const inviteMailEl = document.getElementById('inviteMail');
const inviteSubEl = document.getElementById('inviteModalSub');

function openInviteModal({ link, email, name, type }) {
  inviteLinkEl.value = link;
  const firstName = (name || '').split(' ')[0] || 'der Berater';
  const modalTitleEl = document.getElementById('inviteModalTitle');

  if (type === 'magiclink') {
    modalTitleEl.textContent = 'Magic-Link erstellt';
    inviteSubEl.textContent = `Schick diesen Login-Link an ${name || email}. Ein Klick und ${firstName} ist drin – falls das Passwort vergessen wurde, kann es danach in den Einstellungen neu gesetzt werden.`;
  } else {
    modalTitleEl.textContent = 'Einladung erstellt';
    inviteSubEl.textContent = `Schick diesen Link an ${name || email}. Ein Klick und ${firstName} setzt das Passwort selbst.`;
  }

  const waMsgInvite = `Hi ${firstName}, hier dein persönlicher Login für unser Empfehlungs-Portal: ${link}\n\nKlick den Link, setz dein Passwort, dann bist du drin. Falls Fragen sind, melde dich kurz. – Kai`;
  const waMsgRelink = `Hi ${firstName}, hier ein neuer Login-Link fürs Empfehlungs-Portal: ${link}\n\nEin Klick reicht. Falls Fragen sind, melde dich kurz. – Kai`;
  const waMsg = type === 'magiclink' ? waMsgRelink : waMsgInvite;
  inviteWaEl.href = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  const mailSubject = `Dein Login fürs Empfehlungs-Portal`;
  const mailBodyInvite = `Hi ${firstName},\n\nhier dein persönlicher Login-Link:\n${link}\n\nKlick einmal drauf, setz dein Passwort, dann bist du drin.\n\nFalls Fragen sind, melde dich kurz.\n\n– Kai`;
  const mailBodyRelink = `Hi ${firstName},\n\nhier ein neuer Login-Link fürs Empfehlungs-Portal:\n${link}\n\nEin Klick reicht.\n\nFalls Fragen sind, melde dich kurz.\n\n– Kai`;
  const mailBody = type === 'magiclink' ? mailBodyRelink : mailBodyInvite;
  inviteMailEl.href = `mailto:${email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

  inviteModal.hidden = false;
  requestAnimationFrame(() => inviteModal.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeInviteModal() {
  inviteModal.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { inviteModal.hidden = true; }, 200);
}

inviteClose.addEventListener('click', closeInviteModal);
inviteBackdrop.addEventListener('click', closeInviteModal);

inviteCopyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(inviteLinkEl.value);
    inviteCopyBtn.textContent = 'Kopiert ✓';
    setTimeout(() => { inviteCopyBtn.textContent = 'Kopieren'; }, 1800);
  } catch {
    inviteLinkEl.select();
    document.execCommand('copy');
    inviteCopyBtn.textContent = 'Kopiert ✓';
    setTimeout(() => { inviteCopyBtn.textContent = 'Kopieren'; }, 1800);
  }
});

/* ---------- Helpers ---------- */
const toastEl = document.getElementById('hToast');
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function initials(name) {
  if (!name) return '?';
  return name.split(/\s+/).map(s => s[0] || '').join('').slice(0, 2).toUpperCase();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );
}
function escapeAttr(s) { return escapeHtml(s); }
