# Changelog · Empfehlungsportal

Versionierung: `v1.{Phase}` — jede Phase im Build-Plan bekommt eine Minor.
Offizielle Live-Version: **v1.222 Beta** · KIDZ Ballschätzen und Nacherfassung, live seit 12.08.2026.

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
