/**
 * Multi-Tenant White-Label · Branding-Anwender (DOM).
 *
 * Setzt bei JEDEM Aufruf ALLE data-bb-Elemente vollständig aus `brandPlan`
 * (Text, href, Bild, Sichtbarkeit) — nichts bleibt vom vorherigen Berater hängen.
 * Sichtbarkeit wird zentral über EINEN Helfer gesteuert. Im neutralen Zustand
 * werden href-Ziele entfernt (keine alten Kai-Links im DOM).
 *
 *   applyBeraterBrand(b) → zeigt Berater b (b darf null sein → neutral)
 *   renderNeutralBrand() → neutraler Zustand (kein Kai), für Laden/Fehler
 */
import { brandPlan, LINK_KEYS } from './berater-brand-core.js';

/** Neutraler Initialen-Avatar (Inline-SVG, kein externer Request). „?" wenn leer. */
function initialsAvatar(name) {
  const initials = (name || '?').trim().split(/\s+/).map((s) => s[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280"><rect width="280" height="280" fill="#C9B98A"/><text x="50%" y="52%" dy=".35em" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="112" fill="#fffcf7">${initials}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** EINZIGE Stelle, die Sichtbarkeit steuert. */
function setShown(el, shown) {
  if (el) el.style.display = shown ? '' : 'none';
}

/** Setzt/entfernt ein href-Ziel (kein altes Ziel bleibt im DOM zurück). */
function setHref(el, href) {
  if (!el) return;
  if (href) el.setAttribute('href', href);
  else el.removeAttribute('href');
}

/**
 * Wendet einen Branding-Zustand an. b = null → neutral.
 */
export function applyBrand(b) {
  const envId = (typeof window !== 'undefined') ? window.ENV_BERATER_ID : null;
  const plan = brandPlan(b || null, envId);

  // Kai-exklusive Inhalte (Leistungszahlen, Bewertungen) — nur beim Standard-Berater.
  document.querySelectorAll('[data-default-berater-only]').forEach((el) => setShown(el, plan.defaultOnly));

  document.querySelectorAll('[data-bb]').forEach((el) => {
    const spec = plan.bb[el.dataset.bb];
    if (!spec) return;

    if ('src' in spec) {
      el.src = spec.src || initialsAvatar(spec.alt || '');
      el.alt = spec.alt || '';
    }
    if ('text' in spec) el.textContent = spec.text;
    if ('href' in spec) setHref(el, spec.href);

    // Sichtbarkeit: Link-Elemente folgen `shown`; Text-/Bild-Elemente bleiben sichtbar
    // (neutral = leerer Text bzw. Platzhalter-Bild).
    if (LINK_KEYS.has(el.dataset.bb)) setShown(el, !!spec.shown);
    else setShown(el, true);
  });

  // Tab-/SEO-Titel nur bei echtem Berater anpassen.
  const name = b && b.name;
  if (name && document.title.includes('·')) {
    document.title = document.title.replace(/·[^·]*$/, `· ${name}`);
  }
}

/** Zeigt Berater b (b darf null sein → neutral). */
export function applyBeraterBrand(b) {
  applyBrand(b || null);
}

/** Neutraler Basiszustand (kein Kai) — für Lade- und Fehlerfall. */
export function renderNeutralBrand() {
  applyBrand(null);
}
