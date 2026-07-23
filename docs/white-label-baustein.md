# White-Label-Baustein — Plan v2 (korrigiert)

> Status: **vorbereitet. Kein Anwendungscode geändert, keine Migration live, nichts veröffentlicht.**
> Verschärftes Prinzip: **Seiten starten neutral — auch vor dem Laden von JS und wenn JS fehlschlägt.**
> Kein fremder Berater darf je Kais Foto, Namen, Nummer, „Regionaldirektion", „Team Wachsbleiche",
> Leistungszahlen oder Rechtslinks sehen. Fehlt etwas → neutraler Platzhalter/ausgeblendet oder Fehler, **nie Kai**.

---

## 1) Korrigierte Anforderungen (verbindlich)

1. **Keine Kai-Zuordnung bei Leads.** Server-Fallback auf `ENV_BERATER_ID` entfällt. Ist Berater/Code/Slug nicht eindeutig **und** gültig → Empfehlung mit verständlicher Fehlermeldung **abweisen**. Niemals automatisch Kai.
2. **WhatsApp-Hygiene.** DB-Default (Kais Nummer) entfernen. Betroffen ist **nur Max** (bestätigt per Read). Max' Nummer nicht blind löschen: auf **leer** setzen (keine bestätigte eigene Nummer) → im Portal ausgeblendet. Migration nur vorbereiten.
3. **Leistungszahlen.** „20+ Jahre", „3.000+ Haushalte", „über 400 Banken" und Kais Bewertungen **nur bei Kai**. Bei allen anderen **vollständig ausblenden**. Keine neuen Leistungsfelder pro Berater.
4. **Freischaltung ist ein hartes Gate** (keine bloße Warnung): öffentlich aktiv nur mit Name, Slug, Foto, Rolle, E-Mail, Impressum, Datenschutz **und mindestens einem funktionierenden Kontaktweg** (WhatsApp ODER Telefon ODER Bookings). WhatsApp nie automatisch von Kai.
5. **Neutrale Ausgangslage** auf allen öffentlichen Seiten — auch beim ersten Rendern und bei JS-Ausfall. Keine statischen Kai-Werte im HTML.
6. **Zentrale Berater-Ermittlung, feste Reihenfolge:** (1) Code/Token aus URL → (2) `?berater=slug` aus URL → (3) eingeloggter Berater → (4) nur ohne URL **und** ohne Login: ein eindeutig zugehöriger gespeicherter Code → (5) sonst neutral bzw. Fehler. **Gespeicherte Browserdaten überschreiben nie einen ausdrücklichen URL-Parameter.**
7. **Tests:** kleiner Playwright-Test als reine Dev-Prüfung, Version gepinnt, Lockfile eingecheckt, kein Eingriff in den Vanilla-JS-Livebetrieb. Zusätzlich **serverseitige Datenzuordnung** testen, nicht nur sichtbare Texte.

---

## 2) Betroffene Dateien & Datenbankstellen

