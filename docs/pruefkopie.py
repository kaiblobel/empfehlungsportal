# -*- coding: utf-8 -*-
"""Erzeugt aus einer echten Beraterseite eine lauffaehige Pruefkopie.

Die Kopie ist Zeile fuer Zeile die echte Seite. Nur die Module, die ans
Netz gehen (dashboard.js, supabase.js, nav.js), werden ueber eine
Import-Karte auf docs/pruefdaten.js umgelenkt. So laeuft der echte
Rendercode gegen erfundene Daten, statt dass eine handgepflegte Attrappe
irgendwann etwas anderes zeigt als die Seite selbst.

Das Potenzialbuch braucht keine Attrappe: es bringt mit
?preview=potenzialbuch einen eigenen Vorschaumodus mit, der nur auf
localhost anspringt.

Mit ?auf=1 klappt die Seite beim Laden alles auf, was aufklappbar ist.
So laesst sich abfotografieren, was hinter "Weitere Filter" und "Details"
steht, ohne dass jemand von Hand klicken muss.

Aufruf:  python docs/pruefkopie.py
"""
import io
import os
import re

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)

SEITEN = [
    ('dashboard/empfehlungen.html', 'docs/pruef-empfehlungen.html', True),
    ('dashboard/empfehler.html', 'docs/pruef-empfehler.html', True),
    ('dashboard/potenziale.html', 'docs/pruef-potenziale.html', False),
]

KARTE = '''  <!-- ERZEUGT von docs/pruefkopie.py, nicht von Hand aendern.
       Lenkt die Module, die ans Netz gehen, auf erfundene Daten um. -->
  <script type="importmap">
  {"imports": {
    "../js/dashboard.js": "./pruefdaten.js",
    "../js/supabase.js": "./pruefdaten.js",
    "../js/nav.js": "./pruef-leer.js",
    "../js/promoter-invite.js": "./pruef-leer.js"
  }}
  </script>
'''

AUFKLAPPEN = '''
  <script type="module">
    /* ?auf=1 klappt alles auf, was aufklappbar ist. Nur fuer den Prueflauf. */
    if (new URLSearchParams(location.search).get('auf') === '1') {
      setTimeout(() => {
        document.querySelectorAll('.liste-mehr[aria-expanded]').forEach((k) => k.click());
        document.querySelectorAll('details.liste-detail').forEach((d) => { d.open = true; });
      }, 900);
    }
    /* ?mess=1 nennt die Elemente, die breiter sind als das Fenster. Genau die
       erzeugen den waagerechten Balken, den niemand haben will. */
    if (new URLSearchParams(location.search).get('mess') === '1') {
      setTimeout(() => {
        const breit = innerWidth;
        const treffer = [];
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > breit + 1 && r.width > 30) {
            treffer.push(Math.round(r.right) + 'px  ' + el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]);
          }
        });
        const kasten = document.createElement('pre');
        kasten.style.cssText = 'position:fixed;inset:0 auto auto 0;z-index:99999;margin:0;padding:8px;max-height:100vh;overflow:auto;background:#fff;color:#000;font:11px/1.4 monospace;border:2px solid red';
        const kopf = 'Fenster ' + breit + 'px, Dokument ' + document.documentElement.scrollWidth + 'px';
        kasten.textContent = [kopf, ''].concat(treffer.slice(0, 22).length ? treffer.slice(0, 22) : ['nichts ragt heraus']).join(String.fromCharCode(10));
        document.body.appendChild(kasten);
      }, 1400);
    }
  </script>
'''


def baue(quelle, ziel, mit_karte):
    pfad = os.path.join(WURZEL, quelle)
    s = io.open(pfad, encoding='utf-8').read()

    # wartung.js prueft den Wartungsschalter ueber das Netz.
    s = re.sub(r'\s*<script src="\.\./js/wartung\.js[^"]*"></script>', '', s)

    if mit_karte:
        # Versionsanhaengsel weg, sonst greift die Import-Karte nicht.
        s = re.sub(r'(src=")(\.\./js/nav\.js)\?v=\d+(")', r'\1\2\3', s)
        stelle = s.find('  <script src="../js/config.js"></script>')
        if stelle < 0:
            stelle = s.find('</head>')
        s = s[:stelle] + KARTE + s[stelle:]

    s = s.replace('</body>', AUFKLAPPEN + '</body>', 1)
    s = s.replace('<title>', '<title>PRÜFLAUF · ', 1)
    io.open(os.path.join(WURZEL, ziel), 'w', encoding='utf-8', newline='').write(s)
    print('%s -> %s' % (quelle, ziel))


HANDY = """<!doctype html>
<meta charset="utf-8">
<title>Handy-Pruefung</title>
<!-- Chrome laesst sich im Hintergrundbetrieb nicht auf unter 500 Punkte
     Fensterbreite bringen. Ein Rahmen hat aber seinen eigenen Sichtbereich:
     die Handy-Regeln der Seite greifen darin wirklich. -->
<style>
  body { margin:0; background:#3a3a3a; font:13px system-ui; color:#fff; }
  p { margin:0; padding:7px 10px; }
  iframe { display:block; width:390px; height:1500px; border:0; background:#fff; }
</style>
<p id="stand">390 Punkte Breite</p>
<iframe id="rahmen" src=""></iframe>
<script>
  const ziel = new URLSearchParams(location.search).get('seite') || 'pruef-empfehlungen.html';
  const rahmen = document.getElementById('rahmen');
  rahmen.src = './' + ziel;
  rahmen.addEventListener('load', () => {
    setTimeout(() => {
      const d = rahmen.contentDocument;
      const innen = rahmen.contentWindow.innerWidth;
      const doku = d.documentElement.scrollWidth;
      const zuBreit = [];
      d.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (doku > innen + 1 && r.right > innen + 1 && r.width > 30) zuBreit.push(Math.round(r.right) + ' ' + el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0]);
      });
      document.getElementById('stand').textContent =
        'Sichtbereich ' + innen + ' Punkte, Dokument ' + doku + ' Punkte' +
        (zuBreit.length ? '  -  RAGT HERAUS: ' + zuBreit.slice(0, 4).join(' | ') : '  -  nichts ragt heraus');
      document.getElementById('stand').style.background = zuBreit.length || doku > innen + 1 ? '#9D2235' : '#00587C';
    }, 1500);
  });
</script>
"""


if __name__ == '__main__':
    io.open(os.path.join(HIER, 'pruef-handy.html'), 'w', encoding='utf-8', newline='').write(HANDY)
    io.open(os.path.join(HIER, 'pruef-leer.js'), 'w', encoding='utf-8', newline='').write(
        '/* Platzhalter im Prueflauf. nav.js braucht eine Anmeldung, und die\n'
        '   Promoter-Einladung oeffnet ein Fenster: beides ist fuer die\n'
        '   Gestaltung der Liste ohne Belang. */\n'
        'export const openPromoterInvite = () => {};\n')
    for q, z, karte in SEITEN:
        if os.path.exists(os.path.join(WURZEL, q)):
            baue(q, z, karte)
