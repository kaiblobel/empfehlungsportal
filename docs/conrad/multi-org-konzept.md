# Multi-Organisation — Konzept (kein Bau)

> **Status:** reines Konzept. **Kein SQL, kein Code, keine Migration, keine Live-Änderung.**
> **Zweck:** Zeigen, wie aus dem heutigen „Ein-Portal-für-Kai-und-Partner" eine echte
> **mandantenfähige Plattform** wird — eine gemeinsame Codebasis, mehrere getrennte
> Organisationen, kein Fork pro Kunde. Grundlage: geprüfte Befunde 1, 2, 3.
> **Noch keine** Verkaufs-, Zahlungs- oder Abo-Funktionen (bewusst ausgeklammert).

---

## 1) Warum überhaupt — die drei Befunde, die das nötig machen

| Befund | Heute | Warum es Multi-Org nicht trägt |
|---|---|---|
| **1** Admin global | Ein Admin (Kai) sieht/ändert **alle** Berater; die „Leitung" sieht alle Stammdaten, aber **0 fremde Empfehlungen** | Ein externer Käufer wäre für Kais Admin-Recht sichtbar; zugleich fehlt eine saubere Team-Übersicht innerhalb einer Organisation |
| **2** Inhalte geteilt | Vorlagen, Prämienleiter, Erfolgsgeschichten sind **ein gemeinsames Set** (Kais) | Eine externe Organisation kann keine eigenen Inhalte führen |
| **3** Kennzahlen global | `kpi_snapshots` ohne Organisations-/Berater-Bezug | Jede Organisation würde die Zahlen aller sehen |

Die **Kern-Trennung der Bewegungsdaten** (Empfehlungen, Promoter, Prämien) hält heute schon strikt pro Berater — darauf baut das Konzept auf.

---

## 2) Zielbild

### 2.1 Neue Ebene „Organisation"
Eine Organisation ist der Mandant. Beispiele: „Kai und Team" (heute), später „Claudia & Partner" (extern).
Jeder **Berater** gehört zu **genau einer** Organisation. Alle Bewegungsdaten (Empfehlungen, Promoter, Prämien, Kennzahlen) sind über den Berater eindeutig einer Organisation zugeordnet.

### 2.2 Drei Rollen (statt heute „ein globales Admin-Häkchen")

| Rolle | Reichweite | Wer |
|---|---|---|
| **Plattform-Admin** | organisationsübergreifend (Betreiber der Plattform) | Kai (heute) |
| **Organisations-Admin** | **nur die eigene Organisation** — sieht/verwaltet deren Berater, Empfehlungen, Prämien, Kennzahlen | Leitung einer Organisation |
| **Berater** | nur die eigenen Daten (wie heute) | einzelner Berater |

Das löst Befund 1 zweifach: Der Plattform-Admin bleibt bewusst allmächtig (Kai), aber ein Organisations-Admin bekommt eine **saubere, auf seine Organisation begrenzte** Gesamtübersicht — inklusive der heute unsichtbaren fremden Empfehlungen **innerhalb** seiner Organisation.

### 2.3 Inhalte: Plattform-Standard + Organisations-eigene (Befund 2)
Für Vorlagen, Prämienleiter und Erfolgsgeschichten gilt eine **zweistufige Vererbung**:
1. **Plattform-Standard** (heutiges Kai-Set, als organisationsloses Standardset gekennzeichnet) — gilt, wenn eine Organisation nichts Eigenes hat.
2. **Organisations-eigene Inhalte** — legt eine Organisation eigene an, **überschreiben** diese den Standard (pro Thema/Stufe).

So startet jede neue Organisation sofort funktionsfähig (erbt den Standard) und kann Schritt für Schritt eigene Inhalte setzen — ohne dass jemals fremde Inhalte einer anderen Organisation sichtbar werden.

### 2.4 Kennzahlen pro Organisation (Befund 3)
Kennzahlen bekommen einen Organisationsbezug; jede Organisation sieht nur ihre eigenen Trends/Momentum. Der Plattform-Admin kann organisationsübergreifend auswerten.
(Der **anonyme** Zugriff auf die Kennzahl-Funktionen wird schon vorab über den Härtungspunkt Befund 7 geschlossen — unabhängig von diesem Umbau.)

---

## 3) Sichtbarkeits-Matrix (Soll)

| Sieht … | Berater | Org-Admin | Plattform-Admin |
|---|---|---|---|
| eigene Empfehlungen/Promoter/Prämien | ✅ | ✅ | ✅ |
| andere Berater **derselben** Organisation | 🚫 | ✅ | ✅ |
| Berater **fremder** Organisationen | 🚫 | 🚫 | ✅ |
| Kennzahlen der eigenen Organisation | (eigene) | ✅ (ganze Org) | ✅ (alle Orgs) |
| Vorlagen/Prämienleiter/Erfolge | eigene Org (oder Standard) | eigene Org | alle + Standard |
| Stammdaten fremder Organisationen | 🚫 | 🚫 | ✅ |

---

## 4) Migrationsweg — ohne Big-Bang

Leitprinzip: **jeder Schritt ist für sich lauffähig, reversibel, und ändert keine bestehende Kundensicht, solange nur eine Organisation existiert.** Bestehende Berater-, Empfänger- und Promoter-Links (Slug/Token/Code) bleiben **unverändert gültig** — die Organisation wird intern über den Berater abgeleitet, nicht über die URL.

