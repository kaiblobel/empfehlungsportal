/** Gemeinsame Kleinigkeiten für die Vorschau. */

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const initialen = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2)
  .map((w) => w[0]).join('').toUpperCase();
