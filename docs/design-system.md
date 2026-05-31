# Empfehlungs-HUB · Design System

**Master-Reference:** Hub-Page (`/hub.html`)
**Lock-Status:** Phase 38 / Commit `5685960` · 2026-05-31
**Doku-Update:** Phase 39

Hub ist die visuelle DNA. Alle anderen Dashboard-Pages müssen Hub-Komponenten wiederverwenden, nicht neu erfinden. Wenn man eine neue Page neben den Hub legt, soll man dieselbe Software erkennen.

---

## 1 · Farben

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#FAFAFA` | Page-Background |
| `--surface` | `#FFFFFF` | Card-BG |
| `--surface-soft` | `#F7F5F1` | Optional weiche Card-Tönung |
| `--ink` | `#1A1A1A` | Primary Text |
| `--ink-muted` | `#6B6660` | Secondary Text, Body-Sub |
| `--ink-soft` | `#8C8680` | Captions, Time-Stamps |
| `--hairline` | `#E8E5E0` | Borders |
| `--accent` | `#C9B98A` | Champagne — Primary Accent |
| `--accent-hover` | `#8B7355` | Hover / Active-State Champagne |
| `--sage` | `#7A8B6F` | Positive (↑ Trend, Link-Klicks) |
| `--terracotta` | `#C28447` | Interest |
| `--burnt-orange` | `#B5651D` | Anrufwunsch / Warning |
| `--marine` | `#2E5266` | Kunde / Outcome |

**Don't:** Material-Bunt, schreiendes Grün/Rot, Neon-Effekte, Glassmorphism.

---

## 2 · Typografie

Komplett **Inter** im Dashboard. Fraunces nur auf der Präsentations-Page (`index.html`).

| Skala-Token | Verwendung | Spec |
|---|---|---|
| `--tx-hero` | Greeting | `clamp(34, 3.4vw, 48)`, weight 800, `-0.03em` |
| `--tx-score` | Momentum-Score | `clamp(64, 5.5vw, 92)`, weight 800, `-0.045em` |
| `--tx-h1` | Page-Title | `clamp(22, 2vw, 26)`, weight 700 |
| `--tx-h2` | Section-Headline (Momentum-Right etc.) | `clamp(18, 1.7vw, 22)`, weight 700 |
| `--tx-section` | Eyebrow-Label (`.h-label`) | `11px`, weight 700, `letter-spacing: 0.18em`, uppercase, color `--accent` |
| `--tx-body` | Lead-Card Text, Body | `15px`, weight 500 |
| `--tx-meta` | Sub-Detail, Section-Sub | `13px`, weight 400-500 |
| `--tx-caption` | Time, NEU-Badge, Pills | `10-11px` |

**Pattern:** Section beginnt mit Eyebrow-Label + optionalem `.h-section-sub` (13px secondary, kein italic).

---

## 3 · Spacing (8px-System)

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 24 · `--sp-6` 32 · `--sp-7` 44 · `--sp-8` 64

- Section-Stack im Main-Col: 24px
- Card-Innenabstand (KPI): 14×16
- Card-Innenabstand (Momentum): 24×28
- Activity-Card Padding: 10×12
- Grid-Gap Hauptcontent ↔ Activity-Feed (Desktop ≥1100): **64px**
- Page-Container max-width: 1360px

---

## 4 · Komponenten

### 4.1 · Sidebar (3-Tier-Breakpoint)

- **Default <1024px**: hidden, Hamburger im Header, Drawer Slide-In von links 220ms
- **1024–1279px**: persistent 200px
- **≥1280px**: persistent 240px
- Active-Item: `color-mix(in srgb, #C9B98A 13%, transparent)` BG + 3px Champagne Left-Border + color `#8B7355`
- Hover: `translateX(2px)` + Champagne-Tint 7%

```html
<aside class="nav-sidebar">
  <div class="nav-brand">…</div>
  <nav class="nav-list">…</nav>
</aside>
```

### 4.2 · Header

40px rundes Profilbild + Name (16px/700, `-0.01em`) + Sub (13px/500). Rechts: Live-Pill mit Pulse-Dot, Clock (tabular-nums), Logout-Button.

### 4.3 · KPI-Card

```html
<div class="h-kpi" style="--kpi-color:#C9B98A;">
  <span class="h-kpi-icon" data-icon="Users"></span>
  <div class="h-kpi-body">
    <div class="h-kpi-value">7</div>
    <div class="h-kpi-label">Aktive Empfehler</div>
    <span class="h-kpi-sub"><span class="h-kpi-sub-pill up"><strong>↑ 14%</strong> zur Vorwoche</span></span>
  </div>
</div>
```

- Runde 36px Icon-Bubble in `color-mix(--kpi-color, 15%)`
- Value: 32px Inter 800, `-0.025em`
- Label: 13px Inter 500, ink-muted, **nicht** uppercase
- Trend-Pill: Sage (up) / Burnt-Orange (down) / Grau (neutral)
- Border 1px hairline, kein Top-Border-Stripe, kein Box-Glow

**Don't:** Eckige Tile mit Top-Border, große Icons (>40px), Solid-Color BG.

### 4.4 · Hot-Lead Action-Card

```html
<a class="h-lead anrufwunsch" href="…">
  <span class="h-lead-avatar">MM</span>
  <div class="h-lead-text">
    <strong>Max Mustermann</strong> möchte kontaktiert werden.
    <span class="h-lead-detail">Bevorzugte Zeit: Nachmittags · vor 2 Tagen</span>
  </div>
  <span class="h-lead-cta">Kontakt aufnehmen</span>
</a>
```

