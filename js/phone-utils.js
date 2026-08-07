/**
 * Einheitliche Telefonnummern für Beraterprofile.
 * Telefon wird als E.164 mit Plus gespeichert, WhatsApp als dieselbe Nummer ohne Plus.
 */
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;
const ALLOWED_PHONE_INPUT = /^[\d\s()+./-]+$/;

export function normalizePhoneE164(value, defaultCountryCode = '49') {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!ALLOWED_PHONE_INPUT.test(raw)) return null;

  const compact = raw.replace(/[\s()./-]/g, '');
  if ((compact.match(/\+/g) || []).length > 1 || (compact.includes('+') && !compact.startsWith('+'))) return null;

  let digits = compact.replace(/\D/g, '');
  let international = compact.startsWith('+');

  if (!international && digits.startsWith('00')) {
    digits = digits.slice(2);
    international = true;
  }

  if (!international) {
    if (digits.startsWith(defaultCountryCode)) {
      international = true;
    } else if (digits.startsWith('0')) {
      digits = defaultCountryCode + digits.slice(1);
      international = true;
    } else {
      digits = defaultCountryCode + digits;
      international = true;
    }
  }

  // Bei deutschen Nummern darf nach +49 keine nationale Null stehen.
  if (digits.startsWith(defaultCountryCode + '0')) {
    digits = defaultCountryCode + digits.slice(defaultCountryCode.length + 1);
  }

  if (!international || digits.startsWith('0') || digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  return `+${digits}`;
}

export function normalizeWhatsAppNumber(value, fallbackPhone = '') {
  const source = String(value ?? '').trim() || String(fallbackPhone ?? '').trim();
  if (!source) return '';
  const e164 = normalizePhoneE164(source);
  return e164 === null ? null : e164.slice(1);
}
