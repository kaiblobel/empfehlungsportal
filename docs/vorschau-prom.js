/**
 * Vorschau: Promoter-Übersicht, heute und Vorschlag.
 *
 * Die Beispieldaten enthalten bewusst einen Testpromoter mit guten Zahlen. Am
 * heutigen Stand steht er dadurch auf dem Siegerpodest, mit Pokal und ohne
 * Kennzeichnung, und er zählt in allen vier Kennzahlen mit. Das ist kein
 * erfundener Fall, sondern das, was der Code heute tut.
 */
import { icon } from '../js/icons.js';
import { esc, initialen } from './vorschau-hilfen.js';

export const PROMOTER = [
  { name: 'Sandro Wernicke', gesamt: 14, kunden: 4, aktiv: 'heute aktiv', seit: '14.03.2026', ziel: 5 },
  { name: 'Josephine Bürger', gesamt: 9, kunden: 3, aktiv: 'vor 2 Tagen aktiv', seit: '02.04.2026', ziel: 0 },
  { name: 'Testpromoter Mustermann', gesamt: 6, kunden: 3, aktiv: 'heute aktiv', seit: '01.09.2026', ziel: 0, test: true },
  { name: 'Sven Augustin', gesamt: 7, kunden: 1, aktiv: 'vor 1 Woche aktiv', seit: '20.02.2026', ziel: 3 },
  { name: 'Anna-Christin Wiesenberger-Hohenstein', gesamt: 2, kunden: 0, aktiv: 'vor 3 Wochen aktiv', seit: '11.05.2026', ziel: 0 },
  { name: 'Max Kudlek', gesamt: 0, kunden: 0, aktiv: 'noch ohne Aktivität', seit: '28.08.2026', ziel: 0 },
];

function impuls(p) {
  if (!p.gesamt) return 'Ein erster Impuls könnte helfen';
  if (p.ziel && p.kunden >= p.ziel) return 'Wunschziel erreicht';
  if (p.ziel && p.kunden >= p.ziel - 1) return 'Nächstes Ziel ist nah';
  return 'Beziehung persönlich pflegen';
}

