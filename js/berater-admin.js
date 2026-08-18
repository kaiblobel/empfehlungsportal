/**
 * Phase 140 · Beraterkonten
 * CRUD für die berater-Tabelle: übersichtliche Profile, Zugang und Aktiv-Toggle.
 */
import {
  listBerater,
  createBerater,
  updateBerater,
  setBeraterAktiv,
  uploadBeraterFoto,
  createBeraterLogin,
  getTestdatenBestand,
  entferneTestdaten,
  getBeraterLoginEmails,
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

  // Phase 209: Wo die Anmeldeadresse von der Geschäftsadresse abweicht, gehört
  // sie in die Karte. Sonst sieht es aus, als meldete man sich mit der Adresse
  // an, die eigentlich für Kunden gedacht ist.
  const anmeldeAdressen = await getBeraterLoginEmails();
  data.forEach((b) => { b._anmelde_email = anmeldeAdressen.get(b.id) || null; });

  listEl.innerHTML = data.map(renderCard).join('');
  fuelleCoachAuswahlImAnlegen(data);
  attachHandlers(data);
  zeigeTestdaten();
}

/* ---------- Phase 208 · Testdaten gesammelt entfernen ---------- */

const BEREICH_TEXT = {
  berater: 'Beraterkonten',
  promoter: 'Promoter',
  empfehlungen: 'Empfehlungen',
  praemien: 'Prämien',
  kidz: 'KIDZ-Anmeldungen',
  potenziale: 'Potenziale',
};

