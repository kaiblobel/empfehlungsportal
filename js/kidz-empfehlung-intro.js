/**
 * Einleitung vor der KIDZ-Elternseite.
 *
 * Der Empfohlene soll zuerst sehen, von wem die Empfehlung kommt und wer
 * dahinter steht. Erst danach geht es auf das Konzept selbst. Das Muster ist
 * dasselbe wie beim Finanzierungskompass.
 */
import { supabase, getEmpfehlungByToken, getBeraterPublicById, getBeraterPublicBySlug } from './supabase.js';
import { applyBeraterBrand, merkeBerater, gemerkterBerater } from './berater-brand.js';
import { zeigeBueroStattBerater } from './buero-brand.js';

const params = new URLSearchParams(window.location.search);
const token = params.get('token')
  || document.querySelector('meta[name="referral-token"]')?.content
  || '';

const ERLAUBTE_QUELLEN = new Set(['elternabend-qr', 'kidz-station', 'berater-einladung', 'sommerfest-danke', 'facebook', 'instagram', 'whatsapp', 'direkt']);
const SICHERER_SLUG = /^[a-z0-9-]+$/;

/** ?berater=slug aus der Adresse, wenn er unverdächtig aussieht. */
function slugAusAdresse() {
  const roh = String(params.get('berater') || '').trim().toLowerCase();
  return (roh && roh.length <= 80 && SICHERER_SLUG.test(roh)) ? roh : '';
}

const slugParam = slugAusAdresse();

// Gemerktes Branding aus einem früheren Aufruf steht sofort da. Ohne das
// blitzt beim Laden das Standard-Portrait auf, bis der echte Berater aus dem
// Netz kommt — der Empfohlene sähe kurz ein fremdes Gesicht.
const brandKey = slugParam || (token ? `tok_${token}` : 'me');
const sofortBerater = gemerkterBerater(brandKey);
if (sofortBerater) applyBeraterBrand(sofortBerater);

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

  document.querySelectorAll('#introWeiter, #introElternabend, .intro-pillar').forEach((link) => {
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

  // Wer hier steht, hängt vom Weg ab, auf dem die Seite geöffnet wurde:
  //   1. echte Empfehlung (Token)   → der Berater hinter der Empfehlung
  //   2. Vorschau/QR (?berater=…)   → der Berater aus der Adresse
  //   3. aus dem eigenen Dashboard  → der eingeloggte Berater
  // Ohne diese drei Wege blieb das statische Kai-Portrait aus dem HTML stehen,
  // und in der Präsentation sah jeder Partner das Gesicht von Kai.
  let berater = null;
  if (empfehlung?.berater_id) {
    try { berater = (await getBeraterPublicById(empfehlung.berater_id))?.data || null; } catch (_) { berater = null; }
  } else if (slugParam) {
    try { berater = (await getBeraterPublicBySlug(slugParam))?.data || null; } catch (_) { berater = null; }
  }

  if (!berater) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const m = await import('./dashboard.js');
        berater = await m.getCurrentBerater();
      }
    } catch (_) { /* Standardangaben bleiben stehen */ }
  }

  let beraterSlug = '';
  if (berater) {
    applyBeraterBrand(berater);
    merkeBerater(brandKey, berater);
    beraterSlug = berater.slug || '';
  } else if (slugParam || token) {
    // Es stand jemand in der Adresse, nur ließ er sich nicht auflösen. Dann
    // darf nicht das Porträt und der Name aus dem HTML stehen bleiben: Die
    // Regionaldirektion tritt an seine Stelle (Phase 310).
    await zeigeBueroStattBerater();
  }

  ergaenzeWege(beraterSlug);
}

// Drehkarte: Vorderseite Portraet, Rueckseite ein paar Saetze zur Person.
const flip = document.getElementById('personFlip');
if (flip) {
  flip.querySelectorAll('[data-flip]').forEach((knopf) => {
    knopf.addEventListener('click', () => {
      const gedreht = flip.classList.toggle('gedreht');
      flip.querySelector('.intro-person-back')?.setAttribute('aria-hidden', gedreht ? 'false' : 'true');
      flip.querySelector('.intro-person-front')?.setAttribute('aria-hidden', gedreht ? 'true' : 'false');
    });
  });
  flip.querySelector('.intro-person-back')?.setAttribute('aria-hidden', 'true');
}

starte();
