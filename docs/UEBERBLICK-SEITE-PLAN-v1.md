# Überblicksseite „Das ganze Bild" · Plan v1

**Stand:** 18.08.2026 · Entwurf liegt vor, **noch nicht zur Veröffentlichung freigegeben**
**Zweig:** `konrad/ueberblick-seite`
**Entwurf:** `mockups/ueberblick-v1.html` (+ `.css`, `.js`)

---

## Warum es diese Seite gibt

In der Präsentation ist „Ganz allgemein" die erste Themenkachel. Beim Antippen öffnet sich
heute nur ein Block innerhalb der Präsentation (`programm.html`, `#themaUeberblick`). Der Text
dort ist knapp, weil Kai im Termin dazu spricht.

Was fehlt, ist die Fassung, die der Empfohlene **allein** liest. Bei KIDZ gibt es die längst
(`kidz-empfehlung.html` → `kidz-konzept.html`). Bei „Ganz allgemein" endet es beim Einstieg.

`empfaenger.html` bleibt unverändert der Einstieg mit den sechs Kapiteln und dem Finanzcheck.
Die neue Seite ist der Tiefgang dahinter.

## Adresse und Dateien

| | |
|---|---|
| Seite | `ueberblick.html` |
| Stil | `css/ueberblick.css` (eigene Datei, Klassen mit Präfix `ub-`) |
| Logik | `js/ueberblick.js` |
| Adresse | `/ueberblick` und `/ueberblick/:berater` |

Eigene CSS-Datei, weil `tests/kidz-hero-textbreite.test.mjs` hart auf `.hero` in
`css/kidz-konzept.css` greift. Der Dateiname darf nicht mit `kidz-` beginnen, sonst greift die
Icon-Ausnahme in `tests/icons.test.mjs` fälschlich.

## Aufbau

Empfehlungsband · Kopfzeile (Marke ist der Berater) · Hero · Streifen · **Aktuell: Reform 2027**
· sechs Teile · Wer sich meldet · **Drei Wege** · Kurz beantwortet · Fuß · Sticky-CTA

Die sechs Teile:

| | Überschrift | Bild |
|---|---|---|
| 01 | Erst einmal zusammenrechnen, was dir zusteht | keins, dafür eine Beispielsumme |
| 02 | Die Formel dahinter: 30, 30, 30 und 10 | `dvag-formel.webp` + kleiner Rechner |
| 03 | Und dann Zeile für Zeile | `dvag-haushaltsplan.webp` in Wisch-Schiene |
| 04 | Die Reihenfolge macht den Unterschied | `dvag-pyramide.webp` + drei antippbare Stufen |
| 05 | Zwei Konten, und der Monat wird ruhig | `dvag-zwei-konten.webp` in Wisch-Schiene |
| 06 | Verstehen statt vertrauen müssen | **bewusst keins** |

Zu 06: Ein Bürofoto zeigt immer eine bestimmte Person, und die Seite wird auch von anderen
Beratern ausgeliefert. Der Abschnitt trägt sich über die drei Fragen selbst.

Zu 02: Der Rechner nimmt das Netto und zeigt die vier Anteile in Euro. Er läuft ausschließlich
im Browser. Nichts wird gesendet, nichts gespeichert, und das steht auch darunter.

## Design

Dieselbe DNA wie die Präsentation, weil die Seite deren Inhalt fortsetzt: Outfit für
Überschriften, Inter für Fließtext, Fraunces nur als Akzent. Ink `#13191D` und Gold `#C8AA22`.
Schriften lokal, kein Google-Abruf.

Gerüst (Kopfzeile, `.section`, `.button`, Umbruchpunkte) folgt `css/kidz-konzept.css`, damit
sich die Seite im Portal vertraut anfühlt.

## Mandantenfähigkeit

Jeder Berater liefert die Seite unter seinem Namen aus. Drei Wege, in dieser Reihenfolge
(Muster aus `js/kidz-empfehlung-intro.js:97-121`):