async function zeigeTestdaten() {
  const box = document.getElementById('testdatenBox');
  const text = document.getElementById('testdatenText');
  const btn = document.getElementById('testdatenBtn');
  const hinweis = document.getElementById('testdatenHinweis');
  if (!box || !text || !btn) return;

  const bestand = await getTestdatenBestand();
  const teile = Object.entries(bestand)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${BEREICH_TEXT[k] || k}`);

  box.hidden = false;

  // Ohne Testdaten wären Knopf und Erklärung nur Beiwerk.
  if (!teile.length) {
    text.textContent = 'Zurzeit gibt es keine Testdatensätze. Alles, was im Portal steht, ist echt.';
    btn.hidden = true;
    if (hinweis) hinweis.hidden = true;
    return;
  }

  btn.hidden = false;
  if (hinweis) hinweis.hidden = false;
  text.textContent = `Als Test gekennzeichnet: ${teile.join(', ')}. `
    + 'Diese Datensätze zählen in keiner Auswertung mit und lösen keine Mitteilungen aus.';
}

document.getElementById('testdatenBtn')?.addEventListener('click', async (ev) => {
  const btn = ev.currentTarget;
  if (!window.confirm('Alle als Test gekennzeichneten Datensätze werden gesichert und dann entfernt. Fortfahren?')) return;
  btn.disabled = true;
  btn.textContent = 'Räume auf…';
  const { data, error } = await entferneTestdaten();
  btn.disabled = false;
  btn.textContent = 'Testdaten sichern und entfernen';
  if (error) {
    toast('Aufräumen fehlgeschlagen: ' + (error.message || 'unbekannt'));
    return;
  }
  const offen = Array.isArray(data?.offene_auth_konten) ? data.offene_auth_konten : [];
  toast(offen.length
    ? `Testdaten entfernt. ${offen.length} Anmeldung${offen.length === 1 ? '' : 'en'} von Testberatern bleibt bestehen.`
    : 'Testdaten entfernt und gesichert.');
  await renderList();
});

/** Die Coach-Liste im Anlegen-Formular kennt beim Anlegen noch keinen Kreis. */
function fuelleCoachAuswahlImAnlegen(alle) {
  const auswahl = document.getElementById('neuerBeraterCoach');
  if (!auswahl) return;
  const bisher = auswahl.value;
  auswahl.innerHTML = '<option value="">Kein Coach hinterlegt</option>' + alle
    .slice()
    .sort((x, y) => (x.name || '').localeCompare(y.name || '', 'de'))
    .map((k) => `<option value="${escapeAttr(k.id)}">${escapeHtml((k.name || 'Ohne Namen') + (k.rolle ? ` · ${k.rolle}` : ''))}</option>`)
    .join('');
  if (bisher) auswahl.value = bisher;
}

function renderCard(b, _index, alle) {
  const inaktivCls = b.ist_aktiv ? '' : ' inaktiv';
  const authBadge = (b.ist_test
    ? `<span class="badge badge-test" title="Testkonto: zählt nirgends mit">Test</span> `
    : '')
    + (b.auth_user_id
      ? `<span class="berater-auth ok" title="Login ist eingerichtet">Login aktiv</span>`
      : `<span class="berater-auth pending" title="Noch kein Login angelegt">Login fehlt</span>`);
  const aktivLabel = b.ist_aktiv ? 'Aktiv' : 'Inaktiv';
  const aktivCls = b.ist_aktiv ? 'on' : 'off';
  const fotoSrc = b.foto_url || '';
  const photoMarkup = `
    <span class="berater-photo">
      <img src="${escapeAttr(fotoSrc)}" alt="" ${fotoSrc ? '' : 'hidden'} onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
      <span class="berater-photo-placeholder" ${fotoSrc ? 'hidden' : ''}>${initials(b.name)}</span>
    </span>`;
  return `
    <details class="cms-card berater-card${inaktivCls}" data-id="${b.id}">
      <summary>
        ${photoMarkup}
        <span class="berater-summary-identity">
          <span class="berater-summary-main"><span class="titel">${escapeHtml(b.name)}</span><span class="berater-summary-role">${escapeHtml(b.rolle || 'Berater')}</span></span>
          <span class="berater-summary-email">${escapeHtml(b.email || 'Keine E-Mail hinterlegt')}</span>
          ${b._anmelde_email
            ? `<span class="berater-summary-login" title="Diese Adresse gilt beim Anmelden. Die Adresse darüber sehen Kunden.">Anmeldung: ${escapeHtml(b._anmelde_email)}</span>`
            : ''}
        </span>
        <span class="berater-summary-statuses">
          ${authBadge}
          <span class="berater-toggle ${aktivCls}" data-toggle="${b.id}" title="${aktivLabel}">${aktivLabel}</span>
        </span>
      </summary>
      <div class="cms-body">
        <section class="berater-section">
          <header class="berater-section-head">
            <div><h3>Profil und Kontakt</h3><p>Alles, was im Alltag gebraucht wird.</p></div>
          </header>
          <div class="berater-profile-grid">
            <div class="berater-photo-card">
              <div class="berater-photo-stage">
                <img class="berater-photo-preview" data-preview="${b.id}" src="${escapeAttr(fotoSrc)}" alt="Profilbild von ${escapeAttr(b.name || 'Berater')}" ${fotoSrc ? '' : 'hidden'} onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
                <span class="berater-photo-stage-placeholder" data-preview-placeholder="${b.id}" ${fotoSrc ? 'hidden' : ''}>${initials(b.name)}</span>
              </div>
              <input type="hidden" data-f="foto_url" value="${escapeAttr(fotoSrc)}" />
              <div class="berater-photo-actions">
                <label class="cms-upload-btn berater-photo-upload">
                  <span class="cms-upload-label">${fotoSrc ? 'Bild ersetzen' : 'Bild hochladen'}</span>
                  <input type="file" accept="image/*" data-upload="${b.id}" hidden />
                </label>
                <button type="button" class="berater-photo-remove" data-photo-remove="${b.id}" ${fotoSrc ? '' : 'hidden'}>Bild entfernen</button>
              </div>
              <p class="berater-photo-note">JPG oder PNG, idealerweise freigestellt</p>
            </div>

            <div class="berater-fields">
              <div><label>Name</label><input data-f="name" value="${escapeAttr(b.name || '')}" /></div>
              <div><label>Rolle</label><input data-f="rolle" value="${escapeAttr(b.rolle || '')}" placeholder="z. B. Vermögensberater" /></div>
              <div><label>E-Mail</label><input data-f="email" type="email" value="${escapeAttr(b.email || '')}" /></div>
              <div><label>Telefon</label><input data-f="telefon" type="tel" inputmode="tel" value="${escapeAttr(b.telefon || '')}" placeholder="+49 …" /></div>
              <div><label>WhatsApp</label><input data-f="whatsapp" type="tel" inputmode="tel" value="${escapeAttr(b.whatsapp || '')}" placeholder="491701234567" /><span class="berater-field-hint">Mit Ländervorwahl, ohne Leerzeichen.</span></div>
              <div class="wide">
                <label>Coach</label>
                ${coachAuswahl(b, alle)}
                <span class="berater-field-hint">${coachHinweis(b, alle)}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="berater-section">
          <header class="berater-section-head">
            <div><h3>Öffentliche Angaben</h3><p>Diese Links erscheinen auf den persönlichen Kundenseiten.</p></div>
          </header>
          <div class="berater-fields">
            <div class="wide"><label>Terminbuchung</label><input data-f="bookings_url" value="${escapeAttr(b.bookings_url || '')}" placeholder="https://outlook.office.com/book/…" /></div>
            <div class="wide"><label>Anschrift</label><input data-f="adresse" value="${escapeAttr(b.adresse || '')}" placeholder="An der Wachsbleiche 1a · 03046 Cottbus" /></div>
            <div><label>Impressum</label><input data-f="impressum_url" value="${escapeAttr(b.impressum_url || '')}" placeholder="https://www.dvag.de/vorname.nachname/impressum.html" /></div>
            <div><label>Datenschutz</label><input data-f="datenschutz_url" value="${escapeAttr(b.datenschutz_url || '')}" placeholder="https://www.dvag.de/vorname.nachname/datenschutz.html" /></div>
          </div>
        </section>

        <section class="berater-section">
          <header class="berater-section-head">
            <div><h3>Bilder für die Präsentation</h3><p>Ohne eigene Bilder greift das Profilbild. Nie das Büro eines anderen Beraters.</p></div>
          </header>
          <div class="berater-fields">
            <div class="wide">
              <label>Bürofoto</label>
              <div class="berater-bild-zeile">
                <img class="berater-bild-vorschau" data-bild-vorschau="buero_foto_url" src="${escapeAttr(b.buero_foto_url || '')}" alt="" ${b.buero_foto_url ? '' : 'hidden'} />
                <input type="hidden" data-f="buero_foto_url" value="${escapeAttr(b.buero_foto_url || '')}" />
                <label class="cms-upload-btn">
                  <span class="cms-upload-label">${b.buero_foto_url ? 'Bild ersetzen' : 'Bild hochladen'}</span>
                  <input type="file" accept="image/*" data-upload="${b.id}" data-upload-ziel="buero_foto_url" hidden />
                </label>
                <button type="button" class="berater-photo-remove" data-bild-weg="buero_foto_url" ${b.buero_foto_url ? '' : 'hidden'}>Entfernen</button>
              </div>
              <span class="berater-field-hint">Hochformat aus dem eigenen Büro. Steht im Einstieg der Präsentation. Leer: das Profilbild rückt nach.</span>
            </div>

            <div class="wide">
              <label>Teamfoto</label>
              <div class="berater-bild-zeile">
                <img class="berater-bild-vorschau" data-bild-vorschau="team_foto_url" src="${escapeAttr(b.team_foto_url || '')}" alt="" ${b.team_foto_url ? '' : 'hidden'} />
                <input type="hidden" data-f="team_foto_url" value="${escapeAttr(b.team_foto_url || '')}" />
                <label class="cms-upload-btn">
                  <span class="cms-upload-label">${b.team_foto_url ? 'Bild ersetzen' : 'Bild hochladen'}</span>
                  <input type="file" accept="image/*" data-upload="${b.id}" data-upload-ziel="team_foto_url" hidden />
                </label>
                <button type="button" class="berater-photo-remove" data-bild-weg="team_foto_url" ${b.team_foto_url ? '' : 'hidden'}>Entfernen</button>
              </div>
              <span class="berater-field-hint">Team oder Räume, quer. Steht beim Thema „Berufliche Perspektive". Leer: die Karte bleibt ohne Bild.</span>
            </div>

            <div class="wide">
              <label>Bildunterschrift zum Bürofoto</label>
              <input data-f="buero_bildzeile" value="${escapeAttr(b.buero_bildzeile || '')}" placeholder="z. B. Büro Cottbus. Hier sitzen wir, wenn wir reden." />
              <span class="berater-field-hint">Leer lassen, dann erscheint keine Zeile.</span>
            </div>
          </div>
        </section>

        <section class="berater-section">
          <header class="berater-section-head">
            <div><h3>Zugang</h3><p>Login verwalten, ohne technische Kontodaten offenzulegen.</p></div>
          </header>
          <div class="berater-pw">
            <div class="berater-pw-copy">
              <span class="berater-login-status ${b.auth_user_id ? 'active' : ''}">${b.auth_user_id ? 'Login aktiv' : 'Noch kein Login'}</span>
              <strong>${b.auth_user_id ? 'Neues Passwort vergeben' : 'Login anlegen'}</strong>
              <p class="berater-pw-intro">${b.auth_user_id
                ? 'Das aktuelle Passwort kann aus Sicherheitsgründen nicht angezeigt werden. Ein neues Passwort wird erst aktiv, wenn du es hier ausdrücklich setzt.'
                : 'Erzeuge ein sicheres Startpasswort und lege damit den Login für diesen Berater an.'}</p>
            </div>
            <div class="berater-pw-form">
              <label class="berater-pw-field-label" for="pw-${b.id}">${b.auth_user_id ? 'Neues Passwort' : 'Startpasswort'}</label>
              <div class="berater-pw-row">
                <input id="pw-${b.id}" data-pw="${b.id}" value="" autocomplete="new-password" placeholder="Mindestens 8 Zeichen" />
                <button type="button" class="berater-pw-generate" data-pw-roll="${b.id}">Sicheren Vorschlag erzeugen</button>
              </div>
              <div class="berater-pw-submit-row"><button type="button" class="berater-pw-submit" data-pw-set="${b.id}">${b.auth_user_id ? 'Neues Passwort jetzt setzen' : 'Login jetzt anlegen'}</button></div>
              <div class="berater-pw-note">Der allgemeine Knopf „Speichern“ für die Beraterdaten ändert dieses Passwort nicht.</div>
              <div data-pw-result="${b.id}" class="berater-pw-result" hidden></div>
            </div>
          </div>
          <details class="berater-tech">
            <summary>Technische Angaben anzeigen${b.slug ? '' : ' · URL-Kennung fehlt'}</summary>
            <div class="berater-tech-grid">
              <div><label>URL-Kennung</label><input data-f="slug" value="${escapeAttr(b.slug || '')}" pattern="[a-z0-9-]+" placeholder="max-kudlek" /><span class="berater-field-hint">Wird für persönliche Links und Bilddateien benötigt.</span></div>
              <div><label>Interne Benutzer-ID</label><div class="berater-tech-value">${escapeHtml(b.auth_user_id || 'Noch nicht verknüpft')}</div></div>
              <div class="wide">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                  <input type="checkbox" data-f="ist_test" ${b.ist_test ? 'checked' : ''} style="width:auto;margin:0" />
                  Testkonto
                </label>
                <span class="berater-field-hint">
                  Alles, was diesem Konto gehört, gilt als Testdatensatz: Promoter, Empfehlungen,
                  Prämien, Anmeldungen. Zählt in keiner Auswertung mit, löst keine Mail und keine
                  Mitteilung aus und lässt sich gesammelt wieder entfernen.
                </span>
              </div>
            </div>
          </details>
        </section>

        <div class="berater-action-bar">
          <span>Änderungen werden erst nach dem Speichern übernommen.</span>
          <div class="berater-actions">
            <button class="cms-toggle-aktiv" type="button" data-toggle-aktiv="${b.id}" data-current="${b.ist_aktiv}">
              ${b.ist_aktiv ? 'Deaktivieren' : 'Aktivieren'}
            </button>
            <button class="cms-save" type="button" data-save="${b.id}">Änderungen speichern</button>
          </div>
        </div>
      </div>
    </details>
  `;
}

/* ---------- Phase 197 · Coach je Berater ----------
 *
 * `fuehrungskraft_id` gibt es seit Phase 170, war aber nur per SQL zu setzen.
 * Damit hing die ganze Teamsichtbarkeit an einem Entwickler.
 *
 * Zur Auswahl stehen nur Berater, bei denen kein Kreis entstehen kann: nicht
 * man selbst, und niemand, der bereits unter einem hängt. Die Datenbank prüft
 * dasselbe noch einmal (Trigger `berater_pruefe_fuehrungslinie`) — die Liste
 * hier ist die Bequemlichkeit, der Trigger ist die Zusage.
 */
function untergebene(id, alle) {
  const treffer = new Set();
  let gewachsen = true;
  while (gewachsen) {
    gewachsen = false;
    alle.forEach((k) => {
      if (treffer.has(k.id)) return;
      if (k.fuehrungskraft_id === id || treffer.has(k.fuehrungskraft_id)) {
        treffer.add(k.id);
        gewachsen = true;
      }
    });
  }
  return treffer;
}

function coachAuswahl(b, alle) {
  const gesperrt = untergebene(b.id, alle);
  const waehlbar = alle
    .filter((k) => k.id !== b.id && !gesperrt.has(k.id))
    .sort((x, y) => (x.name || '').localeCompare(y.name || '', 'de'));

  const optionen = waehlbar.map((k) => {
    const zusatz = k.rolle ? ` · ${k.rolle}` : '';
    const inaktiv = k.ist_aktiv ? '' : ' (inaktiv)';
    return `<option value="${escapeAttr(k.id)}"${k.id === b.fuehrungskraft_id ? ' selected' : ''}>${escapeHtml((k.name || 'Ohne Namen') + zusatz + inaktiv)}</option>`;
  }).join('');

  return `<select data-f="fuehrungskraft_id">
    <option value=""${b.fuehrungskraft_id ? '' : ' selected'}>Kein Coach hinterlegt</option>
    ${optionen}
  </select>`;
}

function coachHinweis(b, alle) {
  const eigene = alle.filter((k) => k.fuehrungskraft_id === b.id);
  const teil = eigene.length
    ? `Unter ${b.name?.split(' ')[0] || 'ihm'} hängen: ${eigene.map((k) => k.name).join(', ')}. `
    : '';
  return `${teil}Der Coach entscheidet, wessen Team in der Teamübersicht sichtbar ist. Wer hier steht, sieht diesen Berater und alles darunter.`;
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
        if (f.type === 'checkbox') { data[k] = f.checked; return; }
        let v = (f.value || '').trim();
        data[k] = v || null;
      });

      btn.disabled = true;
      btn.textContent = 'Speichere…';

      const { error } = await updateBerater(id, data);

      if (error) {
        toast('Speichern fehlgeschlagen: ' + (error.message || 'unbekannt'));
        btn.disabled = false;
        btn.textContent = 'Änderungen speichern';
        return;
      }

      toast(`${data.name || 'Berater'} gespeichert.`);
      btn.disabled = false;
      btn.textContent = 'Änderungen speichern';
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
      // Welches Bild gemeint ist, sagt der Knopf selbst. Ohne Angabe bleibt es
      // beim Profilbild, damit der urspruengliche Weg unveraendert funktioniert.
      const ziel = inp.dataset.uploadZiel || 'foto_url';
      const feld = card.querySelector(`[data-f="${ziel}"]`);
      if (feld) feld.value = url;

      if (ziel === 'foto_url') {
        const prev = card.querySelector('[data-preview]');
        const placeholder = card.querySelector('[data-preview-placeholder]');
        const removeBtn = card.querySelector('[data-photo-remove]');
        if (prev) { prev.src = url; prev.hidden = false; }
        if (placeholder) placeholder.hidden = true;
        if (removeBtn) removeBtn.hidden = false;
      } else {
        const prev = card.querySelector(`[data-bild-vorschau="${ziel}"]`);
        const weg = card.querySelector(`[data-bild-weg="${ziel}"]`);
        if (prev) { prev.src = url; prev.hidden = false; }
        if (weg) weg.hidden = false;
      }

      labelEl.textContent = 'Bild ersetzen';
      toast('Bild hochgeladen — jetzt noch „Speichern" klicken.', 3500);
    });
  });

  document.querySelectorAll('[data-bild-weg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ziel = btn.dataset.bildWeg;
      const card = btn.closest('.berater-card');
      const feld = card.querySelector(`[data-f="${ziel}"]`);
      const prev = card.querySelector(`[data-bild-vorschau="${ziel}"]`);
      const label = btn.closest('.berater-bild-zeile')?.querySelector('.cms-upload-label');
      if (feld) feld.value = '';
      if (prev) { prev.hidden = true; prev.removeAttribute('src'); }
      if (label) label.textContent = 'Bild hochladen';
      btn.hidden = true;
      toast('Bild wird beim Speichern aus dem Profil entfernt.', 3500);
    });
  });

  document.querySelectorAll('[data-photo-remove]:not([data-bild-weg])').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Profilbild aus dem Beraterprofil entfernen? Die Datei bleibt im Speicher erhalten.')) return;
      const card = btn.closest('.berater-card');
      const field = card.querySelector('[data-f="foto_url"]');
      const prev = card.querySelector('[data-preview]');
      const placeholder = card.querySelector('[data-preview-placeholder]');
      if (field) field.value = '';
      if (prev) { prev.hidden = true; prev.removeAttribute('src'); }
      if (placeholder) placeholder.hidden = false;
      const uploadLabel = card.querySelector('.cms-upload-label');
      if (uploadLabel) uploadLabel.textContent = 'Bild hochladen';
      btn.hidden = true;
      toast('Bild wird beim Speichern aus dem Profil entfernt.', 3500);
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
    resultEl.hidden = false;
    const copyBtn = resultEl.querySelector('[data-pw-copy]');
    copyBtn?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(pw); copyBtn.textContent = 'Kopiert ✓'; setTimeout(() => { copyBtn.textContent = 'Kopieren'; }, 1600); } catch (_) {}
    });
  }

  // Passwort setzen oder Login anlegen, beides über die offizielle Auth Admin API.
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
        const { data, error } = await createBeraterLogin(id, pw);
        if (error) throw error;
        if (!data?.ok) throw new Error('Unerwartete Antwort vom Login-Dienst.');
        showLoginResult(resultEl, berater, pw, !!data.created);
        inp.value = '';
        toast(data.created ? 'Login angelegt.' : 'Passwort gesetzt.');
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
    if (f.type === 'checkbox') { data[k] = f.checked; return; }
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
