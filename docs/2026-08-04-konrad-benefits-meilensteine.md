# Auftrag an Konrad: Benefits als vertikale Mobile-First-Meilensteinreise

Stand: 04.08.2026

## Kurzauftrag

Baue den Benefits-Bereich von `programm.html` auf Grundlage des von Kai freigegebenen Mocks neu.

Die normale Kundenseite zeigt Stufe 1 bis 15 vollständig untereinander. Kleine Geldstufen bleiben kompakt. Restaurant, Apple Watch oder Grill, Gold, iPad und Mallorca werden als große Bildkarten direkt in diese vertikale Reise eingebaut.

Wichtig: Das ist kein reiner CSS-Umbau. Vor einer Veröffentlichung muss die sichtbare 1-bis-15-Reise mit der echten Prämienlogik übereinstimmen.

## Verbindliche Arbeitsgrenze

- Ausgangspunkt ist `origin/main` auf Commit `68cd0c7`, Version v1.151 Beta.
- Arbeite in einem eigenen Zweig oder einer eigenen Arbeitskopie, empfohlen: `conrad/benefits-vertical-mobile-first`.
- Kein direkter Commit auf `main`.
- Keine Veröffentlichung und keine Änderung der Live-Datenbank ohne Kais ausdrückliche Freigabe.
- Keine echten Empfehlungen oder Kundenstatus zum Testen anlegen.
- Vorhandene fremde Änderungen und unversionierte Dateien nicht anfassen.
- `js/config.js` nicht verändern, außer Kai gibt die abschließende Versionsfreigabe.
- Die Seite spricht auch lokal mit der Live-Datenbank. Für Daten- und Ablaufprüfungen ausschließlich synthetische Fixtures oder eine getrennte Staging-Umgebung verwenden.

## Freigegebene visuelle Referenz

Datei:

`C:\Projekte\empfehlungsportal\mockups\benefits-meilensteine-v4-mobile-first.html`

SHA-256:

`2C43431DD4D5EDCAD01104FD89ECB0319D572AE4F38350712C363CC944C67910`

Die Referenz ist ein eigenständiger Mock. Nicht die komplette Datei in `programm.html` kopieren. Zu übernehmen sind die vertikale Reise, die Kartenhierarchie, die Bildwirkung, die Fortschrittslinie, die Wahlfreiheit und der ruhige Hinweis auf eine Empfehlung ohne Prämie.

Nicht übernehmen:

- den zusätzlichen Mock-Hero, weil `programm.html` bereits eine vollständige Seitenführung besitzt
- den simulierten persönlichen Fortschritt `2 von 5`, weil ein noch nicht registrierter Besucher keinen echten Fortschrittswert hat
- statische Belohnungsdaten im HTML
- externe Bild-Hotlinks im Produktivcode

## Was Kai daran freigegeben hat

- Stufe 1 bis 15 stehen auf dem Handy vollständig untereinander.
- Vertikales Scrollen ist die Hauptbewegung. Kein seitliches Suchen nach Belohnungen.
- Kleine 100-Euro-Stufen sind kurze, ruhige Zeilen.
- Stufe 2 erhält eine mittlere Erlebnis-Bildkarte.
- Stufen 5, 7, 10 und 15 erhalten große Bildkarten.
- Die Bildkarten werden in Richtung Stufe 15 emotional größer.
- Mallorca ist das klare Finale.
- Der Kunde kann Geld, einen materiellen Wunsch, ein Erlebnis oder eine Spende wählen, sofern der jeweilige Gegenwert fachlich freigegeben ist.
- Eine Empfehlung ohne Annahme einer Prämie bleibt ausdrücklich möglich.
- Die Seite muss zuerst für 320 bis 430 Pixel Breite funktionieren. Tablet und Desktop sind Erweiterungen dieser mobilen Grundlage.

## Aktueller technischer Stand

Der Benefits-Bereich besteht derzeit aus mehreren getrennten Teilen:

- Einleitung und Win-win-Karten in `programm.html`
- horizontale 1-bis-15-Roadmap in `#t-Roadmap`
- Belohnungsfilter in `.reward-mode-switch`
- getrennte Galerie in `#t-Rewards`
- Gesamtwertkarte in `#t-RewardsTotal`
- dynamische Erzeugung in `js/programm.js`
- Styles in mehreren älteren und neueren Blöcken von `css/programm.css`
- kompakte Sonderdarstellung für den Präsentationsmodus am Ende von `css/programm.css`

Die Daten kommen über `getBelohnungsStufenPublic()` aus `belohnungs_stufen`.

Der mobile Promoterbereich verwendet dieselben Stufen in `js/empfehler-mobile.js`. Die Berater-Detailseite verwendet sie in `js/promoter-detail.js` für die Zielauswahl.

## Kritischer Datenbefund

Die aktuelle Oberfläche leitet aus den Lücken zwischen den vorhandenen Premium-Zeilen zusätzliche 100-Euro-Stufen ab. Die Datenbank enthält nach dem dokumentierten Stand jedoch nur echte Zeilen für:

`1, 2, 3, 5, 7, 10, 15`

Die Oberfläche zeigt zusätzlich Boni für:

`4, 6, 8, 9, 11, 12, 13, 14`

Das ist fachlich nicht deckungsgleich. `sync_praemien_for_empfehler()` erzeugt Prämien nur aus tatsächlich vorhandenen Zeilen in `belohnungs_stufen`. Eine rein optisch ergänzte Stufe wird deshalb später nicht als offene Prämie angelegt.

Außerdem hat Stufe 1 im dokumentierten Datensatz kein `wert_label`, obwohl die Seite 100 Euro verspricht.

Dieser Widerspruch muss vor der Veröffentlichung beseitigt werden. Keine neue Oberfläche ausliefern, die weiterhin Stufen erfindet.

## Vorgesehene Belohnungsmatrix

Diese Matrix entspricht dem freigegebenen Mock und den aktuell verwendeten Werten. Sie ist die Arbeitsgrundlage, aber noch keine Freigabe für eine Live-Datenänderung.

| Stufe | Typ | Darstellung | Wert | Bild |
|---:|---|---|---:|---|
| 1 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 2 | Erlebnis | mittlere Bildkarte, Restaurant für zwei | 150 Euro | `restaurant.jpg` |
| 3 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 4 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 5 | Premium | Apple Watch oder Weber-Grill | 449 Euro | `applewatch.jpg` |
| 6 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 7 | Premium | Goldbarren oder Wunschwert | 500 Euro | `goldbarren.jpg` |
| 8 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 9 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 10 | Premium | iPad Air oder freie Wahl | 699 Euro | `ipad.jpg` |
| 11 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 12 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 13 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 14 | Geldbonus | kompakte Zeile | 100 Euro | kein Bild nötig |
| 15 | Finale | Mallorca für zwei oder gleichwertige Wahl | 2.000 Euro | `mallorca.jpg` |

Gesamtwert bei allen 15 Stufen: 4.798 Euro.

Im Text darf gerundet von rund 4.800 Euro gesprochen werden. Ein Zähler mit exaktem Anspruch muss 4.798 Euro aus den echten Daten berechnen.

## Offene Entscheidungen vor jeder Live-Datenänderung

### 1. Rückwirkung

Wenn die fehlenden Bonuszeilen ergänzt werden, kann die bestehende Synchronisation bei Promotern mit bereits gewonnenen Kunden zusätzliche offene Prämien nachträglich erzeugen.

Vorher ausschließlich lesend und ohne Namen ermitteln:

- wie viele Promoter von jeder neuen Stufe betroffen wären
- wie viele zusätzliche offene Prämien entstehen könnten
- welcher maximale Gegenwert daraus folgt

Kai entscheidet danach ausdrücklich, ob die neuen Stufen rückwirkend gelten.

### 2. Gegenwerte und Wahlfreiheit

Kai bestätigt vor Live:

- die Werte 100, 150, 449, 500, 699 und 2.000 Euro
- ob Premium-Prämien vollständig als Geldwert ausgezahlt werden dürfen
- ob eine Spende immer in gleicher Höhe möglich ist
- ob Versand, Reisebuchung oder Nebenkosten im angegebenen Wert enthalten sind

### 3. Bedingungen und Freigabetext