1. **Empfehlung** · Token → `get_empfehlung_public` → `berater_id` → `getBeraterPublicById`
2. **Eigener Link / QR / Promoter** · `?berater=slug` (gegen `/^[a-z0-9-]+$/` geprüft) → `getBeraterPublicBySlug`
3. **Vorschau aus dem eigenen Portal** · eingeloggte Sitzung → `getCurrentBerater()`

Dazu `gemerkterBerater()` vor dem Netz und `merkeBerater()` danach, damit bei einem Partner
nicht kurz Kais Gesicht aufblitzt. Ein ungültiger Slug darf **nicht** still auf Kai zurückfallen.

Ausgehende Links (Sticky-CTA, Fuß, Wege) bekommen `token`, `berater` und `quelle` angehängt,
sonst geht der Berater beim Seitenwechsel verloren (Fehler aus Phase 192).

### Was aus dem Beraterdatensatz kommt

`get_berater_public` liefert 14 Spalten: `id, name, rolle, foto_url, bookings_url, whatsapp,
telefon, email, slug, impressum_url, datenschutz_url, buero_foto_url, team_foto_url,
buero_bildzeile`. **Kein Feld für Berufsjahre, Kundenzahl oder Auszeichnungen.**

Daraus folgt der Aufbau von „Wer sich meldet":

| Baustein | Verhalten |
|---|---|
| Portrait, Name, Rolle | aus dem Datensatz. Ohne Foto → Initialen-Avatar, **nie** Kais Bild |
| **Drei Versprechen** (Erst verstehen · Klar einordnen · Du entscheidest) | gelten für jeden, stehen **immer** |
| 20+ Jahre, 3k+ Haushalte | `data-default-berater-only`, fallen bei Partnern weg |
| Google-Rezension | `data-default-berater-only` |
| Anrufen · WhatsApp · E-Mail | aus dem Datensatz, fehlendes Feld blendet den Knopf aus |
| Karrierestufe und Anschrift im Fuß | `data-bb="rolle"` und `data-bb="adresse"`, siehe Fußzeile |

### Die Fußzeile

Der Absender steht in fünf Zeilen neben dem Zeichen:

```
TEAM WACHSBLEICHE          fest, die Dachmarke
Kai Blobel & Team          data-bb="name" + „& Team"
Regionaldirektion          data-bb="rolle"  (Karrierestufe)
An der Wachsbleiche 1a · 03046 Cottbus     data-bb="adresse"
Deutsche Vermögensberatung fest
```

Karrierestufe kommt aus dem vorhandenen Feld `rolle` (Regionaldirektion, Agenturleiter,
Regionalgeschäftsstelle …).

> **Offen: Die Anschrift hat kein Feld.** `get_berater_public` liefert 14 Spalten, eine Adresse
> ist nicht dabei. Auf allen bestehenden Seiten steht „An der Wachsbleiche 1a · 03046 Cottbus"
> fest im HTML, ein Partner in einer anderen Stadt bekäme also Kais Anschrift. Nötig sind:
> eine additive Migration (`alter table berater add column if not exists adresse text`),
> die Erweiterung von `get_berater_public` und `get_berater_public_by_id`, ein Feld im
> Admin-Formular (`js/berater-admin.js`), ein neuer Haken `data-bb="adresse"` in
> `js/berater-brand.js` und `BRAND_CACHE_PREFIX` auf `_v3_`, sonst liegt im Browser ein alter
> Datensatz ohne die Spalte.
> Schema-Änderungen macht laut `CONTRIBUTING.md` ausschließlich Kai. Bis dahin blendet der
> Haken die Zeile aus, wenn keine Anschrift da ist, statt eine fremde stehen zu lassen.

### Die Team-Marke als Rückfall

