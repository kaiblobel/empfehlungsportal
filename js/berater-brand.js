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
import { brandPlan, LINK_KEYS, buildWhatsAppHref } from './berater-brand-core.js';

// Ursprünglicher Seitentitel (einmalig), damit Berater→neutral keinen alten Namen behält.
let baseTitle = null;
function applyTitle(name) {
  if (typeof document === 'undefined') return;
  if (baseTitle === null) baseTitle = document.title;
  if (!baseTitle.includes('·')) return;
  document.title = name
    ? baseTitle.replace(/·[^·]*$/, `· ${name}`)
    : baseTitle.replace(/\s*·[^·]*$/, ''); // neutral: Namen entfernen
}

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
    const key = el.dataset.bb;
    const spec = plan.bb[key];
    if (!spec) return;

    if ('src' in spec) {
      el.src = spec.src || initialsAvatar(spec.alt || '');
      el.alt = spec.alt || '';
    }
    if ('text' in spec) el.textContent = spec.text;

    if (key === 'whatsapp') {
      // href IMMER aus der eigenen Nummer + vorgesehener Nachricht (data-wa-text)
      // neu bauen — nie aus einem alten href. Kein Text im DOM → nur die Nummer.
      const href = spec.number ? buildWhatsAppHref(spec.number, el.dataset.waText || '') : null;
      setHref(el, href);
      setShown(el, !!spec.number);
      return;
    }

    if ('href' in spec) setHref(el, spec.href);
    // Sichtbarkeit: Link-Elemente folgen `shown`; Text-/Bild-Elemente bleiben sichtbar
    // (neutral = leerer Text bzw. Platzhalter-Bild).
    setShown(el, LINK_KEYS.has(key) ? !!spec.shown : true);
  });

  applyTitle(b && b.name ? b.name : null);
}

/** Zeigt Berater b (b darf null sein → neutral). */
export function applyBeraterBrand(b) {
  applyBrand(b || null);
}

/** Neutraler Basiszustand (kein Kai) — für Lade- und Fehlerfall. */
export function renderNeutralBrand() {
  applyBrand(null);
}
