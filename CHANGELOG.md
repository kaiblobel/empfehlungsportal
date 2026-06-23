# Changelog · Empfehlungsportal

Versionierung: `v1.{Phase}` — jede Phase im Build-Plan bekommt eine Minor.
Aktuelle Version: **v1.75** · Phase 59 Sandro-Review Runde 2.

---

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
