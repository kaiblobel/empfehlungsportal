# Empfehlungsportal: Anbindung vor dem Eigentümer-Gate

Stand 15.09.2026. Ergänzt ADR-0063 und ANBINDEN.md für den tatsächlichen statischen Vercel-Stack.

## Entscheidung und Grenze

Katalogschlüssel bleibt `empfehlung`. Die Betriebszentrale, Zustandsarten, Session-Rechte,
HMAC-Zwecke, Soll/Ist und der unveränderliche Verlauf bleiben die Referenz aus Phase 1.
Der neue Adapter `vercel-portal` verwendet `/api/betrieb/steuerung` und `/api/betrieb/zugang`.
Es gibt keinen PHP-Nachbau und keine zusätzliche Anwendungsliste oder fachliche Datenbank.

Das Profil schaltet den Partnerbereich, einschließlich direkter Dashboard-Dateien auf allen
Aliasdomains. Login, Registrierung, Einstellungen, öffentliche Beraterprofile, Empfehlungslinks,
Promoter, KIDZ, Baufinanzierung und bestehende API-Funktionen bleiben frei. Wartung ist weiterhin
keine Sperre der direkten Supabase-Datenzugänge. Deren bestehende Rechte bleiben maßgeblich.

## Laufzeitentscheidung zur Freigabe

Vercel-Dateien und Prozessspeicher sind keine dauerhafte Zustandsablage. Vorbereitet ist daher
**ein einzelner dauerhafter Redis-Primärspeicher**, getrennt von Kunden- und Cockpit-Datenbanken.
Zustand, Notfall, Nonces und gehashte Zugänge liegen gemeinsam unter `kai:betrieb:empfehlung:v1`.
Ein Lua-Vergleich mit anschließendem Schreiben (CAS) übernimmt sie atomar. Kein Ablaufdatum
auf diesem Schlüssel, keine automatische Verdrängung, persistente Ablage und Sicherung nötig.
Nur Primärlesen, TLS mit Zertifikatsprüfung, kein Client-Cache, Zeitlimit 2,5 Sekunden.
Fehlt die Ablage nach Aktivierung oder ist sie beschädigt, bleibt der Partnerbereich mit 503 zu.
Die Kundenangebote benötigen diesen Speicher nicht.

Vercel Global/Edge Config wurde nicht gewählt: Allein bietet es keine atomare gemeinsame
Übernahme von Zustand, Nonce und Zugangswiderruf. Dafür zusätzlich einen zweiten Speicher zu
bauen, wäre unnötig. Upstash mit lediglich eventual consistency wird nicht als gleichwertige
Primärablage ausgegeben. Der vorbereitete Adapter verlangt einen klassischen Primär-Endpunkt.

Anbieter/Konto/Region, Persistenz, Sicherung, Kosten und Eigentümer sind **noch nicht eingerichtet**.
Ein möglicher Anbieter ist Redis Cloud Essentials (öffentlich ab 5 USD/Monat; TLS nur im
bezahlten Tarif). Region, endgültiger Preis und geeignete Persistenz müssen im Angebot bestätigt
werden. Dieser Bericht ist keine Bestellung. Vorschau und Produktion brauchen getrennte
Instanzen und Geheimnisse, keinesfalls nur denselben Schlüssel in derselben Instanz.

Die Speicherzusage ist ein Abnahmepunkt: Essentials bietet AOF im Sekundentakt, keine
verlustfreie Bestätigung jedes einzelnen Schreibens. Ein Wiederanlauf kann dadurch einen
zuletzt gesetzten Notfall oder Zugangswiderruf zurücknehmen. Die lokalen CAS-Tests beweisen
Atomarität im intakten Primärspeicher, keine Verlustfreiheit bei einem Anbieter-Ausfall.
Vor Produktion sind deshalb zugesicherte Wiederherstellungseigenschaften und ein getesteter
Wiederanlauf unter Notfallsperre nötig. Ein kostenloser Speicher ohne Persistenz scheidet aus.
Quelle: https://redis.io/docs/latest/operate/rc/databases/configuration/data-persistence/

Quellen: https://redis.io/pricing/ ; https://redis.io/docs/latest/operate/rc/security/database-security/tls-ssl/ ;
https://redis.io/docs/latest/develop/programmability/eval-intro/ ;
https://vercel.com/docs/routing-middleware/api ; https://upstash.com/docs/redis/features/consistency

