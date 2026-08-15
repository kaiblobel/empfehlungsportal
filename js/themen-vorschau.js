import {
  getBeraterPublicById,
  getBeraterPublicBySlug,
  getEmpfehlungByToken,
  markInteressiert,
} from './supabase.js';

// Die ausgebaute Finanzierungskompass-Seite ist der einzige Baufi-Kundenweg.
// Alte Themenadressen bleiben nutzbar und behalten ihren Empfehlungskontext.
const legacyTopicParams = new URLSearchParams(window.location.search);
if (legacyTopicParams.get('vorlage') === 'baufi') {
  const canonicalBaufi = new URL('/baufi.html', window.location.origin);
  legacyTopicParams.forEach((value, key) => canonicalBaufi.searchParams.append(key, value));
  window.location.replace(`${canonicalBaufi.pathname}${canonicalBaufi.search}${window.location.hash}`);
}

const TOPICS = {
  investment: {
    number: '01',
    title: 'Investment & Gold',
    eyebrow: 'Vermögen aufbauen',
    headlinePublic: 'Geld braucht einen Plan, der zu Ihrem Leben passt.',
    headlineReferral: 'Geld braucht einen Plan, der zu deinem Leben passt.',
    ledePublic: 'Geldanlage beginnt nicht mit einem Produkt. Sie beginnt mit der Frage, was Sie erreichen möchten und wie viel Sicherheit Sie unterwegs brauchen.',
    ledeReferral: 'Geldanlage beginnt nicht mit einem Produkt. Sie beginnt mit der Frage, was du erreichen möchtest und wie viel Sicherheit du unterwegs brauchst.',
    signals: [
      ['Geld liegt ohne klare Aufgabe bereit', 'Rücklagen sind vorhanden, aber Sparen, Sicherheit und langfristiger Aufbau sind noch nicht sauber getrennt.'],
      ['Es gibt Anlagen, aber keinen Gesamtplan', 'Einzelne Fonds, Depots oder Edelmetalle sind vorhanden. Unklar ist, ob alles noch zu Zielen und Risikowunsch passt.'],
      ['Vermögen soll planbar wachsen', 'Sie möchten Chancen nutzen, ohne dabei Liquidität, Kosten und die eigene Ruhe aus dem Blick zu verlieren.']
    ],
    options: [
      ['start', 'Ich möchte erst anfangen', 'Zuerst braucht es eine klare Aufteilung zwischen Reserve, mittelfristigen Zielen und langfristigem Vermögensaufbau.'],
      ['plan', 'Ich investiere bereits', 'Bestehende Anlagen sollten gemeinsam betrachtet werden. Entscheidend ist, ob Aufteilung, Kosten und Laufzeiten noch passen.'],
      ['review', 'Ich möchte mein Depot prüfen', 'Ein strukturierter Blick auf Risiken, Streuung und Zielbezug zeigt, wo etwas vereinfacht oder nachjustiert werden kann.']
    ],
    scopes: [
      ['Ziele und Zeithorizonte', 'Welches Geld muss verfügbar bleiben, welches darf arbeiten und wann soll es gebraucht werden?'],
      ['Sicherheit und Schwankungen', 'Die passende Anlage muss auch dann tragbar bleiben, wenn Märkte unruhig werden.'],
      ['Streuung und Bausteine', 'Fonds, Wertpapiere und Edelmetalle werden nicht einzeln, sondern in ihrer gemeinsamen Wirkung betrachtet.'],
      ['Kosten und laufende Begleitung', 'Eine Strategie soll verständlich bleiben und regelmäßig an Veränderungen im Leben angepasst werden können.']
    ],
    tools: [
      ['Depot-Check', 'Wie krisenfest ist Ihr Depot?', 'Eine kurze Einordnung zu Streuung, Schwankungen und vorhandenen Anlagen.', 'https://depotcheck.kaiblobel.de/'],
      ['Strategie-Check', 'Welche Vermögensstrategie passt zu Ihnen?', 'Ziele, Zeit und Sicherheitswunsch in einen verständlichen Rahmen bringen.', 'https://vermoegensstrategie-check.kaiblobel.de/']
    ]
  },
  foerderungen: {
    number: '02',
    title: 'Vorsorge & Förderung',
    eyebrow: 'Zukunft planbar machen',
    headlinePublic: 'Vorsorge wirkt am besten, wenn Förderung und eigener Plan zusammenpassen.',
    headlineReferral: 'Vorsorge wirkt am besten, wenn Förderung und dein eigener Plan zusammenpassen.',
    ledePublic: 'Private Vorsorge, betriebliche Möglichkeiten und staatliche Förderung greifen oft ineinander. Entscheidend ist, welche Bausteine wirklich zu Ihrer Situation passen.',
    ledeReferral: 'Private Vorsorge, betriebliche Möglichkeiten und staatliche Förderung greifen oft ineinander. Entscheidend ist, welche Bausteine wirklich zu deiner Situation passen.',
    signals: [
      ['Die spätere Versorgung ist schwer einzuschätzen', 'Es gibt Verträge oder Ansprüche, aber kein verständliches Gesamtbild über die zu erwartende Versorgung.'],
      ['Fördermöglichkeiten sind unklar', 'Arbeitgeberleistungen, Zulagen und steuerliche Wege werden möglicherweise noch nicht vollständig genutzt.'],
      ['Vorsorge soll flexibel bleiben', 'Der Plan soll heute passen und später auf Familie, Beruf oder Einkommen reagieren können.']
    ],
    options: [
      ['overview', 'Ich brauche erst einen Überblick', 'Wir sammeln bestehende Ansprüche und Verträge und ordnen sie in ein verständliches Gesamtbild ein.'],
      ['funding', 'Ich möchte Förderung prüfen', 'Zuerst wird geklärt, welche Förderwege grundsätzlich passen könnten. Danach folgt die fachliche Prüfung.'],
      ['existing', 'Ich habe bereits Vorsorge', 'Bestehende Lösungen sollten auf Ziel, Kosten, Flexibilität und spätere Leistung geprüft werden.']
    ],
    scopes: [
      ['Gesetzliche und bestehende Ansprüche', 'Was ist bereits vorhanden und welche Lücke bleibt voraussichtlich bestehen?'],
      ['Private und betriebliche Vorsorge', 'Welche Wege passen zum Beruf, Einkommen und gewünschten Maß an Flexibilität?'],
      ['Förderung und Eigenbeitrag', 'Fördermöglichkeiten werden mit Voraussetzungen betrachtet, nicht als pauschales Versprechen.'],
      ['Anpassung im Lebensverlauf', 'Familie, Arbeitgeberwechsel oder Selbstständigkeit dürfen den Plan nicht unbrauchbar machen.']
    ],
    tools: [
      ['Vorsorge', 'Altersvorsorgedepot 2027', 'Den neuen geförderten Vorsorgeweg kennenlernen und bei Interesse vormerken.', 'https://altersvorsorgedepot.kaiblobel.de/'],
      ['Finanzcheck', 'Fördermöglichkeiten einordnen', 'In sieben Fragen entsteht eine erste Orientierung über mögliche Ansatzpunkte.', 'https://finanzcheck.kaiblobel.de/?from=thema&schwerpunkt=foerderung']
    ]
  },
  baufi: {
    number: '03',
    title: 'Baufinanzierung',
    eyebrow: 'Baufinanzierung mit Überblick',
    headlinePublic: 'Ein Vorhaben. Über 400 Banken. Ein Plan, der zu Ihrem Leben passt.',
    headlineReferral: 'Ein Vorhaben. Über 400 Banken. Ein Plan, der zu deinem Leben passt.',
    ledePublic: 'Wir prüfen nicht nur einen Zinssatz. Wir vergleichen Möglichkeiten, beziehen Förderwege ein und schauen darauf, ob Rate, Rücklagen und Laufzeit langfristig zu Ihnen passen.',
    ledeReferral: 'Wir prüfen nicht nur einen Zinssatz. Wir vergleichen Möglichkeiten, beziehen Förderwege ein und schauen darauf, ob Rate, Rücklagen und Laufzeit langfristig zu dir passen.',
    signals: [
      ['Der Wunsch ist da, der Rahmen noch nicht', 'Bevor die Suche beginnt, soll klar sein, welcher Gesamtaufwand langfristig gut tragbar bleibt.'],
      ['Ein Objekt oder Angebot liegt vor', 'Jetzt müssen Kaufpreis, Nebenkosten, mögliche Maßnahmen und Zeitplan als Gesamtbild geprüft werden.'],
      ['Die Zinsbindung läuft aus', 'Restschuld, neue Rate und mögliche Laufzeiten sollen rechtzeitig eingeordnet werden.']
    ],
    options: [
      ['orient', 'Ich möchte mich erst orientieren', 'Ein belastbarer Rahmen hilft, später gezielt zu suchen und Angebote besser einzuordnen.'],
      ['buy', 'Ich möchte eine Immobilie kaufen', 'Kaufpreis, Nebenkosten, mögliche Maßnahmen und Rücklagen müssen als Gesamtbild geprüft werden.'],
      ['build', 'Ich möchte neu bauen', 'Grundstück, Haus, Baunebenkosten, Puffer und Förderwege gehören in einen gemeinsamen Projektplan.'],
      ['modernize', 'Ich möchte modernisieren', 'Maßnahmen, Reihenfolge, Kostenrahmen und mögliche Förderwege sollten vor der Beauftragung zusammenstehen.'],
      ['follow', 'Meine Zinsbindung endet', 'Restschuld, Vertragsfristen und gewünschte Rate sollten frühzeitig gemeinsam betrachtet werden.']
    ],
    scopes: [
      ['Gesamtbudget statt Wunschrate', 'Kaufpreis, Nebenkosten, Maßnahmen, Rücklagen und laufende Belastung gehören zusammen.'],
      ['Eigenkapital und Reserven', 'Nicht jeder verfügbare Euro sollte automatisch in das Vorhaben fließen.'],
      ['Förderwege und Vergleich', 'Mögliche Programme und Finanzierungswege werden passend zum Vorhaben geprüft.'],
      ['Sicherheit über die Laufzeit', 'Tilgung, Zinsbindung und Flexibilität müssen auch bei Veränderungen tragfähig bleiben.']
    ],
    tools: [
      ['Finanzierungskompass', 'Wo stehen Sie mit Ihrem Vorhaben?', 'Der Kompass vertieft genau die Situation, die Sie hier ausgewählt haben.', '/baufi.html?vorlage=baufi'],
      ['Restschuld-Check', 'Kennen Sie Ihre spätere Restschuld?', 'Fünf kurze Fragen und ein Rechner zeigen, welche Zahl für Ihre Anschlussfinanzierung entscheidend wird.', 'https://restschuldcheck.kaiblobel.de/']
    ]
  },
  absicherung: {
    number: '04',
    title: 'Absicherung',
    eyebrow: 'Familie und Werte schützen',
    headlinePublic: 'Gute Absicherung schützt das, was für Sie wirklich wichtig ist.',
    headlineReferral: 'Gute Absicherung schützt das, was für dich wirklich wichtig ist.',
    ledePublic: 'Nicht jede Versicherung ist für jeden Menschen gleich wichtig. Einkommen, Gesundheit, Familie und Sachwerte brauchen eine klare Reihenfolge.',
    ledeReferral: 'Nicht jede Versicherung ist für jeden Menschen gleich wichtig. Einkommen, Gesundheit, Familie und Sachwerte brauchen eine klare Reihenfolge.',
    signals: [
      ['Das Leben hat sich verändert', 'Familie, Beruf, Wohneigentum oder Einkommen sind heute anders als beim Abschluss bestehender Verträge.'],
      ['Viele Verträge, wenig Überblick', 'Es ist nicht klar, welche Absicherung wirklich wichtig ist und wo Doppelungen bestehen.'],
      ['Das Einkommen soll geschützt sein', 'Die eigene Arbeitskraft ist für die meisten Haushalte die Grundlage aller finanziellen Pläne.']
    ],
    options: [
      ['family', 'Familie und Kinder stehen im Mittelpunkt', 'Zuerst werden Einkommen, Gesundheit und die wichtigsten familiären Folgen gemeinsam betrachtet.'],
      ['contracts', 'Ich möchte bestehende Verträge ordnen', 'Ein Überblick zeigt, was zusammenpasst, was fehlt und was möglicherweise doppelt vorhanden ist.'],
      ['income', 'Ich möchte mein Einkommen absichern', 'Die Tragweite eines längeren Ausfalls wird eingeordnet, bevor mögliche Lösungen besprochen werden.']
    ],
    scopes: [
      ['Einkommen und Arbeitskraft', 'Welche Folgen hätte ein längerer Ausfall für Haushalt, Ziele und Verpflichtungen?'],
      ['Gesundheit und Versorgung', 'Bestehende Leistungen und mögliche Lücken werden verständlich eingeordnet.'],
      ['Familie und Hinterbliebene', 'Verantwortung, laufende Kosten und langfristige Pläne bestimmen den notwendigen Schutz.'],
      ['Sachwerte und Haftung', 'Wichtige Risiken werden abgesichert, ohne jede theoretische Möglichkeit zum Pflichtprogramm zu machen.']
    ],
    tools: [
      ['Finanzcheck', 'Das Gesamtbild Ihrer Absicherung', 'Der allgemeine Check verbindet Schutz, Vorsorge und finanzielle Struktur.', 'https://finanzcheck.kaiblobel.de/?from=thema&schwerpunkt=struktur'],
      ['Persönliches Gespräch', 'Absicherung passend einordnen', 'Bestehende Unterlagen können gemeinsam ruhig und verständlich sortiert werden.', '#termin']
    ]
  },
  selbstaendige: {
    number: '05',
    title: 'Firmenkunden & Selbständige',
    eyebrow: 'Privat und geschäftlich klar aufstellen',
    headlinePublic: 'Unternehmerische Freiheit braucht eine verlässliche finanzielle Grundlage.',
    headlineReferral: 'Unternehmerische Freiheit braucht eine verlässliche finanzielle Grundlage.',
    ledePublic: 'Liquidität, Finanzierung, persönliche Vorsorge und betriebliche Absicherung dürfen nicht getrennt nebeneinanderstehen.',
    ledeReferral: 'Liquidität, Finanzierung, persönliche Vorsorge und betriebliche Absicherung dürfen nicht getrennt nebeneinanderstehen.',
    signals: [
      ['Privat und geschäftlich vermischen sich', 'Entnahmen, Rücklagen, Absicherung und private Ziele sind noch nicht sauber voneinander getrennt.'],
      ['Liquidität bindet Aufmerksamkeit', 'Schwankende Einnahmen oder offene Forderungen erschweren Planung und Investitionen.'],
      ['Vorsorge liegt vollständig in eigener Hand', 'Ohne automatische Versorgung braucht es einen flexiblen Plan für Unternehmer und Familie.']
    ],
    options: [
      ['structure', 'Ich möchte Ordnung schaffen', 'Zuerst werden private und betriebliche Zahlungsströme sowie vorhandene Rücklagen getrennt betrachtet.'],
      ['liquidity', 'Liquidität ist mein Hauptthema', 'Zahlungsziele, Reserven und Finanzierungsspielraum sollten in einem belastbaren Rahmen zusammengeführt werden.'],
      ['provision', 'Es geht um Vorsorge und Absicherung', 'Unternehmerische und persönliche Risiken werden gemeinsam priorisiert.']
    ],
    scopes: [
      ['Liquidität und Rücklagen', 'Welche Reserve wird betrieblich gebraucht und was kann langfristiger geplant werden?'],
      ['Finanzierung und Forderungen', 'Investitionen, Zahlungsziele und mögliche Lösungen werden in ihrer Gesamtwirkung betrachtet.'],
      ['Betriebliche Vorsorge', 'Mitarbeiterbindung und Versorgung brauchen eine verständliche und dauerhaft tragfähige Struktur.'],
      ['Persönliche Unternehmerstrategie', 'Private Ziele, Familie und eigene Versorgung bleiben Teil des Gesamtbildes.']
    ],
    tools: [
      ['Finanzcheck', 'Private Möglichkeiten zuerst einordnen', 'Eine erste Orientierung über Förderung, Vorsorge und finanzielle Struktur.', 'https://finanzcheck.kaiblobel.de/?from=thema&schwerpunkt=struktur'],
      ['Firmenkundengespräch', 'Betrieb und Privatleben gemeinsam betrachten', 'Für Unternehmen beginnt der sinnvolle Weg mit einem persönlichen Gesamtbild.', '#termin']
    ]
  },
  banking: {
    number: '06',
    title: 'Banking & Kredit',
    eyebrow: 'Geldflüsse besser organisieren',
    headlinePublic: 'Gute Kontostruktur schafft Überblick und Handlungsspielraum.',
    headlineReferral: 'Gute Kontostruktur schafft Überblick und Handlungsspielraum.',
    ledePublic: 'Konten, laufende Ausgaben, Rücklagen und Finanzierungsvorhaben sollten nicht unabhängig voneinander organisiert sein.',
    ledeReferral: 'Konten, laufende Ausgaben, Rücklagen und Finanzierungsvorhaben sollten nicht unabhängig voneinander organisiert sein.',
    signals: [
      ['Am Monatsende fehlt der Überblick', 'Einnahmen und Ausgaben laufen über ein Konto, ohne klare Bereiche für Rücklagen und Ziele.'],
      ['Ein privates Vorhaben soll finanziert werden', 'Rate, Laufzeit und vorhandene Reserven müssen zum gesamten Haushalt passen.'],
      ['Sparen passiert nur, wenn etwas übrig bleibt', 'Ein fester Geldfluss kann Ziele verlässlicher machen, ohne den Alltag unnötig einzuengen.']
    ],
    options: [
      ['accounts', 'Ich möchte meine Konten strukturieren', 'Ein klares System trennt Verpflichtungen, Rücklagen, Sparziele und frei verfügbares Geld.'],
      ['credit', 'Ich plane eine private Finanzierung', 'Die mögliche Rate wird zusammen mit Reserven und anderen Zielen betrachtet.'],
      ['overview', 'Ich möchte meine Ausgaben verstehen', 'Ein ehrlicher Überblick ist die Grundlage, bevor Sparen oder Finanzierung neu geordnet werden.']
    ],
    scopes: [
      ['Konten und Zahlungsverkehr', 'Ein verständliches System soll den Alltag erleichtern und nicht zusätzliche Arbeit schaffen.'],
      ['Rücklagen und Sparziele', 'Wichtige Reserven werden sichtbar von langfristigen Zielen getrennt.'],
      ['Privatkredit und Rate', 'Finanzierung wird nicht nur nach Machbarkeit, sondern nach dauerhafter Tragbarkeit beurteilt.'],
      ['Automatische Geldflüsse', 'Regelmäßige Verteilung schafft Verlässlichkeit, ohne jeden Monat neu entscheiden zu müssen.']
    ],
    tools: [
      ['Zwei-Konten-Modell', 'Geldflüsse verständlich ordnen', 'Eine einfache Darstellung zeigt, wie Prioritäten und Alltag getrennt werden können.', 'https://zkm.teamwachsbleiche.de/'],
      ['Finanzcheck', 'Wo bleibt aktuell Geld liegen?', 'In sieben Fragen werden Ausgaben, Förderung und Struktur gemeinsam betrachtet.', 'https://finanzcheck.kaiblobel.de/?from=thema&schwerpunkt=kosten']
    ]
  },
  energie: {
    number: '07',
    title: 'Energie',
    eyebrow: 'Laufende Kosten sinnvoll prüfen',
    headlinePublic: 'Energieentscheidungen sollten zu Verbrauch, Gebäude und Planung passen.',
    headlineReferral: 'Energieentscheidungen sollten zu Verbrauch, Gebäude und Planung passen.',
    ledePublic: 'Strom, Gas und Photovoltaik haben unterschiedliche Zeithorizonte. Ein Vergleich ist sinnvoll, wenn nicht nur der erste Preis betrachtet wird.',
    ledeReferral: 'Strom, Gas und Photovoltaik haben unterschiedliche Zeithorizonte. Ein Vergleich ist sinnvoll, wenn nicht nur der erste Preis betrachtet wird.',
    signals: [
      ['Die laufenden Kosten sind gestiegen', 'Tarif, Verbrauch und Vertragsstand sollen neu eingeordnet werden.'],
      ['Photovoltaik wird interessant', 'Investition, Eigenverbrauch und Gebäudesituation müssen gemeinsam betrachtet werden.'],
      ['Mehrere Angebote liegen vor', 'Preis, Laufzeit, Voraussetzungen und langfristige Wirkung sind schwer vergleichbar.']
    ],
    options: [
      ['tariff', 'Es geht um Strom oder Gas', 'Tarif, Vertragsbindung und tatsächlicher Verbrauch bilden den Ausgangspunkt für den Vergleich.'],
      ['pv', 'Ich prüfe Photovoltaik', 'Gebäude, Verbrauch, Finanzierung und erwartete Nutzung sollten gemeinsam eingeordnet werden.'],
      ['offers', 'Ich habe bereits Angebote', 'Ein strukturierter Vergleich macht Annahmen, Laufzeiten und Unterschiede sichtbar.']
    ],
    scopes: [
      ['Verbrauch und Tarif', 'Die beste Lösung hängt vom tatsächlichen Bedarf und nicht nur vom beworbenen Preis ab.'],
      ['Vertragslaufzeit und Flexibilität', 'Bindung, Preisgarantie und Wechselmöglichkeiten werden verständlich gegenübergestellt.'],
      ['Photovoltaik und Eigenverbrauch', 'Anlage, Nutzung, Speicherung und Finanzierung gehören in eine gemeinsame Betrachtung.'],
      ['Einordnung in die Finanzplanung', 'Größere Investitionen dürfen Rücklagen und andere Ziele nicht unbemerkt verdrängen.']
    ],
    tools: [
      ['Finanzcheck', 'Energiekosten im Gesamtbild prüfen', 'Der Check trennt laufende Energiekosten von möglichen Investitionen.', 'https://finanzcheck.kaiblobel.de/?from=thema&schwerpunkt=kosten'],
      ['Persönliche Einordnung', 'Angebote und Möglichkeiten besprechen', 'Ein kurzer Termin schafft Klarheit über den sinnvollsten nächsten Schritt.', '#termin']
    ]
  },
  kinder: {
    number: '08',
    title: 'KIDZ für Kinder',
    eyebrow: 'Kinderleicht in die Zukunft',
    headlinePublic: 'Was wünschen Sie sich für die Zukunft Ihres Kindes?',
    headlineReferral: 'Was wünschst du dir für die Zukunft deines Kindes?',
    ledePublic: 'KIDZ bringt drei Dinge zusammen, die Kinder stark machen: ein gutes Gefühl für Geld, Gesundheit und eine verlässliche Absicherung. Sie müssen heute nichts entscheiden und nichts abschließen.',
    ledeReferral: 'KIDZ bringt drei Dinge zusammen, die Kinder stark machen: ein gutes Gefühl für Geld, Gesundheit und eine verlässliche Absicherung. Du musst heute nichts entscheiden und nichts abschließen.',
    signals: [
      ['Über Geld wird zu Hause selten gesprochen', 'Kinder erleben täglich Entscheidungen über Wünsche, Sparen und Prioritäten, ohne dass sie jemand einordnet.'],
      ['Für später soll etwas da sein', 'Ausbildung, Führerschein oder der Start ins eigene Leben kommen schneller, als man denkt.'],
      ['Gesundheit und Absicherung laufen nebeneinander her', 'Zähne, Vorsorge und die spätere Arbeitskraft werden meist einzeln betrachtet statt als Ganzes.']
    ],
    options: [
      ['verstehen', 'Ich möchte KIDZ erst einmal verstehen', 'Die drei Grundlagen werden in Ruhe erklärt, ohne Termin und ohne Verpflichtung.'],
      ['elternabend', 'Ich möchte zu einem Elternabend', 'Dort wird das Konzept gemeinsam vorgestellt, mit Zeit für Fragen.'],
      ['familie', 'Ich möchte es für meine Familie einordnen', 'Im persönlichen Gespräch wird geklärt, was zur eigenen Situation passt.']
    ],
    scopes: [
      ['Finanzielle Kompetenz', 'Wie im Familienalltag aus Wünschen nach und nach gute Entscheidungen werden.'],
      ['Gesundheit', 'Vorsorge, Zähne und Leistungen, die im Familienalltag wirklich gebraucht werden.'],
      ['Finanzielle Absicherung', 'Die spätere Arbeitskraft des Kindes und die Sicherheit der Familie gehören zusammen.'],
      ['Früher Vermögensaufbau', 'Kleine Beträge über lange Zeit, wo möglich mit staatlicher Förderung kombiniert.']
    ],
    tools: [
      ['KIDZ für Eltern', 'Das Elternkonzept in Ruhe ansehen', 'Die drei Grundlagen, konkrete Möglichkeiten und häufige Fragen, verständlich auf einer Seite.', '/kidz/konzept'],
      ['Elternabend', 'Unverbindlich vormerken lassen', 'Das Konzept wird in kleiner Runde vorgestellt. Eine Vormerkung ist keine Anmeldung zu etwas anderem.', '/kidz/elternabend'],
      ['Familiengespräch', 'Den Plan für Ihr Kind gemeinsam aufsetzen', 'Ziele und Möglichkeiten werden in Ruhe und ohne Abschlussdruck sortiert.', '#termin']
    ]
  },
  karriere: {
    number: '09',
    title: 'Berufliche Perspektive',
    eyebrow: 'Möglichkeiten ehrlich einordnen',
    headlinePublic: 'Berufliche Veränderung beginnt mit einem klaren Blick auf Erwartungen und Alltag.',
    headlineReferral: 'Berufliche Veränderung beginnt mit einem klaren Blick auf deine Erwartungen und deinen Alltag.',
    ledePublic: 'Eine neue Perspektive muss fachlich, menschlich und finanziell passen. Deshalb steht am Anfang keine Bewerbung, sondern eine ehrliche Orientierung.',
    ledeReferral: 'Eine neue Perspektive muss fachlich, menschlich und finanziell passen. Deshalb steht am Anfang keine Bewerbung, sondern eine ehrliche Orientierung.',
    signals: [
      ['Mehr Entwicklung wird wichtig', 'Der aktuelle Weg bietet zu wenig Verantwortung, Gestaltung oder langfristige Perspektive.'],
      ['Selbstständigkeit ist interessant', 'Chancen und Anforderungen sollen ohne Schönfärberei verstanden werden.'],
      ['Ein unverbindlicher Einblick reicht zunächst', 'Sie möchten erfahren, wie der Alltag und der Einstieg im Team tatsächlich aussehen.']
    ],
    options: [
      ['look', 'Ich möchte mich erst informieren', 'Ein neutraler Einblick klärt Aufgaben, Arbeitsweise und mögliche Einstiegswege.'],
      ['change', 'Ich suche konkret eine Veränderung', 'Erwartungen, Stärken und Rahmenbedingungen sollten offen miteinander abgeglichen werden.'],
      ['side', 'Ein nebenberuflicher Einstieg interessiert mich', 'Zeit, Lernweg und rechtlich selbstständige Tätigkeit werden transparent eingeordnet.']
    ],
    scopes: [
      ['Aufgaben und Alltag', 'Ein realistischer Blick zeigt, wie Beratung, Lernen und eigene Organisation zusammenkommen.'],
      ['Einstiegswege', 'Hauptberuflicher und nebenberuflicher Start haben unterschiedliche Anforderungen.'],
      ['Begleitung und Qualifikation', 'Ausbildung, Unterstützung und Verantwortung werden klar voneinander getrennt.'],
      ['Persönliche Passung', 'Nicht jeder Weg passt zu jedem Menschen. Genau das darf früh sichtbar werden.']
    ],
    tools: [
      ['KarriereCheck', 'Welcher Weg könnte zu Ihnen passen?', 'Zwölf neutrale Fragen geben eine erste Orientierung ohne Bewerbung.', 'https://karrierecheck.kaiblobel.de/'],
      ['Kennenlernen', 'Das Team unverbindlich kennenlernen', 'Ein persönlicher Termin klärt offene Fragen und gegenseitige Erwartungen.', '#termin']
    ]
  }
};

