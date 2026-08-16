/**
 * Multi-Tenant White-Label · Branding-Helper für Customer-Pages
 *
 * Setzt Foto / Name / Rolle / Booking-Link / WhatsApp / Telefon des jeweiligen
 * Beraters auf der Seite. Elemente werden über das Attribut `data-bb` markiert:
 *
 *   data-bb="foto"      → <img>.src = foto_url, alt = name
 *   data-bb="buerofoto" → <img>.src = buero_foto_url, sonst Portrait als Rückfall
 *   data-bb="teamfoto"  → <img>.src = team_foto_url; ohne Eintrag wird das
 *                         Element (oder sein [data-bb-optional]-Träger) versteckt
 *   data-bb="buerozeile"→ textContent = buero_bildzeile; ohne Eintrag versteckt
 *   data-bb="name"      → textContent = name
 *   data-bb="vorname"   → textContent = erster Namensteil
 *   data-bb="rolle"     → textContent = rolle
 *   data-bb="initialen" → textContent = Initialen aus name (z. B. „SW")
 *   data-bb="booking"   → <a>.href = bookings_url
 *   data-bb="whatsapp"  → <a>.href = https://wa.me/<whatsapp>
 *   data-bb="tel"       → <a>.href = tel:+<telefon>  (+ textContent, wenn vorhanden)
 *   data-bb="email"     → <a>.href = mailto:<email>  (+ textContent, wenn vorhanden)
 *   data-bb="finanzcheck" → Standard-Berater behält den HTML-Link (Kais Finanzcheck),
 *                           andere Berater → eigener Buchungslink (sonst ausgeblendet)
 *   data-bb="title"     → document.title-Suffix „· <name>" wird ersetzt
 *
 * Felder, die im Berater-Datensatz leer sind, werden NICHT überschrieben — so
 * bleiben die statischen HTML-Defaults (Kai) als Fallback erhalten.
 */
/**
 * Zuletzt geladenen Berater merken — pro Schlüssel (Slug, Token oder „me").
 *
 * Ohne das steht beim Laden für einen kurzen Moment das statische Standard-Bild
 * auf der Seite, bis der echte Berater aus dem Netz da ist. Für einen anderen
 * Berater als den Standard heißt das: sein Besucher sieht kurz ein fremdes
 * Gesicht. Mit dem Merker ist beim zweiten Aufruf sofort das richtige da.
 */
const BRAND_CACHE_PREFIX = 'bb_berater_';

export function merkeBerater(key, b) {
  if (!key || !b) return;
  try { localStorage.setItem(BRAND_CACHE_PREFIX + key, JSON.stringify(b)); } catch (_) {}
}

export function gemerkterBerater(key) {
  if (!key) return null;
  try {
    const roh = localStorage.getItem(BRAND_CACHE_PREFIX + key);
    const d = roh ? JSON.parse(roh) : null;
    return (d && d.id) ? d : null;
  } catch (_) { return null; }
}

