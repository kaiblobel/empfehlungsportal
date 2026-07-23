# Pilot: Claudia — Anlage & Prüfplan

> Erster echter Mitbenutzer (Berater-Tenant). Status: **vorbereitet, noch NICHTS angelegt.**
> Regeln: keine Zugangsdaten in diesem Repo · keine weiteren Nutzer, bis Claudia vollständig getestet ist.

## Ausgangslage (geprüft am 2026-07-23)

- **Neue Berater starten leer:** kein Trigger klont Inhalte. Claudia braucht **eigene Themen (`vorlagen`) und Prämienstufen (`belohnungs_stufen`)**, sonst:
  - ist der mobile Promoter-Bereich ohne Themen (lädt pro Berater: `getVorlagen(berater_id)`),
  - materialisieren sich **keine Prämien** (`sync_praemien_for_empfehler` nutzt `belohnungs_stufen` des Beraters).
- **Lead-Zuordnung ist automatisch:** `set_empfehlung_berater_id` setzt `berater_id` aus dem Promoter → Claudias Leads landen bei Claudia. Isolation (Phasen 106/109) greift also automatisch.
- **Benachrichtigungen sind GLOBAL, nicht pro Berater:** `notify_interesse_trigger` und `check_stufe_erreicht` melden an die zentrale Telegram-/Mail-Konfiguration (= Kai). Claudias heiße Leads pingen **Kai**, nicht Claudia. Für den begleiteten Pilot okay — bewusst so.
- Bekannte Rauheit (kein Pilot-Blocker): Themen/Stufen werden an manchen Stellen global geladen (mehrere Tenants gemischt), an anderen pro Berater. Mit eigenen Inhalten für Claudia unkritisch; bei mehr Tenants später aufräumen.

## A) Anlage — Schritte (erst nach Kais Go ausführen)

1. **Berater-Zeile** anlegen: Name, `slug`, E-Mail, Rolle, Branding-Felder, `ist_aktiv=true`, **`ist_admin=false`**.
2. **Foto** in Bucket `berater-fotos` laden, `foto_url` setzen (sonst neutraler Initialen-Avatar).
3. **Inhalte seeden:** Claudias `vorlagen` (Themen) + `belohnungs_stufen` (Prämien-Roadmap) — als Muster aus Kais Bestand kopieren, dann inhaltlich anpassen. Optional Erfolgsgeschichten.
4. **Login anlegen:** über die Admin-Edge-Function `berater-create-login` (admin-gated, offizielle Auth-API). Passwort wird bei der Anlage generiert.
   - **Passwort NIE ins Repo/in den Chat.** Übergabe an Claudia über sicheren Kanal (Bitwarden-Eintrag / persönlich). Claudia ändert es beim ersten Login (`updateMyPassword` ist vorhanden).
5. **Smoke-Test (DB-seitig, durch Claude):** Login-Kontext erkennt Claudia, sie sieht nur ihre (leeren) Leads, `get_berater_public_by_id` liefert Claudias Branding.

### Daten, die Kai liefern muss (bleiben aus dem Repo heraus)
- Voller Name · E-Mail (= Login) · gewünschter `slug` (Vorschlag: `vorname-nachname`)
- Rolle/Titel · Foto (Datei)
- Optional: Terminlink (Bookings/Calendly) · WhatsApp-Nummer · Telefon
- **Impressum-/Datenschutz-Link** (rechtlich für ihre öffentlichen Seiten)
- Bestätigung: `ist_admin = nein`

## B) Prüfplan (Checkliste)

**Login & Dashboard**
- [ ] Claudia loggt sich ein und landet im Dashboard
- [ ] Dashboard zeigt Claudias Name/Foto/Rolle (nicht Kai)
- [ ] Claudia sieht 0 fremde Leads und keine fremden Berater-Datensätze (Phase 109)

**Kundenseiten & Branding**
- [ ] Claudias Empfänger-Link (`/e?token=…`) zeigt Claudias Social-Vorschau (og:image + Name)
- [ ] Promoter-Bereich zeigt Claudias Branding **und Claudias Themen**

**Kompletter Funnel (als Claudia-Tenant)**
- [ ] Promoter unter Claudia anlegen → Code → Promoter-Dashboard mit Claudia-Branding
- [ ] Empfehlung anlegen → `berater_id` = Claudia (Auto-Zuordnung)
- [ ] Link öffnen → „geöffnet" wird getrackt
- [ ] Interesse markieren → Lead erscheint in Claudias Dashboard (Telegram → Kai, bekannt)
- [ ] Rückrufwunsch → Status korrekt in Claudias Dashboard
- [ ] Auf „Kunde" setzen → Prämie materialisiert (setzt Claudias Prämienstufen voraus)

**Isolation & Betrieb**
- [ ] Aus Kais Sicht: Claudias Leads erscheinen NICHT in Kais Dashboard
- [ ] Rate-Limits (20/40/60) stören den normalen Betrieb nicht

**Abschluss**
- [ ] Im Pilot angelegte Test-Promoter/-Leads entfernen (oder bewusst als echt behalten)
- [ ] Erst danach: Freigabe für weitere Mitbenutzer

## Sicherheits-/Betriebsregeln für den Pilot
- Keine Zugangsdaten in diesem Repo oder im Chat.
- Keine weiteren Berater anlegen, bis Claudia vollständig getestet ist.
- Live-DB: nur echte Vorgänge; Testartefakte am Ende entfernen.
