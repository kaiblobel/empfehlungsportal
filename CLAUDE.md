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
| 6 | `programm.html` | Bonusprogramm-Übersicht |

Pro Page-Refactor eigene Phase (40+).

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

- Live-Login: `kai@blobel.de` / `Kai2026!Empfehl`
- Test-Token: `d127cf3f-2d6b-4cd7-9640-64a0941e11ac`
- Test-Code: `anna-schmidt-247e`
- Berater UUID: `b3cbf981-ea3e-4e6d-a993-2fe158ca0d48`

---

## Workflow-Regeln (Memory)

- **Sprache**: Antworten immer auf Deutsch
- **Push**: NIE ohne Bestätigung pushen (außer in expliziter Auto-Mode-Session)
- **Code-Änderungen**: autonom, aber Commit/Push erst nach OK
- **Mock-Vorab**: Bei Design-Änderungen erst Mock im Browser zeigen, dann Real-Code
