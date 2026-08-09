/** Reine Hilfsfunktionen für das Potenzialbuch. Ohne Browser und Datenbank testbar. */

export function cleanPotentialText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function normalizePotentialText(value) {
  return String(value || '').trim().toLocaleLowerCase('de-DE');
}

export function potentialInitials(name) {
  return cleanPotentialText(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

export function potentialPhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `49${digits.slice(1)}`;
  return digits;
}

export function formatPotentialPhone(value) {
  const raw = cleanPotentialText(value);
  if (!raw) return '';
  const digits = potentialPhoneDigits(raw);
  if (!digits.startsWith('49')) return raw;
  const national = digits.slice(2);
  if (!national) return '+49';
  const prefixLength = national.length > 6 ? 3 : Math.min(3, national.length);
  return `+49 ${national.slice(0, prefixLength)} ${national.slice(prefixLength)}`.trim();
}

export function findPotentialDuplicate(items, payload, currentId = '') {
  const phone = potentialPhoneDigits(payload.telefon);
  const email = normalizePotentialText(payload.email);
  const name = normalizePotentialText(payload.name);
  const circle = normalizePotentialText(payload.kreis);
  return (items || []).find((item) => {
    if (item.id === currentId) return false;
    if (phone && phone === potentialPhoneDigits(item.telefon)) return true;
    if (email && email === normalizePotentialText(item.email)) return true;
    return !phone && !email && name === normalizePotentialText(item.name) && circle === normalizePotentialText(item.kreis);
  }) || null;
}

export function parsePotentialDate(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

export function potentialStartOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function potentialDueState(value, now = new Date()) {
  const date = parsePotentialDate(value);
  if (!date) return { kind: '', icon: '○', label: 'Noch kein nächster Kontakt geplant' };
  const today = potentialStartOfDay(now);
  const difference = Math.round((date - today) / 86400000);
  const formatted = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
  if (difference < 0) return { kind: 'overdue', icon: '!', label: `Nachfassen war am ${formatted} geplant` };
  if (difference === 0) return { kind: 'due', icon: '•', label: 'Heute nachfassen' };
  if (difference === 1) return { kind: 'due', icon: '•', label: 'Morgen nachfassen' };
  return { kind: difference <= 7 ? 'due' : '', icon: '○', label: `Nächster Kontakt am ${formatted}` };
}
