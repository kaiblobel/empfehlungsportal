/* ============================================================
   MOCK · Überblicksseite „Das ganze Bild"
   Entwurf zur Ansicht. Wird in Etappe 2 zu js/ueberblick.js.

   Bewusst ohne Netz: kein Supabase, kein Tracking, kein Speichern.
   Alles läuft nur in diesem Browserfenster.
   ============================================================ */
(function () {
  'use strict';

  /* ================================================================
     NUR IM ENTWURF: Berater-Umschalter

     Die echte Seite holt den Berater über drei Wege aus der Datenbank
     (Token → ?berater=slug → eingeloggte Sitzung) und reicht ihn an
     applyBeraterBrand weiter. Hier wird das mit zwei Beispieldaten
     nachgestellt, damit man sieht, was bei einem Partner passiert.

     Aufruf:  ?berater=kai-blobel   (Standard)
              ?berater=partner      (fremder Berater)
     ================================================================ */
  var BEISPIEL = {
    'kai-blobel': {
      id: 'standard', slug: 'kai-blobel',
      name: 'Kai Blobel', rolle: 'Regionaldirektion',
      // Feld gibt es im Beraterdatensatz noch nicht, siehe Plan-Datei.
      adresse: 'An der Wachsbleiche 1a · 03046 Cottbus',
      foto_url: '/assets/images/kai-portrait.jpg',
      bookings_url: 'https://outlook.office.com/book/beispiel/',
      telefon: '03556 1234567', email: 'kai.blobel@dvag.de', whatsapp: '4915154776159',
      impressum_url: 'https://www.dvag.de/kai.blobel/impressum.html',
      datenschutz_url: 'https://www.dvag.de/kai.blobel/datenschutz.html'
    },
    'partner': {
      id: 'anderer', slug: 'sven-augustin',
      name: 'Sven Augustin', rolle: 'Agenturleiter',
      adresse: 'Bahnhofstraße 12 · 03149 Forst (Lausitz)',
      foto_url: '',                                   // kein Foto → Team-Marke
      bookings_url: 'https://outlook.office.com/book/anderer/',
      telefon: '0355 7654321', email: 'sven.augustin@dvag.de', whatsapp: '',
      impressum_url: 'https://www.dvag.de/sven.augustin/impressum.html',
      datenschutz_url: 'https://www.dvag.de/sven.augustin/datenschutz.html'
    }
  };

  function initialen(name) {
    var i = (name || '?').trim().split(/\s+/).map(function (s) { return s[0] || ''; })
      .join('').slice(0, 2).toUpperCase() || '?';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">' +
      '<rect width="280" height="280" fill="#C9B98A"/><text x="50%" y="52%" dy=".35em" ' +
      'text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="600" ' +
      'font-size="112" fill="#fffcf7">' + i + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Nachbau von js/berater-brand.js, gekürzt auf die hier benutzten Haken.
  function setzeBerater(b) {
    var istStandard = b.slug === 'kai-blobel';
    if (!istStandard) {
      document.querySelectorAll('[data-default-berater-only]').forEach(function (el) {
        el.style.display = 'none';
      });
    }
    var vorname = (b.name || '').trim().split(/\s+/)[0] || '';
    var tel = (b.telefon || '').replace(/[^\d+]/g, '');
    if (tel && tel.charAt(0) !== '+') tel = '+' + tel.replace(/^0+/, '');

    document.querySelectorAll('[data-bb]').forEach(function (el) {
      var weg = function () { el.style.display = 'none'; };
      switch (el.dataset.bb) {
        case 'foto': el.src = b.foto_url || initialen(b.name); if (b.name) el.alt = b.name; break;
        case 'name': if (b.name) el.textContent = b.name; break;
        case 'vorname': if (vorname) el.textContent = vorname; break;
        case 'rolle': if (b.rolle) el.textContent = b.rolle; break;
        // Neuer Haken. Ohne Anschrift verschwindet die Zeile, statt die
        // Anschrift eines anderen Beraters stehen zu lassen.
        case 'adresse': b.adresse ? el.textContent = b.adresse : weg(); break;
        case 'booking': b.bookings_url ? el.href = b.bookings_url : weg(); break;
        case 'whatsapp': b.whatsapp ? el.href = 'https://wa.me/' + b.whatsapp : weg(); break;
        case 'tel': tel ? el.href = 'tel:' + tel : weg(); break;
        case 'tel-text': tel ? (el.href = 'tel:' + tel, el.textContent = b.telefon) : weg(); break;
        case 'email': b.email ? el.href = 'mailto:' + b.email : weg(); break;
        case 'email-text': b.email ? (el.href = 'mailto:' + b.email, el.textContent = b.email) : weg(); break;
        case 'impressum': b.impressum_url ? el.href = b.impressum_url : weg(); break;
        case 'datenschutz': b.datenschutz_url ? el.href = b.datenschutz_url : weg(); break;
        // Der Finanzcheck gehört dem Standard-Berater. Andere bekommen ihren
        // Buchungslink, sonst verschwindet der Knopf.
        case 'finanzcheck':
          if (!istStandard) { b.bookings_url ? el.href = b.bookings_url : weg(); }
          break;
      }
    });
    if (b.name && document.title.indexOf('·') >= 0) {
      document.title = document.title.replace(/·[^·]*$/, '· ' + b.name);
    }
    setzeKopfbild(b);
  }

  /**
   * Oben links steht das Porträt des Beraters. Wer keins hinterlegt hat, bekäme
   * von applyBeraterBrand ein Initialen-Kürzel. An dieser Stelle steht statt
   * dessen die Team-Marke: sie sagt mehr als zwei Buchstaben und ist für jeden
   * im Team richtig. Läuft NACH dem Branding, weil es dessen Vorgabe ersetzt.
   */
  function setzeKopfbild(b) {
    var bild = document.querySelector('.brand-logo');
    if (!bild) return;
    if (b.foto_url) {
      bild.src = b.foto_url;
      bild.alt = b.name || '';
      bild.classList.remove('ist-marke');
    } else {
      bild.src = '/assets/images/team-wachsbleiche-marke-96.webp';
      bild.alt = 'Team Wachsbleiche';
      bild.classList.add('ist-marke');
    }
  }

  var params = new URLSearchParams(window.location.search);
  var wer = params.get('berater') === 'partner' ? 'partner' : 'kai-blobel';
  setzeBerater(BEISPIEL[wer]);

  // Umschaltleiste, damit man beide Fassungen nebeneinander prüfen kann.
  var marke = document.querySelector('.mock-marke');
  if (marke) {
    marke.innerHTML = 'Entwurf. Nichts wird gespeichert oder gesendet. &nbsp;·&nbsp; Ansicht als: ' +
      (wer === 'kai-blobel'
        ? '<b>Kai</b> · <a href="?berater=partner" style="color:#F0D98A">zu einem Partner wechseln</a>'
        : '<a href="?berater=kai-blobel" style="color:#F0D98A">zurück zu Kai</a> · <b>Sven Augustin (Partner)</b>');
  }

  /* ---------- Kopfzeile ---------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    }, { passive: true });
  }

  /* ---------- Handy-Menü ---------- */
  var menuKnopf = document.getElementById('menuKnopf');
  var menu = document.getElementById('mobileMenu');
  if (menuKnopf && menu) {
    menuKnopf.addEventListener('click', function () {
      var offen = menu.hasAttribute('hidden');
      if (offen) { menu.removeAttribute('hidden'); } else { menu.setAttribute('hidden', ''); }
      menuKnopf.setAttribute('aria-expanded', String(offen));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.setAttribute('hidden', '');
        menuKnopf.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Knöpfe, die nur springen ---------- */
  document.querySelectorAll('[data-springe]').forEach(function (knopf) {
    knopf.addEventListener('click', function () {
      var ziel = document.querySelector(knopf.dataset.springe);
      if (ziel) ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- 02 · Die Formel in Euro ----------
     Rechnet 30/30/30/10 vom eingegebenen Netto. Rein im Browser,
     nichts wird gesendet oder gespeichert. */
  var netto = document.getElementById('ubNetto');
  var out = document.getElementById('ubRechnerOut');
  if (netto && out) {
    var ANTEILE = { wohnen: 0.30, alltag: 0.30, vermoegen: 0.30, schutz: 0.10 };
    var euro = new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    });

    var rechne = function () {
      // Punkte und Leerzeichen als Tausendertrennung zulassen, Komma als Dezimalzeichen.
      var roh = netto.value.replace(/[.\s]/g, '').replace(',', '.');
      var wert = parseFloat(roh);
      var gueltig = isFinite(wert) && wert > 0 && wert < 1000000;

      out.querySelectorAll('li').forEach(function (li) {
        var b = li.querySelector('b');
        if (!b) return;
        b.textContent = gueltig ? euro.format(Math.round(wert * ANTEILE[li.dataset.teil])) : '–';
      });
    };

    netto.addEventListener('input', rechne);
    rechne();
  }

  /* ---------- 04 · Die drei Stufen ---------- */
  var STUFEN = {
    basis: {
      titel: 'Risikovorsorge',
      text: 'Ganz unten steht, was alles andere trägt: die Absicherung der Arbeitskraft, ' +
            'Gesundheit und eine Rücklage für den kaputten Kühlschrank. Fällt hier etwas aus, ' +
            'muss alles darüber angetastet werden. Genau deshalb liegt es unten.'
    },
    mitte: {
      titel: 'Langfristiges Sparen',
      text: 'Darüber liegt, was Jahrzehnte Zeit hat: die Rente und, wenn es passt, das eigene ' +
            'Zuhause. Hier zählt nicht die Rendite eines Jahres, sondern dass überhaupt etwas ' +
            'läuft und dass es nicht bei der ersten Delle angehalten wird.'
    },
    spitze: {
      titel: 'Privater Vermögensaufbau',
      text: 'Erst ganz oben kommt das, worüber alle reden: Depot, Einzelwerte, Beteiligungen. ' +
            'Das ist der spannende Teil, aber eben auch der, der eine Grundlage braucht. ' +
            'Wer hier anfängt und unten nichts stehen hat, verkauft im falschen Moment.'
    }
  };

  var stufenKnoepfe = document.querySelectorAll('.ub-stufe');
  var stufeTitel = document.getElementById('ubStufeTitel');
  var stufeText = document.getElementById('ubStufeText');

  var setzeStufe = function (schluessel) {
    var daten = STUFEN[schluessel];
    if (!daten || !stufeTitel || !stufeText) return;
    stufeTitel.textContent = daten.titel;
    stufeText.textContent = daten.text;
    stufenKnoepfe.forEach(function (k) {
      var aktiv = k.dataset.stufe === schluessel;
      k.classList.toggle('is-active', aktiv);
      k.setAttribute('aria-selected', String(aktiv));
    });
  };

  stufenKnoepfe.forEach(function (knopf, i) {
    knopf.addEventListener('click', function () { setzeStufe(knopf.dataset.stufe); });
    knopf.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var schritt = e.key === 'ArrowRight' ? 1 : -1;
      var naechster = stufenKnoepfe[(i + schritt + stufenKnoepfe.length) % stufenKnoepfe.length];
      naechster.focus();
      setzeStufe(naechster.dataset.stufe);
    });
  });

  /* ---------- Zeitfenster für den Rückruf ---------- */
  var zeitfenster = document.querySelectorAll('.ub-zf');
  var gewaehlt = 'Nachmittags (14 bis 17 Uhr)';

  zeitfenster.forEach(function (knopf) {
    knopf.addEventListener('click', function () {
      gewaehlt = knopf.dataset.value;
      zeitfenster.forEach(function (k) { k.classList.toggle('is-gewaehlt', k === knopf); });
    });
  });

  var absenden = document.getElementById('ubAnrufSubmit');
  var bestaetigt = document.getElementById('ubAnrufConfirm');
  if (absenden && bestaetigt) {
    absenden.addEventListener('click', function () {
      // Im Entwurf wird nichts gesendet. In der echten Fassung steht hier
      // markAnrufwunsch(token, slot) aus js/supabase.js, mit dem Schutz aus
      // js/app.js: ohne Token wird nicht bestätigt.
      bestaetigt.hidden = false;
      bestaetigt.innerHTML = '<strong>Notiert.</strong> Entwurf: hier würde „' + gewaehlt +
        '" gespeichert und Kai bekäme eine Nachricht.';
      absenden.disabled = true;
      absenden.textContent = 'Ist notiert';
    });
  }
})();