### Client-JS
| Datei | Was |
|---|---|
| `js/config.js` | ENV_BERATER_* sind Kais **Tenant-Daten**, nicht mehr globaler Fallback. Kein `\|\| ENV_*` mehr als Kai-Rückfall. |
| `js/berater-brand.js` | **Umkehr:** fehlende Felder aktiv neutralisieren (Initialen-Bild, leerer Text, Buttons/Rechtslinks ausblenden) statt statische Defaults stehenzulassen (`:20-21,56-57,66-68,90-97`). Zentrale `resolveBerater()` hier oder als neues Modul. |
| `js/app.js` | Ermittlungs-Präzedenz (`:224-267`), Stale-localStorage-Bug (`:226,252-258`), ENV-Foto/Name/Vorname (`:188,462-463,576`), Danke/Austragen-Persistenz, **`\|\| ENV_BERATER_ID` raus** (`supabase.js:30` s.u.). |
| `js/programm.js` | Ermittlung (`:543-567`), ENV-Foto (`:535-538`), Pre-Hero-Branding, Testimonials-Gating (`:571-590`), **`\|\| ENV_BERATER_ID`** (`:1256`), localStorage (`:996,1112,1315,1333`). |
| `js/empfehler.js` | Feste „Kai"-Strings (`:423,428,433,479`), **ENV_BERATER_ID** (`:350`), localStorage (`:18,24`). |
| `js/empfehler-mobile.js` | Feste „Kai"-Strings (`:26,475`), **ENV_BERATER_ID** (`:635`), localStorage (`:21,95`). |
| `js/baufi.js` | Kai-Copy, `defaultBookingUrl`/`advisorFirst`/ENV-ID-Vergleich (`:12,15,156-160`). |
| `js/supabase.js` | **`p_berater_id: … \|\| ENV_BERATER_ID` entfernen** (`:30`). |
| `js/beleg.js` | Name/Rolle-Fallback auf Kai (`:51,85`). |
| `js/dashboard.js` | ENV-Foto/Name-Fallback (`:74-75,81`) — eigenes Dashboard, niedrigere Priorität. |
| `js/hub.js` | Vorname-Fallback (`:95`); interne Texte (`:268-269`) niedrigprior. |
| `js/berater-admin.js` | **Freischalt-Gate** in der UI, **persistenter „Einladung senden"-Knopf** (Teil 8), `openInviteModal` verdrahten. |

### HTML — statische Kai-Werte neutralisieren + `data-bb`-Haken + Gating
| Datei | Stellen |
|---|---|
| `programm.html` | Pre-Hero Foto+Name **ohne `data-bb`** (`:101-103`), Standort „Team Wachsbleiche · Cottbus" **ohne `data-bb`** (`:978`), Rolle-Default (`:968`), Testimonials (`:814,821-845`), Titel (`:7`), Rechtslinks (`:984-985`), Hero-`alt` (`:484`). |
| `empfaenger.html` | Leistungszahlen (`:52,68` — teils per JS injiziert), Rechtslinks (`:59`), Name (`:37`), Titel (`:7`), Foto (`app.js:462-463`). |
| `baufi.html` | Kai-Copy durchgehend (Hero `:909,916`, `kai-quote :985`, Zahlen `:932`, viele Fließtext-Stellen), Rechtslinks (`:1147`), Titel (`:7`), Foto (`:928`). |
| `empfehler.html` | Foto (`:16`), Name/Vorname (`:19,98`), Platzhalter „Warum empfiehlst du Kai?" (`:80`), Titel (`:9`). |
| `empfehlen.html` | Vorname-Stellen (`:43,68,91,94,100`), Titel (`:7`). |
| `danke.html` | Titel (`:7`), Signatur (`:22`), Branding nur über localStorage (`:31-37`) → Berater durchreichen. |
| `austragen.html` | Titel (`:7`), **kein Branding** → Berater aus `token` auflösen (`app.js:666-671`). |
| `assets/images/` | `kai-portrait.jpg` als statischer Default → durch neutrales Platzhalter-Bild/Inline-Initialen ersetzen. |

### Datenbank
| Stelle | Änderung (vorbereitet) |
|---|---|
| `berater.whatsapp` Default | Default `'4915154776159'` **droppen**; Max' Wert auf `null`. |
| `create_empfehlung_public` | Kai-Fallback entfernen → bei unbestimmbarem Berater **Fehler werfen**. |
| `set_empfehlung_berater_id` (Trigger) | Kai-Fallback entfernen → bei fehlendem/ungültigem Berater **Fehler werfen** (bricht Insert sauber ab). |
| `auto_link_empfehler` | konsistent halten: legt Promoter nur mit gültigem `berater_id` an. |
| **Neu:** `berater_ist_vollstaendig()` + Trigger | Freischalt-Gate: `ist_aktiv`-Übergang `false→true` (und Insert mit `ist_aktiv=true`) nur bei Vollständigkeit; bestehende aktive Berater werden **nicht** rückwirkend blockiert (nur der Aktivierungs-Übergang wird geprüft). |

