/**
 * Zentrale Berater-Ermittlung — REINE Logik (kein Netz, kein DOM).
 *
 * Feste Präzedenz (White-Label-Baustein):
 *   1. ausdrücklicher Code/Token aus der URL   (?token= / ?code= / ?empfehler=)
 *   2. ausdrücklicher Berater-Slug aus der URL (?berater=slug)
 *   3. eingeloggter Berater                    (Session)
 *   4. nur ohne URL-Parameter UND ohne Login:
 *        - Legacy-Seiten (/programm, /empfehlen) → Weiterleitung auf ?berater=kai-blobel
 *        - Strikte Seiten (/empfaenger, /baufi, /danke, /austragen) → Fehlerzustand
 *        - sonst: eindeutig zugehöriger gespeicherter Code, sonst neutral
 *
 * Gespeicherte Browserdaten überschreiben NIE einen ausdrücklichen URL-Parameter
 * (URL wird immer zuerst geprüft) und mischen auf Legacy-Seiten nichts hinein.
 * Kein allgemeiner Kai-Fallback — die Legacy-Regel ist eng und benannt.
 */

export const KAI_SLUG = 'kai-blobel';

// Legacy-Regel: NUR diese exakten Root-Pfade gehören dem Standard-Tenant Kai.
// Bewusst als volle Pfade (nicht nur Dateiname) — /irgendwo/programm ist KEIN Legacy-Pfad.
export const LEGACY_KAI_PATHS = new Set([
  '/programm', '/programm.html', '/empfehlen', '/empfehlen.html',
]);

// Seiten, die zwingend Token/Code/durchgereichten Berater brauchen. Fehlt er →
// Fehlerzustand, NIEMALS Kai. Match über den Dateinamen (überall gültig, sichere Richtung).
export const STRICT_FILES = new Set([
  'empfaenger.html', 'baufi.html', 'danke.html', 'austragen.html',
]);

function clean(v) {
  const s = (v == null ? '' : String(v)).trim();
  return s || null;
}

// Vollen Pfad normalisieren: klein, ohne abschließenden Slash.
export function normalizePath(pathname) {
  let p = String(pathname || '').toLowerCase().replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

// Reiner Dateiname (mit .html-Ergänzung), für die Strikt-Erkennung.
function fileOf(normPath) {
  let file = normPath.slice(normPath.lastIndexOf('/') + 1);
  if (file && !file.endsWith('.html')) file += '.html';
  return file;
}

/**
 * Entscheidet, WIE der Berater ermittelt wird — ohne IO.
 * @returns {{by:'token'|'code'|'slug'|'session'|'redirect'|'error'|'neutral', value?:string, redirectSlug?:string, source:string}}
 */
export function planResolution({ pathname, search = '', hash = '', hasSession = false, storedCode = null }) {
  const params = new URLSearchParams(search || '');
  const token = clean(params.get('token'));
  const code = clean(params.get('code')) || clean(params.get('empfehler'));
  const slug = clean(params.get('berater'));

  // 1. Code/Token aus der URL — gewinnt eindeutig.
  if (token) return { by: 'token', value: token, source: 'url-token' };
  if (code) return { by: 'code', value: code, source: 'url-code' };
  // 2. Berater-Slug aus der URL.
  if (slug) return { by: 'slug', value: slug, source: 'url-slug' };
  // 3. Eingeloggter Berater.
  if (hasSession) return { by: 'session', source: 'session' };

  // 4. Ohne URL-Parameter UND ohne Login:
  const norm = normalizePath(pathname);
  if (LEGACY_KAI_PATHS.has(norm)) {
    // Enge, dokumentierte Legacy-Regel — NUR diese exakten Root-Pfade.
    return { by: 'redirect', redirectSlug: KAI_SLUG, source: 'legacy' };
  }
  if (STRICT_FILES.has(fileOf(norm))) {
    return { by: 'error', source: 'strict-no-context' };
  }
  // Sonstige Seiten: gespeicherter Code nur hier (nie auf Legacy/Strikt).
  if (storedCode) return { by: 'code', value: storedCode, source: 'stored-code' };
  return { by: 'neutral', source: 'none' };
}

/**
 * Baut die Legacy-Weiterleitungs-URL: setzt ?berater=kai-blobel und ERHÄLT
 * alle bestehenden Query-Parameter und die Sprungmarke (#hash).
 * Nach der Weiterleitung ist ?berater= gesetzt → planResolution nimmt Stufe 2
 * → keine Weiterleitungsschleife.
 */
export function buildLegacyRedirectUrl(pathname, search = '', hash = '') {
  const params = new URLSearchParams(search || '');
  params.set('berater', KAI_SLUG);
  const qs = params.toString();
  return `${pathname}${qs ? '?' + qs : ''}${hash || ''}`;
}