const TOPIC_ORDER = ['investment', 'foerderungen', 'baufi', 'absicherung', 'selbstaendige', 'banking', 'energie', 'kinder', 'karriere'];
const HERO_VISUALS = {
  investment: `
    <div class="visual-orbit"><i></i><i></i><i></i><b></b></div>
    <div class="visual-pills"><span>Reserve</span><span>Ziele</span><span>Aufbau</span></div>`,
  foerderungen: `
    <div class="visual-stack"><span><small>01</small>Eigener Plan</span><span><small>02</small>Arbeitgeber</span><span><small>03</small>Förderung</span></div>
    <strong class="visual-sum">Gemeinsam gedacht</strong>`,
  baufi: `
    <div class="visual-house"><i class="visual-roof"></i><i class="visual-home"></i><i class="visual-door"></i></div>
    <div class="visual-route"><span>Idee</span><i></i><span>Rahmen</span><i></i><span>Zuhause</span></div>`,
  absicherung: `
    <div class="visual-shield"><i></i><i></i><strong>Was zählt</strong></div>
    <div class="visual-pills"><span>Einkommen</span><span>Familie</span><span>Werte</span></div>`,
  selbstaendige: `
    <div class="visual-balance"><span><small>PRIVAT</small>Ziele &amp; Vorsorge</span><i></i><span><small>BETRIEB</small>Liquidität &amp; Schutz</span></div>
    <strong class="visual-sum">Ein Gesamtbild</strong>`,
  banking: `
    <div class="visual-flow"><span><small>EINGANG</small>Konto</span><i></i><span><small>PRIORITÄT</small>Rücklage</span><i></i><span><small>ZIEL</small>Freiraum</span></div>`,
  energie: `
    <div class="visual-energy"><span class="visual-sun"></span><div><i></i><i></i><i></i><i></i></div><b>Verbrauch verstehen</b></div>
    <div class="visual-pills"><span>Strom</span><span>Gas</span><span>Solar</span></div>`,
  kinder: `
    <div class="visual-stack"><span><small>01</small>Finanzielle Kompetenz</span><span><small>02</small>Gesundheit</span><span><small>03</small>Absicherung</span></div>
    <strong class="visual-sum">Kinderleicht in die Zukunft</strong>`,
  karriere: `
    <div class="visual-steps"><span><small>01</small>Einblick</span><span><small>02</small>Passung</span><span><small>03</small>Perspektive</span></div>
    <strong class="visual-sum">Dein nächster Weg</strong>`,
};
const BAUFI_PATHS = {
  orient: {
    firstPublic: 'Wunsch, verfügbaren Spielraum und realistische Monatsbelastung zusammenbringen.',
    firstReferral: 'Wunsch, verfügbaren Spielraum und realistische Monatsbelastung zusammenbringen.',
    watchPublic: 'Zu früh einzelne Objekte oder Kreditangebote zu bewerten.',
    watchReferral: 'Zu früh einzelne Objekte oder Kreditangebote zu bewerten.',
    nextPublic: 'Einen tragfähigen Such- und Finanzierungsrahmen festlegen.',
    nextReferral: 'Einen tragfähigen Such- und Finanzierungsrahmen festlegen.',
    toolLabelPublic: 'Finanzierungskompass starten',
    toolLabelReferral: 'Finanzierungskompass starten',
    path: '/baufi.html?vorlage=baufi&situation=orientierung'
  },
  buy: {
    firstPublic: 'Kaufpreis, Nebenkosten, Zustand, Rücklagen und Zeitplan vollständig einordnen.',
    firstReferral: 'Kaufpreis, Nebenkosten, Zustand, Rücklagen und Zeitplan vollständig einordnen.',
    watchPublic: 'Unter Zeitdruck nur auf eine schnelle Finanzierungszusage zu schauen.',
    watchReferral: 'Unter Zeitdruck nur auf eine schnelle Finanzierungszusage zu schauen.',
    nextPublic: 'Objekt und Finanzierung als ein Gesamtbild prüfen.',
    nextReferral: 'Objekt und Finanzierung als ein Gesamtbild prüfen.',
    toolLabelPublic: 'Kaufvorhaben einordnen',
    toolLabelReferral: 'Kaufvorhaben einordnen',
    path: '/baufi.html?vorlage=baufi&situation=kauf'
  },
  build: {
    firstPublic: 'Grundstück, Haus, Baunebenkosten, Ausstattung und Reserve in einem Budget verbinden.',
    firstReferral: 'Grundstück, Haus, Baunebenkosten, Ausstattung und Reserve in einem Budget verbinden.',
    watchPublic: 'Einzelne Angebote zu addieren und fehlende Projektkosten zu spät zu entdecken.',
    watchReferral: 'Einzelne Angebote zu addieren und fehlende Projektkosten zu spät zu entdecken.',
    nextPublic: 'Einen belastbaren Projektkorridor und passende Förderwege entwickeln.',
    nextReferral: 'Einen belastbaren Projektkorridor und passende Förderwege entwickeln.',
    toolLabelPublic: 'Neubau-Kompass starten',
    toolLabelReferral: 'Neubau-Kompass starten',
    path: '/baufi.html?vorlage=baufi&situation=neubau'
  },
  modernize: {
    firstPublic: 'Maßnahmen, Reihenfolge, Kostenrahmen und Reserve vor dem ersten Auftrag sortieren.',
    firstReferral: 'Maßnahmen, Reihenfolge, Kostenrahmen und Reserve vor dem ersten Auftrag sortieren.',
    watchPublic: 'Fördervoraussetzungen erst zu prüfen, nachdem bereits beauftragt wurde.',
    watchReferral: 'Fördervoraussetzungen erst zu prüfen, nachdem bereits beauftragt wurde.',
    nextPublic: 'Modernisierung, Finanzierung und mögliche Förderung gemeinsam vorbereiten.',
    nextReferral: 'Modernisierung, Finanzierung und mögliche Förderung gemeinsam vorbereiten.',
    toolLabelPublic: 'Modernisierung einordnen',
    toolLabelReferral: 'Modernisierung einordnen',
    path: '/baufi.html?vorlage=baufi&situation=sanierung'
  },
  follow: {
    firstPublic: 'Restschuld, Ende der Zinsbindung und mögliche neue Rate kennen.',
    firstReferral: 'Restschuld, Ende der Zinsbindung und mögliche neue Rate kennen.',
    watchPublic: 'Nur das Verlängerungsangebot der bisherigen Bank zu betrachten.',
    watchReferral: 'Nur das Verlängerungsangebot der bisherigen Bank zu betrachten.',
    nextPublic: 'Restschuld berechnen und Anschlusswege mit ausreichend Vorlauf vergleichen.',
    nextReferral: 'Restschuld berechnen und Anschlusswege mit ausreichend Vorlauf vergleichen.',
    toolLabelPublic: 'Restschuld in 60 Sekunden prüfen',
    toolLabelReferral: 'Restschuld in 60 Sekunden prüfen',
    path: 'https://restschuldcheck.kaiblobel.de/'
  }
};
const BAUFI_CARD_META = {
  orient: {
    icon: 'compass',
    kicker: 'Erst verstehen',
    notePublic: 'Budget, Möglichkeiten und nächsten Schritt klar einordnen.',
    noteReferral: 'Budget, Möglichkeiten und nächsten Schritt klar einordnen.'
  },
  buy: {
    icon: 'key-round',
    kicker: 'Immobilie kaufen',
    notePublic: 'Objekt, Nebenkosten und tragfähige Rate zusammen prüfen.',
    noteReferral: 'Objekt, Nebenkosten und tragfähige Rate zusammen prüfen.'
  },
  build: {
    icon: 'hard-hat',
    kicker: 'Neu bauen',
    notePublic: 'Grundstück, Baukosten, Förderung und Puffer vollständig planen.',
    noteReferral: 'Grundstück, Baukosten, Förderung und Puffer vollständig planen.'
  },
  modernize: {
    icon: 'hammer',
    kicker: 'Wert erhalten',
    notePublic: 'Maßnahmen, Reihenfolge und Förderwege früh verbinden.',
    noteReferral: 'Maßnahmen, Reihenfolge und Förderwege früh verbinden.'
  },
  follow: {
    icon: 'calendar-clock',
    kicker: 'Rechtzeitig handeln',
    notePublic: 'Restschuld, Frist und neue Monatsrate mit Vorlauf vergleichen.',
    noteReferral: 'Restschuld, Frist und neue Monatsrate mit Vorlauf vergleichen.'
  }
};
const params = new URLSearchParams(window.location.search);
const isPreview = Boolean(document.getElementById('previewTopic'));
const token = params.get('token') || document.querySelector('meta[name="referral-token"]')?.content || '';
const requestedTopic = params.get('thema') || params.get('vorlage');
let currentTopic = TOPICS[requestedTopic] ? requestedTopic : 'investment';
let currentMode = token || params.get('modus') === 'referral' || params.get('einstieg') === 'empfehlung' ? 'referral' : 'public';
let currentAdvisor = params.get('berater') || 'kai-blobel';
let advisorData = null;
let recommendationData = null;
let interestMarked = false;