## Tatsächliches Eigentümer-Gate

Vor jeder Einrichtung entscheidet Kai:

1. Ist der beschriebene Partnerbereich die gewünschte Reichweite? Öffentliche Kundenangebote
   werden damit auch bei Wartung ausdrücklich weiter ausgeliefert.
2. Welches eigene Konto stellt die getrennten Redis-Primärinstanzen mit TLS und dauerhafter
   Ablage bereit, und welcher Kostenrahmen ist erlaubt?
3. Vercel wurde aktuell als **Hobby** bestätigt. Die lokale Bauprobe erzeugt 12 vorhandene
   API-Funktionen plus `middleware.func` (Node 24), also 13 Funktionsartefakte. Eine Freigabe
   zur Veröffentlichung ist damit noch nicht sinnvoll. Zuerst die zulässige Funktionszahl
   beim Anbieter bestätigen oder eine gesondert geprüfte Bündelung/Tarifentscheidung treffen.
   Kein Tarif wurde geändert und keine bestehende Funktion zur Platzgewinnung verändert.

Die 13 Artefakte sind gemessen; eine Ablehnung dieses konkreten Pakets durch Vercel wurde
nicht provoziert. Die aktuelle allgemeine Grenzenseite benennt die historische Grenze von
12 Funktionen nicht eindeutig. Daraus folgt weder ein bewiesener Tarifzwang noch eine
bestätigte Freigabe. Eine geschützte Anbieterprobe beziehungsweise Kontobestätigung muss
das auflösen. Die Middleware läuft derzeit vor allen Pfaden, auch wenn öffentliche Pfade
sofort ohne Speicherzugriff weitergehen. Deren zusätzliche Aufrufe sind im Kostenmodell
der Vorschau mitzumessen.
Quelle: https://vercel.com/docs/functions/limitations

Das sind reale Infrastrukturentscheidungen, keine erneute Zustimmung zum bereits beauftragten Bau.

## Einrichtung nach dieser Entscheidung

1. Getrennte Vorschauinstanz, dann Produktionsinstanz im von Kai bestimmten Konto einrichten.
   Primär-Endpunkt, TLS, Persistenz/Backups und Verdrängungsschutz bestätigen. Ein eigener
   Laufzeitbenutzer erhält nur GET/SET/EVAL auf genau `kai:betrieb:empfehlung:v1`; Verbindungsbefehle
   des Redis-Clients passend erlauben. Der Eigentümerzugang bleibt außerhalb der Anwendung.
2. Den Anfangszustand einmalig mit SET NX aus dem Portalbaustein `leer()` setzen. Nie bei einem
   App-Start oder einer Veröffentlichung automatisch initialisieren. Bestehenden Zustand nie
   ersetzen. Vorher/Nachher nur Zustand/Version/Zugangszahl protokollieren, keine Token.
3. Über den bestehenden Secrets Manager, Projekt `betrieb`, je ein neues 256-Bit-Betriebsgeheimnis
   und den begrenzten Speicherzugang ablegen. Keine alten Geheimnisse überschreiben. Gleiche
   Fingerabdruckmethode wie die Phase-1-Einrichtung benutzen. Der FTP-Teil von
   `betriebsgeheimnis-einrichten.ps1` gilt ausdrücklich NICHT für Vercel und darf nicht für das
   Portal aufgerufen werden. Der neue Einrichtungszweig muss nach Kontoentscheidung ergänzt
   und gegen Attrappen geprüft werden, bevor echte Werte gesetzt werden.
4. Vorschauvariablen nur in Preview setzen:
   `BETRIEB_VORSCHAU_HOST` (exakter Vorschauhost), `BETRIEB_VORSCHAU_AKTIV=1`,
   `BETRIEB_VORSCHAU_GEHEIMNIS`, `BETRIEB_VORSCHAU_REDIS_URL`.
   Der Code ignoriert Produktionsvariablen auf Vorschauen ausdrücklich.
