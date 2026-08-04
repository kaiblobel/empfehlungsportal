# Übergabe: Benefits als vertikale Mobile-First-Meilensteinreise

Stand: 04.08.2026 · Auftrag: `docs/2026-08-04-conrad-benefits-meilensteine.md`

**Status: gestoppt vor `main`, gestoppt vor Live, Datenbank unverändert.**

---

## 1 · Zweig und Commit

| | |
|---|---|
| Zweig | `conrad/benefits-vertical-mobile-first` |
| Abgezweigt von | `76f8327` — **nicht** `68cd0c7` wie im Auftrag, siehe Abweichung 1 |
| Push auf `main` | nein |
| Live-Veröffentlichung | nein |
| Live-Datenänderung | nein |
| echte Empfehlungen / Kundenstatus angelegt | nein |

---

## 2 · Abweichungen vom Auftragstext

**Abweichung 1 — Basis-Commit.** Der Auftrag nennt `68cd0c7` (v1.151). Zum Zeitpunkt der Umsetzung stand `main` bereits auf `76f8327` (v1.152, eingedampfter Themen-Editor). Ich habe von `76f8327` abgezweigt; von `68cd0c7` aus wären diese Änderungen beim Zusammenführen verloren gegangen.

**Abweichung 2 — Rückwirkungs-Analyse liegt schon vor.** Sie ist Teil dieser Übergabe (Abschnitt 6) statt eine offene Aufgabe. Ergebnis: heute folgenlos.

**Abweichung 3 — Testbefehl.** `node --test tests/` schlägt fehl (Node nimmt das Verzeichnis nicht als Testziel an). Richtig ist `node --test tests/*.test.mjs tests/*.test.cjs`.

**Abweichung 4 — Bildnachweise.** In meiner Umgebung lässt sich kein Browser öffnen. Statt Screenshots liefere ich eine messende Prüfseite (Abschnitt 5). Die Sichtprüfung steht noch aus und ist Voraussetzung für jede Freigabe.

---

## 3 · Geänderte Dateien

| Datei | Was und warum |
|---|---|
| `js/belohnungs-reise.js` | **neu** · Stufenlogik und Markup als reine Funktionen. Ohne DOM und Netz prüfbar; dieselbe Quelle nutzen Kundenseite und Prüfseite, damit sie nicht auseinanderlaufen. |
| `tests/belohnungs-reise.test.mjs` | **neu** · 40 Zusicherungen gegen synthetische Fixtures: Aufbau, Gesamtwert, Lücken, Dubletten, Prämien-Deckung, Escaping. |
| `programm.html` | Abschnitt `#belohnungen` neu geordnet: Zählweise-Hinweis, senkrechte Reise, Gesamtwert, Wahlfreiheit, „Auch einfach so". Roadmap, Filter-Chips und Galerie entfallen. `#belohnungen` und der CTA auf `#anmelden` bleiben. |
| `js/programm.js` | Der Benefits-Block (217 Zeilen mit Roadmap, Filtern, Galerie, abgeleiteten Bonusstufen) ist durch 88 Zeilen ersetzt, die eine Reise aus echten Daten rendern. |
| `css/programm.css` | 117 tote Regelblöcke entfernt (7.614 → 6.882 Zeilen), danach die neuen mobilen Regeln ergänzt (→ 7.258). Präsentations-Modus umgestellt. |
| `js/empfehler-mobile.js` | Wunschziele nur noch Meilensteine; gespeicherte Altziele bleiben sichtbar. |
| `js/promoter-detail.js` | Dasselbe für das Ziel-Auswahlfeld des Beraters. |
| `schema-phase127.sql` | **neu, nicht angewandt** · die acht fehlenden Stufen, `wert_label` für Stufe 1, `highlight` für die Meilensteine, `sort_order = stufe`. Mit Rollback-Block. |
| `mockups/benefits-pruefung.html` | **neu** · Sichtprüfung in 320 / 390 / 430 / 768 px plus Rückfall ohne Bilder. |
| `CHANGELOG.md` | Eintrag unter „Unveröffentlicht", bewusst ohne Versionsnummer. |
| `programm.html`, `empfehler.html`, `dashboard/promoter.html`, `sw.js` | Cache-Buster. |

**Nicht angefasst:** `js/config.js` und die sichtbare Version (erst im Freigabeschritt), `CLAUDE.md`, Empfehlungs-Funnel, Empfänger-Seiten, Anmeldung, Benachrichtigungen, Buchungsstrecke, Dashboard-Navigation. Fremde unversionierte Dateien (`mockups/benefits-meilensteine-v2/v3/v4`, `mockups/themen-editor-v1.html`) bleiben unversioniert und unberührt.

---

## 4 · Automatische Tests

```
$ node --test tests/*.test.mjs tests/*.test.cjs
tests/belohnungs-reise.test.mjs         pass 1  fail 0     (neu)
tests/date-utils.test.mjs               pass 1  fail 0
tests/bookings-event-handler.test.cjs   pass 1  fail 0
tests/referral-event-handler.test.cjs   pass 1  fail 0
tests/share-handler.test.cjs            pass 1  fail 0
```

