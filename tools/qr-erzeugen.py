#!/usr/bin/env python3
"""
QR-Codes für den Promoter-Einstieg erzeugen.

Jeder Berater bekommt zwei: einen für die Präsentation im Gespräch und einen
für den Aufsteller. Sie zeigen auf /p/<kuerzel>/<art>, und genau dieses Kürzel
entscheidet später, welchem Berater ein Promoter zugeordnet wird.

Warum das ein eigenes Werkzeug ist: Für Claudius Tusche und David Stamm fehlten
die Dateien. Ihnen wurde deshalb in der Präsentation Kais Code angezeigt, und
ein Promoter, der ihn scannte, landete bei Kai (Phase 313). Wer künftig einen
Berater anlegt, soll die Codes in einem Befehl mit erzeugen können, statt dass
es jemandem auffallen muss.

Aufruf:
    python tools/qr-erzeugen.py <kuerzel> [<kuerzel> ...]
    python tools/qr-erzeugen.py --pruefen        (nur nachrechnen, nichts schreiben)

Das Format ist dem Bestand nachgebaut und wird beim Lauf gegen eine vorhandene
Datei geprüft: Kommt dabei kein byteidentisches Ergebnis heraus, bricht das
Werkzeug ab, statt Dateien in einem abweichenden Format zu erzeugen.
"""

import sys
import io
import os
import re
import qrcode

BASIS = 'https://empfehlungsportal.vercel.app'
ARTEN = ('praesentation', 'aufsteller')
ORDNER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'qr')
RAND = 4


def matrix(url):
    q = qrcode.QRCode(box_size=1, border=RAND)
    q.add_data(url)
    q.make(fit=True)
    return [[1 if z else 0 for z in reihe] for reihe in q.get_matrix()]


def svg(url):
    """Baut das SVG genau so, wie die bestehenden Dateien aufgebaut sind:
    ein Pfad, ein Segment je gesetztem Modul, Kantenlänge in Millimetern."""
    m = matrix(url)
    seite = len(m)
    teile = []
    for y, reihe in enumerate(m):
        for x, wert in enumerate(reihe):
            if wert:
                teile.append(f'M{x},{y}H{x + 1}V{y + 1}H{x}z')
    pfad = ''.join(teile)
    return (
        f'<svg width="{seite}mm" height="{seite}mm" version="1.1" '
        f'viewBox="0 0 {seite} {seite}" xmlns="http://www.w3.org/2000/svg">'
        f'<path d="{pfad}" id="qr-path" fill="#000000" fill-opacity="1" '
        f'fill-rule="nonzero" stroke="none"/></svg>\n'
    )


def zurueckrechnen(text):
    """Liest die Modul-Matrix aus einer fertigen Datei zurück. So wird geprüft,
    was wirklich im Bild steht — nicht, was im Dateinamen steht."""
    seite = int(re.search(r'viewBox="0 0 (\d+) \d+"', text).group(1))
    m = [[0] * seite for _ in range(seite)]
    for x, y in re.findall(r'M(\d+),(\d+)H\d+V\d+H\d+z', text):
        m[int(y)][int(x)] = 1
    return m


def selbsttest():
    """Eine bestehende Datei nachbauen. Stimmt sie nicht aufs Byte, ist das
    Format abgewichen und es darf nichts geschrieben werden."""
    probe = os.path.join(ORDNER, 'promoter-max-kudlek-praesentation.svg')
    if not os.path.isfile(probe):
        return True, 'keine Vergleichsdatei vorhanden, Selbsttest übersprungen'
    ist = io.open(probe, encoding='utf-8').read()
    soll = svg(f'{BASIS}/p/max-kudlek/praesentation')
    if ist == soll:
        return True, 'Selbsttest bestanden (bestehende Datei exakt reproduziert)'
    return False, f'Selbsttest FEHLGESCHLAGEN: {len(soll)} statt {len(ist)} Zeichen'


def pruefe_alle():
    """Jede vorhandene Datei zurückrechnen und gegen ihren Dateinamen prüfen."""
    fehler = 0
    for datei in sorted(os.listdir(ORDNER)):
        if not (datei.startswith('promoter-') and datei.endswith('.svg')):
            continue
        rest = datei[len('promoter-'):-len('.svg')]
        art = rest.rsplit('-', 1)[-1]
        kuerzel = rest[: -(len(art) + 1)]
        text = io.open(os.path.join(ORDNER, datei), encoding='utf-8').read()
        passt = zurueckrechnen(text) == matrix(f'{BASIS}/p/{kuerzel}/{art}')
        print(f'  {datei:52} {"OK" if passt else "ZEIGT WOANDERS HIN"}')
        fehler += 0 if passt else 1
    return fehler


def main():
    ok, meldung = selbsttest()
    print(meldung)
    if not ok:
        sys.exit(1)

    args = [a for a in sys.argv[1:]]
    if '--pruefen' in args or not args:
        print('\nAlle vorhandenen Codes:')
        sys.exit(1 if pruefe_alle() else 0)

    for kuerzel in args:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', kuerzel):
            print(f'Ungültiges Kürzel: {kuerzel}')
            sys.exit(1)
        for art in ARTEN:
            url = f'{BASIS}/p/{kuerzel}/{art}'
            ziel = os.path.join(ORDNER, f'promoter-{kuerzel}-{art}.svg')
            io.open(ziel, 'w', encoding='utf-8', newline='').write(svg(url))
            # Sofort zurückrechnen: geschrieben ist nicht geprüft.
            zurueck = zurueckrechnen(io.open(ziel, encoding='utf-8').read())
            status = 'OK' if zurueck == matrix(url) else 'FEHLER'
            print(f'  {os.path.basename(ziel):52} {status}  -> {url}')

    print('\nNicht vergessen: qrSlugs in js/programm.js ergänzen,')
    print('sonst wird der neue Code nie angezeigt (der Wächter meldet es).')


if __name__ == '__main__':
    main()
