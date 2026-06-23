# Empfehlungsportal – Feedback-Briefing für Claude Code

## Nutzungskontext (wichtig für die Bewertung der Feedback-Punkte)

Die Seite `programm.html` wird **live im Kundengespräch** eingesetzt — der Berater öffnet sie
gemeinsam mit dem Kunden und geht sie Schritt für Schritt durch. Das bedeutet:

- Der erste Eindruck muss **professionell und vertrauenswürdig** wirken
- Bedienelemente müssen auf dem Handy **sicher und einfach klickbar** sein
- Es gibt einen **Präsentationsmodus** für diese Situation
- Der Kunde sitzt daneben und schaut mit — keine sichtbaren Fehler, kein Rumklicken

Das ist kein Self-Service-Funnel — es ist ein **moderiertes Gesprächstool**.

---

## An Claude: So gehst du mit dieser Datei um

Diese Datei enthält Feedback von **Sandro Wernicke** (Berater-Slug: `sandro-wernicke`) zu
`programm.html`. Der Code liegt im geklonten Repo.

**Deine Aufgabe:**
1. Lies alle Punkte durch
2. Finde die relevante Stelle im Code (Dateiname + Zeile)
3. Bewerte: Ist das Problem real? Gibt es eine einfache Lösung?
4. Präsentiere Kai **jeden Punkt einzeln** und frag: *"Soll ich das umsetzen?"*
5. Setze erst um, wenn Kai zustimmt — keine Eigeninitiative

---

## Feedback-Punkte

---

### #1 — NPS-Beschriftung läuft auf Mobil zusammen
**Seite:** `programm.html` · **CSS:** `css/programm.css` ca. Zeile 3836  
**Was Sandro sieht:** Unter den Zahlen 1–10 steht `GAR NICHTTOTAL ZUFRIEDEN` ohne sichtbare
Trennung — die zwei Labels kleben zusammen.  
**Code-Befund:** HTML-Struktur ist korrekt (zwei separate `<span>`-Elemente im Flex-Container
mit `justify-content: space-between`). Der Fehler tritt wahrscheinlich nur auf kleinen Mobilscreens
auf, wenn der Container nicht die volle Breite einnimmt.  
**Vorschlag:** Prüfen ob `.nps-scale-labels` auf Mobil `width: 100%` hat. Alternativ
`min-width: 100%` setzen.

---

### #2 — NPS-Buttons zu klein auf Mobil
**Seite:** `programm.html` · **CSS:** `css/programm.css` ca. Zeile 3795  
**Was Sandro sieht:** Die Zahlen-Buttons (1–10) sind zu klein zum Antippen auf dem Handy.
Der "Ich muss hier draufklicken"-Effekt fehlt. Wirkt zu spielerisch für ein Kundengespräch.  
**Code-Befund:** Buttons haben `padding: 0` und `aspect-ratio: 1/1`. Auf Mobil ist das Grid
5-spaltig (`repeat(5, 1fr)`) — die Buttons bekommen nur die Breite der Grid-Zelle.  
**Vorschlag:** Auf Mobil `min-height: 52px` für `.nps-btn` setzen (Apple HIG empfiehlt 44px
Touch-Target). Zusätzlich den Hover/Active-Effekt visuell verstärken, damit der Klick-Impuls
klarer wird.

---

