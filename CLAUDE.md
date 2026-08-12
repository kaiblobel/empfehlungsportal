<!-- odysseus-passport
purpose: Empfehlungsportal für DVAG-Berater - Vanilla JS + eigene Supabase; Funnel Klick zu Interesse zu Kunde, privates Potenzialbuch mit Kontakt-Coach, echte Kennzahlen, Champions, Prämien; Cockpit-Brücke
status: NEU 12.08.2026 v1.230 Phase 210 - PRAEMIEN FUER JEDEN BERATER + ABSENDER DER GLUECKWUNSCH-MAIL. Entstanden aus einem Fehlalarm (gemeldet: notify-stufe melde an den Admin statt an den zustaendigen Berater; tatsaechlich war die Stelle der Stufen-Rueckfall aus Phase 192). Beim Nachsehen zwei echte Punkte: (1) Phase 192 hatte die Unterschrift der Glueckwunsch-Mail nachgezogen, den ABSENDERNAMEN nicht - ein Promoter von Sven haette eine Mail von "Kai Blobel" bekommen, die mit "- Sven Augustin" endet; notify-stufe v4 setzt jetzt den Namen des zustaendigen Beraters vor die verifizierte Adresse, Anfuehrungszeichen und spitze Klammern werden entfernt (sie wuerden die Mail-Kopfzeile zerlegen). (2) "Auszahlungen" war ein reiner Admin-Punkt: erreichte ein Promoter von Sven eine Stufe, bekam der PROMOTER die Mail und Sven erfuhr es nicht, weder per Mail noch in einer Liste. Die Datenbank konnte es laengst (praemien_select/praemien_write "eigene ODER Admin", auszahlen_praemie() und sync_praemien() pruefen dasselbe, Belegnummern je Berater ueber private.beleg_zaehler) - es fehlte nur die Tuer im Frontend. Jetzt sieht und verwaltet jeder Berater seine eigenen Praemien inkl. Auszahlen und Beleg; Kai sieht als Admin alle, der Hinweis dazu erscheint nur bei ihm; der Zaehler am Menuepunkt gilt fuer jeden. Test mit Gegenprobe haelt die Tuer offen. 75 Tests gruen. DAVOR: v1.229 Phase 209 - ANMELDEADRESSE SICHTBAR, ADMIN-SICHT GEKENNZEICHNET. Zwei Felder mit zwei Aufgaben: berater.email ist die Geschaeftsadresse fuer Kunden, auth.users.email die Anmeldeadresse; verbunden ueber auth_user_id, nicht ueber die Adresse. Bei sechs von sieben Beratern identisch (der Knopf Login anlegen erzeugt das Konto mit der Karten-Adresse), bei Kai nicht - sein Konto ist das aelteste und von Hand entstanden. Neue Funktion berater_login_emails(): erster LESENDER Zugriff auf auth.users im Portal, deshalb eng gebaut (Adminpruefung vor dem Lesen, nur Konten mit Berater, nur echte Abweichungen; Gross-/Kleinschreibung zaehlt nicht, sonst meldet Max Kudlek eine Abweichung die keine ist). Dreifach gegengeprueft: als Admin genau eine Zeile, als Nicht-Admin null, anonym 401. Die Karte zeigt bei Abweichung eine leisere Zeile Anmeldung:..., bewusst OHNE data-f - die Speicherroutine sammelt alle [data-f]-Felder ein, ein zweites data-f=email wuerde beim Speichern die Geschaeftsadresse ueberschreiben. Teil B: 22 Leseregeln ueber 8 Tabellen haengen am Admin-Recht; gemessen gehoeren Kai 2 von 7 KIDZ-Anmeldungen, in seiner Verwaltung stehen alle. Praemien und beide KIDZ-Verwaltungen tragen jetzt eine dezente Zeile Du siehst hier als Admin alle Eintraege des Portals; bei KIDZ nur fuer Admins eingeblendet, dort sehen normale Berater ihre eigenen Daten. Leseregeln unveraendert, die Sicht wird nur benannt. BEWUSST NICHT: kein getrenntes Admin-Konto, kein zweiter Admin, kein Rollenkonzept - es gibt genau zwei Stufen plus die Fuehrungslinie ueber fuehrungskraft_id (nur breiter lesen, keine Schreibrechte), das passt zu sieben Personen. OFFENER BEFUND: notify-stufe waehlt Empfaenger ueber ist_admin=true - eine Stufe bei Svens Promoter wuerde an Kai melden statt an Sven; erst messen ob das die Mail an den Promoter betrifft oder eine Kopie an den Berater. 75 Tests gruen. DAVOR: v1.228 Phase 208 - TESTDATEN SIND ALS TEST GEKENNZEICHNET. Bisher war "Test oder echt" eine Frage der Namensgebung; jetzt traegt jeder Datensatz ein ist_test-Kennzeichen, das die Datenbank selbst vererbt (Testberater macht alles darunter zu Test, Testpromoter seine Empfehlungen und Praemien, eine einzelne Empfehlung geht auch allein). Drei Zusagen: Testdaten zaehlen in KEINER Kennzahl mit (Startseite, Trichter, Analysen, Teamsicht, KIDZ-Kacheln, naechtlicher Schnappschuss), sie loesen KEINE Mail und KEINE Push aus (vorher reine Disziplin; belegt an einer Empfehlung auf Kunde: Praemie entstand, Glueckwunsch-Mail nicht, null HTTP-Rufe in der Warteschlange), und sie lassen sich per Knopf in den Beraterkonten sichern und entfernen (testdaten_entfernen, Admin + Bestaetigung, sichert nach archiv.backup_testdaten_<Zeitstempel>). Sichtbar bleiben sie: gestreiftes Test-Kennzeichen in Promoter-, Empfehlungs-, Praemien-, Berater- und KIDZ-Listen; nur der Hub haelt sich frei. Ausnahme fuer den wichtigsten Testfall: beim Testpromoter zaehlt alles, beim echten nur Echtes. Ein Waechter-Test bewacht jede Abfrage auf die betroffenen Tabellen: filtern oder Kennzeichen mitlesen. NEBENBEI die Testschuld getilgt: Version/Phase/Cache standen in 14 Testdateien fest, die ?v-Nummern in weiteren 15 - jede Veroeffentlichung brach dieselben Tests. Jetzt eine Stelle (tests/versionsstand.test.mjs) und schaerfer: prueft Gleichklang von config.js, sw.js und CHANGELOG UND dass alle Seiten + sw.js dieselbe ?v-Fassung einbinden. Letzteres fand sofort zwei auseinandergelaufene Stellen (js/app.js v45 vs v51, kidz-admin-css v4 vs v5), beide begradigt. Werkzeug: node tools/version-setzen.mjs "Titel". 74 Tests gruen. LIVE seit dem Abend des 12.08. (Kai hat die Oberflaeche vorher in der Vercel-Vorschau angesehen und freigegeben). OFFEN: echte Promoter-Selbstanmeldung im Echtbetrieb (0 Datensaetze), Sichttest auf Handy und in der installierten Portalversion. DAVOR: v1.218 - VOLLPRUEFUNG IM ECHTBETRIEB, Phasen 192 bis 196 in der Live-Datenbank angewandt. Drei kritische Fehler hatten dieselbe Wurzel: das Portal war als Kais Werkzeug gebaut und an drei Stellen nie auf mehrere Berater umgestellt. (1) sync_praemien_for_empfehler filterte die Belohnungsstufen auf berater_id, nur Kai hat welche - fuer jeden anderen entstand still keine Praemie, waehrend check_stufe_erreicht die Stufe OHNE berater_id fand und die Glueckwunsch-Mail trotzdem an den Promoter verschickte; ein Helfer private.belohnungs_stufen_fuer() beantwortet die Frage jetzt an EINER Stelle, die Praemie entsteht VOR der Mail, und der INSERT-Fall (Empfehlung direkt als Kunde angelegt, erzeugte auch bei Kai nie eine Praemie, weil trg_empfehlung_kunde nur an UPDATE hing) ist mit abgedeckt. (2) notify-interesse las push_subscriptions OHNE Filter: Name, Beruf, Anrufwunsch und Empfehler eines Leads waeren an JEDES angemeldete Geraet gegangen - jetzt v9 nur an den zustaendigen Berater, fail-closed ohne Zuordnung; die juengere notify-promoter machte es richtig, notify-interesse wurde nie nachgezogen, und der vorhandene Test prueft genau diesen Punkt nur fuer die richtige Funktion. Merksatz: wird eine Funktion nachgezogen, pruefen ob es eine Schwester gibt. (3) Der Fussbereich von programm.html verlinkte empfehlen.html OHNE Parameter - ein Kunde von Sven landete auf einer als Kai gebrandeten Seite und seine Empfehlung wurde Kai zugeordnet; behoben in v1.218, NOCH NICHT VEROEFFENTLICHT. Dazu: notify-stufe v3 unterschreibt mit dem zustaendigen Berater statt pauschal mit Kai Blobel und loest die Stufe mit demselben Rueckfall auf; kpi_snapshots hat eine berater_id, Schnappschuss und Trend laufen je Berater (vorher sah jeder Berater neben seiner eigenen Zahl die Summe des GANZEN Portals, und die Leseregel lautete schlicht true), Historie ueber 30 Tage aus den echten Anlagedaten zurueckgerechnet; die Fuehrungslinie greift ueber mein_team() und team_bestand() jetzt auch bei Promotern, Empfehlungen, Praemien und KIDZ, bewusst OHNE Namen weil die Teamseite seit Phase 141 datensparsam ist und ein Test dort empfaenger_name verbietet - eine Zahl in der Oberflaeche mit Namen in der Antwort waere nur scheinbar sparsam; die Leseregeln auf den Tabellen bleiben eng auf die eigenen Daten, sonst zaehlte jede Kachel im Portal das ganze Team mit; link_auth_user_to_berater greift nur noch fuer eingeladene oder vom Admin angelegte Konten, eine Selbstregistrierung kann kein Beraterkonto mehr uebernehmen (invite-berater braucht den Trigger, weil es auth_user_id nicht selbst setzt). Demo-Welt entfernt: 30 Promoter, 58 Empfehlungen, 12 Praemien, 80 KIDZ-Testanmeldungen, vollstaendig gesichert in archiv.backup_demowelt_20260812; ein Demo-Promoter bleibt bewusst stehen, weil eine echte Empfehlung vom 12.08. daran haengt. 71 Tests gruen. OFFEN: Push von conrad/pruefung-2026-08-12 nach GitHub (vom Berechtigungs-Klassifikator abgewiesen, deshalb steht v1.218 noch nicht bei Vercel), disable_signup in Supabase Auth steht weiter auf false (die gefaehrliche Haelfte ist geschlossen), angemeldeter Sichttest auf Rechner und Handy, eine echte Promoter-Selbstanmeldung (im Echtbetrieb NOCH NIE gelaufen, 0 Datensaetze), Datenschutzfrage ob eine Fuehrungskraft die Namen ihres Astes sehen darf. Bericht: docs/PRUEFUNG-2026-08-12.md. Davor: v1.217 Phase 191 KIDZ-Elternabend live; eigener öffentlicher Informations- und Vormerkweg, separate Portalverwaltung mit Live-Aktualisierung, geprüfter QR-Code und sichere Berater-/Promoterzuordnung; Namenskorrektur Anika Biebrach aktiv; 61 Prüfungen und Live-Abnahme grün
live_url: https://empfehlungsportal.vercel.app; KIDZ oeffentlich unter https://kidz.teamwachsbleiche.de
tags: portal, supabase, empfehlung, promoter, potenzialbuch, kontakt-coach, spracheingabe, mobile-first, live, baufinanzierung, kfw, bookings, power-automate
-->

