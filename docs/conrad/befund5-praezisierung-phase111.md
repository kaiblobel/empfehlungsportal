# Befund 5 — Präzisierung für White-Label Phase 111 (keine eigene Migration)

> **Status:** Integrationsnotiz, kein Code, keine Migration. Gehört in den White-Label-Zweig,
> **Abschnitt Phase 111** (`docs/white-label-baustein.md`, §3 Punkt 2). Conrad erstellt
> **keine** konkurrierende `schema-phase111.sql`.

## Worum es geht (Conrad-Befund 5)
`create_empfehlung_public()` akzeptiert heute eine frei mitgesendete `p_berater_id` und
prüft **nicht**, ob sie zum angegebenen Promoter passt. Die gehärtete Fassung validiert die
`berater_id` zwar gegen *aktive* Berater, erlaubt aber weiterhin, eine Empfehlung einem
beliebigen aktiven Berater unterzuschieben, und prüft das Promoter/Berater-Paar nicht.

## Wie der bestehende Phase-111-Plan das schon adressiert
Der White-Label-Plan (§3.2) sieht für Phase 111 vor:
- `create_empfehlung_public`: Berater eindeutig auflösen, sonst Fehler; **kein Kai-Fallback**.
- `set_empfehlung_berater_id`-Trigger: bei fehlendem/ungültigem Berater `raise`, nicht Kai.
- Vorab-Read: alle bestehenden Promoter haben gültige `berater_id` (in §7 bereits bestätigt:
  19 Promoter / 27 Empfehlungen sauber, 0 Mismatch).

## Kais verschärfte Regel — ersetzt das schwächere „oder" in §3.2
Die aktuelle Formulierung „gültiger `p_berater_id` **oder** über gültigen Promoter" ist zu
lasch. Verbindlich gilt stattdessen:

**Fall A — Empfehlung MIT Promoter** (Promoter über Code/`empfehler_id` bestimmt):
- Der Berater wird **ausschließlich** aus dem Promoter abgeleitet (`empfehler.berater_id`,
  serverseitig nachgeschlagen).
- Wird zusätzlich eine `p_berater_id` mitgesendet, **muss** sie exakt übereinstimmen —
  sonst **Fehler**. Kein Vertrauen in ein frei gesendetes Promoter-/Berater-Paar.

**Fall B — Direkter Berater-Flow OHNE Promoter** (kein Promoter/Code):
- Der Berater kommt aus `p_berater_id` und **muss** ein gültiger, aktiver Berater sein.
- **Kein Kai-Rückfall** — fehlt/ungültig → Fehler.
- Dieser legitime Flow (z. B. Empfänger über `?berater=slug`, direkter Berater-Link)
  **bleibt erhalten** und wird **separat** behandelt. Nicht versehentlich alle direkten
  Empfehlungen sperren.

**Trigger-Konsistenz:** `auto_link_empfehler` (legt bei freiem `empfehler_name` einen
Promoter an) und `set_empfehlung_berater_id` müssen mit dieser Regel konsistent sein — ein
neu angelegter Promoter erbt den bereits aufgelösten, gültigen Berater; nie Kai.

## Wichtig: Spam ist damit NICHT gelöst
Fall B (öffentlicher direkter Berater-Link ohne Promoter) bleibt eine **Spam-Fläche**:
Jeder kann über einen öffentlichen `?berater=slug`-Link Empfehlungen an diesen Berater senden.
Die Paarprüfung ändert daran nichts. Das ist ein **eigener Schutz** und gehört **nicht** in
Phase 111:
- Optionen (später, eigener Punkt): strengeres/separates Rate-Limit für den promoterlosen
  öffentlichen Flow; signierter/kurzlebiger öffentlicher Link statt reinem `?berater=slug`;
  leichte Bot-Hürde. → als offener Baustein notieren, nicht mit der Attribution vermischen.

## Was Conrad hier NICHT tut
- Keine `schema-phase111.sql` auf dem Conrad-Zweig.
- Keine Änderung an `create_empfehlung_public` / `set_empfehlung_berater_id` von Conrad aus.
- Nur diese Präzisierung zur Einarbeitung in den White-Label-Plan.

## Reihenfolge-Erinnerung
Phase 111 (White-Label) zuerst. Der Conrad-Doppelklick-Entwurf (`phase113`) baut auf der
fertigen 111-Fassung von `create_empfehlung_public` auf — nicht umgekehrt.