const topicSelect = document.getElementById('previewTopic');
const advisorSelect = document.getElementById('previewAdvisor');
const modeButtons = [...document.querySelectorAll('[data-preview-mode]')];

if (topicSelect) {
  TOPIC_ORDER.forEach((slug) => {
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = `${TOPICS[slug].number}  ${TOPICS[slug].title}`;
    topicSelect.append(option);
  });
  topicSelect.value = currentTopic;
}
if (advisorSelect && [...advisorSelect.options].some((option) => option.value === currentAdvisor)) advisorSelect.value = currentAdvisor;

function tone(publicText, referralText) {
  return currentMode === 'referral' ? referralText : publicText;
}

function initials(name) {
  return String(name || 'Kai Blobel').trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function syncUrl() {
  const next = new URL(window.location.href);
  next.searchParams.set(isPreview ? 'thema' : 'vorlage', currentTopic);
  if (isPreview) next.searchParams.set('modus', currentMode);
  else next.searchParams.delete('thema');
  if (currentAdvisor) next.searchParams.set('berater', currentAdvisor);
  window.history.replaceState({}, '', next);
}

function contextUrl(rawHref, extraParams = {}) {
  const isLocal = /^127\.0\.0\.1$|^localhost$/.test(window.location.hostname);
  const resolvedHref = isLocal && rawHref === 'https://restschuldcheck.kaiblobel.de/'
    ? 'http://127.0.0.1:4185/'
    : rawHref;
  const target = new URL(resolvedHref, window.location.origin);
  if (token) target.searchParams.set('token', token);
  if (currentAdvisor) target.searchParams.set('berater', currentAdvisor);
  target.searchParams.set('from', 'thema-baufi');
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value) target.searchParams.set(key, value);
  });
  if (target.origin !== window.location.origin && advisorData) {
    if (advisorData.name) target.searchParams.set('berater_name', advisorData.name);
    if (advisorData.bookings_url) target.searchParams.set('booking', advisorData.bookings_url);
    if (advisorData.foto_url) target.searchParams.set('foto', String(new URL(advisorData.foto_url, window.location.origin)));
    if (advisorData.whatsapp) target.searchParams.set('whatsapp', advisorData.whatsapp);
  }
  return target.origin === window.location.origin
    ? `${target.pathname}${target.search}${target.hash}`
    : String(target);
}

