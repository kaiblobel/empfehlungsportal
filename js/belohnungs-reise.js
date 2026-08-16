/**
 * Phase 127 · Stufenlogik der Belohnungs-Reise
 *
 * Reine Funktionen: kein DOM, kein Netz, keine Seiteneffekte. Damit lässt sich
 * die 1-bis-15-Logik ohne Browser und ohne Live-Datenbank prüfen
 * (tests/belohnungs-reise.test.mjs).
 *
 * Warum es diese Datei gibt: Die alte Oberfläche hat aus den Lücken zwischen
 * den vorhandenen Datenbank-Zeilen zusätzliche 100-€-Stufen abgeleitet. Die
 * Prämien-Synchronisation kennt aber nur echte Zeilen — die erfundenen Stufen
 * wären beim Promoter nie als Auszahlung angekommen. Hier wird deshalb nichts
 * mehr erfunden: gezeigt wird, was in den Daten steht.
 */

export const STUFE_MIN = 1;
// Bis Phase 259 endete die Reise bei 15. Seit dem Auto-Meilenstein geht sie
// bis 20; die Zwischenstufen 16 bis 19 sind echte 100-€-Zeilen, keine
// abgeleiteten. Wer die Zahl ändert, muss auch die Stufen in der Datenbank
// anlegen, sonst meldet fehlendeStufen() zu Recht Lücken.
export const STUFE_MAX = 20;

/**
 * Ist die Stufe ein Bild-Meilenstein (statt einer ruhigen Geldzeile)?
 * Maßgeblich ist `highlight` aus der Datenbank — nicht mehr ein Treffer auf
 * "Bonus" im Titel. Titel ändern sich, Bedeutung nicht.
 */
export function istMeilenstein(stufe) {
  return !!(stufe && stufe.highlight);
}

/**
 * Sortiert nach Stufe und wirft Dubletten raus (dieselbe Stufe mehrfach).
 * Behalten wird der erste Treffer — die Berater-Auflösung ist vorher schon in
 * getBelohnungsStufenPublic() passiert.
 */
export function normalisiereStufen(rows) {
  if (!Array.isArray(rows)) return [];
  const proStufe = new Map();
  for (const row of rows) {
    const nr = Number(row?.stufe);
    if (!Number.isInteger(nr) || nr < STUFE_MIN) continue;
    if (!proStufe.has(nr)) proStufe.set(nr, { ...row, stufe: nr });
  }
  return [...proStufe.values()].sort((a, b) => a.stufe - b.stufe);
}

/** Welche Stufen zwischen min und max fehlen in den Daten? */
export function fehlendeStufen(stufen, min = STUFE_MIN, max = STUFE_MAX) {
  const da = new Set(normalisiereStufen(stufen).map(s => s.stufe));
  const luecken = [];
  for (let i = min; i <= max; i++) if (!da.has(i)) luecken.push(i);
  return luecken;
}

/**
 * "2.000 €" → 2000. Deutsche Schreibweise: Punkt trennt Tausender,
 * Komma trennt Nachkommastellen.
 */
