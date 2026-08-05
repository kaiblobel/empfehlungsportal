Warning: truncated output (original token count: 31595)
Total output lines: 1510

# Changelog Â· Empfehlungsportal

Versionierung: `v1.{Phase}` â€” jede Phase im Build-Plan bekommt eine Minor.
Vorbereitete Version: **v1.183 Beta** Â· Hinweis bei neuem Promoter. Noch nicht live.
Offizielle Live-Version: **v1.182 Beta** Â· QR-Selbstanmeldung fÃ¼r Promoter, live seit 05.08.2026.

---

## v1.183 Beta - Phase 157 Â· Hinweis bei neuem Promoter
**2026-08-05 Â· auf `codex/promoter-qr-v1` vorbereitet, nicht verÃ¶ffentlicht**

- Eine neue Selbstanmeldung lÃ¶st kÃ¼nftig denselben geschÃ¼tzten Telegram-Hinweis wie ein neuer Lead aus.
- Die vorbereitete Edge Function `notify-promoter` lÃ¤dt den Promoter serverseitig und nimmt keine frei Ã¼bermittelten Kontaktdaten an.
- Der interne Aufruf bleibt mit `X-Internal-Token` geschÃ¼tzt. Ein Fehler beim Versand blockiert die erfolgreiche Registrierung nicht.
- Web-Push wird ausschlieÃŸlich an GerÃ¤te des zustÃ¤ndigen Beraters gesendet. Derzeit ist im Live-System noch kein Push-GerÃ¤t registriert, Telegram bleibt deshalb der aktive externe Kanal.
- Im geÃ¶ffneten Hub erscheint der neue Promoter sofort im AktivitÃ¤tsstrom. Auch die Promoterliste aktualisiert sich ohne Neuladen.
- Alte Promoter und manuell angelegte DatensÃ¤tze lÃ¶sen keine nachtrÃ¤gliche Meldung aus. Der Trigger reagiert nur auf neue DatensÃ¤tze mit `self_registered_at`.
- Die Edge Function und `schema-phase157.sql` sind vorbereitet, aber noch nicht in Supabase verÃ¶ffentlicht oder angewendet.

---

## v1.182 Beta - Phase 156 Â· QR-Selbstanmeldung fÃ¼r Promoter
**2026-08-05 Â· live verÃ¶ffentlicht**

- Die PrÃ¤sentation endet mit einem groÃŸen, beraterbezogenen QR-Code statt mit der bisherigen direkten Promoter-Eingabe.
- Der QR-Code fÃ¼hrt in eine feste helle Startseite. Dort meldet sich der Kunde kurz mit Name und einem Kontaktweg an.
- Nach erfolgreicher Anmeldung landet der neue Promoter direkt in seinem vorhandenen persÃ¶nlichen Bereich. Themenwahl, Empfehlungslink und Benefits nutzen danach den bestehenden Ablauf.
- FÃ¼r PrÃ¤sentation und BÃ¼ro-Aufsteller liegen getrennte QR-Codes fÃ¼r alle fÃ¼nf aktuell aktiven Berater vor. Die Quelle wird fÃ¼r eine spÃ¤tere Auswertung mitgefÃ¼hrt.
- UngÃ¼ltige Berater-Links fallen nicht mehr still auf Kai zurÃ¼ck.
- Die Ã¶ffentliche Anmeldung lÃ¤uft Ã¼ber einen eigenen Vercel-Endpunkt mit EingabeprÃ¼fung, Cloudflare Turnstile, HerkunftsprÃ¼fung, gehashten Mengenbegrenzungen und einem internen Registrierungsgeheimnis.
- Die bestehende Beraterfunktion `create_empfehler` ist auf angemeldete Berater begrenzt. Die Ã¶ffentliche Selbstanmeldung nutzt einen eigenen, minimal freigegebenen Datenbankweg.
- Historische Dubletten bleiben unangetastet. Teilindizes verhindern nur bei neuen Selbstanmeldungen parallele Dubletten je Berater, E-Mail und Mobilnummer.
- Phase 156 wurde in zwei kontrollierten Migrationen angewendet. Turnstile, Vercel-Geheimnisse und Datenbank-Hash sind aktiv. Funktionsstand `08c1520` lÃ¤uft Ã¼ber das produktive Deployment `dpl_Hv6gbjfDzWBj4cX7TvyebW9yY7z7` auf beiden Live-Domains. Version, Startseite, Laufzeitkonfiguration, Berechtigungen, zurÃ¼ckgerollte Testanmeldung und Fehlerprotokolle wurden geprÃ¼ft.
- Alle automatischen Portaltests, die API-Sicherheitstests, der portalweite Farbfiltertest, der bytegenaue Abgleich aller zehn QR-Zieladressen sowie die BrowserprÃ¼fung fÃ¼r Desktop und Mobil sind grÃ¼n.

---

## v1.181 Beta - Phase 155 Â· Farbige Bilder im gesamten Portal
**2026-08-05 Â· live verÃ¶ffentlicht**

- SÃ¤mtliche Schwarz-WeiÃŸ- und EntsÃ¤ttigungsfilter wurden aus den ausgelieferten HTML-, CSS-, JavaScript- und SVG-BestÃ¤nden entfernt.
- Beraterportraits erscheinen auf EmpfÃ¤nger-, Promoter- und PrÃ¤sentationsseiten unverfÃ¤lscht farbig. Die Korrektur gilt automatisch fÃ¼r Kai und alle anderen Berater.
- Auch Themenkacheln, Bildkarten, Hintergrundbilder, Symbole und die Ã¶ffentlich erreichbare EmpfÃ¤nger-Mockup-Seite werden nicht mehr kÃ¼nstlich entsÃ¤ttigt.
- Reine Helligkeits- und Kontrastregeln fÃ¼r Lesbarkeit bleiben erhalten, sofern sie keine Farben entfernen.
- Bilddateien, Beraterdaten, Empfehlungen und Datenbankinhalte bleiben unverÃ¤ndert.
- Ein portalweiter Schutztest prÃ¼ft alle ausgelieferten Quelldateien und verhindert eine erneute Schwarz-WeiÃŸ-Darstellung.
- Funktionsstand `c6a8a3e` ist Ã¼ber das produktive Vercel-Deployment `dpl_FX5N8dEUtf3iDQNhegbb1dW4q1pw` verÃ¶ffentlicht. Die offizielle Adresse liefert v1.181 und alle geprÃ¼ften Portal-, Stil- und Mockup-Dateien ohne Schwarz-WeiÃŸ- oder Null-SÃ¤ttigungsfilter aus; das Vercel-Fehlerprotokoll ist leer.

---

## v1.180 Beta - Phase 154 Â· Themenseiten und Mobile-First-Funnel
**2026-08-05 Â· live verÃ¶ffentlicht**

- FÃ¼r FÃ¶rderungen, SelbstÃ¤ndige, Investment, Absicherung, berufliche Perspektive und Kinder steht eine gemeinsame, mobile Themenseite mit ehrlichem Hinweis `In Arbeit` bereit.
- Jeder Themenlink behÃ¤lt EmpfÃ¤nger, Promoter, Thema und zustÃ¤ndigen Berater korrekt bei. Alte Links ohne Themenangabe in der Adresse nutzen weiterhin den in der Empfehlung gespeicherten Themen-SchlÃ¼ssel.
- Ã–ffnung und Terminbeginn laufen Ã¼ber das vorhandene Empfehlungs-Tracking. `Dieses Thema interessiert mich` nutzt die bestehende Interesse-Funktion; Austragen bleibt mit demselben Token mÃ¶glich.
- Ohne echten Empfehlungs-Token bleibt die Seite eine sichere Vorschau und bestÃ¤tigt ausdrÃ¼cklich, dass keine Daten gespeichert wurden.
- In der PrÃ¤sentation sind alle acht Themen auswÃ¤hlbar. Allgemein und Baufinanzierung bleiben als fertige Seiten gekennzeichnet, die sechs neuen GerÃ¼ste klar als `In Arbeit`.
- Die Schnellvorschau in den Einstellungen enthÃ¤lt alle acht Themen. Karriere und Kinder wurden ergÃ¤nzt.
- FÃ¼r das Thema Kinder stehen drei eigene WhatsApp-Nachrichtenvorlagen bereit.
- Gemeinsames GerÃ¼st statt sechs kopierter HTML-Seiten: Inhalte kÃ¶nnen spÃ¤ter je Themen-SchlÃ¼ssel ergÃ¤nzt werden, ohne Routing, Personalisierung und Tracking neu zu bauen.
- Die allgemeine EmpfÃ¤ngerseite ist mobil beruhigt: kleinere Ãœberschriften, kompaktere AbstÃ¤nde, klare Ein-Hand-Aktionen und weniger Bewegung.
- Wiederholte Nennungen des Empfehlungsgebers, doppelte Daumen-Symbole und der zweite Erfahrungsblock im Einstieg sind entfernt. Erfahrung und Vertrauen erscheinen nur noch im dafÃ¼r vorgesehenen Schritt.
- Keine Datenbankmigration und keine Ã„nderung an bestehenden Empfehlungen, Promotern oder Beraterdaten.
- Verifiziert mit Router- und Strukturtests sowie BrowserprÃ¼fung fÃ¼r alle sechs Themen und den vollstÃ¤ndigen EmpfÃ¤ngerweg auf kleinen Handys.
- Live verÃ¶ffentlicht am 05.08.2026. Ã–ffentliche Version, Themenseite und Mobile-Einstieg geprÃ¼ft; Vercel-Status `Ready`.

---

## v1.179 Beta - Phase 153 Â· Leichter AktivitÃ¤tsstrom
**2026-08-05**

- Die EintrÃ¤ge im Live-Stream erhalten etwas mehr vertikalen Innenabstand, damit Namen, Ereignisse und Status ruhiger lesbar sind.
- Die Trennlinien sind heller und treten stÃ¤rker in den Hintergrund.
- Die flache Nachrichtenstrom-Optik bleibt erhalten. Es entstehen bewusst keine einzelnen Karten und keine zusÃ¤tzlichen Schatten.
- Keine Datenbankmigration und keine Ã„nderung an AktivitÃ¤ten oder Empfehlungsdaten.
- Live verÃ¶ffentlicht am 05.08.2026. Keine Datenbankmigration erforderlich.

---

## v1.178 Beta - Phase 152 Â· Wettbewerb und dynamische Analysen
**2026-08-05**

- Die Promoterseite hebt die drei stÃ¤rksten Promoter in einem ruhigen Gewinnerpodest hervor. Gewertet wird nach gewonnenen Kunden, danach nach Empfehlungen und AktivitÃ¤t.
- Die Teamseite zeigt ein Portrait-Podest fÃ¼r die drei besten Berater im gewÃ¤hlten Zeitraum.
- Das Teamranking lÃ¤sst sich zwischen Kunden, Empfehlungen, aktiven Promotern und Kundenquote umschalten. Die Kundenquote wird erst ab drei Empfehlungen gewertet.
- Die vollstÃ¤ndige TeamÃ¼bersicht bleibt alphabetisch und unabhÃ¤ngig vom Ranking, damit niemand als Verlierer markiert wird.
- Die Linienanalyse verwendet die bestehenden tÃ¤glichen KennzahlenschnappschÃ¼sse und lÃ¤sst aktive Promoter, Link-Klicks, Empfehlungen und Kunden einzeln ein- und ausblenden.
- Die Analyse kann zwischen echten Zahlen und einem vergleichbaren prozentualen Verlauf wechseln. Im Prozentmodus entspricht der eigene HÃ¶chstwert jeder Linie 100 Prozent.
- ZeitrÃ¤ume von 7, 30 und 90 Tagen sowie die Vergleiche mit der direkten Vorperiode bleiben erhalten.
- Keine Datenbankmigration und keine Ã„nderung an Empfehlungen, Promotern oder Beraterdaten.
- Live verÃ¶ffentlicht am 05.08.2026. Keine Datenbankmigration erforderlich.

---

## v1.177 Beta - Phase 151 Â· Einheitliche Portal-Bezeichnung
**2026-08-05**

- Alle aktuellen sichtbaren RÃ¼ckwege heiÃŸen jetzt `ZurÃ¼ck zum Portal` statt `ZurÃ¼ck zum Hub` oder `ZurÃ¼ck zum HUB`.
- Der Notfall-Link auf der Startadresse heiÃŸt `Zum Portal`.
- Die sichtbare Phasenbezeichnung verwendet nur noch `Portal` und nicht mehr `Premium-HUB`.
- Die ungenutzte Schnellaktion `Neue Empfehlung` wurde vollstÃ¤ndig aus der Ãœbersicht entfernt; die regulÃ¤ren Anlegewege bleiben erhalten.
- Technische Pfade, Klassen und interne Bezeichner wie `hub.html` bleiben erhalten, damit bestehende Links, Lesezeichen und Funktionen nicht brechen.
- Keine Datenbankmigration und keine Ã„nderung an Daten oder AblÃ¤ufen.
- Gemeinsam mit v1.178 live verÃ¶ffentlicht am 05.08.2026.

---

## v1.176 Beta - Phase 150 Â· Leichterer Premium-HUB
**2026-08-05**

- Der HUB erhÃ¤lt mehr weiÃŸe FlÃ¤che und eine ruhigere, klarere GesamtatmosphÃ¤re, ohne seine Struktur zu verÃ¤ndern.
- BegrÃ¼ÃŸung und Kennzahlen sind leichter gesetzt; KPI-Karten haben feinere Konturen, weniger Schatten und kompaktere Werte.
- Champagne bleibt Marken- und Orientierungsfarbe statt groÃŸe FlÃ¤chen zu tÃ¶nen.
- `System aktiv` ist als echter positiver Zustand deutlich grÃ¼n hervorgehoben.
- Neue Ereignisse tragen das Wort `Neu` in GrÃ¼n statt in einem goldenen Badge.
- Der AktivitÃ¤tsstrom ist flacher aufgebaut: kleinere Symbole, ruhige Trennlinien und keine gestapelte Kartenwand.
- Die sichtbare Marke heiÃŸt jetzt klar `Empfehlungsportal` statt `Empfehlungs-HUB`.
- Darunter steht die zweizeilige Signatur `Regionaldirektion` und `Kai Blobel & Team` in einer feinen Schreibschrift.
- Im Seitenkopf steht beim Berater nur noch sein Name; der doppelte Zusatz `Regionaldirektion Â· Hub` entfÃ¤llt.
- Datenquellen, Kennzahlen, Reihenfolge, Navigation und alle Aktionen bleiben unverÃ¤ndert.
- Keine Datenbankmigration und keine Ã„nderung an Empfehlungen, Promotern oder Beraterdaten.
- Live-Freigabe am 05.08.2026 erteilt.
- Funktionsstand `d6f9d16` ist Ã¼ber das produktive Vercel-Deployment `dpl_DEfs2qobVpCWPaHUUrMW6K3v544W` verÃ¶ffentlicht. Offizielle Version, neue Wortmarke, beide Signaturzeilen, Schreibschrift, Cache-StÃ¤nde und der entfernte Beraterzusatz wurden live abgerufen; das Fehlerprotokoll ist leer.

---

## v1.175 Beta - Phase 149 Â· Empfehlungsdetail als Arbeitsseite
**2026-08-05**

- Die Detailseite einer Empfehlung ist jetzt ein kompakter Arbeitsbereich statt einer langen technischen Feldliste.
- Kontakt, Erreichbarkeit, bevorzugter Kanal und Linkstatus stehen als ruhiger Ãœberblick direkt oben.
- Empfehlungskontext, Promoterleistung und der zeitliche Verlauf sind klar getrennt und vollstÃ¤ndig erhalten.
- Status und GesprÃ¤chsnotiz stehen gemeinsam in einer festen BearbeitungsflÃ¤che mit einem passenden nÃ¤chsten Schritt.
- Anrufen, WhatsApp, Link kopieren, Statuswechsel, Notiz, ZurÃ¼cknavigation und das geschÃ¼tzte LÃ¶schen bleiben erhalten.
- Die OberflÃ¤che nutzt das bestehende HUB-Designsystem und verdichtet sich auf Tablet und Smartphone ohne Funktionsverlust.
- Keine Datenbankmigration und keine Ã„nderung an Empfehlungen, Promotern oder Beraterdaten.
- Funktionsstand `a12a8ac` ist auf `main` und Ã¼ber das produktive Vercel-Deployment `dpl_8dVB97bFkJ8B9nLASnZ77EaqgSu6` verÃ¶ffentlicht. Version, Detail-Shell, neue Styles, Arbeitslogik und die erhaltenen Aktionen wurden live abgerufen; das Fehlerprotokoll ist leer.

---

## v1.174 Beta - Phase 148 Â· Promoter als professioneller Arbeitsbereich
**2026-08-05**

- Die Promoter-Ãœbersicht zeigt echte Netzwerk-Kennzahlen, Suche, Sortierung und persÃ¶nliche Karten mit Empfehlungen, Kundenquote, Wunschziel und letztem Empfehlungsimpuls.
- Das Promoterprofil nutzt die BildschirmflÃ¤che mit einem kompakten Profilkopf, vier relevanten Kennzahlen, der vollstÃ¤ndigen Empfehlungshistorie sowie einer Seitenleiste fÃ¼r Ziel, Kontaktdaten und Beziehungspflege.
- Profilfelder bleiben vollstÃ¤ndig bearbeitbar, stehen aber erst nach `Profil bearbeiten` im Vordergrund. Anlegen, Einladungs-Link, neue Empfehlung, Ã¶ffentliche Promoter-Ansicht, Rechtsklick und Linkkopieren bleiben erhalten.
- Der ruhige Feinschliff der Empfehlungsseite aus v1.173 ist enthalten.
- Keine Datenbankmigration und keine Ã„nderung an bestehenden Promotern, Empfehlungen oder Beraterdaten.
- Funktionsstand `8a494a8` ist auf `main` und Ã¼ber das produktive Vercel-Deployment `dpl_2nJFYMp2yC7XxQuXTo3P9qww81ng` verÃ¶ffentlicht. Offizielle Version, Promoter-Ãœbersicht, Promoterprofil, neue Styles und der enthaltene Empfehlungs-Feinschliff wurden live geprÃ¼ft; das Fehlerprotokoll ist leer.

---

## v1.173 Beta - Phase 147 Â· Ruhiger Feinschliff der Empfehlungen
**2026-08-05**

- `TAGESGESCHÃ„FT` ist jetzt ein kleines, gesperrtes Orientierungslabel statt einer zweiten Ãœberschrift.
- Der Suchtext ist mit `Name, Telefon oder Promoter suchen` kÃ¼rzer und passt vollstÃ¤ndig in das Feld.
- Unter dem Beraternamen steht `Empfehlungsmanagement`, damit sich der Seitentitel nicht doppelt.
- Die wiederholten Anrufaktionen nutzen einen warmen, ruhigen Akzent statt vier dominanter schwarzer FlÃ¤chen. Der einzelne Hauptknopf `Neue Empfehlung` bleibt schwarz.
- Keine Fachlogik, Datenbankmigration oder Ã„nderung an Empfehlungen, Kunden- oder Beraterdaten.
- VerÃ¶ffentlichung noch nicht freigegeben.

---

## v1.172 Beta - Phase 146 Â· Empfehlungen als Arbeitsliste
**2026-08-05**

