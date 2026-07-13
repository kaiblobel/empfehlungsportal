/**
 * Phase 50a · Berater-Admin
 * CRUD für die berater-Tabelle: Liste + Anlegen + Editieren + Aktiv-Toggle.
 */
import {
  listBerater,
  createBerater,
  updateBerater,
  setBeraterAktiv,
  uploadBeraterFoto,
  adminSetBeraterPassword,
  createBeraterLogin,
} from './supabase.js';
import { supabase } from './supabase.js';
import { requireAuth, logout, applyBeraterHeader, getCurrentBerater } from './dashboard.js';

/** Starkes, gut lesbares Passwort (ohne verwechselbare Zeichen O/0/l/1/I). */
function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

document.getElementById('logoutBtn').addEventListener('click', logout);
applyBeraterHeader();

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
  // Berater-Verwaltung ist Admin-only. Nicht-Admins (auch bei direktem URL-Aufruf)
  // zum Hub umleiten. Die DB-RLS schützt zusätzlich gegen direkte Schreibzugriffe.
  const me = await getCurrentBerater();
  if (!me?.ist_admin) {
    window.location.href = '/hub.html';
    return;
  }
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
  return `
    <details class="cms-card berater-card${inaktivCls}" data-id="${b.id}">
      <summary>
        ${fotoSrc ? `<img class="berater-photo" src="${escapeAttr(fotoSrc)}" alt="" onerror="this.style.display='none'" />` : `<span class="berater-photo placeholder">${initials(b.name)}</span>`}
        <span class="titel">${escapeHtml(b.name)}</span>
        ${slugBadge}
        ${authBadge}
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
          <label>Foto</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input data-f="foto_url" value="${escapeAttr(b.foto_url || '')}" placeholder="Bild hochladen → oder URL einfügen" style="flex:1;" />
            <label class="cms-upload-btn" style="white-space:nowrap;cursor:pointer;padding:8px 14px;border:1px solid var(--border,#e3ddd4);border-radius:8px;font-size:13px;font-weight:500;background:#fff;">
              <span class="cms-upload-label">Hochladen</span>
              <input type="file" accept="image/*" data-upload="${b.id}" hidden />
            </label>
          </div>
          <img class="cms-img-preview" data-preview="${b.id}" src="${escapeAttr(b.foto_url || '')}" alt="" onerror="this.style.display='none'" style="${b.foto_url ? '' : 'display:none;'}" />
        </div>
        <div><label>Bookings-Link</label><input data-f="bookings_url" value="${escapeAttr(b.bookings_url || '')}" /></div>
        <div class="cms-row-2">
          <div><label>Impressum-URL</label><input data-f="impressum_url" value="${escapeAttr(b.impressum_url || '')}" placeholder="https://www.dvag.de/vorname.nachname/impressum.html" /></div>
          <div><label>Datenschutz-URL</label><input data-f="datenschutz_url" value="${escapeAttr(b.datenschutz_url || '')}" placeholder="https://www.dvag.de/vorname.nachname/datenschutz.html" /></div>
        </div>
        <div><label>Auth-User-ID <span style="color:var(--text-secondary);font-weight:400;">(read-only, wird beim ersten Login automatisch verknüpft)</span></label><input data-f="auth_user_id_readonly" value="${escapeAttr(b.auth_user_id || '')}" readonly style="opacity:0.6;cursor:not-allowed;" /></div>

        <div class="berater-pw" style="margin-top:6px;padding-top:14px;border-top:1px solid var(--border,#e3ddd4);">
          <label>${b.auth_user_id ? 'Passwort setzen' : 'Login anlegen (Passwort vergeben)'}</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input data-pw="${b.id}" value="${escapeAttr(generatePassword())}" style="flex:1;min-width:160px;font-family:'SF Mono',Menlo,monospace;" />
            <button type="button" data-pw-roll="${b.id}" title="Neuen Vorschlag würfeln" style="padding:8px 12px;border:1px solid var(--border,#e3ddd4);border-radius:8px;background:#fff;cursor:pointer;">🎲</button>
            <button type="button" data-pw-set="${b.id}" style="padding:8px 16px;border:1px solid #141414;border-radius:8px;background:#141414;color:#fff;font-weight:600;cursor:pointer;">${b.auth_user_id ? 'Setzen' : 'Login anlegen'}</button>
          </div>
          <div data-pw-result="${b.id}" style="display:none;margin-top:10px;font-size:13px;"></div>
        </div>

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

  document.querySelectorAll('[data-upload]').forEach(inp => {
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const card = inp.closest('.berater-card');
      const slug = (card.querySelector('[data-f="slug"]')?.value || '').trim();
      const labelEl = inp.closest('.cms-upload-btn').querySelector('.cms-upload-label');
      const orig = labelEl.textContent;
      labelEl.textContent = 'Lädt…';
      const { url, error } = await uploadBeraterFoto(file, slug);
      labelEl.textContent = orig;
      inp.value = '';
      if (error) {
        toast('Upload fehlgeschlagen: ' + (error.message || 'unbekannt'), 4000);
        return;
      }
      card.querySelector('[data-f="foto_url"]').value = url;
      const prev = card.querySelector('[data-preview]');
      if (prev) { prev.src = url; prev.style.display = ''; }
      toast('Foto hochgeladen — jetzt noch „Speichern" klicken.', 3500);
    });
  });

  // Passwort würfeln (neuer Vorschlag)
  document.querySelectorAll('[data-pw-roll]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const inp = document.querySelector(`input[data-pw="${btn.dataset.pwRoll}"]`);
      if (inp) inp.value = generatePassword();
    });
  });

  // Passwort setzen (Admin)
  // Passwort/Login zeigt Erfolg (Passwort + Kopieren + WhatsApp/E-Mail mit Login-Link)
  function showLoginResult(resultEl, berater, pw, created) {
    const origin = window.location.origin;
    const loginUrl = `${origin}/dashboard/`;
    const msg = `Hallo ${berater?.name || ''}, dein Login fürs Empfehlungsportal:\nBenutzer: ${berater?.email || ''}\nPasswort: ${pw}\nAnmelden: ${loginUrl}`;
    const waNum = (berater?.whatsapp || '').replace(/[^\d]/g, '');
    const waBtn = waNum ? `<a href="https://wa.me/${waNum}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" style="text-decoration:none;padding:5px 12px;border-radius:999px;border:1px solid #25D366;color:#128C36;font-weight:600;">WhatsApp</a>` : '';
    const mailBtn = berater?.email ? `<a href="mailto:${berater.email}?subject=${encodeURIComponent('Dein Login-Zugang')}&body=${encodeURIComponent(msg)}" style="text-decoration:none;padding:5px 12px;border-radius:999px;border:1px solid var(--border,#e3ddd4);color:#141414;font-weight:600;">E-Mail</a>` : '';
    resultEl.innerHTML = `
      <div style="padding:10px 12px;background:rgba(31,107,48,0.06);border:1px solid rgba(31,107,48,0.3);border-radius:8px;">
        <div style="color:#1F6B30;font-weight:600;margin-bottom:6px;">✓ ${created ? 'Login angelegt' : 'Passwort gesetzt'}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <code style="font-family:'SF Mono',Menlo,monospace;font-size:14px;background:#fff;padding:5px 10px;border-radius:6px;border:1px solid var(--border,#e3ddd4);">${escapeHtml(pw)}</code>
          <button type="button" data-pw-copy="${escapeAttr(pw)}" style="padding:5px 12px;border-radius:999px;border:1px solid var(--border,#e3ddd4);background:#fff;cursor:pointer;font-weight:600;">Kopieren</button>
          ${waBtn}${mailBtn}
        </div>
        <div style="margin-top:6px;color:var(--text-secondary,#6B6660);">Schick ${escapeHtml(berater?.name || 'dem Berater')} Benutzer (E-Mail) + Passwort + Login-Link. Er kann es danach selbst in den Einstellungen ändern.${created ? ' Falls die Seite neu geladen wird, zeigt die Karte „✓ Login".' : ''}</div>
      </div>`;
    resultEl.style.display = '';
    const copyBtn = resultEl.querySelector('[data-pw-copy]');
    copyBtn?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(pw); copyBtn.textContent = 'Kopiert ✓'; setTimeout(() => { copyBtn.textContent = 'Kopieren'; }, 1600); } catch (_) {}
    });
  }

  // Passwort setzen (bestehendes Konto) bzw. Login anlegen (neues Konto) — Admin
  document.querySelectorAll('[data-pw-set]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.pwSet;
      const berater = list.find(b => b.id === id);
      const inp = document.querySelector(`input[data-pw="${id}"]`);
      const resultEl = document.querySelector(`[data-pw-result="${id}"]`);
      const pw = (inp?.value || '').trim();
      const hatLogin = !!berater?.auth_user_id;
      if (pw.length < 8) { toast('Passwort muss mindestens 8 Zeichen haben.'); return; }
      const frage = hatLogin
        ? `Passwort für ${berater?.name || 'diesen Berater'} jetzt neu setzen?`
        : `Für ${berater?.name || 'diesen Berater'} jetzt ein Login mit diesem Passwort anlegen?`;
      if (!confirm(frage)) return;
      const origLabel = btn.textContent;
      btn.disabled = true; btn.textContent = hatLogin ? 'Setze…' : 'Lege an…';
      try {
        if (hatLogin) {
          const { data, error } = await adminSetBeraterPassword(id, pw);
          if (error) throw error;
          if (data === 'ok') { showLoginResult(resultEl, berater, pw, false); toast('Passwort gesetzt.'); }
          else if (data === 'no_login') toast('Dieser Berater hat noch kein Login.');
          else if (data === 'forbidden') toast('Kein Admin-Zugriff.');
          else if (data === 'too_short') toast('Passwort zu kurz (min. 8 Zeichen).');
          else toast('Unerwartete Antwort: ' + data);
        } else {
          const { data, error } = await createBeraterLogin(id, pw);
          if (error) throw error;
          if (data?.ok) { showLoginResult(resultEl, berater, pw, true); toast('Login angelegt.'); }
          else toast('Unerwartete Antwort.');
        }
      } catch (err) {
        console.warn('[pw-set]', err);
        toast('Fehler: ' + (err.message || String(err)));
      } finally {
        btn.disabled = false; btn.textContent = origLabel;
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