function renderAdvisorAvatar(advisor) {
  document.querySelectorAll('[data-advisor-avatar]').forEach((container) => {
    container.replaceChildren();
    if (advisor?.foto_url) {
      const image = document.createElement('img');
      image.src = advisor.foto_url;
      image.alt = advisor.name || '';
      container.append(image);
    } else {
      container.textContent = initials(advisor?.name);
    }
  });
}

function applyAdvisor(advisor) {
  advisorData = advisor || {
    name: 'Kai Blobel',
    rolle: 'Vermögensberater',
    bookings_url: 'https://outlook.office.com/book/RegionaldirektionKaiBlobel@dvag02.onmicrosoft.com/',
    impressum_url: 'https://www.dvag.de/kai.blobel/impressum.html',
    datenschutz_url: 'https://www.dvag.de/kai.blobel/datenschutz.html'
  };
  if (advisorData.slug) currentAdvisor = advisorData.slug;
  const firstName = String(advisorData.name || 'Kai').trim().split(/\s+/)[0];
  document.querySelectorAll('[data-bb="name"]').forEach((element) => { element.textContent = advisorData.name || 'Kai Blobel'; });
  document.querySelectorAll('[data-bb="vorname"]').forEach((element) => { element.textContent = firstName; });
  document.querySelectorAll('[data-bb="rolle"]').forEach((element) => { element.textContent = advisorData.rolle || 'Vermögensberater'; });
  document.querySelectorAll('[data-bb="booking"]').forEach((element) => {
    element.href = advisorData.bookings_url || '#termin';
    element.hidden = false;
  });
  document.querySelectorAll('[data-bb="impressum"]').forEach((element) => { element.href = advisorData.impressum_url || 'https://www.dvag.de/kai.blobel/impressum.html'; });
  document.querySelectorAll('[data-bb="datenschutz"]').forEach((element) => { element.href = advisorData.datenschutz_url || 'https://www.dvag.de/kai.blobel/datenschutz.html'; });
  renderAdvisorAvatar(advisorData);
  renderBackLinks();
}