/** Neutraler Initialen-Avatar (Inline-SVG, kein externer Request) als Foto-Fallback. */
export function initialsAvatar(name) {
  const initials = (name || '?').trim().split(/\s+/).map((s) => s[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280"><rect width="280" height="280" fill="#C9B98A"/><text x="50%" y="52%" dy=".35em" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="112" fill="#fffcf7">${initials}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function applyBeraterBrand(b) {
  if (!b) return;
  const waNum = (b.whatsapp || '').replace(/[^\d]/g, '');
  const telRaw = (b.telefon || '').replace(/[^\d+]/g, '');
  const telNum = telRaw ? (telRaw.startsWith('+') ? telRaw : '+' + telRaw.replace(/^0+/, '')) : '';
  const vorname = (b.name || '').trim().split(/\s+/)[0] || '';
  const envId = (typeof window !== 'undefined') ? window.ENV_BERATER_ID : null;
  const isDefaultBerater = envId ? b.id === envId : b.slug === 'kai-blobel';

  if (!isDefaultBerater) {
    document.querySelectorAll('[data-default-berater-only]').forEach((el) => { el.style.display = 'none'; });
  }

  document.querySelectorAll('[data-bb]').forEach((el) => {
    switch (el.dataset.bb) {
      case 'foto':
        // Eigenes Foto, sonst neutraler Initialen-Avatar — NIE der Kai-Fallback.
        el.src = b.foto_url || initialsAvatar(b.name);
        if (b.name) el.alt = b.name;
        break;
      case 'buerofoto':
        // Bild aus dem eigenen Büro. Wer keins hinterlegt hat, bekommt sein
        // Portrait — nie das Büro eines anderen Beraters.
        el.src = b.buero_foto_url || b.foto_url || initialsAvatar(b.name);
        el.alt = b.name ? `${b.name} im Büro` : '';
        break;
      case 'teamfoto': {
        // Ohne eigenes Teambild bleibt die Karte ohne Bild, statt fremde
        // Räume zu zeigen.
        const traeger = el.closest('[data-bb-optional]') || el;
        if (b.team_foto_url) {
          el.src = b.team_foto_url;
          el.alt = b.name ? `Team von ${b.name}` : '';
          traeger.hidden = false;
        } else {
          traeger.hidden = true;
        }
        break;
      }
      case 'buerozeile':
        // Bildunterschrift zum Bürofoto. Ohne Eintrag verschwindet sie ganz.
        if (b.buero_bildzeile) {
          el.textContent = b.buero_bildzeile;
          el.hidden = false;
        } else {
          el.hidden = true;
        }
        break;
      case 'name':
        if (b.name) el.textContent = b.name;
        break;
      case 'vorname':
        if (vorname) el.textContent = vorname;
        break;
      case 'rolle':
        if (b.rolle) el.textContent = b.rolle;
        break;
      case 'initialen':
        if (b.name) {
          el.textContent = b.name.trim().split(/\s+/).map((s) => s[0] || '').join('').slice(0, 2).toUpperCase();
        }
        break;
      // Kontakt-Buttons: fehlt das Feld beim geladenen Berater, Button AUSBLENDEN
      // statt auf den statischen Fallback (Kai) zeigen zu lassen.
      case 'booking':
        if (b.bookings_url) el.href = b.bookings_url;
        else el.style.display = 'none';
        break;
      case 'whatsapp':
        if (waNum) {
          // Vorausgefüllten ?text=… (z. B. Feedback-Nachricht) beibehalten.
          const qi = el.href.indexOf('?');
          const query = qi >= 0 ? el.href.slice(qi) : '';
          el.href = `https://wa.me/${waNum}${query}`;
        } else el.style.display = 'none';
        break;
      case 'tel':        // nur Link (Button mit eigenem Label)
        if (telNum) el.href = `tel:${telNum}`;
        else el.style.display = 'none';
        break;
      case 'tel-text':   // Link + angezeigte Nummer (z. B. Footer)
        if (telNum) { el.href = `tel:${telNum}`; el.textContent = b.telefon; }
        else el.style.display = 'none';
        break;
      case 'email':
        if (b.email) el.href = `mailto:${b.email}`;
        else el.style.display = 'none';
        break;
      case 'impressum':
        if (b.impressum_url) el.href = b.impressum_url;
        else el.style.display = 'none';
        break;
      case 'datenschutz':
        if (b.datenschutz_url) el.href = b.datenschutz_url;
        else el.style.display = 'none';
        break;
      case 'email-text':
        if (b.email) { el.href = `mailto:${b.email}`; el.textContent = b.email; }
        else el.style.display = 'none';
        break;
      case 'finanzcheck': {
        // Der Finanzcheck-Link gehört dem Standard-Berater (ENV_BERATER_ID = Kai).
        // Für andere Berater → eigener Buchungslink; fehlt der, Button ausblenden.
        if (!isDefaultBerater) {
          if (b.bookings_url) el.href = b.bookings_url;
          else el.style.display = 'none';
        }
        break;
      }
    }
  });

  // Tab-/SEO-Titel: „… · Kai Blobel" → „… · <Berater>"
  if (b.name && document.title.includes('·')) {
    document.title = document.title.replace(/·[^·]*$/, `· ${b.name}`);
  }
}