`assets/images/team-wachsbleiche-marke-96.webp` (3,9 KB, dieselbe Fassung wie im Wartungsschirm
und in `dashboard/index.html`; das Original mit 308 KB wäre für ein 50-Pixel-Zeichen Verschwendung).

| Stelle | Regel |
|---|---|
| Kopfzeile oben links | Porträt des Beraters, rund. **Kein Foto hinterlegt → Team-Marke** statt Initialen-Kürzel (`setzeKopfbild`, läuft nach `applyBeraterBrand`, weil es dessen Vorgabe ersetzt) |
| Fuß | immer die Team-Marke |

Die Marke steht rund, genau wie das Porträt: An derselben Stelle soll immer dieselbe Form
stehen. Das Bild ist quadratisch, der Kreis schneidet also nur die vier Ecken weg, das Siegel
bleibt vollständig.

> Zu klären: Im Emblem steht „Kai Blobel & Team". Bei einem Partner ohne eigenes Foto erscheint
> damit Kais Name im Logo neben dem Namen des Partners. Inhaltlich richtig, solange alle zum
> Team Wachsbleiche gehören.

Die drei Versprechen sind der Grund, warum der Abschnitt bei einem Partner nicht leer wirkt.
Ohne sie blieben dort nur Portrait und ein Satz übrig.

**Im Entwurf lässt sich das prüfen:** `?berater=partner` zeigt die Seite als fremder Berater,
`?berater=kai-blobel` als Standard. Der Umschalter ist nur im Mock, in der echten Fassung
kommen die Daten aus der Datenbank.

## Die drei Wege am Ende

Über den Karten steht der ehrliche Satz: **„Wenn du nichts auswählst, melde ich mich wie
besprochen bei dir."**

1. **Rückruf zur Wunschzeit** (hervorgehoben) · vier Zeitfenster → `markAnrufwunsch(token, slot)`
   aus `js/supabase.js`. Ohne Token wird **nicht** still bestätigt.
2. **Die sieben Fragen** · `data-bb="finanzcheck"`
3. **Termin selbst aussuchen** · `data-bb="booking"`, wird von `referral-tracking.js` selbst getrackt

Darunter als ruhige Zeile der Opt-out → `austragen.html?token=…`. Ohne Token ausgeblendet,
sonst verspricht die Seite ein Austragen, das nichts austrägt.

## Verdrahtung (Etappe 3)

- `api/share.js` braucht einen Eintrag in `pageByTemplate`, sonst ist die Seite über einen
  Empfehlungslink nie erreichbar.
- `vercel.json`: `/ueberblick` und `/ueberblick/:berater`, **vor** der Auffangregel.
- `dashboard/settings.html`: Vorschau-Kachel mit `data-berater-link` (die Auszeichnungen werden
  gegen die Kacheln gezählt).
- `tests/berater-auf-allen-seiten.test.mjs`: `js/ueberblick.js` in die Liste `SEITEN`.
- `empfaenger.html` Kapitel 4 und 6: Link auf die neue Seite, Token über `js/app.js` anhängen.

## Offene Punkte

- **DVAG-Material öffentlich:** Kai hat am 18.08.2026 entschieden, alle vier Darstellungen zu
  verwenden. `assets/images/praesentation/DVAG-MATERIAL.md` hält den Vorbehalt weiter fest.
- **Eigene Datenschutzerklärung** fürs Portal fehlt weiterhin (offen seit Phase 281). Betrifft
  diese Seite mit, weil sie öffentlich erreichbar wird.
- Die Zahlen im Aktuell-Block stammen aus `C:\Projekte\altersvorsorgedepot-check`. Ändert sich
  dort etwas, gehört es hier nachgezogen.

## Freigabe

> Noch offen. Der Entwurf wurde am 18.08.2026 gebaut und wartet auf Kais Ansicht.
> Nach der Freigabe wird dieser Absatz durch den Satz „zur Veröffentlichung freigegeben"
> samt Datum ersetzt, dann beginnt Etappe 2 (Realcode).
