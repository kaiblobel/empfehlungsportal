# Bauplan für Claude Code: Empfängerstrecke „Ganz allgemein" V2

## Auftrag

Baue die öffentliche Empfängerstrecke `/ueberblick` nach dem lokal abgenommenen Mockup um.

Visuelle und funktionale Referenz:

`docs/mock-ueberblick-empfaenger-v2.html`

Lokale Vorschau der Referenz:

`http://127.0.0.1:8765/docs/mock-ueberblick-empfaenger-v2.html`

Die Referenz zeigt Struktur, Rangfolge, Texte, mobile Wirkung und Klickverhalten. Die echte Seite muss weiterhin alle vorhandenen Personalisierungs-, Empfehlungs-, Tracking- und Opt-out-Funktionen behalten.

## Harte Grenzen

- Die Opt-out-Logik bleibt unverändert: Wenn der Empfänger nichts auswählt und sich nicht austrägt, meldet sich der zuständige Berater wie besprochen.
- Die vorhandene Formulierung im Abschluss bleibt sinngleich erhalten: „Wenn du nichts auswählst, meldet sich Kai wie besprochen bei dir. Das ist der Normalfall, du musst hier also nichts tun."
- Bestehende Token-, Berater-, Rückruf- und Austragen-Logik nicht vereinfachen, entfernen oder nachbauen.
- Keine Datenbankänderung, keine Migration, keine neue Tabelle, keine neue Edge Function.
- Keine Änderung an `/api/share.js`, sofern die vorhandene Kurzadresse ohne Änderung weiter funktioniert.
- Kein Umbau anderer Themen-, Präsentations- oder Empfängerseiten.
- Keine Änderung an `main`, keine Veröffentlichung und kein Live-Test ohne ausdrückliche Freigabe von Kai.
- Keine echten Rückrufwünsche oder Austragen-Vorgänge bei der Prüfung absenden.
- Keine externen Bilder, Schriften oder Skripte laden. Nur vorhandene lokale Dateien verwenden.
- Das Mockup bleibt eine Referenz und wird nirgends in der echten Navigation verlinkt.

## Arbeitsweise

1. Aktuellen Stand frisch prüfen.
2. In einem eigenen Zweig `konrad/ueberblick-empfaenger-v2` und möglichst in einem getrennten Arbeitsbaum arbeiten.
3. Vor dem Bau `C:\Projekte\kai-gedaechtnis\memory\MEMORY.md`, `C:\Projekte\odysseus-os\docs\LAGE.md`, `CLAUDE.md` und `AGENTS.md` lesen.
4. Die vorhandene Live-Seite und das Mockup auf 390 x 844 sowie auf etwa 1600 x 900 vergleichen.
5. Nur `ueberblick.html`, `css/ueberblick.css`, `js/ueberblick.js` und unmittelbar notwendige Tests anfassen.
6. Nach dem Bau lokale Vorschau öffnen und Kai zeigen.
7. Danach stoppen. Nicht zusammenführen, nicht hochladen, nicht veröffentlichen.

## Zielwirkung aus Empfängersicht

Der Empfänger soll innerhalb der ersten Sekunden verstehen:

- Wer hat an ihn gedacht?
- Wer ist sein Ansprechpartner?
- Was erfährt er auf dieser Seite?
- Dass er nichts vorbereiten oder ausfüllen muss.
- Dass die Seite erst erklärt und nicht sofort ein Produkt verkauft.

Der persönliche Vertrauensaufbau kommt vor dem Rückrufknopf. Die Seite bleibt ein Opt-out-Weg, wirkt aber bis zum Abschluss nicht wie eine vorgezogene Terminbuchung.

## Zielstruktur

### 1. Empfehlungsband

Unverändert personalisiert beibehalten:

`Max hat an dich gedacht und diese Seite weitergegeben.`

Der Name muss weiterhin aus der echten Empfehlung oder der vorhandenen Vorschauquelle kommen. Keine feste Person in den echten Code schreiben.

### 2. Kopfbereich

Vorhandene Beraterpersonalisierung behalten:

- Bild oder Team-Marke
- Name
- Rolle
- mobile Navigation
- Sprung zum Abschluss

Navigation in dieser Reihenfolge:

- Der Überblick
- Aktuell
- Wer sich meldet
- Wie weiter

### 3. Neuer Einstieg

Eyebrow:

`Deine Empfehlung von {Empfehlername}`

Wenn kein Empfehlername verfügbar ist:

`Deine Finanzen im Überblick`

Hauptüberschrift:

`Einmal verstehen, wie deine Finanzen zusammenhängen.`

Einleitung:

`Kein Produktkatalog und keine Vorbereitung. Du bekommst in wenigen Minuten ein klares Bild davon, wie ein Gespräch bei {BeraterVorname} abläuft und was es dir bringen kann.`

Knöpfe:

- Primär: `Überblick starten`, springt zu den sechs Schritten.
- Sekundär: `Direkt zu den Wegen`, springt zum bestehenden Abschluss.

Vertrauenszeile:

- Lesen, nichts ausfüllen
- Kostet nichts
- Du entscheidest, wie es weitergeht

Bild:

`/assets/images/praesentation/kai-buero-teamwand.jpg`

Bei anderen Beratern darf das Bild nicht fälschlich Kai als deren Person darstellen. Deshalb gilt:

- Für Kai darf das echte Bürobild verwendet werden.
- Für andere Berater entweder ein vorhandenes passendes Beraterbild verwenden oder bei der bisherigen neutralen Darstellung bleiben.
- Keine fremde Person als zugeordneten Berater darstellen.

### 4. Drei schnelle Nutzenpunkte

Direkt nach dem Einstieg drei ruhige Felder:

1. `Was schon da ist`
   `Zulagen, Zuschüsse, Verträge und laufende Kosten einmal vollständig sehen.`
2. `Was zuerst kommt`
   `Eine klare Reihenfolge, bevor über Produkte oder einzelne Lösungen gesprochen wird.`
3. `Was für dich passt`
   `Am Ende kennst du die nächsten Schritte und entscheidest selbst.`

### 5. Sechs Schritte als kompakter Aufklappbereich

Überschrift:

`Sechs Schritte. So läuft das Gespräch ab.`

Einleitung:

`Du kannst jeden Punkt kurz öffnen. Die wichtigsten Zusammenhänge stehen direkt da, Vertiefung gibt es nur dort, wo du sie möchtest.`

Verhalten:

- Schritt 01 ist beim ersten Aufruf geöffnet.
- Es ist immer höchstens ein Schritt geöffnet.
- Maus, Tastatur und Berührung funktionieren.
- Der geöffnete Zustand ist klar erkennbar.
- Keine Eingabe wird gespeichert oder gesendet.

Schritte und Kurzzeilen:

1. `Zusammenrechnen, was dir zusteht`
   `Erst vorhandene Möglichkeiten sehen, dann entscheiden.`
2. `Eine grobe Formel als erster Maßstab`
   `30, 30, 30 und 10, ohne starre Vorgabe.`
3. `Zeile für Zeile Klarheit schaffen`
   `Aus einem Gefühl wird eine nachvollziehbare Zahl.`
4. `Die richtige Reihenfolge festlegen`
   `Absicherung, langfristiges Sparen, Vermögensaufbau.`
5. `Zwei Konten bringen Ruhe in den Monat`
   `Feste Kosten und frei verfügbares Geld trennen.`
6. `Verstehen, bevor du entscheidest`
   `Was passiert, warum passt es und was kostet es?`

Die bestehenden fachlichen Inhalte bleiben erhalten, werden aber erst im geöffneten Schritt gezeigt:

- Schritt 01: vorhandenes Rechenbeispiel und Kennzeichnung als Beispielwerte.
- Schritt 02: lokaler 30-30-30-10-Rechner und `dvag-formel.webp`.
- Schritt 03: Haushaltsplan und `dvag-haushaltsplan.webp`.
- Schritt 04: bestehende interaktive Stufen und `dvag-pyramide.webp`.
- Schritt 05: Zwei-Konten-Erklärung und `dvag-zwei-konten.webp`.
- Schritt 06: die drei Fragen zu Wirkung, Begründung und Kosten.

Auf kleinen Bildschirmen bleiben breite Darstellungen seitlich wischbar. Beispielwerte bleiben klar als Beispiele gekennzeichnet.

### 6. Reform nach den sechs Schritten

Die Reform bleibt sichtbar, steht aber nicht mehr vor dem allgemeinen Überblick.

Kompakte dunkle Karte:

- Eyebrow: `Aktueller Hinweis`
- Überschrift: `Die private Altersvorsorge wird neu geregelt.`
- Satz: `Dieser Punkt hat eine Frist. Deshalb bleibt er sichtbar, steht aber nicht mehr vor dem eigentlichen Überblick.`
- Sichtbares Startdatum 01.01.2027
- Aufklappbarer Bereich `Was sich ändert`

Im aufgeklappten Bereich bleiben die vorhandene Zeitleiste, Fakten, Einschränkungen und offizielle Quelle vollständig erhalten. Keine gesetzlichen Aussagen aus dem Mockup übernehmen, ohne sie gegen den bestehenden belegten Inhalt zu prüfen.

### 7. Beraterblock

Der Block folgt direkt nach dem aktuellen Hinweis.

Überschrift:

`Kein Callcenter. Kein Gespräch von der Stange.`

Text:

`Ich bin {Beratername}, {Beraterrolle}. Diese Seite steht hier, damit du vorher weißt, was auf dich zukommt. Wenn wir sprechen, geht es um deine Situation, nicht um einen Katalog.`

Versprechen:

