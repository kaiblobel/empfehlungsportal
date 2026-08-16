/* ============================================================
   Wartungsschalter · Phase 250
   ------------------------------------------------------------
   Legt einen Wartungsschirm über den Beraterbereich, sobald in der
   Tabelle `portal_wartung` das Feld `aktiv` auf true steht. Umgelegt
   wird der Schalter in den Einstellungen, dafür braucht es Admin-Rechte
   (RLS-Policy "wartung admin update").

   Bewusst KEIN Modul und ohne Abhängigkeit zum Supabase-Client: die
   Datei wird direkt nach js/config.js eingebunden und liest den Stand
   über einen einzelnen REST-Aufruf. So steht der Schirm, bevor die
   Seite ihre Daten nachlädt.

   Wichtig zur Einordnung: Das ist eine Ansage an die Partner, kein
   Türschloss. Wer den Schirm im Browser wegräumt, sieht trotzdem nur
   das, was ihm die RLS ohnehin erlaubt. Für "bitte gerade nicht
   arbeiten" reicht das, als Zugriffsschutz ist es nicht gedacht.

   Nicht betroffen: Kundenseiten, Empfehlungslinks, der Promoterbereich,
   KIDZ und die Baufinanzierung. Dort ist die Datei nicht eingebunden.
   ============================================================ */
