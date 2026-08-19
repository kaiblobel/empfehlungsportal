/**
 * Phase 308 · Die Vorschau zeigt den Berater, der sie öffnet.
 *
 * promoter-vorschau.html ist kein Entwurf. Sie wird aus der Präsentation
 * heraus als Fenster geöffnet (js/programm.js) und zeigt dem Kunden, wie sein
 * Empfehlungsbereich später aussieht. An zwei Stellen stand dort fest
 * „Kai Blobel & Team" — Sven zeigte seinem Kunden also Kais Namen.
 *
 * Den Berater liefert das öffnende Fenster über ?berater=slug mit. Kommt kein
 * Slug an, bleibt die Vorgabe im HTML stehen: dann ist es die Vorschau der
 * Regionaldirektion, und das ist richtig so.
 *
 * Bewusst schlank: Die Seite ist eine Attrappe ohne eigene Logik, sie braucht
 * nur den Namen. Kontaktwege gibt es hier nicht, deshalb auch keinen
 * Ausblend-Zweig wie auf den echten Kundenseiten.
 */
import { getBeraterPublicBySlug } from './supabase.js';
import { applyBeraterBrand } from './berater-brand.js';

const SICHERER_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const roh = String(new URLSearchParams(window.location.search).get('berater') || '')
  .trim().toLowerCase();
const slug = (roh && roh.length <= 80 && SICHERER_SLUG.test(roh)) ? roh : '';

if (slug) {
  getBeraterPublicBySlug(slug)
    .then(({ data }) => { if (data) applyBeraterBrand(data); })
    .catch((err) => console.warn('[promoter-vorschau] Berater nicht ladbar', err));
}