# Empfehlungsportal — Projekt-Kontext für Claude

**Live:** https://empfehlungsportal.vercel.app
**Master-Reference:** `/hub.html` ist die visuelle DNA für alle anderen Pages.
**Lock-Status:** Phase 38 Commit `5685960` (2026-05-31) — Hub eingefroren.

---

## Tech-Stack

- **Vanilla HTML / CSS / JS · No-Build · No-Framework**
- **Supabase** Backend (Project `kkseqhmfubzfyloffkwe`): Postgres + RLS + Realtime + Edge Functions + pg_cron
- **Vercel** Deployment auto-on-push-to-main
- **PWA**: `sw.js`, `manifest.json`, Web-Push + Telegram + Resend Email Notifications
- **GitHub**: `kaiblobel/empfehlungsportal`

---

## Design-Master-Reference

**Hub-Page (`/hub.html`) ist die Vorlage.** Alle neuen Dashboard-Pages müssen die gleiche DNA matchen.

Detaillierte Komponenten-Doku: `docs/design-system.md`
Design-Tokens: oben in `css/style.css`

### Pflicht-Regeln

- **Schrift**: **Inter only** im Dashboard. Fraunces nur für `/index.html` (Präsentations-Flow).
- **Farb-Palette**: Editorial — Champagne `#C9B98A`, Sage `#7A8B6F`, Terracotta `#C28447`, Burnt-Orange `#B5651D`, Marine `#2E5266`
- **Card-System**: weiße Cards mit `--shadow-card`, 1px Hairline-Border, Border-Radius 10-14px, Hover `translateY(-2px) + --shadow-card-hover`
- **Section-Pattern**: Eyebrow-Label (`.h-label` uppercase 11px Champagne) + optional `.h-section-sub` (13px Inter 500)
- **Mikrokopien menschlich**: "Warten auf dich" statt "Aufmerksamkeit erforderlich", "Was gerade passiert" statt "Letzte Aktivität"
- **8px-Spacing-System** (`--sp-1` bis `--sp-8`)
- **Inter-Skala**: Hero 800/clamp(34-48), Score 800/clamp(64-92), H2 700/clamp(18-22), Body 15px, Meta 13px, Caption 11px

