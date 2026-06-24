/**
 * Phase 16 · Beleg/Quittung für eine ausgezahlte Empfehlungsprämie.
 * Liest ?id=<praemie>, baut ein druckbares Dokument (adaptiv nach Auszahlungsart).
 */
import { getPraemie } from './supabase.js';
import { requireAuth, getCurrentBerater } from './dashboard.js';

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const GELD_ARTEN = ['Überweisung', 'PayPal', 'Bar', 'Gutschein'];

(async () => {
  const session = await requireAuth();
  if (!session) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { fail('Kein Beleg angegeben.'); return; }

  const [{ data: p, error }, berater] = await Promise.all([getPraemie(id), getCurrentBerater()]);
  if (error || !p) { fail('Beleg nicht gefunden.'); return; }

  render(p, berater);
})();

function docType(art) {
  if (art === 'Sachleistung') return { title: 'Empfangsbestätigung',
    intro: 'Hiermit wird die Übergabe der unten genannten Sachprämie im Rahmen des Empfehlungsprogramms bestätigt.' };
  if (art === 'Spende') return { title: 'Spendenbeleg',
    intro: 'Hiermit wird die Spende im Rahmen des Empfehlungsprogramms im Namen des Empfehlers bestätigt.' };
  return { title: 'Quittung',
    intro: 'Hiermit wird die Auszahlung der unten genannten Empfehlungsprämie bestätigt.' };
}

function render(p, berater) {
  const art = p.auszahlungsart || '';
  const t = docType(art);
  const empfName = p.empfehler?.name || 'Empfehler';
  const dateObj = p.ausgezahlt_at ? new Date(p.ausgezahlt_at) : new Date();
  const dateDE = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  const isSache = art === 'Sachleistung';
  const betragStr = (p.betrag != null) ? EUR.format(p.betrag) : (p.wert_label || '–');

  document.getElementById('docMark').textContent = initials(berater?.name);
  document.getElementById('docTitle').textContent = t.title;
  document.getElementById('docNr').textContent = p.beleg_nr || '–';
  document.getElementById('docDate').textContent = dateDE;
  document.getElementById('docIntro').textContent = t.intro;

  // Aussteller
  document.getElementById('docAussteller').innerHTML = lines([
    `<strong>${esc(berater?.name || 'Kai Blobel')}</strong>`,
    berater?.rolle ? cls(berater.rolle) : '',
    cls('Deutsche Vermögensberatung'),
    berater?.email ? cls(berater.email) : '',
    berater?.telefon ? cls(berater.telefon) : '',
  ]);

  // Empfänger
  const adrLines = (p.empfaenger_adresse || '').split('\n').map(s => s.trim()).filter(Boolean);
  document.getElementById('docEmpfaenger').innerHTML = lines([
    `<strong>${esc(empfName)}</strong>`,
    ...adrLines.map(cls),
  ]);

  // Tabelle
  const rows = [
    ['Anlass', `Empfehlungsprämie · ${p.stufe}. erfolgreiche Empfehlung`],
    ['Prämie', esc(p.titel) + (p.variante ? ` <span style="color:#6B6660">(${esc(p.variante)})</span>` : '')],
  ];
  if (art) rows.push(['Auszahlungsart', esc(art)]);
  if (p.notiz) rows.push(['Notiz', esc(p.notiz)]);
  const totalLabel = isSache ? 'Warenwert' : 'Betrag';
  document.getElementById('docRows').innerHTML =
    rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('') +
    `<tr class="total"><td>${totalLabel}</td><td>${esc(betragStr)}</td></tr>`;

  // Signaturen
  document.getElementById('docSignEmpf').textContent =
    isSache ? 'Empfänger · bestätigt den Erhalt der Sachprämie' : 'Empfänger · bestätigt den Erhalt';
  document.getElementById('docSignAus').textContent = 'Aussteller · Datum, Unterschrift';

  // Fußzeile
  document.getElementById('docFoot').innerHTML =
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} über das Empfehlungs-Portal · dokumentiert die Prämienauszahlung im Rahmen des Empfehlungsprogramms.<br>` +
    `<strong>${esc(berater?.name || 'Kai Blobel')} · ${esc(berater?.rolle || 'Regionaldirektion')} · Deutsche Vermögensberatung</strong>`;

  // Dateiname für „Als PDF speichern" vorbelegen
  const fnDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  document.title = `${fnDate} ${empfName} Empfehlungspraemie Beleg ${p.beleg_nr || ''}`.trim();
}

function fail(msg) {
  document.getElementById('doc').innerHTML = `<p style="padding:40px;text-align:center;color:#6B6660;">${esc(msg)}</p>`;
}
function lines(arr) { return arr.filter(Boolean).map(l => `<div>${l}</div>`).join(''); }
function cls(s) { return `<span class="line">${esc(s)}</span>`; }
function initials(name) { return (name || 'KB').split(/\s+/).map(s => s[0] || '').join('').slice(0, 2).toUpperCase(); }
function pad(n) { return String(n).padStart(2, '0'); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