async function loadAdvisor() {
  let data = null;
  if (recommendationData?.berater_id) data = (await getBeraterPublicById(recommendationData.berater_id)).data;
  if (!data && currentAdvisor) data = (await getBeraterPublicBySlug(currentAdvisor)).data;
  applyAdvisor(data);
}

function renderBackLinks() {
  const localCustomer = /^127\.0\.0\.1$|^localhost$/.test(window.location.hostname)
    ? `http://127.0.0.1:4184/?berater=${encodeURIComponent(currentAdvisor)}#beratung`
    : `https://kaiblobel.de/?berater=${encodeURIComponent(currentAdvisor)}#beratung`;
  const referralOverview = new URL('/empfaenger.html', window.location.origin);
  referralOverview.searchParams.set('vorlage', 'allgemein');
  if (token) referralOverview.searchParams.set('token', token);
  if (currentAdvisor) referralOverview.searchParams.set('berater', currentAdvisor);
  const target = currentMode === 'referral' ? referralOverview : localCustomer;
  document.getElementById('backToCustomer').href = String(target);
  document.getElementById('advisorBack').href = String(target);
  document.getElementById('advisorBack').textContent = currentMode === 'referral' ? 'Zur persönlichen Übersicht' : 'Zurück zur Kundenwebsite';
  const brandBackLabel = document.getElementById('brandBackLabel');
  if (brandBackLabel) brandBackLabel.textContent = currentMode === 'referral' ? 'Zur persönlichen Übersicht' : 'Zur Kundenwebsite';
}