---

## 3) Migrationsstrategie (vorbereitet, gestaffelt, NICHT live)

Alle als eigene `schema-phaseNNN.sql`, jeweils erst zeigen, dann nach Freigabe anwenden. Reihenfolge:

1. **`schema-phase110.sql` · WhatsApp-Hygiene** (kleinste, dringendste)
   - Default entfernen: `alter table public.berater alter column whatsapp drop default;`
   - Max **nicht** über feste UUID, sondern über **Slug + geerbte Nummer mit Guard „genau eine Zeile"** (Read-Check bestätigt: exakt 1 Zeile `max-kudlek`):
   ```
   do $$
   declare v_n int;
   begin
     select count(*) into v_n from public.berater
      where slug='max-kudlek' and whatsapp='4915154776159'
        and id <> 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';
     if v_n <> 1 then
       raise exception 'Abbruch: erwartete genau 1 Zeile, gefunden %', v_n;
     end if;
     update public.berater set whatsapp = null
      where slug='max-kudlek' and whatsapp='4915154776159'
        and id <> 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';
   end $$;
   ```
   Rückbau: Max' Nummer manuell setzen (Default bewusst NICHT wieder eintragen).

2. **`schema-phase111.sql` · Keine Kai-Zuordnung**
   - `create_empfehlung_public`: Berater eindeutig auflösen (gültiger `p_berater_id` **oder** über gültigen Promoter); sonst `raise exception 'Empfehlung konnte keinem gültigen Berater zugeordnet werden.'`.
   - `set_empfehlung_berater_id`: bei `null`/ungültig `raise`, statt Kai zu setzen.
   - Vorbedingung/Check: vorher prüfen, dass **alle** bestehenden Promoter einen gültigen `berater_id` haben (sonst würde deren Flow abgewiesen). Read-only-Check ist Teil der Vorbereitung.
   - Rückbau: Funktions-Body aus `schema-phase106/108` wiederherstellen.

3. **`schema-phase112.sql` · Freischalt-Gate**
   - `berater_ist_vollstaendig(b)` prüft Name, Slug, Foto, Rolle, E-Mail, Impressum, Datenschutz, ≥1 Kontakt.
   - Trigger `before update/insert on berater`: nur beim Übergang zu `ist_aktiv=true` erzwingen; sonst durchlassen (bestehende aktive Berater bleiben editierbar).
   - Admin-UI zeigt fehlende Felder an und sperrt den Aktiv-Schalter clientseitig zusätzlich.
   - Rückbau: Trigger + Funktion droppen.

**Datenhygiene-Hinweis:** Nach Phase 110 hat Max keinen Kontaktweg mehr (Tel/Bookings leer, WhatsApp leer) → er ist per Gate **nicht** öffentlich aktivierbar, bis ein eigener Kontakt + Impressum/Datenschutz vorliegen. Das ist gewollt.

---

## 4) Testmatrix (Kai · Max · Claudia · unvollständiger Berater)

Legende: ✅ sichtbar/korrekt · 🚫 ausgeblendet · ⛔ nicht möglich

