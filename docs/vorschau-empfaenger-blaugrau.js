/**
 * Vorschau der Empfehlungsseite in Weiß-Gold · nur zum Ansehen.
 *
 * Keine Netzaufrufe, keine Datenbank, kein Zähler. Alle Angaben stehen als
 * Beispieldaten in dieser Datei. Die Kontaktwege öffnen nur einen Erklärkasten.
 *
 * Ansichten über die Adresse:
 *   ?ansicht=kai       Kai als zugeordneter Beispielberater (Vorgabe)
 *   ?ansicht=neutral   ohne Zuordnung: kein Name, kein Foto, keine Kontaktziele
 *   ?empfehler=beispiel   zusätzlich eine als Beispiel gekennzeichnete Empfehlung
 */
(function () {
  'use strict';

  // Beispieldaten. Entsprechen dem, was die echte Seite aus einer gültigen
  // Zuordnung bekommt. Hier fest hinterlegt, damit nichts geladen werden muss.
  const BERATER_KAI = {
    name: 'Kai Blobel',
    vorname: 'Kai',
    rolle: 'Regionaldirektionsleiter · Deutsche Vermögensberatung',
    foto: '../assets/images/kai-portrait.jpg',
    bueroFoto: '../assets/images/praesentation/kai-buero-teamwand.jpg',
    bueroZeile: 'Ein Hallo aus unserem Büro.',
    istStandardBerater: true,
    instagram: 'https://www.instagram.com/team_wachsbleiche/',
    facebook: 'https://www.facebook.com/people/Team-Wachsbleiche/61594233901851/',
    impressum: 'https://www.dvag.de/kai.blobel/impressum.html',
    datenschutz: 'https://www.dvag.de/kai.blobel/datenschutz.html',
    team: 'Kai Blobel & Team',
  };

  // Ohne Zuordnung: bewusst kein Rückfall auf Kai. Nur das, was dem ganzen Team
  // gehört. Die Profile des Büros bleiben, sie sind keine Beraterangabe.
  const OHNE_ZUORDNUNG = {
    name: '',
    vorname: '',
    rolle: '',
    foto: '',
    bueroFoto: '../assets/images/praesentation/kai-buero-teamwand.jpg',
    bueroZeile: 'Ein Hallo aus unserem Büro.',
    istStandardBerater: false,
    instagram: 'https://www.instagram.com/team_wachsbleiche/',
    facebook: 'https://www.facebook.com/people/Team-Wachsbleiche/61594233901851/',
    impressum: 'https://www.dvag.de/kai.blobel/impressum.html',
    datenschutz: 'https://www.dvag.de/kai.blobel/datenschutz.html',
    team: 'Team Wachsbleiche',
  };

  const THEMEN = {
    kosten: {
      etikett: 'Geld behalten',
      rueckmeldung: 'Hier fängst du an: Geld behalten.',
      ueberschrift: 'Wo lohnt sich ein Blick auf deine Ausgaben?',
      text: 'Du beginnst mit deinen laufenden Kosten. Anschließend geht es um mögliche Förderungen und das Zusammenspiel deiner Finanzen.',
    },
    foerderung: {
      etikett: 'Vorteile nutzen',
      rueckmeldung: 'Hier fängst du an: Vorteile nutzen.',
      ueberschrift: 'Welche Förderungen passen zu deinem Leben?',
      text: 'Du beginnst mit möglichen staatlichen Vorteilen. Anschließend schaust du auf deine Ausgaben, Vorsorge und Absicherung.',
    },
    struktur: {
      etikett: 'Das Ganze sehen',
      rueckmeldung: 'Hier fängst du an: Das Ganze sehen.',
      ueberschrift: 'Wie passen deine Finanzen zusammen?',
      text: 'Du beginnst mit dem Zusammenspiel von Vorsorge, Vermögen und Absicherung. Danach schaust du auf Kosten und mögliche Förderungen.',
    },
  };

  const DIALOGE = {
    termin: {
      titel: 'Deinen Termin auswählen',
      text: 'Hier öffnet sich in der fertigen Seite der Terminkalender deiner Beraterin oder deines Beraters. In dieser Vorschau wird kein Termin gebucht.',
    },
    frage: {
      titel: 'Eine Frage schreiben',
      text: 'Hier öffnet sich in der fertigen Seite WhatsApp. Du formulierst und sendest deine Nachricht selbst. Diese Vorschau versendet nichts.',
    },
    check: {
      titel: 'Deine sieben Fragen',
      text: 'Hier geht es in der fertigen Seite zum Finanzcheck mit deinem gewählten Schwerpunkt. Die Vorschau erfasst keine Antworten.',
    },
    ueberblick: {
      titel: 'Das ganze Bild ansehen',
      text: 'Hier öffnet sich in der fertigen Seite die bestehende Überblicksseite.',
    },
    ohneBerater: {
      titel: 'Noch keine Zuordnung',
      text: 'Ohne persönlichen Link steht noch nicht fest, wer dich begleitet. In der fertigen Seite gibt es hier deshalb keinen Termin- und keinen Nachrichtenweg, sondern den Hinweis, wie du zu einer Beraterin oder einem Berater kommst.',
    },
  };

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const mitZuordnung = (params.get('ansicht') || 'kai') !== 'neutral';
  const mitEmpfehler = params.get('empfehler') === 'beispiel';
  const berater = mitZuordnung ? BERATER_KAI : OHNE_ZUORDNUNG;

  let schritt = 1;
  let thema = '';

  /* ---------- Ansicht aufbauen ---------- */

  function setzeText(id, wert) {
    const el = $(id);
    if (el) el.textContent = wert;
  }

  function baueAnsicht() {
    const name = berater.name;
    const vorname = berater.vorname;

    // Kopfzeile
    const markeFoto = $('markeFoto');
    if (berater.foto) {
      markeFoto.src = berater.foto;
      markeFoto.alt = name;
      markeFoto.hidden = false;
    } else {
      markeFoto.hidden = true;
    }
    setzeText('markeName', berater.team);
    setzeText('fussName', berater.team);
    setzeText('willkommenBand', mitZuordnung ? `Willkommen bei ${berater.team}` : 'Willkommen bei Team Wachsbleiche');

    // Schritt 1: Person nur mit Zuordnung
    $('notizEinstieg').hidden = !mitZuordnung;
    $('notizNeutral').hidden = mitZuordnung;
    $('portraitKarte').hidden = !mitZuordnung;
    if (mitZuordnung) {
      $('notizFoto').src = berater.foto;
      $('notizFoto').alt = name;
      setzeText('notizText', `Hallo, ich bin ${vorname}. Hier lernst du mich und meine Arbeit kennen. Wenn du danach eine Frage hast, schreib mir einfach.`);
      setzeText('notizSignatur', vorname);
      $('portraitFoto').src = berater.foto;
      $('portraitFoto').alt = name;
      setzeText('portraitName', name);
      setzeText('portraitRolle', berater.rolle);
      setzeText('filmText', `Der Film zeigt dir, wie ${vorname} auf Finanzen schaut. Danach kannst du das Thema wählen, das dich gerade beschäftigt.`);
      setzeText('kennenlernenKnopf', `Erst ${vorname} kennenlernen`);
      setzeText('sprechenKnopf', `Mit ${vorname} sprechen`);
      setzeText('abschlussMit', `Mit ${name}`);
      setzeText('frageZiel', `Über WhatsApp direkt an ${vorname}.`);
      setzeText('vorstellungUeberschrift', `Ich bin ${vorname}. Und ich höre erst mal zu.`);
      setzeText('ablaufDrei', 'Wenn du möchtest, schauen wir uns dein Ergebnis zusammen an.');
      $('notizAbschluss').hidden = false;
      $('abschlussFoto').src = berater.foto;
      $('abschlussFoto').alt = name;
      setzeText('abschlussSignatur', vorname);
    } else {
      // Ohne Zuordnung: keine Person, keine Ich-Form, keine Zahlen, keine Bewertung.
      setzeText('filmText', 'Der Film zeigt, wie wir auf Finanzen schauen. Danach kannst du das Thema wählen, das dich gerade beschäftigt.');
      setzeText('kennenlernenKnopf', 'Erst das Team kennenlernen');
      setzeText('sprechenKnopf', 'So geht es weiter');
      setzeText('abschlussMit', 'Noch keine persönliche Zuordnung');
      setzeText('frageZiel', 'Erst mit einer Zuordnung möglich.');
      setzeText('vorstellungUeberschrift', 'Wer dich begleitet, steht mit deinem persönlichen Link fest.');
      setzeText('vorstellungText', 'Diese Seite gehört dem ganzen Team. Sobald du über den persönlichen Link einer Beraterin oder eines Beraters kommst, steht hier genau diese Person mit Foto, Kontaktweg und Terminkalender.');
      setzeText('ablaufDrei', 'Wenn du möchtest, schaut ihr euch dein Ergebnis gemeinsam an.');
      setzeText('bueroName', 'Ein Hallo aus unserem Büro.');
      setzeText('abschlussText', 'Für einen Termin oder eine Nachricht fehlt noch die persönliche Zuordnung. Über den Link deiner Beraterin oder deines Beraters stehen hier beide Wege.');
      $('fakten').hidden = true;
      $('rezension').hidden = true;
      $('notizAbschluss').hidden = true;
    }

    // Kais Zahlen und die Rezension gehören nur zum Standard-Berater.
    if (mitZuordnung && !berater.istStandardBerater) {
      $('fakten').hidden = true;
      $('rezension').hidden = true;
    }

    // Empfehlung nur, wenn es eine gibt. Sonst kein "Jemand aus deinem Umfeld".
    const karte = $('empfehlungKarte');
    if (mitEmpfehler && mitZuordnung) {
      karte.hidden = false;
      setzeText('empfehlungText', `Anna hat dir diese Seite empfohlen.`);
      setzeText('willkommenBand', 'Eine Empfehlung von Anna');
    } else {
      karte.hidden = true;
    }

    // Fuß
    $('linkInstagram').href = berater.instagram;
    $('linkFacebook').href = berater.facebook;
    $('linkImpressum').href = berater.impressum;
    $('linkDatenschutz').href = berater.datenschutz;
  }

  /* ---------- Schritte ---------- */

  function zeigeSchritt(n) {
    if (n < 1 || n > 6) return;
    schritt = n;
    // Bewusst auf den Inhaltsbereich begrenzt. Ein Selektor über die ganze
    // Seite versteckt alles mit diesem Merkmal, notfalls auch den Seitenkörper.
    document.querySelectorAll('main [data-schritt]').forEach((el) => {
      el.hidden = Number(el.dataset.schritt) !== n;
    });
    document.querySelectorAll('#fortschritt i').forEach((i, k) => {
      i.classList.toggle('aktiv', k === n - 1);
      i.classList.toggle('fertig', k < n - 1);
    });
    setzeText('schrittJetzt', String(n));
    // Eigener Name, nicht data-schritt: Sonst fasst der Schrittwechsel oben den
    // Seitenkörper mit an und blendet die ganze Seite aus.
    document.body.dataset.aktiverSchritt = String(n);
    $('zurueck').hidden = n === 1;
    window.scrollTo({ top: 0, behavior: 'auto' });
    const kopf = document.querySelector(`[data-schritt="${n}"] h1, [data-schritt="${n}"] h2`);
    if (kopf) {
      kopf.setAttribute('tabindex', '-1');
      kopf.focus({ preventScroll: true });
    }
  }

  function waehleThema(schluessel) {
    thema = schluessel;
    const t = THEMEN[schluessel];
    document.querySelectorAll('.thema').forEach((el) => {
      el.setAttribute('aria-pressed', String(el.dataset.thema === schluessel));
    });
    setzeText('themenRueckmeldung', t.rueckmeldung);
    setzeText('ergebnisUeberschrift', t.ueberschrift);
    setzeText('ergebnisText', t.text);
    setzeText('schwerpunktEtikett', t.etikett);
    $('themaWeiter').disabled = false;
  }

  /* ---------- Erklärkasten ---------- */

  function zeigeDialog(schluessel) {
    const d = DIALOGE[schluessel];
    if (!d) return;
    setzeText('dialogTitel', d.titel);
    setzeText('dialogText', d.text);
    const dlg = $('hinweisDialog');
    if (typeof dlg.showModal === 'function') dlg.showModal();
  }

  /* ---------- Verdrahtung ---------- */

  document.addEventListener('click', (e) => {
    const weiter = e.target.closest('[data-weiter]');
    if (weiter) {
      if (schritt === 3 && !thema) return;
      zeigeSchritt(schritt + 1);
      return;
    }
    const thema0 = e.target.closest('.thema');
    if (thema0) {
      waehleThema(thema0.dataset.thema);
      return;
    }
    const dialog = e.target.closest('[data-dialog]');
    if (dialog) {
      const art = dialog.dataset.dialog;
      zeigeDialog(!mitZuordnung && (art === 'termin' || art === 'frage') ? 'ohneBerater' : art);
    }
  });

  $('zurueck').addEventListener('click', () => zeigeSchritt(schritt - 1));
  $('zurueckThemen').addEventListener('click', () => zeigeSchritt(3));
  $('dialogSchliessen').addEventListener('click', () => $('hinweisDialog').close());

  baueAnsicht();
  zeigeSchritt(1);
})();
