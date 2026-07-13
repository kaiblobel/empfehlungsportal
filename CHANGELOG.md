# Changelog · Empfehlungsportal

Versionierung: `v1.{Phase}` — jede Phase im Build-Plan bekommt eine Minor.
Aktuelle Version: **v1.100 Beta** · Ruhige Menüführung (Klick-Accordion).

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