export function promHeute() {
  const alle = PROMOTER;
  const gesamt = alle.reduce((s, p) => s + p.gesamt, 0);
  const kunden = alle.reduce((s, p) => s + p.kunden, 0);
  const rang = [...alle].filter((p) => p.gesamt || p.kunden)
    .sort((a, b) => b.kunden - a.kunden || b.gesamt - a.gesamt).slice(0, 3);
  const podest = [rang[1], rang[0], rang[2]].filter(Boolean);

  const karte = (p) => {
    const quote = p.gesamt ? Math.round((p.kunden / p.gesamt) * 100) : 0;
    const fortschritt = p.ziel ? Math.min(100, Math.round((p.kunden / p.ziel) * 100)) : Math.min(100, p.kunden * 20);
    const zielText = p.ziel ? 'Wunschziel: Stufe ' + p.ziel : 'Noch kein Wunschziel gewählt';
    const zielStand = p.ziel ? Math.min(p.kunden, p.ziel) + ' von ' + p.ziel : p.kunden + ' Kunden';
    return '<div class="promoter-card feed-row">'
      + '<div class="pr-person"><span class="pr-initial">' + esc(initialen(p.name)) + '</span>'
      + '<span><strong>' + esc(p.name) + '</strong>'
      + (p.test ? ' <span class="badge badge-test">Test</span>' : '')
      + '<small><i class="pr-active-dot"></i>' + esc(p.aktiv) + '</small></span></div>'
      + '<div class="pr-metrics">'
      + '<div class="pr-metric"><b>' + p.gesamt + '</b><span>Empfehlungen</span></div>'
      + '<div class="pr-metric"><b>' + p.kunden + '</b><span>Kunden</span></div>'
      + '<div class="pr-metric"><b>' + quote + ' %</b><span>Quote</span></div></div>'
      + '<div class="pr-goal-label"><span>' + zielText + '</span><b>' + zielStand + '</b></div>'
      + '<div class="pr-progress"><i style="width:' + fortschritt + '%"></i></div>'
      + '<div class="pr-card-foot"><b>' + esc(impuls(p)) + '</b><span>seit ' + esc(p.seit) + '</span></div>'
      + '</div>';
  };

  const stufe = (p) => {
    const r = rang.indexOf(p) + 1;
    return '<a class="pr-podium-place rank-' + r + '" href="#">'
      + '<span class="pr-podium-person"><span class="pr-podium-avatar">' + esc(initialen(p.name)) + '</span>'
      + '<strong>' + esc(p.name) + '</strong>'
      + '<small>' + p.kunden + ' Kunden · ' + p.gesamt + ' Empfehlungen</small></span>'
      + '<span class="pr-podium-step"><span class="pr-podium-trophy">'
      + (r === 1 ? icon('Trophy', { size: 14 }) : '') + '</span><b>' + r + '</b></span></a>';
  };

  return '<section class="pr-intro"><div>'
    + '<div class="pr-label">Dein Empfehlungsnetzwerk</div><h1>Promoter</h1>'
    + '<p>Menschen im Blick behalten, Beziehungen pflegen und Erfolge gemeinsam entwickeln.</p>'
    + '</div><button class="pr-primary" type="button">+ Neuer Promoter</button></section>'
    + '<section class="pr-overview">'
    + '<div class="pr-overview-item"><strong>' + alle.length + '</strong><span>Promoter</span></div>'
    + '<div class="pr-overview-item"><strong>' + gesamt + '</strong><span>Empfehlungen insgesamt</span></div>'
    + '<div class="pr-overview-item"><strong>' + kunden + '</strong><span>Kunden geworden</span></div>'
    + '<div class="pr-overview-item"><strong>' + Math.round((kunden / gesamt) * 100) + ' %</strong><span>Kundenquote im Netzwerk</span></div>'
    + '</section>'
    + '<section class="pr-champions"><header class="pr-champions-head"><div class="pr-champions-title">'
    + '<span class="pr-champions-icon">' + icon('Trophy', { size: 19 }) + '</span>'
    + '<div><div class="pr-label">Deine Besten</div><h2>Top-Promoter</h2>'
    + '<p>Die drei stärksten Empfehlungsgeber in deinem Netzwerk.</p></div></div>'
    + '<span class="pr-champions-rule">Gewertet nach gewonnenen Kunden</span></header>'
    + '<div class="pr-podium count-3">' + podest.map(stufe).join('') + '</div></section>'
    + '<div class="pr-section-head"><h2>Dein Netzwerk</h2><span>6 Promoter · nach Aktivität sortiert</span></div>'
    + '<div class="promoter-grid">' + alle.map(karte).join('') + '</div>';
}

