# Auto-Deploy Setup

Dieser Repo hat einen GitHub Actions Workflow (`.github/workflows/deploy.yml`),
der bei jedem Push auf `main`/`master` automatisch per FTPS zu All-Inkl deployt.

## Einmaliges Setup

Bevor der Workflow funktioniert, müssen drei **Repository Secrets** gesetzt werden.
Geh auf GitHub → diesen Repo → **Settings → Secrets and variables → Actions**:

| Secret | Wert |
|---|---|
| `FTP_SERVER` | `w0191563.kasserver.com` |
| `FTP_USERNAME` | `f018274b` |
| `FTP_PASSWORD` | (aktuelles KB-Live-Passwort) |

## Zielverzeichnis ändern

Falls die Zielsubdomain anders heißt: **Settings → Secrets and variables → Actions**
→ Tab **Variables** → neue Variable `FTP_SERVER_DIR` mit dem korrekten Pfad anlegen
(z.B. `/meinesubdomain.kaiblobel.de/`). Überschreibt den Default-Pfad in deploy.yml.

## Erster Lauf

Nach dem Secret-Setup: einen kleinen Commit & Push → der Workflow läuft, du
siehst ihn unter **Actions** im Repo. Ab dann ist jeder Push = Live-Deploy.