- Erst verstehen
- Klar einordnen
- Du entscheidest

Vorhandene echte Belege wie Erfahrung und Rezension dürfen kompakt erhalten bleiben. Sie müssen bei fremden Beratern weiterhin korrekt ausgeblendet oder aus deren echten Daten befüllt werden.

### 8. Mobiler fester Knopf

- Beim Seitenstart nicht anzeigen.
- Erst ab dem Beraterblock einblenden.
- Text: `Wie es weitergeht`
- Ziel: bestehender Abschnitt `#weiter`
- Im Abschluss wieder ausblenden, damit keine Bedienelemente verdeckt werden.
- Keine Datenaktion direkt über diesen Knopf.

### 9. Abschluss und Opt-out

Die vorhandene Opt-out-Logik bleibt funktional unverändert.

Beibehalten:

- Überschrift `Drei Wege. Einer genügt.`
- Hinweis, dass sich der Berater ohne Auswahl wie besprochen meldet.
- vorausgewähltes Zeitfenster und bestehende Zeitfenster
- tokengebundener Rückrufwunsch
- Fehlerhinweis bei unvollständigem Link
- Finanzcheck mit Token, Berater und Quelle
- Terminwahl des richtigen Beraters
- Austragen-Link mit Token
- Mail-Hinweis ohne Token

Opt-out-Zeile:

`Kein Interesse? Dann sag hier kurz Bescheid, dann meldet sich niemand.`

Die echte Bestätigung eines Rückrufwunsches darf nur mit einem gültigen Token erfolgen. Die bestehende Schutzlogik darf nicht durch eine rein optische Mockup-Bestätigung ersetzt werden.

## Gestaltung

- Bestehende lokale Schriften Outfit, Inter und Fraunces weiterverwenden.
- Ruhige Trust-Luxury-DNA mit Ink, Weiß, neutralen Flächen und Gold als Akzent.
- Keine neue Farbwelt und keine neue Bildsprache erfinden.
- Das Bürobild ersetzt für Kai das Kleeblatt-Münzen-Motiv im Einstieg.
- Großzügiger Rechneraufbau, kompakter Handyaufbau.
- Keine Daueranimation.
- Bestehende reduzierte Bewegung berücksichtigen.
- Die kleine Mockup-Zeile `Klickbares Mockup, keine Daten werden gesendet` gehört nicht in die echte Seite.

## Zielwerte für die Wirkung

- Die geschlossene Seite soll auf 390 x 844 ungefähr 7 bis 9 Bildschirmhöhen lang sein, nicht wieder etwa 15.
- Der Empfänger sieht im ersten Bildschirm Empfehlung, Nutzen und ersten Knopf.
- Der Reformblock ist sichtbar, aber nicht der erste fachliche Inhalt.
- Der Rückrufknopf steht mobil nicht vor dem Vertrauensaufbau dauerhaft im Bild.
- Alle sechs fachlichen Teile bleiben erreichbar.

## Technische Abnahme

Mindestens diese Prüfungen ausführen:

```powershell
node --test tests/ueberblick-seite.test.mjs
node --test tests/berater-auf-allen-seiten.test.mjs
node --test tests/kontaktwege-ohne-berater.test.mjs
node --test tests/unbekannter-berater.test.mjs
node --test tests/kurzadressen.test.mjs
node --test tests/share-handler.test.cjs
```

Zusätzliche Tests ergänzen für:

- immer höchstens ein geöffneter Schritt
- Schritt 01 anfangs geöffnet
- Rechner bleibt rein lokal
- mobiler Knopf heißt `Wie es weitergeht`
- mobiler Knopf wird erst ab dem Beraterblock sichtbar
- Reform steht im Dokument nach den sechs Schritten
- unveränderte Opt-out-Texte und Tokenlogik
- Beraterpersonalisierung und unbekannter Berater

Browserprüfung:

- 390 x 844, kompletter Weg vom Empfehlungsband bis Austragen
- ungefähr 1600 x 900, Einstieg, aufgeklappter Schritt und Abschluss
- Tastaturbedienung der sechs Schritte
- Rechner mit 2.800 Euro ergibt 840, 840, 840 und 280 Euro
- Zeitfenster lassen sich auswählen
- ohne Token keine falsche Bestätigung eines Rückrufwunsches
- mit sicherem Testweg richtige Beraterpersonalisierung, ohne echte Nachricht oder Datenänderung
- keine fehlenden Bilder und keine Fehler im Browserprotokoll

## Stoppunkt und Übergabe

Nach erfolgreicher lokaler Prüfung:

1. Kai die lokale Vorschau zeigen.
2. Geänderte Dateien und Prüfergebnisse nennen.
3. Offene Abweichungen zum Mockup ehrlich benennen.
4. Stoppen.

Nicht zusammenführen, nicht hochladen und nicht veröffentlichen, bis Kai die echte Umsetzung ausdrücklich freigibt.