function renderMode() {
  document.body.dataset.mode = currentMode;
  document.getElementById('referralNote').hidden = currentMode !== 'referral';
  document.getElementById('publicNote').hidden = currentMode === 'referral';
  const optOutLink = document.getElementById('optOutLink');
  optOutLink.hidden = currentMode !== 'referral' || !token;
  if (token) optOutLink.href = `/austragen.html?token=${encodeURIComponent(token)}`;
  const interestButton = document.getElementById('interestButton');
  if (interestButton) interestButton.hidden = isPreview || currentMode !== 'referral' || currentTopic === 'baufi';
  const orientationCta = document.getElementById('orientationCta');
  if (orientationCta) orientationCta.hidden = currentMode === 'referral' && !isPreview && currentTopic !== 'baufi';
  modeButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.previewMode === currentMode));
  renderBackLinks();
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function renderRecommendation(data = {}) {
  const promoter = String(data.empfehler_name || params.get('von') || 'Jemand aus deinem Umfeld').trim();
  const recipient = firstName(data.empfaenger_name || params.get('an'));
  const message = String(data.empfehler_nachricht || data.empfehler_standard_nachricht || '').trim();
  const refName = document.getElementById('refName');
  const refAvatar = document.getElementById('refAvatar');
  const refMessage = document.getElementById('refMessage');
  const refHeading = document.getElementById('refHeading');
  const recipientPrefix = document.getElementById('recipientPrefix');
  if (refName) refName.textContent = promoter;
  if (refAvatar) refAvatar.textContent = initials(promoter);
  if (refMessage && message) refMessage.textContent = `„${message}“`;
  if (refHeading && currentTopic === 'baufi') {
    refHeading.replaceChildren(document.createTextNode(`${promoter} hat bei deiner Baufinanzierung an `));
    const advisor = document.createElement('span');
    advisor.dataset.bb = 'vorname';
    advisor.textContent = String(advisorData?.name || 'Kai').trim().split(/\s+/)[0];
    refHeading.append(advisor, document.createTextNode(' gedacht.'));
  }
  if (recipientPrefix) recipientPrefix.textContent = recipient ? `${recipient}, ` : '';
}

function setInterestComplete() {
  interestMarked = true;
  const button = document.getElementById('interestButton');
  const feedback = document.getElementById('interestFeedback');
  if (button) {
    button.disabled = true;
    button.textContent = 'Interesse ist vorgemerkt';
  }
  if (feedback) feedback.textContent = 'Danke. Dein Ansprechpartner sieht, dass dieses Thema für dich interessant ist.';
}

