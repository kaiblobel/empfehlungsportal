/**
 * Einleitung vor der KIDZ-Elternseite.
 *
 * Der Empfohlene soll zuerst sehen, von wem die Empfehlung kommt und wer
 * dahinter steht. Erst danach geht es auf das Konzept selbst. Das Muster ist
 * dasselbe wie beim Finanzierungskompass.
 */
import { getEmpfehlungByToken, getBeraterPublicById } from './supabase.js';
import { applyBeraterBrand } from './berater-brand.js';

const params = new URLSearchParams(window.location.search);
const token = params.get('token')
  || document.querySelector('meta[name="referral-token"]')?.content
  || '';

const ERLAUBTE_QUELLEN = new Set(['elternabend-qr', 'kidz-station', 'berater-einladung', 'sommerfest-danke', 'facebook', 'instagram', 'whatsapp', 'direkt']);
const SICHERER_SLUG = /^[a-z0-9-]+$/;

function initialen(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((teil) => teil[0].toUpperCase())
    .join('') || 'E';
}

function setzeText(id, wert) {
  const feld = document.getElementById(id);
  if (feld && wert) feld.textContent = wert;
}

/** Token, Berater und Herkunft an die Folgeseiten weiterreichen. */
function ergaenzeWege(beraterSlug) {
  const quelleRoh = String(params.get('quelle') || '').trim().toLowerCase();
  const quelle = ERLAUBTE_QUELLEN.has(quelleRoh) ? quelleRoh : 'direkt';
  const berater = String(beraterSlug || params.get('berater') || '').trim().toLowerCase();

  document.querySelectorAll('#introWeiter, #introElternabend').forEach((link) => {
    const ziel = new URL(link.getAttribute('href'), window.location.origin);
    if (token) ziel.searchParams.set('token', token);
    if (berater && berater.length <= 80 && SICHERER_SLUG.test(berater)) ziel.searchParams.set('berater', berater);
    ziel.searchParams.set('quelle', quelle);
    link.href = `${ziel.pathname}${ziel.search}${ziel.hash}`;
  });
}

async function starte() {
  let empfehlung = null;
  if (token) {
    try { empfehlung = (await getEmpfehlungByToken(token))?.data || null; } catch (_) { empfehlung = null; }
  }

  const empfehler = String(empfehlung?.empfehler_name || params.get('von') || 'Jemand aus deinem Umfeld').trim();
  setzeText('refName', empfehler);
  setzeText('introFrom', empfehler);
  const avatar = document.getElementById('refAvatar');
  if (avatar) avatar.textContent = initialen(empfehler);

  const empfaenger = String(empfehlung?.empfaenger_name || params.get('an') || '').trim().split(/\s+/)[0];
  if (empfaenger) {
    const titel = document.getElementById('introTitle');
    if (titel) titel.insertAdjacentHTML('afterbegin', `<em>${empfaenger}. </em>`);
  }

  const nachricht = String(empfehlung?.empfehler_nachricht || '').trim();
  if (nachricht) {
    const feld = document.getElementById('introMessage');
    if (feld) {
      feld.textContent = `„${nachricht}"`;
      feld.hidden = false;
    }
  }

  let beraterSlug = '';
  if (empfehlung?.berater_id) {
    try {
      const berater = (await getBeraterPublicById(empfehlung.berater_id))?.data;
      if (berater) {
        applyBeraterBrand(berater);
        beraterSlug = berater.slug || '';
      }
    } catch (_) { /* Standardangaben bleiben stehen */ }
  }

  ergaenzeWege(beraterSlug);
}

starte();
