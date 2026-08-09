# Potenzialbuch Kontakt-Coach · Abnahme Phase 170

## Fachlicher Ablauf

1. Der Berater spricht oder tippt frei, was er über einen Kontakt weiß.
2. Die KI ordnet die Angaben. Der Berater prüft und ändert alle Felder.
3. Erst `Kontakt speichern` schreibt das Kontaktbild in den privaten Beraterdatensatz.
4. Für ein nicht verbundenes Potenzial erzeugt der Coach einen Gesprächskompass.
5. Nach dem Gespräch prüft der Berater Notiz, Status und Wiedervorlage erneut.

Mit dem Cockpit verbundene Personen werden weiterhin im Cockpit geführt. Das Potenzialbuch
führt keine eigene Kundenakte für Interessent, Kunde oder Altkunde.

## Datenschutz und Mandantentrennung

- Keine Speicherung von Audio oder Rohtranskript in Supabase.
- OpenAI-Aufrufe ausschließlich serverseitig mit `store: false`.
- Vor jedem KI-Aufruf wird der aktuelle Portal-Zugriffstoken bei Supabase Auth geprüft.
- `potenziale` behält aktiviertes und erzwungenes RLS. Nur `authenticated` erhält die vier
  benötigten Tabellenrechte. Die vorhandenen Berater-Policies bleiben unverändert.
- Kontaktbild und Gesprächsvorbereitung sind auf JSON-Objekte mit höchstens 32 KB begrenzt.

## Prüfnachweise vor Veröffentlichung

- `node --test tests/*.test.mjs tests/*.test.cjs`: 65 von 65 grün.
- Syntaxprüfung für Route, Seitenlogik und Coach-Helfer: grün.
- Desktop: Spracheingabe, Kontrollansicht, Gesprächskompass und Nachbereitung geprüft.
- Mobil 390 x 844: Dialog ohne seitliche Überbreite, keine Konsolenfehler.
- Die Vorschau verwendet ausschließlich erfundene Personen und schreibt keine Daten.

## Live-Abnahme

Nach der Veröffentlichung zu ergänzen: Migration, Vercel-Bereitschaft, Live-Version,
unangemeldete API-Sperre und eingeloggter Praxistest.