| Prüfpunkt | Kai (vollständig, Default) | Max (Foto+Rolle+Mail, ohne Kontakt/Impressum) | Claudia (vollständig, neu) | Unvollständiger neuer Berater |
|---|---|---|---|---|
| Foto/Name/Rolle | ✅ Kai | ✅ Max | ✅ Claudia | neutral (Initialen), **kein Kai** |
| „20+ Jahre / 3.000+ / 400 Banken" | ✅ | 🚫 | 🚫 | 🚫 |
| Kai-Bewertungen | ✅ | 🚫 | 🚫 | 🚫 |
| WhatsApp/Tel/Bookings | ✅ Kais | 🚫 (leer → ausgeblendet) | ✅ Claudias | 🚫 |
| Impressum/Datenschutz | ✅ Kais | 🚫 (nicht Kais Links) | ✅ Claudias | 🚫 (nie Kais Links) |
| Lead-Zuordnung (server) | → Kai | → Max | → Claudia | → richtiger Berater **oder Fehler**, **nie Kai** |
| Öffentlich aktivierbar | ✅ | ⛔ (Kontakt+Impressum fehlen) | ✅ | ⛔ + Anzeige fehlender Felder |
| Neutral vor JS / bei JS-Fehler | kein Kai-Flash | kein Kai-Flash | kein Kai-Flash | kein Kai |
| `?berater=slug` trotz altem localStorage-Code | URL gewinnt | URL gewinnt | URL gewinnt | URL gewinnt |
| Danke- & Austragen-Seite | richtiger Berater | richtiger Berater | richtiger Berater | richtiger Berater / neutral |

**Testarten:**
- **Playwright (Dev-only):** neue `package.json` nur mit devDependencies (Playwright **gepinnt**), `package-lock.json` eingecheckt, `playwright.config`, Specs in `tests/e2e/`. Lädt die statischen Seiten lokal je Berater und prüft alle Zeilen oben inkl. „kein Kai bei deaktiviertem JS/vor Hydration". **Kein** Eingriff in die ausgelieferten Vanilla-JS-Dateien.
- **Server-Zuordnung:** erweitert die vorhandenen Node-Tests (`tests/*.cjs`) bzw. SQL-Simulation (Rollback-Transaktion): `create_empfehlung_public` ordnet gültigem Berater zu **oder** wirft Fehler — nie Kai; `set_empfehlung_berater_id` wirft bei fehlendem Berater.

---

## 5) Risiken & Rückbauplan

| Risiko | Gegenmaßnahme |
|---|---|
| Neutralisieren bricht **Kais eigene** Seiten (falls sein Branding nicht lädt) | Kai wird wie jeder Berater über Slug/Login aufgelöst; Playwright-Test deckt Kai explizit ab. |
| Attribution-Reject bricht einen legitimen Flow (Promoter ohne `berater_id`) | Vorab-Read: prüfen, dass alle Promoter gültigen `berater_id` haben; Reject greift nur bei echt Unbestimmbarem. |
| Freischalt-Gate blockiert **bestehende** aktive, unvollständige Berater beim Bearbeiten | Trigger erzwingt nur den Übergang `false→true`; bestehende aktive Zeilen bleiben editierbar (werden nur als unvollständig markiert). |
| WhatsApp-Default weg → neue Berater ohne Nummer | Gewünscht; UI blendet leere Nummer aus; Gate verlangt ≥1 anderen Kontakt. |
| Playwright bringt npm-Tooling | Rein Dev; keine Laufzeit-Auswirkung auf die Seite; gepinnt + Lockfile. |
| Sichtbare Kundenseiten-Änderungen | Erst Mock im Browser zeigen, dann Real-Code; kein Push ohne Freigabe. |

**Rückbau gesamt:** Client-Änderungen über Git zurücknehmen (ein Feature-Branch/Commits, kein Push bis Freigabe). Jede Migration einzeln reversibel (Defaults/Funktions-Bodies aus `schema-phase106/108` wiederherstellen, Gate-Trigger droppen). WhatsApp-Default-Rückbau bewusst nur manuell.

---

## 6) Berater-Einladung — AUS DEM BAUSTEIN ENTFERNT → Backlog
Nicht Teil dieses White-Label-Bausteins. Regeln für die spätere, separate Umsetzung:
- **Keine Passwörter per WhatsApp oder E-Mail versenden.**
- Einladung ausschließlich über einen **zeitlich begrenzten Link**, über den der Berater sein Passwort **selbst** festlegt.
- Das vorhandene tote `openInviteModal` (`berater-admin.js:370`) erst dann verdrahten, wenn dieser Link-Mechanismus (Backend, Ablaufzeit) steht.

