# Changelog · Empfehlungsportal

Versionierung: `v1.{Phase}` — jede Phase im Build-Plan bekommt eine Minor.
Aktuelle Version: **v1.51** · Phase 50d Berater-Einladungs-Flow (Magic-Link).

---

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
