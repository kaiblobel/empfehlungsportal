# Mitarbeiten am Empfehlungsportal

Willkommen! Diese Datei erklärt, wie du sicher am Projekt mitarbeitest, **ohne dass
versehentlich etwas an der Live-Seite oder den Daten kaputtgeht**. Bitte einmal komplett lesen.

## Das Grundprinzip (wichtig)
- **Live geht nur über Kai.** Niemand pusht direkt auf `main`. Du arbeitest auf einer
  Kopie und schlägst Änderungen per **Pull Request (PR)** vor. Kai prüft und merged — erst
  dann ist etwas live (`main` → automatischer Vercel-Deploy).
- **Die Datenbank (Supabase) gehört Kai** und wird nicht freigegeben. Im Code steht nur der
  öffentliche „anon"-Key (der steht ohnehin im Browser). Schreibzugriffe sind serverseitig
  per RLS geschützt — du kannst über den Key nichts kaputt machen.

## So legst du los (Fork + PR)
1. **Fork** dieses Repo in deinen eigenen GitHub-Account (Button „Fork" oben rechts).
2. **Klonen** und in **Claude Code** öffnen:
   ```
   git clone https://github.com/<dein-account>/empfehlungsportal.git
   ```
   Claude Code liest beim Öffnen automatisch `CLAUDE.md` (Architektur + Regeln), `README.md`
   und `RESTORE.md`. Du musst nichts extra anfordern — alles liegt im Repo.
3. Für jede Aufgabe einen **eigenen Branch**:
   ```
   git checkout -b fix/kurzer-name
   ```
4. Änderungen committen, in deinen Fork pushen, dann auf GitHub einen **Pull Request gegen
   `kaiblobel/empfehlungsportal:main`** öffnen. Kurz beschreiben: *was* und *warum*.
5. Kai reviewt, testet, merged. Fertig.

## Bitte NICHT anfassen
- **`js/config.js`** — enthält Keys/Tenant-Defaults. Niemals ändern oder Secrets committen.
- **`main`-Branch** — kein direkter Push (ist auch technisch geschützt).
- **Supabase / Datenbank-Migrationen** — Schema-/Daten-Änderungen macht Kai. Wenn dein
  Vorschlag eine DB-Änderung braucht: im PR beschreiben, **nicht** selbst ausführen.
- **Zum Ausprobieren das Testkennzeichen setzen** (seit Phase 208). Die App spricht mit der
  **Live-Datenbank**, ein abgeschickter Funnel landet dort als echte Empfehlung. Deshalb:
  beim Anlegen eines Promoters das Häkchen „Nur zum Ausprobieren" setzen, oder gleich ein
  ganzes Testkonto anlegen (Beraterkonten → Technische Angaben → „Testkonto"). Was daran
  hängt, erbt das Kennzeichen von allein, zählt in keiner Kennzahl mit, löst keine Mail und
  keine Mitteilung aus und lässt sich in den Beraterkonten gesammelt wieder entfernen.
  Ein sprechender Name bleibt trotzdem hilfreich, er ersetzt aber nicht mehr das Kennzeichen.

## Konventionen (kurz)
- **Kein Build-Step.** Reines HTML/CSS/JS + Supabase. Kein React/Vite/npm einbringen.
- **Versionsnummer hochzählen** bei sichtbaren Änderungen. Das macht ein Werkzeug an allen
  drei Stellen gleichzeitig (`js/config.js`, `sw.js`, `CHANGELOG.md`):

  ```
  node tools/version-setzen.mjs "Kurztitel der Phase"
  node tools/version-setzen.mjs "Kurztitel" --probe    # zeigt nur, was passieren würde
  ```

  Danach den neuen Changelog-Abschnitt füllen. `tests/versionsstand.test.mjs` prüft, dass
  die drei Stellen dieselbe Phase meinen.
- **Cache-Buster:** Wenn du eine `js/*.js`- oder `css/*.css`-Datei änderst, die per
  `?v=NN` eingebunden ist, die Nummer **in allen** HTML-Dateien und in `sw.js` +1. Sonst
  bekommt derselbe Nutzer je nach Seite zwei verschiedene Fassungen. Der Versionsstand-Test
  schlägt an, wenn eine Stelle zurückbleibt.
- **Versionen nicht in Tests festschreiben.** Ein Test darf prüfen, *dass* eine Datei
  eingebunden ist (`?v=\d+`), nicht *welche Nummer* sie gerade trägt. Sonst bricht bei jeder
  Veröffentlichung ein Dutzend Tests, die inhaltlich nichts damit zu tun haben. Ein Wächter
  in `tests/versionsstand.test.mjs` passt darauf auf.
- **Multi-Tenant / Branding:** Beraterspezifische Werte (Name/Foto/Telefon/…) nie hart
  reinschreiben — über `data-bb="…"`-Hooks lösen (siehe `js/berater-brand.js`). Inhalte
  (Belohnungen/Themen) sind geteilt und nur vom Admin editierbar.
- **Kleine, fokussierte PRs.** Lieber mehrere kleine als ein großer.

## Lokal ansehen
Statische Seite — am einfachsten mit einem lokalen Server, z.B.:
```
python -m http.server 8000
```
und dann `http://localhost:8000/programm.html` öffnen. (Direkt per `file://` funktionieren die
JS-Module nicht.)

## Fragen / Unsicher?
Im Zweifel **erst fragen, dann ändern** — besonders bei DB, `config.js` und allem, was live geht.
Lieber einmal zu viel abgestimmt. Danke fürs Mitmachen! 🙌