### Verbote (Negativliste)

- ❌ Keine Serif im Dashboard (Vogue-Look)
- ❌ Kein Material-Bunt, kein schreiendes Grün/Rot
- ❌ Keine Glassmorphism, kein Backdrop-Blur
- ❌ Keine Neon-Akzente, keine 3D-Schatten
- ❌ Keine Tabellen-Optik (alles Card-System)
- ❌ Keine Uppercase-CRM-Labels ("ANRUFWUNSCH")
- ❌ Keine eigenen Designs erfinden — Hub-Komponenten kombinieren

---

## Wiederverwendbare Komponenten (Hub)

Siehe `docs/design-system.md` für vollen HTML-Snippet-Stack:
- Sidebar (3-Tier responsive: 240/200/Drawer)
- Header (Photo + Name + Sub + Right-Tools)
- KPI-Card (runde Icon-Bubble + Value + Label + Trend-Pill)
- Hot-Lead-Card (Avatar-Initial + Sentence-Text + CTA)
- Activity-Card (Avatar-Tint + Name/Time + Pill)
- Momentum-Card (Score + Headline + Bar)
- Status-Pill (live/neutral)
- Conversion-Stair (Funnel-Treppe mit Conversion-%)

---

## Build-Roadmap (nach Hub-Freeze)

