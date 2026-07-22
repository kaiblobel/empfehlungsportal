<!-- odysseus-passport
purpose: Empfehlungs-HUB für DVAG-Berater — Vanilla JS + eigene Supabase; Funnel Klick→Interesse→Kunde, Momentum, Champions, Prämien; Cockpit-Brücke
status: live (Beta) — v1.129 produktiv; v1.132 mit dreizehn gestrafften Präsentationsfolien, persönlicher Botschaft, lesbarer Vorteile-Folie und ruhigerem Porträt-Ausschnitt lokal in Prüfung
live_url: https://empfehlungsportal.vercel.app
tags: portal, supabase, empfehlung, präsentation, live, baufinanzierung, kfw
-->

# Empfehlungs-HUB — Projekt-Kontext für Claude

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
