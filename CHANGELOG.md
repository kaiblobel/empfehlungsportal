# Changelog · Empfehlungsportal

Versionierung: `v1.{Phase}` — jede Phase im Build-Plan bekommt eine Minor.
Offizielle Live-Version: **v1.313 Beta** · Die Kurzadresse mit Berater greift, live seit 18.08.2026.

## v1.313 Beta - Phase 293 · Die Kurzadresse mit Berater greift
**2026-08-18**

**`/ueberblick/sven-augustin` zeigte Kai.** Der Rewrite in `vercel.json` steht richtig, aber er greift **serverseitig**: Vercel liefert `/ueberblick.html?berater=sven-augustin` aus, die Adresszeile im Browser behält jedoch den Pfad. In `window.location.search` steht damit nichts, und `js/ueberblick.js` sah nur dort nach.

Der Fehler war live nicht zu übersehen und lokal nicht zu finden: `python -m http.server` kennt die Rewrites nicht, dort gibt es die kurze Form gar nicht. Aufgefallen ist es beim Gegencheck nach dem Veröffentlichen.

**`js/ueberblick.js` liest jetzt beide Formen**, wie `js/baufi.js` es für `/baufinanzierung/:berater` und `js/promoter-start.js` für `/p/:berater/:quelle` längst tun. Auch die Weitergabe an die Folgelinks nimmt den Slug aus dem Pfad, sonst verlöre der Finanzcheck den Absender.

**Der Wächter prüft das mit**, gegengeprobt durch Entfernen der Zeile.

Zur Einordnung: Die Seite war rund zwanzig Minuten mit diesem Fehler live, verlinkt war sie in dieser Zeit nirgends.

---

## v1.312 Beta - Phase 292 · Das ganze Bild als eigene Seite
**2026-08-18**

**Die erste Themenkachel der Präsentation heißt „Ganz allgemein" und öffnete bisher nur einen Block innerhalb der Präsentation.** Der Text dort ist knapp gehalten, weil Kai im Termin dazu spricht. Was fehlte, war die Fassung, die der Empfohlene **allein** liest. Bei KIDZ gibt es die längst, hier endete es beim Einstieg.

**Neu ist `ueberblick.html`, erreichbar unter `/ueberblick` und `/ueberblick/:berater`.** Der Aufbau folgt dem Inhalt aus `#themaUeberblick`, nur ausgeschrieben: der dunkle Reform-Block mit Zeitleiste und den drei Eckpunkten zum Aufklappen, danach die sechs Schritte mit den vier DVAG-Darstellungen, dann wer sich meldet, drei Wege und ein FAQ.

**`empfaenger.html` bleibt unangetastet.** Sie ist weiter der Einstieg mit den sechs Kapiteln und dem Finanzcheck; in Kapitel 4 steht jetzt ein dritter, ruhigerer Weg: „Lieber erst das ganze Bild ansehen". Token und Berater werden an den Link gehängt, sonst hinge der Anrufwunsch drüben an nichts.

**Drei Dinge, die die Präsentation so nicht hat.** Bei Schritt 02 rechnet ein Feld die Formel in Euro um, sobald man sein Netto einträgt; das läuft ausschließlich im Browser, und genau das steht auch darunter. Bei Schritt 04 sind die drei Stufen der Pyramide antippbar, jede mit einem Satz, warum sie dort liegt. Und am Ende stehen drei Wege statt einem: Anrufzeit, die sieben Fragen, Terminwahl.

**Über den Wegen steht der ehrliche Satz** „Wenn du nichts auswählst, meldet sich [Vorname] wie besprochen bei dir." Der Austragen-Weg darunter erscheint nur mit Empfehlungs-Token, weil `austragen.html` ihn braucht; ohne Token steht dort der Hinweis auf eine kurze Mail. Eine Zeile, die ein Abbestellen verspricht und nichts tut, wäre schlimmer als keine. Aus demselben Grund bestätigt der Anrufwunsch ohne Token **nicht** still, sondern sagt, dass der Link unvollständig ist.

**Mandantenfähig von Anfang an.** Die drei Wege zum Berater wie überall (Empfehlung, `?berater=`, angemeldete Sitzung). Oben links steht das Porträt; wer keins hinterlegt hat, bekommt die Team-Marke statt eines Initialen-Kürzels. Berufsjahre und die Google-Rezension gehören Kai und fallen bei Partnern weg — damit der Abschnitt dann nicht leer wirkt, stehen darüber drei Versprechen, die für jeden gelten. Die Anschrift kommt aus dem Feld aus Phase 291 und verschwindet, solange keine gepflegt ist.

**In der Präsentation führt ein Knopf unter den sechs Teilen auf die echte Seite**, mit dem Berater-Kürzel. Die Adresse wird erst beim Klick gebaut: Der Berater der Vorschau kommt aus dem Netz und steht beim Aufbau der Seite noch nicht fest.

**Der Wächter `tests/ueberblick-seite.test.mjs`** hält fest, was still kaputtgehen kann: die drei Daten der Reform und die Quelle, genau sechs Teile mit dem Aktuell-Block davor, die zwei Hinweise auf Beispielzahlen unter den Software-Aufnahmen, alle Branding-Haken, die drei Wege zum Berater, der Token-Schutz beim Anrufwunsch und die Verdrahtung in `vercel.json`, `api/share.js` und den Einstellungen. Alle 65 Wächter grün.

Noch offen: Die Seite ist im Menü nicht verlinkt, und `empfaenger.html` bleibt die Vorlage „allgemein". Wer `ueberblick` direkt als Vorlage verschicken will, kann das über den neuen Eintrag in `api/share.js`.

---

## v1.311 Beta - Phase 291 · Jeder Berater bringt seine eigene Anschrift mit
**2026-08-18**

**Die Anschrift stand bisher fest im HTML.** „An der Wachsbleiche 1a · 03046 Cottbus", auf jeder Kundenseite, auch auf der eines Partners aus einer anderen Stadt. Bei einem Foto wäre das ein Schönheitsfehler, bei einer Anschrift ist es eine falsche Absenderangabe.

**Neu ist deshalb ein Feld `adresse` am Berater** (`schema-phase291-berater-adresse.sql`), pflegbar in den Beraterkonten unter „Öffentliche Angaben". Bleibt es leer, verschwindet die Zeile. Es fällt bewusst **nicht** auf eine andere Anschrift zurück: lieber keine Angabe als eine fremde.

**Beim Branding-Haken ist das der Unterschied zu den Bildfeldern.** Die prüfen mit `'feld' in b`, ob der Datensatz die Spalte überhaupt kennt, und lassen sonst den HTML-Wert stehen. Für die Anschrift wäre genau das falsch, weil der HTML-Wert die eines anderen ist. `data-bb="adresse"` blendet deshalb immer aus, wenn kein Wert da ist.

**Zwei Wächter kamen dazu**, beide gegen Fehler, die still bleiben:

`tests/berater-lesefunktionen.test.mjs` sucht sich die jüngste Migration, die `get_berater_public` definiert, und prüft: beide Lesefunktionen geben dieselben Spalten heraus, beide tragen `security definer` und `set search_path`, und nach dem Neuanlegen stehen die Ausführungsrechte für anonyme Besucher wieder da. Fehlt eine dieser Zeilen, bleibt die Seite technisch heil und zeigt trotzdem auf jeder Partnerseite wieder den Standard-Berater. Gegengeprobt mit beiden Fehlerfällen.

`tests/berater-verwaltung-felder.test.mjs` (aus Phase 290) deckt die Anschrift automatisch mit ab, weil sie ein neues Formularfeld ist.

**Der Zwischenspeicher im Browser steigt auf `bb_berater_v3_`.** Ein alter Eintrag kennt die Spalte nicht; ohne den Wechsel sähe ein Berater, der seine Anschrift gerade gepflegt hat, sie beim nächsten Aufruf immer noch nicht. Der Preis ist ein einmaliges Aufblitzen der Standardangaben pro Besucher.

**Reihenfolge beim Ausführen:** erst das SQL-Skript, dann als anonymer Besucher gegenprüfen (`select * from public.get_berater_public('kai-blobel')` muss eine Spalte `adresse` liefern), dann die Anschriften pflegen, und erst danach eine Kundenseite die Zeile anzeigen lassen. Andersherum bleibt sie überall leer und niemand merkt, dass nur die Pflege fehlt.

**Ausgeführt am 18.08.2026.** Gegengeprüft wurde in der Rolle `anon`, nicht als Angemeldeter: Als Admin sieht die Sache auch dann gut aus, wenn die Rechte fehlen. Beide Funktionen liefern die neue Spalte, `security definer` und `search_path` stehen, die Rechte für `anon`, `authenticated` und `service_role` sind wieder gesetzt. Zusätzlich geprüft: `list_kidz_berater_public` hinter der Beraterauswahl der Anmeldeseiten liefert unverändert ihre Einträge, und `promoter-start.html` lädt ohne Fehlermeldung — die Seite ist der schnellste Anzeiger für ein Rechteproblem, weil sie als einzige sichtbar meckert. Kais Anschrift ist eingetragen; die der sechs Partner stehen aus, ihre Zeile bleibt so lange leer.

---

## v1.310 Beta - Phase 290 · Die Berater-Verwaltung löscht keine Bilder mehr
**2026-08-18**

**Wer in der Berater-Verwaltung eine Telefonnummer korrigierte, löschte dabei das Bürofoto.** Und das Teamfoto und die Bildzeile gleich mit, ohne Warnung und ohne dass es jemandem auffiel. Die drei Felder aus Phase 251 waren damit in der Praxis nie stabil.

**Die Ursache liegt im Zusammenspiel zweier Stellen, die einzeln richtig aussehen.** `listBerater()` in `js/supabase.js` liest eine feste Spaltenliste, und die drei Bildfelder standen nicht darin. In `js/berater-admin.js` werden sie trotzdem als Formularfelder gezeichnet, mit `b.buero_foto_url || ''` als Wert — bei einem Datensatz ohne die Spalte also immer leer. Beim Speichern sammelt der Knopf **alle** Felder mit `data-f` ein und schreibt leere als `null` zurück. Drei Felder, die nie geladen wurden, werden so bei jedem Speichern überschrieben.

Aufgefallen ist das bei der Vorbereitung eines Adressfelds für den Berater. Die Anschrift wäre in dieselbe Falle gelaufen: einmal gepflegt, beim nächsten Speichern wieder weg.

**Behoben ist es mit den drei Spaltennamen in der Leseliste.** Dazu ein Wächter, `tests/berater-verwaltung-felder.test.mjs`: Er sammelt alle `data-f`-Felder aus der Verwaltung und prüft, dass jedes davon in der `.select()`-Liste von `listBerater` steht. Gegengeprobt, indem der Fix rückgängig gemacht wurde — der Wächter nennt dann genau die drei fehlenden Felder beim Namen.

Die Bilder, die bereits verloren gingen, kommen dadurch nicht zurück. Wer Bürofoto, Teamfoto oder Bildzeile gepflegt hatte, sollte einmal nachsehen, ob sie noch da sind.

---

## v1.309 Beta - Phase 289 · Die KIDZ-Elternseite fährt als Zug

**2026-08-18**

**Die Elternseite `kidz-konzept.html` ist von sieben Kapiteln auf vierzehn Abschnitte umgebaut.** Kern ist der **KIDZ-Zug**: die Vermögensaufbau-Lok und sieben Waggons von „Gesundheit früh sichern" bis „Sicher im Kinderalltag", jeder antippbar mit eigenem Detailblock, am Handy als Wischband. Neu sind außerdem die ausführliche 55-Euro-Rechnung und ein Abschnitt, der **§ 12 SGB V** im Wortlaut zeigt, in den Eltern den Namen ihres Kindes einsetzen können.

**Diese Arbeit entstand am 17.08.2026 in einer anderen Sitzung** und lag seither ungespeichert im Arbeitsverzeichnis, ohne einen einzigen Speicherpunkt. Sie ist zuerst unverändert festgehalten worden (Commit „KIDZ-Elternseite: die neue Erzählung mit dem KIDZ-Zug"), bevor etwas daran geändert wurde. So bleibt nachvollziehbar, was von dort kam und was danach korrigiert wurde.

**In der Beispielrechnung stimmte eine Zahl nicht.** Der Hinweis nennt 7,3 Prozent Wertentwicklung, monatlich vorschüssig. Nachgerechnet passte davon nur der Wert „ohne frühen Start"; der Startwert nach 18 Jahren entsprach 7,70 Prozent statt 7,3, und weil die ganze Kette darauf aufbaut, standen am Ende rund 32.000 Euro zu viel. Alle vier Werte sind jetzt konsistent mit den angegebenen 7,3 Prozent:

| | vorher | jetzt |
|---|---|---|
| nach 18 Jahren | 25.008 € | **24.000 €** |
| bis zum 67. Lebensjahr | 1.077.120 € | **1.045.154 €** |
| ohne frühen Start | 287.391 € | **287.274 €** |
| Vorsprung | 789.729 € | **757.880 €** |

Die Aussage bleibt dieselbe, die Zahlen tragen jetzt. Der Hinweistext darunter blieb unverändert, er nannte die Annahmen von Anfang an sauber („dient der Veranschaulichung, ist keine Zusage, Kosten, Steuern und Inflation nicht berücksichtigt").

**Der letzte Waggon heißt bewusst nicht „Unfallschutz".** Er erzählt aus Elternsicht, was ein Kind nach einem Unfall für Genesung und Alltag braucht. Von Arbeitskraft ist bei Kindern nirgends die Rede, stattdessen davon, welche Möglichkeiten der heutige Gesundheitszustand für später offenhält.

**Die Cache-Marke der `kidz-konzept.css` stand nur halb.** Die neue Fassung war auf `?v=24` gezählt, `kidz-empfehlung.html` lud aber weiter `?v=23`; zwei Seiten, dieselbe Datei, verschiedene Stände. Genau das meldete `versionsstand.test.mjs` seit gestern. Beide stehen jetzt auf `?v=24`, und damit laufen erstmals seit Tagen **alle 84 Wächter grün**.

**Die Menüsperre im Portal bleibt.** Kais Entscheidung: Der Punkt „KIDZ-Konzept" in der Seitenleiste trägt weiter die Marke „bald" und führt nirgendwo hin, ebenso die Vorschau-Kachel in den Einstellungen. Die öffentliche Adresse `kidz.teamwachsbleiche.de/konzept` zeigt die neue Seite, die Partner sollen sie aber noch nicht über das Portal ansteuern.

## v1.308 Beta - Phase 288 · Das Zitat steht ruhig

**2026-08-18**

**Kais Befund zum Zitat „Deine ehrliche Antwort ist mir wichtiger als eine perfekte Zahl.":** zu unruhig, „sieht aus als ob ich durch die Lupe schaue".

**Die Ursache steckt in der Schrift selbst.** Fraunces ist eine Schrift mit Achsen, und zwei davon machen bei großen Graden Ärger. Die Achse `opsz` schaltet die Optik um, sobald die Schrift groß gesetzt wird: sehr dünne Haarstriche neben dicken Grundstrichen, was bei 40 Pixeln flimmert. Weil `font-optical-sizing` standardmäßig auf `auto` steht, tat der Browser das von selbst. Die zweite Achse heißt `WONK` und stellt einzelne Buchstaben absichtlich schief, am deutlichsten das f in „perfekte".

**Fünf Fassungen standen im Browser nebeneinander** (heutige Optik, Lese-Optik 14, Optik 24, Lese-Optik mit mehr Gewicht, und das Zitat ganz in Outfit). Entschieden für die **Lese-Optik bei unverändertem Gewicht**: gleichmäßige Strichstärken, die Serif bleibt als Akzent erhalten. In Outfit wäre das Zitat zu einer weiteren Überschrift geworden.

**Mitgezogen sind die beiden anderen groß gesetzten Serif-Stellen:** der Gesprächsimpuls im Themen-Overlay (bis 36 Pixel) und die Bildunterschriften im Abschnitt „Empfehlen gehört zum Alltag" (19 Pixel). **Nicht angefasst sind die kleinen Kicker** zwischen 12 und 15 Pixeln; dort trifft die automatische Optik ohnehin die Lese-Optik, und genau die ist da richtig.

**Cache-Marke der `praesentation.css` auf `?v=14`.**

## v1.307 Beta - Phase 287 · Die Marktübersicht ist ein Rad mit Stichworten und Plus

**2026-08-18**

**Kai wollte drei Dinge an der Übersicht hinter „Was alles dazugehört":** sie soll auf dem Rechner größer sein, man soll sehen, dass die Felder etwas enthalten, und sie soll näher an die DVAG-Marktübersicht rücken, die er als Vorlage geschickt hat.

**Größer war zuerst eine Frage von drei Deckeln.** Das Overlay war auf 1000 Pixel begrenzt, das Rad auf 520, und rechts stand eine 290 Pixel breite Textspalte, die dem Rad die halbe Breite nahm. Der Text steht jetzt **unter** dem Rad, damit wächst das Rad auf 960 Pixel, das Overlay auf 1240.

**Das Rad trägt jetzt Symbole und Stichworte, wie in der Vorlage.** Je Feld ein Goldsymbol auf dem Kreis, daneben der Titel und zwei kurze Stichworte, dazu Goldpfeile vom Zentrum nach außen. In der Mitte steht weiter das Gesicht, um das es geht, nicht das Wort „Markt". Nebenbei ist damit ein toter Zweig weg: das Skript setzte seit dem Bau Symbole über `data-market-icon` in die Felder, dieses Merkmal stand aber in keinem einzigen Feld. Die Symbole waren also vorgesehen und nie eingesetzt.

**Das Plus am Symbol ist die Antwort auf „man sieht nicht, dass da was ist".** Es sitzt am Symbolkreis, wird beim Überfahren gold und beim geöffneten Feld zum Minus, weil der senkrechte Strich verschwindet. Beim Antippen klappt im Band unter dem Rad der ausführliche Text auf, dieselben Sätze wie vorher. Nochmal antippen schließt wieder: das Plus ist ein Schalter, keine Einbahnstraße. Bei den Feldern der linken Radseite sitzt das Plus links am Symbol, sonst stünde es zwischen Symbol und Text statt nach außen zu zeigen.

**Am Rad stehen kurze Stichworte, nicht die langen Sätze.** Die DVAG-Vorlage funktioniert nur deshalb, weil dort „KFZ-Versicherung" und „Kosten einsparen" steht. Die bisherigen Detailsätze („Anbieter und Versorgung passend strukturieren") sprengen den Kreis: bei 198 Pixel Blockbreite ragen sie in den Nachbarn und aus der Fläche, zweimal messbar erlebt. Deshalb tragen die Felder jetzt zwanzig kurze Stichworte, und die langen Sätze wandern ins Band. Änderbar sind sie im HTML, nicht in der Datenbank, wie vorher auch.

**Geometrie, die beim Bauen dreimal nachjustiert wurde:**
- **Kein Feld darf genau oben oder unten sitzen.** Dort braucht der Textblock beidseitig Platz und stößt an die Nachbarn. Das Rad ist deshalb um ein halbes Segment gedreht (18 Grad), damit stehen fünf Felder links und fünf rechts, alle einheitlich als Zeile.
- **Der Block hängt an seiner Innenkante, nicht an seiner Mitte.** Zentriert auf dem Kreispunkt wachsen die Blöcke oben und unten beide Richtung Mitte und überlappen sich. So wächst jeder nach außen.
- **Die Verteilung sitzt auf einer Ellipse, nicht auf einem Kreis** (Streckung 1,45). Zehn Textblöcke brauchen senkrecht mehr Abstand als waagerecht. Geprüft ist das messend: kein Block überlappt einen anderen, keiner die Mitte, keiner ragt aus der Fläche.

**Auf dem Handy wird aus dem Rad eine Liste.** Ein Kreis mit zehn Textblöcken ist dort nicht lesbar, und die Speichen zeigen ins Leere.

**Der Wächter `tests/praesentation-marktuebersicht.test.mjs` ist mitgewandert.** Er hielt fest, dass die Felder Knöpfe mit Detailtexten sind, und hätte den Umbau nicht bemerkt. Jetzt prüft er zusätzlich, dass alle zehn Felder das Plus tragen, dass daraus im geöffneten Zustand ein Minus wird, dass das Rad auf 960 Pixeln steht und dass die alte Detailspalte nicht zurückkommt.

**Cache-Marken:** `css/praesentation.css` auf `?v=13`, `js/programm.js` auf `?v=61`. Die zweite hatte ich zuerst vergessen, und das Ergebnis war lehrreich: Die Felder lagen alle auf einem Punkt und keine Speiche wurde gezeichnet, weil der Browser das alte Skript aus dem Zwischenspeicher lieferte, während das neue HTML schon da war. Wer eine dieser Dateien anfasst, muss ihre Marke hochzählen.

## v1.306 Beta - Phase 286 · Der Abschnitt „Ein Ansprechpartner" ist eine Lebensachse

**2026-08-18**

**Kais Befund beim Durchgang durch die Präsentation: „sieht alles so gleich aus".** Gemeint war der Abschnitt „Ein Ansprechpartner für alles, was mit Geld zu tun hat.". Dort standen sechs Felder als 3x2-Raster, alle gleich groß, gleich schwer, gleich gebaut: goldenes Strichsymbol, fette Zeile, graue Zeile. Nichts sagte, wo man hinschauen soll. Dazu kommt, dass die Seite solche Raster ohnehin reichlich hat (sechs Alltagsbilder, vier Themenkarten, drei Handys, sechs Meilensteine), das siebte fiel deshalb nur noch als Gleichförmigkeit auf.

**Aus dem Raster ist eine durchlaufende Linie mit sechs Stationen geworden.** Über jeder Station steht ein Lebensmoment, darunter das Fachgebiet: erster Job, erste eigene Wohnung, Familie, eigenes Zuhause, es bleibt was übrig, wenn es drauf ankommt. Am Ende der Achse steht kein siebtes Thema, sondern was alle sechs verbindet: „Und immer derselbe Ansprechpartner. Kein neuer Anfang, kein neues Erklären, keine zweite Akte."

**Damit zeigt der Abschnitt den Satz, der ohnehin darüber steht** („Wenn sich dein Leben verändert, fängst du nicht jedes Mal bei null an") statt ihn nur zu behaupten. Und er dreht die Perspektive: die Reihe liest sich als Biografie des Kunden, nicht als Sortiment des Beraters. Vor allem ist es ein Gesprächswerkzeug. Im Termin fährt der Berater die Achse ab und fragt „wo stehst du gerade?", was bei einer Kachelwand nicht geht.

**Drei Varianten standen zur Wahl** und wurden Kai als Mock nebeneinander gezeigt (`mockups/anker-aufwertung-v1.html`, mit dem alten Stand als erste Zeile zum Vergleich): diese Lebensachse, ein Blickanker (das Versprechen als große dunkle Karte mit den Zahlen 1 / 6 / 0, die Felder daneben als Register) und ein Register mit großen Ziffern. Der Blickanker war kurz gebaut und wurde wieder ausgebaut, nachdem Kai die Achse gesehen hatte. Das Versprechen „Du erzählst deine Geschichte nur einmal" bleibt deshalb der kleine Kasten oben rechts.

**Zwei Dinge, die beim Bauen auffielen:**
- **Die Titel sind unterschiedlich lang, und ohne Mindesthöhe startet jeder Untertitel auf einer anderen Linie.** Die Reihe zerfällt dann optisch. Der Titel hat jetzt zwei Zeilen Mindesthöhe, damit stehen alle Untertitel auf einer Grundlinie. Zusätzlich gekürzt: „Bauen, Kaufen, Finanzieren" zu „Bauen und Finanzieren" (eine dreiteilige Aufzählung bricht in einer 150 Pixel schmalen Spalte hässlich um) und der Untertitel darunter auf „Kauf, Neubau oder Anschluss", dieselbe Sprache wie auf der Themenkarte.
- **Lebensmoment und Untertitel sind beide ein `span`.** Auf dem Handy lagen sie deshalb übereinander, weil `.achse-stop span` beide traf und in dieselbe Rasterzeile schickte. Der Untertitel trägt jetzt die eigene Klasse `.achse-satz`. Bei zwei gleichartigen Elementen im selben Baustein reicht der Elementname als Selektor nicht.

**Umbruchpunkte:** Unter 980 Pixeln behält die Achse ihre Reihe, die Stationen rücken nur enger zusammen. Unter 900 kippt sie senkrecht, und das Symbol steht dann **neben** dem Text statt darüber; übereinander wären aus sechs Stationen drei Bildschirme zum Scrollen geworden. Die Linie läuft dabei durch die Punkte und endet weich, bevor der Abschlusssatz beginnt.

**Cache-Marke der `praesentation.css` auf `?v=12`.** Die Datei wird nur von `programm.html` geladen, deshalb blieb es bei einer Stelle.

## v1.305 Beta - Phase 285 · Der Menüpunkt heißt KIDZ-Konzept

**2026-08-17**

**„Das KIDZ-Programm" brach in der Seitenleiste auf zwei Zeilen um**, seit die Marke „bald" daneben steht. Kais Vorschlag: Die Seite heißt in der Adresse `/kidz/konzept`, also soll sie auch im Menü so heißen. Der Punkt trägt jetzt **KIDZ-Konzept** und passt wieder in eine Zeile. Erst stand kurz nur „Konzept" darin (unter dem Reiter KIDZ wäre der Zusatz doppelt), Kai wollte den vollen Namen: Im ausgeklappten Menü auf dem Handy und in der Suche steht der Punkt ohne den Reiter darüber, dort trägt er sich selbst besser.

**Der Wächter `tests/kidz-programm-im-menue.test.mjs` ist mit umgeschrieben.** Er bewachte bisher „der Zugang ist erreichbar" und hätte die Sperre aus Phase 284 nie bemerkt. Jetzt hält er die neue Wahrheit fest: Der Punkt steht da, trägt keine Adresse, hat die Marke „bald", und die Vorschau-Kachel in den Einstellungen verlinkt ebenfalls nicht mehr. Beim Freischalten muss er zurück auf „offen".

**Nicht umbenannt: die Vorschau-Kachel in den Einstellungen.** Sie heißt weiter „KIDZ für Eltern", weil sie dort direkt neben „KIDZ für Kinder" steht und genau diese beiden Wörter die Unterscheidung tragen.

**Cache-Marke `js/nav.js` auf `v=66`** in allen 18 Stellen samt Service Worker.

## v1.304 Beta - Phase 284 · Das KIDZ-Programm ist im Menü angekündigt, aber noch zu

**2026-08-17**

**Die Elternseite steht seit Phase 277 im Menü, ist aber noch nicht fertig.** Kais Ansage: Der Punkt soll bleiben, damit die Partner sehen, dass da etwas kommt, sie sollen aber noch nicht hin. Die Seite selbst und ihre Adresse (`kidz.teamwachsbleiche.de/konzept`) bleiben unangetastet und von außen erreichbar; gesperrt ist nur der Weg über das Portal.

**Der Menüpunkt wird jetzt als `<span>` gerendert, nicht als ausgegrauter Link.** Ein `<a href>` bliebe über Mittelklick, Kontextmenü und Tastatur erreichbar; ausgegraut heißt dann nur „sieht gesperrt aus". Dahinter steht ein neues Merkmal in `js/nav.js`: `bald: true` an einem Unterpunkt. Es nimmt der Zeile Adresse und Slug-Anhänger und hängt eine kleine Marke „bald" an. Freischalten heißt später: diese eine Zeile wieder entfernen.

**Dieselbe Sperre in den Einstellungen.** Die Vorschau-Kachel „KIDZ für Eltern" führte auf dieselbe Seite; ohne sie wäre die Sperre im Menü wirkungslos gewesen. Auch dort steht die Kachel weiter da, gedimmt, mit derselben Marke und ohne Hover-Anhebung.

**Nicht angefasst: die Kundenwege.** `kidz-empfehlung.html` und die Themenseite „KIDZ für Kinder" verlinken weiter auf das Konzept. Das sind Seiten, die der Kunde in der Hand hat, keine Portal-Navigation.

**Cache-Marken:** `js/nav.js` auf `v=65` (18 Stellen), `css/dashboard.css` auf `v=54` (19 Stellen), beide auch in der Vorab-Liste des Service Workers.

## v1.303 Beta - Phase 283 · Der Namenszug tritt einen Schritt zurück

**2026-08-17**

**Kais Befund nach einem Tag mit der neuen Schrift:** „etwas zu groß und zu breit". Gemessen stimmte das auch: Bei 15 Pixeln war „Kai Blobel & Team" **159 Pixel breit, „Empfehlungsportal" nur 149**. Die Unterschrift war also breiter als der Titel und zog den Blick zuerst auf sich, obwohl sie ergänzen soll.

**Zwölf Prozent kleiner, sonst nichts angefasst.** 15 → 13,2 Pixel in der 240er Leiste, 13,5 → 11,9 in der 200er. Schrift, Goldton, linke Kante, Zeilenabstand und die Versalienzeile darüber bleiben unverändert. Ergebnis: Namenszug 139 Pixel, Titel weiter 149. Die Rangfolge stimmt jetzt auch in der Breite.

**Vorher/nachher wurde nebeneinander gezeigt**, samt Messung der tatsächlichen Textbreite. Gemessen wird dabei über einen Range: Die `span` sind Blöcke und damit immer so breit wie die Spalte, `getBoundingClientRect` auf dem Element hätte für beide Fassungen dieselbe Zahl geliefert.

**Cache-Marke der `dna.css` auf `v=11`** in allen 20 Stellen. Zweite Änderung an derselben Datei am selben Tag, dieselbe Pflicht.

## v1.302 Beta - Phase 282 · Der Namenszug in der Seitenleiste ist wieder Schreibschrift

**2026-08-17**

**Kai hat gemerkt, dass etwas fehlt.** Oben links stand „Kai Blobel & Team" einmal wie mit dem Füller geschrieben. Seit Phase 268 lief die Zeile in der normalen Schrift, und der Unterschied ist genau der zwischen Werkzeug und Marke.

**Der alte Weg war nicht zu retten, der Grund für die Abschaltung stimmte.** Im CSS stand `Segoe Script`, eine Schrift, die es nur unter Windows gibt. Auf Kais Rechner sah das nach Füller aus, auf dem iPhone nach irgendetwas anderem. Eine Marke, die je nach Gerät anders aussieht, ist keine.

**Jetzt liegt die Schrift als Datei im Projekt.** Petit Formal Script, 28 Kilobyte, `assets/fonts/petit-formal-script-latin.woff2`, eingebunden in `dna.css` neben Outfit. Sie wird nicht von Google nachgeladen, aus demselben Datenschutzgrund wie bei den anderen Schriften des Portals. Lizenz liegt daneben: SIL Open Font License, `assets/fonts/LICENSE-petit-formal-script.txt`.

**Aufgeteilt statt einfach kursiv.** „Regionaldirektion" steht klein in gesperrten Versalien, darunter „Kai Blobel & Team" in der Schreibschrift, in dunklem Gold. Eine ganze Zeile in Schreibschrift wird schnell zur Hochzeitseinladung; ein einzelner Namenszug wirkt wie eine Unterschrift.

**Vier Schriften standen zur Wahl** und wurden nebeneinander im Kopf der Leiste gezeigt: Petit Formal Script, Italianno, Mrs Saint Delafield, Style Script. Entschieden für Petit Formal, weil sie bei 13 bis 15 Pixeln noch lesbar bleibt. Die Federschriften sind schöner, aber in dieser Größe Gekrakel.

**Zwei Größen für zwei Leistenbreiten:** 13,5 Pixel bei der 200er Leiste zwischen 1024 und 1280, 15 Pixel bei der 240er darüber und im ausgeklappten Menü auf dem Handy. Beides geprüft, der Namenszug bleibt einzeilig.

**Die Cache-Marke der `dna.css` steht jetzt auf `v=10`,** in allen 20 Dateien einschließlich der Vorab-Liste im Service Worker. Ohne das hätte ein Teil der Nutzer die alte Datei aus dem Zwischenspeicher behalten und von der Schrift nichts gesehen.

**Die Anmeldeseite bleibt, wie sie ist.** Dort steht die Regionaldirektion weiter in Versalien; die Schreibschrift gehört in die Leiste.

## v1.301 Beta - Phase 281 · Die Marke der Regionaldirektion steht auf dem Login

**2026-08-17**

**Die Anmeldeseite war die einzige Seite ohne Absender.** Weiße Karte, Titel, zwei Felder, fertig. Wer den Link zum ersten Mal öffnet, sah nicht, wessen Portal das ist. Kais Satz dazu: „können wir das chicker machen mit meinem Logo".

**Das Emblem sitzt jetzt auf der Kartenkante.** Das runde Zeichen von Team Wachsbleiche steht mit weißem Rand halb über der Oberkante, darunter der Titel, die Zeile „Regionaldirektion Kai Blobel & Team" in gesperrten Versalien und ein kurzer Strich in Champagne. „Dein persönlicher Überblick" ist unter die Karte gerutscht, damit der Kopf nicht dreistöckig wird.

**Das Berater-Portrait ist von der Anmeldeseite verschwunden.** Bisher zeigte sie das Foto des zuletzt angemeldeten Beraters, auf einem geteilten Gerät also mal dieses, mal jenes. Kais Entscheidung: hier steht nur die Marke. Das eigene Foto erscheint weiterhin nach dem Anmelden im Kopf der Seiten dahinter. Damit entfällt auch der Sonderfall aus Phase 128, das Portrait erst gar nicht zu zeigen, wenn noch keines gemerkt ist.

**Unter der Karte steht jetzt der Absender.** Geschäftsadresse „An der Wachsbleiche 1a · 03046 Cottbus", darunter Impressum und Datenschutz, verlinkt auf dieselben DVAG-Seiten wie im Fuß der Kundenseiten. Pflicht ist das hier nicht, die Anmeldeseite steht auf `noindex` und ist ein internes Werkzeug; es geht um den seriösen Eindruck. Einschränkung, die bestehen bleibt: Der DVAG-Datenschutztext beschreibt nicht, was das Portal selbst tut, also Supabase, gemerkte Anmeldung im Browser, Push-Nachrichten. Für den Beraterbereich vertretbar, für die Kundenseiten wäre eine eigene Erklärung der saubere Weg.

**Vier Auswahlrunden statt Direkteinbau.** Erst drei Grundentwürfe (Monogramm-Siegel, geteiltes Panel, editorial-minimal), dann drei Feinfassungen des gewählten Wegs mit dem echten Logo. Das Emblem lag längst im Portal, es wurde bisher nur vom Wartungsschirm benutzt: `assets/images/team-wachsbleiche-marke-96.webp`, 3,9 Kilobyte, keine neue Datei nötig.

**Die Stile hängen an einer eigenen Klasse.** `dashboard/welcome.html` nutzt dieselbe `.login-card`. Damit dort nichts verrutscht, greifen alle neuen Regeln nur über `.login-marke`, das ausschließlich auf der Anmeldeseite steht.

**Geprüft:** Rechner (1100 Pixel) und Handy (390 Pixel), jeweils mit und ohne gemerktes Foto.

## v1.300 Beta - Phase 280 · KIDZ-Collage ganz sichtbar, Termin nicht mehr angeklebt

**2026-08-17**

**Dritte Runde an derselben Stelle, diesmal am Kern.** Phase 278 hatte die Textspalte verbreitert und damit die Bildspalte verkleinert, Phase 279 nahm das zurück. Kai hat danach den eigentlichen Punkt benannt: Von der Collage fehlt ein großer Teil, obwohl zwischen Text und Bild noch Luft ist.

**Gemessen statt geschätzt.** Bei 2400 Pixeln Fensterbreite ist die Bildspalte 1272 Pixel breit und 1338 hoch. Die Collage ist 1890 zu 1063, also 16 zu 9. Mit `object-fit: cover` auf voller Höhe müsste sie 2378 Pixel breit dargestellt werden, sichtbar sind 1272: **es fehlten 47 Prozent der Bildbreite,** und zwar mitten in den Kacheln. Zwischen Text und Bild lagen dabei nur 88 Pixel Luft. Mehr Breite allein kann das also nicht lösen, das war der Denkfehler in Phase 278.

**Zwei Änderungen, die zusammen wirken.** Der Rand bis zur Inhaltsmitte bekommt einen Deckel bei 360 Pixeln; ungedeckelt wächst er auf breiten Schirmen über 600 Pixel und liegt dort in der Textspalte brach. Und die Textspalte behält ihren Anteil von 47 Prozent, nimmt aber nie mehr als Rand, Text und Luft brauchen. Wichtig ist die Richtung: Die Textspalte kann dadurch nur schmaler werden, die Bildspalte also nur breiter. Bei 2400 Pixeln sind das 1381 statt 1272, bei 1600 bleibt alles wie es war.

**Die Collage wird nicht mehr beschnitten,** sondern vollständig gezeigt (`contain`) und senkrecht mittig gesetzt, das Seitenverhältnis steht im CSS. Alle 15 Kacheln sind ganz zu sehen. Der Preis ist Rand über und unter dem Bild, den der Verlauf des Hero trägt: Ein 16-zu-9-Bild in einer fast quadratischen Spalte lässt sich nicht gleichzeitig vollständig zeigen und randlos füllen.

**Der Zitatkasten saß plötzlich unter dem Bild.** Er richtet sich am unteren Rand der Bildspalte aus, und die war durch das Raster auf die volle Hero-Höhe gestreckt, also höher als die Collage. „Gemeinsam entscheiden." schwebte damit in der leeren Fläche darunter. Behoben mit `align-items: center` am Hero: Beide Spalten sind jetzt nur so hoch wie ihr Inhalt und sitzen mittig, die Bildspalte ist also genau die Collage.

**Die Hero-Höhe ist bei 860 Pixeln gedeckelt.** Auf einem 1420 Pixel hohen Schirm war der Hero 1338 hoch, Text und Collage brauchen davon 768. Der Rest stand als leere Fläche darum herum, was nach dem Umbau deutlich sichtbar wurde. Auf üblichen Schirmen bleibt der bildschirmfüllende Eindruck.

**Einspaltig bleibt es formatfüllend.** Auf dem Handy liegt die Collage in einem Streifen von 480 Pixeln Höhe. Vollständig gezeigt stünde sie dort nur 211 Pixel hoch, mehr als die Hälfte bliebe leer. Dort ist ein gefüllter Ausschnitt besser, die einzelnen Kacheln erkennt man ohnehin kaum. Dafür braucht der Streifen ausdrücklich `align-content: stretch`, sonst erbt er die mittige Ausrichtung des Hero, das Bild bekommt nur seine natürliche Höhe und `height: 100%` hat keinen Bezug mehr.

**Nebenbei korrigiert:** Im Markup stand die Collage mit `width="1024" height="768"`, tatsächlich ist sie 1890 zu 1063. Die falsche Angabe reserviert beim Laden den falschen Platz.

### Der Sommerfest-Termin wirkte angeklebt

Kais Wort dafür: „rangeklatscht". Drei Ursachen, alle im CSS:

**Kein Abstand.** Der Streifen stand mit `margin: 0 auto` unmittelbar unter dem blauen Band. Jetzt sind es 52 Pixel darüber und 12 darunter, auf schmalen Schirmen 34.

**Die vier Angaben behielten die Kachel-Optik der großen Fassung** (Rahmen, Füllung, 16 Pixel Radius), obwohl die Streifen-Regel sie als kompakte Aufzählung mit Grundlinien-Ausrichtung vorsah. Im schmalen Streifen war dafür kein Platz: Sie brachen in drei ungleiche Reihen und machten den ganzen Block unruhig. Padding, Rahmen und Hintergrund werden dort jetzt zurückgesetzt.

**Der Hinweis blähte die Knopfgruppe auf.** „Ihr könnt auch ohne Anmeldung einfach vorbeikommen." stand in einer Zeile, und weil eine Flex-Gruppe ihre Breite als Summe aller Kinder in einer Zeile rechnet, war die Gruppe 609 Pixel breit statt der 290, die die beiden Knöpfe brauchen. Den Angaben links blieben dadurch nur 385 Pixel. Mit einer Obergrenze von 310 Pixeln bekommt die Textspalte 684, und die Angaben stehen in zwei statt drei Zeilen. Auf schmalen Schirmen wird die Grenze wieder aufgehoben, dort sollen die Knöpfe die Zeile füllen.

Dazu ist der Flyer von 74 auf 92 Pixel gewachsen, auf dem Handy von 58 auf 72.

**Merke:** Bei `object-fit: cover` entscheidet nicht die Breite, wie viel man sieht, sondern das Verhältnis von Fläche zu Bild. Wer mehr sehen will, muss entweder das Verhältnis angleichen oder auf das randlose Füllen verzichten. Der Test dazu prüft jetzt die Richtung (Textspalte gedeckelt) statt eines festen Wertes.

---

## v1.299 Beta - Phase 279 · Das KIDZ-Bild bleibt, wie es war

**2026-08-17**

**Nachbesserung zu Phase 278.** Dort wurde die Textspalte verbreitert, damit der Text nicht mehr in die Bildcollage läuft. Der Preis war zu hoch: Die Bildspalte schrumpfte um gut 130 Pixel, das Bild stand weiter rechts und zeigte weniger. Es füllt seine Spalte mit `object-fit: cover`, eine schmalere Spalte schneidet also mehr weg. Kai hat es sofort gesehen.

**Die Aufteilung ist zurück auf 0.94 zu 1.06.** Nicht die Spalte war zu schmal, der Textblock war zu breit: Er trug seinen Rand bis zur Inhaltsmitte als `margin` und zusätzlich feste 610 Pixel Breite. Gedeckelt wird deshalb der Block, nicht die Spalte verschoben.

**Die Überschrift rechnet jetzt in `cqw` statt `vw`,** also nach ihrem eigenen Block statt nach dem Fenster. Ohne das war sie ausgerechnet dort am größten (76px), wo der Block am wenigsten Platz hatte, weil der Rand bis zur Inhaltsmitte mitwächst: Auf einem 2400er Schirm brach „Was wünschen" mitten auseinander. Mit der Kopplung bleiben es über alle Breiten von 992 bis 2560 Pixeln vier Zeilen, die Schrift wandert zwischen 48 und 62 Pixeln, und zwischen Text und Bild stehen überall 88 Pixel Luft.

**Merke:** Ein Textblock, der seinen Rand aus `(100vw - --max) / 2` bezieht, wächst gegenläufig zu seinem Platz. Schriftgrößen in `vw` verstärken das, `cqw` fängt es ab.

---


## v1.298 Beta - Phase 278 · Der KIDZ-Text bleibt neben dem Bild

**2026-08-17**

**Auf der KIDZ-Elternseite standen die letzten Wörter jeder Zeile in der Bildcollage.** „KIDZ hilft Ihnen, drei wichtige Grundlagen früh zu verstehen und in Ruhe zu ordnen" lief rechts in die Fotos hinein. Am Handy war nichts zu sehen, dort stehen Text und Bild untereinander. Auf dem Rechner fing es bei 1366 Pixel Fensterbreite an und wurde immer schlimmer: bei 1920 Pixeln lag der Text 37 Pixel tief im Bild.

**Zwei Maße, die nichts voneinander wussten.** Die Textspalte war `0.94fr` breit. Der Text darin hatte aber seinen eigenen Rand bis zur Inhaltsmitte, `(100vw - 1180px) / 2`, und zusätzlich feste 610 Pixel Breite. Auf breiten Schirmen wächst der Rand, die Textbreite bleibt, und die Summe passt irgendwann nicht mehr in die Spalte. Weil der Text `z-index: 2` trägt, lief er nicht unter das Bild, sondern darüber.

**Jetzt wird die Spalte gerechnet statt geraten:** Rand plus Textbreite plus Abstand zum Bild, alle drei als Variablen an `.hero`. Dieselben Variablen benutzt der Text, und er zieht den Rand von seiner Breite wieder ab. Damit kann er auch dann nicht hinauslaufen, wenn der Platz eng wird und das Bild seine Mindestbreite behält.

**Nachgemessen über fünfzehn Fensterbreiten** von 1920 bis 390 Pixel: überall Luft zwischen Text und Bild, vorher an vier Breiten Überlappung. Ein Test hält die Rechnung fest, damit niemand versehentlich zum alten Muster zurückgeht.

---


## v1.297 Beta - Phase 277 · Das KIDZ-Programm steht im Portal

**2026-08-17**

**Die KIDZ-Elternseite war praktisch unauffindbar.** `kidz.teamwachsbleiche.de` leitet auf das Sommerfest, und von dort verlinkt keine der öffentlichen KIDZ-Seiten auf das Konzept: Das Menü oben rechts kennt nur Sommerfest, Gewinne und Anmeldung. Wer das Programm sehen wollte, musste die Adresse kennen, einen Empfehlungslink haben oder die Vorschau-Kachel in den Einstellungen finden. Die Seite selbst war die ganze Zeit in Ordnung und ist als einzige der KIDZ-Seiten für Suchmaschinen freigegeben.

**Der Zugang sitzt jetzt dort, wo die Partner ohnehin arbeiten:** im KIDZ-Reiter der Seitenleiste, als erster Unterpunkt „Das KIDZ-Programm", vor Sommerfest-Gewinnspiel und Elternabend. Bewusst nicht auf der Sommerfest-Seite, denn die läuft gerade als Kampagne bis zum 6. September, und alle Partner nutzen das Portal.

**Neu in `js/nav.js`: `kunde: true` an einem Unterpunkt.** Damit öffnet er in einem eigenen Tab (das Portal bleibt stehen, wo der Partner gerade war) und trägt `data-berater-link`, bekommt also den Absender angehängt. Ohne den landet eine Anmeldung über diesen Link beim Standard-Berater statt beim Partner, der ihn weitergegeben hat. Der Anhänger dafür kam mit Phase 275.

**Nicht angefasst:** die Wegführung auf den öffentlichen KIDZ-Seiten selbst. Ob das Sommerfest die Startseite bleibt und ob das Konzept ins öffentliche KIDZ-Menü gehört, ist eine Frage der laufenden Kampagne und keine Panne.

---


## v1.296 Beta - Phase 276 · Die Marktübersicht öffnet sich wieder

**2026-08-17**

**„Was alles dazugehört" in der Präsentation tat nichts.** Der Knopf unter den sechs Themenfeldern öffnet die Marktübersicht, also den Kreis mit den zehn Feldern und Kais Foto in der Mitte. Ein Klick, und es passierte nichts Sichtbares.

**Zwei Namen für dieselbe Sache.** Das Skript blendete die Fläche mit der Klasse `is-open` ein, sichtbar macht ein Overlay im Stylesheet aber `offen`. Beim Klick verschwand deshalb nur das `hidden`-Merkmal: Die Fläche lag ab da über der ganzen Seite, blieb aber durchsichtig. Für den Betrachter passierte nichts, tatsächlich lag eine unsichtbare Scheibe über allem, bis Escape gedrückt wurde. Die beiden anderen Overlays der Präsentation (Themenvorschau und Promoter-Vorschau) nutzen seit jeher `offen`, nur die Marktübersicht scherte aus.

**Ein Test hält die Kopplung fest** (`praesentation-marktuebersicht.test.mjs`). Er prüft nicht den einen Knopf, sondern die Regel dahinter: Jede Klasse, mit der `js/programm.js` ein Overlay einblendet, muss in `css/praesentation.css` auch etwas sichtbar machen. Dazu, dass jedes Overlay geschlossen wirklich weg ist und nicht als durchsichtige Scheibe liegen bleibt, und dass alle zehn Felder ihre Überschrift und ihre zwei Detailpunkte tragen.

**Dazu ein Netz im Stylesheet, damit das nie wieder die ganze Seite lahmlegt:** Solange ein Overlay nicht eingeblendet ist, nimmt es auch keine Klicks mehr an (`pointer-events:none`, erst mit `.offen` wieder `auto`). Der Namensfehler allein hätte dann nur bedeutet, dass sich die Übersicht nicht öffnet, statt dass die Präsentation stehenbleibt. Gilt für alle drei Overlays, und der Test bewacht es.

**Live geprüft:** Öffnen, ein Feld antippen, Detailspalte rechts, Schließen. Alles sauber, keine Fehlermeldung in der Konsole. Nachgestellt wurde der Fehler vorher am Rechner und am Handy gegen die veröffentlichte Fassung, dreimal von drei.

---

## v1.295 Beta - Phase 275 · Der richtige Berater auf allen Themenseiten

**2026-08-17**

**Nach dem Fund auf der KIDZ-Seite (Phase 272) alle Kundenseiten durchgesehen. Dieselbe Lücke lag noch an einer zweiten Stelle:** `js/themen-vorschau.js` trägt sieben Themenseiten (Förderungen, Selbständige, Investment, Absicherung, Karriere, Banking, Energie) und kannte zwei Wege zum Berater, den Empfehlungs-Token und `?berater=slug`. Ohne beides stand fest `kai-blobel`. Genau so öffnen die Vorschau-Kacheln in den Einstellungen die Seiten, nämlich ohne Slug. Jeder Partner sah dort Kais Namen, Kais Termin-Link und Kais Impressum.

**Ursache war eine Variable für zwei Bedeutungen.** `currentAdvisor` hielt gleichzeitig „welcher Slug steht in der Adresse" und „welcher gilt als Standard". Damit ließ sich „nichts angegeben" nicht mehr von „Kai ist gemeint" unterscheiden, und der dritte Weg konnte gar nicht greifen. Getrennt in `expliziterSlug` (Adresse oder Umschalter der internen Vorschau) und den Standard. Reihenfolge jetzt wie überall: Empfehlung, ausdrückliche Wahl, eingeloggter Berater, zuletzt der Standard-Berater für den anonymen Direktaufruf.

**Die elf Vorschau-Kacheln tragen den Slug jetzt selbst.** `js/nav.js` hängte ihn bisher nur an Links in der Seitenleiste. Neu ist das Merkmal `data-berater-link`: damit ausgezeichnete Links auf der Seite bekommen ihn auch. Das zählt, sobald jemand so einen Link kopiert und weitergibt, denn dann gibt es keine Anmeldung mehr, aus der sich der Absender ableiten ließe.

**Geprüft und in Ordnung:** Empfängerseite, Empfehlungsformular, Finanzierungskompass, Präsentation, Dankeseite und der Promoterbereich lösen den Berater sauber auf.

**Offen und bewusst nicht angefasst:** Die KIDZ-Folgeseiten (Konzept, Elternabend, Gewinnspiel, Sommerfest) tragen kein Berater-Branding, sondern die Team-Marke mit Kais Anschrift, Telefonnummer und Mailadresse im Fuß. Sie nutzen `?berater=` nur zur Zuordnung des Leads. Das ist eine Inhaltsfrage, keine Panne, und gehört entschieden statt nebenbei umgebaut.

---



## v1.294 Beta - Phase 274 · Das Portal als App auf dem Rechner
**2026-08-17**

**Das Portal lässt sich jetzt auch am Rechner als eigene App einrichten,** mit eigenem Fenster, eigenem Symbol im Startmenü und ohne Adressleiste. Die Zutaten dafür lagen seit Phase 21 alle da (Manifest, Service Worker, Zeichen in allen Größen), es fehlten drei Kleinigkeiten, die nur am Rechner auffallen.

**Die feste Ausrichtung `portrait` ist raus.** Am Handy war sie harmlos, am Rechner schränkt sie das Fenster ein. **`launch_handler` steht auf `focus-existing`:** Wer die App ein zweites Mal startet, bekommt das vorhandene Fenster nach vorn statt eines weiteren. Dazu eine feste `id`, damit ein späterer Wechsel der Startseite nicht als zweite App gilt.

**Ein Fehler in der Sprungliste ist dabei aufgefallen:** „Neue Empfehlung" zeigte auf `/empfehlen.html`. Das ist die Seite, auf der ein **Promoter** eine Empfehlung ausspricht, nicht die, auf der ein **Berater** eine erfasst. Wer den Eintrag benutzte, landete im Kundenpfad. Jetzt zeigt er auf `dashboard/neu.html`. Die Liste hat außerdem zwei Einträge mehr: Promoter und Präsentation.

**Ein Test hält das fest** (`app-installierbar.test.mjs`): Er prüft die Installierbarkeit, ob die Zeichen wirklich liegen, wo das Manifest sie sucht, und dass kein Eintrag der Sprungliste auf eine Kundenseite zeigt. Die Präsentation ist die bewusste Ausnahme, sie ruft der Berater im Termin selbst auf.

---

## v1.294 Beta - Phase 274 · Neues Portrait von Josephine

**2026-08-17**

**Josephines Foto war auf jeder Seite zu nah dran.** Die Datei war so eng auf das Gesicht beschnitten, dass ihr Kopf im runden Rahmen und in jeder Kachel größer wirkte als bei allen anderen. Auf der Kundenseite und im Karrierecheck fiel es zuerst auf, im Portal steckte dieselbe Datei im Speicher der Berater-Fotos.

**Jetzt liegt ein einheitliches Bild im Projekt** unter `assets/images/josephine-buerger-portrait.jpg`, Kopf und Schultern vor dem Wandbild im Büro. Ihr Eintrag zeigt auf diese Datei, so wie bei Kai, Sandro und Sven auch, statt auf eine hochgeladene Datei im Speicher.

## v1.293 Beta - Phase 273 · Ein neuer Funnel ist eine Zeile

**2026-08-16**

**Ein Funnelname stand an fünf Stellen:** in der Aufnahme-Funktion der Datenbank, in der Empfehlungsliste, in der Detailansicht, auf dem Überblick und im Stylesheet. Wer einen neuen Funnel anschloss, musste alle fünf finden, und wer eine vergaß, sah in der Liste den technischen Namen statt „Depot-Krisencheck".

**Jetzt steht das an einer Stelle:** der Tabelle `funnel_quellen` mit technischem Namen, Anzeigename, Farbe und einem Schalter. Ein neuer Funnel ist eine Zeile in der Datenbank, kein Veröffentlichen. Die Farbe der Marke bringt jede Zeile selbst mit, das Stylesheet mischt die Fläche daraus; damit bleibt die Liste ruhig, egal wie viele Funnels dazukommen.

**`aktiv = false` legt einen Funnel still,** ohne seine Geschichte zu löschen: neue Leads werden abgewiesen, die alten bleiben mit ihrer Herkunft stehen.

**Damit ist der Umbau eines Funnels gefahrlos.** Inhalt, Rechner, Bilder und Thema einer Funnel-Seite lassen sich frei ändern, die Verbindung hängt nur an drei Dingen: der Datei `lead.php`, dem Quellennamen und den drei Feldnamen `name`, `email`, `phone` im Formular. Wechselt das Thema, zieht man den Quellennamen mit; alte Leads behalten den alten und bleiben dadurch sauber vom neuen Abschnitt getrennt.

---


## v1.292 Beta - Phase 272 · Auf der KIDZ-Empfehlung steht der richtige Berater
**2026-08-16**

**Josephine hat sich angemeldet, die Präsentation geöffnet, die KIDZ-Kachel angetippt, und im Rahmen sah sie Kais Gesicht.** Die Einleitungsseite, die der Empfohlene bekommt, kannte nur einen Weg zum Berater: das Empfehlungs-Token. In der Vorschau gibt es keins, also blieb das statische Portrait aus dem HTML stehen. Dasselbe galt für jeden QR-Weg ohne Token.

**Die Seite kennt jetzt drei Wege**, in dieser Reihenfolge: den Berater hinter der Empfehlung (Token), den Berater aus der Adresse (`?berater=slug`, den die Präsentation ohnehin anhängt), und den eingeloggten Berater. Dasselbe Muster fährt der Finanzierungskompass seit Phase 248. Wer kein eigenes Foto hinterlegt hat, bekommt seine Initialen, nie ein fremdes Gesicht. Der gefundene Berater wird gemerkt, damit beim zweiten Aufruf nichts mehr aufblitzt.

**Dabei gefunden:** Auf der Rückseite der Drehkarte lagen Kais Familienfoto und zwei Sätze über ihn, fest im HTML. Die hätte auch eine echte Empfehlung mit Token gezeigt, weil sie kein Branding-Merkmal trugen. Rückseite, Umschaltknopf und die Zeile „Zweifacher Vater · Über 20 Jahre Erfahrung" hängen jetzt an `data-default-berater-only` und verschwinden bei jedem anderen Berater. Impressum und Datenschutz im Fuß folgen ebenfalls dem Berater.

**Merke:** Ein `data-bb`-Merkmal im HTML nützt nichts, solange die Seite keinen Berater auflöst. Wer eine neue Kundenseite baut, muss beide Hälften mitnehmen, und die Auflösung braucht mehr als den Token-Weg, sobald die Seite auch in der Präsentation gezeigt wird.

---


## v1.291 Beta - Phase 271 · Man sieht, woher ein Kontakt kommt
**2026-08-16**

**Empfehlungen und Funnel-Leads stehen in derselben Liste, aber man verwechselt sie nicht mehr.** Jede Zeile trägt ihre Herkunft: bei einer Empfehlung den Promoter, bei einem Lead die Funnel-Seite, farbig abgesetzt. Bewusst **kein eigener Menüpunkt je Funnel**: Es ist dieselbe Arbeit mit derselben Maske, und bei fünf Funnels hätte das Menü fünf Einträge mehr. Das Sommerfest ist etwas anderes, das bleibt getrennt, weil es ein eigener Vorgang mit eigenen Feldern ist.

**Eine zweite Reiterzeile** neben dem vorhandenen „Meine / Mein Team": *Alle · Empfehlungen · Funnels*. Steht sie auf Funnels, klappt darunter die Auswahl des einzelnen auf, mit Zähler. Beide Zeilen erscheinen erst, wenn wirklich Leads da sind, sonst wäre es eine Auswahl ohne Auswahl. Die Liste der Funnels baut sich aus dem Bestand: kein Reiter für einen, der nichts geliefert hat.

**Auf dem Überblick ein Block „Woher deine Leads kommen"** mit Zahlen je Quelle im gewählten Zeitraum. Er beantwortet die Frage, welcher Funnel etwas bringt, und die lässt sich heute gar nicht stellen. Auch er bleibt weg, solange nichts aus einem Funnel gekommen ist.

**Dabei gefunden:** In der Team-Ansicht fehlte die Herkunft. `team_empfehlungen` ist eine eigene Datenbank-Funktion mit fester Spaltenliste, und die kannte die beiden neuen Spalten aus Phase 270 nicht. Jeder Funnel-Lead stand dort als „Promoter: nicht angegeben". Zwei Spalten ergänzt (`schema-phase271-herkunft.sql`), Rechte wie in Phase 198 belassen. **Merke:** Wer der Tabelle `empfehlungen` eine Spalte hinzufügt, muss prüfen, ob eine der `team_*`-Funktionen sie mitliefern muss; sie geben Spalten einzeln zurück, nicht `*`.

---


## v1.290 Beta - Phase 270 · Leads aus den Funnels landen im Portal
**2026-08-16**

**Fünf Funnel-Seiten schickten ihre Interessenten bisher nur per Mail und WhatsApp weiter.** Damit existierten diese Menschen in keinem System: kein Partner konnte sie sehen, keine Auswertung sie zählen. Die Entscheidungs-Akte vom 16.08. hat das Portal als Heimat aller Leads festgelegt (North-Star §3). Der erste Funnel hängt jetzt dran.

**Die Aufnahme sitzt in der Datenbank, nicht in einer eigenen Route.** Erster Anlauf war eine Vercel-Funktion `api/lead-intake.js`. Der Bau schlug fehl: **Vercel erlaubt im Hobby-Tarif zwölf Serverless-Funktionen, und das Portal hat genau zwölf.** Die dreizehnte kippt jedes Deployment (`exceeded_serverless_functions_per_deployment`). Also ruft der Funnel die Datenbank direkt an, und alle Prüfungen (Name, Kontaktweg, erlaubte Quelle, brauchbare E-Mail) stecken in `create_lead_public`. Weniger bewegliche Teile, und das Funktions-Kontingent bleibt frei. Merkposten für später: Wer eine neue Route im Portal braucht, muss vorher eine bestehende zusammenlegen oder den Tarif wechseln.

**Datenbank:** Die Telefonnummer ist bei einer Empfehlung nicht mehr Pflicht (`empfaenger_telefon` war NOT NULL). Grund: Funnel-Leads hinterlassen oft nur eine E-Mail und wären sonst nirgends erfassbar. Dafür kamen zwei Spalten dazu, `empfaenger_email` und `quelle`. Neue Funktion `create_lead_public` legt den Lead an; sie ist bewusst getrennt von `create_empfehlung_public`, in der die Promoter-Logik steckt, die ein Funnel-Lead nicht hat. Sie weist ab, was keinen Namen oder gar keinen Kontaktweg hat. Sicherung vor der Migration: `empfehlungen_sicherung_2026_08_16`.

**Kein stiller Verlust.** Der Funnel wertet die Antwort aus. Klappt die Aufnahme nicht, trägt die Mail an Kai den Zusatz „[NICHT im Portal]" im Betreff und im Text den Hinweis, den Lead von Hand anzulegen. Ein Lead, der unbemerkt verschwindet, ist teurer als einer, der nur per Mail kommt.

**In der Detailansicht** trägt ein Lead jetzt „Lead" statt „Empfehlung", nennt statt des Promoters die Herkunft (z. B. Altersvorsorgedepot-Check), zeigt die E-Mail-Adresse und bietet „E-Mail schreiben" an. Ohne diese Anzeige läge ein Lead ohne Telefonnummer im Portal, ohne dass man ihn erreichen könnte.

**Einzurichten ist nichts.** Sobald die neue `lead.php` auf dem Webspace liegt, laufen die Leads. Ein Schalter `$PORTAL_AKTIV` in der `config.local.php` kann die Aufnahme anhalten, dann geht wie früher nur die Mail raus und sagt es im Betreff.

---


## v1.289 Beta - Phase 269 · Was auf dich wartet, steht oben
**2026-08-16**

**Die offenen Kontakte stehen jetzt ganz oben,** direkt unter der Begrüßung. Vorher standen sie unter Kennzahlen, Team und Zeitraum, also drei Blöcke tiefer, obwohl die Begrüßung selbst schon auf sie hinweist („2 Kontakte warten auf deine Aufmerksamkeit"). Kennzahlen und Verlauf sind Rückblick, sie dürfen darunter stehen. Wartet niemand, steht dort weiterhin die ruhige Meldung, dass alles unter Kontrolle ist.

**Jede Kennzahl bekommt ihren Verlauf.** „55 Klicks, plus 52" sagt nicht, ob es gerade anzieht oder abflacht. Eine feine Linie über den gewählten Zeitraum zeigt die Richtung, ohne eine einzige Zahl mehr, mit einem Punkt auf dem heutigen Stand. Sie nutzt dieselben Zeilen, die das große Diagramm ohnehin lädt, es kommt keine Abfrage dazu. Unter vier Tagen Daten und bei durchgehend gleichem Wert bleibt sie weg, sonst wäre sie Dekoration statt Aussage. Am Handy ist sie ausgeblendet, dort ist die Kachel zu flach.

**Der Funnel-Block läuft in einer Farbe von hell nach dunkel** statt in Schwarz mit einem goldenen Ausreißer am Ende. Es ist dieselbe Menge Menschen, die auf dem Weg weniger wird, und keine vier Kategorien; die Verjüngung liest sich so auf einen Blick.

**Dabei aufgefallen:** Die Treppe „Vom Klick zum Kunden" und der Funnel-Block darunter zeigen dieselben vier Zahlen, einmal als Text mit Conversion-Angaben, einmal als Balken. Ein erster Versuch, auch der Treppe Balken zu geben, machte die Doppelung nur deutlicher und wurde wieder zurückgebaut. Einer der beiden Blöcke könnte weg, das ist eine inhaltliche Entscheidung und steht als offener Punkt.

---

## v1.288 Beta - Phase 268 · Der Beraterbereich verliert den Cremeton
**2026-08-16**

**Der Champagner-Creme ist raus, und zwar an allen Stellen gleichzeitig.** Das Portal trug im eingeloggten Bereich eine eigene Farbwelt: warmes Creme als Fläche, Champagner als Akzent, dazu vier Pastelltöne für Status (Sage, Terracotta, Burnt Orange, Marine). Der Kundenpfad war längst auf Ink, Gold und Petrol umgestellt, der Arbeitsplatz dahinter nicht.

**Neu: `css/dna.css`.** Neun Grundwerte, und jede Farbe des Beraterbereichs zeigt darauf. Die Datei wird als letztes Stylesheet geladen und überschreibt die alten Werte. Fehlt sie auf einer Seite, greift dort weiter die alte Palette aus `style.css`: die Seite ist dann creme, aber nie kaputt. So ließ sich der Umbau schrittweise ausrollen.

**610 Farbwerte standen fest im Code**, verteilt über sechs Stylesheets, und wurden auf Namen umgestellt: 476 in der ersten Runde über eine feste Zuordnungstabelle, 175 in einer zweiten für die Einzelfälle, dazu 51 weiße Flächen. Der Grund für den Aufwand: Ein reiner Variablentausch hätte den Hub fleckig gemacht, weil 38 Trennlinien, zehn Akzente und sechs Flächen ihre Farbe selbst mitbrachten.

**Aus vier Statusfarben werden zwei.** Petrol trägt alles Positive und wird dunkler, je weiter jemand im Funnel steht; Gold heißt „will etwas von dir". Die Ereignisse im Aktivitätenstrom tragen ihre Bedeutung jetzt in der Farbe und ihre Identität im Symbol, statt sieben eigene Farben zu haben.

**Der weiche Schlagschatten unter jeder Karte ist eine Haarlinie geworden**, gesetzt als innerer Schatten. Dadurch verschiebt sich kein Layout, obwohl an 48 Stellen die Kartenwirkung wechselt.

**Überschriften und Zahlen stehen jetzt in Outfit** statt in Inter, und leichter als vorher (500 statt 800). Die Schrift liegt seit der Präsentation lokal im Projekt, es kommt nichts von Google dazu.

**Zwei Fallstricke, die dabei auftraten:**
- In `css/hub.css` koppeln Selektoren wie `.h-activity-row[style*="#1A5C29"]` an Farben, die `js/hub.js` inline ins style-Attribut schreibt. Wird nur eine der beiden Seiten geändert, greift die Tönung stillschweigend nicht mehr, ohne Fehlermeldung. Beide Stellen tragen jetzt einen Hinweis aufeinander.
- Die Hover-Töne der WhatsApp-Knöpfe (`#1AAB54`, `#1EBE5A`) gehören zur fremden Marke und bleiben unangetastet, ebenso `#25D366`.

**Die vier Linien im Verlaufsdiagramm sind auf Unterscheidbarkeit geprüft** worden, auch bei Rot-Grün-Schwäche. Vier Abstufungen desselben Petrol wären durchgefallen, die Linien lagen zu dicht beieinander. Jetzt tragen sie Petrol hell, Petrol, Gold und Ink.

Nicht umgestellt sind `austragen.html` (gehört zum Kundenpfad) und der `mockups`-Ordner. Ein Dunkelmodus ist damit vorbereitet, aber bewusst noch nicht eingeschaltet: Er braucht nur einen zweiten Wertesatz in `dna.css`, keine Änderung an den anderen Dateien.

---

## v1.287 Beta - Phase 267 · Ein eigenes Zeichen für Homebildschirm und Tab
**2026-08-16**

**Das Portal hat ein eigenes Zeichen: zwei Hände, die sich greifen.** Gold auf Ink, aufgebaut auf demselben 24er Raster wie die übrigen Symbole der Seite. Vorher stand dort ein „K" in Georgia auf hellem Grund, ein Rest aus der Champagne-Zeit vor dem Umbau.

**Dabei einen Fehler gefunden, der genau das verhinderte, wofür das Zeichen da ist:** Als `apple-touch-icon` war ein SVG eingetragen, und **iOS kann dafür kein SVG**. Wer die Seite auf den Homebildschirm legte, bekam kein Zeichen, sondern einen Ausschnitt der Seite als Bild. Aufgefallen wäre das erst beim Ausprobieren.

Es gibt jetzt PNG in allen nötigen Größen (180 für iOS, 192 und 512 fürs Manifest, dazu eine maskable-Fassung mit Sicherheitsrand, in die Android hineinschneiden darf) und eine `favicon.ico` mit sechs Größen für den Browser-Tab und Verknüpfungen auf dem Rechner. Alle 33 Portalseiten binden das Zeichen ein; die KIDZ-Seiten behalten ihr eigenes.

Ein Test hält beides fest: dass kein `apple-touch-icon` auf ein SVG zeigt und dass keine ausgelieferte Seite ohne Zeichen dasteht.

---

## v1.286 Beta - Phase 266 · Regleranzeige und Bildauflösung nachgezogen
**2026-08-16**

Aus einer Durchsicht der ganzen Seite auf Handy und Rechner, zwei echte Funde:

**Der Schieberegler stand auf 8, die Anzeige daneben zeigte einen Strich.** Auf dem Handy sah das aus wie ein Fehler: Der Knopf saß sichtbar bei 8, die Bahn war bis dahin gefüllt, und daneben stand „–". Jetzt nennt die Zahl von Anfang an die Position des Reglers. Gewählt ist damit noch nichts, das passiert weiterhin erst beim Loslassen.

**Das Zwei-Konten-Modell war zu klein gespeichert.** Es lag mit 1.100 Pixeln Breite im Projekt, wurde auf einem Handy mit dreifacher Pixeldichte aber auf 1.760 Gerätepixel gestreckt und damit weich. Jetzt liegt es in der vollen Auflösung des Originals (1.548 Pixel), bei gleicher Dateigröße.

Ohne Befund geblieben: kein waagerechter Überlauf auf 390 und 1440 Pixeln, nichts ragt aus dem Fenster, alle 26 Bilder laden, und die geführte Handy-Navigation läuft sauber durch alle elf Abschnitte. Die Formel-Grafik und der Haushaltsplan bleiben leicht unter der idealen Auflösung; beide sind Bildschirmaufnahmen und in der Vorlage nicht größer vorhanden.

---

## v1.285 Beta - Phase 265 · Das Wertfeld der Geldstufen neu gesetzt
**2026-08-16**

**Der erste Anlauf für das Wertfeld sah gebastelt aus.** Zahl und Euro-Zeichen standen untereinander, und die beiden goldenen Linien darüber und darunter lasen sich wie Streichungen. Der Versuch, eine Banknote nachzuempfinden, ging daneben.

Jetzt steht der Betrag in einer Zeile, groß und in Gold, darunter in der Serif ein leises „je Stufe". Rundum ein feiner Goldrahmen auf dunklem Grund, sonst nichts. Ruhiger und wertiger als jede Nachahmung.

Geprüft wurde auch ein Foto von Geldscheinen, wie es die Bildkarten daneben haben. Es gibt kein Motiv, das zu 100 € und einer Beratung passt, ohne nach schnellem Geld auszusehen.

---

## v1.284 Beta - Phase 264 · Die Geldstufen bekommen ein Gesicht
**2026-08-16**

**Die 100-€-Stufen standen als grauer Satz zwischen den Bildkarten.** Vierzehn Stufen und zusammen 1.400 €, aber neben sechs Fotos ging die Zeile unter. Jetzt haben sie eine eigene Fläche: links der Betrag als Kachel im Format eines Scheins, rechts die Aussage und darunter die Stufennummern als Kette. So sieht man auf einen Blick, wie dicht die Geldstufen auf dem Weg liegen.

Bewusst eine eigene Gestaltung und keine Abbildung einer echten Banknote: Dafür gelten eigene Reproduktionsregeln, und ein Foto vom Geldschein hätte neben den ruhigen Karten billig gewirkt. Die Doppellinie oben und unten zitiert die Anmutung, ohne etwas nachzumachen.

**Zum Autobild:** Das Motiv kommt vom Autohaus MAHAG in München, wo das Fahrzeug der Stufe herkommt. Das steht jetzt richtig in den Bildquellen; vorher war dort nur „Bildschirmaufnahme einer Autohaus-Website" vermerkt.

---

## v1.283 Beta - Phase 263 · Autofoto ausgetauscht
**2026-08-16 · live veröffentlicht**

**Das Bild zum Auto-Meilenstein ist ausgetauscht.** Kai hat ein eigenes Motiv bereitgestellt, einen vollelektrischen Kombi. Es ersetzt das bisherige Unsplash-Foto.

Zugeschnitten auf das Fahrzeug, das Seitenverhältnis liegt bei 1,5 und damit zwischen den beiden Kartenbreiten der Reise. Der erste Zuschnitt war zu breit: In der 183 Pixel schmalen Karte blieb davon nur ein Streifen Lack übrig, in dem kein Auto mehr zu erkennen war.

Zur Herkunft steht ein offener Punkt in `assets/images/programm/BILDQUELLEN.md`.

---

## v1.282 Beta - Phase 262 · Vorschau auf den Wartungshinweis
**2026-08-16**

Der Wartungsschalter ließ sich bisher nur blind bedienen. Wer wissen wollte, was die Partner gerade sehen, musste sich abmelden oder einen zweiten Browser aufmachen. In den Einstellungen steht deshalb jetzt neben „Text speichern" der Knopf **„Vorschau ansehen"**.

Die Vorschau zeigt den Hinweis genau so, wie er draußen steht, mit einem Marine-Band darüber: „Vorschau. Genau so sehen deine Partner das Portal." Die Karte selbst bleibt dabei unverändert. Eine Vorschau, die anders aussieht als das Original, taugt nicht zum Prüfen.

Sie nimmt den Text aus den Eingabefeldern, nicht aus der Datenbank. Damit lässt sich eine neue Formulierung anschauen, bevor sie gespeichert wird. Raus geht es über das Band oder über den Knopf in der Karte; der lädt in der Vorschau nicht neu, sondern beendet sie.

Am Schalter ändert die Vorschau nichts. Sie lässt sich also auch dann öffnen, wenn das Portal gerade offen ist.

**Technisch:** `js/wartung.js` stellt `window.wartungVorschau()` bereit und versteht am Script-Tag den Marker `data-nur-vorschau`. Damit bindet die Einstellungsseite dieselbe Datei ein, ohne dass der Schirm dort von selbst aufgeht — sie ist die einzige Seite, auf der man den Schalter wieder ausmachen kann, und muss offen bleiben.

---

## v1.281 Beta - Phase 261 · Sechs Meilensteine ohne Waise in der zweiten Reihe
**2026-08-16**

**Mit dem sechsten Meilenstein ging das Raster nicht mehr auf.** Es stand auf `auto-fit` mit einer Mindestbreite von 200 Pixeln; je nach Fensterbreite landeten fünf Karten in der ersten Reihe und die sechste stand allein darunter. Jetzt sind es feste Spalten: drei ab 760 Pixel, sechs ab 1180. Bei sechs Meilensteinen geht beides glatt auf.

---

## v1.280 Beta - Phase 260 · Ein Auto deiner Wahl bei 20 Empfehlungen
**2026-08-16**

**Die Reise geht bis 20, und am Ende steht ein Auto.** Bei 20 gewonnenen Kunden: ein Auto deiner Wahl, die Kosten übernehmen wir für bis zu 24 Monate. Wert 12.000 €, damit ist es das neue Finale und löst Mallorca als letzte Stufe ab.

Die Zwischenstufen 16 bis 19 sind echte 100-€-Zeilen in der Datenbank, keine abgeleiteten. Das ist die alte Lehre aus Phase 127: Was die Oberfläche aus Lücken erfindet, kommt bei der Prämien-Synchronisation nie an. Wer 17 Kunden gewinnt, bekommt jetzt auch die Prämie für Stufe 17.

Der Gesamtwert steigt damit von 5.150 auf **17.550 €**. Er wird aus den echten Wertfeldern gerechnet, der feste Rückfallwert im HTML ist mitgezogen.

**Zum Bild:** Ein alltägliches Fahrzeug, bewusst kein Sportwagen, denn die Stufe sagt „ein Auto deiner Wahl" und nicht ein bestimmtes Modell. Der Zuschnitt endet vor der Front: Im vollständigen Foto ist das Kennzeichen des fremden Fahrzeugs lesbar. Zwei Versuche, es zu retuschieren, blieben als Kasten im Bild sichtbar; ein anderer Ausschnitt war die ehrlichere Lösung.

---

## v1.279 Beta - Phase 259 · Altbestand der alten Präsentation entfernt
**2026-08-16**

**Die alte Präsentation ist raus.** `css/programm.css` mit 6.367 Zeilen lag seit dem Umbau als Rückweg im Projekt, wurde aber von keiner Seite mehr geladen. Dazu neun Bilder, die nur noch diese Datei kannte: die Pexels-Motive der alten Fassung (`s1-vertrauen`, `s3-alltag`, `s4-kern`, `s5-leben`, `s7-aktion`) und die erzeugten Motive (`topic-allgemein-v1`, `topic-baufi-v1`, `foerder-freunde-v1`, `s4-kern-modern-v2`). In der Git-Historie liegt alles weiter.

**Dabei ein Fehler aufgefallen:** Die Prüfung der KI-Kennzeichnung las die Stile von `programm.html` noch aus der alten Datei. Sie prüft, ob der Hinweis „Mit KI erstellt" beim Video nicht nur dasteht, sondern auch gestaltet ist. Seit dem Umbau prüfte sie damit eine Datei, die die Seite gar nicht mehr lädt. Die Regel selbst war in Ordnung, der Test zeigte auf die falsche Stelle.

Aufgeräumt außerdem: drei verwaiste CSS-Blöcke aus dem Überblick (die 2027-Kachel, die Quellenzeile und die Regel für eigene Zeichnungen), die Prüfseite für die Belohnungsstufen zeigt auf die aktuelle Stildatei, und `CREDITS.md` sagt jetzt, was noch da ist und was weggefallen ist.

---

## v1.278 Beta - Phase 258 · Alle vier Themenkacheln zeigen ein Bild
**2026-08-16**

**„Ganz allgemein" war eine dunkle Fläche mit Text und viel Leerraum darunter.** Die Kachel zeigt jetzt, was sie öffnet: die Formel, die Vermögensaufbaupyramide und das Zwei-Konten-Modell als Kontaktbogen, in den Fugen dieselbe Ink-Fläche wie die Kachel selbst. Kein Stockfoto, das eine Stimmung behauptet, sondern ein Blick auf den Inhalt.

**Das KIDZ-Zeichen füllt die Kachel.** Vorher stand das Logo als kleines Quadrat mit weißem Rand mittig auf grauem Grund und wirkte wie ein Platzhalter. Das Zeichen ist jetzt aus dem Logo freigestellt und sitzt auf einer Fläche im KIDZ-Gold, das direkt aus der Datei abgetastet ist.

Damit trägt jede der vier Kacheln ein Bild, und jedes füllt seine Fläche. Der erste Anlauf hatte vier Miniaturen im Kontaktbogen, darunter den Haushaltsplan; in Kachelgröße war der nur noch Raster ohne Aussage und ist wieder raus.

---

## v1.277 Beta - Phase 257 · Aktuelle Gesetzeslage oben, Haushaltsplan im Detail
**2026-08-16**

**Was gerade gesetzlich passiert, steht jetzt ganz oben im Überblick.** Vorher war die Reform 2027 der letzte von sechs Schritten, also der Teil, den im Termin kaum jemand erreicht. Dabei ist es der einzige Punkt mit einer Frist und damit der beste Anlass für ein Gespräch.

Der Block ist dunkel abgesetzt und zeigt den Stand des Gesetzes als Zeitleiste: Bundestag am 27.03.2026, Bundesrat am 08.05.2026, Start am 01.01.2027. Dazu drei Eckpunkte (bis zu 540 € Zulage im Jahr, Riester noch bis 31.12.2026, bestehende Verträge bleiben und lassen sich kostenlos überführen) und die Quelle. Die Zahlen stammen aus der eigenen Altersvorsorgedepot-Seite, nicht aus einer Ankündigung.

**Neu dazu: der Haushaltsplan im Detail** als Schritt 03, direkt nach der Formel. Vier Bereiche, jede Position einzeln mit ihrem Betrag, darunter der Anteil am Einkommen und der Überschuss. Das ist die Stelle, an der aus einem Gefühl eine Zahl wird. Über die ganze Breite, auf dem Handy seitlich wischbar.

---

## v1.276 Beta - Phase 256 · Die zwei Karten und die fünf Wege
**2026-08-16**

**Die dunkle Karte „Empfiehl meine Beratung." war eine reine schwarze Fläche.** Neben der hellen Karte mit Foto wirkte sie leer. Jetzt liegt ein Bild unter dem Verlauf, dazu eine goldene Kante oben und der Link am unteren Rand, damit beide Karten gleich hoch stehen.

**Der Moosschriftzug an der Bürowand war oben angeschnitten.** Das Bild stand auf einer festen Höhe von 132 Pixeln, und der Ausschnitt schnitt „TEAMWORK" mitten durch. Es gibt jetzt einen eigenen Zuschnitt auf den Schriftzug, und das Bild behält sein Seitenverhältnis statt auf eine Höhe gezwungen zu werden.

**Die fünf Einstiegswege sehen aus wie auf der Karriereseite.** Statt einer nackten Aufzählung stehen dort dieselben Symbole, Namen und Sätze wie unter „Ein Team. Fünf Einstiegswege." Der Bereich klappt unter beiden Karten über die ganze Breite auf; in der schmalen rechten Spalte wäre für Symbol, Name und Satz kein Platz gewesen.

**Dabei ein Fehler gefunden:** Auf der dunklen Themenkachel „Ganz allgemein" war der Titel unsichtbar. Nicht weil die Farbe fehlte, sondern weil die allgemeine Regel im Stylesheet hinter der Sonderregel stand. Beide sind gleich spezifisch, also gewann die spätere und setzte den Titel wieder auf Ink, mitten auf die Ink-Fläche. Die Regeln stehen jetzt in der richtigen Reihenfolge, ein Test hält sie dort.

---

## v1.275 Beta - Phase 255 · Der Überblick zeigt die echten DVAG-Darstellungen
**2026-08-16 · live veröffentlicht**

**Hinter der Kachel „Ganz allgemein" stehen jetzt die echten Darstellungen aus der Beratung.** Die Formel zum finanziellen Glück, die Vermögensaufbaupyramide und das Zwei-Konten-Modell, so wie sie im Termin auch auf dem Bildschirm stehen. Vorher war das Zwei-Konten-Modell eine selbst gezeichnete Ersatzgrafik, die zwar sauber aussah, aber nichts mit dem zu tun hatte, was der Kunde später zu sehen bekommt.

Der Überblick hat damit sechs Schritte statt fünf: finanzielles Glück lässt sich planen (mit dem Rechner), die Formel dahinter, die Reihenfolge, die zwei Konten, verstehen statt vertrauen müssen, und was sich 2027 ändert.

Das Zwei-Konten-Modell läuft über die ganze Breite, weil es quer ist und von seinen Beschriftungen lebt. In der schmalen Bildspalte wäre nichts davon zu lesen gewesen. Beide neuen Aufnahmen zeigen den Musterkunden der Software; am Zwei-Konten-Bild steht deshalb dabei, dass die Beträge Beispielwerte sind.

---

## v1.274 Beta - Phase 254 · Zeichnung auf dem Wartungshinweis
**2026-08-16 · live veröffentlicht**

Der Wartungshinweis hatte oben nur ein kleines Uhrsymbol und las sich dadurch wie eine Fehlermeldung. Jetzt steht dort eine Zeichnung: das Portal selbst als Entwurf auf Millimeterpapier. Kopfleiste, Menüspalte und zwei Kacheln stehen schon, die dritte ist noch eine gestrichelte Kontur. Das sagt „hier wird gerade gebaut", ohne Warnschild.

Bewusst gezeichnet statt fotografiert. Ein Stockfoto oder ein erzeugtes Motiv wäre in diesem Editorial-Look ein Fremdkörper und riecht nach Baukasten. Die Zeichnung liegt als SVG direkt in `js/wartung.js`: sie skaliert scharf auf jedem Gerät, kostet keine zweite Anfrage und steht auch dann, wenn sonst nichts mehr lädt.

Farben aus der Palette: Ink für die Konstruktion, Champagne für Akzent und Maßlinie, Burnt-Orange für die eine Kachel, an der noch gearbeitet wird. Am Handy geprüft.

Unten steht jetzt der Absender: das Team-Wachsbleiche-Logo mit „Regionaldirektion Kai Blobel & Team" und „Deutsche Vermögensberatung". Für den kleinen Abdruck liegt eine eigene Fassung bereit (`team-wachsbleiche-marke-96.webp`, 3,9 KB statt 308 KB des Originals) — sonst lädt ein Hinweisfenster ein Drittel Megabyte für ein 48-Pixel-Zeichen.

Der Absender steht bewusst fest und wird nicht aus dem angemeldeten Berater gezogen: Das Portal betreibt die Regionaldirektion, der Hinweis kommt von ihr, nicht vom jeweiligen Partner.

---

## v1.273 Beta - Phase 253 · Apple-Produkt deiner Wahl bei 5 und 10
**2026-08-16 · live veröffentlicht**

**Stufe 5 und Stufe 10 sind jetzt frei wählbar.** Statt eines festen Geräts steht dort „Apple-Produkt deiner Wahl": bei fünf erfolgreichen Empfehlungen im Wert von 500 Euro, bei zehn im Wert von 1.000 Euro. Wer bei Stufe 5 lieber grillt als tippt, nimmt weiterhin den Weber-Gasgrill.

**Dabei ein Fehler gefunden:** Der Goldbarren auf Stufe 7 hatte gar kein Wertfeld, sein Wert stand nur im Titel. Der Gesamtwert wird ausschließlich aus den Wertfeldern gerechnet, deshalb fehlten in der angezeigten Summe 500 Euro. Jetzt trägt die Stufe ihren Wert im dafür vorgesehenen Feld.

Die Gesamtsumme steigt damit von 4.298 auf **5.150 Euro**. Sie wird aus den echten Stufen gerechnet, der feste Rückfallwert im HTML ist mitgezogen.

---


## v1.272 Beta - Phase 252 · Eigene Bilder pflegen, Skala als Schieberegler
**2026-08-16 · live veröffentlicht**

**Bürofoto und Teamfoto lassen sich jetzt selbst pflegen.** In der Berater-Verwaltung gibt es dafür einen eigenen Abschnitt mit Vorschau, Hochladen und Entfernen, dazu ein Feld für die Bildunterschrift. Bisher standen die Felder zwar in der Datenbank, konnten aber nur direkt dort gesetzt werden. Wer nichts hinterlegt, bekommt weiterhin sein eigenes Profilbild, nie das Büro eines anderen.

**Die Promoter-Vorschau in der Präsentation lief live in einen Fehler.** Sie zeigte auf eine Datei im Ordner `mockups/`, und der wird bewusst nicht mit ausgeliefert, damit Entwürfe nicht öffentlich sind. Lokal funktionierte sie deshalb, live nicht. Die Vorschau liegt jetzt als `promoter-vorschau.html` an einem Ort, der ausgeliefert wird.

**Der Abschnitt vor dem Ablauf heißt jetzt „Du empfiehlst niemanden weiter. Du stellst zwei Menschen einander vor."** Vorher stand dort „Du verkaufst nichts. Du öffnest nur eine Tür." Der Satz nahm dieselbe Sorge, brachte aber das Wort Verkaufen erst ins Spiel. Die neue Fassung beschreibt, was tatsächlich passiert.

**Auf dem Handy ist die Zufriedenheitsfrage ein Schieberegler.** Zehn Knöpfe nebeneinander sind auf einem Telefon zu klein zum sicheren Treffen. Der Regler zeigt die gewählte Zahl groß daneben; die Antwort erscheint erst beim Loslassen, damit einem beim Ziehen nicht die Seite wegscrollt. Auf dem Rechner bleiben die zehn Knöpfe, dort trifft man mit einem Klick genau die Zahl, die man meint. Beide Wege laufen über dieselbe Logik.

---


## v1.271 Beta - Phase 251 · Präsentation neu erzählt
**2026-08-16 · live veröffentlicht**

Die Präsentation hatte vierzehn Abschnitte, die alle gleich gebaut waren: kleines Label, große dünne Serif-Überschrift mit einem kursiven Wort, Fließtext, Karten, Knopf. Ab dem dritten Abschnitt liest das niemand mehr. Jetzt sind es elf Abschnitte, jeder mit eigener Form.

**Die ehrliche Frage steht am Anfang.** Vorher kam davor ein Hero mit „Du bist begeistert von unserer Zusammenarbeit?" und danach die Frage „Würdest du dich heute wieder für mich entscheiden?". Zwei Überschriften, die dasselbe sagten, und die erste nahm die Antwort vorweg. Beides ist jetzt ein Einstieg.

**Die Themenauswahl ist die Weiche im Gespräch.** Sie sitzt nicht mehr hinten, sondern mittendrin und fragt „Worüber würdest du mich weiterempfehlen?". Je nach Thema geht etwas anderes auf: Bei „Ganz allgemein" und „Staatliche Förderungen" der Rechner mit „Jetzt den Vorteil für deine Empfehlung berechnen", bei Baufinanzierung und KIDZ die fertige Seite so, wie die empfohlene Person sie bekommt, bei den übrigen ein Satz zum Weiterreden.

Damit sieht die Eurosumme aus dem Rechner nur noch, wen sie etwas angeht. Wer über Baufinanzierung oder über die Kinder empfiehlt, bekommt sie nie zu Gesicht und fragt sich auch nicht, wo denn sein eigener Anteil bleibt. Der Förderrechner ist deshalb kein eigener Abschnitt mehr.

**Überschriften laufen auf Outfit,** derselben Schrift wie die Kundenseite. Die Serif trägt nur noch das Zitat und die kleinen Kicker. Die Flächen sind neutral statt creme, Farbe kommt nur von Ink und Gold. Die Einblend-Animation beim Scrollen ist ganz entfernt.

**Jeder Berater bringt eigene Bilder mit.** Neue Felder am Berater für Bürofoto, Teamfoto und Bildzeile. Fehlt das Bürofoto, rückt das eigene Portrait nach, nie das eines anderen. Fehlt das Teambild, verschwindet es ganz.

**Schriften und Bilder liegen jetzt lokal.** Vorher lud die Seite Fraunces und Inter bei Google und sechs Alltagsbilder bei Unsplash. Im Termin standen die Kacheln bei schlechtem Netz leer, und die IP-Adresse der betrachtenden Person ging an fremde Server.

Die Belohnungsreise zeigt nur noch die fünf großen Meilensteine als Karten, die zehn Geldstufen stehen als ein Satz darüber. Vorher waren es fünfzehn fast gleiche Zeilen untereinander.

Das Stylesheet der Präsentation liegt neu unter `css/praesentation.css` und ist von 6.367 auf rund 1.700 Zeilen geschrumpft. `css/programm.css` bleibt vorerst liegen, wird aber nicht mehr geladen.

---

## v1.270 Beta - Phase 250 · Wartungsschalter für den Partnerbereich
**2026-08-16 · live veröffentlicht**

Solange am Portal gebaut wird, sollen die Partner nicht in eine halbfertige Baustelle laufen. Dafür gibt es jetzt einen Schalter in den Einstellungen, sichtbar nur für Admins. Ist er an, legt sich über Hub, Dashboard, Analysen, Teamübersicht, Prämien, Vorlagen, Potenzialbuch und Beraterkonten ein Hinweisschirm. Überschrift und Text lassen sich dort ändern, ohne dass etwas veröffentlicht werden muss.

Der Stand steht in der neuen Tabelle `portal_wartung`, einer einzigen Zeile. Lesen darf sie jeder, umlegen nur ein Admin. Das prüft die Datenbank selbst über `is_current_berater_admin()`, nicht der Browser. Offene Seiten ziehen innerhalb einer Minute nach.

Wer Admin ist, arbeitet weiter und sieht oben ein oranges Band, das an den laufenden Wartungsmodus erinnert und direkt zum Ausschalten führt. Zwei Seiten bleiben bewusst offen: die Anmeldung und die Einstellungen. Sonst sperrt man sich mit dem eigenen Schalter aus.

Nicht betroffen sind die Kundenseiten. Empfehlungslinks, Programmseite, Promoterbereich, KIDZ und die Baufinanzierung laufen weiter, damit nichts ins Leere läuft, was schon draußen ist.

Der Schirm ist eine Ansage, kein Türschloss. Wer ihn im Browser wegräumt, sieht trotzdem nur das, was die RLS ohnehin erlaubt.

---

## v1.269 Beta - Phase 249 · KIDZ heißt auch in der Präsentation KIDZ
**2026-08-16 · live veröffentlicht**

In der Präsentation und im Beraterbereich hieß das Thema weiter „Für deine Kinder" und wurde als gemeinsame Themenseite beschrieben. Der Weg führt aber längst ins KIDZ-Elternkonzept. Karte und Kachel heißen jetzt „KIDZ für Kinder", der Untertitel lautet „Kinderleicht in die Zukunft", und der Beschreibungstext sagt, was wirklich kommt: drei Grundlagen, die Rechnung zum frühen Start und der Weg zum Elternabend.

---

## v1.268 Beta - Phase 248 · Ein Weg für das Thema Kinder
**2026-08-16 · live veröffentlicht**

Beim Thema Kinder gab es zwei Ziele nebeneinander: Eine echte Empfehlung führte auf die KIDZ-Einleitung, die Vorschau in der Themenverwaltung, die Präsentation und die Schnellvorschau im Beraterbereich dagegen weiter auf die alte Themenseite. Wer geprüft hat, sah also etwas anderes als der Empfohlene.

Jetzt führt jeder dieser Wege auf dieselbe Strecke: erst die kurze KIDZ-Einleitung, dann das Konzept. Die alte Adresse `thema.html?vorlage=kinder` leitet mitsamt Empfehlungskontext dorthin weiter, so wie es beim Finanzierungskompass schon gelöst war. Ein Test bewacht das.

---

## v1.267 Beta - Phase 247 · Anschrift und Rufnummer in der Fußzeile
**2026-08-15 · live veröffentlicht**

Die Elternseite endete bisher mit zwei Zeilen ohne Kontakt. Jetzt stehen dort das Teamlogo, der volle Name der Regionaldirektion, die Anschrift An der Wachsbleiche 1a in Cottbus, die Festnetznummer und die E-Mail-Adresse. Auf Handys stehen die Blöcke untereinander.

Der Gesellschaftsname bleibt bewusst draußen. Ein Test bewacht das, weil die Elternseite anbieterneutral gehalten ist; unter dem Namen steht deshalb „Ihre Ansprechpartner in Cottbus".

---

## v1.266 Beta - Phase 246 · Krankenhausfall und schlankere Kopfzeile
**2026-08-15 · live veröffentlicht**

Der Gesetzestext bleibt abstrakt, bis man ihn an einem konkreten Tag denkt. Unter § 12 steht deshalb jetzt zuerst der Fall, der Eltern wirklich trifft: Es gibt eine spezialisierte Klinik, sie liegt zwei Stunden entfernt. Die Kasse zahlt das nächstgelegene geeignete Haus, bei freier Wahl können Mehrkosten auferlegt werden. Die Mitaufnahme eines Elternteils gilt nur als Leistung, wenn sie medizinisch notwendig ist. Behandlung durch den erfahrensten Arzt und ein ruhiges Zimmer sind Wahlleistungen.

Die Kieferorthopädie folgt danach mit derselben Logik, nur früher sichtbar. Grundlagen sind § 39 SGB V, § 11 Absatz 3 SGB V und § 29 SGB V; sie stehen mit dem Hinweis darunter, dass im Einzelfall die Krankenkasse entscheidet.

Die Kopfzeile war überladen und lief in den Terminknopf. Sie führt jetzt sechs kurze Punkte: Sommerfest, Die Idee, Grundlagen, Vermögensaufbau, § 12, Elternabend. Bei mittleren Fensterbreiten rücken Abstände und Schriftgrößen zusammen.

---

## v1.265 Beta - Phase 245 · Paragraf 12 mit dem Namen des Kindes
**2026-08-15 · live veröffentlicht**

Die Elternseite versprach bisher „bis zu 100 Prozent Erstattung für Kieferorthopädie", ohne dass irgendwo stand, warum das nötig ist. Jetzt steht davor das Gesetz selbst.

In einem roten Kasten steht der Wortlaut von § 12 Absatz 1 SGB V, dem Wirtschaftlichkeitsgebot. Darüber ein Feld für den Namen des eigenen Kindes. Wer ihn einträgt, liest: „Die Leistungen für Emil müssen ausreichend, zweckmäßig und wirtschaftlich sein; sie dürfen das Maß des Notwendigen nicht überschreiten." Drei Passagen sind hervorgehoben. Der Name bleibt im Browser der Eltern, nichts wird gesendet oder gespeichert.

Darunter in normaler Sprache, was das im Alltag bedeutet: Zahnspange erst ab den Stufen 3 bis 5, zwanzig Prozent Eigenanteil bis zum Abschluss, alles Darüberhinausgehende privat. Mit Verweis auf § 29 SGB V.

Dazu steht die goldene KIDZ-Lok jetzt über dem Vermögensaufbau. Die weiteren Waggons aus den Originalunterlagen liegen im Projekt bereit.

---

## v1.264 Beta - Phase 244 · KIDZ-Seite neu sortiert
**2026-08-15 · live veröffentlicht**

Die Elternseite hatte dreizehn Aufforderungen zum Handeln, drei Schlussteile und das stärkste Argument an sechster Stelle. Wer sie gelesen hat, wurde alle dreihundert Wörter gefragt, ob er sich vormerken möchte. Das passte nicht zum Versprechen „Sie entscheiden selbst".

Neue Reihenfolge: Einstieg, KIDZ in einem Satz, Sommerfest als schmaler Streifen, die Idee, die drei Grundlagen, der Vermögensaufbau mit der Beispielrechnung, die Möglichkeiten, die Bilderstrecke als ruhige Pause, der Elternabend, die häufigen Fragen, die Herkunft und zum Schluss die Entscheidung mit den drei Wegen.

Zwischen der Idee und dem Elternabend steht jetzt kein einziger Knopf mehr. Gefragt wird an drei Stellen statt an dreizehn. Der zweite Abschluss ist entfallen.

Das Sommerfest bleibt vollständig sichtbar, aber kompakt: Flyer, Datum, Zeit, Ort, Eintritt frei, beide Wege und der Hinweis, dass man auch ohne Anmeldung kommen kann. Alle Einzelheiten stehen weiterhin auf der Sommerfestseite.

Das Handy-Menü heißt jetzt sichtbar KIDZ-Menü, der Knopf trägt das Wort „Themen".

---

## v1.263 Beta - Phase 243 · Drehkarte, Vermögensaufbau und Handy-Menü
**2026-08-15 · live veröffentlicht**

Auf der KIDZ-Einleitung lässt sich das Porträt jetzt umdrehen. Hinter „Mehr über mich" liegen ein Bild mit den beiden Söhnen und zwei Sätze: zweifacher Vater, seit über 20 Jahren für Familien in und um Cottbus da. Ohne Bewegungswunsch des Systems wird ohne Animation umgeschaltet.

Die KIDZ-Elternseite hat einen eigenen Abschnitt Vermögensaufbau bekommen. Er zeigt in drei Schritten, was aus 55 Euro im Monat wird: 18 Jahre Eltern ergeben rechnerisch 25.008 Euro, das Kind spart bis 67 weiter und kommt auf 1.077.120 Euro statt 287.391 Euro ohne den frühen Start. Der Unterschied von 789.729 Euro steht groß daneben. Dazu ein Bild der beiden Söhne mit Blick aufs Meer und ein klarer Hinweis: Beispielrechnung mit 7,3 Prozent, keine Zusage, ohne Kosten, Steuern und Inflation.

Auf dem Handy war die Navigation bisher ausgeblendet. Jetzt öffnet ein Knopf oben rechts ein kleines Menü mit den drei Grundlagen, dem Vermögensaufbau, den Möglichkeiten, dem Sommerfest, dem Elternabend und den häufigen Fragen. Ein Tipp auf eine Grundlage springt zum Abschnitt und stellt dort gleich die passende Karte ein.

---

## v1.262 Beta - Phase 242 · Zweifacher Vater auf dem Porträt
**2026-08-15 · live veröffentlicht**

Auf der KIDZ-Einleitung trägt das Porträt jetzt zwei kurze Merkmale: „Zweifacher Vater" und „Über 20 Jahre Erfahrung". Auf einer Elternseite ist die erste Frage, ob der Gegenüber das selbst kennt; die Erfahrung ordnet danach ein.

---

## v1.261 Beta - Phase 241 · KIDZ-Einleitung gestrafft
**2026-08-15 · live veröffentlicht**

Die Einleitung duzte, die KIDZ-Seite dahinter siezt. Beim Klick wirkte das wie zwei verschiedene Absender. Die Einleitung spricht jetzt ebenfalls in der Sie-Form.

Der Text stand dreifach: in der Pille, im Fließtext und in den Karten darunter. Übrig bleibt ein Satz. Die Überschrift arbeitete mit einer Verneinung („nicht um ein Produkt") und brachte damit erst auf den Produktgedanken; sie lautet jetzt „Von Eltern zu Eltern weitergegeben. Gute Grundlagen für Ihr Kind." Das beschreibt, was gerade passiert, und behauptet nichts über die Herkunft des Konzepts.

Der Weg zum Elternabend stand gleichberechtigt neben dem Hauptweg, also bevor jemand wusste, worum es geht. Er steht jetzt als eigener ruhiger Block nach den Karten. Die Karten zeigen mit „ansehen" an, dass sie weiterführen. Auf dem Handy ist das Porträt kompakter, damit die Karten früher sichtbar werden.

---

## v1.260 Beta - Phase 240 · Drei Grundlagen als Bildkarten
**2026-08-15 · live veröffentlicht**

Auf der Einleitung vor der KIDZ-Seite standen die drei Grundlagen als drei gleich aussehende Textkacheln. Jetzt trägt jede ein eigenes Motiv aus den KIDZ-Unterlagen, eine eigene Farbe im Kopfbalken und in der Nummer sowie einen Halbsatz statt eines Absatzes.

Erklärt wird dort bewusst nichts, das macht die KIDZ-Seite selbst. Die Karten sind stattdessen anklickbar und führen ebenfalls zum Konzept, mit Token, Berater und Herkunft im Link.

---

## v1.259 Beta - Phase 239 · Einleitung vor der KIDZ-Seite
**2026-08-15 · live veröffentlicht**

Eine Kinder-Empfehlung landete direkt auf der KIDZ-Elternseite. Wer den Link öffnete, stand damit sofort mitten in der Seite; nur ein schmales Band oben erklärte, woher er kommt. Beim Finanzierungskompass gibt es dafür längst eine Einleitung, hier fehlte sie.

Neu ist deshalb eine kurze Einleitungsseite im KIDZ-Blau: Wer empfohlen hat, steht als Erstes da, danach die Botschaft in einem Satz, der Weg zum Konzept, die drei Grundlagen als Vorgeschmack und das Porträt des Ansprechpartners. Am Handy kommt zuerst die Botschaft, dann das Bild.

Token, Berater und Herkunft werden an die Folgeseiten weitergereicht, damit eine spätere Elternabend-Vormerkung beim richtigen Berater ankommt. Das Öffnen des Links wird wie bisher erfasst.

---

## v1.258 Beta - Phase 238 · Name im Empfehlungsband
**2026-08-15 · live veröffentlicht**

Im Band auf der KIDZ-Elternseite stand immer „Jemand aus deinem Umfeld", auch wenn der Name bekannt war. Der Seite fehlten die Verbindungsangaben, die Gewinnspiel- und Elternabendseite bereits laden. Jetzt steht dort der Name der Person, die empfohlen hat.

---

## v1.257 Beta - Phase 237 · Kinder-Empfehlung führt auf die KIDZ-Seite
**2026-08-15 · live veröffentlicht**

Wer über das Thema Kinder empfohlen wird, landet jetzt direkt auf der KIDZ-Elternseite. Die Themenseite war ein Zwischenschritt vor dem eigentlichen Ziel; empfohlen werden soll das Konzept selbst.

Damit die Empfehlung dabei nicht ihre Spur verliert, trägt die Elternseite jetzt zwei Dinge mit: Oben erscheint ein schmales Band mit dem Namen der Person, die empfohlen hat, und das Öffnen des Links wird wie auf den anderen Empfehlungsseiten erfasst. Wer die Seite ohne Empfehlung aufruft, sieht das Band nicht.

---

## v1.256 Beta - Phase 236 · Empfängerseite und Themenverwaltung nachgezogen
**2026-08-15 · live veröffentlicht**

Die allgemeine Empfängerseite stand noch in der alten Champagner-Welt, weil ihre Gestaltung direkt in der Seite steht und beim Umbau des Empfehler-Wegs deshalb übersehen wurde. Sie läuft jetzt auf derselben Farbwelt: kühler heller Grund, Petrol als Akzent, Gold im Fortschritt.

In der Themenverwaltung öffnete „Vorschau öffnen" für jedes Thema die allgemeine Empfängerseite. Man sah also nie die Seite, auf der eine echte Empfehlung wirklich landet. Die Vorschau zeigt jetzt das richtige Ziel: die Themenseite, bei Baufinanzierung den Kompass, bei Allgemein die Empfängerseite.

Dazu ein ehrlicher Hinweis in der Verwaltung: Überschrift, Text und Knopfziel wirken nur bei „Allgemein" und „Baufinanzierung". Alle anderen Themen beziehen ihre Inhalte aus dem Programmcode. Vorher konnte man dort pflegen, ohne dass etwas ankam.

---

## v1.255 Beta - Phase 235 · Anrede als eigener Satz
**2026-08-15 · live veröffentlicht**

Auf den Themenseiten stand der Name der empfohlenen Person mit Komma vor der Überschrift. Dadurch begann mitten im Satz ein Großbuchstabe: „Familie, Was wünschst du dir …". Der Name steht jetzt als eigener Satz davor.

---

## v1.254 Beta - Phase 234 · Kinderthema zeigt KIDZ
**2026-08-15 · live veröffentlicht**

Wer über das Thema Kinder empfohlen wird, landete bisher auf der allgemeinen Seite „Kinder & Zukunft" mit Ausbildung, Führerschein und Kindergeld. Von KIDZ stand dort nichts, obwohl die Vorlage in der Verwaltung längst auf KIDZ umgestellt war. Der Grund: Themenseiten beziehen ihre Texte aus dem Code, nicht aus der Vorlagenverwaltung, und die gepflegte Fassung wurde nie ausgespielt.

Die Themenseite heißt jetzt „KIDZ für Kinder" und führt mit der KIDZ-Idee ein: ein gutes Gefühl für Geld, Gesundheit und eine verlässliche Absicherung. Die typischen Situationen, die Auswahl und die vier Bereiche sind entsprechend neu geschrieben. Als Wege stehen die Elternseite, die Elternabend-Vormerkung und das persönliche Familiengespräch bereit.

Damit wird KIDZ bewusst schon vor dem Sommerfest am 06.09.2026 in der Empfehlungsstrecke gezeigt. Das öffentliche KIDZ-Menü auf Sommerfest- und Gewinnspielseite bleibt davon unberührt.

---

## v1.253 Beta - Phase 233 · Empfehlerbereich im App-Look
**2026-08-15 · live veröffentlicht**

Der gesamte Weg des Empfehlers hat eine neue Optik: Einstieg, persönlicher Bereich, Empfehlungsformular und Danke-Seite. Creme, Champagner, Salbei und Terrakotta sind raus. Es führt jetzt dasselbe Petrol wie auf der Kundenseite, Gold ist der Akzent auf der Hauptaktion, Weiß trägt die Karten.

Der Bereich ist für Menschen gebaut, die ihn alle paar Monate einmal öffnen. Neu ist deshalb ein Block „So läuft es ab" mit den vier Schritten in Klartext und der Angabe, wann der Empfehler zuletzt hier war. Diese Angabe liegt nur auf seinem Gerät. Ein Satz nimmt außerdem die häufigste Sorge: Kai meldet sich erst, wenn die empfohlene Person den Link selbst geöffnet hat.

Die Kürzel ZIEL, AUF, KON, TER und NEU in den Meldungen sind durch gezeichnete Symbole ersetzt. Schriftgrößen wurden angehoben, nichts steht mehr unter 11 Pixel; vorher ging es bis 8 Pixel herunter. Zustände wie „Termin abgesagt" oder „kein Interesse" erscheinen neutral statt rot, weil sie kein Fehler des Empfehlers sind. Echtes Rot bleibt dem ungültigen Zugang vorbehalten.

Geprüft mit einer als Test gekennzeichneten Empfehlerin und drei Empfehlungen in verschiedenen Zuständen, auf Handy und Rechner.

---

## v1.252 Beta - Phase 232 · KIDZ-Menü ohne Elternseite bis zum Fest
**2026-08-15 · live veröffentlicht**

Das öffentliche KIDZ-Menü auf Sommerfest- und Gewinnspielseite führt nicht mehr zur Elternseite. Das Konzept wird am 6. September vor Ort vorgestellt und erst dann breit beworben.

Die Seite selbst bleibt unter `/kidz/konzept` erreichbar, ebenso über den Beraterbereich. Nur der öffentliche Menüpunkt ist weg. Nach dem Fest reicht ein Eintrag im Menü, um ihn zurückzuholen.

---

## v1.251 Beta - Phase 231 · Sommerfest-Hinweis auf der KIDZ-Elternseite
**2026-08-15 · live veröffentlicht**

Auf der Kundenseite steht das Kinder-Sommerfest weit oben. Wer über Suche, QR-Code oder einen geteilten Link direkt auf der KIDZ-Elternseite landete, hat vom Termin nichts mitbekommen.

Gleich unter dem Einstieg steht jetzt der Flyer mit Datum, Uhrzeit, Ort und dem Hinweis auf den freien Eintritt. Von dort führen zwei Wege weiter: die vollständige Sommerfest-Seite und die Anmeldung zum Gewinnspiel. Ein Satz stellt klar, dass man auch ohne Anmeldung vorbeikommen kann. Im Kopfmenü steht „Sommerfest" als erster Punkt.

Auf dem Handy stapelt sich der Block untereinander, die Eckdaten stehen zweispaltig und beide Schaltflächen nehmen die volle Breite.

---

## v1.250 Beta - Phase 230 · Nur fertige Themen sind auswählbar
**2026-08-15 · live veröffentlicht**

In der Präsentation waren bisher alle Themenkacheln anklickbar, obwohl erst drei Themenwelten wirklich fertig sind. Wer eine der übrigen Kacheln angetippt hat, landete in der Vorschau auf der allgemeinen Förderseite. Das wirkte fertig, war aber der falsche Inhalt.

Auswählbar sind jetzt nur noch „Ganz allgemein", „Baufinanzierung" und „Für deine Kinder". Alle anderen Kacheln stehen grau, tragen den Vermerk „In Vorbereitung" und lassen sich nicht mehr anklicken. Unter der Reihe steht ein kurzer Hinweis, dass diese Themen gerade entstehen und freigeschaltet werden, sobald ihre Themenseite steht.

Freigeschaltet wird über eine einzige Liste im Code (`FREIGESCHALTETE_THEMEN` in `js/programm.js`). Kommt eine Themenseite dazu, reicht dort ein Eintrag.

---

## v1.249 Beta - Phase 229 · KIDZ im Kinderthema und im Beraterbereich
**2026-08-15 · live veröffentlicht**

Die Themenseite „Kinder & Zukunft" führt jetzt als ersten Weg auf die KIDZ-Elternseite. Wer über eine Empfehlung oder die Kundenseite dort landet, kommt damit direkt zum Elternkonzept.

Die KIDZ-Seite reicht die Beraterzuordnung an die Elternabend-Anmeldung weiter. Bisher ging sie beim Klick verloren und jede Vormerkung landete beim Standardberater. Herkunftsangaben werden dabei gegen dieselbe Liste geprüft, die auch die Anmeldung selbst erlaubt.

Im Beraterbereich unter Einstellungen steht die KIDZ-Elternseite als eigene Vorschaukachel neben den Themenseiten.

---

## v1.248 Beta - Phase 228 · KIDZ-Grundlagen mobil klar auswählbar
**2026-08-15 · live veröffentlicht**

Die drei KIDZ-Grundlagen stehen auf dem Smartphone jetzt dauerhaft als vollständige Auswahlkarten untereinander. Ein kurzer Hinweis erklärt die Bedienung. Die aktive Grundlage trägt sichtbar „✓ Ausgewählt“, alle weiteren Karten zeigen einen Pfeil und laden zum Antippen ein.

Beim Antippen wechseln Bild, Überschrift und Fragen direkt unter den Karten. Der vorherige Zieh- und Klappeffekt wurde entfernt. Auf größeren Bildschirmen bleibt die bewährte Dreierreihe erhalten.

---

## v1.247 Beta - Phase 227 · KIDZ-Kartenstapel auf dem iPhone
**2026-08-15 · live veröffentlicht**

Die drei KIDZ-Grundlagen sind auf dem iPhone kein waagerechter Slider mehr. Sie erscheinen als kompakter Kartenstapel, der beim Ziehen nach unten sichtbar auffächert und beim Ziehen nach oben wieder zusammenschließt.

Ein Griff und ein kurzer Hinweis erklären die Bewegung. Antippen öffnet den Stapel ebenfalls und wählt direkt die gewünschte Grundlage aus. Tastaturbedienung, Tablogik und die Einstellung für reduzierte Bewegung bleiben erhalten. Der normale Seitenlauf wird nur dann angehalten, wenn eine eindeutige Zugbewegung direkt auf dem Stapel beginnt.

---

## v1.246 Beta - Phase 226 · Sicherer Zugang per Einmal-Link
**2026-08-15 · live veröffentlicht**

„Mein vorhandener Bereich“ ist jetzt auf jedem Gerät erreichbar. Bestehende Empfehler fordern per E-Mail einen 15 Minuten gültigen Einmal-Link an und gelangen damit zurück in ihren persönlichen Bereich.

Der Server gibt nie preis, ob eine Adresse registriert ist. Gespeichert wird nur der Hash des Einmal-Codes. Turnstile, Beraterbezug und Mengenbegrenzungen schützen den öffentlichen Einstieg. Der Code steht im Fragment des E-Mail-Links und landet damit nicht in der angeforderten Seitenadresse.

---

## v1.245 Beta - Phase 225 · KIDZ-Konzeptseite für Eltern
**2026-08-15 · live veröffentlicht**

Die neue öffentliche Themenseite unter `/kidz/konzept` holt Eltern ohne Produktshow ab. Sie erklärt Gesundheit, Einkommensschutz und Zukunftsvorsorge mit originalen KIDZ-Unterlagen, großem Dreisäulenmodell, vollständig sichtbarer Beispielrechnung und einer Bilderstrecke mit sechs Motiven.

Gesellschaftsnamen stehen nicht im Vordergrund. Das VIP-Ticket und alle sichtbaren Inhalte sind anbieterfrei formuliert. Die persönliche Kontaktaufnahme führt in der Live-Fassung zu einem vorbereiteten WhatsApp-Gespräch, der Elternabend direkt zur vorhandenen Anmeldung. Impressum und Datenschutz sind verlinkt.

Sommerfest und Gewinnspiel verlinken die neue Konzeptseite im gemeinsamen KIDZ-Menü. Die bestehenden Veranstaltungswege, Quellenparameter und Beraterzuordnung bleiben erhalten.

---

## v1.244 Beta - Phase 224 · KIDZ-App-Symbol auf dem iPhone
**2026-08-15 · live veröffentlicht**

Sommerfest, Gewinnspiel und Elternabend melden das originale KIDZ-Konzept-Logo jetzt ausdrücklich als iPhone-App-Symbol an. Wer eine der Seiten über Safari zum Home-Bildschirm hinzufügt, sieht dort die goldene KIDZ-Marke mit Lok und den kurzen Namen „KIDZ“.

Das iPhone erzeugt die abgerundeten Ecken selbst. Inhalte, Anmeldung, Aufrufzählung und persönliche Zuordnung bleiben unverändert.

---

## v1.243 Beta - Phase 223 · Originales KIDZ-Konzept-Logo
**2026-08-14 · live veröffentlicht**

Sommerfest, Gewinnspiel und Elternabend verwenden jetzt die originale runde KIDZ-Konzept-Marke mit Lok. Das bisherige vereinfachte Zeichen ohne Lok wurde in den Kopfzeilen und als Browserzeichen ersetzt.

Die hochauflösende Originaldatei bleibt auf Rechnern klar und ist für die schmale Handykopfzeile passend verkleinert. Navigation, Inhalte, Anmeldung und persönliche Zuordnung bleiben unverändert.

---

## v1.242 Beta - Phase 222 · Strategie vor Einzelzins
**2026-08-14 · live veröffentlicht**

Der Einstieg in den Finanzierungskompass stellt jetzt den entscheidenden Unterschied zur reinen Zinssuche heraus: Nicht der günstigste Zins entscheidet. Die richtige Strategie.

Die Aussage macht klar, dass eine langfristig tragfähige Finanzierung nicht nur anhand eines einzelnen Zinssatzes beurteilt wird. Ablauf, Inhalte, Empfehlungsweg und persönliche Zuordnung bleiben unverändert.

---

## v1.241 Beta - Phase 221 · Lesbare Themenseiten
**2026-08-14 · live veröffentlicht**

Die Schaltflächen für Restschuld und Förder-Chancen behalten auf den dunklen Teasern ihren weißen Hintergrund und eine dunkle Schrift. Damit kann die allgemeine Baufi-Regel den vorgesehenen Kontrast nicht mehr überschreiben.

Kleine goldene Beschriftungen auf hellen Karten verwenden jetzt dunklere, gut lesbare Farbtöne. Auch der gemeinsame Grauton für Nebentexte wurde leicht abgedunkelt. Die Themenfarben, Inhalte, Empfehlungslogik und persönlichen Zuordnungen bleiben unverändert.

---

## v1.240 Beta - Phase 220 · Eine Leitfarbe je Themenseite
**2026-08-14 · live veröffentlicht**

Jede öffentliche Themenseite verwendet jetzt eine eigene, klar erkennbare Farbfamilie aus dem Corporate Design. Investment erscheint in Gold, Förderung in Gelb, Absicherung in Türkis, Selbstständige in Dunkelgrün, Energie in Hellgrün, Kinder in Hellblau und Karriere in Mittelblau.

Helle und dunkle Abstufungen bleiben innerhalb derselben Farbfamilie. Weiß, helles Grau und dunkle Schrift bilden die ruhige neutrale Grundlage. Die bereits freigegebenen Seiten für Baufinanzierung und Banking bleiben optisch unverändert. Inhalte, Empfehlungslogik und persönliche Zuordnungen wurden nicht verändert.

---

## v1.239 Beta - Phase 219 · Eigene Adresse für Baufinanzierung
**2026-08-14 · live veröffentlicht**

Die Kundenseite führt künftig über `finanzierung.kaiblobel.de` in den bestehenden Finanzierungskompass. Die technische Vercel-Adresse verschwindet damit aus dem sichtbaren Kundenweg.

Der Aufruf der neuen Adresse öffnet direkt die Baufinanzierungsseite mit Video. Persönliche Beraterwege, Empfehlungen, bestehende Kurzadressen und die bereits vorhandene Anwendung unter `baufinanzierung.kaiblobel.de` bleiben unverändert.

---

## v1.238 Beta - Phase 218 · Weiterempfehlen verständlich starten
**2026-08-14 · live veröffentlicht**

Der öffentliche Einstieg spricht jetzt konsequent von Weiterempfehlen statt von der internen Rolle Promoter. Überschrift, Seitentitel, Schaltfläche und Rückmeldungen erklären den Vorgang so, wie Kunden ihn verstehen.

Kundenseite, Karrierecheck und Service-App können diesen Einstieg direkt mit dem gewählten Berater öffnen. Danach bleibt der bewährte Ablauf erhalten: Thema wählen, Empfänger eintragen und einen persönlichen Link erzeugen. Datenmodell und Schnittstelle wurden dafür nicht verändert.

---

## v1.237 Beta - Phase 217 · Baufinanzierungsvideo vor dem Kompass
**2026-08-14**

Die Baufinanzierungsseite zeigt das neue 55-Sekunden-Video direkt nach dem persönlichen Einstieg und vor dem Finanzierungskompass. Der Kunde versteht dadurch zuerst, wie Marktvergleich, Förderwege, Restschuld und langfristige Planung zusammenspielen, bevor er sein Vorhaben auswählt.

Das Video startet nicht automatisch. Es besitzt ein eigenes Vorschaubild, Untertitel, normale Bedienelemente und einen direkten Übergang in den Kompass. Für die Website liegt eine auf 720p optimierte Fassung mit rund 3,8 MB vor, die beiden hochauflösenden Originalfassungen bleiben unverändert im Videoprojekt erhalten.

Der Videorahmen bleibt auf Rechner, Tablet und Handy im 16:9-Verhältnis. In niedrigen Querformatfenstern wird seine Breite zusätzlich auf rund 70 Prozent der Bildschirmhöhe begrenzt. Der Vollbildmodus zeigt das vollständige Bild ohne Beschnitt.

Die KI-Erstellung wird direkt am Video sichtbar genannt und zusätzlich als C2PA-Information in der Videodatei mitgeführt. Start und vollständiges Abspielen können als anonyme Seitenereignisse erfasst werden.

---

## v1.236 Beta - Phase 216 · Professionelle Kurzadressen und Schnellnavigation
**2026-08-14 · live veröffentlicht**

Die öffentliche Baufinanzierungsseite erhält die gut lesbare Adresse `/baufinanzierung`. Persönliche Empfehlungen werden künftig über `/empfehlung/<persönliche Kennung>` geteilt. Dateinamen, Betriebsart, Empfängername und Beraterparameter verschwinden damit aus der sichtbaren Browseradresse.

Die persönliche Zuordnung, Social-Vorschau, Öffnungsmessung, Interessensmeldung, Terminweg und Abmeldung lesen die Empfehlung weiterhin über dieselbe geschützte Kennung. Bestehende Links über `/e?token=...`, `baufi.html` und `thema.html` bleiben gültig.

Für weitere Berater steht die öffentliche Form `/baufinanzierung/<berater>` bereit. Kais Kundenseite verwendet ohne sichtbaren Zusatz direkt `/baufinanzierung`.

Beim Scrollen erscheint eine ruhige Schnellnavigation. Sie führt direkt zu Vorhaben, Bankenvergleich, Förderungen, Finanzierungsmodell und Termin. Auf dem Handy bleiben die Inhalte seitlich erreichbar, während der Termin separat sichtbar steht. Der Förderpunkt öffnet den Chancencheck unmittelbar, auch wenn vorher noch keine Situation gewählt wurde.

---

## v1.235 Beta - Phase 215 · KIDZ auf Instagram verbinden
**2026-08-14 · live veröffentlicht**

Sommerfest, Gewinnspiel und Elternabend weisen jetzt gut sichtbar auf den Instagram-Account von Team Wachsbleiche hin. Der Baustein steht jeweils nach dem Hauptinhalt und vor den Veranstalterdaten, damit er auffällt, ohne von Anmeldung und Veranstaltung abzulenken.

Der Knopf führt direkt zu `@team_wachsbleiche` und ist auf dem Handy über die volle Breite gut antippbar. Eingebettet wird nur ein normaler Link, kein Instagram-Feed. Dadurch lädt die KIDZ-Seite keine zusätzlichen Instagram-Inhalte oder Tracking-Dienste.

---

## v1.234 Beta - Phase 214 · Gemeinsamer Themenkreislauf und Baufi-Kompass
**2026-08-14 · live veröffentlicht**

Die Empfehlungsseiten und die öffentliche Kundenseite nutzen für Baufinanzierung jetzt denselben Finanzierungskompass. Persönliche Empfehlungslinks behalten Empfehler, Empfänger, Berater und Empfehlungskennung. Aufrufe von der Kundenseite starten ohne Empfehlungstext im neutralen Kundenmodus.

Der Baufinanzierungsweg beginnt mit fünf großen, nahbaren Bildkarten für Orientierung, Immobilienkauf, Neubau, Modernisierung und Anschlussfinanzierung. Danach folgen nur die Fragen, die zur gewählten Situation passen. Eine bestehende Finanzierung kann zusätzlich über einen zurückgenommenen Prüfweg eingeordnet werden.

Die Seite verbindet den persönlichen Einstieg mit Restschuld- und Fördercheck, einem echten anonymisierten Bankenvergleich, dem visuellen Vergleich von klassischer Finanzierung und geplanter Anschlusslösung sowie der Terminvereinbarung. Staatliche Förderung und Wohn-Riester bleiben sichtbar, ausführliche Zahlen sind platzsparend aufklappbar.

Die weiteren Finanzthemen besitzen ein gemeinsames Seitengerüst und sind aus Portalvorschau und Berater-Schnellvorschau erreichbar. Alte direkte Baufi-Themenadressen werden auf den zentralen Kompass weitergeführt, ohne den vorhandenen Kontext zu verlieren.

---

## v1.233 Beta - Phase 213 · Elternabend-Hinweis passend freischalten
**2026-08-13 · live veröffentlicht**

Bis zum Sommerfest bleibt nicht nur die freiwillige Elternabend-Auswahl verborgen, sondern auch der dazugehörige Datenschutzhinweis. So spricht die Gewinnspiel-Anmeldung vorher ausschließlich über Sommerfest und Gewinnspiel.

Am 6. September werden Auswahl und Erklärung gemeinsam durch dieselbe Serverfreigabe eingeblendet. Der Hinweis erklärt dann klar, dass das Interesse getrennt gespeichert, nur für eine einmalige Information verwendet und ohne Einfluss auf die Gewinnchance jederzeit widerrufen werden kann.

---

## v1.232 Beta - Phase 212 · KIDZ-Aufrufzähler
**2026-08-13 · live veröffentlicht**

Die Sommerfestseite zählt künftig echte Browseraufrufe. Vorschau-Dienste und automatisierte Browserprüfungen werden nicht mitgezählt. Wie bei einem klassischen Seitenzähler zählt ein bewusstes Neuladen als weiterer Aufruf.

Im geschützten KIDZ-Bereich stehen die Aufrufe insgesamt und die Aufrufe über einen Link mit `quelle=whatsapp` direkt neben den Teilnahmen. Gespeichert werden ausschließlich Tageszähler je Quelle und Berater. IP-Adresse, Browserkennung und einzelne Aufrufdaten werden nicht dauerhaft gespeichert.

Ein eigener Knopf kopiert den persönlichen Sommerfest-Link mit WhatsApp-Kennzeichnung. Nur so lässt sich WhatsApp zuverlässig von direkten Aufrufen unterscheiden.

Der Zähler nutzt den bestehenden KIDZ-Laufzeit-Endpunkt mit. Dadurch bleibt die Veröffentlichung innerhalb des Funktionslimits des Vercel-Tarifs.

Der Zähler beginnt mit der Veröffentlichung. Frühere WhatsApp-Aufrufe lassen sich nicht rückwirkend erfassen.

---

## v1.231 Beta - Phase 211 · Neuigkeiten-Zähler im Menü
**2026-08-12 · live veröffentlicht**

Bisher sah man erst beim Öffnen einer Seite, ob etwas passiert ist. Kommt eine Empfehlung rein oder meldet sich jemand fürs Sommerfest an, gab es kein Signal. Jetzt steht am Menüpunkt eine Zahl, wie man es von Outlook kennt.

**Drei Zähler:** Empfehlungen, KIDZ-Gewinnspiel, KIDZ-Elternabend. Sie erscheinen in der Seitenleiste, im ausgeklappten Menü am Handy und in der unteren Leiste, wo „Empfehlungen" ohnehin sitzt.

**Der Gelesen-Stand liegt in der Datenbank, nicht im Browser.** Was am Rechner gesehen wurde, ist auch auf dem Handy gesehen. Der Zähler geht auf null, sobald man die Seite öffnet, und zwar sofort, nicht erst beim nächsten Seitenwechsel.

**Zwei Regeln machen die Zahl brauchbar:**

- **Testdaten zählen nicht** (Phase 208). Ein Probelauf ist keine Neuigkeit.
- **Der Zähler zeigt, was auf der Zielseite auch zu finden ist.** Bei Empfehlungen die eigenen, bei KIDZ die eigenen und beim Admin alle, genau wie die Leseregeln dort. Eine Zahl, die man auf der Seite nicht wiederfindet, wäre schlimmer als keine.
- **Der erste Blick zählt nicht.** Wer einen Bereich noch nie geöffnet hat, startet bei null statt mit der ganzen Historie. Sonst hätte am ersten Morgen eine 7 am KIDZ-Punkt gestanden, für Anmeldungen, die längst bekannt sind.

**Zwei Arten von Zahlen, bewusst unterschieden.** Der Zähler an „Auszahlungen" ist eine wartende Aufgabe: Er bleibt, bis die Prämie ausgezahlt ist, und pulsiert deshalb. Die drei neuen sind Neuigkeiten: Sie verschwinden beim Hinsehen und bleiben deshalb still und in ruhigerem Blau. Drei gleichzeitig blinkende Pillen wären Lärm.

Nebenbei behoben: Ein Zähler verschwand bisher nie wieder, wenn seine Zahl auf null fiel. Aufgefallen ist das nie, weil das Menü bei jedem Seitenwechsel neu gebaut wird.

**Nicht gebaut:** kein Live-Hochzählen im Hintergrund. Der Zähler aktualisiert sich beim Seitenwechsel, und das reicht für den Zweck.

---

## v1.230 Beta - Phase 210 · Prämien für jeden Berater, Absender der Glückwunsch-Mail
**2026-08-12 · live veröffentlicht**

Entstanden aus einem Fehlalarm: Ich hatte gemeldet, die Stufen-Benachrichtigung ginge an den Admin statt an den zuständigen Berater. Das stimmte nicht, die Stelle war der Stufen-Rückfall aus Phase 192. Beim Nachsehen kamen aber zwei echte Punkte heraus.

**Auch der Absender der Glückwunsch-Mail ist jetzt der zuständige Berater**

Phase 192 hatte die Unterschrift nachgezogen, den Absendernamen nicht. Ein Promoter von Sven hätte eine Mail bekommen, die im Postfach von „Kai Blobel" kommt und unten mit „— Sven Augustin" endet: ein Widerspruch in derselben Mail.

Der angezeigte Name wechselt jetzt mit dem zuständigen Berater. Die Absenderadresse bleibt unverändert, sie hängt an der bei Resend verifizierten Domain. Anführungszeichen und spitze Klammern im Namen werden entfernt, sie würden die Kopfzeile der Mail zerlegen. Fehlt der Berater, greift der bisherige Rückfall.

**Prämien gehören jetzt jedem Berater, nicht nur dem Admin**

Bisher war „Auszahlungen" ein reiner Admin-Punkt: Der Menüeintrag war ausgeblendet, und wer die Seite direkt aufrief, landete zurück auf dem Überblick. Folge: Wenn ein Promoter von Sven eine Stufe erreichte, bekam **der Promoter** die Glückwunsch-Mail, **Sven erfuhr es nicht**. Nicht per Mail, nicht in einer Liste. Der Promoter wusste mehr über seinen Stand als sein eigener Berater.

Bemerkenswert dabei: Die Datenbank konnte das die ganze Zeit. Leseregel und Schreibregel lauten „eigene oder Admin", `auszahlen_praemie()` und `sync_praemien()` prüfen dasselbe, und die Belegnummern laufen ohnehin je Berater über einen eigenen Zähler. Es fehlte allein die Tür im Frontend.

Jetzt sieht und verwaltet jeder Berater die Prämien seiner eigenen Promoter, inklusive Auszahlen und Beleg. Kai sieht als Admin weiterhin alle, und die Zeile „Du siehst hier als Admin alle Prämien des Portals" erscheint entsprechend nur bei ihm. Auch der Zähler am Menüpunkt gilt jetzt für jeden, er zeigt jedem seine eigenen offenen Prämien.

Ein Test hält beides fest, damit die Tür nicht beim nächsten Umbau wieder zufällt.

---

## v1.229 Beta - Phase 209 · Anmeldeadresse sichtbar, Admin-Sicht gekennzeichnet
**2026-08-12 · live veröffentlicht**

Zwei Dinge aus derselben Frage: Warum steht in der Beraterkarte eine andere Adresse als die, mit der man sich anmeldet?

**Die Anmeldeadresse steht jetzt dabei, wo sie abweicht**

Im Portal gibt es zwei E-Mail-Felder mit zwei Aufgaben. Die eine ist die Geschäftsadresse, die Kunden sehen: Kontaktlink auf den öffentlichen Seiten, Prämienbeleg. Die andere ist die Anmeldeadresse. Verbunden sind sie über eine interne Kennnummer, nicht über die Adresse, sie dürfen also auseinandergehen.

Bei sechs von sieben Beratern sind sie identisch, weil „Login anlegen" das Konto mit der Karten-Adresse erzeugt. Bei Kai nicht, sein Konto ist das älteste und von Hand entstanden. In der Liste stand bisher nur die Karten-Adresse, dadurch sah es aus, als wäre das auch die Anmeldung.

Die Karte zeigt jetzt bei Abweichung eine zweite, leisere Zeile: „Anmeldung: …". Bei allen anderen bleibt die Karte unverändert. Groß- und Kleinschreibung gilt nicht als Abweichung, sonst hätte Max Kudlek eine gemeldet, die keine ist.

Dahinter steht eine neue Datenbankfunktion, der erste lesende Zugriff auf die Anmeldedaten überhaupt. Sie ist entsprechend eng: nur für Admins, nur Konten, die an einem Berater hängen, und nur Adressen, die tatsächlich abweichen. Was nicht abweicht, verlässt die Datenbank gar nicht erst.

**Wo die Admin-Sicht mehr zeigt, steht es jetzt dabei**

Das Admin-Recht hängt an 22 Leseregeln über 8 Tabellen. Praktisch heißt das: Von den KIDZ-Anmeldungen im Portal gehören Kai zwei, in seiner Verwaltung stehen aber alle, und die Kacheln zählen alle. Für die Festplanung ist das genau richtig. Es stand nur nirgends, und dasselbe gilt für die Prämien, sobald welche entstehen.

Auf der Prämienseite und in den beiden KIDZ-Verwaltungen steht jetzt eine dezente Zeile: „Du siehst hier als Admin alle Einträge des Portals, nicht nur deine eigenen." In den KIDZ-Verwaltungen erscheint sie nur für Admins, dort sehen normale Berater tatsächlich nur ihre eigenen. An den Leseregeln ändert sich nichts, die Sicht wird nur benannt.

**Bewusst nicht gemacht:** kein getrenntes Admin-Konto und kein zweiter Admin. Beraterkonten, Prämien und Vorlagen sind Teil des Alltags; ein Konto, in das man dafür wechseln müsste, wäre bei jeder Aufgabe ein zusätzlicher Handgriff. Und ein Rollenkonzept braucht ein Portal mit sieben Personen nicht.

---

## v1.228 Beta - Phase 208 · Testdaten sind als Test gekennzeichnet
**2026-08-12 · live veröffentlicht**

Bisher war „Test oder echt?" eine Frage der Namensgebung. Wer einen Promoter „Holger Hempel (Test)" nannte, hoffte, dass es später jemand liest. Beim Aufräumen der Demo-Welt musste am 12.08. jeder Datensatz von Hand beurteilt werden, und der Testberater war nur am Namen erkennbar. Das ist jetzt eine Eigenschaft des Datensatzes.

**Was das Kennzeichen kann**

- Beim Anlegen eines Promoters gibt es ein Häkchen „Nur zum Ausprobieren". In den Beraterkonten gibt es das Gegenstück „Testkonto".
- Das Kennzeichen vererbt sich von allein: Was einem Testberater gehört, ist Test. Was ein Testpromoter auslöst, ist Test. Auch die Prämie, die dabei automatisch entsteht.
- Wer es nachträglich setzt, zieht damit alles darunter mit. Ein Handgriff genügt.

**Drei Zusagen, die daraus folgen**

1. **Testdaten zählen in keiner Kennzahl mit.** Nicht auf der Startseite, nicht im Trichter, nicht in den Auswertungen, nicht in der Teamsicht, nicht in den KIDZ-Kacheln. Der nächtliche Schnappschuss lässt sie ebenfalls weg.
2. **Testdaten lösen keine echte Mitteilung aus.** Keine Mail an den Promoter, keine Mitteilung aufs Handy, kein Telegram. Das stand vorher nur in der Anleitung („vor jedem Test prüfen, welche Mails ausgelöst werden könnten") und hing an der Disziplin des Einzelnen. Jetzt steht es im Code, geprüft an einer Empfehlung, die auf Kunde gesetzt wurde: die Prämie entstand, die Glückwunsch-Mail nicht.
3. **Testdaten lassen sich mit einem Klick entfernen.** In den Beraterkonten steht, wie viele es gerade gibt, und ein Knopf sichert und löscht sie. Ohne Sicherung wird nichts gelöscht.

**Was sichtbar bleibt**

Testdatensätze verschwinden nicht aus den Arbeitslisten, sie tragen dort ein gestreiftes Kennzeichen. Ein Datensatz, den man selbst angelegt hat und dann nicht wiederfindet, ist schlimmer als einer, der markiert dasteht. Nur die Startseite hält sich frei, weil sie die Frage „wie läuft mein Geschäft" beantwortet.

Eine Ausnahme betrifft den wichtigsten Testfall überhaupt: Wer die Strecke mit einem echten Promoter durchspielt und die Empfehlung als Test markiert, dem soll der Promoter auf seiner eigenen Seite trotzdem zeigen, was er gerade ausgelöst hat. Beim Testpromoter zählt deshalb alles, beim echten nur das Echte.

**Damit es so bleibt**

Ein Test bewacht ab jetzt jede Abfrage auf die betroffenen Tabellen: Sie muss Testdaten entweder herausnehmen oder das Kennzeichen mitlesen. Ohne diesen Wächter wäre die alte Lage über das nächste Feature zurückgekommen.

**Nebenbei: die Versionsnummern aus den Tests genommen**

Die aktuelle Version, die Phase und die Cache-Version standen in vierzehn Testdateien fest verdrahtet, die Cache-Nummern von CSS und JS in weiteren fünfzehn. Jede Veröffentlichung brach dieselben Tests, die inhaltlich nichts damit zu tun hatten. Beides prüft jetzt eine Stelle, und zwar schärfer als vorher:

- Ob Oberfläche, Service Worker und Changelog dieselbe Phase meinen.
- Ob alle Seiten und der Service Worker für dieselbe Datei dieselbe Fassung einbinden. Diese Prüfung fand sofort zwei Stellen, an denen das auseinandergelaufen war: `js/app.js` in zwei Fassungen und die KIDZ-Admin-CSS in zwei Fassungen. Beide begradigt.
- Ein Wächter verhindert, dass eine Testdatei die Versionen wieder fest einträgt.

Dazu ein Werkzeug: `node tools/version-setzen.mjs "Titel der Phase"` zieht Version, Phase, Cache-Version und den Changelog gemeinsam hoch. Vorher waren das drei Handgriffe, von denen einer regelmäßig vergessen wurde.

---

## v1.227 Beta - Phase 207 · Vorschau lädt zum Fest ein
**2026-08-12 · live veröffentlicht**

- Die geteilte Vorschau sprach nur vom Gewinnspiel. Eingeladen wird aber zum **Kinder-Sommerfest**, das Gewinnspiel ist der Anlass, sich anzumelden. Wer die Karte in WhatsApp sah, dachte an ein Gewinnspiel statt an einen Familientag.
- Titel, Beschreibung und Bild der Gewinnspielseite stellen jetzt das Fest voran: Datum, Uhrzeit, Ort, Eintritt frei, Hüpfburg und Feuerwehr. Die Anmeldung wird als das genannt, was sie ist: eine Hilfe bei der Planung, die zugleich die Gewinnchance bringt.
- Die Sommerfest-Startseite nennt in ihrer Vorschau jetzt ebenfalls die Anmeldung, vorher stand dort nur der Termin.

---

## v1.226 Beta - Phase 206 · Vorschaubilder für WhatsApp
**2026-08-12 · live veröffentlicht**

- Beim Teilen des Links über WhatsApp erschien **kein Vorschaubild**, nur der nackte Link. Grund: Das hinterlegte Bild war 2,3 MB groß. WhatsApp lädt Vorschaubilder nur bis etwa 300 KB und ignoriert größere stillschweigend. Dasselbe galt für den Elternabend (1,07 MB).
- Dazu kam das Format: Die Motive sind im Hochformat, für eine große Vorschaukarte braucht es Querformat.
- Alle drei Seiten haben jetzt ein eigenes Vorschaubild im Format 1200 × 630, als JPEG unter 100 KB: Sommerfest, Gewinnspiel und Elternabend. Sie zeigen Titel, Datum, Ort und die wichtigsten Punkte, lesbar auch in der kleinen Vorschau.
- Ein Test hält die Maße und die Dateigröße fest, damit hier nicht wieder ein großes Motiv hineinrutscht.
- **Hinweis für die Praxis:** WhatsApp merkt sich eine einmal geladene Vorschau. Wer den Link vorher schon geteilt hat, hängt womöglich noch an der alten. Ein angehängtes `?v=2` erzwingt eine frische Vorschau.

---

## v1.225 Beta - Phase 205 · Einladungslinks auf die offizielle Adresse
**2026-08-12 · live veröffentlicht**

- „Meinen Einladungslink kopieren" baute den Link bisher aus der Adresse, über die der Berater gerade angemeldet ist. Wer über die alte Portaladresse eingeloggt war, verschickte damit auch eine alte Adresse. Der Link trägt jetzt fest `kidz.teamwachsbleiche.de`, im Gewinnspiel wie beim Elternabend.
- Das war der erste P1-Punkt aus der Prüfung vom 12.08.

---

## v1.224 Beta - Phase 204 · Wie viele kommen mit
**2026-08-12 · live veröffentlicht**

- Die Anmeldung fragt jetzt freiwillig ab, **mit wie vielen jemand kommt**. Man meldet sich mit dem eigenen Namen an und wählt dazu, wie viele Personen mitkommen; Kinder einfach mitgezählt. Ohne Angabe geht die Anmeldung wie bisher durch.
- Im geschützten Bereich steht dafür die neue Kennzahl **Erwartete Personen**, die die Begleitung mitrechnet. Sie ersetzt die Kachel „Mit Schätzung", weil für die Planung die Personenzahl zählt. Die Zahl steht auch an jeder Zeile und im CSV.
- Der Papierflyer hat dieselbe Zeile bekommen: „Wir kommen mit ___ Personen". Sonst fehlte die Angabe bei allen Vor-Ort-Anmeldungen.
- Die Nacherfassung im Portal fragt sie ebenfalls ab.
- **Der Anmeldeblock auf der Sommerfest-Startseite ist wieder eine Zeile.** Der große Kasten aus v1.223 hat den Flyer zu weit nach unten gedrückt, dabei sollte er nur daran erinnern, sich anzumelden. Jetzt: ein Satz, ein Knopf.
- Datenbankmigration `phase_204_kidz_begleitpersonen` ist angewendet. Sie ergänzt die Spalte, das Änderungsrecht für Berater und beide Registrierungswege.

---

## v1.223 Beta - Phase 203 · Anmeldung deutlicher auf der Sommerfest-Seite
**2026-08-12 · live veröffentlicht**

- Auf der Sommerfest-Startseite steht jetzt direkt unter den Eckdaten ein eigener Block: **„Du kommst? Sag uns hier nochmal Bescheid."** Er holt genau die Leute ab, die mündlich schon zugesagt haben und sich beim Link fragen, warum sie sich trotzdem eintragen sollen.
- Zwei Gründe stehen darin, beide konkret: Wir können planen (Essen, Getränke, Material), und nur wer eingetragen ist, kommt in die Verlosung der Preise.
- Der Block steht **oberhalb des Flyerbildes**, sonst sieht ihn niemand. Ein Test hält diese Reihenfolge fest.
- Der Abschnitt ganz unten heißt jetzt „Noch nicht eingetragen?" statt „Bereit für deine Gewinnchance?" und nennt beide Gründe kurz.

---

## v1.222 Beta - Phase 202 · KIDZ Ballschätzen und Nacherfassung
**2026-08-12 · live veröffentlicht**

- **Der Hauptgewinn wird nicht mehr ausgelost, sondern erschätzt.** Beim Sommerfest steht ein XXL-Ball. Wer seinen Umfang am genauesten schätzt, gewinnt Platz 1. Tombola, Losausgabe und der getrennte Vor-Ort-Weg sind aus Text, Oberfläche und Ablauf verschwunden.
- Der Hauptgewinn heißt jetzt **Survival Event**. Die Gewinnerin oder der Gewinner wählt zwischen einem Vater-Kind-Wochenende und einer ganzen Sommercamp-Woche.
- **Anmelden geht auf zwei gleichwertigen Wegen:** online oder vor Ort auf dem Gewinnspiel-Flyer. Beide führen in dieselbe Teilnehmerliste, beide nehmen an der Verlosung der weiteren Preise teil.
- **Nachgezogen:** Das Attribut `hidden` allein reichte beim Elternabend-Häkchen nicht. `.kg-check` setzt `display: grid` und gewann gegen den Browser-Standard, das ausgeblendete Häkchen blieb sichtbar. Eine eigene Regel `.kg-check[hidden]` behebt das; ein Test hält sie fest.
- **Zwei Felder der Anmeldung gehören zum Veranstaltungstag und sind vorher zu.** Das Elternabend-Häkchen ist bis zum 6. September ganz ausgeblendet: Bis dahin laden wir zum Sommerfest ein, vom Elternabend ist auf der Seite sonst nirgends die Rede, und ein Häkchen für etwas Unerklärtes wirkt untergeschoben. Am Festtag wird der Elternabend vor Ort vorgestellt, dann hat es seinen Zusammenhang.
- **Das Schätzfeld ist ebenfalls bis zum Veranstaltungstag zu, bleibt aber sichtbar.** Der Ball wird erst am 6. September gemessen, wer vorher schätzt, hat ihn nie gesehen. Bis dahin steht an dieser Stelle der Hinweis, dass die Schätzung vor Ort abgegeben wird; am 6. September öffnet das Feld von selbst. Ob der Tag da ist, entscheidet der Server, nicht die Uhr im Gerät des Besuchers.
- Zwei Schranken sichern das ab: Die Serverfunktion verwirft eine zu früh mitgeschickte Schätzung stillschweigend, ohne die Anmeldung selbst abzulehnen, und die Datenbank weist sie hart ab. Die Nacherfassung der Papierzettel bleibt davon unberührt, dort muss die Schätzung jederzeit eingetragen werden können.
- Neu im geschützten Bereich: **Zettel nacherfassen**. Die Papierzettel werden nach dem Fest über eine eigene Maske eingetippt, mit laufendem Sitzungszähler für erfasste Zettel, Dubletten und Zettel ohne Kontaktweg. Ein Zettel ohne E-Mail und Mobilnummer wird bewusst nicht gespeichert, sondern nur gezählt.
- Die Nacherfassung erkennt eine bereits vorhandene Online-Anmeldung als Dublette, weil der Dublettenschlüssel zeichengleich zur öffentlichen Anmeldung gebildet wird. Zusätzlich wird gegen E-Mail und Mobilnummer im Klartext geprüft, falls Zettel und Online-Anmeldung verschiedene Kontaktwege tragen.
- Ein normaler Berater erfasst nur für sich selbst, Kai als Administrator für jeden. Die Datenbank bleibt die Rechteinstanz: Das Portal-Token des Beraters wird an die Datenbank durchgereicht.
- Teilnehmerliste, Kennzahlen und CSV-Export zeigen die Schätzung, den Erfassungsweg und lesbare Quellenbezeichnungen. Neuer Filter: nur Vor-Ort-Zettel.
- Die Teilnahmebedingungen stehen in Fassung **2026-08-12-v5**. Sie benennen beide Anmeldewege, die Schätzregel, die Wahl beim Hauptgewinn und den Losentscheid bei gleich guten Schätzungen.
- Promoter-Auswahl aktualisiert: **Anika Biebrach** ist deaktiviert, **Anja Scholz** (zählt für Sven Augustin) und **Sandra Röhrens** (zählt für Claudius Tusche) sind neu. David Stamm bleibt unverändert.
- Die Datenbankmigrationen sind angewendet: `phase_192_kidz_schaetzung_nacherfassung` (Datei `schema-phase200.sql`) und `phase_199_kidz_schaetzfenster` (Datei `schema-phase200-schaetzfenster.sql`). Die Migrationsnamen stammen aus einer früheren Nummerierung, weil parallel weitere Phasen auf `main` gelandet sind. Sie ergänzt die Schätzspalten, lässt Fassung 5 zu, legt den Nacherfassungsweg an und stellt die Promoter um. Sie muss vor der Veröffentlichung des Codes laufen; die bisherige Fassung 4 bleibt dabei gültig, es entsteht also kein Ausfallfenster.

Offizielle Live-Version: **v1.218 Beta** · Prämien, Benachrichtigungen und Führungslinie, live seit 12.08.2026.

Offizielle Live-Version: **v1.219 Beta** · Teamsicht in Promoter- und Empfehlungsliste, live seit 12.08.2026.

---

## v1.219 Beta - Phase 199 · Teamsicht in Promoter- und Empfehlungsliste
**2026-08-12 · live veröffentlicht**

Anlass war ein Praxisfall direkt nach dem Livegang von v1.218: Sandro hatte gestern
einen echten Promoter angelegt (Johannes Kobbe), und Kai konnte ihn im Portal nicht
finden. Grund war der Befund P2·1 aus dem Prüfbericht: Die Leseregel auf den Promotern
lautet schlicht „gehört mir", ohne Admin-Vorbehalt. Wer selbst keinen Promoter hat,
sieht eine leere Liste, obwohl das Team welche hat.

- **Umschalter „Meine" und „Mein Team"** in der Promoterliste und in der
  Empfehlungsliste. Er erscheint nur bei Führungskräften, also wenn wirklich jemand
  unter einem hängt. Wer niemanden führt, bekommt keinen Knopf, der dasselbe zweimal
  zeigt.
- In der Teamsicht steht neben jedem Eintrag, **zu welchem Berater er gehört**.
- Fremde Einträge sind sichtbar, aber **nicht anklickbar**: Die Detailseite fände sie
  wegen der Leseregel ohnehin nicht und liefe in eine leere Ansicht.
- Die Auswahl bleibt je Gerät gemerkt.

**Was ausdrücklich nicht passiert ist:** Die Leseregeln auf den Tabellen bleiben eng
auf die eigenen Daten. Hätte man sie für den Ast geöffnet, zählte jede Kachel im
Portal plötzlich das ganze Team mit, und jede Zahl bekäme eine andere Bedeutung. Die
Teamsicht ist ein bewusster Umschalter in der Liste, keine neue Grundregel. Der Ast
kommt über die Datenbankfunktionen `team_promoter` und `team_empfehlungen`, die über
`mein_team()` begrenzt sind.

Die **Teamübersicht** unter `/team.html` bleibt wie in Phase 196 datensparsam und zeigt
weiter nur Zahlen. Prämien und KIDZ-Anmeldungen des Astes bleiben ohne Namen, solange
sie niemand braucht.

Nachtrag zur Datenbank: **Phase 198** hat die anonymen Ausführungsrechte der in den
Phasen 192 bis 197 neu angelegten Funktionen entzogen. Beim Anlegen einer Funktion im
Schema `public` vergibt Supabase automatisch EXECUTE an `anon`, und ein
`revoke ... from public` entfernt das nicht. Die revoke-Zeilen sahen richtig aus und
haben nichts bewirkt. Ausnutzbar war nichts, weil alle betroffenen Funktionen an der
Anmeldung hängen, aber `team_promoter` und Geschwister waren damit für angemeldete
Berater gesperrt und für anonyme Aufrufer offen. Genau verkehrt herum.

**Phase 197** macht den Coach je Berater in der Beraterverwaltung pflegbar, auch beim
Anlegen. Kreise in der Führungslinie weist die Datenbank ab (Trigger
`berater_pruefe_fuehrungslinie`). Zuvor ging die Zuordnung nur per SQL.

---

## v1.218 Beta - Phase 192 bis 196 · Prämien, Benachrichtigungen und Führungslinie
**2026-08-12 · live veröffentlicht**

Aus der vollständigen Prüfung des Portals im Echtbetrieb (Bericht: `docs/PRUEFUNG-2026-08-12.md`).
Alle drei kritischen Befunde hatten dieselbe Wurzel: Das Portal war als Werkzeug für einen
einzigen Berater gebaut und an mehreren Stellen nie vollständig auf mehrere umgestellt worden.

**Prämien und Stufen-Mail sind jetzt eine Fachlogik (Phase 192)**
- Bisher fand `sync_praemien_for_empfehler` die Belohnungsstufen nur unter Kais Berater-ID. Für jeden anderen Berater entstand still keine Prämie, während der Trigger die Glückwunsch-Mail trotzdem an den Promoter verschickte. Ein Promoter bekam also eine schriftliche Zusage über eine Belohnung, die im Portal nicht existierte.
- Ein Helfer `private.belohnungs_stufen_fuer()` beantwortet die Frage „welche Stufen gelten hier" an genau einer Stelle: eigene Stufen des Beraters, sonst das geteilte Set des Admins. Prämien-Abgleich und Stufen-Mail benutzen ihn beide.
- Die Prämie entsteht jetzt **vor** der Mail, und die Mail geht nur raus, wenn es die Stufe wirklich gibt.
- Mit abgedeckt: eine direkt mit Status „Kunde" angelegte Empfehlung erzeugte bisher **auch bei Kai** keine Prämie, weil der Prämien-Trigger nur an UPDATE hing.
- Der Prämien-Abgleich ist für anonyme Aufrufer nicht mehr ausführbar.

**Benachrichtigungen erreichen den richtigen Empfänger**
- `notify-interesse` (v9) las die Push-Anmeldungen ohne jeden Filter. Name, Beruf, Anrufwunsch und Empfehler eines Leads wären an **jedes** im Portal angemeldete Gerät gegangen. Jetzt nur an den zuständigen Berater; ohne auflösbare Zuordnung wird gar nichts verschickt.
- Der Telegram-Sammelkanal nennt jetzt den zuständigen Berater. Bisher stand nirgends, um wessen Lead es geht.
- `notify-stufe` (v3) unterschreibt mit dem zuständigen Berater statt pauschal mit „Kai Blobel" und löst die Stufe mit demselben Rückfall auf wie die Datenbank.

**Der Berater geht auf dem Weg zur Empfehlung nicht mehr verloren**
- Der Fußbereich der Programmseite verlinkte „Empfehlung aussprechen" ohne jeden Parameter. Ein Kunde, dem Sven seine Seite zeigte, landete auf einer als Kai gebrandeten Seite, und seine Empfehlung wurde Kai zugeordnet.
- Die Programmseite reicht den Berater-Slug jetzt an alle Links auf die Empfehlungsseite weiter, ohne einen vorhandenen Promoter-Code zu überschreiben. Der aufgelöste Berater zählt außerdem beim Speichern, nicht mehr nur fürs Aussehen.

**Kennzahlen gehören dem Berater (Phase 194)**
- `kpi_snapshots` hatte keine Berater-Spalte. Der nächtliche Schnappschuss zählte das gesamte Portal in eine Zeile pro Tag, und jeder Berater sah neben seiner eigenen Zahl einen Trend und eine Kurve über alle sieben. Beides ist jetzt je Berater.
- Die Historie der letzten 30 Tage wurde aus den echten Anlagedaten zurückgerechnet. Die Leseregel auf der Tabelle lautete bisher schlicht `true`.

**Die Führungslinie greift jetzt auch beim Bestand (Phase 195/196)**
- Bisher wirkte sie nur in den vier Team-Funktionen. In der Teamübersicht zeigt die Detailansicht jetzt Promoter, Empfehlungen, Prämien und KIDZ-Anmeldungen des eigenen Astes.
- Ausdrücklich **ohne Namen und Kontaktdaten**: Die Teamseite ist seit Phase 141 datensparsam, und eine Zahl in der Oberfläche mit Namen in der Antwort wäre nur scheinbar sparsam. Ob eine Führungskraft die Namen ihres Astes sehen darf, ist eine offene Datenschutzentscheidung; bis dahin gilt die engere Auslegung.
- Damit ist auch die Ungleichheit behoben, dass der Admin bei Prämien und KIDZ alles sah, bei Promotern und Empfehlungen aber nicht.
- Die Leseregeln auf den Tabellen bleiben eng auf die eigenen Daten. Würden sie den Ast freigeben, zählte jede Kachel im Portal plötzlich das ganze Team mit.

**Selbstregistrierung kann kein Beraterkonto mehr übernehmen (Phase 193)**
- Der Trigger `link_auth_user_to_berater` verknüpfte jeden frisch registrierten Auth-Nutzer mit einem Berater gleicher E-Mail. Da die öffentliche Registrierung offen steht, hätte sich in der Lücke zwischen „Berater angelegt" und „Login erzeugt" jemand dazwischenschieben können.
- Er greift jetzt nur noch für eingeladene oder vom Admin angelegte Konten. Beide Einrichtungswege laufen unverändert.

**Datenbestand**
- Die Demo-Welt vom 11.08. ist entfernt: 30 Promoter, 58 Empfehlungen, 12 Prämien und 80 KIDZ-Testanmeldungen. Vollständig gesichert im nicht exponierten Schema `archiv`, Tabelle `backup_demowelt_20260812`.
- Ein Demo-Promoter bleibt bewusst stehen: an „Holger Hempel (Test)" hängt eine echte Empfehlung vom Vormittag des 12.08. Der Datensatz wurde nicht angefasst.

**Geprüft**: 71 Prüfungen grün. Die Prämien-Reparatur wurde in einer Transaktion gegen die Live-Datenbank gefahren und zurückgerollt. Die Führungslinie ist für jede Ebene einzeln nachgewiesen: Kai sieht 7 Berater, Sven 3, Sandro 2, Max 1, und die eigenen Kennzahlen jedes Beraters bleiben unverändert seine eigenen.

---

## v1.217 Beta - Phase 191 · Exklusiver KIDZ-Elternabend
**2026-08-12 · live veröffentlicht**

- Neue eigenständige Informationsseite **„Exklusiver KIDZ-Elternabend“** mit der Unterzeile **„Der exklusive Eltern-Workshop für Familien“**. Sie ist bewusst nicht im öffentlichen Sommerfest-Menü verlinkt.
- Die eigene Vormerkung fragt nur die erwachsene Kontaktperson, einen Kontaktweg, den bevorzugten Zeitraum, eine freiwillige Familienfrage und optional die einladende Person ab. Angaben zu Kindern werden nicht erhoben.
- Die Elternabend-Vormerkung ist technisch und inhaltlich von Gewinnspiel, Kundenanfrage und allgemeiner Werbeeinwilligung getrennt.
- Ein eigener, geprüfter QR-Code führt direkt auf `https://kidz.teamwachsbleiche.de/kidz/elternabend?quelle=elternabend-qr`. Ein eigenes Vorschaubild sorgt beim Teilen in WhatsApp und sozialen Netzwerken für einen hochwertigen Auftritt.
- Im Empfehlungsportal entsteht unter **KIDZ > Elternabend** ein eigener Arbeitsbereich mit Kennzahlen, Suche, Statusführung, CSV-Export und Live-Aktualisierung neuer Vormerkungen.
- Berater und Promoter werden wie beim Gewinnspiel zugeordnet. Admins sehen alle Berater und Promoter, normale Berater ausschließlich ihre nach den Datenbankrechten freigegebenen Vormerkungen.
- Die Datenbankmigration `phase_191_kidz_elternabend` ist aktiv. Sie enthält eine eigene Tabelle, strikte Zeilenrechte, eine geschützte öffentliche Registrierung, Missbrauchsschutz und die Live-Aktualisierung für den Portalbereich.
- Die Schreibweise **Anika Biebrach** ist korrigiert. Ihre Zuordnung zu Sven Augustin und der bestehende technische Schlüssel bleiben unverändert, damit ältere Links und Zuordnungen weiter funktionieren.
- Kai hat die Veröffentlichung ausdrücklich freigegeben. PR 51 wurde auf Produktions-Commit `1d771db` zusammengeführt. Vercel-Produktion `dpl_A8HxcuuhnPG6b5cLkTauvn3igXrU` ist `READY`.
- Live geprüft: Informationsseite, Formular, QR-Bild, Vorschaubild, Sicherheitskonfiguration und Beraterliste antworten mit Status 200. Der QR-Code ist identisch mit der zuvor technisch ausgelesenen Datei. Eine ungültige Registrierung wird kontrolliert mit Status 400 abgewiesen; im Produktionsfehlerprotokoll wurden keine Laufzeitfehler gefunden. Alle 61 Prüfungen sind grün.

---

## v1.216 Beta - Phase 190 · KIDZ-Teilnahme vereinfacht
**2026-08-12 · live veröffentlicht**

- Jede gültige Online-Anmeldung nimmt einmal an der Verlosung der weiteren Preise teil.
- Der Hauptgewinn wird davon getrennt beim Sommerfest über eine Tombola verlost. Jede volljährige Person vor Ort erhält ein Los und wirft es selbst ein.
- Nummerierte Doppel-Lose, Losnummern und die Zuordnung eines Vor-Ort-Loses zu einer Online-Anmeldung entfallen vollständig aus dem sichtbaren Ablauf.
- Anmeldung, Bestätigung, Sommerfest-Seite, Teilnahmebedingungen und interner KIDZ-Arbeitsbereich verwenden dieselbe einfache Erklärung.
- Die Teilnahmebedingungen verwenden die neue Fassung `2026-08-12-v4`. Die Datenbankmigration `phase_190_kidz_teilnahme_einfach` ist angewendet und lässt diese Fassung kontrolliert zu.
- Bestehende Datenbankfelder und ältere Einträge werden nicht gelöscht. Die alte Losnummer-Funktion bleibt technisch unangetastet, ist aber im neuen Arbeitsablauf nicht mehr sichtbar.
- Die zwei vorhandenen KIDZ-Teilnahmen blieben unverändert. Neue Teilnahmen werden mit Fassung 4 gespeichert.
- Kai hat die Veröffentlichung ausdrücklich freigegeben. PR 49 wurde auf Produktions-Commit `e5b7d3c` zusammengeführt.
- Vercel-Produktion `dpl_B8MiXB3P9j1CVTXTWWWgYb8mUJ1P` ist `READY` und trägt die offiziellen Adressen einschließlich `kidz.teamwachsbleiche.de`.
- Live geprüft: Sommerfest, Gewinnspiel und Konfiguration antworten mit Status 200. Fassung 4, Tombola-Erklärung und der einfache Vor-Ort-Schritt sind sichtbar; alte Nummernhinweise fehlen. Alle 32 Testdateien mit 60 Prüfungen sind grün, im Produktionsfehlerprotokoll wurden keine Fehler gefunden.

---

## v1.214 Beta - Phase 188 · KIDZ-Veranstalterlogo
**2026-08-12 · live veröffentlicht**

- Das freigegebene petrol-goldene Team-Wachsbleiche-Logo ergänzt den Veranstalterbereich auf Sommerfest-Startseite und Gewinnspiel-Anmeldung.
- Das Logo steht kompakt neben dem vollständigen Veranstaltertext. KIDZ bleibt die führende Marke im Kopfbereich.
- Die vier wichtigsten Veranstaltungsdaten werden auf der Sommerfest-Startseite mit eigenen hochwertigen SVG-Symbolen für Datum, Uhrzeit, Ort und kostenlosen Eintritt aufgewertet.
- Die Symbolkarten haben eine klare Beschriftung, abgestimmte KIDZ-Farben und bleiben auf dem Handy in einem ruhigen Zweiersystem lesbar.
- Auf dem Handy wird der Fußbereich ruhig untereinander angeordnet; Adresse und Veranstaltungsort bleiben vollständig lesbar.
- Gewinnspiel, QR-Code, Herkunftsparameter, Beraterzuordnung und Datenbank bleiben unverändert.
- Kai hat die Veröffentlichung ausdrücklich freigegeben. PR 47 wurde auf Produktions-Commit `242ca47` zusammengeführt.
- Vercel-Produktion `dpl_AUgNRdJavizw7o91vJarZre7TAEu` ist `READY` und trägt die offiziellen Adressen einschließlich `kidz.teamwachsbleiche.de`.
- Live geprüft: Sommerfest und Gewinnspiel antworten mit Status 200, das neue Teamlogo wird auf beiden Seiten ausgeliefert und alle vier SVG-Symbole antworten als Bilddateien. v1.214 und Phase 188 sind sichtbar. Alle 32 Testdateien sind grün; im Produktionsfehlerprotokoll wurden keine Fehler gefunden.

---

## v1.213 Beta - Phase 187 · KIDZ-Adminfilter & einheitliches Menü
**2026-08-11 · live veröffentlicht**

- Kai erhält als Administrator im KIDZ-Arbeitsbereich einen gemeinsamen Filter mit „Alle Berater und Promoter“.
- Die Auswahl ist in „Vermögensberater“ und „Promoter“ gegliedert und enthält auch Personen ohne bisherige KIDZ-Teilnahme.
- Claudius Tusche erscheint als eigener Vermögensberater. Anika Biebrach und David Stamm bleiben als eigenständige Promoter auswählbar, obwohl ihre Teilnahmen intern Sven beziehungsweise Claudius zugeordnet werden.
- Normale Berater sehen weiterhin nur ihren eigenen, durch die Datenbank geschützten Bestand und erhalten keine teamweite Auswahl.
- Es ist keine Datenbankänderung erforderlich. Die bestehende öffentliche, kontrollierte KIDZ-Auswahlliste wird wiederverwendet.
- Sommerfest-Startseite und Gewinnspiel-Anmeldung verwenden dasselbe feste KIDZ-Menü mit den Punkten „Sommerfest“, „Gewinne“ und „Anmeldung“.
- Der Unterschied kam aus zwei getrennt gebauten Kopfbereichen und nicht aus dem QR-Code. Der vorhandene QR-Code bleibt unverändert gültig.
- Berater- und Herkunftsparameter werden beim Wechsel über das gemeinsame Menü erhalten.
- Kai hat die Veröffentlichung ausdrücklich freigegeben. PR 45 wurde auf Produktions-Commit `12c5c00` zusammengeführt.
- Vercel-Produktion `dpl_7WqqCVQuihfUTYvfcbVgQnBqxzwY` ist `READY` und trägt die offiziellen Adressen einschließlich `kidz.teamwachsbleiche.de`.
- Live geprüft: einheitliches Menü auf Sommerfest und Anmeldung, Erhalt von `quelle=vor-ort-qr` und `berater=claudius-tusche`, Auswahl von Claudius Tusche, Anika Biebrach und David Stamm, v1.213 und Phase 187. Alle 32 Testdateien sind grün; im Produktionsfehlerprotokoll wurden keine Fehler gefunden.

---

## v1.212 Beta - Phase 186 · KIDZ-Promoterzuordnung
**2026-08-11 · live veröffentlicht**

- In der Auswahl „Wer hat dich eingeladen?“ stehen zusätzlich **Anika Biebrach** und **David Stamm**.
- Anika wird intern Sven Augustin zugeordnet. David wird intern Claudius Tusche zugeordnet.
- Die Teilnahme speichert neben dem zuständigen Vermögensberater auch den ausgewählten Promoter. Dadurch bleibt im KIDZ-Arbeitsbereich und im CSV-Export nachvollziehbar, über wen der Kontakt entstanden ist.
- Öffentliche Promoter-Codes werden weder an den Browser noch über die Auswahlliste ausgegeben.
- Claudius war beim Livegang bereits als aktives Beraterkonto mit Login vorhanden und wird unverändert als Ziel verwendet.
- Die Supabase-Migrationen `phase_186_kidz_promoterzuordnung` und `phase_186_kidz_promoterzuordnung_index` sind angewendet. Die zwei vorhandenen KIDZ-Teilnahmen blieben unverändert. 31 von 31 Testdateien sind grün.
- Kai hat die Veröffentlichung ausdrücklich freigegeben. PR 43 wurde auf Produktions-Commit `a282dbb` zusammengeführt.
- Live geprüft: Seite und öffentliche Beraterliste antworten, Anika, David und Claudius werden ausgeliefert, v1.212 und Phase 186 sind sichtbar, Turnstile ist konfiguriert und im Produktionsfehlerprotokoll wurden keine Laufzeit- oder 5xx-Fehler gefunden.

---

## v1.211 Beta - Phase 185 · KIDZ-Sommerfest-Startseite
**2026-08-11 · live veröffentlicht**

- Die Hauptadresse `kidz.teamwachsbleiche.de` beginnt künftig mit dem normalen Sommerfest-Flyer.
- Danach folgt die ausführliche Gewinnübersicht. Erst im dritten Schritt führt die Seite zur Gewinnspiel-Anmeldung.
- Die bekannten QR-Codes und der direkte Pfad `/kidz/gewinnspiel` bleiben unverändert und öffnen weiterhin sofort die Anmeldung.
- Herkunft und Beraterzuordnung werden beim Wechsel von der Sommerfest-Seite zur Anmeldung sicher mitgenommen.
- Das Vorschaubild für geteilte Links der Hauptadresse ist der normale Sommerfest-Flyer.
- Kai hat die Veröffentlichung ausdrücklich freigegeben. PR 41 wurde auf Produktions-Commit `029032a` zusammengeführt.
- Vercel-Produktion `dpl_9NdHqhGYjq5f5Ckvq9hyhsi7hdif` ist `READY` und trägt alle vier öffentlichen Aliase einschließlich `kidz.teamwachsbleiche.de`.
- Live geprüft: Root leitet mit Herkunft und Berater auf `/kidz/sommerfest`, die drei Abschnitte stehen in der richtigen Reihenfolge, der Sommerfest-Flyer antwortet mit 436.647 Bytes und das Vorschaubild zeigt auf den normalen Hauptflyer. `/kidz/gewinnspiel` liefert weiterhin direkt Formular und Turnstile-Konfiguration. v1.211 und Phase 185 sind live, 68 von 68 Portalprüfungen sind grün und im Produktionsfehlerprotokoll wurden keine Fehler gefunden.

---

## v1.210 Beta - Phase 184 · KIDZ-Flyer und Linkvorschau
**2026-08-11 · live veröffentlicht**

- Die korrigierte Gewinnspiel-Rückseite ist als zweite Seite neben dem normalen Sommerfest-Flyer eingebunden. Beide Seiten können einzeln angesehen und heruntergeladen werden.
- Die neue Rückseite bleibt vollständig im 3:4-Format sichtbar. Der Fußbereich mit KIDZ, Kostenhinweis und Veranstaltungsort wird nicht mehr abgeschnitten.
- Die öffentliche KIDZ-Seite enthält feste Open-Graph- und Twitter-Metadaten. WhatsApp, Facebook und weitere Vorschau-Dienste erhalten damit Bild, Titel und Beschreibung direkt aus dem HTML-Kopf.
- Das Vorschaubild liegt öffentlich unter `/assets/images/kidz-sommerfest-gewinnspiel-v2.png` und entspricht technisch exakt der freigegebenen OneDrive-Fassung.
- Anmeldung, Sicherheitscheck, Datenbank, Teilnehmende, Losnummern und Beraterzuordnung bleiben unverändert.
- Veröffentlichung über PR 39 auf Produktions-Commit `ac3da90`. Vercel-Produktion `dpl_GTTCuTPwP51g14X329YRhRreYu8R` ist `READY` und trägt die offizielle Teamadresse.
- Live geprüft: Root leitet mit Status 307 auf `/kidz/gewinnspiel`, v1.210 und Phase 184 sind sichtbar, beide Flyerseiten sind vorhanden und der Browser meldet keine Fehler. Ein Abruf mit WhatsApp-Kennung erhält Titel, Beschreibung und die öffentliche PNG-Adresse. Die Live-Grafik hat 2.384.998 Bytes und stimmt per SHA256 exakt mit der OneDrive-Fassung überein. Alle 67 Portalprüfungen sind grün.

---

## v1.209 Beta - Phase 183 · KIDZ-Flyermenü
**2026-08-11 · live veröffentlicht**

- Die öffentliche Gewinnspielseite erhält oben ein kleines KIDZ-Menü mit direktem Sprung zur Anmeldung und Zugriff auf den normalen Sommerfest-Flyer.
- Der vollständige Flyer öffnet sich in einer ruhigen, bildschirmfüllenden Ansicht und kann heruntergeladen werden.
- Auf dem Handy bleibt die Kopfzeile kompakt. Der Flyer passt sich an die verfügbare Höhe und Breite an, ohne abgeschnitten zu werden.
- Gewinnspiel, Teilnahmebedingungen, bestehende Anmeldungen und Beraterzuordnung bleiben unverändert.
- Veröffentlichung über PR 37 auf Produktions-Commit `e03b090`. Vercel-Produktion `dpl_EHHTn3wgyjETyzv7GLNRVo3NjFnw` ist `READY`.
- Live geprüft: Menü, Flyeransicht, Download, v1.209 und Phase 183 sind über die öffentliche Teamadresse erreichbar. Der Flyer antwortet als JPEG mit 436.647 Bytes; alle 67 Portalprüfungen sind grün.

---

## v1.208 Beta - Phase 182 · Geschützte KIDZ-Teilnehmerverwaltung
**2026-08-11 · live veröffentlicht**

- Die drei ausdrücklich als Test angelegten Teilnahmen wurden vollständig aus der Produktionsdatenbank entfernt. Es sind keine KIDZ-Testteilnahmen mehr vorhanden.
- Löschen ist künftig nur für Kai als Administrator möglich. Normale Berater können keine Teilnahmen mehr direkt löschen.
- Statt eines auffälligen Löschknopfs gibt es die zurückhaltende Funktion „Teilnahme verwalten“ mit Pflichtgrund und endgültiger Bestätigung.
- Zulässige Gründe sind Testeintrag, Dublette und Löschwunsch der teilnehmenden Person.
- Vorhandene Namen, Kontaktwege, Referenzen und Losnummern werden beim Löschen nicht in ein Archiv kopiert. Das Prüfprotokoll speichert nur Grund, Zeitpunkt, Los-vorhanden-Kennzeichen und eine nicht rückrechenbare Prüfsumme.
- Die Aufbewahrungsfrist ist technisch abgesichert: KIDZ-Sommerfest-Daten werden ab dem 1. Januar 2027 automatisch bereinigt.
- Veröffentlichung über PR 35 auf Produktions-Commit `0821827`. Vercel-Produktion `dpl_HnvFxafxFgfSKH7F9Fx7t4j38HLs` ist `READY`.
- Die angemeldete Produktionsansicht zeigt v1.208, vier Kennzahlen mit jeweils null Teilnahmen und keine Browserfehler. Der Löschdialog ist technisch vorhanden und erscheint nur bei vorhandenen Einträgen für Administratoren.

---

## v1.207 Beta - Phase 181 · KIDZ-Hauptadresse
**2026-08-11 · live veröffentlicht**

- `kidz.teamwachsbleiche.de` ist die offizielle KIDZ-Adresse von Team Wachsbleiche.
- Der Root-Aufruf führt per hostgebundener Weiterleitung zuverlässig zur Gewinnspielregistrierung und bewahrt vorhandene Herkunfts- und Beraterparameter.
- `kidz.kaiblobel.de` bleibt als Reserveadresse bestehen und wird einschließlich Pfad und Parametern auf die offizielle Team-Adresse weitergeleitet.
- Das Cloudflare-Turnstile-Widget erlaubt die offizielle Team-Adresse. Die Reserveadresse wird bereits vor dem Sicherheitscheck weitergeleitet.
- Keine Änderungen an Anmeldungen, Teilnahmebedingungen, Gewinnen, Losnummern oder Beraterzuordnungen.

## v1.206 Beta - Phase 180 · KIDZ-Wunschadresse vollständig angebunden
**2026-08-11 · live veröffentlicht**

- `kidz.teamwachsbleiche.de` führt auch ohne zusätzlichen Pfad zur KIDZ-Gewinnspielregistrierung.
- DNS, Vercel-Zuordnung und HTTPS-Zertifikat wurden für die neue Adresse eingerichtet.

## v1.205 Beta - Phase 179 · Bonusverlosung und Hauptgewinn-Los
**2026-08-11 · live veröffentlicht**

- Die Online-Anmeldung ist jetzt eine echte Teilnahme an der Bonusverlosung und keine bloße Vormerkung mehr.
- UCI Kinogutscheine, Tierpark-Jahreskarte und weitere bezeichnete Sachpreise werden unter den gültigen Online-Anmeldungen verlost.
- Das nummerierte Doppel-Los am Eingang schaltet zusätzlich die Chance auf das Survival Sommercamp als Hauptgewinn frei.
- Eine neue Zwei-Schritte-Erklärung macht den Unterschied auf großen und kleinen Bildschirmen sofort verständlich.
- Teilnahmebestätigung, Fehlermeldungen, interne Übersicht und CSV-Ausgabe verwenden durchgehend die neue Trennung.
- Die Teilnahmebedingungen wurden auf Fassung `2026-08-11-v3` angehoben. Bestehende Anmeldungen und Losnummern bleiben erhalten.
- Die additive Datenbankanpassung `phase_179_kidz_bonus_hauptgewinn` ist angewendet. Die vorhandenen zwei Anmeldungen und zwei Losnummern blieben unverändert.
- Veröffentlichung über PR 30 auf Produktions-Commit `de40640`. Vercel-Produktion `dpl_BfgKMdeHFziTs2L1XzNLeAuAm5V9` ist `READY`.
- `kidz.kaiblobel.de` und die bestehende Portaladresse wurden auf Rechner und Handy geprüft: neue Texte sichtbar, kein seitliches Überlaufen und keine Browserfehler.

## v1.204 Beta - Phase 178 · KIDZ-Rootadresse
**2026-08-11 · live veröffentlicht**

- `https://kidz.kaiblobel.de` führt zuverlässig zur KIDZ-Gewinnspielregistrierung.
- Der Root-Aufruf nutzt eine hostgebundene Weiterleitung, weil Vercel die vorhandene Portal-Startdatei vor einer bedingten Umschreibung ausliefert.
- Andere Portaladressen, bestehende QR-Links, Anmeldungen und vorhandene Daten bleiben unverändert.

## v1.203 Beta - Phase 177 · KIDZ-Wunschadresse
**2026-08-11 · live veröffentlicht**

- Die öffentliche KIDZ-Gewinnspielseite ist zusätzlich unter `https://kidz.kaiblobel.de` erreichbar.
- Die Startseite dieser Subdomain führt direkt zur Gewinnspielregistrierung. Bestehende Pfade und QR-Adressen bleiben unverändert erreichbar.
- Cloudflare verwendet dafür ausschließlich den kostenlosen DNS-Eintrag `A kidz.kaiblobel.de 76.76.21.21` im Modus `DNS only`. Der All-Inkl-Tarif und alle übrigen DNS-Einträge bleiben unverändert.
- Keine Änderungen an Anmeldungen, Vor-Ort-Losen, Beraterzuordnung, Teilnahmebedingungen oder vorhandenen Daten.

## v1.202 Beta - Phase 176 · KIDZ-Logo bereinigt
**2026-08-11 · live veröffentlicht**

- Die vereinfachte Lok-Nachzeichnung wurde entfernt, weil sie nicht dem freigegebenen Original entspricht.
- Das Zeichen zeigt bis zur Übernahme einer echten Originaldatei ausschließlich den goldenen Kreis mit dem weißen KIDZ-Schriftzug.
- Seitenkopf und Browser-Tab-Symbol verwenden dieselbe bereinigte Marke.
- Keine Änderungen an Gewinnspiel, QR-Adresse, Anmeldungen, Beraterzuordnung oder vorhandenen Daten.
- Veröffentlichung über PR 26 auf Produktions-Commit `88cad0d`. Vercel meldet `dpl_6Sthko7MFbxCeHpfseEZLJtqt6Ju` als READY; Live-Seite, bereinigte Logo-Datei und v1.202 antworten mit Status 200, die visuelle Live-Prüfung war fehlerfrei.

## v1.201 Beta - Phase 175 · KIDZ-Markenlogo
**2026-08-11 · live veröffentlicht**

- Das echte goldene KIDZ-Zeichen mit Wagen ersetzt den bisherigen blauen Textplatzhalter in der öffentlichen Gewinnspielseite.
- Der Zusatz „Konzept“ entfällt. Das Zeichen steht auch als Browser-Tab-Symbol zur Verfügung.
- Die spätere Adresse `kidz.teamwachsbleiche.de` ist im Portal vorbereitet. Sie wird erst nach einem sicheren DNS-Wechsel aktiviert; die bestehende QR-Adresse bleibt bis dahin unverändert erreichbar.
- Keine Änderungen an Gewinnspielanmeldungen, Beraterzuordnung, Vor-Ort-Losen oder vorhandenen Daten.
- Veröffentlichung über PR 24 auf Produktions-Commit `43f9acd`. Vercel meldet `dpl_CgsQaEooGG3g3A5y9SP91jHYK7D5` als READY; Live-Seite, Logo-Datei und v1.201 antworten mit Status 200, die visuelle Live-Prüfung war fehlerfrei.
- Vercel kennt `kidz.teamwachsbleiche.de` bereits als Alias. Der erforderliche DNS-Eintrag ist bei All-Inkl im aktuellen Tarif gesperrt; deshalb wurde keine riskante Nameserver- oder Tarifänderung vorgenommen.

## v1.200 Beta - Phase 174 · KIDZ-Vor-Ort-Los
**2026-08-11 · live veröffentlicht**

- Die Online-Anmeldung ist jetzt eindeutig als Vormerkung bezeichnet. Sie allein begründet noch keine Gewinnspielteilnahme.
- Die Teilnahme entsteht erst durch persönliche Anwesenheit am 6. September 2026, Ausgabe genau eines nummerierten Loses und Einwurf des Losabschnitts in die physische Lostrommel.
- Die geschützte KIDZ-Übersicht führt die Losnummer und den Ausgabezeitpunkt. Eine Losnummer kann pro Veranstaltung nur einmal vergeben und nach der Ausgabe nicht mehr geändert werden.
- Die Auslosung erfolgt ausschließlich aus der Lostrommel. Die gezogene Nummer wird anschließend im geschützten Portal der registrierten Person zugeordnet.
- Facebook, Instagram und WhatsApp sind als getrennte Herkunftswege vorbereitet. Gewinnspielteilnahmen bleiben weiterhin getrennt von Promotern, Empfehlungen und Kunden.
- Die Teilnahmebedingungen wurden auf Fassung `2026-08-11-v2` angehoben. Bestehende Vormerkungen bleiben erhalten.
- Veröffentlichung über PR 22 auf Produktions-Commit `1644e8e`. Vercel meldet `dpl_3zqxw6UKWX8rVXUmzLxkY6ESu5d6` als READY; Live-Seite, Herkunftswege und v1.200 antworten mit Status 200.

## v1.199 Beta - Phase 173 · Veranstalter und Veranstaltungsort getrennt
**2026-08-11 · live veröffentlicht**

- Die Regionaldirektion wird mit ihrer eigenen Anschrift „An der Wachsbleiche 1a, 03046 Cottbus“ geführt.
- Die Kutzeburger Mühle bleibt klar als Veranstaltungsort mit „Kutzeburger Mühle 1, 03051 Cottbus“ gekennzeichnet.
- Teilnahmebedingungen und Seitenfuß trennen beide Angaben eindeutig, damit die Veranstaltungsadresse nicht wie die Geschäftsanschrift wirkt.
- Veröffentlichung über PR 20 auf Produktions-Commit `ae7bdab`. Vercel meldet `dpl_HvfrCqnnZjKWYpRY5RCW8fssaHAQ` als READY; die Live-Seite und v1.199 antworten mit Status 200.

## v1.198 Beta - Phase 172 · KIDZ-Gewinnspiel
**2026-08-11 · live veröffentlicht**

- Die mobile Gewinnspielseite ist das feste Ziel für QR-Codes am Kinder-Sommerfest und auf Einladungen.
- Erwachsene Teilnehmende tragen nur Namen und einen Kontaktweg ein. Angaben zu Kindern werden nicht erhoben.
- Der einladende Vermögensberater kann freiwillig ausgewählt oder über einen persönlichen Link vorbelegt werden. Ohne Auswahl wird Kai Blobel zugeordnet.
- Gewinnspielteilnahmen bleiben in einem eigenen, geschützten Bestand und werden nicht automatisch als Empfehlung, Kunde oder Promoter angelegt.
- Die geschützte KIDZ-Übersicht zeigt Teilnahmen, Herkunft, Elternabend-Interesse und Beraterzuordnung. Persönliche Einladungslinks lassen sich direkt kopieren.
- Turnstile, serverseitige Plausibilitätsprüfung, gehashte Drosselungsmerkmale und zeilenbasierte Zugriffsregeln schützen die öffentliche Anmeldung.
- Veröffentlichung über PR 18 auf Produktions-Commit `692b4f2`. Vercel meldet den Produktionsbau `dpl_GmWR8F6qggTRKCsQdEA5KESNcS2H` als READY.

## v1.197 Beta - Phase 171 · Potenzialbuch-Bedienung
**2026-08-10 · live veröffentlicht**

- Suche, Kontaktstärke, Prozessstatus und Kreise sind in einem gemeinsamen Bedienbereich
  zusammengeführt. Kontaktstärke bleibt direkt sichtbar, Prozessstatus und Kreise liegen ruhig
  unter „Weitere Filter“.
- Kontaktkarten sind kompakter und wachsen nur noch mit ihrem tatsächlichen Inhalt. Dadurch sind
  auf einem Bildschirm mehr Kontakte sichtbar.
- Jede Karte hat eine klare Hauptaktion. Die Cockpit-Verbindung bleibt als zurückhaltende
  Nebenaktion erhalten.
- Mobil stehen die vier Kennzahlen in einer kompakten Zeile. Der Kontaktbereich beginnt dadurch
  deutlich früher, ohne dass Kennzahlen verloren gehen.
- Kontaktdaten und Kreise liegen mobil unter „Details“. Die Cockpit-Verbindung bleibt über das
  Drei-Punkte-Menü erreichbar, damit Hauptaktion und nächster Kontakt im Vordergrund stehen.
- Ein kurzer Hinweis erklärt das seitliche Wischen durch die Kontaktstärken. Relevante Tippziele
  sind mobil mindestens 44 Pixel hoch.
- Fehlt ein Folgetermin, führt „Nächsten Kontakt planen“ direkt zum Datumsfeld des Kontakts.
- Keine Änderung an Datenbank, RLS, Cockpit-Verbindung, Kontakt-Coach oder gespeicherten Daten.
- 66 von 66 Portaltests bestanden. Die echte angemeldete Live-Seite wurde bei 2000, 390 und
  375 Pixeln ohne seitliche Überbreite oder Browserfehler geprüft. Vercel-Produktion ist READY.

---

## v1.196 Beta - Phase 170 · Kontakt-Coach
**2026-08-09 · live veröffentlicht**

- Kontakte lassen sich frei per Sprache oder Text beschreiben. Die Aufnahme wird nur zur
  Umwandlung verarbeitet und danach verworfen. Audio und Rohtranskript werden nicht in der
  Datenbank gespeichert.
- Die Auswertung befüllt eine Kontrollansicht. Name, Kontaktdaten, Beziehung, gemeinsame
  Geschichte, Lebenssituation und Interessen bleiben vor dem Speichern vollständig änderbar.
- Sichere Fakten, Vermutungen und die eigene Unsicherheit des Beraters werden getrennt
  gehalten. KI-Ausgaben werden nie still als Kundenfakt übernommen.
- Für nicht verbundene Potenziale entsteht ein persönlicher Gesprächskompass mit natürlichem
  Einstieg, offenen Fragen, Hinweisen auf vorschnelle Themen und einem guten nächsten Schritt.
- Nach dem Telefonat kann das Ergebnis erneut gesprochen oder getippt werden. Status,
  Wiedervorlage und Notiz werden erst nach einer zweiten Kontrollansicht aktualisiert.
- Bereits mit dem Berater-Cockpit verbundene Personen bleiben dort geführt. Die bestehende
  Trennung jedes Beraters über erzwungenes RLS und explizite Tabellenrechte bleibt bestehen.
- Serverseitige KI-Route mit Portal-Loginprüfung, gleichursprünglichen Aufrufen, strikten
  Antwortstrukturen, deaktivierter OpenAI-Speicherung und begrenzten Audiodaten.
- 65 automatisierte Portalprüfungen bestanden. Der vollständige Ablauf ist mit erfundenen
  Kontakten am Desktop und bei 390 Pixeln ohne Browserfehler oder seitliche Überbreite geprüft.
- Migration `phase170_potenzialbuch_kontaktcoach` ist in Produktion angewendet. RLS bleibt
  aktiv und erzwungen, vier Berater-Policies bleiben bestehen, `anon` hat keine Tabellenrechte.
- Vercel-Produktion ist `READY`. Live geprüft: Potenzialbuch, Coach-Helfer und Konfiguration
  antworten mit 200, v1.196 ist sichtbar und ein Coach-Aufruf ohne Anmeldung wird mit 401
  abgewiesen. Offen bleibt der echte eingeloggte Mikrofon-Praxistest.

## v1.195 Beta - Phase 169 · Cockpit-Verbindung
**2026-08-09 · live veröffentlicht**

- Ein Berater verbindet ein Potenzial bewusst mit dem Cockpit. Dort kann er eine über exakt
  gleiche Telefonnummer oder E-Mail gefundene eigene Akte nutzen oder einen neuen
  Interessenten anlegen.
- Ein gleicher Name allein reicht nie für eine Verbindung. Potenzialpartner werden weiterhin
  nicht in die Kundenakte übernommen.
- Die Portal-Anmeldung wird vom Cockpit selbst validiert. Die feste Beraterzuordnung entsteht
  serverseitig; fehlende oder doppelte Zuordnungen brechen ohne Änderung ab.
- Die Verbindung wird nur für ein aktives und vollständig eingerichtetes Cockpit-Konto
  freigeschaltet. Ohne Konto oder Freigabe bleibt sie sichtbar, aber ausgegraut und mit
  „Demnächst“ gekennzeichnet. Auch ein direkter API-Aufruf wird dann abgewiesen.
- Nach der Verbindung führt das Cockpit Interessent, Kunde und Altkunde. Das Potenzialbuch
  zeigt diesen Stand an und öffnet die fest verbundene Kundenakte.
- Die lokale Portal-Route reicht nur eine kleine erlaubte Nutzlast und den Portal-Zugriffstoken
  weiter. Keine Beraterkennung aus dem Browser wird akzeptiert.
- Die Kundenakte öffnet immer in der zum API-Ziel gehörenden Umgebung. Eine Staging-Verbindung
  springt nicht versehentlich in das Live-Cockpit.
- 58 Portalprüfungen bestanden. Die Cockpit-Gegenseite besteht 841 Tests sowie Typ-
  und Lintprüfung. Die Vorschau ist bei 1440 und 390 Pixeln ohne Browserfehler oder seitliche
  Überbreite geprüft.
- Die Cockpit-Migration ist auf Staging und Produktion angewendet. RLS, Statushistorie,
  gesperrter Beraterwechsel und die Rechte des Funktionswegs wurden dort geprüft.
- Live-Zuordnung: Kai Blobel und Josephine Bürger sind eindeutig freigeschaltet. Berater ohne
  eingerichtetes Cockpit-Konto oder Freigabe sehen die Verbindung ausgegraut und können sie
  auch über einen direkten Aufruf nicht verwenden.
- Vercel-Produktion ist `READY`. Live geprüft: Seite und Programmmodul antworten mit 200,
  Version v1.195 ist aktiv und die Route weist einen Aufruf ohne Anmeldung mit 401 ab.
- Offen bleibt der echte eingeloggte Praxistest mit einem freigeschalteten und einem
  gesperrten Beraterkonto.

## v1.194 Beta - Phase 168 · Kontaktstärke
**2026-08-09 · live veröffentlicht**

Das Potenzialbuch ordnet Kontakte zusätzlich nach der tatsächlichen Beziehungsstärke.

- Mehrere Kreise pro Person, unter anderem Familie, Freundeskreis, Schulzeit, Ausbildung,
  Arbeit, Nachbarschaft, Verein oder Hobby und flüchtige Alltagsbekanntschaften.
- Automatische Einstufung als kalt, lauwarm, warm, heiß oder sehr heiß aus Kreisen,
  Beziehungsnähe, Kontakthäufigkeit und direkter Erreichbarkeit. Ohne Kontaktweg bleibt ein
  Eintrag kalt. Eine bewusste manuelle Korrektur bleibt möglich.
- Fünf ruhige Symbole von Schneeflocke bis Flamme, sichtbare Begründung auf jeder Karte und
  Filter nach Kontaktstärke sowie mehreren Kreisen gleichzeitig.
- Additive Migration `schema-phase168.sql`; bestehende freie Umfeldangaben bleiben erhalten.
  Keine Verbindung zu Empfehlungen, Promotern, Prämien, Benachrichtigungen oder Kennzahlen.

Live geprüft: Migration `phase168_potenzialbuch_kontaktstaerke` angewendet, fünf Spalten und
vier Regeln gültig, GIN-Index bereit. RLS bleibt aktiv und erzwungen. `anon` hat keine
Tabellenrechte, angemeldete Berater weiterhin nur Lesen, Anlegen, Ändern und Löschen.
18 von 18 Potenzialbuch-Tests grün, Vercel-Produktion `READY`, Service-Worker aktiv auf
`v153-2026-08-09b`.

## v1.193 Beta - Phase 167 · Potenzialbuch
**2026-08-09 · live veröffentlicht**

Ein eigener, privater Denk- und Arbeitsbereich für Menschen, die später Kunde oder Partner
werden könnten. Die Datenbankmigration ist angewendet und die Seite im Portal-Menü aktiv.

- **Schnell eintragen und angenehm weiterarbeiten:** Ein Name reicht zum Start. Telefon,
  E-Mail, Umfeld, Ziel, Notiz, Status und nächster Kontakt können sofort oder später ergänzt
  werden. Suche, Statusfilter, Dublettenwarnung und ruhige Kontaktkarten halten die Seite
  leicht bedienbar, auch auf dem iPhone.
- **Bewusste Cockpit-Übergabe:** Kontaktdaten werden erst in einer Kontrollansicht geprüft,
  dann kopiert und das Berater-Cockpit geöffnet. Erst nach der manuellen Interessentenanlage
  bestätigt der Berater die Übernahme im Potenzialbuch. Es gibt keinen direkten Schreibweg
  in die Cockpit-Datenbank.
- **Klare fachliche Grenze:** `potenziale` ist eine eigene Tabelle mit RLS je Berater. Die
  Einträge fließen nicht in Empfehlungen, Promoter, Prämien, Champions, Momentum,
  Benachrichtigungen oder Kennzahlen ein. Anonyme Zugriffe erhalten keine Rechte.

Live geprüft: `schema-phase167.sql` und der anschließende Rechte-Nachzug sind angewendet.
RLS ist aktiv und erzwungen. Anonyme Rollen haben keine Tabellenrechte, angemeldete Berater
nur Lesen, Anlegen, Ändern und Löschen. Service-Worker aktiv auf `v152-2026-08-09a`.

## v1.192 Beta - Phase 166 · Sicherheits-Nachzug
**2026-08-09 · live veröffentlicht**

Ein Sicherheits-Kassensturz nach dem mobile-first-Umbau. Drei Punkte behoben, ein vierter
liegt bei Kai (ein Schalter im Supabase-Dashboard).

- **Cockpit-Brücke: festes Klartext-Geheimwort raus.** Die vier Funktionen `cockpit_neue_promoter`,
  `cockpit_empfehlungen`, `cockpit_promoter` und `cockpit_ensure_empfehler` trugen dasselbe
  Passwort im Klartext im Datenbank-Code. Jetzt wird nur noch ein SHA-256-Hash in
  `private.integration_secrets` verglichen (dasselbe Muster wie `register_empfehler_public`).
  Der akzeptierte Wert bleibt derselbe, das Cockpit läuft unverändert weiter, das Wort ist
  aber nicht mehr aus dem Funktionsquelltext lesbar und ab jetzt **wechselbar ohne Code-Migration**.
  Live geprüft: richtiges Wort liefert Daten, falsches wird abgewiesen, kein Klartext mehr in
  den vier Funktionen. (DB-Migrationen `phase166_cockpit_bridge_hashed_secret`.)
- **`stufe_notifications`: weite anonyme Schreibrechte zurückgenommen.** Die Tabelle gab
  anonymen und angemeldeten Nutzern auf dem Papier volle Schreibrechte; nur die Zeilensicherung
  hielt dagegen. Die legitimen Schreiber (ein Trigger als Eigentümer, die Edge-Funktion mit
  Dienstschlüssel) sind davon nicht betroffen. (Migration `phase166_lock_stufe_notifications_grants`.)
- **Interne Dateien nicht mehr auf der Kundenseite.** Neue `.vercelignore`: die
  `schema-phase*.sql`, `tests`, `docs`, `mockups` und die internen Projektdateien (`CLAUDE.md`,
  `AGENTS.md`, `README.md`, `RESTORE.md`, …) werden nicht mehr mit ausgeliefert. `CHANGELOG.md`
  bleibt bewusst erreichbar, weil `changelog.html` sie zur Laufzeit lädt.

Keine Änderung an Kunden-, Berater- oder Empfehlungsdaten. Service-Worker `v151-2026-08-09d`.

## v1.191 Beta - Phase 165 · Portal mobile-first
**2026-08-09 · live veröffentlicht**

Kais Blick aufs iPhone: Das Portal (der eingeloggte Berater-Bereich) war nicht durchgängig
mobile-first. Ein Audit über alle 14 Portal-Seiten bei 390x844 mit realistischen Testdaten
fand vier Schwachstellen — die Präsentation und die Rechner-Ansicht am Desktop blieben
unangetastet, alles Neue lebt hinter Media-Queries für kleine Bildschirme.

- **„Warten auf dich" (Übersicht) stapelt jetzt:** Avatar und Text nehmen die volle Breite,
  WhatsApp- und Aktionsknopf rutschen in eine eigene Zeile darunter. Vorher teilten sich
  alle vier EINE Zeile und lange Namen brachen senkrecht um — die gequetschteste Stelle
  des ganzen Portals.
- **Bottom-Navigation auf dem Handy (bis 767px):** Überblick, Empfehlungen und Promoter
  sitzen fest am unteren Rand, „Mehr" öffnet das vollständige Menü (denselben Drawer wie
  der Hamburger). Bisher war jede Navigation ein Hamburger-Umweg; der Code versprach die
  Leiste seit Phase 13 im Kommentar, gebaut war sie nie. Safe-Area berücksichtigt, der
  Seiteninhalt bekommt Luft über der Leiste.
- **Empfehlungsliste:** Status-Pillen werden nicht mehr abgeschnitten („ANRUFWUNS…") —
  die Pille wird kleiner und zeigt das ganze Wort.
- **Teamübersicht:** Die kleinen Einordnungen an den Kennzahlenkarten („aus diesen Empf…")
  dürfen umbrechen statt abzuschneiden.
- Kennungen `dashboard.css?v=49`, `hub.css?v=53`, `nav.js?v=58` auf allen Portal-Seiten,
  Service-Worker `v150-2026-08-09c`. Keine Daten- oder Funktionsänderung.

## v1.190 Beta - Phase 164 · Mobile Führung: volle Seiten, weichende Leiste
**2026-08-09 · live veröffentlicht**

Kais Rückmeldung direkt vom Handy nach dem v1.189-Start: Beim freien Scrollen stand die
Leiste im Weg, und Weiter zeigte manche Abschnitte nur angeschnitten.

- **Jeder Abschnitt füllt in der Führung mindestens den Bildschirm.** Weiter zeigt damit
  immer eine komplette Seite, nichts ragt vom nächsten Thema herein. Kürzere Abschnitte
  zentrieren ihren Inhalt, längere (Rechner, Themen, Belohnungs-Reise, Video) wachsen
  darüber hinaus und scrollen normal. Die zwei randlosen Grid-Flächen (Tür-Botschaft,
  Förder-Rechner) und der Zufriedenheits-Abschnitt ordnen ihren Inhalt weiter selbst.
- **Beim Scrollen mit dem Finger weicht die Leiste nach unten** und kommt zurück, sobald
  das Scrollen etwa eine Drittelsekunde ruht. Bei Sprüngen über Zurück/Weiter bleibt sie
  bewusst stehen — sonst verschwände sie unter dem Daumen, der gerade klickt.
- Kennungen auf `programm.css?v=90` / `programm.js?v=50`, Service-Worker `v149-2026-08-09b`,
  neue Zusicherungen im Test `praesentation-mobile-gefuehrt`.

## v1.189 Beta - Phase 163 · Geführte mobile Präsentation
**2026-08-09 · live veröffentlicht** (vorbereitet auf `codex/mobile-praesentation-gefuehrt`, nach Kais Freigabe auf main übernommen)

Auf dem Handy wird die Kundenpräsentation jetzt geführt statt frei gescrollt. Desktop und
Tablet bleiben in Darstellung und Bedienung unverändert — alles Neue lebt hinter einer
Media-Query bis 767 Pixel und einer Körperklasse, die das Skript nur auf kleinen
Bildschirmen setzt.

- **Feste Führung am unteren Rand:** Zurück · Fortschritt („2 von 14") · Weiter. Auf dem
  letzten Abschnitt heißt der Knopf **Fertig** und kehrt zum Einstieg zurück. Zurück ist
  auf dem ersten Abschnitt gesperrt. Echte Buttons, aria-Labels, Fortschritt mit aria-live,
  iPhone-Safe-Area berücksichtigt. Solange die Führung aktiv ist, sind Sticky-CTA,
  Hero-Knöpfe und der obere „Jetzt empfehlen"-Knopf ausgeblendet — keine doppelte Bedienung.
- **Kompakter Vollbild-Einstieg:** „Du bist begeistert…", Begleittext und das Porträt
  vollständig sichtbar über der Leiste (svh statt vh, damit die iOS-Adressleiste nichts
  abschneidet).
- **Zufriedenheit als eigener Vollbild-Abschnitt:** Überschrift, Frage, alle zehn Zahlen in
  zwei Fünferreihen, beide Beschriftungen und Kais Zitat auf einen Blick. Die bestehenden
  Rückmeldekarten funktionieren unverändert; braucht die Antwort mehr Platz, scrollt der
  Abschnitt normal.
- **Nichts fest verdrahtet:** Gezählt wird bei jedem Schritt neu, was sichtbar ist
  (`section.section` ohne `hidden`). Ausführlich (14), Kurz (8) und 60 Sekunden (2) stimmen
  dadurch von selbst; ein Längenwechsel wird über das hidden-Attribut beobachtet und
  Fortschritt wie Position sofort neu bestimmt.
- **Lange Abschnitte bleiben scrollbar** (Rechner, Themen, Ablauf, Belohnungs-Reise, Video)
  — kein verpflichtendes Scroll-Einrasten, Weiter springt bewusst zum nächsten Abschnitt.
  Reduzierte Bewegung wird respektiert (Sprung ohne Animation).
- Neuer Test `tests/praesentation-mobile-gefuehrt.test.mjs`; Kennungen auf
  `programm.css?v=89` / `programm.js?v=49`, Service-Worker auf `v148-2026-08-09`.
- Keine Änderung an Datenbank, Supabase oder Live-Daten. `programm.html` bleibt die einzige
  Inhaltsquelle — keine zweite mobile Seite.

---

## v1.188 Beta - Phase 162 · KI-Kennzeichnung der Erklärvideos
**2026-08-08 · live veröffentlicht**

Die beiden Erklärvideos gingen am 06.08. live, ohne jeden Hinweis darauf, dass KI im Spiel
war. Nicht im Bild, nicht im Seitentext, nicht in der Datei. Aufgefallen ist es zwei Tage
später bei einer Bestandsaufnahme. Seit dem 02.08.2026 greift dafür die EU-Transparenzpflicht.

- **Sichtbarer Hinweis** als Bildunterschrift unter beiden Videos (`programm.html`,
  `empfaenger.html`). Beim Formel-Video steht ausdrücklich, dass die gezeigte Person
  KI-generiert ist und keine reale Person darstellt — sie sieht fotorealistisch aus und
  liest sich sonst wie ein echter Kunde.
- **C2PA-Manifest in beiden Dateien**, damit die Kennzeichnung beim Herunterladen mitreist.
  Beide Seiten bieten einen Download-Link an; ab dann trägt die Datei den HTML-Hinweis nicht
  mehr mit sich. Nachgerüstet **ohne Neukodierung** (`avatar-reel label-existing`): Laufzeit,
  Codec und Bildqualität sind unverändert, die Dateien wuchsen um rund 15 KB.
- **Neuer Test `tests/ki-kennzeichnung.test.mjs`** als Sperrklinke. Er läuft über den
  Ordner `assets/video/`, nicht über eine gepflegte Liste: Wer künftig eine ungekennzeichnete
  MP4 dort ablegt, bekommt einen roten Test statt eines stillen Verstoßes.
- Beschreibungstexte als Datei neben jedem Video, für Plattform-Uploads.

Gefunden beim Bauen: In `empfaenger.html` darf die Zeichenfolge `<video>` nicht in einem
Kommentar stehen. Mehrere Tests greifen sich den ersten Treffer dieses Musters als das
Video-Markup und prüfen dann den Kommentar. Steht jetzt als Warnung im CSS-Kommentar.

---

## v1.187 Beta - Phase 161 · Mandantenschutz für Promoter-Empfehlungen
**2026-08-06 · live veröffentlicht**

- Öffentliche Empfehlungen mit Promoter werden jetzt zwingend dem Berater des Promoters
  zugeordnet. Eine manipulierte, abweichende Berater-ID wird von der Datenbank abgewiesen.
- Ein neuer Negativtest hält die zentrale Schutzregel und die bewusst öffentlichen Rechte
  der Empfehlungsfunktion fest.

## v1.186 Beta - Phase 160 · Formel-Video auf der Empfänger-Strecke
**2026-08-06 · live veröffentlicht**

- Die Empfänger-Strecke hat ein neues **zweites Kapitel**: „Deine persönliche Formel zum
  finanziellen Glück" — der Film läuft 1:37 und steht direkt nach dem persönlichen Einstieg,
  **bevor** der Empfohlene etwas auswählen soll. Erst verstehen, dann entscheiden.
- Aus fünf Kapiteln sind damit **sechs** geworden: Fortschrittsbalken, Zähler („2 / 6") und
  alle fest verdrahteten Schrittnummern im Skript sind mitgewandert. Ein eigener Test hält
  genau diese Stellen fest, weil sie beim nächsten Umbau als Erstes verrutschen.
- Wie beim Portal-Video: **kein Autoplay**, `preload="none"` — vor dem Klick auf Play wird
  kein Byte geladen, nur das Vorschaubild steht sofort. Auf dem iPhone bleibt es in der Seite.
- Das Video wurde fürs Web aufbereitet: aus 31,0 MB wurden **6,0 MB** bei gleicher Auflösung.

## v1.185 Beta - Phase 159 · 60-Sekunden-Modus
**2026-08-06 · live veröffentlicht**

- Oben im Umschalter steht jetzt ein dritter Knopf: **60 Sek. · Kurz · Ausführlich.**
  Im 60-Sekunden-Modus bleiben nur **Video und QR-Code** stehen — für den Fall
  „mir bleibt eine Minute". Dabei rutscht das Video **vor** den QR-Block: erst sehen,
  warum, dann anmelden. In den anderen beiden Längen bleibt es am Ende, wo es hingehört.
- Der Modus ist als Link speicherbar (`?modus=video`), genau wie der Kurzmodus.
- **Behoben: Verstecken hat nie versteckt.** Der Kurzmodus setzte seit Phase 156 zwar
  „hidden" auf die sechs vertiefenden Abschnitte, sichtbar verschwunden ist aber keiner —
  `.section { display: flex }` schlug die Browser-Regel. Im Browser gemessen: **14 von 14
  Abschnitten sichtbar**, der Modus hat nur gescrollt. Eine Zeile CSS repariert das;
  Kurzmodus zeigt jetzt 8 von 14, der 60-Sekunden-Modus 2 von 14.
  Die Tests hatten es nicht gemerkt, weil sie nur den Quelltext lesen, nicht die Darstellung.

## v1.184 Beta - Phase 158 · Abschluss-Video in der Präsentation
**2026-08-06 · live veröffentlicht**

- Am Ende der Präsentation steht jetzt das Portal-Video: **„Das Portal in 60 Sekunden."**
  Nach dem QR-Block, vor dem Footer — Kai hat erklärt, das Video fasst zusammen.
- **Es spielt nichts von allein.** Kein Autoplay, kein Ton, der ins Gespräch platzt. Und
  bevor Kai auf Play drückt, wird **kein Byte Video geladen** (`preload="none"`) — nur das
  Vorschaubild steht sofort da. Wichtig, wenn er beim Kunden über Mobilfunk zeigt.
- Das Video wurde fürs Web aufbereitet: aus 19,3 MB wurden **3,6 MB** bei gleicher
  Auflösung und Länge.
- Auf dem iPhone bleibt es in der Seite (`playsinline`) statt in den Vollbildmodus zu springen.
- Der Service Worker fasst Video-Dateien bewusst **nicht** an: Video kommt in
  Bereichs-Anfragen (206), die gehören nicht in den Cache-Speicher und stören auf dem
  iPhone die Wiedergabe.
- Im **Kurzmodus bleibt der Abschnitt sichtbar** — er ist der Abschluss, keine Vertiefung.

## v1.183 Beta - Phase 157 · Hinweis bei neuem Promoter
**2026-08-06 · live veröffentlicht**

- Eine neue Selbstanmeldung löst künftig denselben geschützten Telegram-Hinweis wie ein neuer Lead aus.
- Die vorbereitete Edge Function `notify-promoter` lädt den Promoter serverseitig und nimmt keine frei übermittelten Kontaktdaten an.
- Der interne Aufruf bleibt mit `X-Internal-Token` geschützt. Ein Fehler beim Versand blockiert die erfolgreiche Registrierung nicht.
- Web-Push wird ausschließlich an Geräte des zuständigen Beraters gesendet. Derzeit ist im Live-System noch kein Push-Gerät registriert, Telegram bleibt deshalb der aktive externe Kanal.
- Im geöffneten Hub erscheint der neue Promoter sofort im Aktivitätsstrom. Auch die Promoterliste aktualisiert sich ohne Neuladen.
- Alte Promoter und manuell angelegte Datensätze lösen keine nachträgliche Meldung aus. Der Trigger reagiert nur auf neue Datensätze mit `self_registered_at`.
- Die Edge Function `notify-promoter` ist als Version 1 aktiv. `schema-phase157.sql` wurde als Migration `phase157_notify_new_promoters` angewendet.
- Live-Veröffentlichung über Commit `8b69e0d` und Vercel-Deployment `dpl_A7Yk8QmUWDvMLM9BUomwTNneDYuZ`.

---

## v1.182 Beta - Phase 156 · QR-Selbstanmeldung für Promoter
**2026-08-05 · live veröffentlicht**

- Die Präsentation endet mit einem großen, beraterbezogenen QR-Code statt mit der bisherigen direkten Promoter-Eingabe.
- Der QR-Code führt in eine feste helle Startseite. Dort meldet sich der Kunde kurz mit Name und einem Kontaktweg an.
- Nach erfolgreicher Anmeldung landet der neue Promoter direkt in seinem vorhandenen persönlichen Bereich. Themenwahl, Empfehlungslink und Benefits nutzen danach den bestehenden Ablauf.
- Für Präsentation und Büro-Aufsteller liegen getrennte QR-Codes für alle fünf aktuell aktiven Berater vor. Die Quelle wird für eine spätere Auswertung mitgeführt.
- Ungültige Berater-Links fallen nicht mehr still auf Kai zurück.
- Die öffentliche Anmeldung läuft über einen eigenen Vercel-Endpunkt mit Eingabeprüfung, Cloudflare Turnstile, Herkunftsprüfung, gehashten Mengenbegrenzungen und einem internen Registrierungsgeheimnis.
- Die bestehende Beraterfunktion `create_empfehler` ist auf angemeldete Berater begrenzt. Die öffentliche Selbstanmeldung nutzt einen eigenen, minimal freigegebenen Datenbankweg.
- Historische Dubletten bleiben unangetastet. Teilindizes verhindern nur bei neuen Selbstanmeldungen parallele Dubletten je Berater, E-Mail und Mobilnummer.
- Phase 156 wurde in zwei kontrollierten Migrationen angewendet. Turnstile, Vercel-Geheimnisse und Datenbank-Hash sind aktiv. Funktionsstand `08c1520` läuft über das produktive Deployment `dpl_Hv6gbjfDzWBj4cX7TvyebW9yY7z7` auf beiden Live-Domains. Version, Startseite, Laufzeitkonfiguration, Berechtigungen, zurückgerollte Testanmeldung und Fehlerprotokolle wurden geprüft.
- Alle automatischen Portaltests, die API-Sicherheitstests, der portalweite Farbfiltertest, der bytegenaue Abgleich aller zehn QR-Zieladressen sowie die Browserprüfung für Desktop und Mobil sind grün.

---

## v1.181 Beta - Phase 155 · Farbige Bilder im gesamten Portal
**2026-08-05 · live veröffentlicht**

- Sämtliche Schwarz-Weiß- und Entsättigungsfilter wurden aus den ausgelieferten HTML-, CSS-, JavaScript- und SVG-Beständen entfernt.
- Beraterportraits erscheinen auf Empfänger-, Promoter- und Präsentationsseiten unverfälscht farbig. Die Korrektur gilt automatisch für Kai und alle anderen Berater.
- Auch Themenkacheln, Bildkarten, Hintergrundbilder, Symbole und die öffentlich erreichbare Empfänger-Mockup-Seite werden nicht mehr künstlich entsättigt.
- Reine Helligkeits- und Kontrastregeln für Lesbarkeit bleiben erhalten, sofern sie keine Farben entfernen.
- Bilddateien, Beraterdaten, Empfehlungen und Datenbankinhalte bleiben unverändert.
- Ein portalweiter Schutztest prüft alle ausgelieferten Quelldateien und verhindert eine erneute Schwarz-Weiß-Darstellung.
- Funktionsstand `c6a8a3e` ist über das produktive Vercel-Deployment `dpl_FX5N8dEUtf3iDQNhegbb1dW4q1pw` veröffentlicht. Die offizielle Adresse liefert v1.181 und alle geprüften Portal-, Stil- und Mockup-Dateien ohne Schwarz-Weiß- oder Null-Sättigungsfilter aus; das Vercel-Fehlerprotokoll ist leer.

---

## v1.180 Beta - Phase 154 · Themenseiten und Mobile-First-Funnel
**2026-08-05 · live veröffentlicht**

- Für Förderungen, Selbständige, Investment, Absicherung, berufliche Perspektive und Kinder steht eine gemeinsame, mobile Themenseite mit ehrlichem Hinweis `In Arbeit` bereit.
- Jeder Themenlink behält Empfänger, Promoter, Thema und zuständigen Berater korrekt bei. Alte Links ohne Themenangabe in der Adresse nutzen weiterhin den in der Empfehlung gespeicherten Themen-Schlüssel.
- Öffnung und Terminbeginn laufen über das vorhandene Empfehlungs-Tracking. `Dieses Thema interessiert mich` nutzt die bestehende Interesse-Funktion; Austragen bleibt mit demselben Token möglich.
- Ohne echten Empfehlungs-Token bleibt die Seite eine sichere Vorschau und bestätigt ausdrücklich, dass keine Daten gespeichert wurden.
- In der Präsentation sind alle acht Themen auswählbar. Allgemein und Baufinanzierung bleiben als fertige Seiten gekennzeichnet, die sechs neuen Gerüste klar als `In Arbeit`.
- Die Schnellvorschau in den Einstellungen enthält alle acht Themen. Karriere und Kinder wurden ergänzt.
- Für das Thema Kinder stehen drei eigene WhatsApp-Nachrichtenvorlagen bereit.
- Gemeinsames Gerüst statt sechs kopierter HTML-Seiten: Inhalte können später je Themen-Schlüssel ergänzt werden, ohne Routing, Personalisierung und Tracking neu zu bauen.
- Die allgemeine Empfängerseite ist mobil beruhigt: kleinere Überschriften, kompaktere Abstände, klare Ein-Hand-Aktionen und weniger Bewegung.
- Wiederholte Nennungen des Empfehlungsgebers, doppelte Daumen-Symbole und der zweite Erfahrungsblock im Einstieg sind entfernt. Erfahrung und Vertrauen erscheinen nur noch im dafür vorgesehenen Schritt.
- Keine Datenbankmigration und keine Änderung an bestehenden Empfehlungen, Promotern oder Beraterdaten.
- Verifiziert mit Router- und Strukturtests sowie Browserprüfung für alle sechs Themen und den vollständigen Empfängerweg auf kleinen Handys.
- Live veröffentlicht am 05.08.2026. Öffentliche Version, Themenseite und Mobile-Einstieg geprüft; Vercel-Status `Ready`.

---

## v1.179 Beta - Phase 153 · Leichter Aktivitätsstrom
**2026-08-05**

- Die Einträge im Live-Stream erhalten etwas mehr vertikalen Innenabstand, damit Namen, Ereignisse und Status ruhiger lesbar sind.
- Die Trennlinien sind heller und treten stärker in den Hintergrund.
- Die flache Nachrichtenstrom-Optik bleibt erhalten. Es entstehen bewusst keine einzelnen Karten und keine zusätzlichen Schatten.
- Keine Datenbankmigration und keine Änderung an Aktivitäten oder Empfehlungsdaten.
- Live veröffentlicht am 05.08.2026. Keine Datenbankmigration erforderlich.

---

## v1.178 Beta - Phase 152 · Wettbewerb und dynamische Analysen
**2026-08-05**

- Die Promoterseite hebt die drei stärksten Promoter in einem ruhigen Gewinnerpodest hervor. Gewertet wird nach gewonnenen Kunden, danach nach Empfehlungen und Aktivität.
- Die Teamseite zeigt ein Portrait-Podest für die drei besten Berater im gewählten Zeitraum.
- Das Teamranking lässt sich zwischen Kunden, Empfehlungen, aktiven Promotern und Kundenquote umschalten. Die Kundenquote wird erst ab drei Empfehlungen gewertet.
- Die vollständige Teamübersicht bleibt alphabetisch und unabhängig vom Ranking, damit niemand als Verlierer markiert wird.
- Die Linienanalyse verwendet die bestehenden täglichen Kennzahlenschnappschüsse und lässt aktive Promoter, Link-Klicks, Empfehlungen und Kunden einzeln ein- und ausblenden.
- Die Analyse kann zwischen echten Zahlen und einem vergleichbaren prozentualen Verlauf wechseln. Im Prozentmodus entspricht der eigene Höchstwert jeder Linie 100 Prozent.
- Zeiträume von 7, 30 und 90 Tagen sowie die Vergleiche mit der direkten Vorperiode bleiben erhalten.
- Keine Datenbankmigration und keine Änderung an Empfehlungen, Promotern oder Beraterdaten.
- Live veröffentlicht am 05.08.2026. Keine Datenbankmigration erforderlich.

---

## v1.177 Beta - Phase 151 · Einheitliche Portal-Bezeichnung
**2026-08-05**

- Alle aktuellen sichtbaren Rückwege heißen jetzt `Zurück zum Portal` statt `Zurück zum Hub` oder `Zurück zum HUB`.
- Der Notfall-Link auf der Startadresse heißt `Zum Portal`.
- Die sichtbare Phasenbezeichnung verwendet nur noch `Portal` und nicht mehr `Premium-HUB`.
- Die ungenutzte Schnellaktion `Neue Empfehlung` wurde vollständig aus der Übersicht entfernt; die regulären Anlegewege bleiben erhalten.
- Technische Pfade, Klassen und interne Bezeichner wie `hub.html` bleiben erhalten, damit bestehende Links, Lesezeichen und Funktionen nicht brechen.
- Keine Datenbankmigration und keine Änderung an Daten oder Abläufen.
- Gemeinsam mit v1.178 live veröffentlicht am 05.08.2026.

---

## v1.176 Beta - Phase 150 · Leichterer Premium-HUB
**2026-08-05**

- Der HUB erhält mehr weiße Fläche und eine ruhigere, klarere Gesamtatmosphäre, ohne seine Struktur zu verändern.
- Begrüßung und Kennzahlen sind leichter gesetzt; KPI-Karten haben feinere Konturen, weniger Schatten und kompaktere Werte.
- Champagne bleibt Marken- und Orientierungsfarbe statt große Flächen zu tönen.
- `System aktiv` ist als echter positiver Zustand deutlich grün hervorgehoben.
- Neue Ereignisse tragen das Wort `Neu` in Grün statt in einem goldenen Badge.
- Der Aktivitätsstrom ist flacher aufgebaut: kleinere Symbole, ruhige Trennlinien und keine gestapelte Kartenwand.
- Die sichtbare Marke heißt jetzt klar `Empfehlungsportal` statt `Empfehlungs-HUB`.
- Darunter steht die zweizeilige Signatur `Regionaldirektion` und `Kai Blobel & Team` in einer feinen Schreibschrift.
- Im Seitenkopf steht beim Berater nur noch sein Name; der doppelte Zusatz `Regionaldirektion · Hub` entfällt.
- Datenquellen, Kennzahlen, Reihenfolge, Navigation und alle Aktionen bleiben unverändert.
- Keine Datenbankmigration und keine Änderung an Empfehlungen, Promotern oder Beraterdaten.
- Live-Freigabe am 05.08.2026 erteilt.
- Funktionsstand `d6f9d16` ist über das produktive Vercel-Deployment `dpl_DEfs2qobVpCWPaHUUrMW6K3v544W` veröffentlicht. Offizielle Version, neue Wortmarke, beide Signaturzeilen, Schreibschrift, Cache-Stände und der entfernte Beraterzusatz wurden live abgerufen; das Fehlerprotokoll ist leer.

---

## v1.175 Beta - Phase 149 · Empfehlungsdetail als Arbeitsseite
**2026-08-05**

- Die Detailseite einer Empfehlung ist jetzt ein kompakter Arbeitsbereich statt einer langen technischen Feldliste.
- Kontakt, Erreichbarkeit, bevorzugter Kanal und Linkstatus stehen als ruhiger Überblick direkt oben.
- Empfehlungskontext, Promoterleistung und der zeitliche Verlauf sind klar getrennt und vollständig erhalten.
- Status und Gesprächsnotiz stehen gemeinsam in einer festen Bearbeitungsfläche mit einem passenden nächsten Schritt.
- Anrufen, WhatsApp, Link kopieren, Statuswechsel, Notiz, Zurücknavigation und das geschützte Löschen bleiben erhalten.
- Die Oberfläche nutzt das bestehende HUB-Designsystem und verdichtet sich auf Tablet und Smartphone ohne Funktionsverlust.
- Keine Datenbankmigration und keine Änderung an Empfehlungen, Promotern oder Beraterdaten.
- Funktionsstand `a12a8ac` ist auf `main` und über das produktive Vercel-Deployment `dpl_8dVB97bFkJ8B9nLASnZ77EaqgSu6` veröffentlicht. Version, Detail-Shell, neue Styles, Arbeitslogik und die erhaltenen Aktionen wurden live abgerufen; das Fehlerprotokoll ist leer.

---

## v1.174 Beta - Phase 148 · Promoter als professioneller Arbeitsbereich
**2026-08-05**

- Die Promoter-Übersicht zeigt echte Netzwerk-Kennzahlen, Suche, Sortierung und persönliche Karten mit Empfehlungen, Kundenquote, Wunschziel und letztem Empfehlungsimpuls.
- Das Promoterprofil nutzt die Bildschirmfläche mit einem kompakten Profilkopf, vier relevanten Kennzahlen, der vollständigen Empfehlungshistorie sowie einer Seitenleiste für Ziel, Kontaktdaten und Beziehungspflege.
- Profilfelder bleiben vollständig bearbeitbar, stehen aber erst nach `Profil bearbeiten` im Vordergrund. Anlegen, Einladungs-Link, neue Empfehlung, öffentliche Promoter-Ansicht, Rechtsklick und Linkkopieren bleiben erhalten.
- Der ruhige Feinschliff der Empfehlungsseite aus v1.173 ist enthalten.
- Keine Datenbankmigration und keine Änderung an bestehenden Promotern, Empfehlungen oder Beraterdaten.
- Funktionsstand `8a494a8` ist auf `main` und über das produktive Vercel-Deployment `dpl_2nJFYMp2yC7XxQuXTo3P9qww81ng` veröffentlicht. Offizielle Version, Promoter-Übersicht, Promoterprofil, neue Styles und der enthaltene Empfehlungs-Feinschliff wurden live geprüft; das Fehlerprotokoll ist leer.

---

## v1.173 Beta - Phase 147 · Ruhiger Feinschliff der Empfehlungen
**2026-08-05**

- `TAGESGESCHÄFT` ist jetzt ein kleines, gesperrtes Orientierungslabel statt einer zweiten Überschrift.
- Der Suchtext ist mit `Name, Telefon oder Promoter suchen` kürzer und passt vollständig in das Feld.
- Unter dem Beraternamen steht `Empfehlungsmanagement`, damit sich der Seitentitel nicht doppelt.
- Die wiederholten Anrufaktionen nutzen einen warmen, ruhigen Akzent statt vier dominanter schwarzer Flächen. Der einzelne Hauptknopf `Neue Empfehlung` bleibt schwarz.
- Keine Fachlogik, Datenbankmigration oder Änderung an Empfehlungen, Kunden- oder Beraterdaten.
- Veröffentlichung noch nicht freigegeben.

---

## v1.172 Beta - Phase 146 · Empfehlungen als Arbeitsliste
**2026-08-05**

- Die Seite `Empfehlungen` ist jetzt eine priorisierte Arbeitsoberfläche statt einer einfachen Systemliste.
- Anrufwünsche und aktuelles Interesse stehen unter `Wartet auf dich` mit direkten Aktionen für Telefon, WhatsApp und Details.
- Suche und Statusfilter bilden eine gemeinsame Werkzeugleiste. Jeder Filter zeigt seine aktuelle Anzahl; Interesse ist als eigener, funktionierender Filter enthalten.
- Die Kontaktliste zeigt Name, Zeitpunkt, Thema, Promoter, Status und Öffnungszustand in klarer Hierarchie und bleibt auf Mobilgeräten kompakt.
- Die Suche berücksichtigt Name, Telefonnummer, Promoter und Thema.
- Das aufklappbare Untermenü bei `Empfehlungen` ist entfernt, weil es dieselben Filter doppelt angeboten hat. Das Untermenü des Bonusprogramms bleibt bestehen.
- Rechtsklick, Bearbeiten, Löschen, Statuswechsel und alle bestehenden Detailwege bleiben erhalten.
- Keine Datenbankmigration und keine Änderung an Empfehlungen, Kunden- oder Beraterdaten.
- Funktionsstand `d3e1b3a` ist auf `main` und über das produktive Vercel-Deployment `dpl_B3T2goNpYfAiWd4FNGb5YRqgZsNN` veröffentlicht. Offizielle Seite, Version, priorisierte Kontakte, Suche, Interesse-Filter, vereinfachtes Empfehlungen-Menü und weiterhin aufklappbares Bonusprogramm wurden geprüft; das Fehlerprotokoll ist leer.

---

## v1.171 Beta - Phase 145 · Empfehlung auf dem Handy
**2026-08-05**

- Der Abschnitt `So funktioniert es` zeigt den gesamten Ablauf jetzt in drei echten Handyansichten statt in drei gewöhnlichen Textkarten.
- Handy 1 zeigt das Anlegen einer Empfehlung mit Name, Mobilnummer, Themenwahl und fertigem Link.
- Handy 2 zeigt die vorbereitete persönliche WhatsApp-Nachricht mit dem dynamischen Namen des jeweiligen Beraters.
- Handy 3 zeigt die Auswahl zwischen Geldprämie, Sachprämie und Spende.
- Geräte-Rahmen, Dynamic Island, Statusleiste, Seitentasten und Home-Leiste machen den Ablauf sofort als iPhone-Nutzung verständlich.
- Die drei Ansichten stehen auf großen Bildschirmen nebeneinander und unter 821 Pixeln sauber untereinander.
- Keine Datenbankmigration und keine Änderung an Kunden-, Berater- oder Empfehlungsdaten.
- Funktionsstand `781312b` ist auf `main` und über das produktive Vercel-Deployment `dpl_6sUP1u3ts1c4e3HNGX4rbG9DFK1D` veröffentlicht. Die offizielle Adresse wurde auf Desktop und bei 390 Pixel Breite geprüft; alle drei Geräte, der dynamische Beratername und die mobile Stapelung sind vorhanden. Browser und Vercel melden keine Fehler.

---

## v1.170 Beta - Phase 144 · Kurze Präsentation
**2026-08-05**

- Im internen Präsentationsaufruf steht oben der Umschalter `Kurz | Ausführlich`. Die ausführliche Fassung bleibt der Standard mit 13 Abschnitten.
- Der Kurzmodus nutzt dieselbe Präsentation und zeigt sieben Kernabschnitte: Zufriedenheit, persönlicher Mehrwert, Türöffner, Ablauf, Themen, Belohnung und direktes Empfehlen. Es gibt keine doppelte Inhaltspflege.
- Die Auswahl `modus=kurz` bleibt beim Aktualisieren und in einem intern gespeicherten Link erhalten.
- Die Themenseiten-Vorschau wird auf die oberste Seitenebene gesetzt. Dadurch rutschen Präsentationsabschnitte und feste Bedienelemente nicht mehr in das Vorschaufenster.
- Die Schlusszeile des Förderbeispiels hat einen eigenen Platz im Raster und überlagert bei schmaleren Fenstern keine Inhalte mehr.
- Der feste Button `Jetzt empfehlen` hat ruhigere Ecken mit 14 Pixel Radius statt Pillenform.
- Keine Datenbankmigration und keine Änderung an Kunden-, Berater- oder Empfehlungsdaten.
- Funktionsstand `34f307e` ist auf `main` und über das produktive Vercel-Deployment `dpl_DLrAwib6WLCD7rVpmK4E2Mu8KaMH` veröffentlicht. Offizielle Adresse, Version, Umschalter, Kurzmodus-Markierungen und beide Darstellungsreparaturen wurden geprüft; das Fehlerprotokoll ist leer.

---

## v1.169 Beta - Phase 143 · Farbige Beraterportraits
**2026-08-05**

- Die Präsentation entsättigt das dynamisch geladene Beraterportrait nicht mehr. Jedes Beraterfoto wird in seinen echten Farben angezeigt.
- Beide bisher wirksamen Schwarz-Weiß-Regeln wurden entfernt, damit auch spätere Beraterbilder automatisch farbig bleiben.
- Gespeicherte Bilddateien, Beraterdaten und alle übrigen Präsentationsbilder bleiben unverändert. Version v1.169 ist auf `main` und Vercel veröffentlicht; beide wirksamen Portraitregeln wurden über die offizielle Live-Adresse farbig geprüft.

---

## v1.168 Beta - Phase 142 · Echte Analysen
**2026-08-05**

- Die bisherige Analyseseite ist keine zweite Übersicht mehr. Sie beantwortet mit 7-, 30- und 90-Tage-Zeiträumen, Zeitvergleich, Entwicklung, Umwandlungsstufen, Themenerfolg und Promoterquellen konkrete Steuerungsfragen.
- Alle Kennzahlen werden aus den echten Empfehlungen des eingeloggten Beraters berechnet. Die bestehende Zugriffstrennung der Datenbank bleibt maßgeblich; Namen und Kontaktdaten von Empfängern werden nicht geladen.
- Wenn die direkte Vorperiode noch keine belastbaren Daten enthält, zeigt die Oberfläche das ehrlich an und erzeugt keine künstlichen Prozentvergleiche.
- Die Präsentation erhält beim Aufruf aus dem HUB einen dezenten Rückweg. Bei einem direkten Kundenaufruf bleibt dieser interne Knopf vollständig verborgen.
- Der Überblick im HUB bleibt unverändert. Es wurden keine Datenbankmigration und keine Änderungen an bestehenden Datensätzen benötigt. Version v1.168 ist auf `main` und Vercel veröffentlicht; die offizielle Adresse und der geschützte Login-Weg wurden geprüft.

---

## v1.167 Beta - Phase 141 · Teamübersicht
**2026-08-05**

- „Team“ ist jetzt ein eigener Arbeitsbereich mit zusammengefassten Kennzahlen für 7, 30 und 90 Tage, alphabetischen Beraterkarten und einer persönlichen Detailansicht je Berater.
- Die Teamseite zeigt aktive Promoter, Link-Klicks, Empfehlungen, gewonnene Kunden, Umwandlung und datensparsame Aktivitäten. Kunden- und Kontaktdaten werden nicht ausgegeben.
- Die bisher unter „Team“ geführte Kontenverwaltung heißt jetzt „Beraterkonten“ und steht ausschließlich für Administratoren unter „Verwaltung“.
- Der Überblick zeigt nur noch einen kompakten Teameinstieg mit zwei aktuellen Ereignissen und führt für Details in die Teamübersicht.
- Die vorbereiteten Datenbankfunktionen `team_metrics` und `team_activity_secure` akzeptieren nur 7, 30 oder 90 Tage und prüfen, ob der eingeloggte Nutzer einem aktiven Beraterkonto zugeordnet ist. Die persönliche Aktivität wird eindeutig per Berater-ID zugeordnet. Öffentliche und anonyme Ausführung sind gesperrt.
- Keine Kundendaten und keine bestehenden Datensätze verändert. `schema-phase141.sql` wurde am 05.08.2026 auf die Live-Datenbank angewandt und mit einem verknüpften Beraterkonto geprüft. Version v1.167 ist auf `main` und Vercel veröffentlicht.

---

## v1.166 Beta - Phase 140 · Professionelle Beraterkonten
**2026-08-05**

- Die Kontenübersicht zeigt Berater jetzt als klare Profilkarten mit größerem, vollständig sichtbarem Portrait, Name, Rolle, E-Mail sowie Login- und Aktivstatus.
- Die lange Foto-URL ist aus der Oberfläche verschwunden. Das gespeicherte Feld bleibt technisch erhalten; sichtbar sind nur Bildvorschau, „Bild ersetzen“ und „Bild entfernen“.
- Die Bearbeitung ist in „Profil und Kontakt“, „Öffentliche Angaben“ und „Zugang“ gegliedert. Passwort und Profildaten bleiben bewusst getrennte Aktionen.
- URL-Kennung und interne Benutzer-ID stehen nicht mehr im Arbeitsbereich, sondern unter „Technische Angaben anzeigen“.
- Die Speicherleiste schließt jede geöffnete Kontokarte eindeutig ab. Mobil ordnen sich Profilbild, Felder, Zugang und Aktionen einspaltig an.
- Keine Datenbankänderung und keine gelöschten Beraterdaten. Am 05.08.2026 auf `main` veröffentlicht und über die offizielle Vercel-Produktionsadresse geprüft.

---

## v1.165 Beta - Phase 139 · Verlässliche Berater-Passwörter
**2026-08-05**

- Das sichtbare Passwortfeld zeigte bei jedem Öffnen einen neuen Zufallsvorschlag, obwohl dieser noch nicht gespeichert war. Das Feld ist jetzt leer und erklärt eindeutig, dass ein neues Passwort erst nach dem ausdrücklichen Setzen aktiv wird.
- Der allgemeine Knopf "Speichern" für Beraterdaten und der Passwort-Knopf sind klar getrennt. Der Passwort-Knopf steht gut sichtbar über die gesamte Breite und funktioniert auch auf schmalen Bildschirmen.
- Neue Logins und Passwort-Änderungen laufen jetzt über dieselbe abgesicherte Edge Function. Bestehende Konten werden mit Supabases offizieller Auth Admin API `updateUserById` aktualisiert.
- Der bisherige direkte Schreibzugriff auf den Passwort-Hash in `auth.users` wird vom Browser nicht mehr verwendet.
- Keine Datenbankmigration. Live seit 05.08.2026: Edge Function `berater-create-login` Version 2 und Vercel-Produktion auf Commit `7cb14a1` geprüft.

---

## v1.164 Beta - Phase 138 · Kein fremdes Gesicht beim Laden
**2026-08-05**

- Auf allen Kundenseiten stand das Portrait des Haupt-Beraters fest im HTML bzw. wurde beim Start aktiv gesetzt. Für jeden anderen Berater blitzte deshalb beim Laden kurz ein fremdes Gesicht auf, bis sein eigenes geladen war.
- Die Portraits haben jetzt gar keine Startquelle mehr. Sie bleiben leer, bis der Berater feststeht — geprüft: Kais Bild wird auf einer fremden Seite nicht mehr angefordert.
- Der zuletzt geladene Berater wird pro Link gemerkt. Beim zweiten Aufruf steht das richtige Bild sofort, ohne Wartezeit und ohne Aufblitzen.
- Der Dashboard-Header zeigt ohne eigenes Foto einen neutralen Initialen-Kreis statt des Fotos vom Haupt-Berater. Die Login-Seite zeigt das Foto des zuletzt Angemeldeten, sonst gar keins.
- Geprüft mit allen fünf angelegten Beratern auf Empfänger-Seite, Finanzierungskompass, Präsentationsseite und Promoter-Bereich.

---

## v1.163 Beta - Phase 137 · Themenseiten auf den richtigen Berater
**2026-08-05**

- Die Themenseiten (Empfänger-Seite und Finanzierungskompass) zeigten für neu angemeldete Berater weiterhin Foto, Name und Initialen von Kai. Grund: sie konnten den Berater nur über den Token einer echten Empfehlung auflösen.
- Beide Seiten erkennen den Berater jetzt zusätzlich über `?berater=slug` und, wenn kein Slug da ist, über den eingeloggten Berater.
- Die Themen-Vorschau auf der Präsentationsseite hängt den Slug des gebrandeten Beraters an die Vorschau-Links. Im Vorschaufenster und beim großen Öffnen steht damit der richtige Berater.
- Die Portraits auf der Empfänger-Seite bleiben leer, bis der Berater feststeht. Vorher blitzte kurz das Standard-Foto auf.
- Impressum und Datenschutz werden beim eingeloggten Berater mitgeladen, sonst waren die beiden Fußzeilen-Links in der eigenen Vorschau ausgeblendet.

---

## v1.162 Beta - Phase 136 · Echte Kennzahlen im Fokus
**2026-08-04**

- Der frei berechnete Momentum-Score mit 86 von 100 Punkten ist entfernt. Seine Gewichtung und Aussagen wie "Top-Drittel" hatten keine verständliche fachliche Grundlage.
- Direkt unter dem Einstieg stehen jetzt die vier echten Kennzahlen: aktive Promoter, Link-Klicks, Empfehlungen und neue Kunden.
- Die Kennzahlen sind als ruhige, hochwertige Karten waagerecht angeordnet. Die vorhandene Entwicklung zur Vorwoche bleibt erhalten.
- Der bisherige zweite Kennzahlenblock weiter unten ist entfernt. Datenbank und Kennzahlen-Abfragen bleiben unverändert.

---

## v1.161 Beta - Phase 135 · Erfolgsgeschichten entfernt
**2026-08-04**

- Der Menüpunkt und die Verwaltungsmaske für Erfolgsgeschichten sind entfernt. Die Funktion wurde auf keiner Kundenseite mehr sichtbar ausgespielt.
- Die Empfängerseite fragt die nicht verwendeten Geschichten nicht mehr aus Supabase ab. Auch der tote Renderer und die zugehörigen Verwaltungsfunktionen sind entfernt.
- Die vorhandenen Datensätze und die Tabelle `erfolgsgeschichten` bleiben vorerst in der Datenbank erhalten. Es wurden keine Inhalte gelöscht.

---

## v1.160 Beta - Phase 134 · Belohnungs-Einstieg gestrafft
**2026-08-04**

- Die beiden Karten „Dein Bekannter bekommt" und „Du bekommst" sind aus der Präsentationsseite entfernt. Sie wiederholten bereits erklärte Punkte und rückten die Belohnung unnötig früh in den Vordergrund.
- Der zusätzliche Hinweis „Deine erste Belohnung ist nur eine Empfehlung entfernt" ist ebenfalls entfernt. Die klare Regel direkt darunter bleibt: Gezählt wird, wer Kunde wird.
- Die nicht mehr benötigten Stile des entfernten Blocks wurden mit aufgeräumt. `programm.css` wird mit einem neuen Cache-Stempel geladen.

---

## v1.159 Beta - Phase 133 · Versionsanzeige wieder verlässlich
**2026-08-04**

- **Die Versionsnummer in der Seitenleiste blieb nach Veröffentlichungen stehen.** Sie kommt aus `js/config.js` — der einzigen Datei ohne Versionsnummer im Namen, und sie wurde zuerst aus dem Zwischenspeicher geliefert. Wer die Seite vor einer Freigabe geöffnet hatte, sah tagelang die alte Nummer, obwohl längst neuer Code lief.
- `js/config.js` wird jetzt **immer zuerst aus dem Netz** geholt; der Zwischenspeicher ist nur noch der Notnagel ohne Verbindung. Damit kann die angezeigte Version nicht mehr von der ausgelieferten abweichen.
- Der Cache-Stempel wurde hochgezählt, damit vorhandene Zwischenspeicher verworfen werden. Im Kopf von `sw.js` steht jetzt ausdrücklich, dass er bei **jeder** Veröffentlichung hochzuzählen ist — genau das war bei den letzten beiden Freigaben unterblieben.

---

## v1.158 Beta - Phase 132 · Inspirations-Zitate raus
**2026-08-04**

- **Der Abschnitt „Worüber Menschen mich weiterempfehlen" mit den elf Zitaten ist entfernt.** Im Gespräch erzählt Kai diese Geschichten selbst — besser, als sie von der Wand abzulesen. Und die Themen-Auswahl direkt danach beantwortet dieselbe Frage als Werkzeug statt als Textwand.
- Beim Aufräumen mitgenommen: die Stile der **Potenzialliste**, deren Funktion schon in Phase 116 entfallen war. 38 Regeln für ein Bauteil, das es seit heute früh nicht mehr gibt.
- Die Seite hat jetzt 13 Abschnitte; `css/programm.css` ist bei 5.863 Zeilen — heute früh waren es 7.614.

---

## v1.157 Beta - Phase 131 · Tastatursteuerung, FAQ und Bewertungen raus
**2026-08-04**

- **Die Pfeiltasten blättern wieder abschnittsweise.** Mit dem Folien-Modus war auch die Tastatursteuerung verschwunden; die Pfeiltasten scrollten nur noch in Vierzig-Pixel-Schritten. Jetzt gilt: ↓ · → · Bild ab · Leertaste weiter, ↑ · ← · Bild auf zurück, Pos 1 und Ende an den Anfang bzw. ans Ende.
- Hohe Abschnitte wie die Belohnungs-Reise werden dabei zuerst seitenweise durchgeblättert und erst am Ende verlassen — sonst würde ein Tastendruck von Stufe 1 direkt hinter das Mallorca-Finale springen.
- In Eingabefeldern und den Mehrwert-Zeilen gehören die Pfeiltasten dem Feld, damit die Seite beim Mittippen nicht wegspringt. Die Leertaste hält sich zurück, wenn ein Knopf den Fokus hat.
- **FAQ und Kundenbewertungen sind entfernt.** Im Gespräch beantwortet Kai Fragen selbst, und die Google-Rezensionen brauchte es vor jemandem nicht, der bereits Kunde ist.
- Nebenwirkung, die zählt: Die Bewertungs-Laufschrift war die einzige Stelle, an der Inhalte über den Bildschirmrand ragten — 28 Elemente. Jetzt sind es null.
- `css/programm.css` schrumpft von 6.588 auf 6.071 Zeilen, `programm.html` von 1.050 auf 927.

---

## v1.156 Beta - Phase 130 · Präsentations-Modus entfernt
**2026-08-04**

- **Der Folien-Modus ist raus.** Kai trägt scrollend vor — der Modus wurde nicht genutzt, kostete aber bei jeder Änderung eine zweite Prüfung. Genau daran ist an einem Tag zweimal etwas kaputtgegangen: Das Folienraster brach mit den echten Daten zusammen, und beim Hero-Umbau mussten Sonderregeln für eine Ansicht gepflegt werden, die niemand öffnet.
- Entfernt: der Knopf unten rechts, die Foliensteuerung, 162 Zeilen Steuerlogik und 141 Regelblöcke im Stylesheet. `css/programm.css` schrumpft von 7.274 auf 6.587 Zeilen, `js/programm.js` von 983 auf 813.
- **Alle Inhalte bleiben sichtbar.** Drei Abschnitte waren im Folien-Modus ausgeblendet (der neue Hero, die Orbit-Grafik „Deine Vorteile", die Inspirations-Zitate). Beim Scrollen sieht man sie ohnehin — jetzt gibt es nur noch eine Wahrheit.
- Menüpunkt „Präsentation" und die Kachel unter „Bonusprogramm" führen jetzt auf die normale Seite statt auf den Folien-Start.

---

## v1.154 Beta - Phase 128 · Hero als Einstieg, Zufriedenheitsfrage danach
**2026-08-04**

- **Die Seite beginnt jetzt mit „Du bist begeistert von unserer Zusammenarbeit?"** samt Porträt und den beiden Knöpfen. Die Zufriedenheitsfrage mit der Skala 1–10 folgt als zweiter Abschnitt. Vorher war es umgekehrt — die Frage kam ohne jede Einordnung als Erstes.
- **Das große Porträt auf der Frage-Seite ist entfallen.** Es stand direkt unter dem Porträt der neuen Startseite, also zweimal hintereinander. Der Satz „Deine ehrliche Antwort ist mir wichtiger als eine perfekte Zahl." bleibt und steht jetzt als Zitat unter der Skala.
- Ohne die Porträt-Spalte hätte der Text auf breiten Bildschirmen links geklebt und rechts eine leere Hälfte gelassen; der Block ist deshalb gedeckelt und mittig gesetzt.
- Die beiden Weiter-Knöpfe unter der Skala („Trotzdem weiterlesen", „Zeig mir das Programm") zeigten auf den Hero — der steht jetzt darüber. Sie führen nun nach unten zum nächsten Abschnitt.
- Aufgeräumt: 17 Regelblöcke für das entfallene Porträt aus `css/programm.css` entfernt.
- Der Präsentations-Modus bleibt unverändert.

---

## v1.153 Beta - Phase 127 · Belohnungen als senkrechte Meilensteinreise
**2026-08-04**

> Migration `schema-phase127.sql` am 04.08.2026 angewandt: 15 echte Stufen, Meilensteine bei 2, 5, 7, 10 und 15, fehlender Wert bei Stufe 1 und bei sieben bereits verdienten Stufe-1-Prämien nachgetragen. Keine neue Prämienzeile entstanden. Nachweise: `docs/2026-08-04-conrad-benefits-uebergabe.md` und `docs/nachweise-benefits/`.

- **Die Belohnungen erfanden Stufen, die es nicht gab.** Die Seite leitete aus den Lücken zwischen den vorhandenen Zeilen zusätzliche 100-€-Boni für die Stufen 4, 6, 8, 9, 11–14 ab. In der Datenbank existieren nur 1, 2, 3, 5, 7, 10, 15 — und Prämien entstehen ausschließlich aus echten Zeilen. Ein Promoter mit vier gewonnenen Kunden hätte einen Bonus gesehen, der in den Auszahlungen nie erscheint.
- Statt waagerechter Roadmap, vier Filter-Chips und getrennter Galerie gibt es jetzt **eine senkrechte Reise von Stufe 1 bis 15**: kleine Geldstufen als ruhige Zeilen, fünf Meilensteine als Bildkarten, die zum Finale hin größer werden. Gebaut für 320 px aufwärts.
- Die Stufenlogik liegt in `js/belohnungs-reise.js` — reine Funktionen, ohne Browser und Datenbank prüfbar (`tests/belohnungs-reise.test.mjs`, 40 Zusicherungen).
- Ein Satz sagt jetzt, was zählt: **gezählt wird, wer Kunde wird** — nicht der weitergegebene Name.
- Die Wunschziele im Promoter-Bereich und in der Berater-Detailseite zeigen nur noch die Meilensteine; ein früher gewähltes Ziel bleibt trotzdem sichtbar.
- Im Präsentations-Modus bleiben nur die fünf Bildkarten, die Geldstufen stehen als ein Satz darunter.
- Die Live-Vorprüfung fand sieben bereits offene Stufe-1-Prämien ohne Wertangabe. Die vorbereitete Migration ergänzt dort den zugesagten Wert von jeweils 100 €, lässt den tatsächlichen Auszahlungsbetrag aber bis zur Auszahlung leer. Ein Sicherheitsstopp verhindert das Anwenden, falls vor der Freigabe inzwischen jemand Stufe 4 erreicht.
- Aufgeräumt: 117 tote Regelblöcke der alten Roadmap und Galerie aus `css/programm.css` entfernt (7.614 → 6.882 Zeilen), bevor die neuen mobilen Regeln dazukamen.

---

## v1.152 Beta - Phase 126 · Themen-Editor entrümpelt
**2026-08-04**

- **Acht von dreizehn Feldern im Themen-Editor hatten keine Wirkung mehr.** Bild, die drei Vorteile (sechs Felder) und der Subtext wurden von keiner Seite mehr gelesen: Die Empfänger-Seite wurde irgendwann neu gebaut, ihre Anker (`eFinanzImg`, `eV1Titel` …) existieren nicht mehr. Der Code lief weiter, fand die Elemente nicht und tat still nichts — deshalb ist es nie aufgefallen.
- Der Editor zeigt jetzt nur noch, was ankommt: **Name, Symbol, Unterzeile, Reihenfolge, Knopf-Beschriftung, Knopf-Ziel** — plus den Schalter „Noch in Arbeit". Die alten Werte bleiben in der Datenbank stehen, sie werden nur nicht mehr angeboten.
- **Das Symbol wird ausgewählt statt getippt.** Vorher musste man den englischen Lucide-Namen kennen („Home", „ShieldCheck"); jetzt stehen zehn Symbole zur Auswahl.
- Beschriftungen in normaler Schrift statt geschriebener Großbuchstaben, mit einem Hinweis darunter, wo das Feld auftaucht. Die Felder sind nach Wirkungsort gruppiert.
- **Fehler behoben:** Beim Speichern wurde eine Reihenfolge von 0 zu einem leeren Wert — die erste Themenseite rutschte damit ans Ende der Auswahl. Fiel bisher kaum auf, weil selten gespeichert wurde.
- Noch offen: Ob ein Thema überhaupt angezeigt wird (`aktiv`), lässt sich weiterhin nur in der Datenbank umstellen. Dafür bräuchte es ein zusätzliches Leserecht, sonst würde ein ausgeblendetes Thema auch aus dem Editor verschwinden.

---

## v1.151 Beta - Phase 125 · Eine Seite, ein Name: Überblick
**2026-08-04**

- **Die Startseite hatte drei Namen:** „Empfehlungs-HUB" oben in der Leiste, „Dashboard" im Menü und „← Hub" auf den Zurück-Buttons — in den Einstellungen sogar „← Dashboard". Man klickte auf Hub und landete auf Dashboard.
- Sie heißt jetzt überall **„Überblick"**: im Menü, im Rechtsklick-Menü und auf allen sechs Zurück-Buttons, die vorher zwischen „Hub" und „Dashboard" schwankten (auch die Pfeile waren uneinheitlich — mal ⌂, mal ←).
- **„Empfehlungs-HUB" bleibt** als Produktname oben in der Leiste stehen — wie ein Logo. Damit meint kein Wort mehr dasselbe wie ein anderes.
- Auch für den Promoter aufgeräumt: Im Willkommens-Fenster hieß es „Zu meinem Dashboard" und „Dein Dashboard-Link". Jetzt steht dort „Zu meinem Bereich" und „Dein persönlicher Link" — passend zum Text der Einladung, die er von dir bekommt.

---

## v1.150 Beta - Phase 124 · Klare Namen: Bonusprogramm, Auszahlungen, Team
**2026-08-04**

- **„Programm" heißt jetzt „Bonusprogramm".** Direkt darüber steht „Präsentation", und beide führten zu Seiten mit ähnlichem Namen — wer „Programm" las, wusste nicht, ob er dort etwas einrichtet oder etwas zeigt.
- **„Prämien" heißt jetzt „Auszahlungen".** Der Name sagt, was du dort tust: fällige Beträge abarbeiten und als ausgezahlt markieren. Die Belohnungen selbst heißen in der Liste weiterhin Prämien — das sind die Dinge, die Auszahlung ist die Handlung.
- Beide Namen wurden **überall** nachgezogen: Menü, Seitentitel im Browser-Tab, Kopfzeile der Seite und Rechtsklick-Menü. Auch die Team-Seite (vormals „Berater") heißt jetzt durchgehend Team.
- Damit gibt es im Berater-Bereich keinen Menüpunkt mehr, der anders heißt als die Seite, auf der man landet.

---

## v1.149 Beta - Phase 123 · Menü aufgeräumt, Admin-Bereiche geschützt
**2026-08-04**

- **Das Menü ist jetzt in zwei Blöcke geteilt.** Oben das Tagesgeschäft (Dashboard, Empfehlungen, Promoter, Prämien, Präsentation, Analysen), darunter eine feine Trennlinie mit der Überschrift „Verwaltung" und dahinter das, was man nur gelegentlich einrichtet (Programm, Team, Einstellungen). Vorher saß die Programm-Verwaltung mitten im Tagesgeschäft.
- **„Prämien" ist nach oben gewandert.** Es ist der einzige Menüpunkt mit einem Zähler für offene Auszahlungen — also eine wartende Aufgabe und kein Verwaltungskram. Vorher stand es fast unten.
- **„Berater" heißt jetzt „Team".** Berater bist du selbst; gemeint sind die Kolleginnen und Kollegen. Der Punkt hatte außerdem dasselbe Symbol wie „Empfehlungen" und hat jetzt ein eigenes.
- **Die drei „Admin · …"-Abschnitte in den Einstellungen sind nicht mehr für alle sichtbar.** Bisher sah jeder eingeloggte Berater die Links zu Repository, Hosting, Datenbank-Editor, Telegram-Bot und Bookings-Seite. Einbrechen konnte damit niemand, aber es ist interne Werkstatt und gehört nicht vor fremde Augen. Sie erscheinen jetzt nur noch für Admins.
- **Kein Springen mehr beim Laden:** Die Admin-Menüpunkte wurden erst nach der Netz-Antwort eingeblendet. Jetzt merkt sich das Menü den Status vom letzten Besuch und korrigiert still, falls er sich geändert hat. Beim Abmelden wird der Merker gelöscht.

---

## v1.148 Beta - Phase 122 · Ein Name für den Promoter-Bereich
**2026-08-04**

- Der Menüpunkt hieß **„Champions (Promoter)"** — führte aber auf eine Seite, die überall Promoter sagt: im Titel, in der Überschrift „Alle Promoter", auf dem Knopf „+ Neuer Promoter" und in der Detailansicht. Wer eine Übersetzung in Klammern braucht, hat den falschen Namen. Jetzt heißt der Bereich durchgehend **Promoter**.
- Angepasst in der Seitenleiste, im Zurück-Link der Promoter-Detailseite, im Befehls- und Rechtsklick-Menü sowie auf der Kachel unter „Programm verwalten".
- **„Deine Champions" im Hub bleibt** — der Abschnitt zeigt die Top 3 mit Gold, Silber und Bronze. Dort ist Champions kein zweiter Name für dasselbe, sondern eine Auszeichnung.

---

## v1.147 Beta - Phase 121 · Aktivitäts-Feed lesbar
**2026-08-04**

- **Im „Was gerade passiert"-Feed liefen Sätze und Status-Label rechts aus der Karte heraus** und wurden hart abgeschnitten („hat einen Anrufwunsch hinter…"). Ursache war kein zu schmaler Text, sondern ein Layout-Fehler: Die untere Zeile stand auf Spaltenrichtung, ihre Inhalte aber zentriert und ohne Umbruch — dadurch wurden sie so breit wie ihr Inhalt, breiter als die Karte selbst.
- Sätze brechen jetzt sauber um, statt abgeschnitten zu werden. Das Status-Label steht linksbündig unter dem Satz und bleibt vollständig sichtbar.
- Namen brechen bei Bedarf auf eine zweite Zeile um, statt mitten im Wort zu enden. Nach zwei Zeilen wird gekürzt, damit die Karten gleichmäßig bleiben.
- Die rechte Spalte ist von 300 auf 340 Pixel gewachsen und der Abstand zur Scrollleiste von 28 auf 14 Pixel geschrumpft — zusammen rund 55 Pixel mehr Platz für den eigentlichen Inhalt.

---

## v1.146 Beta - Phase 120 · Kein Bild-Flackern beim Laden
**2026-08-04**

- **Beim Neuladen war das Profilbild kurz weg** und der Browser zeigte an seiner Stelle sein Kaputt-Bild-Symbol. Grund: Das Bild stand mit leerer Quelle im HTML und bekam sein Foto erst, nachdem der Berater-Datensatz aus dem Netz geladen war.
- Der Kopfbereich zeigt jetzt sofort das zuletzt bekannte Foto und den Namen und ersetzt sie still, sobald die echten Daten da sind. Beim Abmelden wird dieser Merker gelöscht, damit der nächste Login nicht kurz mit dem Bild des Vorgängers begrüßt.
- Bilder ohne Quelle werden nicht mehr angezeigt — kein Kaputt-Symbol mehr, stattdessen ein ruhiger Platzhalter-Kreis, solange geladen wird. Gilt auch für die Login-Seite und das Porträt in der Präsentation.

---

## v1.145 Beta - Phase 119 · Promoter-Liste sortierbar
**2026-08-04**

- Über der Promoter-Liste stehen jetzt vier Sortierungen zur Wahl: **Zuletzt hinzugefügt** (Standard), **Meiste Kunden**, **Meiste Empfehlungen** und **Name A–Z**.
- Bei Gleichstand wird sinnvoll weitersortiert: gleich viele Kunden → mehr Empfehlungen zuerst, danach das jüngere Datum. Die Namenssortierung ignoriert Groß-/Kleinschreibung und ordnet Umlaute richtig ein.
- Die gewählte Sortierung bleibt gespeichert und gilt beim nächsten Besuch wieder.
- Optisch die gleichen Filter-Chips wie auf der Empfehlungen-Seite — kein neues Bedienmuster.

---

## v1.144 Beta - Phase 118 · Promoter-Liste nach Datum, WhatsApp immer verfügbar
**2026-08-04**

- **Die Promoter-Liste sortiert jetzt nach Datum**, neueste zuerst. Vorher stand oben, wer die meisten erfolgreichen Empfehlungen hatte — ein frisch angelegter Promoter landete damit irgendwo mittendrin und war schwer wiederzufinden.
- **„Per WhatsApp senden" erscheint jetzt immer.** Bisher tauchte der Weg nur auf, wenn beim Promoter eine Telefonnummer hinterlegt war. Ohne Nummer öffnet WhatsApp jetzt mit fertigem Text, und der Empfänger wird dort ausgewählt; mit Nummer geht es weiterhin direkt in den richtigen Chat.
- Dasselbe für E-Mail: ohne hinterlegte Adresse öffnet sich das Mailprogramm mit vorbereitetem Betreff und Text, nur das An-Feld bleibt leer.

---

## v1.143 Beta - Phase 117 · Einladungs-Link für Promoter verschicken
**2026-08-04**

- **Der Link zum Promoter-Bereich lässt sich jetzt direkt aus dem Dashboard verschicken.** Bisher gab es ihn nirgends zum Mitnehmen: Man musste den Code aus der Liste ablesen oder die Promoter-Ansicht öffnen und die Adresszeile kopieren. Ohne diesen Link kommt ein Promoter gar nicht in seinen Bereich — er kann weder sein Ziel wählen noch empfehlen.
- **Nach dem Anlegen** öffnet sich das Einladungs-Fenster automatisch: fertiger Link, „Kopieren", „Per WhatsApp senden" (an die hinterlegte Nummer), „Per E-Mail senden" und „Nachricht kopieren" mit vorformuliertem Text für jeden anderen Kanal.
- **Jederzeit erneut schicken**, wenn ein Promoter seinen Link verlegt hat: Rechtsklick auf den Promoter in der Liste → „Einladungs-Link senden…", oder auf der Promoter-Detailseite der erste Button. Der Link bleibt derselbe und funktioniert weiter.
- Beim ersten Versand hängt `&neu=1` am Link — der Promoter wird dann mit „Dein persönlicher Bereich ist bereit" begrüßt statt mit dem Wiederkehrer-Text.
- Im Fenster steht der Hinweis, dass der Link der persönliche Zugang des Promoters ist und nicht in Gruppen gehört.
- Neu: `js/promoter-invite.js` — ein Modul für alle drei Einstiege, damit Text und Link überall identisch sind.

---

## v1.142 Beta - Phase 116 · Belohnungen entdoppelt + Promoter-Einladung korrigiert
**2026-08-04**

- **Jede Belohnung stand doppelt in der Präsentation** (Restaurantbesuch, Weber-Grill, Goldbarren, iPad, Mallorca): In der Belohnungs-Tabelle lag seit dem 23.07. ein zweiter, identischer Satz eines weiteren Beraters, und die Seite hat alle Zeilen ungefiltert geladen. Jetzt bleibt pro Stufe genau eine Karte übrig — bevorzugt die des jeweiligen Beraters, sonst die des Haupt-Beraters.
- Gleiches Problem behoben bei den **Themenwelten** (16 statt 8 in Präsentation und Empfehlungs-Formular), der **Ziel-Auswahl im Promoter-Bereich** (14 statt 7 Ziele), dem **Ziel-Dropdown in der Promoter-Detailseite** und den **Erfolgsgeschichten auf der Empfänger-Seite**.
- Berater ohne eigene Themen-Vorlagen bekommen jetzt den geteilten Satz statt einer fast leeren Themen-Auswahl.
- **Ursache beseitigt:** Die Klon-Zeilen des inaktiven Beraters sind aus der Datenbank entfernt (7 Belohnungen, 8 Vorlagen, 3 Erfolgsgeschichten) — `schema-phase116.sql`, inklusive vollständigem Rollback-Block in derselben Datei. Der Client-Filter bleibt als Netz für die Zukunft.
- **Roadmap-Punkte 1 und 3** wurden fälschlich als Meilenstein dargestellt („Empfehlungs-Bonus" als Label) und ihr Klick lief ins Leere, weil es die Zielkarte in der Galerie nicht gibt. Sie sind jetzt normale 100-€-Stufen. Klick auf einen Meilenstein schaltet die Galerie bei Bedarf zurück auf „Alle Belohnungen".
- **Filter „Geldwert" und „Für guten Zweck"** zeigten nur zwei Beispiel-Karten aus der Tabelle. Jetzt erscheint jede der zehn 100-€-Bonus-Stufen — passend zu dem, was die Roadmap verspricht.
- **Gesamtwert-Zähler** rechnet sich jetzt aus den echten Stufen (aktuell 4.798 €) statt fest im HTML zu stehen.
- **Promoter-Einladung:** Im Erfolgs-Modal führten beide Buttons auf dieselbe Seite. „Erste Empfehlung aussprechen" geht jetzt wie vorgesehen zum Empfehlungs-Formular, „Zu meinem Dashboard" in den persönlichen Bereich. Das „×" schließt das Modal, statt wegzunavigieren — wer nur den Link kopieren will, bleibt jetzt auf der Seite.
- **Anmeldung:** E-Mail oder Telefon ist jetzt Pflicht (eins von beidem genügt). Ohne Kontaktweg war ein Promoter, der seinen Link verliert, nicht mehr erreichbar — und eine Belohnung nicht auszahlbar.
- **Programm verwalten** und **Themen-Seiten** (Admin) listeten ebenfalls alles doppelt und haben beim Speichern einer Themenseite die gleichnamige Zeile des anderen Beraters mitüberschrieben. Beide Editoren arbeiten jetzt nur noch auf den eigenen Zeilen.
- Aufgeräumt: die alte „Potenzialliste" (Phase 71) lag noch als ~260 Zeilen im Code, ihre HTML-Blöcke sind längst raus.

---

## v1.141 Beta - Phase 114 · Belegnummern kollisionssicher
**2026-07-26**

- Belegnummern für Prämien-Auszahlungen werden jetzt über einen sicheren, fortlaufenden Zähler pro Berater und Jahr vergeben (statt „Anzahl + 1") — auch bei gleichzeitigen Auszahlungen kann keine Nummer doppelt entstehen.
- Die Auszahlung sperrt die Prämienzeile kurz, sodass ein Doppelklick keine zweite Nummer erzeugt; bereits vergebene Nummern bleiben unverändert.
- Intern: neuer Zähler im geschützten `private`-Bereich (kein direkter Zugriff), Eindeutigkeitsregel auf der Belegnummer.

---

## v1.140 Beta - Phase 115 · Anonyme Kennzahlen-Zugriffe gesperrt
**2026-07-26**

- Kennzahl- und Team-Funktionen (Momentum-/Trend-Charts, Team-Aktivität und -Präsenz, Promoter-Score, KPI-Tagessnapshot) sowie das Löschen von Promotern können jetzt **nicht mehr anonym** aufgerufen werden — nur noch eingeloggte Berater bzw. interne Systemrollen.
- Der öffentliche Empfänger-/Promoter-Weg (Empfehlung öffnen, absenden, Interesse melden) bleibt unverändert; das Team-Dashboard und der nächtliche Kennzahlen-Lauf (Rolle `postgres`) laufen wie bisher.
- Rein datenbankseitig (Ausführungsrechte entzogen), keine Client-/UX-Änderung.

---

## v1.139 Beta - Phase 109 · Datensparsame Berater-Leserechte
**2026-07-23**

- Ein eingeloggter Berater kann jetzt nur noch seinen eigenen Berater-Datensatz lesen — nicht mehr die Stammdaten (Name, E-Mail, Telefon) der Kollegen. Admins sehen weiterhin alle (für die Team-Übersicht).
- Dashboard, Leads, Branding und Team-Ansicht bleiben unverändert (laufen über eigene, abgesicherte Wege).
- Rein datenbankseitig (zwei RLS-Leseregeln), keine Client-/UX-Änderung.

---

## v1.138 Beta - Phase 108 · Stärkere Promoter-Codes
**2026-07-23**

- Neue Promoter bekommen ab jetzt einen deutlich stärkeren, nicht mehr erratbaren Code (14 zufällige Zeichen statt 4) — egal ob manuell angelegt oder automatisch beim ersten Empfehlungseingang.
- Alle bestehenden Codes bleiben unverändert gültig; alte Links, QR-Codes und Lesezeichen funktionieren weiter.
- Keine sichtbare Änderung für Nutzer, kein Umbau der Seiten.
- Intern: gemeinsamer Code-Generator mit Kollisionsprüfung; ein Zählfeld (`code_version`) unterscheidet alte und neue Codes fürs Monitoring.

---

## v1.137 Beta - Phase 107 · Serverseitiges Rate-Limiting
**2026-07-23**

- Missbrauch wird jetzt serverseitig gebremst: pro Internet-Anschluss (IP) gelten Obergrenzen direkt in der Datenbank — sie greifen auch bei Aufrufen, die am Server vorbei direkt an die Datenbank gehen, nicht nur im Browser.
- Höchstens 20 neue Empfehlungen pro Stunde je Anschluss (gegen Massen-Spam).
- Höchstens 40 „Interessiert"-Meldungen pro Stunde je Anschluss (gegen eine Flut an Benachrichtigungen).
- Höchstens 60 Ladevorgänge des Promoter-Bereichs pro 10 Minuten je Anschluss (gegen automatisiertes Ausprobieren von Promoter-Codes). Ein normaler Ladevorgang zählt dreifach; für echte Nutzung bleibt reichlich Luft.
- Terminbestätigungen (Bookings) und das „Link geöffnet"-Tracking bleiben bewusst ohne Limit.
- Rein datenbankseitig (schema-phase107.sql) — keine Änderung an den Seiten; bestehende Abläufe unverändert.

---

## v1.136 Beta - Phase 106 · Sicherheit & Stabilität
**2026-07-23**

- Fremde können keine erfundenen Empfehlungen mehr direkt in die Datenbank schreiben. Neue Empfehlungen entstehen ausschließlich über den geprüften Weg des Portals — das schützt auch die Prämien vor erfundenen „Kunden".
- Die Kontaktdaten der Berater (E-Mail, Telefon) sind nicht mehr öffentlich abrufbar, sondern nur noch für angemeldete Berater. Name und Foto auf den Empfänger-Seiten kommen weiterhin über den dafür vorgesehenen, begrenzten Weg.
- Ein bestätigter Termin wird nur noch eindeutig zugeordnet: Empfehlen zwei Promoter dieselbe Person mit gleicher Nummer, wird nichts geraten — so kann eine Prämie nie beim falschen Promoter landen.
- Beim Rückrufwunsch erscheint die Bestätigung „Ich rufe dich an" nur noch, wenn der Wunsch wirklich gespeichert wurde. Bei unvollständigem Link gibt es einen ehrlichen Hinweis statt einer falschen Bestätigung.
- Das Empfehlungs-Formular lässt sich nicht mehr durch schnelles Doppelklicken doppelt absenden — ein Klick, ein Lead.
- Eingaben werden serverseitig auf sinnvolle Längen begrenzt und Pflichtfelder geprüft.
- Cache: app.js v46 (Empfänger), app.js v42 (Empfehlen), sw.js v106.

---

## v1.135 Beta - Phase 105 · Empfänger- und Bookings-Tracking
**2026-07-22**

- Linköffnungen werden über einen eigenen Portal-Endpunkt gespeichert und hängen nicht mehr vom extern geladenen Supabase-Modul ab. Dadurch funktioniert das Tracking auch in mobilen WhatsApp-Browsern zuverlässiger.
- Der Klick auf Microsoft Bookings wird ehrlich als „Terminwahl geöffnet“ gespeichert. Er gilt noch nicht als vereinbarter Termin.
- Erst der offizielle Microsoft-Bookings-Auslöser in Power Automate darf einen Termin als bestätigt, geändert oder abgesagt zurückmelden.
- Die Zuordnung erfolgt nur zu einer zuvor geöffneten Terminwahl und über die bereits vorhandene Telefonnummer. Name und E-Mail aus Bookings werden nicht zusätzlich gespeichert.
- Der Promoterbereich unterscheidet Link geöffnet, Terminwahl geöffnet, Termin vereinbart und Termin abgesagt und erkennt diese Änderungen bei der regelmäßigen Aktualisierung.
- Neue abgesicherte Vercel-Endpunkte: `/api/referral-event` und `/api/bookings-event`.
- Cache: app.js v45, baufi.js v3, empfehler-mobile.js v5, referral-tracking.js v2, sw.js v105.

---

## v1.133 Beta - Phase 103 · Mobile-first Promoterbereich
**2026-07-22**

- Der Promoter startet jetzt direkt im ersten Handybildschirm eine neue Empfehlung, statt erst durch Statistiken und Belohnungen zu scrollen.
- Ein geführter Ablauf führt in vier Schritten von Vorname und Handynummer über die Themenauswahl bis zur persönlichen Nachricht und Linkvorschau. Beide Angaben werden vor dem Linkaufbau verständlich geprüft.
- Die acht aktiven Themen werden direkt aus Supabase geladen und als leicht verständliche Auswahlkarten dargestellt.
- Der Verlauf unterscheidet ehrlich zwischen „Link erstellt“, „Versand bestätigt“, „Link geöffnet“, Gesprächswunsch, Kontakt und Kunde.
- Die Versandbestätigung wird dauerhaft über den vorhandenen Promoter-Kontext gespeichert. Es wurde keine parallele Datenhaltung eingeführt.
- Entwürfe bleiben auf dem jeweiligen Gerät gespeichert und können später fortgesetzt werden.
- Neuigkeiten, Wirkung, Wunschziel, persönliche Nachricht und Zusatzinfos sind in einer kompakten mobilen Arbeitsfläche zusammengeführt.
- Der Stand wird beim erneuten Öffnen sowie alle 60 Sekunden aktualisiert, solange die Seite sichtbar ist.
- Die Rollenbezeichnung im Promoterbereich lautet verständlich „Finanzierungsspezialist“.
- Cache: empfehler-mobile.css v1, empfehler-mobile.js v3, config.js v1.133 Beta, sw.js v104.

---

## v1.132 Beta - Phase 102 · Ruhigerer Porträt-Ausschnitt

- Das Porträt auf der ersten Folie ist im Präsentationsmodus etwa zehn Prozent kleiner inszeniert.
- Mehr Schulter und Bildraum reduzieren den Druck bei der Frage nach einer ehrlichen Bewertung.
- Das Zitat ist etwas kleiner und konkurriert nicht mehr mit der eigentlichen Einstiegsfrage.
- Cache: programm.css v69, config.js v1.132 Beta, sw.js v103.

---

## v1.131 Beta - Phase 101 · Vollständig lesbare Vorteile-Folie

- Die Folie „Folgende Vorteile erwarten dich“ ist im Präsentationsmodus vollständig sichtbar.
- Die lange Web-Galerie wird im Pitch ausgeblendet. Sie bleibt auf der normalen Webseite unverändert erhalten.
- Gezeigt werden die beiden Vorteilsbereiche, die Kernaussage, die Belohnungslogik und die Stufen-Roadmap.
- Cache: programm.css v68, config.js v1.131 Beta, sw.js v102.

---

## v1.130 Beta - Phase 100 · Gestraffte Präsentation mit persönlicher Botschaft
**2026-07-22**

- Die doppelte Vorteilsfolie wird in der Präsentationsansicht übersprungen, weil der Kunde seinen persönlichen Mehrwert bereits selbst benannt hat.
- Die erneute Begeisterungsfrage entfällt, weil sie den persönlichen Einstieg wiederholt und den Übergang zum Ablauf verzögert.
- Die bisherige Videofolie mit funktionslosem Abspielknopf wird durch eine persönliche Botschaft an den Empfehlungsgeber ersetzt.
- Die Aussage „Du verkaufst nichts. Du öffnest nur eine Tür.“ wird ohne zweites Beraterporträt inszeniert. Ein warmer Lichtspalt greift das Bild der geöffneten Tür auf.
- Die Präsentation führt jetzt in dreizehn statt fünfzehn Folien schneller von der eigenen Erfahrung zum einfachen Empfehlungsweg.
- Cache: programm.css v67, config.js v1.130 Beta, sw.js v101.

---

## v1.129 Beta - Phase 99 · Emotionale Nutzenfolie in der Empfehlungspräsentation
**2026-07-22**

- Die bisher zahlenlastige Förderfolie stellt jetzt zuerst den Menschen in den Mittelpunkt, dem eine Empfehlung helfen könnte.
- Ein neues Freundschaftsmotiv, die Auswahl zwischen bestem Freund, Familie und Lieblingskollege sowie eine kurze persönliche Reaktion machen die Folie im Kundengespräch interaktiv.
- Die Altersvorsorgereform wird als eigener Deutschland-Baustein mit Gesetzesstatus, Start zum 1. Januar 2027 und direkter Quelle der Bundesregierung erklärt.
- Die Beispielrechnung bleibt erhalten, ist aber klar als erste Orientierung ohne Zusage gekennzeichnet.
- Die Folie ist bei 1.600 × 842 und 2.048 × 1.120 Pixeln vollständig ohne Scrollen lesbar.
- Die Eurobeträge der Beispielrechnung bleiben auch auf schmaleren Präsentationsflächen sicher innerhalb der Ergebniskarte.
- Die Karten der Alltagsfolie nutzen die Präsentationsfläche jetzt großzügiger und bleiben trotzdem vollständig ohne Scrollen sichtbar.
- Die beiden fertigen Themenwelten werden jetzt als große emotionale Bildkarten inszeniert. Die sechs weiteren Themen bleiben bewusst ruhig, damit die Folie hochwertig statt wie ein Fotokatalog wirkt.
- Cache: programm.css v66, programm.js v38, config.js v1.129 Beta, sw.js v100.

---

## v1.128 Beta - Phase 98 · Emotionale Bildwelten im Finanzierungskompass
**2026-07-22**

- Die sechs Ausgangssituationen öffnen jetzt jeweils eine eigene, hochwertige Bildwelt: Orientierung, Neubau, Kauf, Sanierung, Anschlussfinanzierung und Optimierung.
- Die Motive werden erst nach der Auswahl geladen. So bleibt der Einstieg schnell und die Seite wirkt trotzdem deutlich emotionaler.
- Das Beraterporträt zeigt jetzt klar „Finanzierungsspezialist“ sowie „20 Jahre Erfahrung · über 400 Banken im Vergleich“.
- Die wenig aussagekräftige Rollenbezeichnung „Regionaldirektion“ und die Karte „Konzept vor Produkt“ wurden aus diesem Kundenbereich entfernt.
- Cache: config.js v1.128 Beta, sw.js v99.

---

## v1.127 Beta - Phase 97 · Empfehlungspräsentation neu inszeniert
**2026-07-22**

- Die Präsentationsansicht läuft als echtes horizontales Deck mit 15 Folien, Pfeilnavigation und klaren Übergängen statt als lange Scroll-Seite.
- Der Einstieg verbindet eine ehrliche Zufriedenheitsfrage mit persönlichem Porträt und passender Reaktion auf die gewählte Bewertung.
- Die Folie „Ein Ansprechpartner“ zeigt ein modernes Lebensmotiv und öffnet bei Bedarf eine interaktive Übersicht über alle Beratungsthemen.
- Der Ablauf nach einer Empfehlung erklärt jetzt korrekt die Opt-out-Variante: Die empfohlene Person kann sich informieren, einen Termin wählen, widersprechen oder auf den persönlichen Anruf warten.
- Die Themenfolie öffnet echte Vorschauen für die allgemeine Empfehlung und die Baufinanzierung direkt innerhalb der Präsentation.
- Die Alltagsfolie wurde für das Querformat neu geordnet. Alle Beispiele, beide Empfehlungskarten und die interaktive Karriere-Rückseite sind ohne Scrollen vollständig lesbar.
- Cache: programm.css v61, programm.js v37, config.js v1.127 Beta, sw.js v98.

---

## v1.123 Beta - Phase 96 · Persönliche Promoter-Botschaft & ruhigere Optik
**2026-07-22**

- **Persönliche Empfehlungs-Botschaft:** Empfehlungsgeber können in ihrem Bereich einen Satz hinterlegen ("Ein Satz, den jeder Empfohlene sieht"). Der Empfohlene sieht ihn auf der Empfängerseite als **Sprechblase** mit "Das hat <Name> dir mitgegeben". Modell BEIDES: ein Standard-Satz pro Promoter, pro Empfänger überschreibbar. Freiwillig, mit sauberem Rückfall (Empfänger-Satz → Standard → neutraler Satz, nie leer). Klar getrennt von echten Google-Rezensionen, keine erfundenen Sterne.
- **Baufi-Landingpage:** Foto entrundet (kein Blob, kein Glow-Halo, sauberes Porträt) und Rundungen auf eine ruhige Skala (Karten 11px, Buttons 9px) — professioneller, weniger verspielt.
- **Finanzcheck** (separates Projekt, dort v1.6): Antwort-Kacheln und Karten von 16px auf 7px, Buttons von Pille (999px) auf 8px.
- **DB:** neues Feld `empfehler.standard_nachricht` + anon-fähige RPC `update_empfehler_standard_nachricht`; `get_empfehlung_public` und `get_empfehler_by_code` erweitert (`schema-phase96.sql`).
- Cache: app.js v44, empfehler.js v38, sw.js v97.

---

## v1.122 Beta - Phase 95 · Impressum & Datenschutz auf allgemeiner Themenseite
**2026-07-22**

- Die allgemeine Empfängerseite (`empfaenger.html`, Standard-Vorlage für alle Themen außer Baufi) hat jetzt eine feste, dezente Fußzeile mit Impressum und Datenschutz — bisher fehlten diese Pflichtlinks ausgerechnet auf der am häufigsten genutzten Seite (Baufi hatte sie bereits).
- Die Links sind auf allen fünf Schritten sichtbar, auf Desktop und Mobil, und werden über `data-bb` pro Berater passend gebrandet (Kais DVAG-Impressum/-Datenschutz als Vorlage).
- Rein additive Änderung: keine bestehenden Texte, kein Ablauf und keine Datenlogik verändert.

---

## v1.121 Beta - Phase 94 · Finanzierungskompass live
**2026-07-21**

- Baufinanzierungs-Empfehlungen öffnen jetzt einen eigenen mobilen Finanzierungskompass mit sechs verständlichen Ausgangssituationen.
- Neubau, Kauf und Modernisierung führen in einen vorsichtigen KfW- und Regionalförder-Chancencheck. Die Ergebnisse sind klar als Prüfspuren und nicht als Förderzusage gekennzeichnet.
- Bei auslaufender Zinsbindung steht zusätzlich ein lokaler Restschuld-Schnellcheck bereit. Eingegebene Zahlen und Förderantworten werden nicht übertragen.
- Empfehlungsgeber, Empfänger und Berater werden aus der echten Empfehlung geladen. Beraterfoto, Rolle, Kalender, Impressum und Datenschutz werden passend gebrandet.
- Das Öffnen wird wie bisher erfasst. Eine abgeschlossene Kompass-Einordnung markiert echtes Interesse, der Kalender öffnet den persönlichen Buchungsweg und die Abmeldung nutzt den bestehenden sicheren Opt-out-Ablauf.
- Alte Empfehlungslinks ohne Themenparameter werden anhand der gespeicherten Vorlage richtig aufgelöst. Alle anderen Themenseiten bleiben unverändert.
- Cache: baufi.js v2, config.js v1.121 Beta, sw.js v96.

---

## v1.120 Beta - Phase 93 · Durchgängiger Empfänger- und Finanzcheck-Funnel
**2026-07-21**

- Empfängerseite stärker personalisiert und die drei wählbaren Schwerpunkte bis in den Finanzcheck durchgereicht.
- Finanzcheck-Vorschau hochwertig animiert, ohne vorab konkrete Ergebnisse oder Ansprüche vorzutäuschen.
- Vertrauen durch mehr als 20 Jahre Berufserfahrung, über 3.000 betreute Haushalte und persönliche Betreuung ergänzt.
- Mobile Themenkarten mit sichtbaren Symbolen und klarerer Führung aufgewertet.
- Ergebnislogik des Finanzchecks trennt Gesamtwert, direkten monatlichen Spielraum, Förderansätze, steuerliche Ansätze und langfristige Effekte.
- Zwei-Konten-Modell als persönliche Beratungsstrategie mit optionalem Erklärvideo in die Auswertung eingebunden.
- Der Themen- und Herkunftskontext bleibt auch nach dem Laden der zentralen Beraterkonfiguration im Finanzcheck-Link erhalten.
- Cache: app.js v43, config.js v1.120 Beta, sw.js v95.

---

## v1.119 Beta - Phase 92 · Geführte Story-Empfängerseite
**2026-07-21**

- Empfängerseite vollständig als geführte Geschichte mit fünf klaren Schritten aufgebaut.
- Persönliche Empfehlung, Themenwahl, Finanzcheck-Vorschau, Kai-Vertrauen und nächste Entscheidung greifen logisch ineinander.
- Finanzcheck-Vorschau bewusst präzisiert: keine vorgetäuschte Auswertung vor Beantwortung der sieben Fragen.
- Anrufbestätigung, Terminwahl, Austragen, Empfehlungs-Tracking und Berater-Branding bleiben vollständig angebunden.
- Mobile Bedienung, Fokusführung und Abschlussentscheidung für iPhone optimiert.
- Cache: app.js v42, sw.js v94.

---

## v1.118 Beta - Phase 91 · Premium-Empfängerseite
**2026-07-21**

- Empfängerseite vollständig als hochwertiger persönlicher Empfehlungsfunnel neu aufgebaut.
- Empfänger und Empfehlungsgeber werden aus den bestehenden Empfehlungsdaten persönlich angesprochen.
- Finanzcheck mit Potenzial-Landkarte, Ergebnisvorschau und sieben Fragen visuell in den Funnel eingebettet.
- Echte Google-Rezension sowie der öffentlich einsehbare Bewertungsstand ergänzt.
- Anrufprozess transparent dargestellt: Kai meldet sich persönlich, alternativ lassen sich Zeitfenster oder Kalendertermin wählen.
- Diskrete Austragung bleibt mit dem Empfehlungs-Token verknüpft.
- Bestehendes Öffnungs-Tracking, Multi-Tenant-Branding, Anrufwunsch und Beraterlinks bleiben erhalten.
- Mobile Fassung gekürzt und auf Ergebnis, Vertrauen und nächste Handlung fokussiert.
- Cache: app.js v41, sw.js v93.

---

## v1.117 Beta - Phase 90 · Live-TÜV-Korrekturen
**2026-07-21**

- Live-TÜV: Ein neuer Anrufwunsch um 12:44 Uhr erschien im Hub als 10:44 Uhr und "vor 2 Std".
- Ursache: PostgreSQL-Felder vom Typ `timestamp without time zone` kamen ohne Zeitzonenangabe an und wurden vom Browser fälschlich als deutsche Ortszeit gelesen.
- Neue zentrale Funktion `parseDbDate`: Zeitwerte ohne Zone werden als UTC behandelt, echte Werte mit `Z` oder Offset bleiben unverändert.
- Die Datumsfunktion wird direkt geladen und bleibt dadurch auch beim Übergang vom alten App-Cache zur neuen Version kompatibel.
- Korrigiert in Hub, Aktivitätsverlauf, Hot Leads, Team-Momentum, Dashboard-Datumsformatierung, Promoter-Feed und Prämienansichten.
- Der Teilen-Endpunkt liest seine Parameter jetzt mit der modernen URL-API statt über die veraltete Node-Auswertung.
- Themenvorschauen laufen ohne Test-Token und erzeugen dadurch keine künstlichen Öffnungen oder Benachrichtigungen mehr.
- Veraltete Demo-Verknüpfungen wurden aus den Einstellungen entfernt.
- Der Funnel zählt gewonnene Kunden immer auch in den vorgelagerten Stufen. Historische Statusdaten erzeugen dadurch keine Quoten über 100 Prozent mehr.
- Google Tag Manager, Google Analytics und Microsoft Clarity wurden aus allen Portal-Seiten entfernt. Empfehlungs-Token gelangen damit nicht mehr über vollständige Seitenadressen an diese Analyse-Dienste.
- Regressionstest für den Teilen-Endpunkt ergänzt.
- Keine Datenbankmigration und keine Änderung bestehender Zeitwerte.
- Cache: hub.js v45, empfehler.js v37, beleg.js v2, praemien-admin.js v5, sw.js v92.

---

## v1.116 Beta — Phase 89 · Kontext-Infos zur Empfehlung nachreichen
**2026-07-14**

- Auf dem Promoter-Link (`empfehler.html`) lässt sich jede versendete Empfehlung im Feed **aufklappen** („Infos für Kai ergänzen"): Beruf/Position, Verbindung, „Was sollte Kai wissen?", beste Erreichbarkeit, bevorzugter Kanal, „schon Bescheid gegeben", persönliche Nachricht. So kann der Empfehlungsgeber auch **nach dem Senden** noch wertvollen Kontext nachreichen. Bereits ergänzte Empfehlungen sind mit „Infos bearbeiten ✓" markiert.
- Der Berater sieht diese Infos wie gewohnt in der Detailansicht — die jetzt zusätzlich das **Thema** (Baufi, Förderungen, Kinder …) der Empfehlung anzeigt.
- Nur eigene Empfehlungen editierbar, nur diese Kontextfelder (Status/Name/Telefon unberührt).
- DB: RPC `update_empfehlung_kontext` + `get_empfehler_empfehlungen` um Kontextfelder erweitert (`schema-phase25.sql`). Cache: empfehler v34/v36, sw v91, config v1.116.

Hinweis: Die Themen-Auswahl pro Kontakt (Allgemein, Baufinanzierung, Förderungen, Selbständige, Investment, Absicherung, Karriere, Kinder) gibt es im Eingabe-Tool bereits. „Finanzcheck" als eigenes Thema kann bei Bedarf über die Themen-Verwaltung ergänzt werden.

---

## v1.115 Beta — Phase 88 · Ziel & Eingabe auf den Promoter-Link verlagert
**2026-07-14**

Die „Belohnung anklicken → Empfehlungen eintragen"-Mechanik wandert von der (für alle gleichen) Präsentation auf den **individuellen Promoter-Link** `empfehler.html?code=…` — der einzige kunden-eindeutige Ort. So bleiben Empfehlungen, Ziel und Fortschritt pro Kunde dauerhaft nachvollziehbar.

- **Promoter-Link (`empfehler.html`):**
  - **Ziel wählen:** Tippt der Kunde auf eine Belohnung (z. B. Weber-Grill), wird sie als sein Ziel gespeichert; das Eingabefeld öffnet sich direkt mit der passenden Zeilenzahl.
  - **Ziel-Banner mit Fortschritt (beides):** „X abgegeben · Y Kunde geworden · noch Z bis zur Belohnung". Die Belohnung wird weiterhin erst bei Status „Kunde" ausgelöst (Auszahlung unverändert).
  - **Empfehlungen inline eintragen:** Mehrzeilen-Tool (Name/Telefon/Thema → Link per WhatsApp), fest an den Promoter gebunden; Feed & Fortschritt aktualisieren live.
- **Berater-Ansicht (`dashboard/promoter.html`):** neue Karte „Ziel & woran wir arbeiten" — zeigt Ziel + Fortschritt, Ziel per Dropdown änderbar; „woran arbeiten wir" über das Notiz-Feld.
- **Präsentation (`programm.html`):** Empfehlungs-Eingabe entfernt; die Belohnungs-Karten sagen jetzt „Jetzt starten →" (führt zum Anmelden). Nach der Anmeldung wird der Kunde direkt auf seinen individuellen Link geleitet.
- DB: `empfehler.ziel_stufe` + RPC `set_empfehler_ziel` (`schema-phase24.sql`). Cache: empfehler v33/v35, programm.js v35, promoter-detail v2, sw v90, config v1.115.

---

## v1.114 Beta — Phase 87 · Karriere-Karte aufgewertet
**2026-07-14**

- Vorderseite der Karriere-Flip-Karte („Empfehlen gehört zum Alltag") stärker gestaltet:
  - Headline: „Empfiehl eine neue **berufliche** Perspektive."
  - Neue **Live-Status-Pille** „5 Positionen · jetzt gesucht" mit sanft pulsierendem Punkt (Dringlichkeit, motion-safe).
  - Neuer Dreiklang „Fünf Wege. Ein Team. Dein Einstieg." (die 5 Einstiegswege) mit dezentem Trenner.
- Balanciert jetzt sauber mit der Gold-Karte daneben; Flip + Mobile geprüft. Cache: programm.css v54.

---

## v1.113 Beta — Phase 86 · Karriere-Einkommenszeile raus
**2026-07-14**

- Satz „Vom ersten Tag verdienen. Im dritten Jahr sechsstellig." von der Vorderseite der Karriere-Flip-Karte entfernt.

---

## v1.112 Beta — Phase 86 · Vorteile-Orbit + Teamwork im Einstieg
**2026-07-14**

- **Teamwork-Kernbotschaft** („Du hast nicht nur einen Berater, sondern einen Partner für alles, was mit Geld zu tun hat") als kompakte, ruhige Text-Folie in den **Einstieg** gezogen (direkt nach „Was wir gemeinsam bewegt haben").
- **Neue Folie „Vorteile unserer Zusammenarbeit"** (an der bisherigen Team-Position): ein **Orbit** im warmen, hellen Präsentations-Look — Zentralkreis „Ein Partner · Klarheit. Sicherheit. Vermögen." mit 8 umliegenden Vorteils-Kreisen (Ein Ansprechpartner, Strategie statt Produkte, Kurze Wege, Ein Leben lang begleitet, Mehr aus deinem Geld, So wie es dir passt, Verträge im Blick, Alles aus einer Hand) und dünnen Verbindungslinien. Gibt dem Empfehler die Argumente an die Hand.
- Mobil kollabiert das Orbit sauber zu einer Karten-Liste (Zentrum als Banner, Linien aus). Statisch, motion-safe.
- Präsentation jetzt 18 Folien. Cache: programm.css v53, config.js v1.112 Beta.

---

## v1.111 Beta — Phase 85 · Team-Folie aufgeräumt
**2026-07-14**

- Folie „Wir als Team" (Du hast nicht nur einen Berater…) sah unaufgeräumt aus: Die Textspalte erbte das zentrierte `text-align` der Sektion, wodurch die 4 Vorteils-Kärtchen von ihren Icons wegschwammen und die Kanten ausfransten.
- Fix: Team-Textspalte linksbündig (gemeinsame Fluchtlinie von Icon + Text, wie bei allen anderen Split-Folien) und Bild vertikal mittig zur Textspalte (kein leerer Weißraum mehr unten links).
- Cache: programm.css v52, config.js v1.111 Beta.

---

## v1.110 Beta — Phase 84 · Präsentation gestrafft
**2026-07-14**

- Folie „Wer empfiehlt, bewegt drei Menschen" (Win-Win-Win) aus der Empfehlungspräsentation entfernt. Sie stand nach dem eigentlichen Ask („An wen denkst du gerade?") und wechselte dort zurück ins Abstrakte — das bremste die Dynamik. Inhaltlich war sie zudem eine Dopplung der frühen Mehrwert-/Win-Recap-Folien.
- Ergebnis: **17 statt 18 Folien**; der Folienzähler stellt sich automatisch um.

---

## v1.109 Beta — Phase 83 · Globales Rechtsklick-Menü
**2026-07-14**

- **Rechtsklick funktioniert jetzt überall** im Berater-Bereich mit sinnvollen Aktionen — statt des rohen Browser-Menüs. Zentral eingehängt, erscheint auf allen 13 Berater-Seiten, **nie** auf den Kundenseiten.
- **Kontext-sensibel:** markierter Text → „… kopieren"; auf einem Link → „Öffnen / In neuem Tab / Link kopieren"; Telefon-Link → „Anrufen / Nummer kopieren"; E-Mail-Link → „E-Mail schreiben / Adresse kopieren".
- **Immer dabei:** „Neue Empfehlung", „Suche öffnen (⌘K)", Sprünge zu Dashboard/Empfehlungen/Champions/Prämien\*/Einstellungen, „Seite aktualisieren". (\*Prämien nur für Admins.)
- Die bestehenden reichhaltigen Menüs auf Empfehlungs-/Champion-/Prämien-Zeilen (Status, Bearbeiten, Löschen) bleiben unangetastet — das globale Menü weicht ihnen automatisch aus. In Eingabefeldern bleibt das native Menü (Einfügen/Rechtschreibung).
- Neu: `js/context-menu.js` (aus nav.js gemountet), 5 neue Icons. Cache: config.js v1.109 Beta, nav.js v48, sw.js v89.

---

## v1.108 Beta — Phase 82 · Team-Feed kompakter
**2026-07-14**

- Team-Momentum-Feed zeigt jetzt **die 3 neuesten Aktivitäten**; der Rest ist eingeklappt und lässt sich per **„+ N weitere anzeigen"** aufklappen (und wieder „Weniger anzeigen"). Der Aufgeklappt-Zustand bleibt über die 60-Sekunden-Neuladung erhalten.
- Cache: config.js v1.108 Beta, hub.js v44, sw.js v88.

---

## v1.107 Beta — Phase 82 · Team-Momentum
**2026-07-14**

- Neue **Team-Momentum**-Sektion auf dem Hub (Startseite), für jeden eingeloggten Berater:
  - **Online-Anzeige:** pro Teammitglied Avatar + Punkt (grün = gerade aktiv, sonst „aktiv vor …").
  - **Team-Feed:** „Sven hat einen neuen Promoter gewonnen", „Kai hat eine Empfehlung erhalten", „… hat einen Kunden gewonnen" — mit Icon, Zeit, „NEU"-Badge. Live-Aktualisierung alle 60 Sekunden.
- **Nur Berater-Ebene** — Name, Ereignis, Zeit. **Keine** Kundennamen/-nummern. Umgesetzt über datensparsame Server-Funktionen (`team_activity`, `team_presence`) + `berater.last_seen`-Heartbeat (`schema-phase23.sql`).
- Neu: `touchPresence`/`getTeamActivity`/`getTeamPresence` in supabase.js.
- Cache: config.js v1.107 Beta, hub.js v43, sw.js v87.

---

## v1.106 Beta — Phase 81 · Empfehlung einem Promoter zuordnen
**2026-07-14**

- Beim **manuellen Anlegen einer Empfehlung** (`dashboard/neu.html`) gibt es statt des freien Promoter-Namensfelds jetzt eine **Auswahl deiner Promoter**. Ordnest du die Empfehlung einem Promoter zu, **zählt sie zu seiner Liste und seinen Prämien** (echte Verknüpfung über `empfehler_id`, nicht nur ein Namens-Text). „— kein Promoter —" lässt sie unzugeordnet.
- Cache: config.js v1.106 Beta, sw.js v86.

---

## v1.105 Beta — Phase 80 · Zuverlässiges Berater-Login
**2026-07-14**

Die Magic-Link-Einladung war unzuverlässig (Link-Vorschau verbraucht den Einmal-Link) und unsicher (wer ihn öffnet, wird in das Konto eingeloggt). Sie ist raus.

- **„Passwort setzen" ist jetzt der einzige, zuverlässige Weg** für Berater-Logins — in der Berater-Verwaltung pro Karte:
  - Berater hat schon ein Konto → **Passwort neu setzen**.
  - Berater hat noch **kein** Konto → **„Login anlegen"** erstellt das Konto direkt mit Passwort (sofort anmeldbar).
  - Danach: Passwort anzeigen, kopieren, per WhatsApp/E-Mail mit Benutzer (E-Mail) + Login-Link senden.
- **Magic-Link-Knopf entfernt.** Neue Server-Funktion `berater-create-login` (offizielle Admin-API, streng admin-abgesichert) legt Konten an.
- Neu: `createBeraterLogin` in supabase.js.
- Cache: config.js v1.105 Beta, berater-admin.js v7, sw.js v85.

---

## v1.104 Beta — Phase 79 · Menü-Label
**2026-07-14**

- Menüpunkt links heißt jetzt **„Champions (Promoter)"** — klarer, was gemeint ist.
- Cache: config.js v1.104 Beta, nav.js v47, sw.js v84.

---

## v1.103 Beta — Phase 78 · Themen-Status + Promoter-Profil + Detailseite
**2026-07-14**

- **Themen-Seiten „In Arbeit":** In der Themen-Verwaltung kannst du jede Themen-Seite als „🚧 In Arbeit" markieren (Umschalter pro Karte, Badge im Titel). Alle sind aktuell so markiert. Die Markierung ist **nur für dich** — Kunden sehen die Seiten unverändert.
- **Promoter mit mehr Daten:** Beim Anlegen eines Promoters kannst du jetzt zusätzlich **E-Mail, Adresse, Motive/Interessen und eine interne Notiz** erfassen (vorher nur Name + Telefon).
- **Promoter-Detailseite (neu):** Klick in der Champions-Liste auf einen Promoter öffnet **seine Detailseite** — bearbeitbares Profil (inkl. Adresse/Motive/Notiz), Kennzahlen, und **seine Empfehlungsliste mit den gesendeten Links** (inkl. „Link geöffnet ✓"). Jede Empfehlung führt per Klick zur vollen Detailansicht. Buttons: Promoter-Ansicht öffnen, neue Empfehlung aussprechen.
- **Sicher:** Berater dürfen nur ihre **eigenen** Promoter bearbeiten (neue RLS-Update-Policy, `schema-phase22.sql`). Rollback-only verifiziert (eigener Berater darf, fremder nicht). Empfänger-Telefonnummern werden in der Promoter-Liste bewusst nicht angezeigt (Datenschutz).
- Neu: `getEmpfehler`/`updateEmpfehler`/`getEmpfehlerIdByCode` in supabase.js, `dashboard/promoter.html` + `js/promoter-detail.js`.
- Cache: config.js v1.103 Beta, vorlagen-cms.js v6, sw.js v83.

---

## v1.102 Beta — Phase 77 · Programm verwalten + Menü-Struktur
**2026-07-14**

Die Menüführung war irreführend: „Programm" öffnete direkt die Kundenpräsentation. Jetzt sauber getrennt.

- **Menü neu geordnet:**
  - **„Programm"** ist jetzt dein Verwaltungs-Bereich (nur Admin) — nicht mehr die Kundenseite.
  - **„Präsentation"** öffnet die Kundenpräsentation (Vollbild-Slides).
  - **„Champions"** (deine Promoter) ist ein eigener Menüpunkt und für alle Berater erreichbar.
  - Themen-Seiten sind unter „Programm" eingegliedert.
- **Neue Seite „Programm verwalten"** (`programm-verwalten.html`, admin-only): Oben Schnell-Knöpfe (Kundenpräsentation starten, Themen-Seiten, Champions). Darunter zwei echte In-App-Editoren:
  - **Belohnungen / Stufen:** Titel, Wert, Beschreibung, Bild, Icon, Sortierung, Premium-Flag, Kategorien (Geld/Sache/Spende) — bearbeiten, hinzufügen, löschen.
  - **Erfolgsgeschichten:** Titel, Vorher/Nachher, Kennzahl, Thema, aktiv/inaktiv — bearbeiten, hinzufügen, löschen. (Vorher nur über den externen Supabase-Editor pflegbar.)
- **Sicher:** Die Editoren schreiben direkt, aber die Datenbank erlaubt Schreiben ausschließlich dem Admin (RLS). Rollback-only verifiziert (Admin darf, Nicht-Admin blockiert). Doku: `schema-phase21.sql`.
- Neu: Schreib-Funktionen in supabase.js, `js/programm-admin.js`.
- Cache: config.js v1.102 Beta, nav.js v46, sw.js v82.

---

## v1.101 Beta — Phase 76 · Passwort-Verwaltung
**2026-07-13**

Passwörter lassen sich jetzt einfach verwalten — ohne die fehleranfälligen Magic-Links.

- **Jeder Berater ändert sein Passwort selbst** (Einstellungen → „Passwort ändern"): neues Passwort 2× eingeben, speichern. Läuft über Supabases offizielles Auth (`updateUser`).
- **Admin setzt Passwort für jeden Berater** (Berater-Verwaltung → Karte aufklappen → „Passwort setzen"): Feld ist mit einem starken Vorschlag vorbefüllt (🎲 würfelt neu), du kannst es übernehmen oder überschreiben → „Setzen". Danach wird das Passwort angezeigt zum Kopieren und per WhatsApp/E-Mail direkt an den Berater senden. Der Berater kann es anschließend selbst ändern.
- **Sicher gebaut:** Das Admin-Setzen läuft über eine Datenbank-Funktion, die serverseitig hart prüft, dass der Aufrufer Admin ist (`admin_set_berater_password`, `schema-phase20.sql`, Bcrypt via pgcrypto). Kein Service-Schlüssel im Browser. Rollback-only verifiziert (ok/forbidden/too_short). Berater ohne Login: Feld ist gesperrt mit Hinweis „erst Einladen".
- Neu: `updateMyPassword` + `adminSetBeraterPassword` in supabase.js, `generatePassword()` in berater-admin.js.
- Cache: config.js v1.101 Beta, berater-admin.js v6, sw.js v81.

---

## v1.100 Beta — Phase 75 · Ruhigere linke Menüführung
**2026-07-13**

- **Sidebar entruhigt:** Untermenüs (Empfehlungen, Programm, Themen-Seiten) klappten bisher schon beim bloßen Drüberfahren mit der Maus hart auf und wieder zu — das flackerte und schob die anderen Menüpunkte ruckartig weg. Jetzt: Untermenüs klappen **nur noch per Klick auf einen kleinen Pfeil** weich auf/zu (sanfte Animation), der aktuelle Bereich ist automatisch offen, und geöffnete Bereiche werden gemerkt (auch nach Neuladen). Der Menüpunkt selbst navigiert wie gewohnt. Der seitliche 2px-Ruck beim Hover ist weg — nur noch eine zarte Tönung.
- Technisch: `.nav-subs` von `display`-Umschaltung auf animierte Grid-Rows umgestellt, Hover-Trigger entfernt, Chevron-Toggle mit localStorage-Zustand (`js/nav.js` + `css/dashboard.css`).
- Cache: config.js v1.100 Beta, nav.js v45, dashboard.css v43, sw.js v80.

---

## v1.99 Beta — Phase 74 · Promoter verwalten (anlegen + löschen)
**2026-07-13**

- **Promoter-Liste** (`dashboard/empfehler.html`) bekommt Verwaltung:
  - **+ Neuer Promoter**: Knopf oben rechts (und im Rechtsklick-Menü) öffnet ein kleines Fenster (Name + Telefon) und legt den Promoter direkt an.
  - **Rechtsklick auf einen Promoter**: Ansicht öffnen · Neuer Promoter · **Löschen**.
  - **Löschen nur bei leeren Promotern:** Hat ein Promoter schon Empfehlungen ausgesprochen, wird er zum Schutz **nicht** gelöscht (klare Meldung „hat N Empfehlungen"). Nur Karteileichen/Test-Promoter ohne Empfehlungen sind löschbar. Prämien/Benachrichtigungen eines leeren Promoters werden automatisch mit entfernt.
- Neu: DB-Funktion `delete_empfehler` (SECURITY DEFINER, pro Berater gescoped, prüft Empfehlungs-Anzahl; `schema-phase19.sql`), `deleteEmpfehler` in supabase.js. Anlegen nutzt den bestehenden `create_empfehler`. Rechtsklick-Menü/Modal/Toast aus dem bestehenden Dashboard-Baukasten (kein neues CSS).
- Cache: config.js v1.99 Beta, sw.js v79.

---

## v1.98 Beta — Phase 73 · Multi-Tenant-Fix: Finanzcheck-CTA
**2026-07-13**

- **Fix (Sandro-Feedback #7b):** Der „Detail-Analyse starten"-Knopf im Förder-Rechner (`programm.html`) zeigte für **jeden** Berater fest auf Kais `finanzcheck.kaiblobel.de`. Jetzt: Bei Kai bleibt es der Finanzcheck, bei anderen Beratern führt der Knopf zum eigenen Buchungslink (fehlt der, wird er ausgeblendet). Neuer Hook `data-bb="finanzcheck"` in `berater-brand.js`, Unterscheidung über `ENV_BERATER_ID` (kein hartcodierter Slug).
- Restliches Sandro-Feedback gegen aktuellen Stand geprüft: #7a/#8/#9/#10 (Branding) und #1/#2/#5 (Mobile NPS + Roadmap) waren bereits behoben (Phase 52/56), am Handy verifiziert.
- Cache: config.js v1.98 Beta, sw.js v78.

---

## v1.97 Beta — Phase 72 · Fix: Empfehlung löschen
**2026-07-13**

- **Bugfix:** Löschen einer Empfehlung (Rechtsklick > Löschen, Phase 70) zeigte „gelöscht", aber die Empfehlung war beim Neuladen wieder da. Grund: Die Datenbank hatte für Empfehlungen keine Lösch-Berechtigung hinterlegt (RLS-Policy fehlte), also wurde das Löschen still ignoriert. Jetzt darf ein eingeloggter Berater seine eigenen Empfehlungen löschen. Reine Datenbank-Änderung, wirkt sofort. Doku: `schema-phase18.sql`.
- Cache: config.js v1.97 Beta, sw.js v77.

---

## v1.96 Beta — Phase 71 · Empfehlungs-Broschüre digital
**2026-07-13**

> ⚠️ **Beta:** Die Potenzialliste + Promoter-Nachverfolgung sind neu und werden im echten Kundengespräch noch erprobt. Kennzeichnung nur im Berater-Bereich (Versionspille/Changelog), die Kundenseite bleibt neutral.

Die gedruckte Empfehlungs-Broschüre wird digital: Inspiration, direkte Erfassung und Nachvollziehbarkeit — alles im moderierten Gesprächstool `programm.html` und im Promoter-Dashboard.

- **Inspiration-Block** (`programm.html`, neuer Abschnitt vor der Themen-Auswahl): 11 echte Kunden-Aussagen als Zitat-Karten („Wie spreche ich meine Kontakte an?") — über 500 €/Jahr frei, 3 Jahre eher schuldenfrei, Nebenverdienst 500–1000 € u. a. Zeigt dem Kunden, worüber er empfehlen kann. Erscheint automatisch auch im Präsentationsmodus.
- **Potenzialliste** (`programm.html`, neuer Abschnitt nach den Belohnungen): Der Kunde wählt eine Anzahl (3/5/10/eigene Zahl), es öffnen sich genau so viele Zeilen (Name + Telefon + Thema). Pro Zeile erstellt er mit einem Klick seinen persönlichen Empfehlungslink und verschickt ihn direkt per WhatsApp (oder kopiert ihn). Die Empfehlung landet wie gewohnt am Promoter im Portal. Die Belohnungs-Karten haben jetzt einen Knopf „Diese N Empfehlungen jetzt eintragen", der die Anzahl vorbelegt und hinscrollt.
  - **Registrierung direkt im Block:** Ist der Kunde noch kein Promoter, gibt er Name (+ optional Telefon) direkt in der Potenzialliste ein und legt sofort los, ohne zum Anmelde-Formular hochzuscrollen.
  - **Nichts geht verloren:** Getippte Kontakte werden lokal zwischengespeichert. Lädt die Seite neu (Handy, versehentlicher Zurück-Wisch), sind die Namen noch da, erstellte Links bleiben als „erledigt" markiert. Ein „Liste leeren" räumt bewusst auf.
- **Nachvollziehbarkeit** (Promoter-Dashboard `empfehler.html?code=…`): Der Feed zeigt pro Empfehlung jetzt zusätzlich, ob der Link **schon geöffnet** wurde (mit Datum) und bietet „Link kopieren". Der Berater sieht dasselbe, weil er im Dashboard auf den Promoter klickt. Datenbank-Funktion `get_empfehler_empfehlungen` additiv um `link_geoeffnet`/`link_geoeffnet_at`/`link_token` erweitert (Telefon bleibt bewusst draußen — Datenschutz). Dok: `schema-phase17.sql`.
- Cache: config.js v1.96 Beta, programm.css v51, programm.js v34, empfehler.css v32, empfehler.js v34, sw.js v76.

---

## v1.95 — Phase 70 · Rechtsklick-Kontextmenü wird vollwertig
**2026-07-13**

Das Rechtsklick-Menü kann jetzt mehr als nur Status setzen — direkt aus der rechten Maustaste bearbeiten, löschen und neu anlegen.

- **Empfehlungen** (`/dashboard/empfehlungen.html`): Das Schnellmenü bekommt drei neue Einträge:
  - **Bearbeiten…** öffnet ein kleines Overlay direkt auf der Liste — Name, Telefon, Thema und Notiz ändern, speichern, fertig, ohne die Seite zu verlassen.
  - **Neue Empfehlung…** springt zum Anlege-Formular.
  - **Löschen…** entfernt die Empfehlung nach Rückfrage.
  Die bestehenden Status-Einträge bleiben unverändert.
- **Prämien** (`/praemien.html`, Admin): Prämien bekommen erstmals ein Rechtsklick-Menü, das die vorhandenen Aktionen bündelt (Auszahlen, Variante/Notiz bearbeiten, auf „offen"/„verzichtet" setzen, Beleg öffnen) und neu: **Löschen** nach Rückfrage. Die Einträge passen sich dem Status an (offen vs. ausgezahlt/verzichtet).
- Neu: `updateEmpfehlung()` (Stammdaten-Update) in `js/dashboard.js`, `deletePraemie()` in `js/supabase.js`.
- Cache: config.js v1.95, dashboard.css v42, praemien-admin.js v4, sw.js v73.

---

## v1.94 — Phase 69 · Fix: Changelog-Link aus Dashboard-Unterseiten
**2026-06-29**

- **Bugfix:** Klick auf die Versionsnummer in der Seitenleiste führte auf Dashboard-Unterseiten (z. B. `/dashboard/empfehlungen.html`) zu einem **404** — der Link `changelog.html` war relativ und landete bei `/dashboard/changelog.html`. Jetzt absolut (`/changelog.html`), funktioniert von überall.
- Cache: nav.js v44, sw.js v72.

## v1.93 — Phase 69 · WhatsApp-Follow-up bei Hot Leads
**2026-06-29**

- Im **Hub** bekommt jede Hot-Lead-Zeile rechts einen grünen **WhatsApp-Button**. Ein Klick öffnet WhatsApp mit einer vorausgefüllten, freundlichen Follow-up-Nachricht (Name eingesetzt), ohne dass man erst in die Empfehlung gehen muss. Der Klick auf die Zeile öffnet weiterhin die Detailseite; der WhatsApp-Klick ist sauber davon getrennt.
- Cache: hub.js v42, hub.css v43, sw.js v71.

## v1.92 — Phase 68 · Rechtsklick-Schnellmenü + dynamische Prämien
**2026-06-24**

- **Rechtsklick auf eine Empfehlung** öffnet ein Schnellmenü: Status direkt setzen (Als Kunde gewonnen, Anrufwunsch, Kontaktiert, Kein Interesse, zurück auf offen) oder als **Interessent** markieren — ohne erst die Empfehlung zu öffnen. Der aktuelle Status ist im Menü mit einem Haken markiert, der Name steht im Kopf, eine kurze Bestätigung (Toast) blendet ein. Schließt bei Klick außerhalb, Escape oder Scrollen.
- **Prämien-Karten dynamischer:** Statt nur „Stufe 1" steht jetzt **„Verdient durch [Kundenname] · N. gewonnener Kunde"** — die Prämie ist sichtbar mit dem konkreten Kunden verknüpft. Der **Betrag erscheint groß in Gold** (sobald für die Stufe ein Wert hinterlegt ist). Auch die Auszahl-Überschrift zeigt Betrag + Kunde statt nur die Stufe.
- **Prämien-Badge premiumer:** sanfter Gold-Verlauf, dezenter Puls, feinerer Schatten.
- Neu: `setInteressiert()` + `getKundenJeEmpfehler()` (ordnet Stufe N dem N. gewonnenen Kunden zu), `.ctx-menu`/`.toast`-Styling.

Cache: dashboard.css v41, praemien-admin.js v3, sw.js v70.

---

## v1.91 — Phase 67 · Prämien-Badge (offene Prämien ploppen auf)
**2026-06-24**

- Am Menüpunkt **„Prämien"** erscheint jetzt ein **Zähler-Badge** (Terracotta) mit der Anzahl offener Prämien. Sobald eine Empfehlung auf „Kunde" gesetzt wird, legt der Trigger die Prämie an und das Badge ploppt auf allen Seiten auf, ohne dass man extra reinschauen muss. Eingeklappte Sidebar: kleiner Punkt am Icon. Zahl aktualisiert sich beim Seitenaufruf; verschwindet, sobald alle Prämien ausgezahlt/erledigt sind.
- Neu: `getOffenePraemienCount()` (RLS-scoped), Badge-Injektion in `js/nav.js` (nur Admin), `.nav-badge`-Styling.

Cache: nav.js v43, dashboard.css v40, sw.js v69.

---

## v1.90 — Phase 66 · Kompletter QA-Durchlauf + Fixes
**2026-06-24**

Alle Seiten und der gesamte Empfehlungs-Flow mit Dummy-Daten durchgetestet (Konsolen-Fehler, Render, Verknüpfungen). Ergebnis: läuft. Zwei echte Fehler gefunden und behoben:

- **Versionsnummer-Pille** (`.nav-version`) wurde auf allen Dashboard-Unterseiten als unformatierter blauer Link angezeigt: die Regel lag in `hub.css`, das diese Seiten nicht laden. Regel nach `dashboard.css` verschoben (wird überall mit der Nav geladen), aus `hub.css` entfernt.
- **Totes Stockbild:** der Hintergrund der „Handwerker"-Alltagskachel (Unsplash) lieferte 404. Durch ein geprüft funktionierendes Bild ersetzt.
- Cache-Buster über alle Seiten normalisiert (dashboard.css v39, hub.css v42, programm.css v49) — vorher uneinheitlich.
- Getestet end-to-end: Promoter anlegen → Empfehlung (an Promoter gebunden) → Promoter-Dashboard (Link/Feed/Fortschritt) → Empfänger-Link → Detail/Status „Kunde" → Prämie-Trigger → Auszahlen/Beleg. Alles grün. (Harmloses Rest-404: Supabase-Root-Link-Prefetch auf der Settings-Seite, kein Funktionsfehler.)

Cache: dashboard.css v39, hub.css v42, programm.css v49, sw.js v68.

---

## v1.89 — Phase 65 · Paket 4 (Teil D) · Auszahl-Workflow + Beleg/Quittung
**2026-06-24**

Der Prämien-Auszahlung wird „rund" gemacht: in einem Schritt auszahlen, dokumentieren, Beleg erzeugen.

- **DB (schema-phase16.sql):** `praemien` um `betrag`, `auszahlungsart`, `empfaenger_adresse`, `beleg_nr` erweitert; RPC `auszahlen_praemie(...)` (setzt Status + Details, vergibt laufende Beleg-Nr `EMP-<Jahr>-<NNNN>` pro Berater).
- **Auszahl-Dialog (praemien.html / praemien-admin.js):** „Auszahlen…" öffnet ein Modal (Betrag vorbefüllt, Auszahlungsart, Variante, optionale Anschrift, Datum, Notiz). Bestätigen → Auszahlung + Beleg-Nr → Beleg öffnet im neuen Tab. Ausgezahlte Prämien zeigen die Beleg-Nr + „Beleg öffnen".
- **Beleg-Seite (beleg.html + js/beleg.js):** druckbares, premium-schlichtes Dokument, adaptiv nach Auszahlungsart (Geld = Quittung, Sache = Empfangsbestätigung, Spende = Spendenbeleg): Aussteller/Empfänger (mit Anschrift), Anlass, Prämie/Variante, Betrag, zwei Unterschriftsfelder, Signatur-Footer. `@media print` (A4, Buttons weg); Dateiname für „als PDF speichern" nach Konvention vorbelegt (`YYYY-MM-DD Name Empfehlungspraemie Beleg EMP-…`).
- End-to-end getestet (zwei Auszahlungen → Beleg-Nr fortlaufend EMP-2026-0001/0002, Beleg rendert + Druckansicht), Dummy entfernt.

Cache: praemien-admin.js v2, beleg.js v1, sw.js v67.

**Offen (Teil B):** neue Stufen-Leiter erst nach Werte-Freigabe Kai/Sandro.

---

## v1.88 — Phase 64 · Paket 4 (Teil A + C)
**2026-06-24**

- **Erkenntnis:** Die Belohnungs-Logik ist bereits conversion-basiert (Stufe = Anzahl Empfehlungen mit Status „Kunde", nicht abgegebene Empfehlungen). Sandros struktureller Kernpunkt war damit schon erfüllt, kein Umbau nötig.
- **Wirtschaftlichkeits-Analyse (Teil A):** durchgerechnet (intern, liegt in OneDrive, nicht im Repo). Ergebnis: im realistischen Bereich (Stufe 1–10) bewegt sich die Belohnungsquote um die 30 %, kein Totalschaden. Mallorca (15) ist bewusster Marketing-Leuchtturm.
- **Prämien-Tracking (Teil C):** neue Tabelle `praemien` (Migration schema-phase15.sql) + RLS + `sync_praemien` + Trigger auf `empfehlungen` (Status → „Kunde" legt verdiente Prämien automatisch als „offen" an). Neue Admin-Seite `praemien.html` + `js/praemien-admin.js` (admin-only, Nav-Punkt „Prämien"): zeigt verdiente Stufen-Prämien je Empfehler, „als ausgezahlt" markieren, Variante/Notiz festhalten. End-to-end mit Dummy-Daten getestet.

Cache: nav.js v42, sw.js v66.

**Offen (Teil B):** neue Stufen-Leiter (3. Empfehlung knallt, strecken, mydays/Auto) erst nach Freigabe der Werte durch Kai + Sandro.

---

## v1.87 — Karriere-Karte: Desktop-Höhe gefixt
**2026-06-24**

- Auf dem Desktop lief der Vorderseiten-Text der drehbaren Karriere-Karte („Empfiehl eine neue Perspektive") 12 px über die feste Höhe → „Was dahintersteckt →" wurde unten abgeschnitten. Hero-Karten-Höhe auf dem Desktop 220 → 244 px (Hero-Card + Flip-Inner). Mobil unverändert (150/200 ab max-width 900). Overflow jetzt 0.

Cache: programm.css v48, sw.js v65.

---

## v1.86 — Win-Win-Paar: Emojis raus, Premium-Icons rein
**2026-06-24**

- Die per-Zeile-Emojis im Win-Win-Paar wirkten billig → entfernt. Stattdessen **saubere Line-Icons (SVG) vor** jeder Zeile: Datei-Check, Telefon, Schild-Haken (Bekannter, Marine) bzw. Geschenk, Trend-Pfeil, Haken-Kreis (Du, Gold).
- Karten-Inhalt links ausgerichtet (Feature-Listen-Look), wirkt hochwertiger.
- Der eine freundliche 🎁 hinter dem Anker-Satz bleibt (war so gewollt, lockert auf).

Cache: programm.css v47, sw.js v64.

---

## v1.85 — Rolle „Regionaldirektion" + Empfehlungsbonus-Bild
**2026-06-24**

- **Rolle:** „Regionaldirektionsleiter" → **„Regionaldirektion"** überall (DB-Feld `berater.rolle` für Kai + Fallback-Texte in programm.html, empfehler.html, empfaenger.html, config.js). Footer/Branding ziehen den Wert aus der DB.
- **Empfehlungsbonus-Bild:** zurück auf den **Taschenrechner** (`kundenlos.jpg`) statt der Einkaufstüten (`standard.jpg`). Betrifft alle Bonus-Kacheln in der Galerie.

Cache: programm.js v32, sw.js v63.

---

## v1.84 — Win-Win-Paar: Emojis pro Zeile
**2026-06-24**

- Jede Zeile im Win-Win-Paar bekommt ein passendes Emoji ans Ende (🔍 Finanz-Check, 🤝 Gespräch, 😊 keine Verpflichtung, 🙏 Dankeschön, 📈 wird größer, 👌 freie Wahl), der Anker-Satz ein 🎁. Bringt Leben rein, ✓-Häkchen bleiben als Garantie-Signal.

Cache: programm.css v46, sw.js v62.

---

## v1.83 — Win-Win-Paar in der Benefits-Sektion
**2026-06-24**

Aus Variante-B-Mock übernommen (nur das Win-Win-Element, Rest verworfen):

- Oben in der Benefits-Sektion zwei Karten nebeneinander: **„Dein Bekannter bekommt"** (Finanz-Check unverbindlich, persönlicher Anruf statt Callcenter, null Verpflichtung) und **„Du bekommst"** (Dankeschön ab der 1. Empfehlung, wird größer, freie Wahl). Marine- bzw. Champagne-Akzent.
- Darunter eine **Anker-Pille**: „Deine erste Belohnung ist nur eine Empfehlung entfernt." Senkt die Einstiegshürde.
- Mobile-first: gestapelt auf dem Handy, ab 680 px nebeneinander.
- Mock-Datei `benefits-mock.html` bleibt zum Nachschauen liegen (noindex).

Cache: programm.css v45, sw.js v61.

---

## v1.82 — Themen-Kacheln mobile-first kompakt
**2026-06-24**

Themen-Kacheln nach Kai-Feedback verschlankt (100 % mobile-first):

- **2 Kacheln pro Reihe auf dem iPhone** (Grid mobile-first 2-spaltig, ab 960 px 3-spaltig). Vorher 1 große Kachel pro Reihe.
- Flip-Höhe 220 → 192 px (mobil), Desktop 206 px; Face-Padding, Icon (60 → 40 px, ab 640 px 52 px), Titel, Headline, Rückseiten-Texte und Vorteile durchgehend kompakter → deutlich weniger Leerraum.
- Rückseiten-Text auf 2 Zeilen geklemmt, passt ohne Überlauf in die kleinere Kachel. Farbige Themen-Akzente (Phase 64) bleiben erhalten.
- Ergebnis: statt 1–2 sind jetzt ~6 Kacheln gleichzeitig auf dem iPhone sichtbar.

Cache: programm.css v44, sw.js v60.

---

## v1.81 — Belohnungs-Galerie: gruppierte Bonus-Kacheln + Mobil-Optimierung
**2026-06-24**

Feinschliff nach Kai-Feedback zum Meilenstein-Pfad:

- **Bonus wieder als feste Kachel**, aber gruppiert je Lücke: „1. Empfehlung", „3.–4. Empfehlung · je 100 €", „6.", „8.–9.", „11.–14." — statt 10× einzeln oder als schlanker Verbinder. Bonus-Kacheln dezent cremefarben abgesetzt, damit die Premium-Belohnungen (Restaurant, Watch, Gold, iPad, Mallorca) herausstechen. Desktop behält das alternierende Bild-links/rechts-Layout.
- **iPhone-Optimierung:** Galerie-Karten auf dem Handy als kompaktes Flex-Layout (Bild 84 px links, Inhalt rechts). Karten von ~212 px auf ~144 px Höhe → es sind jetzt ~4 Karten statt 2 gleichzeitig sichtbar. Ursache war ein verstecktes `padding: 32/36 px` am `.reward-body` aus dem SF-Redesign, das mobil genullt wird.

Cache: programm.js v31, programm.css v43, sw.js v59.

---

## v1.80 — Belohnungs-Galerie als Meilenstein-Pfad
**2026-06-24**

Korrektur zu B6 (Kai): die lückenlose 1–15-Galerie wiederholte „Empfehlungsbonus 100 €" 8–10× und wirkte monoton. Jetzt als Meilenstein-Pfad:

- Nur die **Premium-Belohnungen** (Stufe 2, 5, 7, 10, 15) sind große Karten-Stationen, einheitliches Layout (Bild links), kein alternierendes Spiegeln mehr.
- Dazwischen schlanke **Verbinder** mit Champagne-Pille, die die Bonus-Stufen zusammenfassen statt sie zu wiederholen: „Stufe 3–4 · je 100 € Empfehlungsbonus", „Stufe 11–14 · je 100 €" usw. Die genannten Stufennummern lösen Sandros „wo ist die 4" sauber.
- Abschluss-Verbinder „Und danach · für jede weitere Empfehlung 100 €" (fortlaufend).
- Gefilterte Modi (Geldwert/Sache/Spende) zeigen weiterhin die passenden Karten.

Cache: programm.js v30, programm.css v42, sw.js v58.

---

## v1.79 — Phase 62 · Sandro-Review (Runde 3) · Paket 2 + 3
**2026-06-24**

Reihenfolge, Belohnungs-Galerie und drehbare Kacheln aus Sandros PDF:

- **B1:** Block „Ich rufe selbst an / Was passiert nach deiner Empfehlung" (Trust-Brücke) hinter „So funktioniert es" + Themen verschoben. Erst Ablauf verstehen, dann Vertrauen, dann Belohnung.
- **B5:** Stufen-System-Erklärtext deutlich verschlankt (war „sehr viel Text / plump"). Eine klare Zeile statt Absatz.
- **B6:** Galerie-Sprung „3 → 5 … wo ist die 4?" gelöst. Im Modus „Alle" laufen die Stufen jetzt lückenlos 1–15; die 100-€-Bonus-Zwischenstufen erscheinen kompakt und mit einheitlichem Bild, die Premium-Belohnungen stechen heraus.
- **B2:** Themen sind jetzt **drehbare Kacheln** (Tap/Klick/Tastatur). Vorderseite Thema + Headline, Rückseite Kurzbeschreibung + drei Vorteile. Mobil-sicher per Klasse statt :hover.
- **B3:** Neues **7. Thema „Für deine Kinder"** (DB-Vorlage `kinder`, Icon Heart). Generische Vorlage `allgemein` aus dem Grid gefiltert; Header „Sechs Themen" → „Sieben Themen".
- **B4:** alltag-Karten umformuliert (kein „Finanz-Tipp" mehr): Gold = „Empfiehl meine Beratung", Marine = **drehbare Karriere-Karte** „Empfiehl eine neue Perspektive" mit drei Perspektive-Punkten auf der Rückseite (berufliche Perspektive kommt jetzt klar rüber).

Cache: programm.js v29, programm.css v41, sw.js v57.

**Noch offen (Paket 4 · Strategie):** Belohnungs-Logik auf „Kunde geworden" statt „Empfehlung abgegeben", Stufen-Balance (3. Empfehlung soll reinknallen, Belohnungen strecken), neue Belohnungsideen (mydays-Event, Auto bei 25), Wirtschaftlichkeit final gegenrechnen.

## v1.78 — Phase 61 · Sandro-Review (Runde 3) · Paket 1
**2026-06-24**

Erste, risikolose Runde aus Sandros PDF-Anmerkungen (Wording, ein Bug, Belohnungswerte):

- **A1 (Bug):** „Detail-Analyse" öffnet `finanzcheck.kaiblobel.de?from=empfehlung`; der „Zurück zur Website"-Button dort führt jetzt zurück auf die Empfehlungsseite (per Referrer, mit sicherem Fallback) statt auf die Startseite. Betrifft auch `Kundenseite/finanz-check.html`.
- **A2:** Hohle Schlusszeile „Genau darum tut es hier wirklich was." entfernt.
- **A3:** Redundanz im Mehrwert-Intro aufgelöst („Erzähl es mir kurz" raus, ein klarer Hinweis bleibt).
- **A4:** Platzhalter-Vorschläge in Mehrwert-Feld 2 und 3 ergänzt (vorher nur „…").
- **A5:** Markierten Satz vereinfacht („Was dir geholfen hat, kann auch deinen Liebsten helfen."); Überschrift „Wieviel kann dein Tipp jedes Jahr sparen?" → „Was bringt dein Tipp jedes Jahr?".
- **C (Belohnungen, DB):** Weber/Apple Watch auf **449 €** fixiert (Modellnummer „Series 10" raus, damit es nicht veraltet); Goldbarren auf **500 €** hoch, „5 g"/„Geiger Original" raus → „Goldbarren im Wert von 500 €". Gesamt-Counter von unrealistischen **24.000 €** auf den echten Stufen-Gesamtwert **~4.800 €** korrigiert.

**Noch offen (Pakete 2–4):** Reihenfolge „So funktioniert es" vor Belohnungen, drehbare Themen-Kacheln + 7. Thema „Kids", Stufen-Darstellung (3→5-Sprung), Belohnungs-Logik auf „Kunde geworden" + neue Stufen-Balance.

## v1.75 — Phase 59 · Sandro-Review (Runde 2)
**2026-06-23**

Aufbauend auf Sandros PR #1 (Fixes #1/#2/#5 für NPS + Roadmap, gemergt) die nächsten Punkte:

- **#7a** Footer-Initialen „KB" → `data-bb="initialen"` (aus `b.name` generiert, z.B. „SW" für Sandro).
- **#10** Video-Overlay-Rolle „Initiator" → `data-bb="rolle"` (zeigt die Rolle des jeweiligen Beraters; für Kai nun „Regionaldirektionsleiter").
- **#11** Doppelte Formulierung „was dahintersteckt" in der Video-Lede aufgelöst.
- **#12** FAQ „An wen empfehlen?" — Verweis auf nicht vorhandene „oben genannte Kriterien" durch konkreten Text ersetzt.

Cache: sw.js v54. (berater-brand.js erweitert um `initialen`-Hook.)

**Noch offen (brauchen Entscheidung):** #6 Belohnungstexte/DB-Wording, #7b/#7c Finanzcheck-/Google-Bewertungs-Link pro Berater, #8/#9 Testimonials pro Berater (aktuell für Nicht-Kai ausgeblendet), #3/#4/#13 Feature-Ideen.

## v1.74 — Phase 58 · QA-Fixes (Standort + Promoter-Dashboard pro Berater)
**2026-06-23**

- **Falscher Standort:** Präsentations-Footer zeigte „Team Wachsbleiche · Hamburg" → korrigiert zu **Cottbus**.
- **Promoter-Dashboard (empfehler.html) zeigte immer Kai:** Foto + Footer-Name/Rolle waren fest verdrahtet. Jetzt per `data-bb` + `applyBeraterBrand` (Berater über den Promoter-Code geladen) → ein Promoter von Sven/Sandro sieht den richtigen Berater.
- Bekannt/offen: Settings-Seite zeigt Admin-/Infra-Links (GitHub/Vercel/Supabase/Bookings) für alle Berater — sollte admin-only werden (separater Schritt).

Cache: empfehler.js v33, sw.js v53.

## v1.73 — Phase 57 · Empfehlungsprogramm geteilt (admin-only) + Impressum/Datenschutz pro Berater
**2026-06-22**

Entscheidung revidiert: Das Empfehlungsprogramm (Belohnungsstufen, Themen-Seiten, Erfolgsgeschichten) ist jetzt **bei allen Beratern gleich** und **nur vom Admin (Kai)** editierbar — statt „pro Berater eigene Inhalte" (Phase 53).

- **DB (schema-phase14.sql):** geklonte Nicht-Admin-Inhalte gelöscht (Kais Set = geteiltes Set); Auto-Klon-Trigger entfernt; Content-Schreib-RLS von „pro Berater" → **admin-only** (`is_current_berater_admin()`). Public read bleibt.
- **Frontend:** Funnel lädt Inhalte wieder **global** (programm.js, app.js, empfehler.js). Themen-CMS (`vorlagen.html`) ist admin-only (Guard + nav-Punkt versteckt für Nicht-Admins).
- **Impressum/Datenschutz pro Berater:** neue Felder `berater.impressum_url` + `datenschutz_url`, Admin-Formular (anlegen + bearbeiten) erweitert, Footer (programm.html) zieht sie per `data-bb`. `get_berater_public(_by_id)` liefern die neuen Felder. Kais DVAG-URLs voreingetragen.

**Wichtig:** Bei jedem Berater Impressum- + Datenschutz-URL eintragen — sonst werden die Footer-Links für ihn ausgeblendet.

Cache: app.js v40, programm.js v25, empfehler.js v32, vorlagen-cms.js v5, berater-admin.js v5, nav.js v41, sw.js v52.

## v1.72 — Phase 56 · Social-Preview-Karte pro Berater
**2026-06-22**

Beim Teilen eines Empfehlungslinks zeigte die WhatsApp-Vorschau immer Kais Foto/Namen (statische OG-Meta-Tags, kein JS für den Crawler). Jetzt pro Berater korrekt.

- **Neu: Vercel-Serverless-Funktion `api/share.js`** — liefert die Empfänger-Seite mit pro-Berater OG-Tags aus: `og:image` = Foto des Beraters, `og:description` = „Eine kurze Nachricht von <Name>". Schlägt Berater per `get_empfehlung_public`/`get_berater_public_by_id` über den Token nach. Fallback (kein Token/Fehler) = statischer Default.
- **vercel.json:** Rewrite `/e` → `/api/share` (Query bleibt erhalten).
- **app.js:** geteilter Link jetzt `/e?token=…&vorlage=…` (statt `/empfaenger.html?…`). Alte Links bleiben gültig. `empfaenger.html` selbst unverändert.
- Vorschaubild = Berater-Portrait (skaliert automatisch für jeden neuen Berater, kein Extra-Asset nötig).

Cache: app.js v39, sw.js v51.

## v1.71 — Phase 55 · Berater-Verwaltung nur für Admin (Kai)
**2026-06-22**

Die Berater-Verwaltung ist jetzt eine reine Admin-Funktion. Freigeschaltete Berater brauchen diese Rechte nicht und sehen sie nicht mehr.

- **DB (schema-phase13.sql):** neues Flag `berater.ist_admin` (Kai = true). Helper `is_current_berater_admin()`. Schreib-Policies auf `berater` (insert/update/delete) von „jeder Authenticated" → **nur Admin** (`is_current_berater_admin()`). Public read bleibt (Branding).
- **Menü (nav.js):** Punkt „Berater" ist `adminOnly` — standardmäßig versteckt, wird nur für Admins eingeblendet.
- **Seite (berater-admin.js):** Admin-Guard — Nicht-Admins werden auch bei direktem URL-Aufruf von `berater.html` zum Hub umgeleitet.
- **dashboard.js:** `getCurrentBerater` lädt `ist_admin` mit.

Cache: nav.js v40, berater-admin.js v4, sw.js v50.

## v1.70 — Phase 54 · Promoter kann Empfehlung absenden (fremdes Gerät)
**2026-06-22**

Zwei Bugs behoben, die auftraten, wenn ein Berater (z. B. Sven) einen Promoter (z. B. Sandro) anlegt und dieser auf seinem eigenen Gerät eine Empfehlung aussprechen will.

- **URL-Parameter-Mismatch:** Die CTAs erzeugen `empfehlen.html?code=…`, aber app.js las `?empfehler=`. Auf fremdem Gerät (kein localStorage) wurde der Promoter-Code nie erkannt → Berater fiel auf Kai zurück (Texte/Branding falsch). app.js liest jetzt `?code=` ODER `?empfehler=`.
- **Insert 401 „Speichern fehlgeschlagen":** `createEmpfehlung` machte `.insert().select()` (return=representation); ohne anon-SELECT-Policy auf `empfehlungen` lehnte PostgREST das mit 401 ab (nur eingeloggt klappte es). Neuer SECURITY-DEFINER-RPC `create_empfehlung_public` (schema-phase12.sql) fügt ein und gibt `link_token` zurück — anon-fähig, Trigger feuern weiterhin.

Cache: app.js v38, sw.js v49.

## v1.69 — Phase 53 · Inhalte pro Berater (Multi-Tenant Content)
**2026-06-22**

Jeder Berater pflegt jetzt EIGENE Inhalte (Vorlagen, Belohnungsstufen, Erfolgsgeschichten) statt geteilter globaler Inhalte.

**Datenbank (schema-phase11.sql):**
- `vorlagen.slug` jetzt nur noch pro Berater eindeutig (Unique `(berater_id, slug)` statt global) — zwei Berater können dieselben Standard-Slugs haben
- `belohnungs_stufen` Primärschlüssel auf `(berater_id, stufe)` umgestellt
- FK `erfolgsgeschichten.vorlage_slug → vorlagen.slug` entfernt (Zuordnung jetzt per `berater_id`+`vorlage_slug` in der Query)
- RLS pro Berater: public read offen, INSERT/UPDATE/DELETE nur für eigene (`berater_id = current_berater_id()`)
- `clone_default_content(uuid)` + Trigger `clone_content_on_berater_insert`: neuer Berater bekommt automatisch das Startset von Kai geklont
- Sven mit Startset befüllt

**Frontend:**
- `getVorlagen/getVorlage/getErfolgsgeschichten/getBelohnungsStufen/updateVorlage` akzeptieren `berater_id`
- Funnel (programm.js, app.js empfehlen+empfaenger, empfehler.js Promoter-Dashboard) lädt nur Inhalte des jeweiligen Beraters; Fallback = ENV-Berater (Kai) als Default-Tenant
- Vorlagen-CMS zeigt/editiert nur die eigenen Vorlagen des eingeloggten Beraters

**Offen (Folge-Phase):** eigene Dashboard-Editoren für Belohnungen + Erfolgsgeschichten (bis dahin via Supabase-UI).

## v1.60 — Phase 50m · Förder-Rechner als Live-Tool im Pitch
**2026-06-17**

Neue interaktive Folie zwischen Win-Recap und Teamwork:

- 4 Eingabe-Felder: Alter (Slider), Familienstand (Buttons), Kinder (Buttons), Brutto-Einkommen (Slider)
- Live-Berechnung im Browser ohne Server-Roundtrip
- Berücksichtigte Förderungen: Riester (Grund- + Kinderzulagen), Partner-Riester, VL, AN-Sparzulage, Wohnungsbauprämie, BAV-Steuer-/SV-Vorteil, Kinder-Steueroptimierung
- Animierter Counter-Up beim Ändern eines Werts
- Breakdown-Liste mit Aufschlüsselung pro Förderart
- CTA „Detail-Analyse starten" → öffnet finanzcheck.kaiblobel.de in neuem Tab
- Sage-grüner Akzent für „so viel ist möglich"-Atmosphäre

Use-Case: Kai sitzt mit Empfehler am Tisch. Empfehler nennt einen Tipp. Kai stellt 4 Slider/Buttons ein, zeigt sofort: „Schau, dein Tipp könnte 1.500 €/Jahr rausholen." → Empfehler ist motivierter, die Empfehlung auszusprechen.

## v1.59 — Phase 50l · Win-Recap 1-Zeilen-Layout + Slop-Sweep
**2026-06-17**

**Layout-Fix:**
- Win-Recap-Punkte (Übersicht / Entscheidungen / Geld / Lücken) brachen vorher auf 2 Zeilen
- `.recap-list` max-width auf 640px, Schrift kleiner (clamp 17/22), `white-space: nowrap` → alle 4 Punkte stehen sauber auf je einer Zeile

**Slop-Sweep über die ganze programm.html:**
- 5× Em-Dashes (`&mdash;`) raus → Punkt / Komma / Doppelpunkt
- „wirklich" als Adverb-Verstärker entfernt wo überflüssig
- „selbstverständlich", „ständig", „vollständig" → menschlichere Formulierungen
- NPS-Karten gestrafft („Das freut mich" statt „Das freut mich wirklich")
- Teamwork-Lede direkter („Das ist der Unterschied…" statt „Genau das ist…")
- Alltag-Closer ehrlicher („Ohne lang zu überlegen" statt „Ganz selbstverständlich")
- FAQ-Antwort direkter („kostet dich nichts" statt „ist und bleibt vollständig kostenlos")

## v1.58 — Phase 50k · Mehrwert-Folie + Präsentations-Konsolidierung
**2026-06-17**

**Neue editierbare Mehrwert-Folie** zwischen NPS-Reflexion und Win-Recap:
- „Welchen Mehrwert hast du durch mich?" — Kunde antwortet, Kai schreibt live mit
- 4 nummerierte Felder (contenteditable), Champagne-Highlight beim Editieren
- Persistenz in localStorage (überlebt Reload + Page-Wechsel)
- „Alles löschen"-Button für neuen Termin
- Danach: Win-Recap mit neuem Eyebrow „Und aus meiner Sicht" → Kai zeigt seine 4 Punkte als Ergänzung

**Präsentations-Konsolidierung:**
- `praesentation.html` gelöscht — einzige Quelle ist jetzt `programm.html`
- Sidebar-„Präsentation"-Link führt zu `programm.html?mode=slides` → öffnet sofort Slide-Modus
- Footer-Link gleich
- URL-Parameter `?mode=slides` triggert Auto-Activation des Präsentations-Modus

## v1.57 — Phase 50j · Präsentations-Modus auf programm.html
**2026-06-17**

Eine Page, zwei Views: scroll für Kunden (Mobile + Desktop) und ein Slide-Modus für Live-Pitches im Termin.

- **Floating-Button** unten rechts (nur ab 1024px sichtbar), Label „Präsentations-Modus"
- **Klick** aktiviert Vollbild-Slide-Pitch: jede Section = ein Slide, scroll-snap mandatory, eine Sektion pro Frame
- **Bottom-Nav** mittig: Zurück/Weiter + Counter („3 / 14") + Beenden
- **Tastatur**: ← ↑ PageUp = vorige | → ↓ PageDown Leertaste = nächste | Home = erste | End = letzte | ESC = beenden
- **Counter** wird live via IntersectionObserver synchronisiert
- Sticky-CTA + Footer ausgeblendet im Slide-Modus
- Kunde auf Mobile sieht nichts vom Modus → bleibt scroll

## v1.56 — Phase 50i · NPS-Skala 1–10 in der Reflexions-Sektion
**2026-06-17**

Statt nur „scroll weiter oder ruf an" jetzt eine echte interaktive Skala in der Pre-Hero:

- 10 klickbare Buttons (1–10), Mobile als 5×2-Grid
- Drei Reaktions-Karten je nach Antwort:
  - **1–6 (Detractor, Terracotta-Akzent)** → „Danke für deine Ehrlichkeit." + Anruf + WhatsApp
  - **7–8 (Passive, Champagne-Akzent)** → „Verstanden. Da ist noch Luft." + Feedback + Weiterlesen
  - **9–10 (Promoter, Sage-Akzent)** → „Das freut mich wirklich." + Pulsierender CTA „Zeig mir das Programm →"
- Smooth-Scroll zur Reaktions-Karte beim Klick
- Antwort wird in sessionStorage gespeichert (überlebt Page-Wechsel)
- GTM-Event `nps_answer` mit `nps_score` und `nps_band` (für späteres Analytics)

## v1.55 — Phase 50h · Story-Sektionen vor dem Haupt-Hero
**2026-06-17**

Inhalte aus der alten praesentation.html in programm.html überführt. Drei neue Sektionen zwischen Pre-Hero und Haupt-Hero:

- **Win-Recap** „Was wir gemeinsam schon bewegt haben" — 4 Punkte aus Editorial-Slides (Übersicht / Entscheidungen / Geld / Lücken)
- **Teamwork + Allfinanz-Vorteile** mit Teamwork-Foto (Hand-in-Hand-Bild aus Kundenseite) — Split-Layout mit Sticky-Image: Ein Ansprechpartner · Kurze Wege · So wie es dir passt (Kaffee/Zuhause/Telefon) · Alles aus einer Hand (Girokonto bis Baufi)
- **Empfehlen ist Alltag** — 4 Quote-Karten („Geh in das Restaurant" / „Schau diesen Film" / „Frag den Handwerker" / „Kauf bei dem Bäcker") + Schluss-Brücke „Und genau darum geht es hier"

CSS in programm.css mit Editorial-Touch (Fraunces-Hierarchie aus var(--font-display), Champagne-Akzente, Mobile-Stacking).

## v1.54 — Phase 50g · Pre-Hero-Reflexions-Sektion
**2026-06-17**

- programm.html bekommt einen ruhigen Pre-Hero VOR dem Conversion-Hero
- Eyebrow „Eine kurze Frage vorweg" + H1 „Wie zufrieden bist du wirklich…"
- Lede mit Reflexions-Impuls + Mikrokopie „Wenn Ja → scroll weiter, wenn nicht → ruf mich an"
- Pulsierender „Weiter"-Pfeil scrollt zum Haupt-Hero (#hero-haupt)
- 92vh Höhe = der Kunde sieht NUR die Frage im ersten Viewport
- Übernimmt den emotionalen Anlauf der alten praesentation.html

## v1.53 — Phase 50f · Root = Berater-Portal
**2026-06-17**

- `/` (Root) leitet jetzt **immer** zu `/hub.html` — egal ob eingeloggt oder nicht
- Hub redirected sich selbst zur Login-Page, wenn keine Session vorhanden ist
- Customer-Funnel ist nur noch über expliziten Link `/programm.html` erreichbar
- Klare Trennung: `empfehlungsportal.vercel.app` = dein Berater-Portal, der explizite `/programm.html`-Link = Customer-Page zum Teilen

## v1.52 — Phase 50e · Smart-Root-Splitter
**2026-06-17**

- `/` (Root) erkennt jetzt selbst, wer kommt:
  - Eingeloggter Berater → `/hub.html`
  - Anonymer Besucher (Kunde) → `/programm.html`
- Präsentations-Slides umgezogen von `/index.html` → `/praesentation.html`
- vercel.json-Redirect entfernt (Splitter übernimmt jetzt)
- nav.js + programm.html-Footer auf neue Präsentations-URL umgestellt

## v1.51 — Phase 50d · Berater-Einladungs-Flow (vorgezogen)
**2026-06-16**

- DB-Trigger `link_auth_user_to_berater`: koppelt neue `auth.users` per E-Mail-Match automatisch an `berater.auth_user_id`
- Edge Function `invite-berater`: generiert Magic-Link via `auth.admin.generateLink({type:'invite'})`
- Berater-Admin: „Einladen →"-Button auf Karten ohne `auth_user_id`
- Invite-Modal mit Link zum Kopieren, vorausgefülltem WhatsApp- und E-Mail-Versand
- `dashboard/welcome.html`: Passwort-Setup-Flow nach Klick auf Magic-Link
- RLS-Policies auf `berater`: INSERT/UPDATE/DELETE für `authenticated` (Kai als Admin)

## v1.50 — Phase 50a · Berater-Admin (Multi-Tenant Schicht 1)
**2026-06-16**

- `berater`-Tabelle erweitert: `slug`, `email`, `bookings_url`, `rolle`, `ist_aktiv`
- Neue Admin-Page `/berater.html`: Liste, Inline-Edit, Neuer-Berater-Modal, Aktiv-Toggle
- Lösch-Button für Empfehlungen in `/dashboard/detail.html` (Danger-Zone)
- Default-Route: `/` → `/programm.html` (statt Präsentations-Slides)
- Sichtbare Versionsnummer in Sidebar
- 10 Smoke-Tests durchgeführt, alle ✅

## v1.49 — Phase 49 · Nachricht-Vorlagen pro Thema
**2026-06-16**

- 18 vorgefertigte Empfehlungs-Nachrichten in `empfehlen.html` (3 pro Thema)
- Themen-Picker nach oben verschoben (logischer Fluss)
- Vorlage anklicken → Text wandert ins Textarea (editierbar)
- `{{vorname}}`-Platzhalter wird live aus Vorname-Input ersetzt

## v1.48 — Phase 48 · 1:1-Empfehlungs-Fluss + Icons
**2026-06-16**

- **Bug-Fix**: `programm.html` Erfolgs-Modal teilte irrtümlich den Empfehler-Dashboard-Link statt zu `/empfehlen.html` weiterzuleiten
- `empfehler.html` Dashboard: „Teile diesen Link"-Block (1:viele) entfernt, neuer CTA „Neue Empfehlung aussprechen"
- Themen-Icons: Lucide-SVG-Map in `vorlagen-cms.js` + `app.js`. Compass/Home/Banknote etc. statt Text-Namen
- Slop-Sweep: Em-Dashes + Marketing-Floskeln raus
- Customer-Pages auf SF Pro System-Stack umgestellt

## v1.47 — Phase 47 · programm.html Conversion-Refactor
**2026-06-01**

- SF System-Font (Fraunces raus aus Customer-Bereich)
- Hero Split-Layout + Trust-Brücke + 3-Schritte-Row + WhatsApp-Mockup
- 6 Themen-Cards (DB-driven) mit eigener Akzent-Farbe pro Slug
- Belohnungs-System mit Modus-Switch (Geld/Sache/Spende), `kategorien text[]` auf `belohnungs_stufen`
- Stufen-Roadmap 1-15 + Gesamt-Wert-Counter (24.000 €)
- 8 echte Google-Bewertungen als Doppel-Marquee (Mobile-Safari-sicher als statisches HTML)
- FAQ-Accordion + 4-Spalten-Footer + Erfolgs-Modal mit Share

## v1.46 — Phase 46 · Activity-Feed Premium-Evolution
**2026-05-31**

- Icon-Bubble 48px in Event-Color-Tint
- Neue Event-Types: `promotor_created`, `termin_booked`
- Momentum-Schwellen 80/60/40 + Warm Amber
- Top-Promotor-Card unten in Sidebar

## v1.45 — Phase 45 · Final Micro-Polish (Design-Freeze)
**2026-05-31**

- Event-Farben +20% Kontrast
- NEU-Badge Premium-Style
- Status-Hierarchie via Avatar-Tint-Stärke
- Hover-Haptik exakt 180ms

## v1.44 — Phase 44 · Subtile Akzent-Layer
**2026-05-31**

- Momentum-Card State-Color (4px Left-Border)
- Section-Eyebrow Mini-Strip

## v1.43 — Phase 43 · Premium Micro-UX Polish
**2026-05-31**

- Icon-Only-Sidebar
- Event-Farben satter
- NEU-Badge `created_at < 24h`

## v1.42 — Phase 42 · Sidebar Collapse-Toggle (Cmd+\\)
## v1.41 — Phase 41 · Activity-Feed Premium (Bubble + Eye-Indicator)
## v1.40 — Phase 40 · Activity-Feed 2.0 mit Lucide-Event-Icons + Read-State
## v1.39 — Phase 39 · Dashboard-Freeze + Design-System-Lock
## v1.38 — Phase 38 · Premium-SaaS-Polish Big-Bang
## v1.37 — Phase 37 · Responsive Sidebar System
## v1.32 — Phase 32 · KPI-Chips 2×2 + Page-Shell breiter
## v1.31 — Phase 31 · Hub-2-Spalten-Layout
## v1.30 — Phase 30 · Activity-Stream-Cards
## v1.29 — Phase 29 · Trend-Chart (Chart.js) + Realtime-Stream

---

## Geplant

### v1.51 — Phase 50b · Strict-RLS auf Berater-Ebene
- Pro Tabelle einzeln aktivieren mit Test dazwischen
- `current_berater_id()`-Policy auf `empfehlungen`, `empfehler`, `vorlagen`, `belohnungs_stufen`
- Customer-Pages bekommen separate INSERT-Policies für `anon`

### v1.52 — Phase 50c · Berater-Personalisierung
- `?berater=slug` URL-Param auf `programm.html`, `empfaenger.html`
- Berater-Profil aus DB laden (Foto, Name, Telefon, Bookings-Link)
- Customer-Pages werden pro Berater dynamisch

### v1.53 — Phase 50d · Berater-Onboarding-Flow
- Magic-Link-Login für neue Berater
- Auth-User-ID automatisch beim ersten Login an `berater.auth_user_id` koppeln