- 3px farbiger Left-Border je Status (burnt-orange / terracotta)
- 40px Avatar-Initial mit Solid-Status-Farbe
- Text Sentence-Case mit `<strong>`-Name + Action-Phrase + Detail-Line
- CTA: pille schwarz, hover Champagne

**Don't:** Uppercase-Labels ("ANRUFWUNSCH"), CRM-Stil, Status-Badges in Pills.

### 4.5 · Activity-Card (TellScale-Style)

```html
<a class="h-activity-row" style="--act-color:#7A8B6F;">
  <span class="h-activity-avatar">AS</span>
  <div class="h-activity-body">
    <div class="h-activity-top">
      <strong class="h-activity-name">Anna Schmidt</strong>
      <span class="h-activity-time"><span class="h-badge-new">NEU</span>vor 4 Min</span>
    </div>
    <div class="h-activity-bottom">
      <span class="h-activity-text">hat die Empfehlung geöffnet</span>
      <span class="h-activity-pill"><i></i>Link geklickt</span>
    </div>
  </div>
</a>
```

- 36px Avatar-Tint (`--act-color` mit 16% mix)
- Card weiß, 1px hairline + 3px farbiger Left-Border
- Name nowrap ellipsis, Time + NEU rechts inline
- Bottom-Row: Action-Text + farbige Pill (gleicher act-color)
- Card-Höhe ~58px

### 4.6 · Momentum-Card

```html
<section class="h-momentum">
  <div class="h-momentum-left">
    <span class="h-momentum-eyebrow">Empfehlungs-Momentum</span>
    <span class="h-momentum-score">86<sup>/100</sup></span>
    <span class="h-momentum-trend">↑ +12% zur Vorwoche</span>
  </div>
  <div class="h-momentum-right">
    <div>
      <div class="h-momentum-headline">…</div>
      <div class="h-momentum-explain">…</div>
    </div>
    <div>
      <div class="h-momentum-bar"><div class="h-momentum-bar-fill"></div></div>
      <div class="h-momentum-bar-meta">…</div>
    </div>
  </div>
</section>
```

- Grid 40/60 (Score-Block links, Story rechts)
- Score: `--tx-score` Inter 800 baseline-aligned mit `/100` sup
- Trend-Pill: up (sage) / down (burnt) / neutral
- Progress-Bar Champagne-Gradient mit `transition: width .6s`

### 4.7 · Status-Pill

```html
<span class="h-pill live">System aktiv</span>
<span class="h-pill">4 Aktivitäten heute</span>
```

- 6px/12px Padding, Pill-Radius
- `.h-pill.live` = Sage-Tint + Sage-Text
- Default = white BG + hairline border + ink-muted

### 4.8 · Conversion-Stair

4-Stufen-Block aus Funnel-Daten mit Conversion-% zwischen Stufen.
```html
<div class="h-conversion-stair">
  <div class="h-stair-row"><span class="h-stair-num">76</span><span class="h-stair-label">Klicks</span></div>
  <div class="h-stair-arrow">13% Conversion</div>
  …
</div>
```

### 4.9 · Section-Pattern

Jede Section beginnt mit Eyebrow-Label + optional `.h-section-sub`:

```html
<section>
  <div class="h-label">Warten auf dich</div>
  <p class="h-section-sub">2 Kontakte erwarten heute deinen nächsten Schritt.</p>
  <!-- Card-Liste -->
</section>
```

**Mikrokopien sind menschlich:** "Warten auf dich" statt "Aufmerksamkeit erforderlich", "Dein Verlauf" statt "Verlauf", "Was gerade passiert" statt "Letzte Aktivität".

---

## 5 · Layout

- Desktop ≥1100px: `.h-main-grid { grid-template-columns: minmax(0, 1fr) 300px; gap: 64px; max-width: 1360px; }`
- Activity-Aside: sticky top:88px, eigener Scroll, kein Card-Hintergrund (sitzt auf Page-BG)
- Mobile/Tablet: vertikal gestapelt, Activity am Ende
- Persistent Sidebar 240px (Desktop) / 200px (Laptop), Drawer (Tablet/Mobile)

---

## 6 · Don't · Negativliste

- Keine Serif (Fraunces) im Dashboard — nur Inter
- Kein Material-Bunt (Schreiende Pastell-BGs)
- Keine Glassmorphism-Effekte, kein Backdrop-Blur
- Keine Neon-Akzente
- Keine 3D-Schatten oder Skeumorphismus
- Keine Uppercase-CRM-Labels ("ANRUFWUNSCH")
- Keine Tabellen-Optik — alles Card-System
- Keine Custom-Fonts außerhalb Inter (und Fraunces nur für `/index.html`)

---

## 7 · Roadmap der Page-Refactors (nach Hub-Freeze)

Pro Page: kein neues Design, nur Hub-Komponenten kombinieren.

1. **`dashboard/empfehlungen.html`** — Liste mit Hot-Lead-Card-Pattern
2. **`dashboard/detail.html`** — Header + Sections mit Hub-Cards
3. **`programm.html`** — Bonusprogramm-Übersicht (Skip im Premium-Setup)
4. **`vorlagen.html`** + Themen-Seiten — Card-Liste + Editor
5. **Analysen** — Chart-Dashboard mit `kpi_trend`-RPC
6. **`dashboard/settings.html`** — Form-Layout mit Hub-Tokens
