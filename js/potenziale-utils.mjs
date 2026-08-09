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

export const POTENTIAL_CIRCLES = Object.freeze([
  ['familie', 'Familie'],
  ['enger_freundeskreis', 'Enger Freundeskreis'],
  ['freunde', 'Freunde'],
  ['schulzeit', 'Schulzeit'],
  ['ausbildung_studium', 'Ausbildung / Studium'],
  ['arbeit_aktuell', 'Aktuelle Arbeit'],
  ['arbeit_frueher', 'Frühere Arbeit'],
  ['nachbarschaft', 'Nachbarschaft'],
  ['verein_hobby', 'Verein / Hobby'],
  ['alltag', 'Alltag'],
  ['fluechtige_bekanntschaft', 'Flüchtige Bekanntschaft'],
  ['sonstiges', 'Sonstiges'],
]);

export const POTENTIAL_STRENGTHS = Object.freeze({
  kalt: { label: 'Kalt', icon: 'snowflake', rank: 1 },
  lauwarm: { label: 'Lauwarm', icon: 'cloud-sun', rank: 2 },
  warm: { label: 'Warm', icon: 'sun', rank: 3 },
  heiss: { label: 'Heiß', icon: 'flame', rank: 4 },
  sehr_heiss: { label: 'Sehr heiß', icon: 'flame-spark', rank: 5 },
});

const CIRCLE_LABELS = Object.fromEntries(POTENTIAL_CIRCLES);
const VALID_CIRCLES = new Set(POTENTIAL_CIRCLES.map(([key]) => key));
const VALID_STRENGTHS = new Set(Object.keys(POTENTIAL_STRENGTHS));

function legacyCircleKey(value) {
  const circle = normalizePotentialText(value);
  if (!circle) return '';
  if (circle.includes('famil')) return 'familie';
  if (circle.includes('freund')) return circle.includes('eng') ? 'enger_freundeskreis' : 'freunde';
  if (circle.includes('schul')) return 'schulzeit';
  if (circle.includes('ausbild') || circle.includes('stud')) return 'ausbildung_studium';
  if (circle.includes('früh') || circle.includes('frueh') || circle.includes('ehemalig')) return 'arbeit_frueher';
  if (circle.includes('kolleg') || circle.includes('arbeit')) return 'arbeit_aktuell';
  if (circle.includes('nachbar')) return 'nachbarschaft';
  if (circle.includes('verein') || circle.includes('sport') || circle.includes('hobby')) return 'verein_hobby';
  if (circle.includes('tank') || circle.includes('alltag')) return 'alltag';
  if (circle.includes('flücht') || circle.includes('fluecht') || circle.includes('bekannt')) return 'fluechtige_bekanntschaft';
  return '';
}

export function potentialCircleKeys(item = {}) {
  const keys = Array.isArray(item.kreise) ? item.kreise.filter((key) => VALID_CIRCLES.has(key)) : [];
  const legacy = legacyCircleKey(item.kreis);
  if (legacy) keys.push(legacy);
  return [...new Set(keys)];
}

export function potentialCircleLabels(item = {}) {
  const labels = potentialCircleKeys(item).map((key) => CIRCLE_LABELS[key]);
  const custom = cleanPotentialText(item.kreis);
  if (custom && !legacyCircleKey(custom)) labels.push(custom);
  return [...new Set(labels)];
}

export function potentialContactStrength(item = {}) {
  const override = VALID_STRENGTHS.has(item.kontaktstaerke_override) ? item.kontaktstaerke_override : '';
  const circles = potentialCircleKeys(item);
  const hasContactPath = Boolean(item.direkt_erreichbar || potentialPhoneDigits(item.telefon) || cleanPotentialText(item.email));
  const circleWeights = {
    familie: 4,
    enger_freundeskreis: 5,
    freunde: 3,
    schulzeit: 1,
    ausbildung_studium: 1,
    arbeit_aktuell: 2,
    arbeit_frueher: 1,
    nachbarschaft: 2,
    verein_hobby: 2,
    alltag: 1,
    fluechtige_bekanntschaft: 0,
    sonstiges: 1,
  };
  const relationWeights = { fluechtig: 0, bekannt: 1, gut_bekannt: 4, eng_vertraut: 6 };
  const frequencyWeights = { kein_kontakt: 0, selten: 1, gelegentlich: 3, regelmaessig: 5 };
  const circleScore = circles.reduce((sum, key) => sum + (circleWeights[key] || 0), 0);
  const overlapBonus = Math.min(3, Math.max(0, circles.length - 1));
  const score = circleScore
    + overlapBonus
    + (relationWeights[item.beziehungsnaehe] || 0)
    + (frequencyWeights[item.kontakthaeufigkeit] || 0)
    + (hasContactPath ? 3 : 0);

  let key = 'kalt';
  if (hasContactPath) {
    if (score >= 16) key = 'sehr_heiss';
    else if (score >= 12) key = 'heiss';
    else if (score >= 8) key = 'warm';
    else if (score >= 4) key = 'lauwarm';
  }
  if (hasContactPath && item.kontakthaeufigkeit === 'regelmaessig'
    && (circles.includes('familie') || circles.includes('enger_freundeskreis'))) key = 'sehr_heiss';
  if (circles.includes('fluechtige_bekanntschaft') && item.beziehungsnaehe === 'fluechtig'
    && ['kein_kontakt', 'selten', undefined, null, ''].includes(item.kontakthaeufigkeit)) key = 'kalt';
  if (override) key = override;

  const reasons = [];
  if (!hasContactPath) reasons.push('kein direkter Kontaktweg');
  if (item.beziehungsnaehe === 'eng_vertraut') reasons.push('eng vertraut');
  else if (item.beziehungsnaehe === 'gut_bekannt') reasons.push('gut bekannt');
  if (item.kontakthaeufigkeit === 'regelmaessig') reasons.push('regelmäßiger Kontakt');
  else if (item.kontakthaeufigkeit === 'gelegentlich') reasons.push('gelegentlicher Kontakt');
  if (circles.length > 1) reasons.push(`${circles.length} gemeinsame Kreise`);
  if (hasContactPath && !reasons.length) reasons.push('direkt erreichbar');
  if (!reasons.length) reasons.push('noch wenige Angaben');

  return {
    key,
    score,
    label: POTENTIAL_STRENGTHS[key].label,
    icon: POTENTIAL_STRENGTHS[key].icon,
    overridden: Boolean(override),
    reason: `${override ? 'Manuell eingestuft' : reasons.slice(0, 3).join(' · ')}`,
  };
}

export function findPotentialDuplicate(items, payload, currentId = '') {
  const phone = potentialPhoneDigits(payload.telefon);
  const email = normalizePotentialText(payload.email);
  const name = normalizePotentialText(payload.name);
  const circles = new Set([...potentialCircleKeys(payload), normalizePotentialText(payload.kreis)].filter(Boolean));
  return (items || []).find((item) => {
    if (item.id === currentId) return false;
    if (phone && phone === potentialPhoneDigits(item.telefon)) return true;
    if (email && email === normalizePotentialText(item.email)) return true;
    if (phone || email || name !== normalizePotentialText(item.name)) return false;
    const itemCircles = [...potentialCircleKeys(item), normalizePotentialText(item.kreis)].filter(Boolean);
    if (!circles.size && !itemCircles.length) return true;
    return itemCircles.some((circle) => circles.has(circle));
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