Der aktuelle Ablauf sagt: Eine Empfehlung zählt als Erfolg, wenn sie Kunde wird. Die FAQ nennt zusätzlich den ersten Geldeingang als Zeitpunkt der Belohnung.

Das muss auf der Seite einmal klar und widerspruchsfrei erklärt werden. Keine Formulierung wie `für jede Empfehlung 100 Euro`, wenn tatsächlich nur gewonnene Kunden zählen.

Vor Live ist eine fachliche beziehungsweise Compliance-Prüfung der Teilnahmebedingungen, Auszahlungsarten und Werbeaussagen erforderlich. Diese Übergabe ist keine rechtliche Prüfung.

### 4. Mallorca-Bild ist vorbereitet

Das falsche bisherige Motiv wurde ersetzt. Die fertige Projektdatei liegt unter:

`assets/images/programm/mallorca.jpg`

Technische Daten:

- 1.200 mal 1.500 Pixel
- JPEG im mobilen 4:5-Format
- 322.354 Byte
- SHA-256 `99AB9396A328FEC66483DB5F005D69C72BB503023011C60A2BA02608E4C312EC`
- eigenes Projektmotiv, kein externer Hotlink und keine fremde Fotolizenz nötig

Das alte unpassende Motiv bleibt lokal als Sicherung unter `tmp/mallorca-vorher-falsches-motiv-2026-08-04.jpg` erhalten. Konrad verwendet ausschließlich die neue Datei aus `assets/images/programm/`.

## Empfohlene Datenlösung

Die Datenbank sollte die Wahrheit sein. Deshalb:

1. Für jede Stufe von 1 bis 15 eine echte Zeile in `belohnungs_stufen` vorsehen.
2. `wert_label` für jede Stufe vollständig pflegen, insbesondere Stufe 1.
3. Bereits verdiente Stufe-1-Prämien ohne Wertangabe mit `wert_label = '100 €'` vervollständigen; den tatsächlichen Auszahlungsbetrag `betrag` dabei nicht setzen.
4. `highlight = true` für die Bildmeilensteine 2, 5, 7, 10 und 15 verwenden.
5. `highlight = false` für die zehn Geldbonus-Stufen verwenden.
6. Die Klassifizierung im Frontend nicht mehr über `/bonus/i` aus dem Titel ableiten.
7. Keine fehlenden Stufen mit 100 Euro im Browser erfinden.
8. Die Migration als neue, reversible SQL-Datei vorbereiten, aber nicht auf Live anwenden.
9. Vor dem Schreiben eine reine Auswirkungsabfrage für mögliche rückwirkende Prämien liefern.

Die vorhandene Funktion `sync_praemien_for_empfehler()` kann alle 15 Stufen grundsätzlich materialisieren, sobald alle Zeilen existieren. Konrad muss trotzdem mit synthetischen Daten prüfen:

- 0 Kunden erzeugt 0 Prämien
- 1 Kunde erzeugt genau Stufe 1
- 4 Kunden erzeugen genau Stufen 1 bis 4
- 14 Kunden erzeugen genau Stufen 1 bis 14
- 15 Kunden erzeugen genau Stufen 1 bis 15
- ein zweiter Sync erzeugt keine Duplikate
- Beratergrenzen bleiben erhalten

## Umsetzung auf der Kundenseite

### `programm.html`

Den Inhalt von `#belohnungen` neu ordnen, die vorhandene Section-ID und den bestehenden Link zu `#anmelden` erhalten.

Normale Seitenansicht:

1. Kurze Einleitung mit dem Win-win-Gedanken.
2. Ein klarer Satz zur Zählweise: Gezählt wird ein gewonnener Kunde, nicht nur ein weitergegebener Name.
3. Vertikale Reise Stufe 1 bis 15.
4. Kompakte Geldzeilen und große Bildkarten in derselben Reihenfolge.
5. Wahlkarte für Auszahlung, materiellen Wunsch, Erlebnis oder Spende.
6. Ruhige Karte `Auch einfach so`, die den Verzicht auf eine Prämie erklärt.
7. Bestehender CTA `Jetzt empfehlen`.