- Die Seite `Empfehlungen` ist jetzt eine priorisierte ArbeitsoberflÃ¤che statt einer einfachen Systemliste.
- AnrufwÃ¼nsche und aktuelles Interesse stehen unter `Wartet auf dich` mit direkten Aktionen fÃ¼r Telefon, WhatsApp und Details.
- Suche und Statusfilter bilden eine gemeinsame Werkzeugleiste. Jeder Filter zeigt seine aktuelle Anzahl; Interesse ist als eigener, funktionierender Filter enthalten.
- Die Kontaktliste zeigt Name, Zeitpunkt, Thema, Promoter, Status und Ã–ffnungszustand in klarer Hierarchie und bleibt auf MobilgerÃ¤ten kompakt.
- Die Suche berÃ¼cksichtigt Name, Telefonnummer, Promoter und Thema.
- Das aufklappbare UntermenÃ¼ bei `Empfehlungen` ist entfernt, weil es dieselben Filter doppelt angeboten hat. Das UntermenÃ¼ des Bonusprogramms bleibt bestehen.
- Rechtsklick, Bearbeiten, LÃ¶schen, Statuswechsel und alle bestehenden Detailwege bleiben erhalten.
- Keine Datenbankmigration und keine Ã„nderung an Empfehlungen, Kunden- oder Beraterdaten.
- Funktionsstand `d3e1b3a` ist auf `main` und Ã¼ber das produktive Vercel-Deployment `dpl_B3T2goNpYfAiWd4FNGb5YRqgZsNN` verÃ¶ffentlicht. Offizielle Seite, Version, priorisierte Kontakte, Suche, Interesse-Filter, vereinfachtes Empfehlungen-MenÃ¼ und weiterhin aufklappbares Bonusprogramm wurden geprÃ¼ft; das Fehlerprotokoll ist leer.

---

## v1.171 Beta - Phase 145 Â· Empfehlung auf dem Handy
**2026-08-05**

- Der Abschnitt `So funktioniert es` zeigt den gesamten Ablauf jetzt in drei echten Handyansichten statt in drei gewÃ¶hnlichen Textkarten.
- Handy 1 zeigt das Anlegen einer Empfehlung mit Name, Mobilnummer, Themenwahl und fertigem Link.
- Handy 2 zeigt die vorbereitete persÃ¶nliche WhatsApp-Nachricht mit dem dynamischen Namen des jeweiligen Beraters.
- Handy 3 zeigt die Auswahl zwischen GeldprÃ¤mie, SachprÃ¤mie und Spende.
- GerÃ¤te-Rahmen, Dynamic Island, Statusleiste, Seitentasten und Home-Leiste machen den Ablauf sofort als iPhone-Nutzung verstÃ¤ndlich.
- Die drei Ansichten stehen auf groÃŸen Bildschirmen nebeneinander und unter 821 Pixeln sauber untereinander.
- Keine Datenbankmigration und keine Ã„nderung an Kunden-, Berater- oder Empfehlungsdaten.
- Funktionsstand `781312b` ist auf `main` und Ã¼ber das produktive Vercel-Deployment `dpl_6sUP1u3ts1c4e3HNGX4rbG9DFK1D` verÃ¶ffentlicht. Die offizielle Adresse wurde auf Desktop und bei 390 Pixel Breite geprÃ¼ft; alle drei GerÃ¤te, der dynamische Beratername und die mobile Stapelung sind vorhanden. Browser und Vercel melden keine Fehler.

---

## v1.170 Beta - Phase 144 Â· Kurze PrÃ¤sentation
**2026-08-05**

- Im internen PrÃ¤sentationsaufruf steht oben der Umschalter `Kurz | AusfÃ¼hrlich`. Die ausfÃ¼hrliche Fassung bleibt der Standard mit 13 Abschnitten.
- Der Kurzmodus nutzt dieselbe PrÃ¤sentation und zeigt sieben Kernabschnitte: Zufriedenheit, persÃ¶nlicher Mehrwert, TÃ¼rÃ¶ffner, Ablauf, Themen, Belohnung und direktes Empfehlen. Es gibt keine doppelte Inhaltspflege.
- Die Auswahl `modus=kurz` bleibt beim Aktualisieren und in einem intern gespeicherten Link erhalten.
- Die Themenseiten-Vorschau wird auf die oberste Seitenebene gesetzt. Dadurch rutschen PrÃ¤sentationsabschnitte und feste Bedienelemente nicht mehr in das Vorschaufenster.
- Die Schlusszeile des FÃ¶rderbeispiels hat einen eigenen Platz im Raster und Ã¼berlagert bei schmaleren Fenstern keine Inhalte mehr.
- Der feste Button `Jetzt empfehlen` hat ruhigere Ecken mit 14 Pixel Radius statt Pillenform.
- Keine Datenbankmigration und keine Ã„nderung an Kunden-, Berater- oder Empfehlungsdaten.
- Funktionsstand `34f307e` ist auf `main` und Ã¼ber das produktive Vercel-Deployment `dpl_DLrAwib6WLCD7rVpmK4E2Mu8KaMH` verÃ¶ffentlicht. Offizielle Adresse, Version, Umschalter, Kurzmodus-Markierungen und beide Darstellungsreparaturen wurden geprÃ¼ft; das Fehlerprotokoll ist leer.

---

## v1.169 Beta - Phase 143 Â· Farbige Beraterportraits
**2026-08-05**

- Die PrÃ¤sentation entsÃ¤ttigt das dynamisch geladene Beraterportrait nicht mehr. Jedes Beraterfoto wird in seinen echten Farben angezeigt.
- Beide bisher wirksamen Schwarz-WeiÃŸ-Regeln wurden entfernt, damit auch spÃ¤tere Beraterbilder automatisch farbig bleiben.
- Gespeicherte Bilddateien, Beraterdaten und alle Ã¼brigen PrÃ¤sentationsbilder bleiben unverÃ¤ndert. Version v1.169 ist auf `main` und Vercel verÃ¶ffentlicht; beide wirksamen Portraitregeln wurden Ã¼ber die offizielle Live-Adresse farbig geprÃ¼ft.

---

## v1.168 Beta - Phase 142 Â· Echte Analysen
**2026-08-05**

- Die bisherige Analyseseite ist keine zweite Ãœbersicht mehr. Sie beantwortet mit 7-, 30- und 90-Tage-ZeitrÃ¤umen, Zeitvergleich, Entwicklung, Umwandlungsstufen, Themenerfolg und Promoterquellen konkrete Steuerungsfragen.
- Alle Kennzahlen werden aus den echten Empfehlungen des eingeloggten Beraters berechnet. Die bestehende Zugriffstrennung der Datenbank bleibt maÃŸgeblich; Namen und Kontaktdaten von EmpfÃ¤ngern werden nicht geladen.
- Wenn die direkte Vorperiode noch keine belastbaren Daten enthÃ¤lt, zeigt die OberflÃ¤che das ehrlich an und erzeugt keine kÃ¼nstlichen Prozentvergleiche.
- Die PrÃ¤sentation erhÃ¤lt beim Aufruf aus dem HUB einen dezenten RÃ¼ckweg. Bei einem direkten Kundenaufruf bleibt dieser interne Knopf vollstÃ¤ndig verborgen.
- Der Ãœberblick im HUB bleibt unverÃ¤ndert. Es wurden keine Datenbankmigration und keine Ã„nderungen an bestehenden DatensÃ¤tzen benÃ¶tigt. Version v1.168 ist auf `main` und Vercel verÃ¶ffentlicht; die offizielle Adresse und der geschÃ¼tzte Login-Weg wurden geprÃ¼ft.

---

## v1.167 Beta - Phase 141 Â· TeamÃ¼bersicht
**2026-08-05**

- â€žTeamâ€œ ist jetzt ein eigener Arbeitsbereich mit zusammengefassten Kennzahlen fÃ¼r 7, 30 und 90 Tage, alphabetischen Beraterkarten und einer persÃ¶nlichen Detailansicht je Berater.
- Die Teamseite zeigt aktive Promoter, Link-Klicks, Empfehlungen, gewonnene Kunden, Umwandlung und datensparsame AktivitÃ¤ten. Kunden- und Kontaktdaten werden nicht ausgegeben.
- Die bisher unter â€žTeamâ€œ gefÃ¼hrte Kontenverwaltung heiÃŸt jetzt â€žBeraterkontenâ€œ und steht ausschlieÃŸlich fÃ¼r Administratoren unter â€žVerwaltungâ€œ.
- Der Ãœberblick zeigt nur noch einen kompakten Teameinstieg mit zwei aktuellen Ereignissen und fÃ¼hrt fÃ¼r Details in die TeamÃ¼bersicht.
- Die vorbereiteten Datenbankfunktionen `team_metrics` und `team_activity_secure` akzeptieren nur 7, 30 oder 90 Tage und prÃ¼fen, ob der eingeloggte Nutzer einem aktiven Beraterkonto zugeordnet ist. Die persÃ¶nliche AktivitÃ¤t wird eindeutig per Berater-ID zugeordnet. Ã–ffentliche und anonyme AusfÃ¼hrung sind gesperrt.
- Keine Kundendaten und keine bestehenden DatensÃ¤tze verÃ¤ndert. `schema-phase141.sql` wurde am 05.08.2026 auf die Live-Datenbank angewandt und mit einem verknÃ¼pften Beraterkonto geprÃ¼ft. Version v1.167 ist auf `main` und Vercel verÃ¶ffentlicht.

---

## v1.166 Beta - Phase 140 Â· Professionelle Beraterkonten
**2026-08-05**

- Die KontenÃ¼bersicht zeigt Berater jetzt als klare Profilkarten mit grÃ¶ÃŸerem, vollstÃ¤ndig sichtbarem Portrait, Name, Rolle, E-Mail sowie Login- und Aktivstatus.
- Die lange Foto-URL ist aus der OberflÃ¤che verschwunden. Das gespeicherte Feld bleibt technisch erhalten; sichtbar sind nur Bildvorschau, â€žBild ersetzenâ€œ und â€žBild entfernenâ€œ.
- Die Bearbeitung ist in â€žProfil und Kontaktâ€œ, â€žÃ–ffentliche Angabenâ€œ und â€žZugangâ€œ gegliedert. Passwort und Profildaten bleiben bewusst getrennte Aktionen.
- URL-Kennung und interne Benutzer-ID stehen nicht mehr im Arbeitsbereich, sondern unter â€žTechnische Angaben anzeigenâ€œ.
- Die Speicherleiste schlieÃŸt jede geÃ¶ffnete Kontokarte eindeutig ab. Mobil ordnen sich Profilbild, Felder, Zugang und Aktionen einspaltig an.
- Keine DatenbankÃ¤nderung und keine gelÃ¶schten Beraterdaten. Am 05.08.2026 auf `main` verÃ¶ffentlicht und Ã¼ber die offizielle Vercel-Produktionsadresse geprÃ¼ft.

---

## v1.165 Beta - Phase 139 Â· VerlÃ¤ssliche Berater-PasswÃ¶rter
**2026-08-05**

- Das sichtbare Passwortfeld zeigte bei jedem Ã–ffnen einen neuen Zufallsvorschlag, obwohl dieser noch nicht gespeichert war. Das Feld ist jetzt leer und erklÃ¤rt eindeutig, dass ein neues Passwort erst nach dem ausdrÃ¼cklichen Setzen aktiv wird.
- Der allgemeine Knopf "Speichern" fÃ¼r Beraterdaten und der Passwort-Knopf sind klar getrennt. Der Passwort-Knopf steht gut sichtbar Ã¼ber die gesamte Breite und funktioniert auch auf schmalen Bildschirmen.
- Neue Logins und Passwort-Ã„nderungen laufen jetzt Ã¼ber dieselbe abgesicherte Edge Function. Bestehende Konten werden mit Supabases offizieller Auth Admin API `updateUserById` aktualisiert.
- Der bisherige direkte Schreibzugriff auf den Passwort-Hash in `auth.users` wird vom Browser nicht mehr verwendet.
- Keine Datenbankmigration. Live seit 05.08.2026: Edge Function `berater-create-login` Version 2 und Vercel-Produktion auf Commit `7cb14a1` geprÃ¼ft.

---

## v1.164 Beta - Phase 138 Â· Kein fremdes Gesicht beim Laden
**2026-08-05**

- Auf allen Kundenseiten stand das Portrait des Haupt-Beraters fest im HTML bzw. wurde beim Start aktiv gesetzt. FÃ¼r jeden anderen Berater blitzte deshalb beim Laden kurz ein fremdes Gesicht auf, bis sein eigenes geladen war.
- Die Portraits haben jetzt gar keine Startquelle mehr. Sie bleiben leer, bis der Berater feststeht â€” geprÃ¼ft: Kais Bild wird auf einer fremden Seite nicht mehr angefordert.
- Der zuletzt geladene Berater wird pro Link gemerkt. Beim zweiten Aufruf steht das richtige Bild sofort, ohne Wartezeit und ohne Aufblitzen.
- Der Dashboard-Header zeigt ohne eigenes Foto einen neutralen Initialen-Kreis statt des Fotos vom Haupt-Berater. Die Login-Seite zeigt das Foto des zuletzt Angemeldeten, sonst gar keins.
- GeprÃ¼ft mit allen fÃ¼nf angelegten Beratern auf EmpfÃ¤nger-Seite, Finanzierungskompass, PrÃ¤sentationsseite und Promoter-Bereich.

---

## v1.163 Beta - Phase 137 Â· Themenseiten auf den richtigen Berater
**2026-08-05**

- Die Themenseiten (EmpfÃ¤nger-Seite und Finanzierungskompass) zeigten fÃ¼r neu angemeldete Berater weiterhin Foto, Name und Initialen von Kai. Grund: sie konnten den Berater nur Ã¼ber den Token einer echten Empfehlung auflÃ¶sen.
- Beide Seiten erkennen den Berater jetzt zusÃ¤tzlich Ã¼ber `?berater=slug` und, wenn kein Slug da ist, Ã¼ber den eingeloggten Berater.
- Die Themen-Vorschau auf der PrÃ¤sentationsseite hÃ¤ngt den Slug des gebrandeten Beraters an die Vorschau-Links. Im Vorschaufenster und beim groÃŸen Ã–ffnen steht damit der richtige Berater.
- Die Portraits auf der EmpfÃ¤nger-Seite bleiben leer, bis der Berater feststeht. Vorher blitzte kurz das Standard-Foto auf.
- Impressum und Datenschutz werden beim eingeloggten Berater mitgeladen, sonst waren die beiden FuÃŸzeilen-Links in der eigenen Vorschau ausgeblendet.

---

## v1.162 Beta - Phase 136 Â· Echte Kennzahlen im Fokus
**2026-08-04**

- Der frei berechnete Momentum-Score mit 86 von 100 Punkten ist entfernt. Seine Gewichtung und Aussagen wie "Top-Drittel" hatten keine verstÃ¤ndliche fachliche Grundlage.
- Direkt unter dem Einstieg stehen jetzt die vier echten Kennzahlen: aktive Promoter, Link-Klicks, Empfehlungen und neue Kunden.
- Die Kennzahlen sind als ruhige, hochwertige Karten waagerecht angeordnet. Die vorhandene Entwicklung zur Vorwoche bleibt erhalten.
- Der bisherige zweite Kennzahlenblock weiter unten ist entfernt. Datenbank und Kennzahlen-Abfragen bleiben unverÃ¤ndert.

---

## v1.161 Beta - Phase 135 Â· Erfolgsgeschichten entfernt
**2026-08-04**

- Der MenÃ¼punkt und die Verwaltungsmaske fÃ¼r Erfolgsgeschichten sind entfernt. Die Funktion wurde auf keiner Kundenseite mehr sichtbar ausgespielt.
- Die EmpfÃ¤ngerseite fragt die nicht verwendeten Geschichten nicht mehr aus Supabase ab. Auch der tote Renderer und die zugehÃ¶rigen Verwaltungsfunktionen sind entfernt.
- Die vorhandenen DatensÃ¤tze und die Tabelle `erfolgsgeschichten` bleiben vorerst in der Datenbank erhalten. Es wurden keine Inhalte gelÃ¶scht.

---

## v1.160 Beta - Phase 134 Â· Belohnungs-Einstieg gestrafft
**2026-08-04**

- Die beiden Karten â€žDein Bekannter bekommt" und â€žDu bekommst" sind aus der PrÃ¤sentationsseite entfernt. Sie wiederholten bereits erklÃ¤rte Punkte und rÃ¼ckten die Belohnung unnÃ¶tig frÃ¼h in den Vordergrund.
- Der zusÃ¤tzliche Hinweis â€žDeine erste Belohnung ist nur eine Empfehlung entfernt" ist ebenfalls entfernt. Die klare Regel direkt darunter bleibt: GezÃ¤hlt wird, wer Kunde wird.
- Die nicht mehr benÃ¶tigten Stile des entfernten Blocks wurden mit aufgerÃ¤umt. `programm.css` wird mit einem neuen Cache-Stempel geladen.

---

## v1.159 Beta - Phase 133 Â· Versionsanzeige wieder verlÃ¤sslich
**2026-08-04**

- **Die Versionsnummer in der Seitenleiste blieb nach VerÃ¶ffentlichungen stehen.** Sie kommt aus `js/config.js` â€” der einzigen Datei ohne Versionsnummer im Namen, und sie wurde zuerst aus dem Zwischenspeicher geliefert. Wer die Seite vor einer Freigabe geÃ¶ffnet hatte, sah tagelang die alte Nummer, obwohl lÃ¤ngst neuer Code lief.
- `js/config.js` wird jetzt **immer zuerst aus dem Netz** geholt; der Zwischenspeicher ist nur noch der Notnagel ohne Verbindung. Damit kann die angezeigte Version nicht mehr von der ausgelieferten abweichen.
- Der Cache-Stempel wurde hochgezÃ¤hlt, damit vorhandene Zwischenspeicher verworfen werden. Im Kopf von `sw.js` steht jetzt ausdrÃ¼cklich, dass er bei **jeder** VerÃ¶ffentlichung hochzuzÃ¤hlen ist â€” genau das war bei den letzten beiden Freigaben unterblieben.

---

## v1.158 Beta - Phase 132 Â· Inspirations-Zitate raus
**2026-08-04**

- **Der Abschnitt â€žWorÃ¼ber Menschen mich weiterempfehlen" mit den elf Zitaten ist entfernt.** Im GesprÃ¤ch erzÃ¤hlt Kai diese Geschichten selbst â€” besser, als sie von der Wand abzulesen. Und die Themen-Auswahl direkt danach beantwortet dieselbe Frage als Werkzeug statt als Textwand.
- Beim AufrÃ¤umen mitgenommen: die Stile der **Potenzialliste**, deren Funktion schon in Phase 116 entfallen war. 38 Regeln fÃ¼r ein Bauteil, das es seit heute frÃ¼h nicht mehr gibt.
- Die Seite hat jetzt 13 Abschnitte; `css/programm.css` ist bei 5.863 Zeilen â€” heute frÃ¼h waren es 7.614.

---

## v1.157 Beta - Phase 131 Â· Tastatursteuerung, FAQ und Bewertungen raus
**2026-08-04**

- **Die Pfeiltasten blÃ¤ttern wieder abschnittsweise.** Mit dem Folien-Modus war auch die Tastatursteuerung verschwunden; die Pfeiltasten scrollten nur noch in Vierzig-Pixel-Schritten. Jetzt gilt: â†“ Â· â†’ Â· Bild ab Â· Leertaste weiter, â†‘ Â· â† Â· Bild auf zurÃ¼ck, Pos 1 und Ende an den Anfang bzw. ans Ende.
- Hohe Abschnitte wie die Belohnungs-Reise werden dabei zuerst seitenweise durchgeblÃ¤ttert und erst am Ende verlassen â€” sonst wÃ¼rde ein Tastendruck von Stufe 1 direkt hinter das Mallorca-Finale springen.
- In Eingabefeldern und den Mehrwert-Zeilen gehÃ¶ren die Pfeiltasten dem Feld, damit die Seite beim Mittippen nicht wegspringt. Die Leertaste hÃ¤lt sich zurÃ¼ck, wenn ein Knopf den Fokus hat.
- **FAQ und Kundenbewertungen sind entfernt.** Im GesprÃ¤ch beantwortet Kai Fragen selbst, und die Google-Rezensionen brauchte es vor jemandem nicht, der bereits Kunde ist.
- Nebenwirkung, die zÃ¤hlt: Die Bewertungs-Laufschrift war die einzige Stelle, an der Inhalte Ã¼ber den Bildschirmrand ragten â€” 28 Elemente. Jetzt sind es null.
- `css/programm.css` schrumpft von 6.588 auf 6.071 Zeilen, `programm.html` von 1.050 auf 927.

