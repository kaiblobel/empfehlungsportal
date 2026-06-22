# RESTORE — Wiederherstellung des Empfehlungsportals

Dieses Dokument beschreibt, wie der funktionierende Stand in Minuten zurückgeholt wird.
**Enthält bewusst KEINE Daten und KEINE Secrets** (dieses Repo ist öffentlich).

## Bekannter guter Stand
- **Git-Tag:** `stable-v1.70` (Commit `d6f7ddc`) — funktionierender Stand, getestet.
- **Backups (privat, in Kais OneDrive, NICHT im Repo):**
  `…\OneDrive - DVAG\05 🤖 KI-Outputs\empfehlungsportal-sicherung-2026-06-22\`
  - `empfehlungsportal-code-v1.70.zip` — komplette Dateien des Stands
  - `empfehlungsportal-daten-2026-06-22.sql` — DB-Daten-Snapshot (ohne `app_secrets`)

## A) Code zurückholen

**Schnellster Weg (Live sofort) — Vercel-Rollback:**
1. Vercel-Dashboard → Projekt `empfehlungsportal` → Tab **Deployments**.
2. Den Deployment-Eintrag des guten Stands (Commit `d6f7ddc`, v1.70) öffnen.
3. **„⋯" → „Promote to Production"** (bzw. „Rollback"). Live ist sofort wieder der alte Stand.
   (Jeder Vercel-Deploy ist unveränderlich gespeichert — Rollback geht jederzeit.)

**Per Git (für lokale Arbeit / Neu-Deploy über `main`):**
```bash
git checkout stable-v1.70          # genau diesen Stand auschecken
# oder einen Fix-Branch davon:
git checkout -b rollback stable-v1.70
# Soll dieser Stand wieder auf main/live: erst absichern, dann
git checkout main && git revert <schlechte-commits>   # gezielt zurücknehmen
```
Notfalls liegt der vollständige Code zusätzlich als ZIP im OneDrive-Backup.

## B) Datenbank-Daten zurückholen (Supabase)

1. **Erste Wahl — Supabase-eigenes Backup:** Supabase-Dashboard → Database → **Backups**
   → passenden Zeitpunkt wiederherstellen.
2. **Aus dem Snapshot:** `empfehlungsportal-daten-2026-06-22.sql` aus dem OneDrive-Backup
   im **Supabase SQL-Editor** ausführen.
   - Die Datei enthält generische `INSERT … json_populate_recordset`-Statements pro Tabelle.
   - **Zieltabellen sollten leer sein** (sonst Primärschlüssel-Konflikt). Ggf. vorher die
     betroffene Tabelle leeren bzw. nur fehlende Zeilen einspielen.
   - `app_secrets` ist NICHT enthalten (Keys liegen weiter in der DB / werden separat rotiert).

## C) Arbeitsregeln für künftige Berater-/DB-Änderungen (Schutz für den Live-Betrieb)
- **Vor jeder DB-Migration** einen frischen Daten-Snapshot ziehen (wie oben, neues Datum).
- Nur **additive / idempotente** Migrationen: `do $$`-Blöcke, `drop policy if exists` vor `create policy`.
- Nach jeder Migration: **Supabase-Advisor** prüfen **+ RLS-Negativtest**
  (als anderer Berater dürfen Kai-Daten weder lesbar noch änderbar sein).
- Der Tenant **Kai Blobel** (`b3cbf981-ea3e-4e6d-a993-2fe158ca0d48`) ist nie Ziel
  destruktiver Operationen.
- Frontend: Cache-Buster (`?v=`) + `sw.js` CACHE_VERSION hochzählen, sonst sehen Nutzer alten Code.
