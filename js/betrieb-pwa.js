// Oeffentliches Pfadprofil fuer den klassischen Service Worker.
// tests/betrieb-pwa.test.mjs prueft Gleichheit mit dem Serverprofil.
self.betriebPartnerPfad = function (pfad) {
  var p;
  try {
    p = pfad;
    for (var i = 0; i < 3 && p.includes('%'); i++) p = decodeURIComponent(p);
    p = new URL('https://profil.invalid' + p.replace(/\\/g, '/').replace(/\/+/g, '/')).pathname;
  } catch (_) { return pfad.startsWith('/dashboard/'); }
  if (p.endsWith('/')) p += 'index.html';
  if (!p.split('/').pop().includes('.')) p += '.html';
  return ['/hub.html', '/team.html', '/berater.html', '/praemien.html', '/vorlagen.html', '/programm-verwalten.html', '/changelog.html'].includes(p) ||
    (p.startsWith('/dashboard/') && !['/dashboard/index.html', '/dashboard/welcome.html', '/dashboard/settings.html'].includes(p));
};
