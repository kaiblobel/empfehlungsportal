/**
 * Multi-Tenant White-Label · Branding-Helper für Customer-Pages
 *
 * Setzt Foto / Name / Rolle / Booking-Link / WhatsApp / Telefon des jeweiligen
 * Beraters auf der Seite. Elemente werden über das Attribut `data-bb` markiert:
 *
 *   data-bb="foto"      → <img>.src = foto_url, alt = name
 *   data-bb="name"      → textContent = name
 *   data-bb="vorname"   → textContent = erster Namensteil
 *   data-bb="rolle"     → textContent = rolle
 *   data-bb="booking"   → <a>.href = bookings_url
 *   data-bb="whatsapp"  → <a>.href = https://wa.me/<whatsapp>
 *   data-bb="tel"       → <a>.href = tel:+<telefon>
 *
 * Felder, die im Berater-Datensatz leer sind, werden NICHT überschrieben — so
 * bleiben die statischen HTML-Defaults (Kai) als Fallback erhalten.
 */
export function applyBeraterBrand(b) {
  if (!b) return;
  const waNum = (b.whatsapp || '').replace(/[^\d]/g, '');
  const telRaw = (b.telefon || '').replace(/[^\d+]/g, '');
  const telNum = telRaw ? (telRaw.startsWith('+') ? telRaw : '+' + telRaw.replace(/^0+/, '')) : '';
  const vorname = (b.name || '').trim().split(/\s+/)[0] || '';

  document.querySelectorAll('[data-bb]').forEach((el) => {
    switch (el.dataset.bb) {
      case 'foto':
        if (b.foto_url) el.src = b.foto_url;
        if (b.name) el.alt = b.name;
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
      // Kontakt-Buttons: fehlt das Feld beim geladenen Berater, Button AUSBLENDEN
      // statt auf den statischen Fallback (Kai) zeigen zu lassen.
      case 'booking':
        if (b.bookings_url) el.href = b.bookings_url;
        else el.style.display = 'none';
        break;
      case 'whatsapp':
        if (waNum) el.href = `https://wa.me/${waNum}`;
        else el.style.display = 'none';
        break;
      case 'tel':
        if (telNum) el.href = `tel:${telNum}`;
        else el.style.display = 'none';
        break;
    }
  });
}