async function markLeadInterest() {
  if (interestMarked || !token) return false;
  const button = document.getElementById('interestButton');
  const feedback = document.getElementById('interestFeedback');
  if (button) {
    button.disabled = true;
    button.textContent = 'Wird vorgemerkt …';
  }
  const { error } = await markInteressiert(token);
  if (error) {
    if (button) {
      button.disabled = false;
      button.textContent = 'Dieses Thema interessiert mich';
    }
    if (feedback) feedback.textContent = 'Das hat gerade nicht geklappt. Bitte versuche es noch einmal.';
    return false;
  }
  setInterestComplete();
  return true;
}

function renderSignals(topic) {
  document.getElementById('signalGrid').innerHTML = topic.signals.map((signal, index) => `
    <article class="signal-card">
      <span>0${index + 1}</span>
      <h3>${signal[0]}</h3>
      <p>${signal[1]}</p>
    </article>
  `).join('');
}

function renderOptions(topic) {
  const wrap = document.getElementById('orientationOptions');
  const isBaufi = currentTopic === 'baufi';
  wrap.innerHTML = topic.options.map((option, index) => {
    const meta = isBaufi ? BAUFI_CARD_META[option[0]] : null;
    if (!meta) return `
      <button class="orientation-option" type="button" data-option="${option[0]}" aria-pressed="false">
        <span class="orientation-number">0${index + 1}</span>
        <strong>${option[1]}</strong>
      </button>
    `;
    return `
      <button class="orientation-option orientation-option-baufi" type="button" data-option="${option[0]}" aria-pressed="false">
        <span class="orientation-card-media" aria-hidden="true"></span>
        <span class="orientation-card-top">
          <span class="orientation-number">0${index + 1}</span>
          <span class="orientation-icon" aria-hidden="true"><img src="/assets/icons/baufi/${meta.icon}.svg" alt=""></span>
        </span>
        <span class="orientation-card-copy">
          <small>${meta.kicker}</small>
          <strong>${option[1]}</strong>
          <em>${tone(meta.notePublic, meta.noteReferral)}</em>
        </span>
        <span class="orientation-arrow">Auswählen <b aria-hidden="true">↗</b></span>
      </button>
    `;
  }).join('');
  document.getElementById('orientationResult').hidden = true;
  wrap.querySelectorAll('[data-option]').forEach((button) => {
    button.addEventListener('click', () => {
      wrap.querySelectorAll('[data-option]').forEach((item) => {
        const isSelected = item === button;
        item.classList.toggle('is-selected', isSelected);
        item.setAttribute('aria-pressed', String(isSelected));
      });
      const selected = topic.options.find((option) => option[0] === button.dataset.option);
      document.getElementById('orientationResultTitle').textContent = selected[1];
      document.getElementById('orientationResultText').textContent = selected[2];
      const toolLink = document.getElementById('orientationToolLink');
      const baufiPoints = document.getElementById('baufiResultPoints');
      if (currentTopic === 'baufi' && BAUFI_PATHS[selected[0]]) {
        const path = BAUFI_PATHS[selected[0]];
        document.getElementById('baufiFirst').textContent = tone(path.firstPublic, path.firstReferral);
        document.getElementById('baufiWatch').textContent = tone(path.watchPublic, path.watchReferral);
        document.getElementById('baufiNext').textContent = tone(path.nextPublic, path.nextReferral);
        baufiPoints.hidden = false;
        toolLink.hidden = false;
        toolLink.textContent = tone(path.toolLabelPublic, path.toolLabelReferral);
        toolLink.href = contextUrl(path.path, { situation: selected[0] });
        toolLink.target = path.path.startsWith('http') ? '_blank' : '';
        toolLink.rel = path.path.startsWith('http') ? 'noopener' : '';
      } else {
        baufiPoints.hidden = true;
        toolLink.hidden = true;
      }
      document.getElementById('orientationResult').hidden = false;
    });
  });
}

function renderScopes(topic) {
  document.getElementById('scopeGrid').innerHTML = topic.scopes.map((scope, index) => `
    <article class="scope-card">
      <span>0${index + 1}</span>
      <h3>${scope[0]}</h3>
      <p>${scope[1]}</p>
    </article>
  `).join('');
}

function renderHeroVisual(topic) {
  const label = document.getElementById('topicCardLabel');
  const visual = document.getElementById('topicVisual');
  if (label) label.textContent = topic.title;
  if (visual) visual.innerHTML = HERO_VISUALS[currentTopic] || HERO_VISUALS.investment;
}

function renderTools(topic) {
  document.getElementById('toolGrid').innerHTML = topic.tools.map((tool) => {
    let href = tool[3] === '#termin' ? (advisorData?.bookings_url || '#termin') : tool[3];
    if (currentTopic === 'baufi' && tool[0] === 'Restschuld-Check') href = contextUrl(href, { situation: 'follow' });
    if (href.startsWith('/')) {
      const contextualTarget = new URL(href, window.location.origin);
      if (token) contextualTarget.searchParams.set('token', token);
      if (currentAdvisor) contextualTarget.searchParams.set('berater', currentAdvisor);
      href = `${contextualTarget.pathname}${contextualTarget.search}${contextualTarget.hash}`;
    }
    return `
      <a class="tool-card" href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} data-track-tool>
        <span>${tool[0]}</span>
        <strong>${tool[1]}</strong>
        <p>${tool[2]}</p>
        <b>Öffnen</b>
      </a>
    `;
  }).join('');
}

function renderBaufiMode() {
  const isBaufi = currentTopic === 'baufi';
  document.getElementById('baufiHeroProof').hidden = !isBaufi;
  document.getElementById('genericHeroGuide').hidden = isBaufi;
  document.getElementById('baufiPractice').hidden = !isBaufi;
  document.getElementById('baufiAnalysis').hidden = !isBaufi;
  document.getElementById('baufiFunding').hidden = !isBaufi;
  document.getElementById('baufiDifference').hidden = !isBaufi;
  document.getElementById('baufiSticky').hidden = !isBaufi;
  document.getElementById('baufiNextSteps').hidden = !isBaufi;
  document.getElementById('signalsSection').hidden = isBaufi;
  document.getElementById('scopeSection').hidden = isBaufi;
  document.getElementById('toolsSection').hidden = isBaufi;

  const hero = document.querySelector('.topic-hero');
  const practice = document.getElementById('baufiPractice');
  const signals = document.getElementById('signalsSection');
  const orientation = document.getElementById('orientierung');
  const analysis = document.getElementById('baufiAnalysis');
  const funding = document.getElementById('baufiFunding');
  const difference = document.getElementById('baufiDifference');
  const scope = document.getElementById('scopeSection');
  const tools = document.getElementById('toolsSection');
  const advisor = document.getElementById('termin');
  const moreTopics = document.querySelector('.more-topics');

  if (isBaufi) {
    hero.after(orientation);
    orientation.after(practice);
    practice.after(advisor);
    advisor.after(analysis);
    analysis.after(funding);
    funding.after(difference);
  } else {
    hero.after(practice);
    practice.after(signals);
    signals.after(orientation);
    orientation.after(analysis);
    analysis.after(funding);
    funding.after(difference);
    difference.after(scope);
    scope.after(tools);
    tools.after(advisor);
    advisor.after(moreTopics);
  }

  if (isBaufi) {
    document.getElementById('orientationCta').textContent = tone('Meine Situation einordnen', 'Meine Situation einordnen');
    document.getElementById('orientationHeading').textContent = tone('Was haben Sie vor?', 'Was hast du vor?');
    document.getElementById('orientationIntro').textContent = tone(
      'Eine Auswahl genügt. Danach sehen Sie sofort, worauf es in Ihrer Situation ankommt.',
      'Eine Auswahl genügt. Danach siehst du sofort, worauf es in deiner Situation ankommt.'
    );
    document.getElementById('toolsHeading').textContent = tone('Genau dort weitergehen, wo es für Sie sinnvoll ist.', 'Genau dort weitergehen, wo es für dich sinnvoll ist.');
    document.getElementById('toolsEyebrow').textContent = 'Ihre passenden Werkzeuge';
    document.getElementById('baufiPromise').textContent = tone(
      'Wenn Ihre bestehende Lösung bereits gut ist, sagen wir das auch. Es geht nicht um eine Finanzierung um jeden Preis, sondern um eine tragfähige Entscheidung.',
      'Wenn deine bestehende Lösung bereits gut ist, sagen wir das auch. Es geht nicht um eine Finanzierung um jeden Preis, sondern um eine tragfähige Entscheidung.'
    );
    document.querySelectorAll('.topic-hero [data-bb="booking"], #termin [data-bb="booking"], #baufiSticky').forEach((link) => {
      link.textContent = tone('Termin zur Baufinanzierung wählen', 'Termin zur Baufinanzierung wählen');
    });
  } else {
    document.getElementById('orientationCta').textContent = 'Erste Orientierung erhalten';
    document.getElementById('toolsHeading').textContent = 'Passende nächste Schritte';
  }
}

