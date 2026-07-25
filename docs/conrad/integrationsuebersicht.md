# Conrad — Integrationsübersicht der Prüfbefunde

> **Status:** reine Planung. Kein Anwendungscode geändert, keine Migration live, nichts veröffentlicht, keine Änderung an `main`.
> **Zweck:** Verhindern, dass der laufende **White-Label-Zweig** und der **Conrad-Prüfzweig** konkurrierende Migrationen erzeugen. Jeder Befund bekommt genau **einen** Ort.
> **Grundlage:** empirische Prüfung auf einer Supabase-Test-Kopie (synthetische Berater A/B + Leitung), Stand Live = `main` v1.139.

---

## 0) Was die Prüfung bestätigt hat (Fundament trägt)

- **Kern-Trennung hält strikt.** Berater A kommt an keine Zeile von Berater B — nicht lesen, nicht ändern, nicht löschen, auch nicht anonym oder über manipulierte Anfragen. Empirisch bewiesen (A/B je 3 Empfehlungen, 2 Promoter; wechselseitig 0 sichtbar; Schreibangriff A→B: 0 Zeilen).
- **Anonyme Empfänger-/Promoter-Funktionen** greifen strikt nur auf ihren Token/Code zu, sind rate-limitiert; `link_token` = zufälliger UUID (nicht erratbar).
- **Prämien** werden nie doppelt vergeben (`sync_praemien_for_empfehler` ist idempotent).
- **Geheimnisse** (`app_secrets`) sind vollständig gesperrt.

Die offenen Punkte betreffen **Mehr-Berater-/Multi-Org-Betrieb** und einzelne **Härtungen** — nicht die heutige Kern-Sicherheit.

---

## 1) Befund → Ort (die eine Zuordnung)

| # | Befund | Ort | Migration | Verantwortung |
|---|--------|-----|-----------|---------------|
| **5** | Fremd-Zuordnung / „keine Kai-Zuordnung" (Berater aus Promoter ableiten, mitgesendeten Berater prüfen) | **White-Label-Zweig, Phase 111** (existiert bereits) | `schema-phase111.sql` **im White-Label-Zweig** | White-Label — Conrad liefert nur **Präzisierung**, KEINE eigene phase111 |
| **4** | Kein serverseitiger Doppelklick-Schutz (echte Idempotenz per Vorgangs-Schlüssel) | **Eigener Härtungs-Baustein**, baut auf 111 auf | `schema-phase113.sql` | Conrad-Entwurf, nach 111 |
| **6** | Belegnummer nicht kollisionssicher (atomarer Zähler + Zeilensperre) | **Eigener Härtungs-Baustein** | `schema-phase114.sql` | Conrad-Entwurf |
| **7** | `kpi_trend`, `kpi_trend_daily`, **`team_activity`, `team_presence`** anonym aufrufbar | **Eigener kleiner Härtungs-Baustein** (sofort) | `schema-phase115.sql` | Conrad-Entwurf |
| **1** | Admin-Recht global (keine Org-Grenze; Leitung sieht alle Stammdaten, aber 0 fremde Empfehlungen) | **Multi-Org-Konzept** | — (nur Konzept) | Conrad-Konzept |
| **2** | Vorlagen / Prämienleiter / Erfolgsgeschichten = ein gemeinsames Set | **Multi-Org-Konzept** (Plattform-Standard + Org-Override) | — (nur Konzept) | Conrad-Konzept |
| **3** | Kennzahlen global (kein Org-Bezug) | **Multi-Org-Konzept** (Org-Scoping) — Sofort-Teil siehe Befund 7 | — (nur Konzept) | Conrad-Konzept |

**Migrations-Nummern:** White-Label besetzt **110, 111, 112**. Alle Conrad-Härtungen beginnen bei **113** aufwärts. Damit kollidiert keine Datei.

---

## 2) Der eine echte Konfliktpunkt: `create_empfehlung_public`