5. Geschützte Vercel-Vorschau mit realem Routing, Client-Neustart, zehn gleichzeitigen Befehlen,
   allen fünf Zuständen, Cookie-Ausgabe/Widerruf, laufendem Service Worker und Aliasen prüfen.
   Anmeldung/Registrierung nur synthetisch in der getrennten Testumgebung testen.
6. **S1 vor Produktion:** Bericht mit genauem Stand und Rückweg vorlegen. Erst nach Kais Ja
   Portal und KAI. veröffentlichen, keine neue Zustandsschaltung dabei. Produktion erhält
   ausschließlich `BETRIEB_GEHEIMNIS_EMPFEHLUNG`, `BETRIEB_REDIS_URL` und nach Einrichtungsprobe
   `BETRIEB_PORTAL_AKTIV=1`. KAI. erhält nur das Betriebsgeheimnis, keinen Redis-Zugang.
7. `portal_wartung.aktiv=false` unmittelbar vor Übergabe erneut lesen. Neuer Browsercode erkennt
   den zentralen Kopf und deaktiviert den alten Oberflächenschalter. Tabelle und Rechte bleiben
   bis S3 bestehen. Alte bereits geöffnete Tabs sind keine vollständig kontrollierbare Sperre;
   ihre Aktualisierung ist Teil der Abnahme. Die neuen Partnerseiten nutzen keine Offline-Kopie.
8. Signiertes Ist muss erreichbar, Version 0, ohne Notfall, ohne Zugang sein. 40er-Aufnahme
   vorher/nachher vergleichen; neue Interna dürfen ausschließlich die dokumentierte 403 haben.
   Der Zertifikatsfehler von `empfehlung.kaiblobel.de` braucht vor einer Alias-Gesamtabnahme eine
   eigene Korrekturfreigabe.
9. **S2:** Kai öffnet KAI. > Anwendungen > Betrieb > Empfehlungsportal. Oben müssen Seitenname
   UND Partnerbereich stehen. „Betriebszustand ändern“, **Online** wählen,
   „Empfehlungsportal auf ONLINE setzen“. Danach Soll/Ist Version 1 und Audit prüfen.
   Ein Wartungstest mit öffentlicher Wirkung braucht eine eigene ausdrückliche Freigabe.
10. **S3:** Erst nach Abnahme den alten Schalter samt DB-Rechten gesondert stilllegen. Dafür
    ist noch kein Löschauftrag erteilt. Projekt-Pass, ADR-Nachtrag und Kai-Gedächtnis erst mit
    dem tatsächlichen freigegebenen Zustand nachziehen.

## Notfall und Rückweg

Notfall 1 bleibt `wartung.ps1 -Ziel empfehlung -Quelle bws -An|-Aus|-Status`.
Es benutzt dieselben Signaturen und überprüft jetzt `/hub.html`, nicht die freie Startseite.
Die Wiederherstellung des normalen Zustands hebt einen aktiven Notfall niemals mit auf.

Notfall 2 gehört in die Eigentümerkonsole des gewählten Redis-Anbieters: das Feld `notfall`
im bestehenden Objekt atomar setzen oder aufheben, dabei den übrigen Zustand erhalten.
Ist die Ablage beschädigt oder ausgefallen, keine leere Online-Ablage herstellen. Erst den
gesicherten Zustand mit `notfall=true` wiederherstellen, Nonces/Zugänge sicher widerrufen,
dann eine signierte Statusabfrage und eine bewusste Aufhebung. Die konkrete Konsolenanleitung
wird anhand des gewählten Anbieters vor S1 mit Kai geprüft.

Ein Rückwechsel auf ein älteres Vercel-Paket entfernt die Durchsetzung. Deshalb ist er bei
aktiver Wartung kein harmloser technischer Rückweg: vorher Zustand und Notfall sichern,
öffentliche Wirkung freigeben. Der Redis-Schlüssel wird durch Veröffentlichungen nie verändert.

## Wächter

Nach S1, vor S2: in dessen bestehender `betrieb.txt` die Zeile
`empfehlung | https://empfehlungsportal.vercel.app/hub.html` ergänzen. Keine Zeile in `wartung.txt`.
`X-KAI-Betrieb-Fehler: laufzeit` ist ein tatsächlicher Ausfall, keine geplante Wartung.
Die produktive Wächterkonfiguration wurde nicht verändert; Neustart ist nicht freigegeben.
