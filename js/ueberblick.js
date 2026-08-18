/**
 * Überblicksseite „Das ganze Bild" (ueberblick.html)
 *
 * Die Fassung des Überblicks, die der Empfohlene allein liest. In der
 * Präsentation steht derselbe Inhalt knapp, weil der Berater dazu spricht.
 *
 * Aufgaben:
 *   1. den richtigen Berater auflösen (Empfehlung, Adresse, eigene Anmeldung)
 *   2. das Empfehlungsband füllen, wenn ein Token vorliegt
 *   3. die drei Wege am Ende scharf schalten, Anrufwunsch inklusive
 *   4. die kleinen Interaktionen der Seite (Menü, Rechner, Stufen)
 *
 * Das Muster ist dasselbe wie bei js/kidz-empfehlung-intro.js.
 */

import { applyBeraterBrand, merkeBerater, gemerkterBerater } from './berater-brand.js';
import {
  supabase,
  getEmpfehlungByToken,
  getBeraterPublicById,
  getBeraterPublicBySlug,
  markAnrufwunsch,
} from './supabase.js';

const params = new URLSearchParams(window.location.search);

// Bei den Kurzadressen steht der Token nicht in der Adresse, sondern wird von
// api/share.js als Meta-Angabe in die Seite geschrieben.
const token = params.get('token')
  || document.querySelector('meta[name="referral-token"]')?.content
  || '';

const SICHERER_SLUG = /^[a-z0-9-]+$/;
const ERLAUBTE_QUELLEN = new Set([
  'praesentation', 'aufsteller', 'direkt', 'portal',
  'whatsapp', 'facebook', 'instagram', 'berater-einladung',
]);

/**
 * Der Berater aus der Adresse, wenn er unverdächtig aussieht.
 *
 * Zwei Formen, beide müssen gelesen werden:
 *   /ueberblick.html?berater=slug   → steht in der Abfrage
 *   /ueberblick/slug                → steht im Pfad
 *
 * Die kurze Form leitet Vercel serverseitig um. Die Adresszeile im Browser
 * behält dabei den Pfad, in der Abfrage steht also nichts. Wer nur dort
 * nachsieht, findet den Berater nie und zeigt still den Standard-Berater.
 * Dasselbe Muster wie in js/baufi.js und js/promoter-start.js.
 */
function slugAusAdresse() {
  const ausPfad = window.location.pathname.match(/^\/ueberblick\/([a-z0-9-]+)\/?$/i);
  const roh = String(params.get('berater') || (ausPfad ? ausPfad[1] : '')).trim().toLowerCase();
  return (roh && roh.length <= 80 && SICHERER_SLUG.test(roh)) ? roh : '';
}

const slugParam = slugAusAdresse();

// Vor dem Netz das, was beim letzten Mal hier stand. Ohne diesen Merker sieht
// der Besucher eines Partners für einen Moment das Gesicht des Standard-
// Beraters, bis die Antwort aus der Datenbank da ist.
const brandKey = slugParam || (token ? `tok_${token}` : 'me');
const sofortBerater = gemerkterBerater(brandKey);
if (sofortBerater) {
  applyBeraterBrand(sofortBerater);
  setzeKopfbild(sofortBerater);
}

/**
 * Oben links steht das Porträt des Beraters. Wer keins hinterlegt hat, bekäme
 * von applyBeraterBrand ein Initialen-Kürzel. An dieser Stelle steht statt
 * dessen die Team-Marke: sie sagt mehr als zwei Buchstaben und ist für jeden
 * im Team richtig. Läuft nach dem Branding, weil es dessen Vorgabe ersetzt.
 */
function setzeKopfbild(b) {
  const bild = document.querySelector('.brand-logo');
  if (!bild || !b) return;
  if (b.foto_url) {
    bild.src = b.foto_url;
    bild.alt = b.name || '';
    bild.classList.remove('ist-marke');
  } else {
    bild.src = '/assets/images/team-wachsbleiche-marke-96.webp';
    bild.alt = 'Team Wachsbleiche';
    bild.classList.add('ist-marke');
  }
}

/**
 * Token, Berater und Herkunft an die weiterführenden Links hängen.
 *
 * Ohne das geht der Berater beim Seitenwechsel verloren: Wer die Seite von
 * Sven bekommen hat und auf den Finanzcheck klickt, landet sonst in Kais
 * Strecke. Derselbe Fehler wie in Phase 192.
 */