---

## 7) Read-only-Check (Ergebnis, Stand jetzt)

**Promoter (19) — alle sauber:** 0 ohne `berater_id`, 0 mit nicht existentem Berater, 0 bei inaktivem Berater, 0 doppelte Codes, 0 leere Codes.
**Empfehlungen (27) — alle sauber:** 0 ohne `berater_id`, 0 mit ungültigem Berater, 0 Mismatch zum Promoter-Berater, 17 bei Kai (seine eigenen), **0 „bei Kai, aber Promoter nicht Kai"**.
→ **Auswirkung auf bestehende Abläufe: keine.** Das Entfernen des Kai-Fallbacks ändert **keine** bestehende Zeile; es betrifft nur zukünftige, unbestimmbare Inserts (die dann abgewiesen werden). Phase 110 betrifft genau **1** Zeile (Max).

### Bereits aktive, aber unvollständige Berater (Zusatzbefund)
| Berater | fehlt jetzt | nach Phase 110 zusätzlich |
|---|---|---|
| Kai | — (vollständig) | — |
| Sandro Wernicke | — (vollständig) | — |
| **Sven Augustin** | Impressum, Datenschutz | — |
| **Josephine Bürger** | Foto, Rolle, Impressum, Datenschutz | — |
| **Max Kudlek** | Impressum, Datenschutz | **Kontaktweg** (Tel/Bookings leer, WhatsApp wird geleert) |

→ Der Gate-Fehler betrifft **nicht nur Max**: Sven und Josephine sind ebenfalls öffentlich aktiv, aber ohne Impressum/Datenschutz (rechtlich relevant).

## 8) Korrigierte Lösung: bereits aktive, unvollständige Berater
Das Gate greift nur beim Übergang `false→true` — bestehende aktive Unvollständige blieben sonst öffentlich. Kein automatisches Deaktivieren. Optionen (mit Wirkung):

- **A · Vor Phase 110 vervollständigen** (empfohlen, kein Ausfall): fehlende Felder ergänzen — Max: eigener Kontakt (WhatsApp/Tel/Bookings) + Impressum/Datenschutz; Sven + Josephine: Impressum/Datenschutz (Josephine zusätzlich Foto/Rolle). Danach bestehen alle das Gate; öffentliche Seiten bleiben online.
- **B · Nach ausdrücklicher Freigabe vorübergehend deaktivieren**: nur die unvollständigen Berater `ist_aktiv=false` setzen, bis vervollständigt. Wirkung: deren öffentliche Seiten sind offline (keine unvollständige/rechtlich unklare Seite live). Reversibel per Vervollständigung + Reaktivierung (dann greift das Gate).
- **C · Sauberer Weg ohne öffentliche unvollständige Seite**: neuen Status „vorbereitet/nicht öffentlich" einführen (Berater existiert + Login möglich, aber Kundenseiten liefern neutral „noch nicht verfügbar" statt Inhalt). Mehr Aufwand (neues Feld + Auslieferungs-Logik), aber sauberste Dauerlösung; für den Pilot ggf. überdimensioniert.

**Empfehlung:** A für Sven/Josephine (nur Rechtslinks bzw. Foto/Rolle) und für Max, sobald sein eigener Kontakt + Impressum/Datenschutz vorliegen; bis dahin für Max B (nach deiner Freigabe), damit keine unvollständige Seite unter seinem Namen öffentlich ist. **Nichts davon jetzt ausgeführt.**

---
_Nächster Schritt: nur nach ausdrücklicher Freigabe — dann Umsetzung in der Reihenfolge §3/§2, sichtbare Seiten zuerst als Mock, kein Live-Deploy ohne „go"._