export function wertAusLabel(label) {
  const roh = String(label ?? '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(roh);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Gesamtwert aller Stufen — ausschließlich aus vorhandenen wert_label.
 * Eine Stufe ohne Wert zählt 0 und wird nicht geschätzt.
 */
export function gesamtwert(stufen) {
  return normalisiereStufen(stufen).reduce((summe, s) => summe + wertAusLabel(s.wert_label), 0);
}

/**
 * Die fertige Reise für die Anzeige: eine Liste in Stufen-Reihenfolge, jede
 * Position entweder 'meilenstein' oder 'geld'.
 * `fehlt` meldet Lücken, damit die Seite ehrlich reagieren kann statt zu raten.
 */
export function baueReise(rows, { max = STUFE_MAX } = {}) {
  const stufen = normalisiereStufen(rows).filter(s => s.stufe <= max);
  return {
    stationen: stufen.map(s => ({
      stufe: s.stufe,
      art: istMeilenstein(s) ? 'meilenstein' : 'geld',
      daten: s,
    })),
    fehlt: fehlendeStufen(stufen, STUFE_MIN, max),
    gesamtwert: gesamtwert(stufen),
  };
}

/**
 * Welche Prämien entstehen bei n gewonnenen Kunden?
 * Spiegelt sync_praemien_for_empfehler(): alle echten Stufen bis einschließlich
 * n. Dient dem Nachweis, dass Anzeige und Auszahlung dasselbe sagen.
 */
export function verdienteStufen(rows, kunden) {
  const n = Number(kunden) || 0;
  return normalisiereStufen(rows).filter(s => s.stufe <= n).map(s => s.stufe);
}

/** Nur die Meilensteine — Grundlage für die Wunschziel-Auswahl des Promoters. */
export function meilensteine(rows) {
  return normalisiereStufen(rows).filter(istMeilenstein);
}

/* ---------------------------------------------------------------------------
 * Markup. Bewusst hier und nicht in programm.js: So rendert die Prüfseite
 * (mockups/benefits-pruefung.html) exakt dasselbe wie die echte Seite und
 * kann nicht auseinanderlaufen. Reine Zeichenketten, kein DOM-Zugriff.
 * ------------------------------------------------------------------------- */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

/** "5 gewonnene Kunden" — die Bedingung im Klartext an der Karte. */
export function kundenZeile(stufe) {
  return `${stufe} ${stufe === 1 ? 'gewonnener Kunde' : 'gewonnene Kunden'}`;
}

export function geldZeileHtml(station) {
  const d = station.daten;
  return `
    <li class="reise-station reise-geld" data-stufe="${station.stufe}">
      <span class="reise-punkt">${station.stufe}</span>
      <div class="reise-geld-card">
        <span class="reise-geld-text">
          <small>Stufe ${station.stufe}</small>
          <strong>${escapeHtml(d.titel || 'Empfehlungs-Bonus')}</strong>
        </span>
        ${d.wert_label ? `<b>${escapeHtml(d.wert_label)}</b>` : ''}
      </div>
    </li>`;
}

export function meilensteinHtml(station, istFinale = false) {
  const d = station.daten;
  // Fehlt das Bild oder lädt es nicht, bekommt die Karte einen ruhigen
  // Farbverlauf statt des Kaputt-Symbols. Das onerror steht bewusst im Markup:
  // so gilt es auch auf der Prüfseite, ohne dass dort Code doppelt liegt.
  const bild = d.bild_url
    ? `<img src="${escapeHtml(d.bild_url)}" alt="${escapeHtml(d.titel || 'Belohnung')}" loading="lazy" decoding="async"
            onerror="this.closest('.reise-karte').classList.add('reise-karte-ohne-bild'); this.remove();" />`
    : '';
  return `
    <li class="reise-station reise-meilenstein stufe-${station.stufe}${istFinale ? ' reise-finale' : ''}" data-stufe="${station.stufe}">
      <span class="reise-punkt">${station.stufe}</span>
      <article class="reise-karte${d.bild_url ? '' : ' reise-karte-ohne-bild'}">
        ${bild}
        <span class="reise-badge">${istFinale ? 'Das Finale' : 'Freie Wahl'}</span>
        <div class="reise-karte-copy">
          <small>${kundenZeile(station.stufe)}</small>
          <h4>${escapeHtml(d.titel || '')}</h4>
          ${d.wert_label ? `<strong>${escapeHtml(d.wert_label)}</strong>` : ''}
          ${d.beschreibung ? `<p>${escapeHtml(d.beschreibung)}</p>` : ''}
        </div>
      </article>
    </li>`;
}

/** Die komplette Liste. Der letzte Meilenstein wird zum Finale. */
export function reiseHtml(reise) {
  if (!reise?.stationen?.length) {
    return '<li class="reise-leer">Die Belohnungen konnten gerade nicht geladen werden. Bitte lade die Seite neu.</li>';
  }
  const finale = [...reise.stationen].reverse().find(s => s.art === 'meilenstein');
  return reise.stationen
    .map(st => st.art === 'meilenstein' ? meilensteinHtml(st, st === finale) : geldZeileHtml(st))
    .join('');
}

/** Ein Satz für den Präsentations-Modus statt zehn Einzelzeilen. */
export function geldSummary(reise) {
  const geld = (reise?.stationen || []).filter(s => s.art === 'geld');
  if (!geld.length) return '';
  const stufen = geld.map(s => s.stufe).join(', ').replace(/, (\d+)$/, ' und $1');
  const wert = geld[0].daten.wert_label ? ` à ${geld[0].daten.wert_label}` : '';
  return `Dazu ${geld.length} Geldstufen${wert} auf dem Weg dorthin — Stufe ${stufen}.`;
}