function ergaenzeWege(beraterSlug) {
  const quelleRoh = String(params.get('quelle') || '').trim().toLowerCase();
  const quelle = ERLAUBTE_QUELLEN.has(quelleRoh) ? quelleRoh : 'direkt';
  // slugParam statt params.get: der Berater kann auch im Pfad stehen.
  const berater = String(beraterSlug || slugParam || '').trim().toLowerCase();

  document.querySelectorAll('#ubFinanzcheck, #ubAustragen').forEach((link) => {
    const roh = link.getAttribute('href');
    if (!roh) return;
    const ziel = new URL(roh, window.location.origin);
    if (token) ziel.searchParams.set('token', token);
    if (berater && berater.length <= 80 && SICHERER_SLUG.test(berater)) {
      ziel.searchParams.set('berater', berater);
    }
    ziel.searchParams.set('quelle', quelle);
    // Fremde Ziele behalten ihren vollen Adressteil, eigene bleiben relativ.
    link.href = ziel.origin === window.location.origin
      ? `${ziel.pathname}${ziel.search}${ziel.hash}`
      : ziel.toString();
  });
}

/** Das Band oben: wer diese Seite weitergegeben hat. */
function zeigeEmpfehlungsband(empfehlung) {
  const name = String(empfehlung?.empfehler_name || params.get('von') || '').trim();
  if (!name) return;
  const band = document.getElementById('ubBand');
  const feld = document.getElementById('ubBandName');
  const marke = document.getElementById('ubBandMark');
  if (!band || !feld) return;
  feld.textContent = name;
  if (marke) marke.textContent = name.charAt(0).toUpperCase();
  band.hidden = false;
}

/**
 * Ohne Token kann der Austragen-Weg nichts eintragen. Dann verschwindet die
 * Zeile und es erscheint stattdessen der Hinweis auf eine kurze Mail. Eine
 * Zeile, die ein Austragen verspricht und nichts tut, wäre schlimmer als keine.
 */
function richteOptoutEin() {
  const mitToken = document.getElementById('ubOptoutZeile');
  const ohneToken = document.getElementById('ubOptoutOhneToken');
  if (!mitToken || !ohneToken) return;
  mitToken.hidden = !token;
  ohneToken.hidden = !!token;
}

/* ---------- Der Anrufwunsch ---------- */

function richteAnrufwunschEin(empfehlung) {
  const knopf = document.getElementById('ubAnrufSubmit');
  const bestaetigt = document.getElementById('ubAnrufConfirm');
  const feld = document.getElementById('ubSlot');
  const fenster = [...document.querySelectorAll('.ub-zf')];
  if (!knopf || !bestaetigt || !feld) return;

  fenster.forEach((zf) => {
    zf.addEventListener('click', () => {
      feld.value = zf.dataset.value;
      fenster.forEach((k) => k.classList.toggle('is-gewaehlt', k === zf));
    });
  });

  const zeigeBestaetigung = (slot) => {
    bestaetigt.hidden = false;
    bestaetigt.textContent = `Notiert. Der Anruf kommt: ${slot}.`;
    knopf.disabled = true;
    knopf.textContent = 'Ist notiert';
    fenster.forEach((k) => { k.disabled = true; });
  };

  // Wer schon einmal eine Zeit gewählt hat, sieht das beim nächsten Aufruf.
  if (empfehlung?.anrufwunsch) {
    zeigeBestaetigung(empfehlung.anrufwunsch);
    return;
  }

  knopf.addEventListener('click', async () => {
    const slot = feld.value;
    if (!slot) return;

    // Ohne Token gibt es keine Empfehlung, an der der Wunsch hängen könnte.
    // Dann NICHT still bestätigen: Sonst liest der Empfänger „Notiert", und
    // es ruft nie jemand an. Derselbe Schutz wie in js/app.js.
    if (!token) {
      bestaetigt.hidden = false;
      bestaetigt.textContent = 'Dieser Link ist unvollständig, deshalb lässt sich '
        + 'die Zeit hier nicht hinterlegen. Am schnellsten geht es über die '
        + 'Terminwahl daneben.';
      return;
    }

    knopf.disabled = true;
    knopf.textContent = 'Wird notiert…';

    const { error } = await markAnrufwunsch(token, slot);
    if (error) {
      knopf.disabled = false;
      knopf.textContent = 'Anrufzeit bestätigen';
      bestaetigt.hidden = false;
      bestaetigt.textContent = 'Das hat gerade nicht geklappt. Bitte noch einmal '
        + 'versuchen oder die Terminwahl daneben nehmen.';
      return;
    }

    zeigeBestaetigung(slot);
  });
}

/* ---------- Die kleinen Interaktionen ---------- */