---

## v1.156 Beta - Phase 130 Â· PrÃ¤sentations-Modus entfernt
**2026-08-04**

- **Der Folien-Modus ist raus.** Kai trÃ¤gt scrollend vor â€” der Modus wurde nicht genutzt, kostete aber bei jeder Ã„nderung eine zweite PrÃ¼fung. Genau daran ist an einem Tag zweimal etwas kaputtgegangen: Das Folienraster brach mit den echten Daten zusammen, und beim Hero-Umbau mussten Sonderregeln fÃ¼r eine Ansicht gepflegt werden, die niemand Ã¶ffnet.
- Entfernt: der Knopf unten rechts, die Foliensteuerung, 162 Zeilen Steuerlogik und 141 RegelblÃ¶cke im Stylesheet. `css/programm.css` schrumpft von 7.274 auf 6.587 Zeilen, `js/programm.js` von 983 auf 813.
- **Alle Inhalte bleiben sichtbar.** Drei Abschnitte waren im Folien-Modus ausgeblendet (der neue Hero, die Orbit-Grafik â€žDeine Vorteile", die Inspirations-Zitate). Beim Scrollen sieht man sie ohnehin â€” jetzt gibt es nur noch eine Wahrheit.
- MenÃ¼punkt â€žPrÃ¤sentation" und die Kachel unter â€žBonusprogramm" fÃ¼hren jetzt auf die normale Seite statt auf den Folien-Start.

---

## v1.154 Beta - Phase 128 Â· Hero als Einstieg, Zufriedenheitsfrage danach
**2026-08-04**

- **Die Seite beginnt jetzt mit â€žDu bist begeistert von unserer Zusammenarbeit?"** samt PortrÃ¤t und den beiden KnÃ¶pfen. Die Zufriedenheitsfrage mit der Skala 1â€“10 folgt als zweiter Abschnitt. Vorher war es umgekehrt â€” die Frage kam ohne jede Einordnung als Erstes.
- **Das groÃŸe PortrÃ¤t auf der Frage-Seite ist entfallen.** Es stand direkt unter dem PortrÃ¤t der neuen Startseite, also zweimal hintereinander. Der Satz â€žDeine ehrliche Antwort ist mir wichtiger als eine perfekte Zahl." bleibt und steht jetzt als Zitat unter der Skala.
- Ohne die PortrÃ¤t-Spalte hÃ¤tte der Text auf breiten Bildschirmen links geklebt und rechts eine leere HÃ¤lfte gelassen; der Block ist deshalb gedeckelt und mittig gesetzt.
- Die beiden Weiter-KnÃ¶pfe unter der Skala (â€žTrotzdem weiterlesen", â€žZeig mir das Programm") zeigten auf den Hero â€” der steht jetzt darÃ¼ber. Sie fÃ¼hren nun nach unten zum nÃ¤chsten Abschnitt.
- AufgerÃ¤umt: 17 RegelblÃ¶cke fÃ¼r das entfallene PortrÃ¤t aus `css/programm.css` entfernt.
- Der PrÃ¤sentations-Modus bleibt unverÃ¤ndert.

---

## v1.153 Beta - Phase 127 Â· Belohnungen als senkrechte Meilensteinreise
**2026-08-04**

> Migration `schema-phase127.sql` am 04.08.2026 angewandt: 15 echte Stufen, Meilensteine bei 2, 5, 7, 10 und 15, fehlender Wert bei Stufe 1 und bei sieben bereits verdienten Stufe-1-PrÃ¤mien nachgetragen. Keine neue PrÃ¤mienzeile entstanden. Nachweise: `docs/2026-08-04-conrad-benefits-uebergabe.md` und `docs/nachweise-benefits/`.

- **Die Belohnungen erfanden Stufen, die es nicht gab.** Die Seite leitete aus den LÃ¼cken zwischen den vorhandenen Zeilen zusÃ¤tzliche 100-â‚¬-Boni fÃ¼r die Stufen 4, 6, 8, 9, 11â€“14 ab. In der Datenbank existieren nur 1, 2, 3, 5, 7, 10, 15 â€” und PrÃ¤mien entstehen ausschlieÃŸlich aus echten Zeilen. Ein Promoter mit vier gewonnenen Kunden hÃ¤tte einen Bonus gesehen, der in den Auszahlungen nie erscheint.
- Statt waagerechter Roadmap, vier Filter-Chips und getrennter Galerie gibt es jetzt **eine senkrechte Reise von Stufe 1 bis 15**: kleine Geldstufen als ruhige Zeilen, fÃ¼nf Meilensteine als Bildkarten, die zum Finale hin grÃ¶ÃŸer werden. Gebaut fÃ¼r 320 px aufwÃ¤rts.
- Die Stufenlogik liegt in `js/belohnungs-reise.js` â€” reine Funktionen, ohne Browser und Datenbank prÃ¼fbar (`tests/belohnungs-reise.test.mjs`, 40 Zusicherungen).
- Ein Satz sagt jetzt, was zÃ¤hlt: **gezÃ¤hlt wird, wer Kunde wird** â€” nicht der weitergegebene Name.
- Die Wunschziele im Promoter-Bereich und in der Berater-Detailseite zeigen nur noch die Meilensteine; ein frÃ¼her gewÃ¤hltes Ziel bleibt trotzdem sichtbar.
- Im PrÃ¤sentations-Modus bleiben nur die fÃ¼nf Bildkarten, die Geldstufen stehen als ein Satz darunter.
- Die Live-VorprÃ¼fung fand sieben bereits offene Stufe-1-PrÃ¤mien ohne Wertangabe. Die vorbereitete Migration ergÃ¤nzt dort den zugesagten Wert von jeweils 100 â‚¬, lÃ¤sst den tatsÃ¤chlichen Auszahlungsbetrag aber bis zur Auszahlung leer. Ein Sicherheitsstopp verhindert das Anwenden, falls vor der Freigabe inzwischen jemand Stufe 4 erreicht.
- AufgerÃ¤umt: 117 tote RegelblÃ¶cke der alten Roadmap und Galerie aus `css/programm.css` entfernt (7.614 â†’ 6.882 Zeilen), bevor die neuen mobilen Regeln dazukamen.

---

## v1.152 Beta - Phase 126 Â· Themen-Editor entrÃ¼mpelt
**2026-08-04**

- **Acht von dreizehn Feldern im Themen-Editor hatten keine Wirkung mehr.** Bild, die drei Vorteile (sechs Felder) und der Subtext wurden von keiner Seite mehr gelesen: Die EmpfÃ¤nger-Seite wurde irgendwann neu gebaut, ihre Anker (`eFinanzImg`, `eV1Titel` â€¦) existieren nicht mehr. Der Code lief weiter, fand die Elemente nicht und tat still nichts â€” deshalb ist es nie aufgefallen.
- Der Editor zeigt jetzt nur noch, was ankommt: **Name, Symbol, Unterzeile, Reihenfolge, Knopf-Beschriftung, Knopf-Ziel** â€” plus den Schalter â€žNoch in Arbeit". Die alten Werte bleiben in der Datenbank stehen, sie werden nur nicht mehr angeboten.
- **Das Symbol wird ausgewÃ¤hlt statt getippt.** Vorher musste man den englischen Lucide-Namen kennen (â€žHome", â€žShieldCheck"); jetzt stehen zehn Symbole zur Auswahl.
- Beschriftungen in normaler Schrift statt geschriebener GroÃŸbuchstaben, mit einem Hinweis darunter, wo das Feld auftaucht. Die Felder sind nach Wirkungsort gruppiert.
- **Fehler behoben:** Beim Speichern wurde eine Reihenfolge von 0 zu einem leeren Wert â€” die erste Themenseite rutschte damit ans Ende der Auswahl. Fiel bisher kaum auf, weil selten gespeichert wurde.
- Noch offen: Ob ein Thema Ã¼berhaupt angezeigt wird (`aktiv`), lÃ¤sst sich weiterhin nur in der Datenbank umstellen. DafÃ¼r brÃ¤uchte es ein zusÃ¤tzliches Leserecht, sonst wÃ¼rde ein ausgeblendetes Thema auch aus dem Editor verschwinden.

---

## v1.151 Beta - Phase 125 Â· Eine Seite, ein Name: Ãœberblick
**2026-08-04**

- **Die Startseite hatte drei Namen:** â€žEmpfehlungs-HUB" oben in der Leiste, â€žDashboard" im MenÃ¼ und â€žâ† Hub" auf den ZurÃ¼ck-Buttons â€” in den Einstellungen sogar â€žâ† Dashboard". Man klickte auf Hub und landete auf Dashboard.
- Sie heiÃŸt jetzt Ã¼berall **â€žÃœberblick"**: im MenÃ¼, im Rechtsklick-MenÃ¼ und auf allen sechs ZurÃ¼ck-Buttons, die vorher zwischen â€žHub" und â€žDashboard" schwankten (auch die Pfeile waren uneinheitlich â€” mal âŒ‚, mal â†).
- **â€žEmpfehlungs-HUB" bleibt** als Produktname oben in der Leiste stehen â€” wie ein Logo. Damit meint kein Wort mehr dasselbe wie ein anderes.
- Auch fÃ¼r den Promoter aufgerÃ¤umt: Im Willkommens-Fenster hieÃŸ es â€žZu meinem Dashboard" und â€žDein Dashboard-Link". Jetzt steht dort â€žZu meinem Bereich" und â€žDein persÃ¶nlicher Link" â€” passend zum Text der Einladung, die er von dir bekommt.

---

## v1.150 Beta - Phase 124 Â· Klare Namen: Bonusprogramm, Auszahlungen, Team
**2026-08-04**

- **â€žProgramm" heiÃŸt jetzt â€žBonusprogramm".** Direkt darÃ¼ber steht â€žPrÃ¤sentation", und beide fÃ¼hrten zu Seiten mit Ã¤hnlichem Namen â€” wer â€žProgramm" las, wusste nicht, ob er dort etwas einrichtet oder etwas zeigt.
- **â€žPrÃ¤mien" heiÃŸt jetzt â€žAuszahlungen".** Der Name sagt, was du dort tust: fÃ¤llige BetrÃ¤ge abarbeiten und als ausgezahlt markieren. Die Belohnungen selbst heiÃŸen in der Liste weiterhin PrÃ¤mien â€” das sind die Dinge, die Auszahlung ist die Handlung.
- Beide Namen wurden **Ã¼berall** nachgezogen: MenÃ¼, Seitentitel im Browser-Tab, Kopfzeile der Seite und Rechtsklick-MenÃ¼. Auch die Team-Seite (vormals â€žBerater") heiÃŸt jetzt durchgehend Team.
- Damit gibt es im Berater-Bereich keinen MenÃ¼punkt mehr, der anders heiÃŸt als die Seite, auf der man landet.

---

## v1.149 Beta - Phase 123 Â· MenÃ¼ aufgerÃ¤umt, Admin-Bereiche geschÃ¼tzt
**2026-08-04**

- **Das MenÃ¼ ist jetzt in zwei BlÃ¶cke geteilt.** Oben das TagesgeschÃ¤ft (Dashboard, Empfehlungen, Promoter, PrÃ¤mien, PrÃ¤sentation, Analysen), darunter eine feine Trennlinie mit der Ãœberschrift â€žVerwaltung" und dahinter das, was man nur gelegentlich einrichtet (Programm, Team, Einstellungen). Vorher saÃŸ die Programm-Verwaltung mitten im TagesgeschÃ¤ft.
- **â€žPrÃ¤mien" ist nach oben gewandert.** Es ist der einzige MenÃ¼punkt mit einem ZÃ¤hler fÃ¼r offene Auszahlungen â€” also eine wartende Aufgabe und kein Verwaltungskram. Vorher stand es fast unten.
- **â€žBerater" heiÃŸt jetzt â€žTeam".** Berater bist du selbst; gemeint sind die Kolleginnen und Kollegen. Der Punkt hatte auÃŸerdem dasselbe Symbol wie â€žEmpfehlungen" und hat jetzt ein eigenes.
- **Die drei â€žAdmin Â· â€¦"-Abschnitte in den Einstellungen sind nicht mehr fÃ¼r alle sichtbar.** Bisher sah jeder eingeloggte Berater die Links zu Repository, Hosting, Datenbank-Editor, Telegram-Bot und Bookings-Seite. Einbrechen konnte damit niemand, aber es ist interne Werkstatt und gehÃ¶rt nicht vor fremde Augen. Sie erscheinen jetzt nur noch fÃ¼r Admins.
- **Kein Springen mehr beim Laden:** Die Admin-MenÃ¼punkte wurden erst nach der Netz-Antwort eingeblendet. Jetzt merkt sich das MenÃ¼ den Status vom letzten Besuch und korrigiert still, falls er sich geÃ¤ndert hat. Beim Abmelden wird der Merker gelÃ¶scht.

---

## v1.148 Beta - Phase 122 Â· Ein Name fÃ¼r den Promoter-Bereich
**2026-08-04**

- Der MenÃ¼punkt hieÃŸ **â€žChampions (Promoter)"** â€” fÃ¼hrte aber auf eine Seite, die Ã¼berall Promoter sagt: im Titel, in der Ãœberschrift â€žAlle Promoter", auf dem Knopf â€ž+ Neuer Promoter" und in der Detailansicht. Wer eine Ãœbersetzung in Klammern braucht, hat den falschen Namen. Jetzt heiÃŸt der Bereich durchgehend **Promoter**.
- Angepasst in der Seitenleiste, im ZurÃ¼ck-Link der Promoter-Detailseite, im Befehls- und Rechtsklick-MenÃ¼ sowie auf der Kachel unter â€žProgramm verwalten".
- **â€žDeine Champions" im Hub bleibt** â€” der Abschnitt zeigt die Top 3 mit Gold, Silber und Bronze. Dort ist Champions kein zweiter Name fÃ¼r dasselbe, sondern eine Auszeichnung.

---

## v1.147 Beta - Phase 121 Â· AktivitÃ¤ts-Feed lesbar
**2026-08-04**

- **Im â€žWas gerade passiert"-Feed liefen SÃ¤tze und Status-Label rechts aus der Karte heraus** und wurden hart abgeschnitten (â€žhat einen Anrufwunsch hinterâ€¦"). Ursache war kein zu schmaler Text, sondern ein Layout-Fehler: Die untere Zeile stand auf Spaltenrichtung, ihre Inhalte aber zentriert und ohne Umbruch â€” dadurch wurden sie so breit wie ihr Inhalt, breiter als die Karte selbst.
- SÃ¤tze brechen jetzt sauber um, statt abgeschnitten zu werden. Das Status-Label steht linksbÃ¼ndig unter dem Satz und bleibt vollstÃ¤ndig sichtbar.
- Namen brechen bei Bedarf auf eine zweite Zeile um, statt mitten im Wort zu enden. Nach zwei Zeilen wird gekÃ¼rzt, damit die Karten gleichmÃ¤ÃŸig bleiben.
- Die rechte Spalte ist von 300 auf 340 Pixel gewachsen und der Abstand zur Scrollleiste von 28 auf 14 Pixel geschrumpft â€” zusammen rund 55 Pixel mehr Platz fÃ¼r den eigentlichen Inhalt.

---

## v1.146 Beta - Phase 120 Â· Kein Bild-Flackern beim Laden
**2026-08-04**

- **Beim Neuladen war das Profilbild kurz weg** und der Browser zeigte an seiner Stelle sein Kaputt-Bild-Symbol. Grund: Das Bild stand mit leerer Quelle im HTML und bekam sein Foto erst, nachdem der Berater-Datensatz aus dem Netz geladen war.
- Der Kopfbereich zeigt jetzt sofort das zuletzt bekannte Foto und den Namen und ersetzt sie still, sobald die echten Daten da sind. Beim Abmelden wird dieser Merker gelÃ¶scht, damit der nÃ¤chste Login nicht kurz mit dem Bild des VorgÃ¤ngers begrÃ¼ÃŸt.
- Bilder ohne Quelle werden nicht mehr angezeigt â€” kein Kaputt-Symbol mehr, stattdessen ein ruhiger Platzhalter-Kreis, solange geladen wird. Gilt auch fÃ¼r die Login-Seite und das PortrÃ¤t in der PrÃ¤sentation.

---

## v1.145 Beta - Phase 119 Â· Promoter-Liste sortierbar
**2026-08-04**

- Ãœber der Promoter-Liste stehen jetzt vier Sortierungen zur Wahl: **Zuletzt hinzugefÃ¼gt** (Standard), **Meiste Kunden**, **Meiste Empfehlungen** und **Name Aâ€“Z**.
- Bei Gleichstand wird sinnvoll weitersortiert: gleich viele Kunden â†’ mehr Empfehlungen zuerst, danach das jÃ¼ngere Datum. Die Namenssortierung ignoriert GroÃŸ-/Kleinschreibung und ordnet Umlaute richtig ein.
- Die gewÃ¤hlte Sortierung bleibt gespeichert und gilt beim nÃ¤chsten Besuch wieder.
- Optisch die gleichen Filter-Chips wie auf der Empfehlungen-Seite â€” kein neues Bedienmuster.

---

## v1.144 Beta - Phase 118 Â· Promoter-Liste nach Datum, WhatsApp immer verfÃ¼gbar
**2026-08-04**

- **Die Promoter-Liste sortiert jetzt nach Datum**, neueste zuerst. Vorher stand oben, wer die meisten erfolgreichen Empfehlungen hatte â€” ein frisch angelegter Promoter landete damit irgendwo mittendrin und war schwer wiederzufinden.
- **â€žPer WhatsApp senden" erscheint jetzt immer.** Bisher tauchte der Weg nur auf, wenn beim Promoter eine Telefonnummer hinterlegt war. Ohne Nummer Ã¶ffnet WhatsApp jetzt mit fertigem Text, und der EmpfÃ¤nger wird dort ausgewÃ¤hlt; mit Nummer geht es weiterhin direkt in den richtigen Chat.
- Dasselbe fÃ¼r E-Mail: ohne hinterlegte Adresse Ã¶ffnet sich das Mailprogramm mit vorbereitetem Betreff und Text, nur das An-Feld bleibt leer.

---

## v1.143 Beta - Phase 117 Â· Einladungs-Link fÃ¼r Promoter verschicken
**2026-08-04**

- **Der Link zum Promoter-Bereich lÃ¤sst sich jetzt direkt aus dem Dashboard verschicken.** Bisher gab es ihn nirgends zum Mitnehmen: Man musste den Code aus der Liste ablesen oder die Promoter-Ansicht Ã¶ffnen und die Adresszeile kopieren. Ohne diesen Link kommt ein Promoter gar nicht in seinen Bereich â€” er kann weder sein Ziel wÃ¤hlen noch empfehlen.
- **Nach dem Anlegen** Ã¶ffnet sich das Einladungs-Fenster automatisch: fertiger Link, â€žKopieren", â€žPer WhatsApp senden" (an die hinterlegte Nummer), â€žPer E-Mail senden" und â€žNachricht kopieren" mit vorformuliertem Text fÃ¼r jeden anderen Kanal.
- **Jederzeit erneut schicken**, wenn ein Promoter seinen Link verlegt hat: Rechtsklick auf den Promoter in der Liste â†’ â€žEinladungs-Link sendenâ€¦", oder auf der Promoter-Detailseite der erste Button. Der Link bleibt derselbe und funktioniert weiter.
- Beim ersten Versand hÃ¤ngt `&neu=1` am Link â€” der Promoter wird dann mit â€žDein persÃ¶nlicher Bereich ist bereit" begrÃ¼ÃŸt statt mit dem Wiederkehrer-Text.
- Im Fenster steht der Hinweis, dass der Link der persÃ¶nliche Zugang des Promoters ist und nicht in Gruppen gehÃ¶rt.
- Neu: `js/promoter-invite.js` â€” ein Modul fÃ¼r alle drei Einstiege, damit Text und Link Ã¼berall identisch sind.

---

## v1.142 Beta - Phase 116 Â· Belohnungen entdoppelt + Promoter-Einladung korrigiert
**2026-08-04**

- **Jede Belohnung stand doppelt in der PrÃ¤sentation** (Restaurantbesuch, Weber-Grill, Goldbarren, iPad, Mallorca): In der Belohnungs-Tabelle lag seit dem 23.07. ein zweiter, identischer Satz eines weiteren Beraters, und die Seite hat alle Zeilen ungefiltert geladen. Jetzt bleibt pro Stufe genau eine Karte Ã¼brig â€” bevorzugt die des jeweiligen Beraters, sonst die des Haupt-Beraters.
- Gleiches Problem behoben bei den **Themenwelten** (16 statt 8 in PrÃ¤sentation und Empfehlungs-Formular), der **Ziel-Auswahl im Promoter-Bereich** (14 statt 7 Ziele), dem **Ziel-Dropdown in der Promoter-Detailseite** und den **Erfolgsgeschichten auf der EmpfÃ¤nger-Seite**.
- Berater ohne eigene Themen-Vorlagen bekommen jetzt den geteilten Satz statt einer fast leeren Themen-Auswahl.
- **Ursache beseitigt:** Die Klon-Zeilen des inaktiven Beraters sind aus der Datenbank entfernt (7 Belohnungen, 8 Vorlagen, 3 Erfolgsgeschichten) â€” `schema-phase116.sql`, inklusive vollstÃ¤ndigem Rollback-Block in derselben Datei. Der Client-Filter bleibt als Netz fÃ¼r die Zukunft.
- **Roadmap-Punkte 1 und 3** wurden fÃ¤lschlich als Meilenstein dargestellt (â€žEmpfehlungs-Bonus" als Label) und ihr Klick lief ins Leere, weil es die Zielkarte in der Galerie nicht gibt. Sie sind jetzt normale 100-â‚¬-Stufen. Klick auf einen Meilenstein schaltet die Galerie bei Bedarf zurÃ¼ck auf â€žAlle Belohnungen".
- **Filter â€žGeldwert" und â€žFÃ¼r guten Zweck"** zeigten nur zwei Beispiel-Karten aus der Tabelle. Jetzt erscheint jede der zehn 100-â‚¬-Bonus-Stufen â€” passend zu dem, was die Roadmap verspricht.
- **Gesamtwert-ZÃ¤hler** rechnet sich jetzt aus den echten Stufen (aktuell 4.798 â‚¬) statt fest im HTML zu stehen.
- **Promoter-Einladung:** Im Erfolgs-Modal fÃ¼hrten beide Buttons auf dieselbe Seite. â€žErste Empfehlung aussprechen" geht jetzt wie vorgesehen zum Empfehlungs-Formular, â€žZu meinem Dashboard" in den persÃ¶nlichen Bereich. Das â€žÃ—" schlieÃŸt das Modal, statt wegzunavigieren â€” wer nur den Link kopieren will, bleibt jetzt auf der Seite.
- **Anmeldung:** E-Mail oder Telefon ist jetzt Pflicht (eins von beidem genÃ¼gt). Ohne Kontaktweg war ein Promoter, der seinen Link verliert, nicht mehr erreichbar â€” und eine Belohnung nicht auszahlbar.
- **Programm verwalten** und **Themen-Seiten** (Admin) listeten ebenfalls alles doppelt und haben beim Speichern einer Themenseite die gleichnamige Zeile des anderen Beraters mitÃ¼berschrieben. Beide Editoren arbeiten jetzt nur noch auf den eigenen Zeilen.
- AufgerÃ¤umt: die alte â€žPotenzialliste" (Phase 71) lag noch als ~260 Zeilen im Code, ihre HTML-BlÃ¶cke sind lÃ¤ngst raus.

---

## v1.141 Beta - Phase 114 Â· Belegnummern kollisionssicher
**2026-07-26**

- Belegnummern fÃ¼r PrÃ¤mien-Auszahlungen werden jetzt Ã¼ber einen sicheren, fortlaufenden ZÃ¤hler pro Berater und Jahr vergeben (statt â€žAnzahl + 1") â€” auch bei gleichzeitigen Auszahlungen kann keine Nummer doppelt entstehen.
- Die Auszahlung sperrt die PrÃ¤mienzeile kurz, sodass ein Doppelklick keine zweite Nummer erzeugt; bereits vergebene Nummern bleiben unverÃ¤ndert.
- Intern: neuer ZÃ¤hler im geschÃ¼tzten `private`-Bereich (kein direkter Zugriff), Eindeutigkeitsregel auf der Belegnummer.

---

## v1.140 Beta - Phase 115 Â· Anonyme Kennzahlen-Zugriffe gesperrt
**2026-07-26**

- Kennzahl- und Team-Funktionen (Momentum-/Trend-Charts, Team-AktivitÃ¤t und -PrÃ¤senz, Promoter-Score, KPI-Tagessnapshot) sowie das LÃ¶schen von Promotern kÃ¶nnen jetzt **nicht mehr anonym** aufgerufen werden â€” nur noch eingeloggte Berater bzw. interne Systemrollen.
- Der Ã¶ffentliche EmpfÃ¤nger-/Promoter-Weg (Empfehlung Ã¶ffnen, absenden, Interesse melden) bleibt unverÃ¤ndert; das Team-Dashboard und der nÃ¤chtliche Kennzahlen-Lauf (Rolle `postgres`) laufen wie bisher.
- Rein datenbankseitig (AusfÃ¼hrungsrechte entzogen), keine Client-/UX-Ã„nderung.

---

## v1.139 Beta - Phase 109 Â· Datensparsame Berater-Leserechte
**2026-07-23**

- Ein eingeloggter Berater kann jetzt nur noch seinen eigenen Berater-Datensatz lesen â€” nicht mehr die Stammdaten (Name, E-Mail, Telefon) der Kollegen. Admins sehen weiterhin alle (fÃ¼r die Team-Ãœbersicht).
- Dashboard, Leads, Branding und Team-Ansicht bleiben unverÃ¤ndert (laufen Ã¼ber eigene, abgesicherte Wege).
- Rein datenbankseitig (zwei RLS-Leseregeln), keine Client-/UX-Ã„nderung.

---

## v1.138 Beta - Phase 108 Â· StÃ¤rkere Promoter-Codes
**2026-07-23**

- Neue Promoter bekommen ab jetzt einen deutlich stÃ¤rkeren, nicht mehr erratbaren Code (14 zufÃ¤llige Zeichen statt 4) â€” egal ob manuell angelegt oder automatisch beim ersten Empfehlungseingang.
- Alle bestehenden Codes bleiben unverÃ¤ndert gÃ¼ltig; alte Links, QR-Codes und Lesezeichen funktionieren weiter.
- Keine sichtbare Ã„nderung fÃ¼r Nutzer, kein Umbau der Seiten.
- Intern: gemeinsamer Code-Generator mit KollisionsprÃ¼fung; ein ZÃ¤hlfeld (`code_version`) unterscheidet alte und neue Codes fÃ¼rs Monitoring.

---

## v1.137 Beta - Phase 107 Â· Serverseitiges Rate-Limiting
**2026-07-23**

- Missbrauch wird jetzt serverseitig gebremst: pro Internet-Anschluss (IP) gelten Obergrenzen direkt in der Datenbank â€” sie greifen auch bei Aufrufen, die am Server vorbei direkt an die Datenbank gehen, nicht nur im Browser.
- HÃ¶chstens 20 neue Empfehlungen pro Stunde je Anschluss (gegen Massen-Spam).
- HÃ¶chstens 40 â€žInteressiert"-Meldungen pro Stunde je Anschluss (gegen eine Flut an Benachrichtigungen).
- HÃ¶chstens 60 LadevorgÃ¤nge des Promoter-Bereichs pro 10 Minuten je Anschluss (gegen automatisiertes Ausprobieren von Promoter-Codes). Ein normaler Ladevorgang zÃ¤hlt dreifach; fÃ¼r echte Nutzung bleibt reichlich Luft.
- TerminbestÃ¤tigungen (Bookings) und das â€žLink geÃ¶ffnet"-Tracking bleiben bewusst ohne Limit.
- Rein datenbankseitig (schema-phase107.sql) â€” keine Ã„nderung an den Seiten; bestehende AblÃ¤ufe unverÃ¤ndert.

---

## v1.136 Beta - Phase 106 Â· Sicherheit & StabilitÃ¤t
**2026-07-23**

- Fremde kÃ¶nnen keine erfundenen Empfehlungen mehr direkt in die Datenbank schreiben. Neue Empfehlungen entstehen ausschlieÃŸlich Ã¼ber den geprÃ¼ften Weg des Portals â€” das schÃ¼tzt auch die PrÃ¤mien vor erfundenen â€žKunden".
- Die Kontaktdaten der Berater (E-Mail, Telefon) sind nicht mehr Ã¶ffentlich abrufbar, sondern nur noch fÃ¼r angemeldete Berater. Name und Foto auf den EmpfÃ¤nger-Seiten kommen weiterhin Ã¼ber den dafÃ¼r vorgesehenen, begrenzten Weg.
- Ein bestÃ¤tigter Termin wird nur noch eindeutig zugeordnet: Empfehlen zwei Promoter dieselbe Person mit gleicher Nummer, wird nichts geraten â€” so kann eine PrÃ¤mie nie beim falschen Promoter landen.
- Beim RÃ¼ckrufwunsch erscheint die BestÃ¤tigung â€žIch rufe dich an" nur noch, wenn der Wunsch wirklich gespeichert wurde. Bei unvollstÃ¤ndigem Link gibt es einen ehrlichen Hinweis statt einer falschen BestÃ¤tigung.
- Das Empfehlungs-Formular lÃ¤sst sich nicht mehr durch schnelles Doppelklicken doppelt absenden â€” ein Klick, ein Lead.
- Eingaben werden serverseitig auf sinnvolle LÃ¤ngen begrenzt und Pflichtfelder geprÃ¼ft.
- Cache: app.js v46 (EmpfÃ¤nger), app.js v42 (Empfehlen), sw.js v106.

---

## v1.135 Beta - Phase 105 Â· EmpfÃ¤nger- und Bookings-Tracking
**2026-07-22**

- LinkÃ¶ffnungen werden Ã¼ber einen eigenen Portal-Endpunkt gespeichert und hÃ¤ngen nicht mehr vom extern geladenen Supabase-Modul ab. Dadurch funktioniert das Tracking auch in mobilen WhatsApp-Browsern zuverlÃ¤ssiger.
- Der Klick auf Microsoft Bookings wird ehrlich als â€žTerminwahl geÃ¶ffnetâ€œ gespeichert. Er gilt noch nicht als vereinbarter Termin.
- Erst der offizielle Microsoft-Bookings-AuslÃ¶ser in Power Automate darf einen Termin als bestÃ¤tigt, geÃ¤ndert oder abgesagt zurÃ¼ckmelden.
- Die Zuordnung erfolgt nur zu einer zuvor geÃ¶ffneten Terminwahl und Ã¼ber die bereits vorhandene Telefonnummer. Name und E-Mail aus Bookings werden nicht zusÃ¤tzlich gespeichert.
- Der Promoterbereich unterscheidet Link geÃ¶ffnet, Terminwahl geÃ¶ffnet, Termin vereinbart und Termin abgesagt und erkennt diese Ã„nderungen bei der regelmÃ¤ÃŸigen Aktualisierung.
- Neue abgesicherte Vercel-Endpunkte: `/api/referral-event` und `/api/bookings-event`.
- Cache: app.js v45, baufi.js v3, empfehler-mobile.js v5, referral-tracking.js v2, sw.js v105.

---

## v1.133 Beta - Phase 103 Â· Mobile-first Promoterbereich
**2026-07-22**

- Der Promoter startet jetzt direkt im ersten Handybildschirm eine neue Empfehlung, statt erst durch Statistiken und Belohnungen zu scrollen.
- Ein gefÃ¼hrter Ablauf fÃ¼hrt in vier Schritten von Vorname und Handynummer Ã¼ber die Themenauswahl bis zur persÃ¶nlichen Nachricht und Linkvorschau. Beide Angaben werden vor dem Linkaufbau verstÃ¤ndlich geprÃ¼ft.
- Die acht aktiven Themen werden direkt aus Supabase geladen und als leicht verstÃ¤ndliche Auswahlkarten dargestellt.
- Der Verlauf unterscheidet ehrlich zwischen â€žLink erstelltâ€œ, â€žVersand bestÃ¤tigtâ€œ, â€žLink geÃ¶ffnetâ€œ, GesprÃ¤chswunsch, Kontakt und Kunde.
- Die VersandbestÃ¤tigung wird dauerhaft Ã¼ber den vorhandenen Promoter-Kontext gespeichert. Es wurde keine parallele Datenhaltung eingefÃ¼hrt.
- EntwÃ¼rfe bleiben auf dem jeweiligen GerÃ¤t gespeichert und kÃ¶nnen spÃ¤ter fortgesetzt werden.
- Neuigkeiten, Wirkung, Wunschziel, persÃ¶nliche Nachricht und Zusatzinfos sind in einer kompakten mobilen ArbeitsflÃ¤che zusammengefÃ¼hrt.
- Der Stand wird beim erneuten Ã–ffnen sowie alle 60 Sekunden aktualisiert, solange die Seite sichtbar ist.
- Die Rollenbezeichnung im Promoterbereich lautet verstÃ¤ndlich â€žFinanzierungsspezialistâ€œ.
- Cache: empfehler-mobile.css v1, empfehler-mobile.js v3, config.js v1.133 Beta, sw.js v104.

---

## v1.132 Beta - Phase 102 Â· Ruhigerer PortrÃ¤t-Ausschnitt

- Das PortrÃ¤t auf der ersten Folie ist im PrÃ¤sentationsmodus etwa zehn Prozent kleiner inszeniert.
- Mehr Schulter und Bildraum reduzieren den Druck bei der Frage nach einer ehrlichen Bewertung.
- Das Zitat ist etwas kleiner und konkurriert nicht mehr mit der eigentlichen Einstiegsfrage.
- Cache: programm.css v69, config.js v1.132 Beta, sw.js v103.

---

## v1.131 Beta - Phase 101 Â· VollstÃ¤ndig lesbare Vorteile-Folie

- Die Folie â€žFolgende Vorteile erwarten dichâ€œ ist im PrÃ¤sentationsmodus vollstÃ¤ndig sichtbar.
- Die lange Web-Galerie wird im Pitch ausgeblendet. Sie bleibt auf der normalen Webseite unverÃ¤ndert erhalten.
- Gezeigt werden die beiden Vorteilsbereiche, die Kernaussage, die Belohnungslogik und die Stufen-Roadmap.
- Cache: programm.css v68, config.js v1.131 Beta, sw.js v102.

---

## v1.130 Beta - Phase 100 Â· Gestraffte PrÃ¤sentation mit persÃ¶nlicher Botschaft
**2026-07-22**

- Die doppelte Vorteilsfolie wird in der PrÃ¤sentationsansicht Ã¼bersprungen, weil der Kunde seinen persÃ¶nlichen Mehrwert bereits selbst benannt hat.
- Die erneute Begeisterungsfrage entfÃ¤llt, weil sie den persÃ¶nlichen Einstieg wiederholt und den Ãœbergang zum Ablauf verzÃ¶gert.
- Die bisherige Videofolie mit funktionslosem Abspielknopf wird durch eine persÃ¶nliche Botschaft an den Empfehlungsgeber ersetzt.
- Die Aussage â€žDu verkaufst nichts. Du Ã¶ffnest nur eine TÃ¼r.â€œ wird ohne zweites BeraterportrÃ¤t inszeniert. Ein warmer Lichtspalt greift das Bild der geÃ¶ffneten TÃ¼r auf.
- Die PrÃ¤sentation fÃ¼hrt jetzt in dreizehn statt fÃ¼nfzehn Folien schneller von der eigenen Erfahrung zum einfachen Empfehlungsweg.
- Cache: programm.css v67, config.js v1.130 Beta, sw.js v101.

---

## v1.129 Beta - Phase 99 Â· Emotionale Nutzenfolie in der EmpfehlungsprÃ¤sentation
**2026-07-22**

- Die bisher zahlenlastige FÃ¶rderfolie stellt jetzt zuerst den Menschen in den Mittelpunkt, dem eine Empfehlung helfen kÃ¶nnte.
- Ein neues Freundschaftsmotiv, die Auswahl zwischen bestem Freund, Familie und Lieblingskollege sowie eine kurze persÃ¶nliche Reaktion machen die Folie im KundengesprÃ¤ch interaktiv.
- Die Altersvorsorgereform wird als eigener Deutschland-Baustein mit Gesetzesstatus, Start zum 1. Januar 2027 und direkter Quelle der Bundesregierung erklÃ¤rt.
- Die Beispielrechnung bleibt erhalten, ist aber klar als erste Orientierung ohne Zusage gekennzeichnet.
- Die Folie ist bei 1.600 Ã— 842 und 2.048 Ã— 1.120 Pixeln vollstÃ¤ndig ohne Scrollen lesbar.
- Die EurobetrÃ¤ge der Beispielrechnung bleiben auch auf schmaleren PrÃ¤sentationsflÃ¤chen sicher innerhalb der Ergebniskarte.
- Die Karten der Alltagsfolie nutzen die PrÃ¤sentationsflÃ¤che jetzt groÃŸzÃ¼giger und bleiben trotzdem vollstÃ¤ndig ohne Scrollen sichtbar.
- Die beiden fertigen Themenwelten werden jetzt als groÃŸe emotionale Bildkarten inszeniert. Die sechs weiteren Themen bleiben bewusst ruhig, damit die Folie hochwertig statt wie ein Fotokatalog wirkt.
- Cache: programm.css v66, programm.js v38, config.js v1.129 Beta, sw.js v100.

---

## v1.128 Beta - Phase 98 Â· Emotionale Bildwelten im Finanzierungskompass
**2026-07-22**

- Die sechs Ausgangssituationen Ã¶ffnen jetzt jeweils eine eigene, hochwertige Bildwelt: Orientierung, Neubau, Kauf, Sanierung, Anschlussfinanzierung und Optimierung.
- Die Motive werden erst nach der Auswahl geladen. So bleibt der Einstieg schnell und die Seite wirkt trotzdem deutlich emotionaler.
- Das BeraterportrÃ¤t zeigt jetzt klar â€žFinanzierungsspezialistâ€œ sowie â€ž20 Jahre Erfahrung Â· Ã¼ber 400 Banken im Vergleichâ€œ.
- Die wenig aussa…1595 tokens truncated…ungsfunnel neu aufgebaut.
- EmpfÃ¤nger und Empfehlungsgeber werden aus den bestehenden Empfehlungsdaten persÃ¶nlich angesprochen.
- Finanzcheck mit Potenzial-Landkarte, Ergebnisvorschau und sieben Fragen visuell in den Funnel eingebettet.
- Echte Google-Rezension sowie der Ã¶ffentlich einsehbare Bewertungsstand ergÃ¤nzt.
- Anrufprozess transparent dargestellt: Kai meldet sich persÃ¶nlich, alternativ lassen sich Zeitfenster oder Kalendertermin wÃ¤hlen.
- Diskrete Austragung bleibt mit dem Empfehlungs-Token verknÃ¼pft.
- Bestehendes Ã–ffnungs-Tracking, Multi-Tenant-Branding, Anrufwunsch und Beraterlinks bleiben erhalten.
- Mobile Fassung gekÃ¼rzt und auf Ergebnis, Vertrauen und nÃ¤chste Handlung fokussiert.
- Cache: app.js v41, sw.js v93.

---

## v1.117 Beta - Phase 90 Â· Live-TÃœV-Korrekturen
**2026-07-21**

- Live-TÃœV: Ein neuer Anrufwunsch um 12:44 Uhr erschien im Hub als 10:44 Uhr und "vor 2 Std".
- Ursache: PostgreSQL-Felder vom Typ `timestamp without time zone` kamen ohne Zeitzonenangabe an und wurden vom Browser fÃ¤lschlich als deutsche Ortszeit gelesen.
- Neue zentrale Funktion `parseDbDate`: Zeitwerte ohne Zone werden als UTC behandelt, echte Werte mit `Z` oder Offset bleiben unverÃ¤ndert.
- Die Datumsfunktion wird direkt geladen und bleibt dadurch auch beim Ãœbergang vom alten App-Cache zur neuen Version kompatibel.
- Korrigiert in Hub, AktivitÃ¤tsverlauf, Hot Leads, Team-Momentum, Dashboard-Datumsformatierung, Promoter-Feed und PrÃ¤mienansichten.
- Der Teilen-Endpunkt liest seine Parameter jetzt mit der modernen URL-API statt Ã¼ber die veraltete Node-Auswertung.
- Themenvorschauen laufen ohne Test-Token und erzeugen dadurch keine kÃ¼nstlichen Ã–ffnungen oder Benachrichtigungen mehr.
- Veraltete Demo-VerknÃ¼pfungen wurden aus den Einstellungen entfernt.
- Der Funnel zÃ¤hlt gewonnene Kunden immer auch in den vorgelagerten Stufen. Historische Statusdaten erzeugen dadurch keine Quoten Ã¼ber 100 Prozent mehr.
- Google Tag Manager, Google Analytics und Microsoft Clarity wurden aus allen Portal-Seiten entfernt. Empfehlungs-Token gelangen damit nicht mehr Ã¼ber vollstÃ¤ndige Seitenadressen an diese Analyse-Dienste.
- Regressionstest fÃ¼r den Teilen-Endpunkt ergÃ¤nzt.
- Keine Datenbankmigration und keine Ã„nderung bestehender Zeitwerte.
- Cache: hub.js v45, empfehler.js v37, beleg.js v2, praemien-admin.js v5, sw.js v92.

---

## v1.116 Beta â€” Phase 89 Â· Kontext-Infos zur Empfehlung nachreichen
**2026-07-14**

- Auf dem Promoter-Link (`empfehler.html`) lÃ¤sst sich jede versendete Empfehlung im Feed **aufklappen** (â€žInfos fÃ¼r Kai ergÃ¤nzen"): Beruf/Position, Verbindung, â€žWas sollte Kai wissen?", beste Erreichbarkeit, bevorzugter Kanal, â€žschon Bescheid gegeben", persÃ¶nliche Nachricht. So kann der Empfehlungsgeber auch **nach dem Senden** noch wertvollen Kontext nachreichen. Bereits ergÃ¤nzte Empfehlungen sind mit â€žInfos bearbeiten âœ“" markiert.
- Der Berater sieht diese Infos wie gewohnt in der Detailansicht â€” die jetzt zusÃ¤tzlich das **Thema** (Baufi, FÃ¶rderungen, Kinder â€¦) der Empfehlung anzeigt.
- Nur eigene Empfehlungen editierbar, nur diese Kontextfelder (Status/Name/Telefon unberÃ¼hrt).
- DB: RPC `update_empfehlung_kontext` + `get_empfehler_empfehlungen` um Kontextfelder erweitert (`schema-phase25.sql`). Cache: empfehler v34/v36, sw v91, config v1.116.

Hinweis: Die Themen-Auswahl pro Kontakt (Allgemein, Baufinanzierung, FÃ¶rderungen, SelbstÃ¤ndige, Investment, Absicherung, Karriere, Kinder) gibt es im Eingabe-Tool bereits. â€žFinanzcheck" als eigenes Thema kann bei Bedarf Ã¼ber die Themen-Verwaltung ergÃ¤nzt werden.

---

## v1.115 Beta â€” Phase 88 Â· Ziel & Eingabe auf den Promoter-Link verlagert
**2026-07-14**

Die â€žBelohnung anklicken â†’ Empfehlungen eintragen"-Mechanik wandert von der (fÃ¼r alle gleichen) PrÃ¤sentation auf den **individuellen Promoter-Link** `empfehler.html?code=â€¦` â€” der einzige kunden-eindeutige Ort. So bleiben Empfehlungen, Ziel und Fortschritt pro Kunde dauerhaft nachvollziehbar.

- **Promoter-Link (`empfehler.html`):**
  - **Ziel wÃ¤hlen:** Tippt der Kunde auf eine Belohnung (z. B. Weber-Grill), wird sie als sein Ziel gespeichert; das Eingabefeld Ã¶ffnet sich direkt mit der passenden Zeilenzahl.
  - **Ziel-Banner mit Fortschritt (beides):** â€žX abgegeben Â· Y Kunde geworden Â· noch Z bis zur Belohnung". Die Belohnung wird weiterhin erst bei Status â€žKunde" ausgelÃ¶st (Auszahlung unverÃ¤ndert).
  - **Empfehlungen inline eintragen:** Mehrzeilen-Tool (Name/Telefon/Thema â†’ Link per WhatsApp), fest an den Promoter gebunden; Feed & Fortschritt aktualisieren live.
- **Berater-Ansicht (`dashboard/promoter.html`):** neue Karte â€žZiel & woran wir arbeiten" â€” zeigt Ziel + Fortschritt, Ziel per Dropdown Ã¤nderbar; â€žworan arbeiten wir" Ã¼ber das Notiz-Feld.
- **PrÃ¤sentation (`programm.html`):** Empfehlungs-Eingabe entfernt; die Belohnungs-Karten sagen jetzt â€žJetzt starten â†’" (fÃ¼hrt zum Anmelden). Nach der Anmeldung wird der Kunde direkt auf seinen individuellen Link geleitet.
- DB: `empfehler.ziel_stufe` + RPC `set_empfehler_ziel` (`schema-phase24.sql`). Cache: empfehler v33/v35, programm.js v35, promoter-detail v2, sw v90, config v1.115.

---

## v1.114 Beta â€” Phase 87 Â· Karriere-Karte aufgewertet
**2026-07-14**

- Vorderseite der Karriere-Flip-Karte (â€žEmpfehlen gehÃ¶rt zum Alltag") stÃ¤rker gestaltet:
  - Headline: â€žEmpfiehl eine neue **berufliche** Perspektive."
  - Neue **Live-Status-Pille** â€ž5 Positionen Â· jetzt gesucht" mit sanft pulsierendem Punkt (Dringlichkeit, motion-safe).
  - Neuer Dreiklang â€žFÃ¼nf Wege. Ein Team. Dein Einstieg." (die 5 Einstiegswege) mit dezentem Trenner.
- Balanciert jetzt sauber mit der Gold-Karte daneben; Flip + Mobile geprÃ¼ft. Cache: programm.css v54.

---

## v1.113 Beta â€” Phase 86 Â· Karriere-Einkommenszeile raus
**2026-07-14**

- Satz â€žVom ersten Tag verdienen. Im dritten Jahr sechsstellig." von der Vorderseite der Karriere-Flip-Karte entfernt.

---

## v1.112 Beta â€” Phase 86 Â· Vorteile-Orbit + Teamwork im Einstieg
**2026-07-14**

- **Teamwork-Kernbotschaft** (â€žDu hast nicht nur einen Berater, sondern einen Partner fÃ¼r alles, was mit Geld zu tun hat") als kompakte, ruhige Text-Folie in den **Einstieg** gezogen (direkt nach â€žWas wir gemeinsam bewegt haben").
- **Neue Folie â€žVorteile unserer Zusammenarbeit"** (an der bisherigen Team-Position): ein **Orbit** im warmen, hellen PrÃ¤sentations-Look â€” Zentralkreis â€žEin Partner Â· Klarheit. Sicherheit. VermÃ¶gen." mit 8 umliegenden Vorteils-Kreisen (Ein Ansprechpartner, Strategie statt Produkte, Kurze Wege, Ein Leben lang begleitet, Mehr aus deinem Geld, So wie es dir passt, VertrÃ¤ge im Blick, Alles aus einer Hand) und dÃ¼nnen Verbindungslinien. Gibt dem Empfehler die Argumente an die Hand.
- Mobil kollabiert das Orbit sauber zu einer Karten-Liste (Zentrum als Banner, Linien aus). Statisch, motion-safe.
- PrÃ¤sentation jetzt 18 Folien. Cache: programm.css v53, config.js v1.112 Beta.

---

## v1.111 Beta â€” Phase 85 Â· Team-Folie aufgerÃ¤umt
**2026-07-14**

- Folie â€žWir als Team" (Du hast nicht nur einen Beraterâ€¦) sah unaufgerÃ¤umt aus: Die Textspalte erbte das zentrierte `text-align` der Sektion, wodurch die 4 Vorteils-KÃ¤rtchen von ihren Icons wegschwammen und die Kanten ausfransten.
- Fix: Team-Textspalte linksbÃ¼ndig (gemeinsame Fluchtlinie von Icon + Text, wie bei allen anderen Split-Folien) und Bild vertikal mittig zur Textspalte (kein leerer WeiÃŸraum mehr unten links).
- Cache: programm.css v52, config.js v1.111 Beta.

---

## v1.110 Beta â€” Phase 84 Â· PrÃ¤sentation gestrafft
**2026-07-14**

- Folie â€žWer empfiehlt, bewegt drei Menschen" (Win-Win-Win) aus der EmpfehlungsprÃ¤sentation entfernt. Sie stand nach dem eigentlichen Ask (â€žAn wen denkst du gerade?") und wechselte dort zurÃ¼ck ins Abstrakte â€” das bremste die Dynamik. Inhaltlich war sie zudem eine Dopplung der frÃ¼hen Mehrwert-/Win-Recap-Folien.
- Ergebnis: **17 statt 18 Folien**; der FolienzÃ¤hler stellt sich automatisch um.

---

## v1.109 Beta â€” Phase 83 Â· Globales Rechtsklick-MenÃ¼
**2026-07-14**

- **Rechtsklick funktioniert jetzt Ã¼berall** im Berater-Bereich mit sinnvollen Aktionen â€” statt des rohen Browser-MenÃ¼s. Zentral eingehÃ¤ngt, erscheint auf allen 13 Berater-Seiten, **nie** auf den Kundenseiten.
- **Kontext-sensibel:** markierter Text â†’ â€žâ€¦ kopieren"; auf einem Link â†’ â€žÃ–ffnen / In neuem Tab / Link kopieren"; Telefon-Link â†’ â€žAnrufen / Nummer kopieren"; E-Mail-Link â†’ â€žE-Mail schreiben / Adresse kopieren".
- **Immer dabei:** â€žNeue Empfehlung", â€žSuche Ã¶ffnen (âŒ˜K)", SprÃ¼nge zu Dashboard/Empfehlungen/Champions/PrÃ¤mien\*/Einstellungen, â€žSeite aktualisieren". (\*PrÃ¤mien nur fÃ¼r Admins.)
- Die bestehenden reichhaltigen MenÃ¼s auf Empfehlungs-/Champion-/PrÃ¤mien-Zeilen (Status, Bearbeiten, LÃ¶schen) bleiben unangetastet â€” das globale MenÃ¼ weicht ihnen automatisch aus. In Eingabefeldern bleibt das native MenÃ¼ (EinfÃ¼gen/Rechtschreibung).
- Neu: `js/context-menu.js` (aus nav.js gemountet), 5 neue Icons. Cache: config.js v1.109 Beta, nav.js v48, sw.js v89.

---

## v1.108 Beta â€” Phase 82 Â· Team-Feed kompakter
**2026-07-14**

- Team-Momentum-Feed zeigt jetzt **die 3 neuesten AktivitÃ¤ten**; der Rest ist eingeklappt und lÃ¤sst sich per **â€ž+ N weitere anzeigen"** aufklappen (und wieder â€žWeniger anzeigen"). Der Aufgeklappt-Zustand bleibt Ã¼ber die 60-Sekunden-Neuladung erhalten.
- Cache: config.js v1.108 Beta, hub.js v44, sw.js v88.

---

## v1.107 Beta â€” Phase 82 Â· Team-Momentum
**2026-07-14**

- Neue **Team-Momentum**-Sektion auf dem Hub (Startseite), fÃ¼r jeden eingeloggten Berater:
  - **Online-Anzeige:** pro Teammitglied Avatar + Punkt (grÃ¼n = gerade aktiv, sonst â€žaktiv vor â€¦").
  - **Team-Feed:** â€žSven hat einen neuen Promoter gewonnen", â€žKai hat eine Empfehlung erhalten", â€žâ€¦ hat einen Kunden gewonnen" â€” mit Icon, Zeit, â€žNEU"-Badge. Live-Aktualisierung alle 60 Sekunden.
- **Nur Berater-Ebene** â€” Name, Ereignis, Zeit. **Keine** Kundennamen/-nummern. Umgesetzt Ã¼ber datensparsame Server-Funktionen (`team_activity`, `team_presence`) + `berater.last_seen`-Heartbeat (`schema-phase23.sql`).
- Neu: `touchPresence`/`getTeamActivity`/`getTeamPresence` in supabase.js.
- Cache: config.js v1.107 Beta, hub.js v43, sw.js v87.

---

## v1.106 Beta â€” Phase 81 Â· Empfehlung einem Promoter zuordnen
**2026-07-14**

- Beim **manuellen Anlegen einer Empfehlung** (`dashboard/neu.html`) gibt es statt des freien Promoter-Namensfelds jetzt eine **Auswahl deiner Promoter**. Ordnest du die Empfehlung einem Promoter zu, **zÃ¤hlt sie zu seiner Liste und seinen PrÃ¤mien** (echte VerknÃ¼pfung Ã¼ber `empfehler_id`, nicht nur ein Namens-Text). â€žâ€” kein Promoter â€”" lÃ¤sst sie unzugeordnet.
- Cache: config.js v1.106 Beta, sw.js v86.

---

## v1.105 Beta â€” Phase 80 Â· ZuverlÃ¤ssiges Berater-Login
**2026-07-14**

Die Magic-Link-Einladung war unzuverlÃ¤ssig (Link-Vorschau verbraucht den Einmal-Link) und unsicher (wer ihn Ã¶ffnet, wird in das Konto eingeloggt). Sie ist raus.

- **â€žPasswort setzen" ist jetzt der einzige, zuverlÃ¤ssige Weg** fÃ¼r Berater-Logins â€” in der Berater-Verwaltung pro Karte:
  - Berater hat schon ein Konto â†’ **Passwort neu setzen**.
  - Berater hat noch **kein** Konto â†’ **â€žLogin anlegen"** erstellt das Konto direkt mit Passwort (sofort anmeldbar).
  - Danach: Passwort anzeigen, kopieren, per WhatsApp/E-Mail mit Benutzer (E-Mail) + Login-Link senden.
- **Magic-Link-Knopf entfernt.** Neue Server-Funktion `berater-create-login` (offizielle Admin-API, streng admin-abgesichert) legt Konten an.
- Neu: `createBeraterLogin` in supabase.js.
- Cache: config.js v1.105 Beta, berater-admin.js v7, sw.js v85.

---

## v1.104 Beta â€” Phase 79 Â· MenÃ¼-Label
**2026-07-14**

- MenÃ¼punkt links heiÃŸt jetzt **â€žChampions (Promoter)"** â€” klarer, was gemeint ist.
- Cache: config.js v1.104 Beta, nav.js v47, sw.js v84.

---

## v1.103 Beta â€” Phase 78 Â· Themen-Status + Promoter-Profil + Detailseite
**2026-07-14**

- **Themen-Seiten â€žIn Arbeit":** In der Themen-Verwaltung kannst du jede Themen-Seite als â€žðŸš§ In Arbeit" markieren (Umschalter pro Karte, Badge im Titel). Alle sind aktuell so markiert. Die Markierung ist **nur fÃ¼r dich** â€” Kunden sehen die Seiten unverÃ¤ndert.
- **Promoter mit mehr Daten:** Beim Anlegen eines Promoters kannst du jetzt zusÃ¤tzlich **E-Mail, Adresse, Motive/Interessen und eine interne Notiz** erfassen (vorher nur Name + Telefon).
- **Promoter-Detailseite (neu):** Klick in der Champions-Liste auf einen Promoter Ã¶ffnet **seine Detailseite** â€” bearbeitbares Profil (inkl. Adresse/Motive/Notiz), Kennzahlen, und **seine Empfehlungsliste mit den gesendeten Links** (inkl. â€žLink geÃ¶ffnet âœ“"). Jede Empfehlung fÃ¼hrt per Klick zur vollen Detailansicht. Buttons: Promoter-Ansicht Ã¶ffnen, neue Empfehlung aussprechen.
- **Sicher:** Berater dÃ¼rfen nur ihre **eigenen** Promoter bearbeiten (neue RLS-Update-Policy, `schema-phase22.sql`). Rollback-only verifiziert (eigener Berater darf, fremder nicht). EmpfÃ¤nger-Telefonnummern werden in der Promoter-Liste bewusst nicht angezeigt (Datenschutz).
- Neu: `getEmpfehler`/`updateEmpfehler`/`getEmpfehlerIdByCode` in supabase.js, `dashboard/promoter.html` + `js/promoter-detail.js`.
- Cache: config.js v1.103 Beta, vorlagen-cms.js v6, sw.js v83.

---

## v1.102 Beta â€” Phase 77 Â· Programm verwalten + MenÃ¼-Struktur
**2026-07-14**

Die MenÃ¼fÃ¼hrung war irrefÃ¼hrend: â€žProgramm" Ã¶ffnete direkt die KundenprÃ¤sentation. Jetzt sauber getrennt.

- **MenÃ¼ neu geordnet:**
  - **â€žProgramm"** ist jetzt dein Verwaltungs-Bereich (nur Admin) â€” nicht mehr die Kundenseite.
  - **â€žPrÃ¤sentation"** Ã¶ffnet die KundenprÃ¤sentation (Vollbild-Slides).
  - **â€žChampions"** (deine Promoter) ist ein eigener MenÃ¼punkt und fÃ¼r alle Berater erreichbar.
  - Themen-Seiten sind unter â€žProgramm" eingegliedert.
- **Neue Seite â€žProgramm verwalten"** (`programm-verwalten.html`, admin-only): Oben Schnell-KnÃ¶pfe (KundenprÃ¤sentation starten, Themen-Seiten, Champions). Darunter zwei echte In-App-Editoren:
  - **Belohnungen / Stufen:** Titel, Wert, Beschreibung, Bild, Icon, Sortierung, Premium-Flag, Kategorien (Geld/Sache/Spende) â€” bearbeiten, hinzufÃ¼gen, lÃ¶schen.
  - **Erfolgsgeschichten:** Titel, Vorher/Nachher, Kennzahl, Thema, aktiv/inaktiv â€” bearbeiten, hinzufÃ¼gen, lÃ¶schen. (Vorher nur Ã¼ber den externen Supabase-Editor pflegbar.)
- **Sicher:** Die Editoren schreiben direkt, aber die Datenbank erlaubt Schreiben ausschlieÃŸlich dem Admin (RLS). Rollback-only verifiziert (Admin darf, Nicht-Admin blockiert). Doku: `schema-phase21.sql`.
- Neu: Schreib-Funktionen in supabase.js, `js/programm-admin.js`.
- Cache: config.js v1.102 Beta, nav.js v46, sw.js v82.

---

## v1.101 Beta â€” Phase 76 Â· Passwort-Verwaltung
**2026-07-13**

PasswÃ¶rter lassen sich jetzt einfach verwalten â€” ohne die fehleranfÃ¤lligen Magic-Links.

- **Jeder Berater Ã¤ndert sein Passwort selbst** (Einstellungen â†’ â€žPasswort Ã¤ndern"): neues Passwort 2Ã— eingeben, speichern. LÃ¤uft Ã¼ber Supabases offizielles Auth (`updateUser`).
- **Admin setzt Passwort fÃ¼r jeden Berater** (Berater-Verwaltung â†’ Karte aufklappen â†’ â€žPasswort setzen"): Feld ist mit einem starken Vorschlag vorbefÃ¼llt (ðŸŽ² wÃ¼rfelt neu), du kannst es Ã¼bernehmen oder Ã¼berschreiben â†’ â€žSetzen". Danach wird das Passwort angezeigt zum Kopieren und per WhatsApp/E-Mail direkt an den Berater senden. Der Berater kann es anschlieÃŸend selbst Ã¤ndern.
- **Sicher gebaut:** Das Admin-Setzen lÃ¤uft Ã¼ber eine Datenbank-Funktion, die serverseitig hart prÃ¼ft, dass der Aufrufer Admin ist (`admin_set_berater_password`, `schema-phase20.sql`, Bcrypt via pgcrypto). Kein Service-SchlÃ¼ssel im Browser. Rollback-only verifiziert (ok/forbidden/too_short). Berater ohne Login: Feld ist gesperrt mit Hinweis â€žerst Einladen".
- Neu: `updateMyPassword` + `adminSetBeraterPassword` in supabase.js, `generatePassword()` in berater-admin.js.
- Cache: config.js v1.101 Beta, berater-admin.js v6, sw.js v81.

---

## v1.100 Beta â€” Phase 75 Â· Ruhigere linke MenÃ¼fÃ¼hrung
**2026-07-13**

- **Sidebar entruhigt:** UntermenÃ¼s (Empfehlungen, Programm, Themen-Seiten) klappten bisher schon beim bloÃŸen DrÃ¼berfahren mit der Maus hart auf und wieder zu â€” das flackerte und schob die anderen MenÃ¼punkte ruckartig weg. Jetzt: UntermenÃ¼s klappen **nur noch per Klick auf einen kleinen Pfeil** weich auf/zu (sanfte Animation), der aktuelle Bereich ist automatisch offen, und geÃ¶ffnete Bereiche werden gemerkt (auch nach Neuladen). Der MenÃ¼punkt selbst navigiert wie gewohnt. Der seitliche 2px-Ruck beim Hover ist weg â€” nur noch eine zarte TÃ¶nung.
- Technisch: `.nav-subs` von `display`-Umschaltung auf animierte Grid-Rows umgestellt, Hover-Trigger entfernt, Chevron-Toggle mit localStorage-Zustand (`js/nav.js` + `css/dashboard.css`).
- Cache: config.js v1.100 Beta, nav.js v45, dashboard.css v43, sw.js v80.

---

## v1.99 Beta â€” Phase 74 Â· Promoter verwalten (anlegen + lÃ¶schen)
**2026-07-13**

- **Promoter-Liste** (`dashboard/empfehler.html`) bekommt Verwaltung:
  - **+ Neuer Promoter**: Knopf oben rechts (und im Rechtsklick-MenÃ¼) Ã¶ffnet ein kleines Fenster (Name + Telefon) und legt den Promoter direkt an.
  - **Rechtsklick auf einen Promoter**: Ansicht Ã¶ffnen Â· Neuer Promoter Â· **LÃ¶schen**.
  - **LÃ¶schen nur bei leeren Promotern:** Hat ein Promoter schon Empfehlungen ausgesprochen, wird er zum Schutz **nicht** gelÃ¶scht (klare Meldung â€žhat N Empfehlungen"). Nur Karteileichen/Test-Promoter ohne Empfehlungen sind lÃ¶schbar. PrÃ¤mien/Benachrichtigungen eines leeren Promoters werden automatisch mit entfernt.
- Neu: DB-Funktion `delete_empfehler` (SECURITY DEFINER, pro Berater gescoped, prÃ¼ft Empfehlungs-Anzahl; `schema-phase19.sql`), `deleteEmpfehler` in supabase.js. Anlegen nutzt den bestehenden `create_empfehler`. Rechtsklick-MenÃ¼/Modal/Toast aus dem bestehenden Dashboard-Baukasten (kein neues CSS).
- Cache: config.js v1.99 Beta, sw.js v79.

---

## v1.98 Beta â€” Phase 73 Â· Multi-Tenant-Fix: Finanzcheck-CTA
**2026-07-13**

- **Fix (Sandro-Feedback #7b):** Der â€žDetail-Analyse starten"-Knopf im FÃ¶rder-Rechner (`programm.html`) zeigte fÃ¼r **jeden** Berater fest auf Kais `finanzcheck.kaiblobel.de`. Jetzt: Bei Kai bleibt es der Finanzcheck, bei anderen Beratern fÃ¼hrt der Knopf zum eigenen Buchungslink (fehlt der, wird er ausgeblendet). Neuer Hook `data-bb="finanzcheck"` in `berater-brand.js`, Unterscheidung Ã¼ber `ENV_BERATER_ID` (kein hartcodierter Slug).
- Restliches Sandro-Feedback gegen aktuellen Stand geprÃ¼ft: #7a/#8/#9/#10 (Branding) und #1/#2/#5 (Mobile NPS + Roadmap) waren bereits behoben (Phase 52/56), am Handy verifiziert.
- Cache: config.js v1.98 Beta, sw.js v78.

---

## v1.97 Beta â€” Phase 72 Â· Fix: Empfehlung lÃ¶schen
**2026-07-13**

- **Bugfix:** LÃ¶schen einer Empfehlung (Rechtsklick > LÃ¶schen, Phase 70) zeigte â€žgelÃ¶scht", aber die Empfehlung war beim Neuladen wieder da. Grund: Die Datenbank hatte fÃ¼r Empfehlungen keine LÃ¶sch-Berechtigung hinterlegt (RLS-Policy fehlte), also wurde das LÃ¶schen still ignoriert. Jetzt darf ein eingeloggter Berater seine eigenen Empfehlungen lÃ¶schen. Reine Datenbank-Ã„nderung, wirkt sofort. Doku: `schema-phase18.sql`.
- Cache: config.js v1.97 Beta, sw.js v77.

---

## v1.96 Beta â€” Phase 71 Â· Empfehlungs-BroschÃ¼re digital
**2026-07-13**

> âš ï¸ **Beta:** Die Potenzialliste + Promoter-Nachverfolgung sind neu und werden im echten KundengesprÃ¤ch noch erprobt. Kennzeichnung nur im Berater-Bereich (Versionspille/Changelog), die Kundenseite bleibt neutral.

Die gedruckte Empfehlungs-BroschÃ¼re wird digital: Inspiration, direkte Erfassung und Nachvollziehbarkeit â€” alles im moderierten GesprÃ¤chstool `programm.html` und im Promoter-Dashboard.

- **Inspiration-Block** (`programm.html`, neuer Abschnitt vor der Themen-Auswahl): 11 echte Kunden-Aussagen als Zitat-Karten (â€žWie spreche ich meine Kontakte an?") â€” Ã¼ber 500 â‚¬/Jahr frei, 3 Jahre eher schuldenfrei, Nebenverdienst 500â€“1000 â‚¬ u. a. Zeigt dem Kunden, worÃ¼ber er empfehlen kann. Erscheint automatisch auch im PrÃ¤sentationsmodus.
- **Potenzialliste** (`programm.html`, neuer Abschnitt nach den Belohnungen): Der Kunde wÃ¤hlt eine Anzahl (3/5/10/eigene Zahl), es Ã¶ffnen sich genau so viele Zeilen (Name + Telefon + Thema). Pro Zeile erstellt er mit einem Klick seinen persÃ¶nlichen Empfehlungslink und verschickt ihn direkt per WhatsApp (oder kopiert ihn). Die Empfehlung landet wie gewohnt am Promoter im Portal. Die Belohnungs-Karten haben jetzt einen Knopf â€žDiese N Empfehlungen jetzt eintragen", der die Anzahl vorbelegt und hinscrollt.
  - **Registrierung direkt im Block:** Ist der Kunde noch kein Promoter, gibt er Name (+ optional Telefon) direkt in der Potenzialliste ein und legt sofort los, ohne zum Anmelde-Formular hochzuscrollen.
  - **Nichts geht verloren:** Getippte Kontakte werden lokal zwischengespeichert. LÃ¤dt die Seite neu (Handy, versehentlicher ZurÃ¼ck-Wisch), sind die Namen noch da, erstellte Links bleiben als â€žerledigt" markiert. Ein â€žListe leeren" rÃ¤umt bewusst auf.
- **Nachvollziehbarkeit** (Promoter-Dashboard `empfehler.html?code=â€¦`): Der Feed zeigt pro Empfehlung jetzt zusÃ¤tzlich, ob der Link **schon geÃ¶ffnet** wurde (mit Datum) und bietet â€žLink kopieren". Der Berater sieht dasselbe, weil er im Dashboard auf den Promoter klickt. Datenbank-Funktion `get_empfehler_empfehlungen` additiv um `link_geoeffnet`/`link_geoeffnet_at`/`link_token` erweitert (Telefon bleibt bewusst drauÃŸen â€” Datenschutz). Dok: `schema-phase17.sql`.
- Cache: config.js v1.96 Beta, programm.css v51, programm.js v34, empfehler.css v32, empfehler.js v34, sw.js v76.

---

## v1.95 â€” Phase 70 Â· Rechtsklick-KontextmenÃ¼ wird vollwertig
**2026-07-13**

Das Rechtsklick-MenÃ¼ kann jetzt mehr als nur Status setzen â€” direkt aus der rechten Maustaste bearbeiten, lÃ¶schen und neu anlegen.

- **Empfehlungen** (`/dashboard/empfehlungen.html`): Das SchnellmenÃ¼ bekommt drei neue EintrÃ¤ge:
  - **Bearbeitenâ€¦** Ã¶ffnet ein kleines Overlay direkt auf der Liste â€” Name, Telefon, Thema und Notiz Ã¤ndern, speichern, fertig, ohne die Seite zu verlassen.
  - **Neue Empfehlungâ€¦** springt zum Anlege-Formular.
  - **LÃ¶schenâ€¦** entfernt die Empfehlung nach RÃ¼ckfrage.
  Die bestehenden Status-EintrÃ¤ge bleiben unverÃ¤ndert.
- **PrÃ¤mien** (`/praemien.html`, Admin): PrÃ¤mien bekommen erstmals ein Rechtsklick-MenÃ¼, das die vorhandenen Aktionen bÃ¼ndelt (Auszahlen, Variante/Notiz bearbeiten, auf â€žoffen"/â€žverzichtet" setzen, Beleg Ã¶ffnen) und neu: **LÃ¶schen** nach RÃ¼ckfrage. Die EintrÃ¤ge passen sich dem Status an (offen vs. ausgezahlt/verzichtet).
- Neu: `updateEmpfehlung()` (Stammdaten-Update) in `js/dashboard.js`, `deletePraemie()` in `js/supabase.js`.
- Cache: config.js v1.95, dashboard.css v42, praemien-admin.js v4, sw.js v73.

---

## v1.94 â€” Phase 69 Â· Fix: Changelog-Link aus Dashboard-Unterseiten
**2026-06-29**

- **Bugfix:** Klick auf die Versionsnummer in der Seitenleiste fÃ¼hrte auf Dashboard-Unterseiten (z. B. `/dashboard/empfehlungen.html`) zu einem **404** â€” der Link `changelog.html` war relativ und landete bei `/dashboard/changelog.html`. Jetzt absolut (`/changelog.html`), funktioniert von Ã¼berall.
- Cache: nav.js v44, sw.js v72.

## v1.93 â€” Phase 69 Â· WhatsApp-Follow-up bei Hot Leads
**2026-06-29**

- Im **Hub** bekommt jede Hot-Lead-Zeile rechts einen grÃ¼nen **WhatsApp-Button**. Ein Klick Ã¶ffnet WhatsApp mit einer vorausgefÃ¼llten, freundlichen Follow-up-Nachricht (Name eingesetzt), ohne dass man erst in die Empfehlung gehen muss. Der Klick auf die Zeile Ã¶ffnet weiterhin die Detailseite; der WhatsApp-Klick ist sauber davon getrennt.
- Cache: hub.js v42, hub.css v43, sw.js v71.

## v1.92 â€” Phase 68 Â· Rechtsklick-SchnellmenÃ¼ + dynamische PrÃ¤mien
**2026-06-24**

- **Rechtsklick auf eine Empfehlung** Ã¶ffnet ein SchnellmenÃ¼: Status direkt setzen (Als Kunde gewonnen, Anrufwunsch, Kontaktiert, Kein Interesse, zurÃ¼ck auf offen) oder als **Interessent** markieren â€” ohne erst die Empfehlung zu Ã¶ffnen. Der aktuelle Status ist im MenÃ¼ mit einem Haken markiert, der Name steht im Kopf, eine kurze BestÃ¤tigung (Toast) blendet ein. SchlieÃŸt bei Klick auÃŸerhalb, Escape oder Scrollen.
- **PrÃ¤mien-Karten dynamischer:** Statt nur â€žStufe 1" steht jetzt **â€žVerdient durch [Kundenname] Â· N. gewonnener Kunde"** â€” die PrÃ¤mie ist sichtbar mit dem konkreten Kunden verknÃ¼pft. Der **Betrag erscheint groÃŸ in Gold** (sobald fÃ¼r die Stufe ein Wert hinterlegt ist). Auch die Auszahl-Ãœberschrift zeigt Betrag + Kunde statt nur die Stufe.
- **PrÃ¤mien-Badge premiumer:** sanfter Gold-Verlauf, dezenter Puls, feinerer Schatten.
- Neu: `setInteressiert()` + `getKundenJeEmpfehler()` (ordnet Stufe N dem N. gewonnenen Kunden zu), `.ctx-menu`/`.toast`-Styling.

Cache: dashboard.css v41, praemien-admin.js v3, sw.js v70.

---

## v1.91 â€” Phase 67 Â· PrÃ¤mien-Badge (offene PrÃ¤mien ploppen auf)
**2026-06-24**

- Am MenÃ¼punkt **â€žPrÃ¤mien"** erscheint jetzt ein **ZÃ¤hler-Badge** (Terracotta) mit der Anzahl offener PrÃ¤mien. Sobald eine Empfehlung auf â€žKunde" gesetzt wird, legt der Trigger die PrÃ¤mie an und das Badge ploppt auf allen Seiten auf, ohne dass man extra reinschauen muss. Eingeklappte Sidebar: kleiner Punkt am Icon. Zahl aktualisiert sich beim Seitenaufruf; verschwindet, sobald alle PrÃ¤mien ausgezahlt/erledigt sind.
- Neu: `getOffenePraemienCount()` (RLS-scoped), Badge-Injektion in `js/nav.js` (nur Admin), `.nav-badge`-Styling.

Cache: nav.js v43, dashboard.css v40, sw.js v69.

---

## v1.90 â€” Phase 66 Â· Kompletter QA-Durchlauf + Fixes
**2026-06-24**

Alle Seiten und der gesamte Empfehlungs-Flow mit Dummy-Daten durchgetestet (Konsolen-Fehler, Render, VerknÃ¼pfungen). Ergebnis: lÃ¤uft. Zwei echte Fehler gefunden und behoben:

- **Versionsnummer-Pille** (`.nav-version`) wurde auf allen Dashboard-Unterseiten als unformatierter blauer Link angezeigt: die Regel lag in `hub.css`, das diese Seiten nicht laden. Regel nach `dashboard.css` verschoben (wird Ã¼berall mit der Nav geladen), aus `hub.css` entfernt.
- **Totes Stockbild:** der Hintergrund der â€žHandwerker"-Alltagskachel (Unsplash) lieferte 404. Durch ein geprÃ¼ft funktionierendes Bild ersetzt.
- Cache-Buster Ã¼ber alle Seiten normalisiert (dashboard.css v39, hub.css v42, programm.css v49) â€” vorher uneinheitlich.
- Getestet end-to-end: Promoter anlegen â†’ Empfehlung (an Promoter gebunden) â†’ Promoter-Dashboard (Link/Feed/Fortschritt) â†’ EmpfÃ¤nger-Link â†’ Detail/Status â€žKunde" â†’ PrÃ¤mie-Trigger â†’ Auszahlen/Beleg. Alles grÃ¼n. (Harmloses Rest-404: Supabase-Root-Link-Prefetch auf der Settings-Seite, kein Funktionsfehler.)

Cache: dashboard.css v39, hub.css v42, programm.css v49, sw.js v68.

---

## v1.89 â€” Phase 65 Â· Paket 4 (Teil D) Â· Auszahl-Workflow + Beleg/Quittung
**2026-06-24**

Der PrÃ¤mien-Auszahlung wird â€žrund" gemacht: in einem Schritt auszahlen, dokumentieren, Beleg erzeugen.

- **DB (schema-phase16.sql):** `praemien` um `betrag`, `auszahlungsart`, `empfaenger_adresse`, `beleg_nr` erweitert; RPC `auszahlen_praemie(...)` (setzt Status + Details, vergibt laufende Beleg-Nr `EMP-<Jahr>-<NNNN>` pro Berater).
- **Auszahl-Dialog (praemien.html / praemien-admin.js):** â€žAuszahlenâ€¦" Ã¶ffnet ein Modal (Betrag vorbefÃ¼llt, Auszahlungsart, Variante, optionale Anschrift, Datum, Notiz). BestÃ¤tigen â†’ Auszahlung + Beleg-Nr â†’ Beleg Ã¶ffnet im neuen Tab. Ausgezahlte PrÃ¤mien zeigen die Beleg-Nr + â€žBeleg Ã¶ffnen".
- **Beleg-Seite (beleg.html + js/beleg.js):** druckbares, premium-schlichtes Dokument, adaptiv nach Auszahlungsart (Geld = Quittung, Sache = EmpfangsbestÃ¤tigung, Spende = Spendenbeleg): Aussteller/EmpfÃ¤nger (mit Anschrift), Anlass, PrÃ¤mie/Variante, Betrag, zwei Unterschriftsfelder, Signatur-Footer. `@media print` (A4, Buttons weg); Dateiname fÃ¼r â€žals PDF speichern" nach Konvention vorbelegt (`YYYY-MM-DD Name Empfehlungspraemie Beleg EMP-â€¦`).
- End-to-end getestet (zwei Auszahlungen â†’ Beleg-Nr fortlaufend EMP-2026-0001/0002, Beleg rendert + Druckansicht), Dummy entfernt.

Cache: praemien-admin.js v2, beleg.js v1, sw.js v67.

**Offen (Teil B):** neue Stufen-Leiter erst nach Werte-Freigabe Kai/Sandro.

---

## v1.88 â€” Phase 64 Â· Paket 4 (Teil A + C)
**2026-06-24**

- **Erkenntnis:** Die Belohnungs-Logik ist bereits conversion-basiert (Stufe = Anzahl Empfehlungen mit Status â€žKunde", nicht abgegebene Empfehlungen). Sandros struktureller Kernpunkt war damit schon erfÃ¼llt, kein Umbau nÃ¶tig.
- **Wirtschaftlichkeits-Analyse (Teil A):** durchgerechnet (intern, liegt in OneDrive, nicht im Repo). Ergebnis: im realistischen Bereich (Stufe 1â€“10) bewegt sich die Belohnungsquote um die 30 %, kein Totalschaden. Mallorca (15) ist bewusster Marketing-Leuchtturm.
- **PrÃ¤mien-Tracking (Teil C):** neue Tabelle `praemien` (Migration schema-phase15.sql) + RLS + `sync_praemien` + Trigger auf `empfehlungen` (Status â†’ â€žKunde" legt verdiente PrÃ¤mien automatisch als â€žoffen" an). Neue Admin-Seite `praemien.html` + `js/praemien-admin.js` (admin-only, Nav-Punkt â€žPrÃ¤mien"): zeigt verdiente Stufen-PrÃ¤mien je Empfehler, â€žals ausgezahlt" markieren, Variante/Notiz festhalten. End-to-end mit Dummy-Daten getestet.

Cache: nav.js v42, sw.js v66.

**Offen (Teil B):** neue Stufen-Leiter (3. Empfehlung knallt, strecken, mydays/Auto) erst nach Freigabe der Werte durch Kai + Sandro.

---

## v1.87 â€” Karriere-Karte: Desktop-HÃ¶he gefixt
**2026-06-24**

- Auf dem Desktop lief der Vorderseiten-Text der drehbaren Karriere-Karte (â€žEmpfiehl eine neue Perspektive") 12 px Ã¼ber die feste HÃ¶he â†’ â€žWas dahintersteckt â†’" wurde unten abgeschnitten. Hero-Karten-HÃ¶he auf dem Desktop 220 â†’ 244 px (Hero-Card + Flip-Inner). Mobil unverÃ¤ndert (150/200 ab max-width 900). Overflow jetzt 0.

Cache: programm.css v48, sw.js v65.

---

## v1.86 â€” Win-Win-Paar: Emojis raus, Premium-Icons rein
**2026-06-24**

- Die per-Zeile-Emojis im Win-Win-Paar wirkten billig â†’ entfernt. Stattdessen **saubere Line-Icons (SVG) vor** jeder Zeile: Datei-Check, Telefon, Schild-Haken (Bekannter, Marine) bzw. Geschenk, Trend-Pfeil, Haken-Kreis (Du, Gold).
- Karten-Inhalt links ausgerichtet (Feature-Listen-Look), wirkt hochwertiger.
- Der eine freundliche ðŸŽ hinter dem Anker-Satz bleibt (war so gewollt, lockert auf).

Cache: programm.css v47, sw.js v64.

---

## v1.85 â€” Rolle â€žRegionaldirektion" + Empfehlungsbonus-Bild
**2026-06-24**

- **Rolle:** â€žRegionaldirektionsleiter" â†’ **â€žRegionaldirektion"** Ã¼berall (DB-Feld `berater.rolle` fÃ¼r Kai + Fallback-Texte in programm.html, empfehler.html, empfaenger.html, config.js). Footer/Branding ziehen den Wert aus der DB.
- **Empfehlungsbonus-Bild:** zurÃ¼ck auf den **Taschenrechner** (`kundenlos.jpg`) statt der EinkaufstÃ¼ten (`standard.jpg`). Betrifft alle Bonus-Kacheln in der Galerie.

Cache: programm.js v32, sw.js v63.

---

## v1.84 â€” Win-Win-Paar: Emojis pro Zeile
**2026-06-24**

- Jede Zeile im Win-Win-Paar bekommt ein passendes Emoji ans Ende (ðŸ” Finanz-Check, ðŸ¤ GesprÃ¤ch, ðŸ˜Š keine Verpflichtung, ðŸ™ DankeschÃ¶n, ðŸ“ˆ wird grÃ¶ÃŸer, ðŸ‘Œ freie Wahl), der Anker-Satz ein ðŸŽ. Bringt Leben rein, âœ“-HÃ¤kchen bleiben als Garantie-Signal.

Cache: programm.css v46, sw.js v62.

---

## v1.83 â€” Win-Win-Paar in der Benefits-Sektion
**2026-06-24**

Aus Variante-B-Mock Ã¼bernommen (nur das Win-Win-Element, Rest verworfen):

- Oben in der Benefits-Sektion zwei Karten nebeneinander: **â€žDein Bekannter bekommt"** (Finanz-Check unverbindlich, persÃ¶nlicher Anruf statt Callcenter, null Verpflichtung) und **â€žDu bekommst"** (DankeschÃ¶n ab der 1. Empfehlung, wird grÃ¶ÃŸer, freie Wahl). Marine- bzw. Champagne-Akzent.
- Darunter eine **Anker-Pille**: â€žDeine erste Belohnung ist nur eine Empfehlung entfernt." Senkt die EinstiegshÃ¼rde.
- Mobile-first: gestapelt auf dem Handy, ab 680 px nebeneinander.
- Mock-Datei `benefits-mock.html` bleibt zum Nachschauen liegen (noindex).

Cache: programm.css v45, sw.js v61.

---

## v1.82 â€” Themen-Kacheln mobile-first kompakt
**2026-06-24**

Themen-Kacheln nach Kai-Feedback verschlankt (100 % mobile-first):

- **2 Kacheln pro Reihe auf dem iPhone** (Grid mobile-first 2-spaltig, ab 960 px 3-spaltig). Vorher 1 groÃŸe Kachel pro Reihe.
- Flip-HÃ¶he 220 â†’ 192 px (mobil), Desktop 206 px; Face-Padding, Icon (60 â†’ 40 px, ab 640 px 52 px), Titel, Headline, RÃ¼ckseiten-Texte und Vorteile durchgehend kompakter â†’ deutlich weniger Leerraum.
- RÃ¼ckseiten-Text auf 2 Zeilen geklemmt, passt ohne Ãœberlauf in die kleinere Kachel. Farbige Themen-Akzente (Phase 64) bleiben erhalten.
- Ergebnis: statt 1â€“2 sind jetzt ~6 Kacheln gleichzeitig auf dem iPhone sichtbar.

Cache: programm.css v44, sw.js v60.

---

## v1.81 â€” Belohnungs-Galerie: gruppierte Bonus-Kacheln + Mobil-Optimierung
**2026-06-24**

Feinschliff nach Kai-Feedback zum Meilenstein-Pfad:

- **Bonus wieder als feste Kachel**, aber gruppiert je LÃ¼cke: â€ž1. Empfehlung", â€ž3.â€“4. Empfehlung Â· je 100 â‚¬", â€ž6.", â€ž8.â€“9.", â€ž11.â€“14." â€” statt 10Ã— einzeln oder als schlanker Verbinder. Bonus-Kacheln dezent cremefarben abgesetzt, damit die Premium-Belohnungen (Restaurant, Watch, Gold, iPad, Mallorca) herausstechen. Desktop behÃ¤lt das alternierende Bild-links/rechts-Layout.
- **iPhone-Optimierung:** Galerie-Karten auf dem Handy als kompaktes Flex-Layout (Bild 84 px links, Inhalt rechts). Karten von ~212 px auf ~144 px HÃ¶he â†’ es sind jetzt ~4 Karten statt 2 gleichzeitig sichtbar. Ursache war ein verstecktes `padding: 32/36 px` am `.reward-body` aus dem SF-Redesign, das mobil genullt wird.

Cache: programm.js v31, programm.css v43, sw.js v59.

---

## v1.80 â€” Belohnungs-Galerie als Meilenstein-Pfad
**2026-06-24**

Korrektur zu B6 (Kai): die lÃ¼ckenlose 1â€“15-Galerie wiederholte â€žEmpfehlungsbonus 100 â‚¬" 8â€“10Ã— und wirkte monoton. Jetzt als Meilenstein-Pfad:

- Nur die **Premium-Belohnungen** (Stufe 2, 5, 7, 10, 15) sind groÃŸe Karten-Stationen, einheitliches Layout (Bild links), kein alternierendes Spiegeln mehr.
- Dazwischen schlanke **Verbinder** mit Champagne-Pille, die die Bonus-Stufen zusammenfassen statt sie zu wiederholen: â€žStufe 3â€“4 Â· je 100 â‚¬ Empfehlungsbonus", â€žStufe 11â€“14 Â· je 100 â‚¬" usw. Die genannten Stufennummern lÃ¶sen Sandros â€žwo ist die 4" sauber.
- Abschluss-Verbinder â€žUnd danach Â· fÃ¼r jede weitere Empfehlung 100 â‚¬" (fortlaufend).
- Gefilterte Modi (Geldwert/Sache/Spende) zeigen weiterhin die passenden Karten.

Cache: programm.js v30, programm.css v42, sw.js v58.

---

## v1.79 â€” Phase 62 Â· Sandro-Review (Runde 3) Â· Paket 2 + 3
**2026-06-24**

Reihenfolge, Belohnungs-Galerie und drehbare Kacheln aus Sandros PDF:

- **B1:** Block â€žIch rufe selbst an / Was passiert nach deiner Empfehlung" (Trust-BrÃ¼cke) hinter â€žSo funktioniert es" + Themen verschoben. Erst Ablauf verstehen, dann Vertrauen, dann Belohnung.
- **B5:** Stufen-System-ErklÃ¤rtext deutlich verschlankt (war â€žsehr viel Text / plump"). Eine klare Zeile statt Absatz.
- **B6:** Galerie-Sprung â€ž3 â†’ 5 â€¦ wo ist die 4?" gelÃ¶st. Im Modus â€žAlle" laufen die Stufen jetzt lÃ¼ckenlos 1â€“15; die 100-â‚¬-Bonus-Zwischenstufen erscheinen kompakt und mit einheitlichem Bild, die Premium-Belohnungen stechen heraus.
- **B2:** Themen sind jetzt **drehbare Kacheln** (Tap/Klick/Tastatur). Vorderseite Thema + Headline, RÃ¼ckseite Kurzbeschreibung + drei Vorteile. Mobil-sicher per Klasse statt :hover.
- **B3:** Neues **7. Thema â€žFÃ¼r deine Kinder"** (DB-Vorlage `kinder`, Icon Heart). Generische Vorlage `allgemein` aus dem Grid gefiltert; Header â€žSechs Themen" â†’ â€žSieben Themen".
- **B4:** alltag-Karten umformuliert (kein â€žFinanz-Tipp" mehr): Gold = â€žEmpfiehl meine Beratung", Marine = **drehbare Karriere-Karte** â€žEmpfiehl eine neue Perspektive" mit drei Perspektive-Punkten auf der RÃ¼ckseite (berufliche Perspektive kommt jetzt klar rÃ¼ber).

Cache: programm.js v29, programm.css v41, sw.js v57.

**Noch offen (Paket 4 Â· Strategie):** Belohnungs-Logik auf â€žKunde geworden" statt â€žEmpfehlung abgegeben", Stufen-Balance (3. Empfehlung soll reinknallen, Belohnungen strecken), neue Belohnungsideen (mydays-Event, Auto bei 25), Wirtschaftlichkeit final gegenrechnen.

## v1.78 â€” Phase 61 Â· Sandro-Review (Runde 3) Â· Paket 1
**2026-06-24**

Erste, risikolose Runde aus Sandros PDF-Anmerkungen (Wording, ein Bug, Belohnungswerte):

- **A1 (Bug):** â€žDetail-Analyse" Ã¶ffnet `finanzcheck.kaiblobel.de?from=empfehlung`; der â€žZurÃ¼ck zur Website"-Button dort fÃ¼hrt jetzt zurÃ¼ck auf die Empfehlungsseite (per Referrer, mit sicherem Fallback) statt auf die Startseite. Betrifft auch `Kundenseite/finanz-check.html`.
- **A2:** Hohle Schlusszeile â€žGenau darum tut es hier wirklich was." entfernt.
- **A3:** Redundanz im Mehrwert-Intro aufgelÃ¶st (â€žErzÃ¤hl es mir kurz" raus, ein klarer Hinweis bleibt).
- **A4:** Platzhalter-VorschlÃ¤ge in Mehrwert-Feld 2 und 3 ergÃ¤nzt (vorher nur â€žâ€¦").
- **A5:** Markierten Satz vereinfacht (â€žWas dir geholfen hat, kann auch deinen Liebsten helfen."); Ãœberschrift â€žWieviel kann dein Tipp jedes Jahr sparen?" â†’ â€žWas bringt dein Tipp jedes Jahr?".
- **C (Belohnungen, DB):** Weber/Apple Watch auf **449 â‚¬** fixiert (Modellnummer â€žSeries 10" raus, damit es nicht veraltet); Goldbarren auf **500 â‚¬** hoch, â€ž5 g"/â€žGeiger Original" raus â†’ â€žGoldbarren im Wert von 500 â‚¬". Gesamt-Counter von unrealistischen **24.000 â‚¬** auf den echten Stufen-Gesamtwert **~4.800 â‚¬** korrigiert.

**Noch offen (Pakete 2â€“4):** Reihenfolge â€žSo funktioniert es" vor Belohnungen, drehbare Themen-Kacheln + 7. Thema â€žKids", Stufen-Darstellung (3â†’5-Sprung), Belohnungs-Logik auf â€žKunde geworden" + neue Stufen-Balance.

## v1.75 â€” Phase 59 Â· Sandro-Review (Runde 2)
**2026-06-23**

Aufbauend auf Sandros PR #1 (Fixes #1/#2/#5 fÃ¼r NPS + Roadmap, gemergt) die nÃ¤chsten Punkte:

- **#7a** Footer-Initialen â€žKB" â†’ `data-bb="initialen"` (aus `b.name` generiert, z.B. â€žSW" fÃ¼r Sandro).
- **#10** Video-Overlay-Rolle â€žInitiator" â†’ `data-bb="rolle"` (zeigt die Rolle des jeweiligen Beraters; fÃ¼r Kai nun â€žRegionaldirektionsleiter").
- **#11** Doppelte Formulierung â€žwas dahintersteckt" in der Video-Lede aufgelÃ¶st.
- **#12** FAQ â€žAn wen empfehlen?" â€” Verweis auf nicht vorhandene â€žoben genannte Kriterien" durch konkreten Text ersetzt.

Cache: sw.js v54. (berater-brand.js erweitert um `initialen`-Hook.)

**Noch offen (brauchen Entscheidung):** #6 Belohnungstexte/DB-Wording, #7b/#7c Finanzcheck-/Google-Bewertungs-Link pro Berater, #8/#9 Testimonials pro Berater (aktuell fÃ¼r Nicht-Kai ausgeblendet), #3/#4/#13 Feature-Ideen.

## v1.74 â€” Phase 58 Â· QA-Fixes (Standort + Promoter-Dashboard pro Berater)
**2026-06-23**

- **Falscher Standort:** PrÃ¤sentations-Footer zeigte â€žTeam Wachsbleiche Â· Hamburg" â†’ korrigiert zu **Cottbus**.
- **Promoter-Dashboard (empfehler.html) zeigte immer Kai:** Foto + Footer-Name/Rolle waren fest verdrahtet. Jetzt per `data-bb` + `applyBeraterBrand` (Berater Ã¼ber den Promoter-Code geladen) â†’ ein Promoter von Sven/Sandro sieht den richtigen Berater.
- Bekannt/offen: Settings-Seite zeigt Admin-/Infra-Links (GitHub/Vercel/Supabase/Bookings) fÃ¼r alle Berater â€” sollte admin-only werden (separater Schritt).

Cache: empfehler.js v33, sw.js v53.

## v1.73 â€” Phase 57 Â· Empfehlungsprogramm geteilt (admin-only) + Impressum/Datenschutz pro Berater
**2026-06-22**

Entscheidung revidiert: Das Empfehlungsprogramm (Belohnungsstufen, Themen-Seiten, Erfolgsgeschichten) ist jetzt **bei allen Beratern gleich** und **nur vom Admin (Kai)** editierbar â€” statt â€žpro Berater eigene Inhalte" (Phase 53).

- **DB (schema-phase14.sql):** geklonte Nicht-Admin-Inhalte gelÃ¶scht (Kais Set = geteiltes Set); Auto-Klon-Trigger entfernt; Content-Schreib-RLS von â€žpro Berater" â†’ **admin-only** (`is_current_berater_admin()`). Public read bleibt.
- **Frontend:** Funnel lÃ¤dt Inhalte wieder **global** (programm.js, app.js, empfehler.js). Themen-CMS (`vorlagen.html`) ist admin-only (Guard + nav-Punkt versteckt fÃ¼r Nicht-Admins).
- **Impressum/Datenschutz pro Berater:** neue Felder `berater.impressum_url` + `datenschutz_url`, Admin-Formular (anlegen + bearbeiten) erweitert, Footer (programm.html) zieht sie per `data-bb`. `get_berater_public(_by_id)` liefern die neuen Felder. Kais DVAG-URLs voreingetragen.

**Wichtig:** Bei jedem Berater Impressum- + Datenschutz-URL eintragen â€” sonst werden die Footer-Links fÃ¼r ihn ausgeblendet.

Cache: app.js v40, programm.js v25, empfehler.js v32, vorlagen-cms.js v5, berater-admin.js v5, nav.js v41, sw.js v52.

## v1.72 â€” Phase 56 Â· Social-Preview-Karte pro Berater
**2026-06-22**

Beim Teilen eines Empfehlungslinks zeigte die WhatsApp-Vorschau immer Kais Foto/Namen (statische OG-Meta-Tags, kein JS fÃ¼r den Crawler). Jetzt pro Berater korrekt.

- **Neu: Vercel-Serverless-Funktion `api/share.js`** â€” liefert die EmpfÃ¤nger-Seite mit pro-Berater OG-Tags aus: `og:image` = Foto des Beraters, `og:description` = â€žEine kurze Nachricht von <Name>". SchlÃ¤gt Berater per `get_empfehlung_public`/`get_berater_public_by_id` Ã¼ber den Token nach. Fallback (kein Token/Fehler) = statischer Default.
- **vercel.json:** Rewrite `/e` â†’ `/api/share` (Query bleibt erhalten).
- **app.js:** geteilter Link jetzt `/e?token=â€¦&vorlage=â€¦` (statt `/empfaenger.html?â€¦`). Alte Links bleiben gÃ¼ltig. `empfaenger.html` selbst unverÃ¤ndert.
- Vorschaubild = Berater-Portrait (skaliert automatisch fÃ¼r jeden neuen Berater, kein Extra-Asset nÃ¶tig).

Cache: app.js v39, sw.js v51.

## v1.71 â€” Phase 55 Â· Berater-Verwaltung nur fÃ¼r Admin (Kai)
**2026-06-22**

Die Berater-Verwaltung ist jetzt eine reine Admin-Funktion. Freigeschaltete Berater brauchen diese Rechte nicht und sehen sie nicht mehr.

- **DB (schema-phase13.sql):** neues Flag `berater.ist_admin` (Kai = true). Helper `is_current_berater_admin()`. Schreib-Policies auf `berater` (insert/update/delete) von â€žjeder Authenticated" â†’ **nur Admin** (`is_current_berater_admin()`). Public read bleibt (Branding).
- **MenÃ¼ (nav.js):** Punkt â€žBerater" ist `adminOnly` â€” standardmÃ¤ÃŸig versteckt, wird nur fÃ¼r Admins eingeblendet.
- **Seite (berater-admin.js):** Admin-Guard â€” Nicht-Admins werden auch bei direktem URL-Aufruf von `berater.html` zum Hub umgeleitet.
- **dashboard.js:** `getCurrentBerater` lÃ¤dt `ist_admin` mit.

Cache: nav.js v40, berater-admin.js v4, sw.js v50.

## v1.70 â€” Phase 54 Â· Promoter kann Empfehlung absenden (fremdes GerÃ¤t)
**2026-06-22**

Zwei Bugs behoben, die auftraten, wenn ein Berater (z. B. Sven) einen Promoter (z. B. Sandro) anlegt und dieser auf seinem eigenen GerÃ¤t eine Empfehlung aussprechen will.

- **URL-Parameter-Mismatch:** Die CTAs erzeugen `empfehlen.html?code=â€¦`, aber app.js las `?empfehler=`. Auf fremdem GerÃ¤t (kein localStorage) wurde der Promoter-Code nie erkannt â†’ Berater fiel auf Kai zurÃ¼ck (Texte/Branding falsch). app.js liest jetzt `?code=` ODER `?empfehler=`.
- **Insert 401 â€žSpeichern fehlgeschlagen":** `createEmpfehlung` machte `.insert().select()` (return=representation); ohne anon-SELECT-Policy auf `empfehlungen` lehnte PostgREST das mit 401 ab (nur eingeloggt klappte es). Neuer SECURITY-DEFINER-RPC `create_empfehlung_public` (schema-phase12.sql) fÃ¼gt ein und gibt `link_token` zurÃ¼ck â€” anon-fÃ¤hig, Trigger feuern weiterhin.

Cache: app.js v38, sw.js v49.

## v1.69 â€” Phase 53 Â· Inhalte pro Berater (Multi-Tenant Content)
**2026-06-22**

Jeder Berater pflegt jetzt EIGENE Inhalte (Vorlagen, Belohnungsstufen, Erfolgsgeschichten) statt geteilter globaler Inhalte.

**Datenbank (schema-phase11.sql):**
- `vorlagen.slug` jetzt nur noch pro Berater eindeutig (Unique `(berater_id, slug)` statt global) â€” zwei Berater kÃ¶nnen dieselben Standard-Slugs haben
- `belohnungs_stufen` PrimÃ¤rschlÃ¼ssel auf `(berater_id, stufe)` umgestellt
- FK `erfolgsgeschichten.vorlage_slug â†’ vorlagen.slug` entfernt (Zuordnung jetzt per `berater_id`+`vorlage_slug` in der Query)
- RLS pro Berater: public read offen, INSERT/UPDATE/DELETE nur fÃ¼r eigene (`berater_id = current_berater_id()`)
- `clone_default_content(uuid)` + Trigger `clone_content_on_berater_insert`: neuer Berater bekommt automatisch das Startset von Kai geklont
- Sven mit Startset befÃ¼llt

**Frontend:**
- `getVorlagen/getVorlage/getErfolgsgeschichten/getBelohnungsStufen/updateVorlage` akzeptieren `berater_id`
- Funnel (programm.js, app.js empfehlen+empfaenger, empfehler.js Promoter-Dashboard) lÃ¤dt nur Inhalte des jeweiligen Beraters; Fallback = ENV-Berater (Kai) als Default-Tenant
- Vorlagen-CMS zeigt/editiert nur die eigenen Vorlagen des eingeloggten Beraters

**Offen (Folge-Phase):** eigene Dashboard-Editoren fÃ¼r Belohnungen + Erfolgsgeschichten (bis dahin via Supabase-UI).

## v1.60 â€” Phase 50m Â· FÃ¶rder-Rechner als Live-Tool im Pitch
**2026-06-17**

Neue interaktive Folie zwischen Win-Recap und Teamwork:

- 4 Eingabe-Felder: Alter (Slider), Familienstand (Buttons), Kinder (Buttons), Brutto-Einkommen (Slider)
- Live-Berechnung im Browser ohne Server-Roundtrip
- BerÃ¼cksichtigte FÃ¶rderungen: Riester (Grund- + Kinderzulagen), Partner-Riester, VL, AN-Sparzulage, WohnungsbauprÃ¤mie, BAV-Steuer-/SV-Vorteil, Kinder-Steueroptimierung
- Animierter Counter-Up beim Ã„ndern eines Werts
- Breakdown-Liste mit AufschlÃ¼sselung pro FÃ¶rderart
- CTA â€žDetail-Analyse starten" â†’ Ã¶ffnet finanzcheck.kaiblobel.de in neuem Tab
- Sage-grÃ¼ner Akzent fÃ¼r â€žso viel ist mÃ¶glich"-AtmosphÃ¤re

Use-Case: Kai sitzt mit Empfehler am Tisch. Empfehler nennt einen Tipp. Kai stellt 4 Slider/Buttons ein, zeigt sofort: â€žSchau, dein Tipp kÃ¶nnte 1.500 â‚¬/Jahr rausholen." â†’ Empfehler ist motivierter, die Empfehlung auszusprechen.

## v1.59 â€” Phase 50l Â· Win-Recap 1-Zeilen-Layout + Slop-Sweep
**2026-06-17**

**Layout-Fix:**
- Win-Recap-Punkte (Ãœbersicht / Entscheidungen / Geld / LÃ¼cken) brachen vorher auf 2 Zeilen
- `.recap-list` max-width auf 640px, Schrift kleiner (clamp 17/22), `white-space: nowrap` â†’ alle 4 Punkte stehen sauber auf je einer Zeile

**Slop-Sweep Ã¼ber die ganze programm.html:**
- 5Ã— Em-Dashes (`&mdash;`) raus â†’ Punkt / Komma / Doppelpunkt
- â€žwirklich" als Adverb-VerstÃ¤rker entfernt wo Ã¼berflÃ¼ssig
- â€žselbstverstÃ¤ndlich", â€žstÃ¤ndig", â€žvollstÃ¤ndig" â†’ menschlichere Formulierungen
- NPS-Karten gestrafft (â€žDas freut mich" statt â€žDas freut mich wirklich")
- Teamwork-Lede direkter (â€žDas ist der Unterschiedâ€¦" statt â€žGenau das istâ€¦")
- Alltag-Closer ehrlicher (â€žOhne lang zu Ã¼berlegen" statt â€žGanz selbstverstÃ¤ndlich")
- FAQ-Antwort direkter (â€žkostet dich nichts" statt â€žist und bleibt vollstÃ¤ndig kostenlos")

## v1.58 â€” Phase 50k Â· Mehrwert-Folie + PrÃ¤sentations-Konsolidierung
**2026-06-17**

**Neue editierbare Mehrwert-Folie** zwischen NPS-Reflexion und Win-Recap:
- â€žWelchen Mehrwert hast du durch mich?" â€” Kunde antwortet, Kai schreibt live mit
- 4 nummerierte Felder (contenteditable), Champagne-Highlight beim Editieren
- Persistenz in localStorage (Ã¼berlebt Reload + Page-Wechsel)
- â€žAlles lÃ¶schen"-Button fÃ¼r neuen Termin
- Danach: Win-Recap mit neuem Eyebrow â€žUnd aus meiner Sicht" â†’ Kai zeigt seine 4 Punkte als ErgÃ¤nzung

**PrÃ¤sentations-Konsolidierung:**
- `praesentation.html` gelÃ¶scht â€” einzige Quelle ist jetzt `programm.html`
- Sidebar-â€žPrÃ¤sentation"-Link fÃ¼hrt zu `programm.html?mode=slides` â†’ Ã¶ffnet sofort Slide-Modus
- Footer-Link gleich
- URL-Parameter `?mode=slides` triggert Auto-Activation des PrÃ¤sentations-Modus

## v1.57 â€” Phase 50j Â· PrÃ¤sentations-Modus auf programm.html
**2026-06-17**

Eine Page, zwei Views: scroll fÃ¼r Kunden (Mobile + Desktop) und ein Slide-Modus fÃ¼r Live-Pitches im Termin.

- **Floating-Button** unten rechts (nur ab 1024px sichtbar), Label â€žPrÃ¤sentations-Modus"
- **Klick** aktiviert Vollbild-Slide-Pitch: jede Section = ein Slide, scroll-snap mandatory, eine Sektion pro Frame
- **Bottom-Nav** mittig: ZurÃ¼ck/Weiter + Counter (â€ž3 / 14") + Beenden
- **Tastatur**: â† â†‘ PageUp = vorige | â†’ â†“ PageDown Leertaste = nÃ¤chste | Home = erste | End = letzte | ESC = beenden
- **Counter** wird live via IntersectionObserver synchronisiert
- Sticky-CTA + Footer ausgeblendet im Slide-Modus
- Kunde auf Mobile sieht nichts vom Modus â†’ bleibt scroll

## v1.56 â€” Phase 50i Â· NPS-Skala 1â€“10 in der Reflexions-Sektion
**2026-06-17**

Statt nur â€žscroll weiter oder ruf an" jetzt eine echte interaktive Skala in der Pre-Hero:

- 10 klickbare Buttons (1â€“10), Mobile als 5Ã—2-Grid
- Drei Reaktions-Karten je nach Antwort:
  - **1â€“6 (Detractor, Terracotta-Akzent)** â†’ â€žDanke fÃ¼r deine Ehrlichkeit." + Anruf + WhatsApp
  - **7â€“8 (Passive, Champagne-Akzent)** â†’ â€žVerstanden. Da ist noch Luft." + Feedback + Weiterlesen
  - **9â€“10 (Promoter, Sage-Akzent)** â†’ â€žDas freut mich wirklich." + Pulsierender CTA â€žZeig mir das Programm â†’"
- Smooth-Scroll zur Reaktions-Karte beim Klick
- Antwort wird in sessionStorage gespeichert (Ã¼berlebt Page-Wechsel)
- GTM-Event `nps_answer` mit `nps_score` und `nps_band` (fÃ¼r spÃ¤teres Analytics)

## v1.55 â€” Phase 50h Â· Story-Sektionen vor dem Haupt-Hero
**2026-06-17**

Inhalte aus der alten praesentation.html in programm.html Ã¼berfÃ¼hrt. Drei neue Sektionen zwischen Pre-Hero und Haupt-Hero:

- **Win-Recap** â€žWas wir gemeinsam schon bewegt haben" â€” 4 Punkte aus Editorial-Slides (Ãœbersicht / Entscheidungen / Geld / LÃ¼cken)
- **Teamwork + Allfinanz-Vorteile** mit Teamwork-Foto (Hand-in-Hand-Bild aus Kundenseite) â€” Split-Layout mit Sticky-Image: Ein Ansprechpartner Â· Kurze Wege Â· So wie es dir passt (Kaffee/Zuhause/Telefon) Â· Alles aus einer Hand (Girokonto bis Baufi)
- **Empfehlen ist Alltag** â€” 4 Quote-Karten (â€žGeh in das Restaurant" / â€žSchau diesen Film" / â€žFrag den Handwerker" / â€žKauf bei dem BÃ¤cker") + Schluss-BrÃ¼cke â€žUnd genau darum geht es hier"

CSS in programm.css mit Editorial-Touch (Fraunces-Hierarchie aus var(--font-display), Champagne-Akzente, Mobile-Stacking).

## v1.54 â€” Phase 50g Â· Pre-Hero-Reflexions-Sektion
**2026-06-17**

- programm.html bekommt einen ruhigen Pre-Hero VOR dem Conversion-Hero
- Eyebrow â€žEine kurze Frage vorweg" + H1 â€žWie zufrieden bist du wirklichâ€¦"
- Lede mit Reflexions-Impuls + Mikrokopie â€žWenn Ja â†’ scroll weiter, wenn nicht â†’ ruf mich an"
- Pulsierender â€žWeiter"-Pfeil scrollt zum Haupt-Hero (#hero-haupt)
- 92vh HÃ¶he = der Kunde sieht NUR die Frage im ersten Viewport
- Ãœbernimmt den emotionalen Anlauf der alten praesentation.html

## v1.53 â€” Phase 50f Â· Root = Berater-Portal
**2026-06-17**

- `/` (Root) leitet jetzt **immer** zu `/hub.html` â€” egal ob eingeloggt oder nicht
- Hub redirected sich selbst zur Login-Page, wenn keine Session vorhanden ist
- Customer-Funnel ist nur noch Ã¼ber expliziten Link `/programm.html` erreichbar
- Klare Trennung: `empfehlungsportal.vercel.app` = dein Berater-Portal, der explizite `/programm.html`-Link = Customer-Page zum Teilen

## v1.52 â€” Phase 50e Â· Smart-Root-Splitter
**2026-06-17**

- `/` (Root) erkennt jetzt selbst, wer kommt:
  - Eingeloggter Berater â†’ `/hub.html`
  - Anonymer Besucher (Kunde) â†’ `/programm.html`
- PrÃ¤sentations-Slides umgezogen von `/index.html` â†’ `/praesentation.html`
- vercel.json-Redirect entfernt (Splitter Ã¼bernimmt jetzt)
- nav.js + programm.html-Footer auf neue PrÃ¤sentations-URL umgestellt

## v1.51 â€” Phase 50d Â· Berater-Einladungs-Flow (vorgezogen)
**2026-06-16**

- DB-Trigger `link_auth_user_to_berater`: koppelt neue `auth.users` per E-Mail-Match automatisch an `berater.auth_user_id`
- Edge Function `invite-berater`: generiert Magic-Link via `auth.admin.generateLink({type:'invite'})`
- Berater-Admin: â€žEinladen â†’"-Button auf Karten ohne `auth_user_id`
- Invite-Modal mit Link zum Kopieren, vorausgefÃ¼lltem WhatsApp- und E-Mail-Versand
- `dashboard/welcome.html`: Passwort-Setup-Flow nach Klick auf Magic-Link
- RLS-Policies auf `berater`: INSERT/UPDATE/DELETE fÃ¼r `authenticated` (Kai als Admin)

## v1.50 â€” Phase 50a Â· Berater-Admin (Multi-Tenant Schicht 1)
**2026-06-16**

- `berater`-Tabelle erweitert: `slug`, `email`, `bookings_url`, `rolle`, `ist_aktiv`
- Neue Admin-Page `/berater.html`: Liste, Inline-Edit, Neuer-Berater-Modal, Aktiv-Toggle
- LÃ¶sch-Button fÃ¼r Empfehlungen in `/dashboard/detail.html` (Danger-Zone)
- Default-Route: `/` â†’ `/programm.html` (statt PrÃ¤sentations-Slides)
- Sichtbare Versionsnummer in Sidebar
- 10 Smoke-Tests durchgefÃ¼hrt, alle âœ…

## v1.49 â€” Phase 49 Â· Nachricht-Vorlagen pro Thema
**2026-06-16**

- 18 vorgefertigte Empfehlungs-Nachrichten in `empfehlen.html` (3 pro Thema)
- Themen-Picker nach oben verschoben (logischer Fluss)
- Vorlage anklicken â†’ Text wandert ins Textarea (editierbar)
- `{{vorname}}`-Platzhalter wird live aus Vorname-Input ersetzt

## v1.48 â€” Phase 48 Â· 1:1-Empfehlungs-Fluss + Icons
**2026-06-16**

- **Bug-Fix**: `programm.html` Erfolgs-Modal teilte irrtÃ¼mlich den Empfehler-Dashboard-Link statt zu `/empfehlen.html` weiterzuleiten
- `empfehler.html` Dashboard: â€žTeile diesen Link"-Block (1:viele) entfernt, neuer CTA â€žNeue Empfehlung aussprechen"
- Themen-Icons: Lucide-SVG-Map in `vorlagen-cms.js` + `app.js`. Compass/Home/Banknote etc. statt Text-Namen
- Slop-Sweep: Em-Dashes + Marketing-Floskeln raus
- Customer-Pages auf SF Pro System-Stack umgestellt

## v1.47 â€” Phase 47 Â· programm.html Conversion-Refactor
**2026-06-01**

- SF System-Font (Fraunces raus aus Customer-Bereich)
- Hero Split-Layout + Trust-BrÃ¼cke + 3-Schritte-Row + WhatsApp-Mockup
- 6 Themen-Cards (DB-driven) mit eigener Akzent-Farbe pro Slug
- Belohnungs-System mit Modus-Switch (Geld/Sache/Spende), `kategorien text[]` auf `belohnungs_stufen`
- Stufen-Roadmap 1-15 + Gesamt-Wert-Counter (24.000 â‚¬)
- 8 echte Google-Bewertungen als Doppel-Marquee (Mobile-Safari-sicher als statisches HTML)
- FAQ-Accordion + 4-Spalten-Footer + Erfolgs-Modal mit Share

## v1.46 â€” Phase 46 Â· Activity-Feed Premium-Evolution
**2026-05-31**

- Icon-Bubble 48px in Event-Color-Tint
- Neue Event-Types: `promotor_created`, `termin_booked`
- Momentum-Schwellen 80/60/40 + Warm Amber
- Top-Promotor-Card unten in Sidebar

## v1.45 â€” Phase 45 Â· Final Micro-Polish (Design-Freeze)
**2026-05-31**

- Event-Farben +20% Kontrast
- NEU-Badge Premium-Style
- Status-Hierarchie via Avatar-Tint-StÃ¤rke
- Hover-Haptik exakt 180ms

## v1.44 â€” Phase 44 Â· Subtile Akzent-Layer
**2026-05-31**

- Momentum-Card State-Color (4px Left-Border)
- Section-Eyebrow Mini-Strip

## v1.43 â€” Phase 43 Â· Premium Micro-UX Polish
**2026-05-31**

- Icon-Only-Sidebar
- Event-Farben satter
- NEU-Badge `created_at < 24h`

## v1.42 â€” Phase 42 Â· Sidebar Collapse-Toggle (Cmd+\\)
## v1.41 â€” Phase 41 Â· Activity-Feed Premium (Bubble + Eye-Indicator)
## v1.40 â€” Phase 40 Â· Activity-Feed 2.0 mit Lucide-Event-Icons + Read-State
## v1.39 â€” Phase 39 Â· Dashboard-Freeze + Design-System-Lock
## v1.38 â€” Phase 38 Â· Premium-SaaS-Polish Big-Bang
## v1.37 â€” Phase 37 Â· Responsive Sidebar System
## v1.32 â€” Phase 32 Â· KPI-Chips 2Ã—2 + Page-Shell breiter
## v1.31 â€” Phase 31 Â· Hub-2-Spalten-Layout
## v1.30 â€” Phase 30 Â· Activity-Stream-Cards
## v1.29 â€” Phase 29 Â· Trend-Chart (Chart.js) + Realtime-Stream

---

## Geplant

### v1.51 â€” Phase 50b Â· Strict-RLS auf Berater-Ebene
- Pro Tabelle einzeln aktivieren mit Test dazwischen
- `current_berater_id()`-Policy auf `empfehlungen`, `empfehler`, `vorlagen`, `belohnungs_stufen`
- Customer-Pages bekommen separate INSERT-Policies fÃ¼r `anon`

### v1.52 â€” Phase 50c Â· Berater-Personalisierung
- `?berater=slug` URL-Param auf `programm.html`, `empfaenger.html`
- Berater-Profil aus DB laden (Foto, Name, Telefon, Bookings-Link)
- Customer-Pages werden pro Berater dynamisch

### v1.53 â€” Phase 50d Â· Berater-Onboarding-Flow
- Magic-Link-Login fÃ¼r neue Berater
- Auth-User-ID automatisch beim ersten Login an `berater.auth_user_id` koppeln

