import {
  requireAuth,
  logout,
  loadDetail,
  updateStatus,
  formatDate,
  statusLabel,
  whatsappLink,
  toast,
} from './dashboard.js';
import { supabase, deleteEmpfehlung } from './supabase.js';

const ERR_LABELS = {
  vormittag: 'Vormittag (8 bis 12 Uhr)',
  mittag: 'Mittag (12 bis 14 Uhr)',
  nachmittag: 'Nachmittag (14 bis 18 Uhr)',
  abend: 'Abend (18 bis 21 Uhr)',
  we: 'Am Wochenende',
  egal: 'Zeitlich flexibel',
};

const KANAL_LABELS = {
  anruf: 'Telefon',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'E-Mail',
  egal: 'Kanal flexibel',
};

const THEMA_LABELS = {
  allgemein: 'Allgemeine Beratung',
  baufi: 'Baufinanzierung',
  foerderungen: 'Staatliche Förderungen',
  selbstaendige: 'Selbständige',
  investment: 'Geldanlage & Investment',
  absicherung: 'Absicherung & Familie',
  karriere: 'Berufliche Perspektive',
  kinder: 'Für deine Kinder',
};

const STATUS_OPTIONS = ['offen', 'anrufwunsch', 'kontaktiert', 'kunde', 'kein_interesse'];