Die alte horizontale Roadmap, die getrennte Galerie und die vier Filterchips in der normalen Ansicht entfernen. Sie würden den Bereich wieder doppeln und unnötig verlängern.

### `js/programm.js`

- Eine einzige Reise aus den echten Stufen rendern.
- Reihenfolge nach `stufe`.
- Bildmeilensteine über `highlight` erkennen.
- Für Bonuszeilen keinen großen Bildplatz reservieren.
- Alle Texte escapen und bestehende Branding- und Mandantenlogik erhalten.
- Exakten Gesamtwert ausschließlich aus vorhandenen `wert_label`-Werten berechnen.
- Bei einer fehlenden Stufe keine Prämie erfinden. Fail-safe mit verständlichem Hinweis und technischem Fehler in der Konsole.
- Bestehenden CTA zum Anmeldebereich erhalten.
- Keine neuen Frameworks und keinen Build-Schritt einführen.

Empfohlen ist eine kleine, rein funktionale Hilfsdatei für Normalisierung und Summenbildung, damit die 1-bis-15-Logik ohne Browser und ohne Live-Datenbank getestet werden kann.

### `css/programm.css`

- Mobile Regeln sind die Basis.
- Keine neue `max-width`-Kaskade als Hauptsystem aufbauen.
- 320 Pixel Breite ohne seitliches Überlaufen.
- Fortschrittslinie links, Karten rechts davon.
- Geldzeilen mindestens 56 Pixel hoch.
- Interaktive Flächen mindestens 44 mal 44 Pixel.
- Bildkarten mit weichen Hairlines, 14 bis 18 Pixel Radius und Champagne-Akzenten.
- Systemschrift beziehungsweise SF-Stack im Customer-Bereich verwenden.
- Keine Glassmorphism-, Neon- oder Material-Optik.
- `prefers-reduced-motion` beachten.
- Alte, danach ungenutzte Roadmap- und Galerie-Regeln sauber entfernen, statt nur weitere Überschreibungen ans Dateiende zu hängen.

### Präsentationsmodus

Die vertikale 15-Stufen-Reise darf nicht als mehrere Meter hohe Folie erscheinen.

Im Präsentationsmodus:

- nur die Bildmeilensteine 2, 5, 7, 10 und 15 kompakt zeigen
- Geldbonus als einen kurzen Satz zusammenfassen
- keine Filter und keinen Gesamtwertblock zeigen
- bestehende Foliennavigation, Tastatursteuerung und Folienzahl erhalten
- bei 1024 mal 768 und 1440 mal 900 ohne Abschneiden prüfen

### Promoterbereich und Beraterdetail

Wenn alle 15 Zeilen in `belohnungs_stufen` existieren, würden die aktuelle Zielauswahl und das automatische nächste Ziel sonst auch jede kleine Geldstufe als Wunschziel anbieten.

Deshalb anpassen:

- `js/empfehler-mobile.js`: Als persönliche Wunschziele nur `highlight = true` anbieten.
- `selectedGoal()` soll ohne manuelle Zielwahl das nächste noch nicht erreichte Highlight wählen.
- Geldboni bleiben im Hintergrund automatisch verdient, sind aber keine bildstarken Wunschziele.
- `js/promoter-detail.js`: Im Feld Ziel-Belohnung ebenfalls nur Highlight-Stufen anbieten.
- Bestehende gespeicherte Ziele defensiv behandeln. Ein altes Bonusziel darf die Seite nicht kaputt machen.
- `js/empfehler.js` wird aktuell von keiner HTML-Datei geladen und gehört nicht automatisch in diesen Umbau.

Der Admin kann bereits eine Prämie als `verzichtet` markieren. Für die Aussage `Auch einfach so` ist deshalb zunächst keine neue Datenbankspalte nötig. Eine Selbstbedienungsfunktion für den Promoter wäre ein eigener, späterer Auftrag.

## Betroffene Dateien

Voraussichtlich:

