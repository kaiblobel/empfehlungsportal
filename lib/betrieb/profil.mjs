// ADR-0063, Portalprofil. Kundenangebote sind eigene Betriebsbereiche.
export const ANWENDUNG = 'empfehlung';
export const HOST = 'empfehlungsportal.vercel.app';
export const STEUERUNG = '/api/betrieb/steuerung';
export const ZUGANG = '/api/betrieb/zugang';
export const PRUEFPFAD = '/hub.html';
export const PARTNER = new Set([
  '/hub.html', '/team.html', '/berater.html', '/praemien.html', '/vorlagen.html',
  '/programm-verwalten.html', '/changelog.html',
]);
// Login, Registrierung und Einstellungen bleiben erreichbar.
export const FREI = ['/dashboard/index.html', '/dashboard/welcome.html', '/dashboard/settings.html'];
export function portalPfad(pfad) {
  let p;
  try {
    p = pfad;
    for (let i = 0; i < 3 && p.includes('%'); i++) p = decodeURIComponent(p);
    p = new URL('https://profil.invalid' + p.replace(/\\/g, '/').replace(/\/+/g, '/')).pathname;
  } catch { return pfad.startsWith('/dashboard/'); }
  if (p.endsWith('/')) p += 'index.html';
  if (!p.split('/').at(-1).includes('.')) p += '.html';
  return PARTNER.has(p) || (p.startsWith('/dashboard/') && !FREI.includes(p));
}
export const STANDARD = {
  ueberschrift: 'Wir arbeiten gerade am Partnerbereich.',
  beschreibung: 'Bitte versuche es später noch einmal. Deine öffentlichen Empfehlungsseiten bleiben erreichbar.',
  zusatz: '',
};
