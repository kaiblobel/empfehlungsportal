# Empfehlungsportal

Geführter Empfehlungs-Flow im Stil von [kaiblobel.de](https://kaiblobel.de). Reines HTML/CSS/JS, kein Build-Prozess, Supabase als Backend via CDN, Vercel als Hosting.

## Flow

```
index.html (10-Slide-Story)
   ↓ CTA
empfehlen.html?typ=direkt|info (Formular + WhatsApp)
   ↓ Submit → Supabase insert
danke.html (Bestätigung für Empfehler)

— Parallel —
empfaenger.html?token=… (Landingpage für Empfohlenen, markiert link_geoeffnet)
   ↓ Opt-out
austragen.html?token=… (markiert ausgetragen)
```

## Setup

### 1. Supabase

1. Neues Projekt unter [supabase.com](https://supabase.com) anlegen
2. Im SQL-Editor folgendes Schema ausführen:

```sql
create table berater (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  telefon text,
  foto_url text,
  whatsapp text default '4915154776159',
  created_at timestamp default now()
);

create table empfehlungen (
  id uuid primary key default gen_random_uuid(),
  berater_id uuid references berater(id),
  empfehler_name text,
  empfaenger_name text not null,
  empfaenger_telefon text not null,
  nachricht text,
  link_token text unique default gen_random_uuid()::text,
  link_geoeffnet boolean default false,
  link_geoeffnet_at timestamp,
  ausgetragen boolean default false,
  ausgetragen_at timestamp,
  typ text default 'direkt',
  created_at timestamp default now()
);

-- Seed-Berater (UUID merken!)
insert into berater (name, telefon, foto_url, whatsapp)
values ('Kai Blobel', '+4915154776159',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
        '4915154776159')
returning id;

-- Row Level Security (öffentliches Frontend)
alter table berater enable row level security;
alter table empfehlungen enable row level security;

create policy "berater public read" on berater for select using (true);
create policy "empfehlung public insert" on empfehlungen for insert with check (true);
create policy "empfehlung select by token" on empfehlungen for select using (true);
create policy "empfehlung update by token" on empfehlungen for update using (true);
```

3. Aus dem `returning id` die **Berater-UUID** notieren.
4. Aus *Project Settings → API* die **Project URL** und den **anon public key** notieren.

### 2. Konfiguration

Drei Werte in [`js/config.js`](js/config.js) eintragen:

```js
window.ENV_SUPABASE_URL = 'https://xxxxx.supabase.co';
window.ENV_SUPABASE_ANON_KEY = 'eyJhbGciOiJI…';
window.ENV_BERATER_ID = 'die-uuid-aus-dem-seed-insert';
```

> **Hinweis:** Der Anon-Key ist öffentlich (kein Secret). Schutz erfolgt über die RLS-Policies in Supabase. Werte können daher direkt in `config.js` committed werden, wenn das Repo nicht öffentlich ist. Andernfalls Vercel-Build-Step nutzen (siehe unten).

### 3. Vercel

Variante A (CLI):
```bash
vercel link
vercel --prod
```

Variante B (Dashboard):
1. [vercel.com/new](https://vercel.com/new) → GitHub-Repo `kaiblobel-maker/empfehlungsportal` importieren
2. Framework Preset: **Other**
3. Build & Output Settings: leer lassen (statische Seite)
4. Deploy

**Optional – Keys via Env-Vars statt `config.js`:** Ein `vercel-build.sh`-Schritt kann eine `config.js` aus den Env-Variablen generieren. Aktuell ist der pragmatische Weg, die Keys direkt in `config.js` einzutragen.

## Lokal testen

```bash
python -m http.server 8000
# → http://localhost:8000/index.html
```

## Autonom getroffene Entscheidungen

- **Projektort:** `C:\Projekte\empfehlungsportal`
- **GitHub-Repo:** `kaiblobel-maker/empfehlungsportal`
- **WhatsApp-Nummer:** `4915154776159` hardcoded in `config.js`
- **Berater-Profil:** Default-Daten ("Kai Blobel", "Regionaldirektionsleiter · Team Wachsbleiche") in `config.js`, echte UUID kommt aus dem SQL-Seed
- **Unsplash-Bilder:** Direkt via URL eingebunden, keine Downloads
- **Demo-Modus:** Wenn `config.js` Platzhalterwerte enthält, läuft die UI weiterhin (Supabase-Calls werden no-op statt Fehler)

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | 10-Slide-Empfehlungspräsentation |
| `empfehlen.html` | Formular mit WhatsApp-Versand |
| `danke.html` | Bestätigung für den Empfehler |
| `empfaenger.html` | Landingpage für den Empfohlenen (Token) |
| `austragen.html` | Opt-out (Token) |
| `js/config.js` | Public Env-Werte (URL, Anon-Key, Berater-ID) |
| `js/supabase.js` | Supabase-CRUD via CDN |
| `js/app.js` | Slide-Nav, Touch-Swipe, Form-Logik, Token-Handling |
| `css/style.css` | Komplettes Design-System (Apple-minimalistisch, Inter, Gold-Akzent) |
| `vercel.json` | Rewrite-Regeln |