async function fetchEmpfehlerScore(empfehlerId) {
  if (!empfehlerId) return null;
  try {
    const { data, error } = await supabase.rpc('empfehler_score', { p_empfehler_id: empfehlerId });
    if (error) return null;
    return data?.[0] || null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

function statusClass(status) {
  return ['kunde', 'anrufwunsch', 'kontaktiert', 'interessiert', 'kein_interesse'].includes(status)
    ? status
    : 'offen';
}

function statusPill(status) {
  return `<span class="ed-status ${statusClass(status)}" id="statusPill"><i></i>${escapeHtml(statusLabel(status || 'offen'))}</span>`;
}

function topicLabel(slug) {
  return THEMA_LABELS[slug] || slug || 'Allgemeine Beratung';
}

function scoreLabel(score) {
  if (!score || !Number(score.gesamt)) return 'Noch ohne weitere Empfehlungen';
  const total = Number(score.gesamt) || 0;
  const customers = Number(score.kunden) || 0;
  const conversion = Number(score.conversion_pct) || 0;
  return `${total} Empfehlung${total === 1 ? '' : 'en'} · ${customers} Kunde${customers === 1 ? '' : 'n'} · ${conversion} % Quote`;
}

function phoneHref(phone) {
  const clean = String(phone || '').replace(/(?!^\+)\D/g, '');
  return clean ? `tel:${clean}` : '';
}

/* Leads aus den Funnel-Seiten (Phase 270). Sie kommen ohne Promoter und
   haben oft nur eine E-Mail statt einer Telefonnummer. */
const QUELLEN_NAMEN = {
  'av-depot-check': 'Altersvorsorgedepot-Check',
  'depot-check': 'Depot-Krisencheck',
  'restschuldcheck': 'Restschuld-Check',
  'vermoegensstrategie-check': 'Vermögensstrategie-Check',
  'finanzcheck': 'Finanzcheck',
  'reform2027': 'reform2027',
};

function quelleLabel(quelle) {
  if (!quelle) return '';
  return QUELLEN_NAMEN[quelle] || quelle;
}

function summaryCard(icon, value, label, hint) {
  return `
    <article class="ed-summary-card">
      <div class="ed-summary-top"><span class="ed-summary-icon">${icon}</span><small>${escapeHtml(hint)}</small></div>
      <strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>`;
}

function contactCard(icon, label, value) {
  return `
    <div class="ed-contact">
      <span class="ed-contact-icon">${icon}</span>
      <div><label>${escapeHtml(label)}</label><span>${escapeHtml(value || 'Nicht angegeben')}</span></div>
    </div>`;
}

function eventRow(icon, title, copy, time, variant = '') {
  return `
    <div class="ed-event">
      <span class="ed-event-dot ${variant}">${icon}</span>
      <div class="ed-event-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(copy)}</span></div>
      <time>${escapeHtml(time)}</time>
    </div>`;
}

function timeline(record) {
  const rows = [eventRow('01', 'Empfehlung erstellt', `Über ${record.empfehler_name || 'Promoter'} · ${topicLabel(record.vorlage_slug)}`, formatDate(record.created_at))];

  if (record.link_geoeffnet) {
    rows.push(eventRow('02', 'Link geöffnet', `${Number(record.link_klicks) || 1} Klick${Number(record.link_klicks) === 1 ? '' : 's'} insgesamt`, formatDate(record.link_geoeffnet_at), 'open'));
  }
  if (record.interessiert) {
    rows.push(eventRow('03', 'Interesse bekundet', `Interesse an ${topicLabel(record.vorlage_slug)}`, formatDate(record.interessiert_at), 'open'));
  }
  if (record.anrufwunsch) {
    rows.push(eventRow('04', 'Rückruf gewünscht', record.anrufwunsch, formatDate(record.anrufwunsch_at), 'open'));
  }

  const terminal = {
    kontaktiert: ['OK', 'Kontakt aufgenommen', 'Der Kontakt wurde als bearbeitet festgehalten.'],
    kunde: ['OK', 'Kunde gewonnen', 'Die Empfehlung wurde erfolgreich zum Kunden.'],
    kein_interesse: ['EN', 'Kein Interesse', 'Die Empfehlung wurde sauber abgeschlossen.'],
  }[record.status];
  if (terminal) rows.push(eventRow(terminal[0], terminal[1], terminal[2], 'Aktueller Stand'));

  return rows.join('');
}

function nextStep(status, record) {
  const topic = topicLabel(record.vorlage_slug);
  const steps = {
    anrufwunsch: {
      title: 'Jetzt persönlich melden',
      copy: record.anrufwunsch ? `Gewünschte Erreichbarkeit: ${record.anrufwunsch}.` : 'Der Kontakt wartet auf deinen Rückruf.',
    },
    kontaktiert: {
      title: 'Ergebnis festhalten',
      copy: 'Notiere kurz den Gesprächsstand und lege den nächsten Status fest.',
    },
    kunde: {
      title: 'Beziehung weiterführen',
      copy: 'Die Empfehlung ist Kunde. Halte nur noch relevante Notizen fest.',
    },
    kein_interesse: {
      title: 'Sauber abgeschlossen',
      copy: 'Aktuell ist keine weitere Aktion erforderlich.',
    },
    offen: {
      title: record.interessiert ? 'Interesse persönlich aufnehmen' : 'Kontakt vorbereiten',
      copy: record.interessiert ? `Es besteht Interesse am Thema ${topic}.` : 'Prüfe Kontext und bevorzugten Kontaktweg, bevor du dich meldest.',
    },
  };
  return steps[status] || steps.offen;
}

function updateWorkingState(status, record) {
  const pill = document.getElementById('statusPill');
  if (pill) {
    pill.className = `ed-status ${statusClass(status)}`;
    pill.innerHTML = `<i></i>${escapeHtml(statusLabel(status))}`;
  }
  const workState = document.getElementById('workState');
  if (workState) workState.textContent = statusLabel(status);
  const step = nextStep(status, record);
  const title = document.getElementById('nextTitle');
  const copy = document.getElementById('nextCopy');
  if (title) title.textContent = step.title;
  if (copy) copy.textContent = step.copy;
}

function statusSelect(current) {
  return STATUS_OPTIONS.map(status => `<option value="${status}"${status === current ? ' selected' : ''}>${escapeHtml(statusLabel(status))}</option>`).join('');
}

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('backBtn').addEventListener('click', () => {
  if (document.referrer && document.referrer.includes('/dashboard/')) {
    history.back();
  } else {
    window.location.href = 'empfehlungen.html';
  }
});

const id = new URLSearchParams(window.location.search).get('id');
const content = document.getElementById('content');

if (!id) content.innerHTML = '<div class="empty-state">Keine Empfehlung ausgewählt.</div>';

(async () => {
  const session = await requireAuth();
  if (!session || !id) return;

  const record = await loadDetail(id);
  if (!record) {
    content.innerHTML = '<div class="empty-state">Empfehlung nicht gefunden.</div>';
    return;
  }

  const recipientLink = record.link_token
    ? `${window.location.origin}/empfaenger.html?token=${record.link_token}`
    : '';
  const score = await fetchEmpfehlerScore(record.empfehler_id);
  const phone = record.empfaenger_telefon || '';
  const mail = record.empfaenger_email || '';
  const istLead = record.typ === 'funnel' || Boolean(record.quelle);
  const quelle = quelleLabel(record.quelle);
  const channel = KANAL_LABELS[record.bevorzugter_kanal] || record.bevorzugter_kanal || 'Nicht angegeben';
  const reachability = ERR_LABELS[record.beste_erreichbarkeit] || record.beste_erreichbarkeit || 'Nicht angegeben';
  const topic = topicLabel(record.vorlage_slug);
  const currentStatus = STATUS_OPTIONS.includes(record.status) ? record.status : 'offen';
  const step = nextStep(currentStatus, record);

  const contextCards = [
    record.empfaenger_kontext ? `<div class="ed-context"><label>Persönlicher Kontext</label><p>${escapeHtml(record.empfaenger_kontext)}</p></div>` : '',
    record.empfehler_nachricht ? `<div class="ed-context neutral"><label>Nachricht des Promoters</label><p>${escapeHtml(record.empfehler_nachricht)}</p></div>` : '',
  ].filter(Boolean).join('');

  content.innerHTML = `
    <section class="ed-hero">
      <div class="ed-person">
        <span class="ed-initial">${escapeHtml(initials(record.empfaenger_name))}</span>
        <div class="ed-person-copy">
          <div class="ed-eyebrow">${istLead ? 'Lead' : 'Empfehlung'} · ${escapeHtml(topic)}</div>
          <h1>${escapeHtml(record.empfaenger_name || 'Unbekannter Kontakt')}</h1>
          <div class="ed-hero-meta">
            <span>${escapeHtml(formatDate(record.created_at))}</span>
            <span>·</span>
            <span>${istLead
              ? `über ${escapeHtml(quelle || 'einen Funnel')}`
              : `über ${escapeHtml(record.empfehler_name || 'unbekannt')}`}</span>
            ${statusPill(currentStatus)}
          </div>
        </div>
      </div>
      <div class="ed-hero-actions">
        <button class="ed-action warm" id="copyBtn" type="button"${recipientLink ? '' : ' hidden'}>Link kopieren</button>
        <a class="ed-action" id="callBtn"${phone ? ` href="${escapeHtml(phoneHref(phone))}"` : ' hidden'}>Anrufen</a>
        <a class="ed-action primary" id="waBtn" target="_blank" rel="noopener"${phone ? ` href="${escapeHtml(whatsappLink(phone))}"` : ' hidden'}>Per WhatsApp schreiben</a>
        <a class="ed-action" id="mailBtn"${mail ? ` href="mailto:${escapeHtml(mail)}"` : ' hidden'}>E-Mail schreiben</a>
      </div>
    </section>

    <section class="ed-summary" aria-label="Kontakt auf einen Blick">
      ${summaryCard('TEL', phone || 'Nicht angegeben', 'Telefonnummer', phone ? 'direkt erreichbar' : 'noch ergänzen')}
      ${mail ? summaryCard('MAIL', mail, 'E-Mail', 'aus dem Funnel') : ''}
      ${summaryCard('KAN', channel, 'Bevorzugter Kanal', record.bevorzugter_kanal ? 'vom Kontakt gewählt' : 'noch offen')}
      ${summaryCard('ZEIT', reachability, 'Beste Erreichbarkeit', record.beste_erreichbarkeit ? 'Wunschzeit' : 'noch offen')}
      ${summaryCard('LINK', record.link_geoeffnet ? 'Geöffnet' : 'Ungeöffnet', 'Empfehlungslink', `${Number(record.link_klicks) || 0} Klick${Number(record.link_klicks) === 1 ? '' : 's'}`)}
    </section>

    <div class="ed-layout">
      <div class="ed-left">
        <section class="ed-panel ed-panel-pad">
          <h2>Kontakt und Empfehlung</h2>
          <div class="ed-contact-grid">
            ${contactCard('THE', 'Thema', topic)}
            ${contactCard('TYP', 'Art', istLead ? 'Lead aus einem Funnel' : (record.typ === 'info' ? 'Info-Variante' : 'Direkt-Empfehlung'))}
            ${istLead
              ? contactCard('QUE', 'Herkunft', quelle || 'Unbekannter Funnel')
              : contactCard('PRO', 'Promoter', record.empfehler_name || 'Nicht angegeben')}
            ${contactCard('ERG', 'Promoter-Erfolg', scoreLabel(score))}
            ${contactCard('VER', 'Verbindung', record.empfaenger_verbindung || 'Nicht angegeben')}
            ${contactCard('BER', 'Beruf', record.empfaenger_beruf || 'Nicht angegeben')}
          </div>
          ${record.empfehler_vorinformiert ? '<div class="ed-confidence"><i>✓</i>Der Promoter hat den Kontakt vorab informiert.</div>' : ''}
          ${contextCards ? `<div class="ed-context-grid">${contextCards}</div>` : ''}
        </section>

        <section class="ed-panel">
          <div class="ed-panel-head"><h2>Verlauf</h2><span>${Number(record.link_klicks) || 0} Link-Klick${Number(record.link_klicks) === 1 ? '' : 's'}</span></div>
          <div class="ed-timeline">${timeline(record)}</div>
        </section>

        <section class="ed-panel">
          <div class="ed-panel-head"><h2>Weitere Angaben</h2><span>vollständiger Datensatz</span></div>
          <div class="ed-facts">
            <div class="ed-fact"><label>Interesse</label><span>${record.interessiert ? `Ja · ${escapeHtml(formatDate(record.interessiert_at))}` : 'Noch nicht bekundet'}</span></div>
            <div class="ed-fact"><label>Anrufwunsch</label><span>${record.anrufwunsch ? `${escapeHtml(record.anrufwunsch)} · ${escapeHtml(formatDate(record.anrufwunsch_at))}` : 'Nicht vorhanden'}</span></div>
            <div class="ed-fact"><label>Ausgetragen</label><span>${record.ausgetragen ? `Ja · ${escapeHtml(formatDate(record.ausgetragen_at))}` : 'Nein'}</span></div>
            <div class="ed-fact"><label>Link-ID</label><span>${record.link_token ? 'Aktiv' : 'Nicht vorhanden'}</span></div>
          </div>
          <button class="ed-more" id="moreBtn" type="button">Verwaltung anzeigen</button>
          <div class="ed-danger" id="danger" hidden>
            <button id="deleteBtn" type="button">Diese Empfehlung löschen</button>
            <p>Unwiderruflich. Nur für Testdaten oder Duplikate verwenden.</p>
          </div>
        </section>
      </div>

      <aside class="ed-right">
        <section class="ed-panel ed-panel-pad">
          <div class="ed-work-title"><h2>Bearbeiten</h2><span class="ed-work-state" id="workState">${escapeHtml(statusLabel(currentStatus))}</span></div>
          <div class="ed-next">
            <label>Nächster sinnvoller Schritt</label>
            <strong id="nextTitle">${escapeHtml(step.title)}</strong>
            <p id="nextCopy">${escapeHtml(step.copy)}</p>
          </div>
          <div class="ed-field">
            <label for="statusSel">Status</label>
            <select id="statusSel">${statusSelect(currentStatus)}</select>
          </div>
          <div class="ed-field">
            <label for="notizArea">Gesprächsnotiz</label>
            <textarea id="notizArea" placeholder="Kontext, Gesprächsergebnis oder Folgetermin">${escapeHtml(record.notiz || '')}</textarea>
          </div>
          <div class="ed-work-actions">
            <button class="ed-action primary" id="saveBtn" type="button">Änderungen speichern</button>
            <div class="ed-secondary-actions">
              <a class="ed-action" target="_blank" rel="noopener"${phone ? ` href="${escapeHtml(whatsappLink(phone))}"` : ' hidden'}>WhatsApp</a>
              <button class="ed-action" id="copyWorkBtn" type="button"${recipientLink ? '' : ' hidden'}>Link kopieren</button>
            </div>
          </div>
          <p class="ed-save-note">Status und Notiz werden gemeinsam gespeichert.</p>
        </section>
      </aside>
    </div>`;

  const copyLink = async () => {
    if (!recipientLink) return;
    try {
      await navigator.clipboard.writeText(recipientLink);
      toast('Empfänger-Link kopiert.');
    } catch {
      toast('Kopieren fehlgeschlagen.', 3000);
    }
  };

  document.getElementById('copyBtn')?.addEventListener('click', copyLink);
  document.getElementById('copyWorkBtn')?.addEventListener('click', copyLink);

  document.getElementById('statusSel')?.addEventListener('change', event => {
    updateWorkingState(event.target.value, record);
  });

  document.getElementById('saveBtn')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const status = document.getElementById('statusSel').value;
    const notiz = document.getElementById('notizArea').value;
    button.disabled = true;
    button.textContent = 'Speichert ...';
    const { error } = await updateStatus(id, status, notiz);
    button.disabled = false;
    button.textContent = 'Änderungen speichern';
    if (error) {
      toast(`Speichern fehlgeschlagen: ${error.message || ''}`, 3500);
      return;
    }
    record.status = status;
    record.notiz = notiz;
    updateWorkingState(status, record);
    toast('Änderungen gespeichert.');
  });

  const moreBtn = document.getElementById('moreBtn');
  const danger = document.getElementById('danger');
  moreBtn?.addEventListener('click', () => {
    const willOpen = danger.hasAttribute('hidden');
    danger.toggleAttribute('hidden', !willOpen);
    moreBtn.textContent = willOpen ? 'Verwaltung ausblenden' : 'Verwaltung anzeigen';
  });

  document.getElementById('deleteBtn')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const name = record.empfaenger_name || 'diese Empfehlung';
    if (!confirm(`Wirklich "${name}" unwiderruflich löschen?\n\nDas kann nicht rückgängig gemacht werden.`)) return;
    button.disabled = true;
    button.textContent = 'Löscht ...';
    const { error } = await deleteEmpfehlung(id);
    if (error) {
      toast(`Löschen fehlgeschlagen: ${error.message || ''}`, 4000);
      button.disabled = false;
      button.textContent = 'Diese Empfehlung löschen';
      return;
    }
    toast('Empfehlung gelöscht.');
    setTimeout(() => { window.location.href = 'empfehlungen.html'; }, 800);
  });
})();