function renderTopicLinks() {
  document.getElementById('topicLinks').innerHTML = TOPIC_ORDER.map((slug) => `
    <button class="topic-link${slug === currentTopic ? ' is-active' : ''}" type="button" data-topic-link="${slug}">${TOPICS[slug].title}</button>
  `).join('');
  document.querySelectorAll('[data-topic-link]').forEach((button) => {
    button.addEventListener('click', () => {
      currentTopic = button.dataset.topicLink;
      topicSelect.value = currentTopic;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function render() {
  const topic = TOPICS[currentTopic];
  document.body.dataset.theme = currentTopic;
  document.getElementById('topicNumber').textContent = topic.number;
  document.getElementById('topicEyebrow').textContent = topic.eyebrow;
  const recipient = currentMode === 'referral' ? firstName(recommendationData?.empfaenger_name || params.get('an')) : '';
  document.getElementById('topicHeading').textContent = `${recipient ? `${recipient}, ` : ''}${tone(topic.headlinePublic, topic.headlineReferral)}`;
  document.getElementById('topicLede').textContent = tone(topic.ledePublic, topic.ledeReferral);
  document.getElementById('orientationCta').textContent = tone('Erste Orientierung erhalten', 'Erste Orientierung erhalten');
  document.getElementById('signalsHeading').textContent = tone('Kommt Ihnen davon etwas bekannt vor?', 'Kommt dir davon etwas bekannt vor?');
  document.getElementById('signalsIntro').textContent = tone('Drei typische Situationen, bei denen sich ein genauer Blick lohnt.', 'Drei typische Situationen, bei denen sich ein genauer Blick lohnt.');
  document.getElementById('orientationHeading').textContent = tone('Wo stehen Sie gerade?', 'Wo stehst du gerade?');
  document.getElementById('orientationIntro').textContent = tone('Eine Auswahl genügt. Es werden keine Angaben gespeichert.', 'Eine Auswahl genügt. Es werden keine Angaben gespeichert.');
  const decisionTrust = document.getElementById('decisionTrust');
  if (decisionTrust) decisionTrust.textContent = tone('Sie entscheiden', 'Du entscheidest');
  const stepSituation = document.getElementById('stepSituation');
  if (stepSituation) stepSituation.textContent = tone('Was beschäftigt Sie gerade?', 'Was beschäftigt dich gerade?');
  const stepPossibilities = document.getElementById('stepPossibilities');
  if (stepPossibilities) stepPossibilities.textContent = tone('Was passt wirklich zu Ihnen?', 'Was passt wirklich zu dir?');
  const orientationResultLabel = document.getElementById('orientationResultLabel');
  if (orientationResultLabel) orientationResultLabel.textContent = tone('Ihre erste Einordnung', 'Deine erste Einordnung');
  const toolsEyebrow = document.getElementById('toolsEyebrow');
  if (toolsEyebrow) toolsEyebrow.textContent = tone('Wenn Sie tiefer einsteigen möchten', 'Wenn du tiefer einsteigen möchtest');
  const advisorKicker = document.getElementById('advisorKicker');
  if (advisorKicker) advisorKicker.textContent = tone('Ihr persönlicher Ansprechpartner', 'Dein persönlicher Ansprechpartner');
  const advisorHeading = document.getElementById('advisorHeading');
  if (advisorHeading) {
    const advisorName = document.createElement('span');
    advisorName.dataset.bb = 'name';
    advisorName.textContent = advisorData?.name || 'Kai Blobel';
    advisorHeading.replaceChildren(advisorName, ` begleitet ${tone('Sie', 'dich')} weiter.`);
  }
  document.getElementById('advisorText').textContent = tone(
    'Sie müssen heute noch nichts entscheiden. Wenn Sie möchten, schauen wir gemeinsam auf Ihre Situation und klären, welcher nächste Schritt sinnvoll ist.',
    'Du musst heute noch nichts entscheiden. Wenn du möchtest, schauen wir gemeinsam auf deine Situation und klären, welcher nächste Schritt sinnvoll ist.'
  );
  const refHeading = document.getElementById('refHeading');
  if (refHeading && currentMode === 'referral' && currentTopic !== 'baufi') {
    const promoter = String(recommendationData?.empfehler_name || params.get('von') || 'Jemand aus deinem Umfeld').trim();
    refHeading.textContent = `${promoter} hat bei diesem Thema an dich gedacht.`;
  }
  document.title = `${topic.title} | Team Wachsbleiche`;
  renderMode();
  renderSignals(topic);
  renderOptions(topic);
  renderScopes(topic);
  renderHeroVisual(topic);
  renderTools(topic);
  renderBaufiMode();
  if (currentMode === 'referral') renderRecommendation(recommendationData || {});
  renderTopicLinks();
  syncUrl();
}

topicSelect?.addEventListener('change', () => {
  currentTopic = topicSelect.value;
  render();
});

advisorSelect?.addEventListener('change', async () => {
  currentAdvisor = advisorSelect.value;
  await loadAdvisor();
  render();
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentMode = button.dataset.previewMode;
    render();
  });
});

document.getElementById('orientationReset')?.addEventListener('click', () => {
  document.getElementById('orientationOptions').querySelectorAll('.is-selected').forEach((button) => button.classList.remove('is-selected'));
  document.getElementById('orientationResult').hidden = true;
  document.getElementById('orientationHeading').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.addEventListener('click', (event) => {
  const booking = event.target.closest('[data-preview-booking]');
  if (!booking || !isPreview) return;
  event.preventDefault();
  const original = booking.textContent;
  booking.textContent = `Vorschau: Termin bei ${advisorData?.name || 'Kai Blobel'}`;
  window.setTimeout(() => { booking.textContent = original; }, 1800);
});

document.getElementById('optOutLink')?.addEventListener('click', (event) => {
  if (!isPreview) return;
  event.preventDefault();
  event.currentTarget.textContent = 'Vorschau: Empfehlung würde hier abgemeldet';
});

document.getElementById('interestButton')?.addEventListener('click', () => { void markLeadInterest(); });
document.addEventListener('click', (event) => {
  if (isPreview || currentMode !== 'referral') return;
  if (event.target.closest('[data-track-booking], [data-track-tool]')) void markLeadInterest();
});

if (!isPreview && token) {
  const result = await getEmpfehlungByToken(token);
  recommendationData = result.data || null;
  if (recommendationData) {
    const recommendedTopic = recommendationData.vorlage_slug;
    if (!TOPICS[requestedTopic] && TOPICS[recommendedTopic]) currentTopic = recommendedTopic;
    renderRecommendation(recommendationData);
    if (recommendationData.interessiert) setInterestComplete();
  } else {
    renderRecommendation();
  }
} else if (currentMode === 'referral') {
  renderRecommendation();
}

await loadAdvisor();
render();
