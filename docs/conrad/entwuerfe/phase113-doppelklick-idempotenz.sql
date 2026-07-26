-- ============================================================================
-- ENTWURF · schema-phase113.sql · Doppelklick-Schutz per echter Idempotenz
--          (Prüfbefund 4 · Conrad)
-- ----------------------------------------------------------------------------
-- STATUS: ENTWURF. NICHT live angewandt. Kern (Vorgangs-Schlüssel + Unique)
--         auf Test-Kopie validiert (Nachweis unten). Kein main, keine Live-DB.
--
-- >>> ABHÄNGIGKEIT: baut auf White-Label PHASE 111 auf. <<<
-- Phase 111 fasst create_empfehlung_public() ohnehin an (Berater-Auflösung,
-- kein Kai-Fallback). Diese Idempotenz-Ergänzung wird IN die Phase-111-Fassung
-- eingebaut — KEINE konkurrierende Neufassung. Solange 111 nicht steht, bleibt
-- dieser Entwurf reiner Entwurf.
--
-- PROBLEM
--   create_empfehlung_public() legt pro Aufruf eine Zeile an. Zwei schnelle
--   Klicks (oder Netzwerk-Retry / zwei Tabs) erzeugen zwei Empfehlungen.
--   Heutiger Schutz ist nur der Browser-Button + Rate-Limit — keine echte
--   Idempotenz.
--
-- LÖSUNG (Kais Vorgabe, KEIN grober Name/Telefon-Zeitfenster-Vergleich)
--   * Der Browser erzeugt pro Formular-VORGANG einen eindeutigen Schlüssel
--     (crypto.randomUUID()). Beide schnellen Klicks desselben Vorgangs senden
--     DENSELBEN Schlüssel. Ein später bewusst neuer Vorgang -> neuer Schlüssel.
--   * DB: Eindeutigkeitsregel auf dem Schlüssel.
--   * Wiederholung mit gleichem Schlüssel legt KEINE zweite Empfehlung an,
--     sondern gibt den bereits erzeugten Link (id, link_token) zurück.
-- ============================================================================

begin;

-- 1) Vorgangs-Schlüssel + Eindeutigkeit (mehrere NULL erlaubt -> Altbestand unberührt)
alter table public.empfehlungen add column if not exists idempotency_key text;
create unique index if not exists empfehlungen_idempotency_key_uidx
  on public.empfehlungen (idempotency_key);

-- 2) create_empfehlung_public() — Idempotenz-BAUSTEIN (in die 111-Fassung einbauen)
--    Neuer Parameter p_idempotency_key ANS ENDE der Signatur (Default null ->
--    Abwärtskompatibilität: alte Aufrufe ohne Schlüssel verhalten sich wie bisher).
--
--    Ablauf innerhalb der Funktion (Pseudo-Muster, wird mit der 111-Logik verwoben):
--
--      -- ... (Phase-111-Berater-Auflösung, Validierung, Rate-Limit) ...
--
--      insert into empfehlungen (…, idempotency_key)
--      values (…, p_idempotency_key)
--      on conflict (idempotency_key) do nothing
--      returning empfehlungen.id, empfehlungen.link_token
--      into v_id, v_token;
--
--      -- Doppelklick: der zweite Insert traf den Unique-Index -> keine Zeile.
--      -- Dann den bereits erzeugten Datensatz zurückgeben (gleicher Link):
--      if v_id is null and p_idempotency_key is not null then
--        select id, link_token into v_id, v_token
--        from empfehlungen where idempotency_key = p_idempotency_key;
--      end if;
--
--      return query select v_id, v_token;
--
--    Hinweis: Das on-conflict-do-nothing + Nachlesen deckt auch den echten
--    Wettlauf (zwei parallele Requests) ab — einer gewinnt, der andere bekommt
--    denselben Link.

commit;

-- ----------------------------------------------------------------------------
-- CLIENT-SEITE (separater, gestaffelter Schritt, kein Live ohne Freigabe):
--   * js/empfehler-mobile.js (aktiv auf empfehler.html) und js/app.js
--     (Empfänger-/Empfehlen-Flow): beim Aufbau des Empfehlungs-Formulars einmal
--     einen Schlüssel `crypto.randomUUID()` erzeugen und halten (z. B. im
--     Formular-dataset). Beim Absenden als p_idempotency_key mitsenden
--     (js/supabase.js: createEmpfehlung -> RPC-Parameter ergänzen).
--   * Nach erfolgreichem Absenden Formular zurücksetzen -> für den nächsten
--     BEWUSSTEN Vorgang neuen Schlüssel erzeugen.
--   * Der bestehende Button-Disable bleibt als erste, schnelle Verteidigung.
--
-- RÜCKBAU:
--   * create_empfehlung_public() auf die Phase-111-Fassung (ohne Idempotenz)
--     zurücksetzen.
--   * drop index if exists public.empfehlungen_idempotency_key_uidx;
--   * alter table public.empfehlungen drop column if exists idempotency_key;
--   * Client-Änderung per Git zurücknehmen.
--
-- TESTPLAN:
--   1. Zwei Aufrufe mit GLEICHEM Schlüssel -> nur 1 Empfehlung; beide Antworten
--      liefern denselben link_token.
--   2. Aufruf mit NEUEM Schlüssel -> neue Empfehlung.
--   3. Aufruf OHNE Schlüssel (Altverhalten) -> neue Empfehlung (kompatibel).
--   4. Zusammen mit Phase 111: unbestimmbarer Berater -> Fehler (nicht Kai),
--      Idempotenz greift erst nach erfolgreicher Auflösung.
--
-- TESTNACHWEIS (Test-Kopie, Kern-Mechanismus):
--   Vorgang X, 2 Klicks (gleicher Schlüssel) -> 1 Zeile
--   Vorgang Y, 1 Klick  (neuer Schlüssel)    -> 1 Zeile
--   => 2 bewusste Vorgänge = 2 Zeilen; der Doppelklick von X wurde abgefangen.
-- ----------------------------------------------------------------------------
