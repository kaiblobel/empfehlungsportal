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
      'max-width:460px;width:100%;padding:38px 34px 30px;text-align:center}',
      '#' + SCHIRM_ID + ' .w-mark{width:44px;height:44px;margin:0 auto 22px;border-radius:50%;',
      'background:rgba(201,185,138,.13);display:flex;align-items:center;justify-content:center}',
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

    var mark = document.createElement('div');
    mark.className = 'w-mark';
    mark.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B7355" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    card.appendChild(mark);

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