1. **Organisation einführen (unsichtbar).** Organisations-Ebene anlegen; jeder heutige Berater wird der einen Organisation **„Kai und Team"** zugeordnet. Kein sichtbarer Effekt, keine geänderte Trennung — nur eine neue Zuordnung im Hintergrund.
2. **Rollen einführen.** Kais heutiges Admin-Recht wird zu **Plattform-Admin** (bleibt allmächtig → nichts bricht). Die Rolle **Organisations-Admin** entsteht neu, zunächst ohne Zuweisung.
3. **Trennung auf Organisation umstellen — additiv.** Die bestehenden Berater-Trennungsregeln bleiben; ergänzt wird die Organisations-Sicht (Org-Admin sieht seine Org). Solange nur „Kai und Team" existiert, ist das Ergebnis identisch mit heute.
4. **Inhalte-Vererbung.** Das heutige Kai-Set wird als **Plattform-Standard** markiert. Logik „eigene Inhalte überschreiben Standard" wird ergänzt. Für „Kai und Team" bleibt alles wie gewohnt.
5. **Kennzahlen-Organisationsbezug.** Kennzahlen werden pro Organisation erhoben/gelesen; Plattform-Admin-Auswertung org-übergreifend.
6. **Pilot: erste externe Organisation.** Claudia (siehe `pilot-claudia.md`) wird als **eigene Organisation** angelegt — nicht mehr nur als weiterer Berater in Kais Organisation. Erst hier zeigt sich die echte Mehr-Organisations-Trennung im Betrieb.

Jeder Schritt ist einzeln freigabe- und rückbaubar. Erst wenn Schritt N stabil ist, folgt N+1.

---

## 5) Berührungspunkte mit laufender Arbeit

- **White-Label-Zweig (Phase 110–112):** behandelt die **Darstellung/Ermittlung** des richtigen Beraters und die „keine-Kai-Zuordnung"-Regel. Das ist die **Voraussetzung** für Multi-Org (neutrale Seiten, saubere Attribution), aber noch nicht die Organisations-Ebene selbst. Reihenfolge: **erst White-Label fertig**, dann Multi-Org darauf aufsetzen.
- **Pilot Claudia:** heute als zusätzlicher Berater in Kais Organisation geplant. Im Zielbild wird derselbe Pilot der **Testfall für die erste eigene Organisation**. Der Pilot-Prüfplan (`pilot-claudia.md`) bleibt gültig und wird um die Org-Trennungsproben ergänzt.
- **Benachrichtigungen** (Telegram/Mail) sind heute global (→ Kai). Pro-Organisation-Benachrichtigung ist ein **eigener späterer Baustein**, nicht Teil des Kern-Umbaus.

---

## 6) Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Umstellung der Trennungsregeln bricht die heutige (funktionierende) Berater-Trennung | Additiv vorgehen: Organisations-Sicht **ergänzen**, Berater-Regeln behalten; solange 1 Organisation existiert, ist das Ergebnis beweisbar identisch (Test-Kopie-Nachweis wie in dieser Prüfung) |
| Kais Admin-Recht geht beim Rollen-Split verloren → er sperrt sich aus | Schritt 2 macht Kai **zuerst** zum Plattform-Admin, bevor irgendein Recht verengt wird |
| Inhalte-Vererbung zeigt versehentlich fremde Org-Inhalte | Standard ist organisationslos; Org-Inhalte sind strikt org-gebunden; Test: Org B sieht nie Org-A-Inhalte, nur Standard oder Eigenes |
| Bestehende Links brechen | Organisation wird **nie** aus der URL abgeleitet, immer aus dem Berater → Slug/Token/Code bleiben gültig |
| Big-Bang-Fehler | Kein Big-Bang: 6 einzeln reversible Schritte, jeder mit eigener Freigabe und Test-Kopie-Nachweis |
| Datenzuordnung unvollständig (Berater ohne Organisation) | Vor jedem Schritt Read-only-Check „jeder Berater hat genau eine Organisation", analog zum White-Label-Vorab-Check |

---

## 7) Grobe Reihenfolge & Aufwand (Einschätzung, nicht verbindlich)

1. **Voraussetzung:** White-Label 110–112 abgeschlossen.
2. **Fundament** (Schritte 1–2: Organisation + Rollen, unsichtbar): kleiner bis mittlerer Aufwand, geringes Risiko (additiv).
3. **Trennung + Inhalte** (Schritte 3–4): mittlerer Aufwand, sorgfältig zu testen (die eigentliche Mandantenfähigkeit).
4. **Kennzahlen** (Schritt 5): kleiner Aufwand.
5. **Pilot** (Schritt 6): der Praxistest mit einer echten zweiten Organisation.

**Nächster konkreter Schritt nach Freigabe des Konzepts:** ein detaillierter Umsetzungsplan **nur für Schritt 1–2** (Organisation + Rollen, unsichtbar), inklusive Datenmodell, Rückbau und Test-Kopie-Nachweis — dann erst bauen, Schritt für Schritt.

---

_Dieses Dokument ist Konzept. Umsetzung erst nach ausdrücklicher Freigabe und dann pro Schritt einzeln — kein Live-Deploy ohne „go"._
