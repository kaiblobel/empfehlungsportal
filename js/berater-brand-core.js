/**
 * Branding-Plan — REINE Logik (kein DOM).
 *
 * Liefert für JEDES bekannte data-bb-Element einen vollständigen Soll-Zustand
 * (Text / href / Bild / Sichtbarkeit). Der DOM-Anwender setzt bei jedem Aufruf
 * ALLE Felder aus diesem Plan — dadurch bleibt beim Wechsel
 * Berater A → neutral → Berater B nichts von A hängen.
 *
 * b = null  → neutraler Zustand (kein Kai): leere Texte, Platzhalter-Bild,
 *             Kontakte/Rechtslinks ausgeblendet UND href entfernt (keine alten
 *             Ziele im DOM).
 * Kai-exklusive Inhalte (Leistungszahlen, Bewertungen; data-default-berater-only)
 * werden ausschließlich über die eindeutige Berater-ID (envId) freigeschaltet.
 */

// Alle vom Branding gesteuerten data-bb-Schlüssel (der Anwender setzt jeden davon).
export const BB_KEYS = [
  'foto', 'name', 'vorname', 'rolle', 'initialen',
  'booking', 'whatsapp', 'tel', 'tel-text', 'email', 'email-text',
  'impressum', 'datenschutz', 'finanzcheck',
];

// Link-Elemente: sichtbar genau dann, wenn ein href vorhanden ist.
export const LINK_KEYS = new Set([
  'booking', 'whatsapp', 'tel', 'tel-text', 'email', 'email-text',
  'impressum', 'datenschutz', 'finanzcheck',
]);

// Zentrale Konfiguration (eindeutige Ziele des Standard-Tenants Kai),
// NICHT aus einem vorherigen DOM-Link ableiten.
export const KAI_FINANZCHECK_URL = 'https://finanzcheck.kaiblobel.de?from=empfehlung';

function initialsOf(name) {
  return String(name || '').trim().split(/\s+/).map((s) => s[0] || '').join('').slice(0, 2).toUpperCase();
}
function link(href) {
  const h = href || null;
  return { href: h, shown: !!h };
}

/** Nur Ziffern der WhatsApp-Nummer. */
export function normalizeWa(whatsapp) {
  return whatsapp ? String(whatsapp).replace(/[^\d]/g, '') : '';
}

/**
 * Baut den WhatsApp-Link aus der EIGENEN Beraternummer + der vorgesehenen
 * Nachricht. Nummer und Text kommen NIE aus einem alten href.
 */
export function buildWhatsAppHref(whatsapp, text) {
  const num = normalizeWa(whatsapp);
  if (!num) return null;
  const t = (text || '').trim();
  return `https://wa.me/${num}${t ? `?text=${encodeURIComponent(t)}` : ''}`;
}

export function brandPlan(b, envId) {
  const has = !!b;
  const isDefault = has && !!envId && b.id === envId;

  const name = has ? (b.name || '') : '';
  const vorname = name.trim().split(/\s+/)[0] || '';
  const waNum = has ? String(b.whatsapp || '').replace(/[^\d]/g, '') : '';
  const telRaw = has ? String(b.telefon || '').replace(/[^\d+]/g, '') : '';
  const telNum = telRaw ? (telRaw.startsWith('+') ? telRaw : '+' + telRaw.replace(/^0+/, '')) : '';
  const email = has ? (b.email || '') : '';

  const bb = {
    foto: { src: has ? (b.foto_url || null) : null, alt: name },
    name: { text: name },
    vorname: { text: vorname },
    rolle: { text: has ? (b.rolle || '') : '' },
    initialen: { text: initialsOf(name) },

    booking: link(has ? b.bookings_url : ''),
    // Nummer separat mitgeben: der Anwender kombiniert sie mit der vorgesehenen
    // Nachricht (data-wa-text) — der href hier ist die Nummer ohne Text.
    whatsapp: { number: waNum || null, href: waNum ? `https://wa.me/${waNum}` : null, shown: !!waNum },
    tel: link(telNum ? `tel:${telNum}` : ''),
    'tel-text': { ...link(telNum ? `tel:${telNum}` : ''), text: telNum ? (has ? (b.telefon || '') : '') : '' },
    email: link(email ? `mailto:${email}` : ''),
    'email-text': { ...link(email ? `mailto:${email}` : ''), text: email || '' },
    impressum: link(has ? b.impressum_url : ''),
    datenschutz: link(has ? b.datenschutz_url : ''),
    // Standard-Berater: vollständiges Kai-Ziel aus zentraler Konfiguration
    // (nicht aus einem alten DOM-Link). Andere Berater → eigener Bookings-Link,
    // neutral/ohne Bookings → aus + href entfernt.
    finanzcheck: isDefault ? { href: KAI_FINANZCHECK_URL, shown: true } : link(has ? b.bookings_url : ''),
  };

  return { defaultOnly: isDefault, bb };
}