### #3 — Idee: Frage zur Einstellung vor dem Gespräch ergänzen
**Seite:** `programm.html` — Feedback-Bereich  
**Hintergrund:** Sandro nutzt einen analogen Feedbackbogen mit dieser Frage:  
*"Welche Einstellung hatten Sie vor dem Termin zu diesem Gespräch?"*  
Antwortoptionen: negativ · skeptisch · interessiert · neugierig  
**Warum das stark ist:** Der Kunde bestätigt eine persönliche Wandlung (z.B. "war skeptisch,
jetzt überzeugt"). Das macht eine Weiterempfehlung glaubwürdiger und emotionaler.  
**Vorschlag:** Als optionalen Schritt vor oder nach der Zufriedenheitsskala einbauen — gleicher
Button-Stil wie die Familie/Kinder-Buttons im Rechner.  
**Hinweis:** Inhaltliche Erweiterung — bitte gemeinsam mit Kai entscheiden.

---

### #4 — Idee: Direkte Brücke zur Empfehlung nach positivem Feedback
**Seite:** `programm.html`  
**Hintergrund:** Analog-Feedbackbogen endet mit:  
*"Können Sie mich und unser heutiges Gespräch guten Gewissens weiterempfehlen?"* (ja/nein)  
**Vorschlag:** Ähnliche Frage als letzten Schritt vor dem Empfehlungs-CTA. Wer "ja" klickt →
direkt zum Empfehlungs-Link. Wer "nein" klickt → Kontakt-Option (Telefon/WhatsApp).  
**Warum das gut ist:** Schließt den Loop: Feedback → Bestätigung → Empfehlung. Logischer Abschluss
des Gesprächsbogens.  
**Hinweis:** Inhaltliche Erweiterung — bitte gemeinsam mit Kai entscheiden.

---

---

### #5 — Belohnungs-Roadmap: Stufen-Darstellung zu klein und unverständlich
**Seite:** `programm.html` · **CSS:** `css/programm.css` ca. Zeile 2539  
**Was Sandro sieht:** Die Zahlenreihe (1–15) ist auf Mobil zu klein zum Antippen. Außerdem ist
das System schwer verständlich — leere Punkte zwischen den Zahlen wirken zufällig.  
**Code-Befund:** Es gibt zwei Typen:  
- *Premium-Stufen* (1, 2, 3, 5, 7, 10, 15): goldene Kreise, 36px, Zahl sichtbar  
- *Standard-Stufen* (4, 6, 8, 9, 11–14): winzige 16px-Punkte, **Zahl hat `font-size: 0`** — komplett unsichtbar  
Auf Mobil schrumpfen Premium-Kreise auf 30px, Standard-Punkte auf 14px.

**Konkrete Verbesserungsvorschläge — bitte mit Kai prüfen, welche er umsetzen möchte:**

**Option A — Zahlen auf allen Punkten zeigen (kleiner Aufwand):**  
Standard-Stufen bekommen eine lesbare Zahl (klein, gedimmt), statt `font-size: 0`.
Minimum-Größe auf Mobil: 20px für Standard-Punkte.  
→ Vorteil: sofort verständlich, welche Stufe welche ist. Geringer Code-Aufwand.

**Option B — Reward-Label unter Premium-Stufen ergänzen (mittlerer Aufwand):**  
Unter jedem goldenen Kreis (1, 2, 3, 5, 7, 10, 15) ein kurzes Label: z.B. "100 €", "Apple Watch",
"Mallorca". Der Kunde sieht sofort, was ihn bei Stufe 7 oder 10 erwartet.  
→ Vorteil: viel mehr Motivation. Nachteil: auf Mobil braucht die Roadmap mehr Höhe.

**Option C — Roadmap auf Mobil vereinfachen (größerer Aufwand):**  
Auf kleinen Screens nur die 7 Premium-Stufen als horizontale Karten zeigen (ähnlich den
Belohnungs-Chips darunter), Standard-Stufen als "dazwischen: 100 €" im Fließtext erklären.
Volle Roadmap nur auf Desktop.  
→ Vorteil: auf Mobil sofort lesbar. Für ein Kundengespräch am Handy die beste Lösung.

**Empfehlung:** Option B + minimaler Teil von A (Zahl sichtbar machen) ist das beste
Verhältnis aus Aufwand und Wirkung.

---

---

### #6 — Reward-Karten: Texte überarbeiten
**Seite:** `programm.html` · **Quelle:** Datenbank (Supabase) — kein Code-Change nötig  
**Code-Befund:** Titel, Beschreibung und Wert-Label der Belohnungs-Karten werden aus der DB geladen
(`s.titel`, `s.beschreibung`, `s.wert_label`). Änderungen direkt in Supabase vornehmen.

**Konkrete Punkte:**

**6a — "Standardvergütung" umbenennen**  
Sandro: *"Das klingt nach Standard — was wir hier machen ist absolut kein Standard,
das ist etwas Besonderes für unsere Kunden."*  
Vorschlag für neuen Namen (zur Auswahl für Kai): `Empfehlungs-Bonus` · `Dankeschön-Vergütung` ·
`Basis-Belohnung` · oder was auch immer den Charakter des Programms besser trifft.

**6b — "+ Kundenlos" aus Titel entfernen**  
Sandro: *"Das Kundenlos gibt's glaube ich nicht mehr."*  
→ Einfach den Zusatz `+ Kundenlos` aus dem Titel der 1. Stufe in Supabase löschen.

**6c — "Wert bis 20.000 €" auf Stufe 1 prüfen**  
Auf der Karte der 1. Empfehlung (100 € Standardvergütung) steht als Badge `Wert bis 20.000 €`.
Das ist irreführend — 20.000 € ist der Gesamtwert des gesamten Programms, nicht der Wert
der ersten Stufe.  
→ Wert-Label für Stufe 1 in Supabase anpassen oder entfernen (`wert_label`-Feld).

---

---

### #7 — Fehlende data-bb-Hooks: 3 Stellen hartcodiert auf Kai
**Seite:** `programm.html` · **Code-Änderung nötig**  
Diese drei Elemente müssten pro Berater dynamisch sein, haben aber keinen `data-bb`-Hook:

**7a — Footer-Initialen `KB`** (Zeile 765)  
`<div class="footer-mark-circle">KB</div>` — Für Sandro Wernicke wäre das `SW`.  
→ `data-bb="initialen"` ergänzen und in `berater-brand.js` aus `b.name` generieren.

**7b — "Detail-Analyse starten"-Link im Rechner** (Zeile 218)  
`href="https://finanzcheck.kaiblobel.de"` — Kai-spezifischer Link, kein Hook.  
→ Neues `data-bb="finanzcheck"` Feld oder `data-bb="booking"` wiederverwenden.

**7c — "Bei Google bewerten"-Button** (Zeile 652)  
`href="https://www.google.com/search?q=kai+blobel+dvag"` — Für jeden Berater falsch.  
→ `data-bb="google-bewertung"` ergänzen, Link pro Berater in der DB hinterlegen.

---

### #8 — Testimonials nennen explizit "Herrn Blobel"
**Seite:** `programm.html` · **Quelle:** Statisches HTML (Zeile 637–638)  
In der zweiten Testimonial-Reihe stehen Zitate wie:
- *„Ich werde seit vielen Jahren … durch Herrn Blobel beraten."*
- *„Seit 2006 betreut mich Herr Blobel …"*

Für einen Kunden von Sandro Wernicke ist das verwirrend — er sieht Bewertungen für einen anderen Berater.  
**Hinweis an Kai:** Entweder Testimonials pro Berater aus der DB laden (wie die Reward-Karten),
oder neutrale Formulierungen ohne Namen verwenden, die für alle Berater passen.

---

### #9 — "15 Google-Bewertungen" ist Kais Zahl
**Seite:** `programm.html` · Zeile 614  
`<strong>5,0 von 5</strong> · 15 Google-Bewertungen` — Kais Anzahl, hardcoded.  
→ Pro Berater in der DB hinterlegen oder als `data-bb`-Hook lösen.

---

### #10 — Video-Overlay: Rolle "Initiator" falsch für andere Berater
**Seite:** `programm.html` · Zeile 373  
`<span class="video-overlay-role">Initiator</span>` — Kai ist der Initiator des Portals.
Für Sandro und andere Berater sollte dort `Vermögensberater` stehen.  
→ `data-bb="rolle"` ist bereits in `berater-brand.js` implementiert — diesen Span mit
`data-bb="rolle"` versehen statt Freitext.

---

### #11 — Formulierung: "was dahintersteckt" zweimal hintereinander
**Seite:** `programm.html` · Video-Sektion · Zeile 358 + 361  
H2: *„In 30 Sekunden erkläre ich dir, **was dahintersteckt**."*  
Lede direkt darunter: *„Ich zeige dir kurz, **was dahintersteckt**. Und was du davon hast."*  
Gleiche Formulierung zweimal in direkter Abfolge.  
**Vorschlag Lede:** *„Kurz und ehrlich: was du davon hast und was ich mir davon erhoffe."*

---

### #12 — FAQ: Verweis auf "oben genannte Kriterien" die nirgends stehen
**Seite:** `programm.html` · FAQ · Zeile 691  
Frage: *„An wen sollte ich dich empfehlen?"*  
Antwort: *„…der die oben genannten Kriterien erfüllt."*  
Auf der Seite werden nirgends konkrete Kriterien genannt — die Antwort verweist ins Leere.  
**Vorschlag:** Kriterien direkt in die Antwort schreiben, z.B.:
*„Jeden Menschen aus deinem Umfeld — Familie, Freunde, Kollegen — der offen ist
für ein erstes Gespräch über seine finanzielle Situation."*

---

### #13 — Idee: Win-Recap editierbar machen
**Seite:** `programm.html` · Zeile 154–159  
Der Abschnitt *„Was wir gemeinsam schon bewegt haben"* hat vier fixe Punkte:
Übersicht, Entscheidungen, Geld, Lücken. Die sind generisch und für alle Berater gleich.  
**Idee:** Ähnlich wie die Mehrwert-Felder (`contenteditable`) könnten diese Punkte
im Kundengespräch live angepasst werden — der Berater streicht durch, was nicht zutrifft,
und ergänzt was wirklich passiert ist.  
**Hinweis:** Mittlerer Aufwand — bitte mit Kai diskutieren ob das gewollt ist.

---

## Offene Fragen (noch nicht untersucht)
- Hat jeder Berater ein eigenes Video, oder läuft immer Kais Video?
- Gibt es weitere Seiten im Portal, die noch geprüft werden sollen?