export function promNeu() {
  const echt = PROMOTER.filter((p) => !p.test);
  const gesamt = echt.reduce((s, p) => s + p.gesamt, 0);
  const kunden = echt.reduce((s, p) => s + p.kunden, 0);
  const rang = [...echt].filter((p) => p.gesamt || p.kunden)
    .sort((a, b) => b.kunden - a.kunden || b.gesamt - a.gesamt);

  const zeile = (p) => '<a class="n2-zeile" href="#" style="--ton:var(--marine)">'
    + '<span class="n2-kreis">' + esc(initialen(p.name)) + '</span>'
    + '<span class="n2-mitte"><span class="n2-name">' + esc(p.name) + '</span>'
    + '<span class="n2-zeile2">'
    + (p.kunden
      ? '<b class="n2-zustand">' + p.kunden + ' Kunden</b>'
      : '<b class="n2-zustand leise">noch keine Kunden</b>')
    + '<span class="n2-punkt">·</span>' + p.gesamt + ' Empfehlungen</span></span>'
    + (p.test ? '<span class="n2-test">Testeintrag</span>' : '')
    + '<span class="n2-zeit">' + esc(p.aktiv) + '</span>'
    + '<span class="n2-pfeil">' + icon('ChevronRight', { size: 15 }) + '</span></a>';

  const gruppe = (titel, liste) => liste.length
    ? '<div class="n2-gruppe"><span>' + titel + '</span><b>' + liste.length + '</b></div>' + liste.map(zeile).join('')
    : '';

  const aktiv = PROMOTER.filter((p) => p.aktiv.includes('heute') || p.aktiv.includes('Tag'));
  const ruhig = PROMOTER.filter((p) => !aktiv.includes(p) && p.gesamt > 0);
  const still = PROMOTER.filter((p) => !aktiv.includes(p) && p.gesamt === 0);

  const zahl = (wert, label) => '<span class="n-zahl-block"><b>' + wert + '</b><span>' + label + '</span></span>';

  return '<section class="n2-kopf"><div>'
    + '<div class="h-label">Dein Empfehlungsnetzwerk</div><h1>Promoter</h1></div>'
    + '<a href="#">+ Neuer Promoter</a></section>'
    + '<div class="n2-leiste">'
    + '<label class="n2-suche">' + icon('Search', { size: 16 }) + '<input type="search" placeholder="Promoter suchen"></label>'
    + '<div class="n2-reiter"><button type="button" aria-pressed="true">Aktuell</button>'
    + '<button type="button">Meiste Kunden</button><button type="button">Name</button></div>'
    + '<button class="n2-mehr" type="button" aria-expanded="false" id="promMehr">Rangliste und Zahlen</button>'
    + '<div class="n2-weitere n-spalte" id="promWeitere">'
    + '<div class="n-zahlen">' + zahl(echt.length, 'Promoter') + zahl(gesamt, 'Empfehlungen')
    + zahl(kunden, 'Kunden') + zahl(Math.round((kunden / gesamt) * 100) + ' %', 'Quote')
    + '<span class="n-fussnote">ohne Testeinträge gerechnet</span></div>'
    + '<ol class="n-rangliste">'
    + rang.slice(0, 5).map((p) => '<li><b>' + esc(p.name) + '</b> · ' + p.kunden + ' Kunden aus ' + p.gesamt + ' Empfehlungen</li>').join('')
    + '</ol></div></div>'
    + '<div class="n2-abschnitt"><h2>Dein Netzwerk</h2><span>' + PROMOTER.length + ' Promoter</span></div>'
    + '<div class="n2-liste">'
    + gruppe('Diese Woche aktiv', aktiv)
    + gruppe('Länger ruhig', ruhig)
    + gruppe('Noch ohne Empfehlung', still)
    + '</div>';
}

export const PROM_BEFUND = '<strong>Befund Promoter.</strong> Bis zur ersten Promoter-Karte stehen'
  + ' heute rund <strong>675 Punkte</strong> Vorspann, auf dem Handy 750. Allein das Siegerpodest'
  + ' macht davon 265 aus, und es zeigt dieselben drei Namen, die direkt darunter in der Liste'
  + ' stehen. Im Vorschlag ist es eine einklappbare Rangliste, zusammen mit den Kennzahlen.'
  + '<br><br><strong>Zwei echte Fehler, keine Geschmacksfrage.</strong> Erstens: Die vier'
  + ' Kennzahlen oben rechnen <strong>Testeinträge mit</strong>. Im Anlege-Dialog steht wörtlich'
  + ' „Zählt in keiner Auswertung mit". Zweitens: Auf dem Podest kann ein <strong>Testpromoter auf'
  + ' Platz 1 stehen, mit Pokal und ohne Test-Kennzeichnung</strong>, die es in der Liste gibt.'
  + ' Links sehen Sie genau das.'
  + '<br><br><strong>Der Impulssatz sagt nichts.</strong> „Beziehung persönlich pflegen" ist der'
  + ' Auffangfall und steht auf fast jeder Karte. Der Fortschrittsbalken erfindet ohne Wunschziel'
  + ' eine Skala, fünf Kunden gelten als voll. Beides ist im Vorschlag weg.'
  + '<br><br>Nebenbei: Die Schrift auf diesen Karten liegt an sieben Stellen bei <strong>7,8 bis'
  + ' 9,5 Punkten</strong>.';
