# Empfehlungsportal an der Betriebszentrale

Stand 15.09.2026, nach der Abnahme der geschützten Vorschau. Ergänzt ADR-0063 und `ANBINDEN.md`.
Ersetzt die frühere Redis-Planung vollständig. Ausführliche Nachweise:
`tools/wartungsmodus/VERCEL-PORTAL.md`, Notfallwege: `tools/wartungsmodus/NOTFALL.md`.

## Reichweite

Katalogschlüssel `empfehlung`, Adapter `vercel-portal`, Zielpfade `/api/betrieb/steuerung` und
`/api/betrieb/zugang`. KAI. behält Zustandsarten, Session-Rechte, HMAC-Zwecke, Soll/Ist und Verlauf.

Geschaltet wird nur der Partnerbereich: Hub, Team, Beraterliste, Prämien, Vorlagen,
Programmverwaltung, Changelog und die betrieblichen Dashboard-Seiten, auf allen Aliasdomains.
Frei bleiben Anmeldung, Registrierung, Einstellungen, öffentliche Beraterprofile, Empfehlungslinks,
Promoter, KIDZ, Baufinanzierung und alle bestehenden API-Funktionen. Wartung sperrt keine
Supabase-Datenzugriffe; dort gelten weiter die bestehenden Rechte.

## Technik

- Routing-Middleware (Node) mit Filter: `assets/`, `css/`, `js/` und alle `/api/`-Funktionen außer
  `/api/betrieb/` laufen nicht durch sie. Im Laufzeitprotokoll belegt.
- Zustand in einem privaten Vercel-Blob-Store je Umgebung, ein Objekt `betrieb/empfehlung-v1.json`
  mit Soll, Notfall, Nonces und gehashten Zugängen. Lesen ohne Cache, Schreiben nur per ETag-Vergleich.
  Vorschau `store_nLN9zvDwFgZXpPhU`, Produktion `store_E3ZDggZ1HoE1zAEJ`, beide Frankfurt, beide mit
  leerem Anfangszustand angelegt. Keine automatische Initialisierung.
- Partnerseiten halten den Zustand höchstens 5 Sekunden je Instanz vor. Ein unbekanntes Zugangs-Cookie
  erzwingt höchstens eine frische Lesung je Sekunde.
- Speicher gestört: Der letzte bekannte Zustand gilt weiter, auch ein Notschalter. Ohne bekannten
  Zustand bleibt der Partnerbereich offen. Beides mit `X-KAI-Betrieb-Fehler: laufzeit` für den Wächter.
- Browser: `js/wartung.js` tritt zurück, sobald `/hub.html` den Kopf `X-KAI-Betrieb` trägt. Fehlt er,
  gilt wie bisher der alte Schalter `portal_wartung`. Der Service Worker liefert Partnerseiten nur aus
  dem Netz, offline mit einem Verbindungshinweis, und legt keine `no-store`-Antworten ab.

## Variablen

| Umgebung | Name | Zweck |
|---|---|---|
| Production | `BETRIEB_GEHEIMNIS_EMPFEHLUNG` | Betriebsgeheimnis, identisch in KAI. und im Secrets Manager (Projekt `betrieb`) |
| Production | `BLOB_READ_WRITE_TOKEN` | von Vercel für den Produktionsstore angelegt, nur in Vercel |
| Production | `BETRIEB_PORTAL_AKTIV=1` | schaltet die Durchsetzung ein. **Bis S1 nicht gesetzt** |
| Production | `BETRIEB_PORTAL_NOTFALL=1` | Notfallweg 2, nur im Ernstfall |
| Preview (Zweig) | `BETRIEB_VORSCHAU_AKTIV`, `_HOST`, `_GEHEIMNIS`, `_NOTFALL` | nur geschützte Vorschau |
| Preview | `BLOB_READ_WRITE_TOKEN` | Vorschaustore |

Vorschauen lesen nie Produktionsvariablen. Andere Umgebungen können die Produktion nicht aktivieren.

## Notfallwege

Notfall 1 (`wartung.ps1 -Ziel empfehlung -An -Quelle bws`) setzt den Notschalter im Speicher und lässt
bestehende interne Zugänge durch. Notfall 2 (`BETRIEB_PORTAL_NOTFALL=1` plus Neuveröffentlichung)
sperrt ohne Speicher und auch für interne Zugänge. Vollständiger Vergleich in `NOTFALL.md`.

## Ablauf S1 (nur nach Kais ausdrücklicher Freigabe)

1. Vorher lesen: `portal_wartung.aktiv` ist false, Produktionsstand, Produktionsstore Version 0,
   Aufnahme der öffentlichen Adressen.
2. Portal-Zweig in `main` zusammenführen und veröffentlichen, ohne `BETRIEB_PORTAL_AKTIV`.
   Erwartung: keine sichtbare Wirkung, kein `X-KAI-Betrieb`, Steuerung 404. Vergleich gegen Vorher.
3. KAI.-Zweig in `master` zusammenführen und veröffentlichen. Karte „Empfehlungsportal“ angebunden,
   nichts schalten.
4. `BETRIEB_PORTAL_AKTIV=1` in Production setzen, Portal neu veröffentlichen. Erwartung: Partnerseiten
   200 mit `X-KAI-Betrieb: online`, Kundenseiten ohne Kopf. In KAI. „Ist abfragen“: Version 0, kein
   Notfall, kein Zugang.
5. Wächter: Zeilen in `sites.txt` und `betrieb.txt`.
6. S2 durch Kai: erste Schaltung auf Online (Version 1), Soll/Ist und Verlauf prüfen.

Rückweg: `BETRIEB_PORTAL_AKTIV` entfernen und neu veröffentlichen, dann gilt wieder der alte Schalter.
Oder die vorherige Produktionsveröffentlichung zurückholen. Bei aktiver Wartung ist beides eine
öffentlich wirksame Änderung und braucht Kais Freigabe.
