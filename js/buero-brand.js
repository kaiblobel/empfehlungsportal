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
import { rufnummer } from './berater-brand.js';

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

// Selbststartend: die Seiten binden das Modul nur ein, mehr nicht.
ladeBueroBrand();