Der neue Test deckt die im Auftrag geforderten Fälle ab — alle gegen synthetische Fixtures, ohne Netz und ohne Datenbank:

| Prüfung | Ergebnis |
|---|---|
| 15 Stationen, 10 Geldstufen, 5 Bild-Meilensteine | ✓ |
| Meilensteine genau bei 2, 5, 7, 10, 15 | ✓ |
| Gesamtwert exakt 4.798 € | ✓ |
| 0 / 1 / 4 / 14 / 15 Kunden → genau die Stufen 1..n | ✓ |
| fehlende Zeile → **keine** erfundene Stufe, Lücke wird gemeldet | ✓ |
| fehlende Zeile → auch keine Prämie (deckungsgleich mit `sync_praemien_for_empfehler`) | ✓ |
| Dubletten fliegen raus, erster Treffer gewinnt | ✓ |
| Titel, Beschreibung und Bild-Adresse werden escaped | ✓ |
| deutsche Wertformate: „2.000 €" → 2000, „1.234,50 €" → 1234.5 | ✓ |

---

## 5 · Sichtprüfung — **steht noch aus**

Öffnen: `mockups/benefits-pruefung.html`

Die Seite rendert die echte Reise mit dem echten Stylesheet in vier Rahmen (320 / 390 / 430 / 768 px) plus einem Rahmen ohne Bilder. Unter jedem Rahmen misst sie den waagerechten Überlauf und schreibt „✓ kein waagerechter Überlauf" oder eine Warnung mit Pixelzahl.

Zusätzlich per Auge zu prüfen: Reihenfolge der 15 Stufen, Lesbarkeit der Kartentexte, Stufe 15 sichtbar größer als Stufe 5, Tastaturfokus, Verhalten bei reduzierter Bewegung.

Der Präsentations-Modus lässt sich nur auf der echten Seite prüfen (`programm.html?mode=slides`) bei 1024×768 und 1440×900: nur die fünf Bildkarten, die Geldstufen als ein Satz, kein Gesamtwertblock, Foliennavigation unverändert.

---

## 6 · Auswirkungsanalyse zur Rückwirkung (lesend, ohne Namen)

Gefahren am 04.08.2026 gegen die Live-Datenbank, ausschließlich `select`:

| Kennzahl | Wert |
|---|---:|
| Promoter mit mindestens einem gewonnenen Kunden | 7 |
| höchste Kundenzahl eines einzelnen Promoters | 3 |
| bestehende Prämien insgesamt | 11 |
| davon offen | 9 |
| **zusätzliche Prämien durch die Migration** | **0** |
| **zusätzlicher Gegenwert** | **0 €** |

Die neuen Stufen beginnen bei 4, niemand hat bisher mehr als 3 gewonnene Kunden. Die Rückwirkung ist heute folgenlos — mit jedem weiteren gewonnenen Kunden kann sie es aufhören zu sein.

---

## 7 · Offene Entscheidungen für Kai

1. **Migration anwenden?** `schema-phase127.sql`. Ohne sie zeigt die Seite nur 7 statt 15 Stufen (sie erfindet nichts mehr) — der Präsentations-Effekt der Reise wäre halbiert.
2. **Rückwirkung** — siehe Abschnitt 6, heute ohne Kosten.
3. **Gegenwerte und Wahlfreiheit** — 100 / 150 / 449 / 500 / 699 / 2.000 €; ob Premium-Prämien voll in Geld auszahlbar sind; ob Spenden immer in gleicher Höhe möglich sind; ob Versand und Reisenebenkosten enthalten sind.
4. **Bedingungen und Compliance** — die Seite sagt jetzt „Gezählt wird, wer Kunde wird". Die FAQ nennt zusätzlich den ersten Geldeingang als Auszahlungszeitpunkt; beides sollte fachlich abgenommen werden. Eine rechtliche Prüfung ist diese Arbeit ausdrücklich nicht.
5. **Mallorca-Bild — erledigt, aber noch unversioniert.** Im Arbeitsbaum liegt bereits ein ersetztes `assets/images/programm/mallorca.jpg` (1.200 × 1.500, 4:5) samt `assets/images/programm/BILDQUELLEN.md`. Die dort dokumentierte Prüfsumme `99AB93…C312EC` stimmt mit der Datei überein. Beides stammt **nicht** von mir und ist laut Arbeitsgrenze nicht angefasst worden — es liegt weiterhin unversioniert da und muss beim Freigabeschritt mit eingecheckt werden. Die Reise bindet das Bild bereits ein: Sie zieht die Adresse aus `bild_url` der Datenbank, dort steht `/assets/images/programm/mallorca.jpg`.
6. **Version und Veröffentlichung** — `js/config.js` und `CLAUDE.md` sind unberührt; die Versionsnummer vergibst du im Freigabeschritt.

---

## 8 · Wenn du freigibst, ist die Reihenfolge

1. Sichtprüfung (Abschnitt 5)
2. Entscheidungen 2 bis 5
3. `schema-phase127.sql` anwenden, Gegenproben am Dateiende fahren
4. Version in `js/config.js` setzen, `CHANGELOG.md`-Eintrag auf die Versionsnummer heben, `CLAUDE.md`-Pass aktualisieren
5. Zweig nach `main` zusammenführen und pushen