function richteBedienungEin() {
  const header = document.querySelector('[data-header]');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    }, { passive: true });
  }

  const menuKnopf = document.getElementById('menuKnopf');
  const menu = document.getElementById('mobileMenu');
  if (menuKnopf && menu) {
    menuKnopf.addEventListener('click', () => {
      const offen = menu.hasAttribute('hidden');
      if (offen) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
      menuKnopf.setAttribute('aria-expanded', String(offen));
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        menu.setAttribute('hidden', '');
        menuKnopf.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('[data-springe]').forEach((knopf) => {
    knopf.addEventListener('click', () => {
      document.querySelector(knopf.dataset.springe)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  richteRechnerEin();
  richteStufenEin();
}

/**
 * Teil 02 · Die Formel in Euro.
 * Rechnet 30/30/30/10 vom eingegebenen Netto. Läuft ausschließlich im Browser,
 * es wird nichts gesendet und nichts gespeichert. So steht es auch auf der Seite.
 */
function richteRechnerEin() {
  const netto = document.getElementById('ubNetto');
  const out = document.getElementById('ubRechnerOut');
  if (!netto || !out) return;

  const ANTEILE = { wohnen: 0.30, alltag: 0.30, vermoegen: 0.30, schutz: 0.10 };
  const euro = new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  });

  const rechne = () => {
    // Punkt und Leerzeichen als Tausendertrennung, Komma als Dezimalzeichen.
    const wert = parseFloat(netto.value.replace(/[.\s]/g, '').replace(',', '.'));
    const gueltig = isFinite(wert) && wert > 0 && wert < 1000000;
    out.querySelectorAll('li').forEach((li) => {
      const b = li.querySelector('b');
      if (!b) return;
      b.textContent = gueltig ? euro.format(Math.round(wert * ANTEILE[li.dataset.teil])) : '–';
    });
  };

  netto.addEventListener('input', rechne);
  rechne();
}

/** Teil 04 · Die drei Stufen der Pyramide. */
const STUFEN = {
  basis: {
    titel: 'Risikovorsorge',
    text: 'Ganz unten steht, was alles andere trägt: die Absicherung der Arbeitskraft, '
      + 'Gesundheit und eine Rücklage für den kaputten Kühlschrank. Fällt hier etwas aus, '
      + 'muss alles darüber angetastet werden. Genau deshalb liegt es unten.',
  },
  mitte: {
    titel: 'Langfristiges Sparen',
    text: 'Darüber liegt, was Jahrzehnte Zeit hat: die Rente und, wenn es passt, das eigene '
      + 'Zuhause. Hier zählt nicht die Rendite eines Jahres, sondern dass überhaupt etwas '
      + 'läuft und dass es nicht bei der ersten Delle angehalten wird.',
  },
  spitze: {
    titel: 'Privater Vermögensaufbau',
    text: 'Erst ganz oben kommt das, worüber alle reden: Depot, Einzelwerte, Beteiligungen. '
      + 'Das ist der spannende Teil, aber eben auch der, der eine Grundlage braucht. '
      + 'Wer hier anfängt und unten nichts stehen hat, verkauft im falschen Moment.',
  },
};

function richteStufenEin() {
  const knoepfe = [...document.querySelectorAll('.ub-stufe')];
  const titel = document.getElementById('ubStufeTitel');
  const text = document.getElementById('ubStufeText');
  if (!knoepfe.length || !titel || !text) return;

  const setze = (schluessel) => {
    const daten = STUFEN[schluessel];
    if (!daten) return;
    titel.textContent = daten.titel;
    text.textContent = daten.text;
    knoepfe.forEach((k) => {
      const aktiv = k.dataset.stufe === schluessel;
      k.classList.toggle('is-active', aktiv);
      k.setAttribute('aria-selected', String(aktiv));
    });
  };

  knoepfe.forEach((knopf, i) => {
    knopf.addEventListener('click', () => setze(knopf.dataset.stufe));
    knopf.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const schritt = e.key === 'ArrowRight' ? 1 : -1;
      const naechster = knoepfe[(i + schritt + knoepfe.length) % knoepfe.length];
      naechster.focus();
      setze(naechster.dataset.stufe);
    });
  });
}

/* ---------- Start ---------- */

async function starte() {
  richteBedienungEin();
  richteOptoutEin();

  let empfehlung = null;
  if (token) {
    try { empfehlung = (await getEmpfehlungByToken(token))?.data || null; } catch (_) { empfehlung = null; }
  }
  zeigeEmpfehlungsband(empfehlung);
  richteAnrufwunschEin(empfehlung);

  // Wer hier steht, hängt vom Weg ab, auf dem die Seite geöffnet wurde:
  //   1. echte Empfehlung (Token)   → der Berater hinter der Empfehlung
  //   2. eigener Link / QR (?berater=…) → der Berater aus der Adresse
  //   3. Vorschau aus dem eigenen Portal → der angemeldete Berater
  // Ohne den dritten Weg sieht ein Partner in der Vorschau seiner eigenen
  // Seite den Standard-Berater. Genau das war der Fehler in Phase 272 und 275.
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
    setzeKopfbild(berater);
    merkeBerater(brandKey, berater);
    beraterSlug = berater.slug || '';
  }

  ergaenzeWege(beraterSlug);
}

starte();
