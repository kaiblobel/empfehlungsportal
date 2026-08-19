/**
 * Phase 305 · Fußzeilen aus dem Büroprofil
 *
 * Anschrift, Bezeichnung, Rufnummer und E-Mail standen auf den KIDZ-Seiten
 * fest im HTML, viermal dieselbe Angabe. Ein Umzug wären vier Änderungen
 * gewesen, und wer eine vergisst, hat eine falsche Adresse auf einer
 * öffentlichen Seite stehen. Jetzt kommen sie aus der Tabelle `buero`.
 *
 * Bewusst NICHT beraterabhängig: Bei Gewinnspiel und Sommerfest ist es die
 * Veranstalterangabe, und Veranstalter ist die Regionaldirektion. Bei
 * kidz-konzept ist es die Kontaktangabe des Büros. Wer eine Fußzeile pro
 * Berater braucht, nimmt js/berater-brand.js mit data-bb.
 *
 * Elemente werden über `data-bo` markiert:
 *   data-bo="bezeichnung"  → textContent = Name des Büros
 *   data-bo="wortmarke"    → textContent = Wortmarke
 *   data-bo="adresse"      → textContent = Anschrift einzeilig
 *   data-bo="adresse-zeilen" → wie oben, aber „ · " wird zum Zeilenumbruch
 *   data-bo="tel"          → <a>.href = tel:…
 *   data-bo="tel-text"     → <a>.href = tel:… UND lesbare Nummer als Text
 *   data-bo="email"        → <a>.href = mailto:…
 *   data-bo="email-text"   → <a>.href = mailto:… UND Adresse als Text
 *   data-bo="impressum"    → <a>.href
 *   data-bo="datenschutz"  → <a>.href
 *   data-bo="emblem"       → <img>.src
 *
 * Leere Werte überschreiben NICHTS. Antwortet die Datenbank nicht, bleibt der
 * Text stehen, der im HTML steht — eine Fußzeile ohne Anschrift wäre schlimmer
 * als eine, die einen Tag alt ist.
 */
import { getBueroPublic } from './supabase.js';
import { rufnummer, versteckeKontaktwege } from './berater-brand.js';

// Wie beim Berater: der zuletzt bekannte Stand steht sofort, damit die Fußzeile
// beim Laden nicht sichtbar umspringt.
const CACHE_KEY = 'bo_buero_v1';

function gemerktesBuero() {
  try {
    const roh = localStorage.getItem(CACHE_KEY);
    const d = roh ? JSON.parse(roh) : null;
    return (d && d.bezeichnung) ? d : null;
  } catch (_) { return null; }
}

export function applyBueroBrand(o) {
  if (!o) return;
  const tel = rufnummer(o.telefon);

  document.querySelectorAll('[data-bo]').forEach((el) => {
    switch (el.dataset.bo) {
      case 'bezeichnung':
        if (o.bezeichnung) el.textContent = o.bezeichnung;
        break;
      case 'wortmarke':
        if (o.wortmarke) el.textContent = o.wortmarke;
        break;
      case 'adresse':
        if (o.adresse) el.textContent = o.adresse;
        break;
      case 'adresse-zeilen':
        // „An der Wachsbleiche 1a · 03046 Cottbus" wird zweizeilig. Aufgebaut
        // aus Textknoten, nicht aus innerHTML: der Wert kommt zwar aus der
        // eigenen Datenbank, aber Markup hat in einer Anschrift nichts zu suchen.
        if (o.adresse) {
          el.textContent = '';
          o.adresse.split('·').map((s) => s.trim()).filter(Boolean).forEach((teil, i) => {
            if (i > 0) el.appendChild(document.createElement('br'));
            el.appendChild(document.createTextNode(teil));
          });
        }
        break;
      case 'tel':
        if (tel.e164) el.href = `tel:${tel.e164}`;
        break;
      case 'tel-text':
        if (tel.e164) { el.href = `tel:${tel.e164}`; el.textContent = tel.anzeige; }
        break;
      case 'email':
        if (o.email) el.href = `mailto:${o.email}`;
        break;
      case 'email-text':
        if (o.email) { el.href = `mailto:${o.email}`; el.textContent = o.email; }
        break;
      case 'impressum':
        if (o.impressum_url) el.href = o.impressum_url;
        break;
      case 'datenschutz':
        if (o.datenschutz_url) el.href = o.datenschutz_url;
        break;
      case 'emblem':
        if (o.emblem_url) el.src = o.emblem_url;
        break;
    }
  });
}

/** Fußzeile füllen: erst aus dem Merker, dann mit dem frischen Stand. */
export async function ladeBueroBrand() {
  applyBueroBrand(gemerktesBuero());
  const { data } = await getBueroPublic();
  if (!data) return null;
  applyBueroBrand(data);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
  return data;
}

// Selbststartend, aber nur wo es etwas zu füllen gibt: Seiten, die das Modul
// bloß für zeigeBueroStattBerater() importieren, sollen keine überflüssige
// Abfrage auslösen.
if (document.querySelector('[data-bo]')) ladeBueroBrand();

/**
 * Phase 310 · Unbekannter Berater: die Regionaldirektion tritt an seine Stelle.
 *
 * Wurde ein Kürzel oder ein Empfehlungs-Token mitgegeben und ließ sich daraus
 * kein Berater auflösen (Tippfehler, gelöschter Zugang, inaktiv gesetzt), dann
 * wollte der Besucher ausdrücklich zu jemandem. Was er NICHT bekommen darf,
 * ist stillschweigend eine andere Person: In den Seiten stehen Name und
 * Porträt der Regionaldirektion als Vorgabe, und die blieben sonst einfach
 * stehen. Auf baufi.html war das sogar ausdrücklich so gebaut („damit die
 * Portraits nicht leer bleiben").
 *
 * Phase 300 hat das für Kontaktwege gelöst. Diese Funktion zieht die übrigen
 * personenbezogenen Angaben nach:
 *   Kontaktwege  → weg (versteckeKontaktwege)
 *   Porträt      → weg, ein fremdes Gesicht ist schlimmer als keins
 *   Name         → Bezeichnung des Büros
 *   Vorname      → „dein Ansprechpartner", damit Sätze wie
 *                  „… empfiehlt dir <Vorname> persönlich" lesbar bleiben
 *   Rolle        → weg, sie gehört zu einer Person
 *
 * Ohne Kürzel in der Adresse wird sie NICHT aufgerufen: Dann ist es die Seite
 * der Regionaldirektion, und die Vorgaben sind richtig.
 */
export async function zeigeBueroStattBerater() {
  versteckeKontaktwege();

  document.querySelectorAll('[data-bb="foto"]').forEach((el) => {
    el.removeAttribute('src');
    el.style.display = 'none';
  });
  document.querySelectorAll('[data-bb="rolle"], [data-bb="initialen"]').forEach((el) => {
    el.style.display = 'none';
  });

  const { data } = await getBueroPublic();
  const bezeichnung = data?.bezeichnung;
  if (bezeichnung) {
    document.querySelectorAll('[data-bb="name"]').forEach((el) => { el.textContent = bezeichnung; });
  }
  document.querySelectorAll('[data-bb="vorname"]').forEach((el) => {
    el.textContent = 'dein Ansprechpartner';
  });

  // Die Bezeichnung zurückgeben, damit Aufrufer sie weiterverwenden können.
  // themen-vorschau.js baut Teile der Seite später neu auf und hätte sonst
  // wieder seinen eigenen Rückfall auf den Standard-Berater.
  return bezeichnung || null;
}