- `programm.html`
- `css/programm.css`
- `js/programm.js`
- optional neue reine Hilfsdatei für die Stufenlogik
- `js/empfehler-mobile.js`
- `js/promoter-detail.js`
- neue Testdatei unter `tests/`
- neue, nicht angewandte SQL-Migration für die fehlenden Stufen
- `CHANGELOG.md`
- `CLAUDE.md` erst nach tatsächlich abgeschlossenem Stand
- Cache-Buster in `programm.html`, `empfehler.html` und `dashboard/promoter.html`
- `sw.js` bei geänderten oder neuen geteilten Modulen
- `js/config.js` und sichtbare Version erst im ausdrücklich freigegebenen Veröffentlichungsschritt

Nicht anfassen, wenn es für diesen Auftrag nicht zwingend nötig ist:

- Empfehlungsfunnel und Empfänger-Seiten
- Authentifizierung
- Benachrichtigungen
- Buchungsstrecke
- Dashboard-Navigation
- bestehende Kunden- und Empfehlungsdaten

## Prüfmatrix

### Visuell

- 320 x 700
- 390 x 844
- 430 x 932
- 768 x 1024
- 1024 x 768 im Präsentationsmodus
- 1440 x 900 im Präsentationsmodus
- 1440 Pixel normale Seite

Auf allen Größen prüfen:

- kein horizontales Überlaufen
- alle 15 Stufen in richtiger Reihenfolge
- Geldzeilen schnell erfassbar
- Bildtexte vollständig lesbar
- Stufe 15 wirkt sichtbar größer als Stufe 5
- Sticky CTA verdeckt weder Stufe 15 noch die Karte `Auch einfach so`
- sichtbare Tastaturfokusse
- reduzierte Bewegung funktioniert
- fehlendes Bild hat einen ruhigen Fallback

### Daten und Verhalten

- exakt 15 echte Stufen in der Fixture
- exakt 10 Bonusstufen
- exakt 5 Bildmeilensteine
- Gesamtwert exakt 4.798 Euro
- fehlende Stufe führt nicht zu einem erfundenen Bonus
- doppelte Datenzeilen werden weiterhin beraterspezifisch entdoppelt
- Zielwahl zeigt nur Highlight-Stufen
- ein vorhandenes Ziel bleibt nach Aktualisierung erhalten
- CTA führt weiterhin zum bestehenden Anmeldebereich
- Präsentationsmodus bleibt bedienbar

### Bestehende Tests

Alle vorhandenen Tests weiter grün halten. Zusätzlich einen Test für die reine Stufenlogik ergänzen.

Keine mutierenden End-to-End-Tests gegen die Live-Datenbank.

## Definition of Done für die Übergabe an Kai

Konrad stoppt vor `main` und vor Live. Er liefert:

1. Zweig und genauen Commit.
2. Kurze Dateiliste mit Begründung.
3. Diff ohne fremde Änderungen.
4. Mobile Nachweise für 320 x 700 und 390 x 844.
5. Desktop- und Präsentationsnachweise.
6. Ergebnis der automatischen Tests.
7. Reine Auswirkungsanalyse für rückwirkende Prämien, ohne Kundennamen.
8. Entwurf der SQL-Migration, ausdrücklich noch nicht angewandt.
9. Klare Liste der noch offenen Entscheidungen.
10. Bestätigung: kein Push auf `main`, keine Live-Veröffentlichung, keine Live-Datenänderung.

Erst danach entscheidet Kai über Belohnungswerte, Rückwirkung, Compliance-Freigabe, Migration und Veröffentlichung.

## Kurztext zum direkten Start für Konrad

> Lies zuerst `CLAUDE.md`, `CONTRIBUTING.md` und `docs/2026-08-04-konrad-benefits-meilensteine.md` vollständig. Nutze den Mock `mockups/benefits-meilensteine-v4-mobile-first.html` nur als visuelle Referenz. Arbeite in einem getrennten Zweig ab `origin/main` Commit `68cd0c7`. Baue die vertikale Mobile-First-Reise datengetrieben und bereite die fehlenden Stufen als nicht angewandte Migration vor. Keine Live-Daten ändern, keine echten Empfehlungen anlegen, nichts auf `main` veröffentlichen. Stoppe mit Zweig, Diff, Tests, mobilen Nachweisen, Präsentationsnachweisen und der anonymen Rückwirkungsanalyse zur Freigabe durch Kai.