**Zwei Befunde fassen dieselbe Funktion an:**
- **Phase 111** (White-Label) ändert die **Berater-Auflösung** in `create_empfehlung_public` (Fehler statt Kai-Fallback).
- **Befund 4** (Doppelklick-Idempotenz) will in derselben Funktion die **Wiederhol-Erkennung** ergänzen.

**Regel zur Konfliktvermeidung:**
1. **Phase 111 zuerst** (White-Label-Zweig) — sie definiert die endgültige Auflösungs-Logik.
2. **Befund 4** (`schema-phase113.sql`) baut **auf der 111-Fassung auf** und ergänzt nur die Idempotenz. Keine zweite, konkurrierende Neufassung derselben Funktion.
3. Solange 111 nicht steht, bleibt Befund 4 **Entwurf** (kein Anwenden).

Der `set_empfehlung_berater_id`-Trigger wird **ausschließlich** in Phase 111 angefasst (Conrad fasst ihn nicht an).

---

## 3) Präzisierung zu Befund 5 / Phase 111 (Kais verschärfte Regel)

Der bestehende Phase-111-Plan sagt „gültiger `p_berater_id` **oder** über gültigen Promoter". Kais Vorgabe ist strenger und ersetzt das:

- **Ist ein Promoter vorhanden:** Berater wird **ausschließlich aus dem Promoter** abgeleitet. Ein zusätzlich mitgesendeter `p_berater_id` muss übereinstimmen — **sonst Fehler**. Kein Vertrauen in ein frei gesendetes Promoter-/Berater-Paar.
- **Kein Kai-Rückfall.**
- **Direkter Berater-Flow (ohne Promoter)** muss **erhalten** bleiben und **separat** behandelt werden — nicht versehentlich alle direkten Empfehlungen sperren.
- **Spam auf öffentliche Berater-Links** ist damit **nicht** gelöst — das ist ein **eigener Schutz** (z. B. striktere Rate-Limits/Signatur des öffentlichen Links), nicht die Paarprüfung.

→ Diese vier Punkte werden als Ergänzung **in den White-Label-Plan** eingearbeitet (Abschnitt Phase 111), nicht als eigene Conrad-Migration.

---

## 4) Was reines Konzept bleibt (Multi-Org, kein Bau)

Befunde 1, 2, 3 werden **nur** als Konzept ausgearbeitet (dein Zielbild):
- Organisation als eigene Ebene; Rollen **Plattform-Admin / Organisations-Admin / Berater**.
- Org-Admin sieht nur seine Organisation; Plattform-Admin organisationsübergreifend.
- Empfehlungen, Promoter, Prämien, Kennzahlen eindeutig einer Organisation zugeordnet.
- Vorlagen/Prämienleiter/Erfolgsgeschichten: Plattform-Standard **und** Org-eigene Inhalte (überschreibbar).
- Migrationsweg ohne Big-Bang: heutige Daten → Organisation „Kai und Team"; bestehende Berater-Links bleiben gültig; **Pilot Claudia** als erste externe Organisation.
- Kennzahlen-Org-Scoping (Befund 3) gehört hierher; der **anonyme** Zugriff (Befund 7) wird vorab separat geschlossen.

---

## 5) Reihenfolge & Kontrollpunkte

1. **Diese Übersicht** — Kai bestätigt die Zuordnung. ← *hier*
2. **Sofort-Härtung Befund 7** (kpi/team anon) — kleinster, klar abgegrenzter Entwurf; kein Konflikt mit White-Label.
3. **Multi-Org-Konzept** (nur Konzept, mit Risiken/Aufwand/Reihenfolge/Pilot).
4. **Härtungs-Entwürfe 4 & 6** (Idempotenz, Belegnummer) — Entwurf mit Risiken/Rückbau/Testplan; 4 erst nach 111.
5. **Präzisierung Befund 5** in den White-Label-Plan einarbeiten.

**Durchgehend:** keine Änderung an `main`, keine Live-Datenbankänderung, nichts veröffentlichen. Erst Entwurf, Risiken, Rückbau, Testplan zeigen — dann nach ausdrücklicher Freigabe.
