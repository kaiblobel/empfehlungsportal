/* ---------- Einheitliche Datenbank-Zeit ---------- */
// PostgreSQL `timestamp without time zone` kommt über Supabase ohne `Z` an.
// Die Werte werden serverseitig in UTC erzeugt. Ohne Kennzeichnung behandelt
// der Browser sie jedoch als Ortszeit und zeigt sie in Deutschland aktuell zwei
// Stunden zu früh an. Echte Zeitzonenwerte (+00:00, Z) bleiben unverändert.
const DB_TIMESTAMP_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

export function parseDbDate(value) {
  if (value instanceof Date || typeof value === 'number') return new Date(value);
  if (typeof value !== 'string') return new Date(value);
  const raw = value.trim();
  const normalized = DB_TIMESTAMP_WITHOUT_ZONE.test(raw)
    ? raw.replace(' ', 'T') + 'Z'
    : raw;
  return new Date(normalized);
}