(function () {
  'use strict';

  var CACHE_KEY  = 'portal_wartung_v1';
  var ADMIN_KEY  = 'berater_ist_admin_v1';  // wird von nav.js / dashboard.js gepflegt
  var CACHE_MS   = 5 * 60 * 1000;           // gemerkter Stand gilt 5 Minuten
  var POLL_MS    = 60 * 1000;               // offene Tabs merken das Umlegen nach ~1 Minute
  var SCHIRM_ID  = 'wartungSchirm';
  var BAND_ID    = 'wartungBand';

  var url = (window.ENV_SUPABASE_URL || '') + '/rest/v1/portal_wartung' +
            '?select=aktiv,titel,text,seit&limit=1';
  var key = window.ENV_SUPABASE_ANON_KEY || '';
  if (!window.ENV_SUPABASE_URL || !key) return;  // ohne Zugangsdaten nichts sperren

  /* ---------- gemerkter Stand ---------- */

  function leseCache() {
    try {
      var roh = localStorage.getItem(CACHE_KEY);
      if (!roh) return null;
      var c = JSON.parse(roh);
      if (!c || typeof c.ts !== 'number') return null;
      if (Date.now() - c.ts > CACHE_MS) return null;
      return c;
    } catch (_) { return null; }
  }

  function schreibeCache(d) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        aktiv: !!d.aktiv, titel: d.titel, text: d.text, seit: d.seit, ts: Date.now()
      }));
    } catch (_) {}
  }

  function istAdmin() {
    // Erst der gemerkte Stand (sofort da, kein Flackern), später korrigiert
    // die Nachkontrolle unten, sobald der echte Berater geladen ist.
    if (window.CURRENT_BERATER) return !!window.CURRENT_BERATER.ist_admin;
    try { return localStorage.getItem(ADMIN_KEY) === '1'; } catch (_) { return false; }
  }

  /* ---------- Darstellung ---------- */

  function stile() {
    if (document.getElementById('wartungStil')) return;
    var s = document.createElement('style');
    s.id = 'wartungStil';
    s.textContent = [
      '#' + SCHIRM_ID + '{position:fixed;inset:0;z-index:2147483000;background:#FAFAFA;',
      'display:flex;align-items:center;justify-content:center;padding:24px;',
      "font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;color:#1A1A1A;",
      'overflow-y:auto;-webkit-font-smoothing:antialiased}',
      '#' + SCHIRM_ID + ' .w-card{background:#fff;border:1px solid #E8E5E0;border-radius:14px;',
      'box-shadow:0 1px 2px rgba(20,18,12,.04),0 4px 14px rgba(20,18,12,.04);',
      'max-width:460px;width:100%;padding:34px 34px 30px;text-align:center}',
      '#' + SCHIRM_ID + ' .w-bild{display:block;width:100%;max-width:288px;height:auto;',
      'margin:0 auto 26px}',
      '#' + SCHIRM_ID + ' .w-eyebrow{font-size:11px;font-weight:700;letter-spacing:.18em;',
      'text-transform:uppercase;color:#C9B98A;margin:0 0 10px}',
      '#' + SCHIRM_ID + ' h1{font-size:22px;font-weight:700;letter-spacing:-.02em;margin:0 0 12px;line-height:1.25}',
      '#' + SCHIRM_ID + ' p{font-size:15px;line-height:1.6;color:#6B6660;margin:0 0 20px}',
      '#' + SCHIRM_ID + ' .w-seit{font-size:13px;color:#8C8680;margin:0 0 22px}',
      '#' + SCHIRM_ID + ' .w-btn{display:inline-block;border:1px solid #D4CFC6;background:#fff;',
      'color:#1A1A1A;border-radius:9px;padding:10px 22px;font-size:14px;font-weight:600;',
      "font-family:inherit;cursor:pointer;transition:background .15s ease,border-color .15s ease}",
      '#' + SCHIRM_ID + ' .w-btn:hover{background:#F7F5F1;border-color:#C9B98A}',
      '#' + SCHIRM_ID + ' .w-fuss{margin:26px 0 0;padding-top:18px;border-top:1px solid #E8E5E0;',
      'font-size:13px;line-height:1.55;color:#8C8680}',
      '#' + SCHIRM_ID + ' .w-fuss a{color:#8B7355;font-weight:600;text-decoration:none}',
      '#' + SCHIRM_ID + ' .w-fuss a:hover{text-decoration:underline}',
      // Absender: das Portal gehört der Regionaldirektion, nicht der Seite.
      '#' + SCHIRM_ID + ' .w-absender{margin:22px 0 0;display:flex;align-items:center;',
      'justify-content:center;gap:11px;text-align:left}',
      '#' + SCHIRM_ID + ' .w-absender img{width:48px;height:48px;border-radius:50%;flex:0 0 auto}',
      '#' + SCHIRM_ID + ' .w-absender-text{font-size:12px;line-height:1.45;color:#8C8680}',
      '#' + SCHIRM_ID + ' .w-absender-text b{display:block;font-weight:600;color:#1A1A1A;font-size:13px}',
      'body.wartung-offen{overflow:hidden}',
      /* Band für Admins: das Portal ist zu, du siehst es trotzdem. */
      '#' + BAND_ID + '{position:fixed;top:0;left:0;right:0;z-index:2147482000;',
      'background:#B5651D;color:#fff;padding:7px 16px;text-align:center;',
      "font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:600}",
      '#' + BAND_ID + ' a{color:#fff;text-decoration:underline;margin-left:8px;font-weight:600}',
      'body.wartung-band{padding-top:32px}'
    ].join('');
    document.head.appendChild(s);
  }

  function seitText(seit) {
    if (!seit) return '';
    var d = new Date(seit);
    if (isNaN(d.getTime())) return '';
    var heute = new Date();
    var gleicherTag = d.toDateString() === heute.toDateString();
    var uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (gleicherTag) return 'Seit heute ' + uhr + ' Uhr.';
    return 'Seit ' + d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '. ' + uhr + ' Uhr.';
  }

  /**
   * Die Zeichnung über dem Text: das Portal selbst als Entwurf auf
   * Millimeterpapier. Kopfleiste, Menüspalte und zwei Kacheln stehen schon,
   * die dritte ist noch eine gestrichelte Kontur. Das sagt „hier wird gerade
   * gebaut", ohne Warnschild und ohne Foto.
   *
   * Bewusst gezeichnet statt fotografiert: skaliert scharf auf jedem Gerät,
   * kostet keine zweite Anfrage und bleibt im Editorial-Look des Portals.
   */
  function zeichnung() {
    var ink = 'stroke="#1A1A1A" stroke-opacity=".42" fill="none"';
    return '' +
      '<svg class="w-bild" viewBox="0 0 288 156" role="img" ' +
        'aria-label="Skizze des Portals: zwei Bereiche stehen, einer ist noch im Bau">' +
        '<defs>' +
          '<pattern id="wartungRaster" width="18" height="18" patternUnits="userSpaceOnUse">' +
            '<path d="M18 0H0v18" fill="none" stroke="#E8E5E0" stroke-width=".6"/>' +
          '</pattern>' +
        '</defs>' +

        // Millimeterpapier
        '<rect x="0" y="0" width="288" height="140" fill="url(#wartungRaster)" opacity=".7"/>' +

        // Der Rahmen der Seite
        '<rect x="24" y="14" width="240" height="112" rx="5" fill="#FFFFFF" ' +
          'stroke="#1A1A1A" stroke-opacity=".5" stroke-width="1.2"/>' +

        // Kopfleiste mit Punkt und Namenszeile
        '<path d="M24 34h240" ' + ink + ' stroke-width="1"/>' +
        '<circle cx="38" cy="24" r="3.4" fill="#C9B98A" fill-opacity=".55"/>' +
        '<path d="M48 24h34" ' + ink + ' stroke-width="1.6" stroke-linecap="round"/>' +

        // Menüspalte, drei Einträge
        '<path d="M68 34v92" ' + ink + ' stroke-width="1"/>' +
        '<path d="M34 46h22M34 58h26M34 70h18" ' + ink + ' stroke-width="1.4" stroke-linecap="round"/>' +

        // Zwei Kacheln, die schon stehen
        '<rect x="80" y="44" width="82" height="34" rx="3" fill="#C9B98A" fill-opacity=".1" ' +
          'stroke="#C9B98A" stroke-width="1"/>' +
        '<path d="M90 56h30M90 66h44" stroke="#C9B98A" stroke-opacity=".8" fill="none" ' +
          'stroke-width="1.4" stroke-linecap="round"/>' +
        '<rect x="172" y="44" width="80" height="34" rx="3" ' + ink + ' stroke-width="1"/>' +
        '<path d="M182 56h28M182 66h40" ' + ink + ' stroke-width="1.4" stroke-linecap="round"/>' +

        // Die dritte ist noch Kontur: hier wird gerade gearbeitet
        '<rect x="80" y="88" width="172" height="28" rx="3" fill="none" ' +
          'stroke="#B5651D" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="5 5"/>' +

        // Maßlinie darunter, wie auf einer Bauzeichnung
        '<path d="M24 140v8M264 140v8M24 144h240" stroke="#C9B98A" fill="none" ' +
          'stroke-width="1" stroke-linecap="round"/>' +
      '</svg>';
  }

  function zeigeSchirm(d) {
    stile();
    var alt = document.getElementById(SCHIRM_ID);
    if (alt) alt.remove();

    var wrap = document.createElement('div');
    wrap.id = SCHIRM_ID;
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-live', 'polite');

    var card = document.createElement('div');
    card.className = 'w-card';

    card.insertAdjacentHTML('beforeend', zeichnung());

    var eyebrow = document.createElement('div');
    eyebrow.className = 'w-eyebrow';
    eyebrow.textContent = 'Kurz geschlossen';
    card.appendChild(eyebrow);

    var h1 = document.createElement('h1');
    h1.textContent = d.titel || 'Wir bauen gerade am Portal';
    card.appendChild(h1);

    var p = document.createElement('p');
    p.textContent = d.text || 'Am Empfehlungsportal wird gerade gearbeitet. Melde dich später noch einmal an.';
    card.appendChild(p);

    var st = seitText(d.seit);
    if (st) {
      var sp = document.createElement('div');
      sp.className = 'w-seit';
      sp.textContent = st;
      card.appendChild(sp);
    }

    var btn = document.createElement('button');
    btn.className = 'w-btn';
    btn.type = 'button';
    btn.textContent = 'Nochmal nachsehen';
    btn.addEventListener('click', function () { window.location.reload(); });
    card.appendChild(btn);

    var fuss = document.createElement('div');
    fuss.className = 'w-fuss';
    fuss.appendChild(document.createTextNode(
      'Deine Empfehlungslinks laufen weiter. Wer einen Link von dir anklickt, kommt normal durch.'
    ));
    var wa = window.ENV_WHATSAPP;
    if (wa) {
      fuss.appendChild(document.createElement('br'));
      var a = document.createElement('a');
      a.href = 'https://wa.me/' + wa;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Etwas Dringendes? Schreib mir.';
      var sp2 = document.createElement('span');
      sp2.appendChild(a);
      fuss.appendChild(sp2);
    }
    card.appendChild(fuss);

    // Absender. Bewusst fest und nicht aus dem eingeloggten Berater gezogen:
    // das Portal betreibt die Regionaldirektion, der Hinweis kommt von ihr.
    var abs = document.createElement('div');
    abs.className = 'w-absender';
    var logo = document.createElement('img');
    logo.src = '/assets/images/team-wachsbleiche-marke-96.webp';
    logo.width = 48;
    logo.height = 48;
    logo.alt = 'Team Wachsbleiche';
    logo.loading = 'lazy';
    abs.appendChild(logo);
    var absText = document.createElement('div');
    absText.className = 'w-absender-text';
    var absName = document.createElement('b');
    absName.textContent = 'Regionaldirektion Kai Blobel & Team';
    absText.appendChild(absName);
    absText.appendChild(document.createTextNode('Deutsche Vermögensberatung'));
    abs.appendChild(absText);
    card.appendChild(abs);

    wrap.appendChild(card);
    (document.body || document.documentElement).appendChild(wrap);
    if (document.body) document.body.classList.add('wartung-offen');
  }

  function entferneSchirm() {
    var el = document.getElementById(SCHIRM_ID);
    if (el) el.remove();
    if (document.body) document.body.classList.remove('wartung-offen');
  }

  function zeigeBand(an) {
    var alt = document.getElementById(BAND_ID);
    if (!an) {
      if (alt) alt.remove();
      if (document.body) document.body.classList.remove('wartung-band');
      return;
    }
    if (alt) return;
    stile();
    var b = document.createElement('div');
    b.id = BAND_ID;
    b.textContent = 'Wartungsmodus ist an. Deine Partner sehen gerade den Wartungshinweis, du arbeitest normal weiter.';
    var a = document.createElement('a');
    a.href = (location.pathname.indexOf('/dashboard/') === 0 ? 'settings.html' : 'dashboard/settings.html') + '#wartung';
    a.textContent = 'Ausschalten';
    b.appendChild(a);
    (document.body || document.documentElement).appendChild(b);
    if (document.body) document.body.classList.add('wartung-band');
  }

  /* ---------- Stand holen und anwenden ---------- */

  var letzterStand = null;

  function anwenden(d) {
    letzterStand = d;
    if (!d || !d.aktiv) { entferneSchirm(); zeigeBand(false); return; }
    if (istAdmin()) { entferneSchirm(); zeigeBand(true); return; }
    zeigeBand(false);
    zeigeSchirm(d);
  }

  function laden() {
    return fetch(url, {
      headers: { apikey: key, Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        var d = rows && rows[0];
        if (!d) return;              // keine Zeile: nichts sperren
        schreibeCache(d);
        anwenden(d);
      })
      .catch(function () {
        // Kein Netz oder Supabase weg: das Portal bleibt offen. Lieber
        // versehentlich auf als versehentlich zu.
      });
  }

  function start() {
    // Bekannter Stand aus dem letzten Aufruf steht sofort, damit die Seite
    // nicht erst kurz aufblitzt, bevor der Schirm kommt.
    var c = leseCache();
    if (c && c.aktiv && !istAdmin()) zeigeSchirm(c);
    laden();
    setInterval(laden, POLL_MS);

    // Nachkontrolle: der Admin-Merker im Browser kann veraltet sein. Sobald
    // der echte Berater geladen ist, wird die Entscheidung noch einmal gefällt.
    var versuche = 0;
    var t = setInterval(function () {
      versuche++;
      if (window.CURRENT_BERATER || versuche > 25) {
        clearInterval(t);
        if (letzterStand) anwenden(letzterStand);
      }
    }, 300);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