Pages refactoren in dieser Reihenfolge — pro Page: kein neues Design erfinden, nur Hub-Komponenten kombinieren.

| # | Page | Strategy |
|---|---|---|
| 1 | `dashboard/empfehlungen.html` | Liste als Hot-Lead-Card-Pattern |
| 2 | `dashboard/detail.html` | Header + Sections mit Hub-Card-System |
| 3 | `vorlagen.html` + Themen-Seiten | Card-Liste + Editor |
| 4 | Analysen | Chart-Dashboard mit `kpi_trend`-RPC |
| 5 | `dashboard/settings.html` | Form-Layout mit Hub-Tokens |
| 6 | ~~`programm.html`~~ | ✅ Phase 47 (2026-06-01) — Conversion-Refactor mit SF-Font, Themen-Auswahl, Roadmap, WhatsApp-Mockup, Erfolgs-Modal |

Pro Page-Refactor eigene Phase (40+).

### Hinweis Customer-Pages (programm.html, empfehlen.html, empfaenger.html)

Customer-facing Pages folgen **NICHT** dem Editorial-OS Hub-Pattern, sondern eigener Trust-Luxury-DNA:
- **Font**: SF Pro Display/Text via System-Stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display"`) — KEIN Fraunces mehr im Customer-Bereich seit Phase 47
- **Palette**: Champagne `#C9B98A` primär, Editorial-Tönungen (Olive, Honey, Marine, Sage, Terracotta) als Akzente
- **Card-System**: weiß, weiche Hairlines, Champagne-Border-Tints
- **CTAs**: Pulse-Animation nur auf Hero + Sticky (nicht auf jeden Section-CTA)
- **Marquee-Testimonials**: müssen statisch im HTML stehen (Mobile-Safari rendert dynamische Cards unzuverlässig — siehe Phase 47 inline-Fallback)

---

## Wichtige Datenbank-Patterns (Supabase)

- `empfehlungen`-Tabelle: status, link_klicks, link_geoeffnet, interessiert, anrufwunsch, ...
- `empfehler`-Tabelle: code-basierte UUIDs, auto-link Trigger (Phase 27)
- `kpi_snapshots` — täglicher Snapshot, nightly cron, Datenquelle für Trend-Chart + Momentum
- RPC `kpi_trend(days_back)` — Δ-Vergleich
- RPC `kpi_trend_daily(days_back)` — Daily-Series für Chart
- Realtime Channel `hub-stream` auf `empfehlungen` Table (INSERT + relevant UPDATEs)
- Edge Functions: `notify-interesse v7`, `notify-stufe v2` (mit X-Internal-Token Header-Auth)

---

## Authentifizierung / Test-Accounts

- Zugangsdaten, Passwörter und aktive Test-Links werden niemals im Repository gespeichert.
- Testkonten und Testdaten werden ausschließlich in den dafür vorgesehenen Systemen verwaltet.
- Berater UUID: `b3cbf981-ea3e-4e6d-a993-2fe158ca0d48`

---

## Workflow-Regeln (Memory)

- **Sprache**: Antworten immer auf Deutsch
- **Push**: NIE ohne Bestätigung pushen (außer in expliziter Auto-Mode-Session)
- **Code-Änderungen**: autonom, aber Commit/Push erst nach OK
- **Mock-Vorab**: Bei Design-Änderungen erst Mock im Browser zeigen, dann Real-Code
