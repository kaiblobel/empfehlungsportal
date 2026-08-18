(function () {
  'use strict';

  const pillarData = {
    kompetenz: {
      number: '01',
      kicker: 'Finanzielle Kompetenz',
      heading: 'Geld wird im Alltag gelernt, nicht erst mit dem ersten Gehalt.',
      text: 'Kinder erleben täglich, wie Erwachsene über Wünsche, Sparen und Entscheidungen sprechen. KIDZ gibt Eltern einfache Impulse, wie daraus Schritt für Schritt ein gutes Gefühl für Geld entstehen kann.',
      image: '/assets/images/kidz-konzept/kidz-finanzkompetenz.png',
      alt: 'Familien-, Schul- und Ausbildungsszenen aus den KIDZ-Unterlagen',
      questions: [
        'Wie sprechen wir altersgerecht über Geld?',
        'Wie werden aus Wünschen gute Entscheidungen?',
        'Welche Rolle spielen Vorbilder im Familienalltag?'
      ]
    },
    gesundheit: {
      number: '02',
      kicker: 'Gesundheitszustand früh sichern',
      heading: 'Heute Gesundheit. Morgen Wahlmöglichkeiten.',
      text: 'Der heutige Gesundheitszustand kann für spätere Möglichkeiten wichtig sein. Die U4 ist dabei ein früher Orientierungspunkt. Welche Wege im Einzelfall bestehen, wird immer fachlich geprüft.',
      image: '/assets/images/kidz-konzept/kidz-gesundheit.jpg',
      alt: 'Familie nutzt gemeinsam eine Videosprechstunde',
      questions: [
        'Welche Möglichkeiten können schon früh geprüft werden?',
        'Was kann sich durch spätere Diagnosen verändern?',
        'Welche Entscheidungen brauchen eine persönliche Prüfung?'
      ]
    },
    absicherung: {
      number: '03',
      kicker: 'Finanzielle Absicherung',
      heading: 'Pläne sollen weitergehen können, auch wenn das Leben anders läuft.',
      text: 'Eltern möchten Chancen eröffnen und gleichzeitig Stabilität schaffen. KIDZ zeigt, welche Risiken eine Familie früh besprechen sollte. Konkrete Lösungen entstehen erst in einer aktuellen Beratung.',
      image: '/assets/images/kidz-konzept/kidz-absicherung.jpg',
      alt: 'Eltern und Kind bilden gemeinsam ein Herz mit den Händen',
      questions: [
        'Was soll für unser Kind auf jeden Fall weiterlaufen?',
        'Welche Belastungen könnten eine Familie treffen?',
        'Welche Absicherung passt wirklich zu unserer Situation?'
      ]
    }
  };

  const pathData = {
    elternabend: {
      title: 'Elternabend vormerken',
      intro: 'Sie möchten beim nächsten passenden Elternabend gern dabei sein. Termin und Ort bestätigen Sie später in Ruhe.',
      number: '01',
      choice: 'Teilnahme vormerken',
      detail: 'Noch keine feste Zusage und ohne Beratungspflicht',
      contactTitle: 'So kurz merken Sie sich vor.',
      consent: 'Ich möchte einmalig zu meiner Teilnahmevormerkung kontaktiert werden.'
    },
    termininfo: {
      title: 'Nur Termininfo erhalten',
      intro: 'Sie erhalten einmalig Datum und Ort, ohne dass Ihre Teilnahme vorgemerkt wird.',
      number: '02',
      choice: 'Einmalig informieren lassen',
      detail: 'Keine Vormerkung und keine weitere Kontaktfolge',
      contactTitle: 'So kurz erhalten Sie die Termininfo.',
      consent: 'Ich möchte einmalig Datum und Ort des nächsten KIDZ-Elternabends erhalten.'
    },
    gespraech: {
      title: 'Persönlich sprechen',
      intro: 'Sie möchten Ihre Fragen lieber direkt mit einem Ansprechpartner sortieren.',
      number: '03',
      choice: 'Gespräch anfragen',
      detail: 'Persönlich, verständlich und in Ihrem Tempo',
      contactTitle: 'So kurz fragen Sie ein Gespräch an.',
      consent: 'Ich möchte einmalig wegen eines persönlichen Gesprächs kontaktiert werden.'
    }
  };

  const header = document.querySelector('[data-header]');
  const pillarTabs = Array.from(document.querySelectorAll('[data-pillar]'));
  const pillarMedia = document.querySelector('.pillar-panel-media');
  const pillarImage = document.getElementById('pillarImage');
  const pillarNumber = document.getElementById('pillarNumber');
  const pillarKicker = document.getElementById('pillarKicker');
  const pillarHeading = document.getElementById('pillarHeading');
  const pillarText = document.getElementById('pillarText');
  const pillarQuestions = document.getElementById('pillarQuestions');
  const pillarPanel = document.getElementById('pillar-panel');

  const pathDialog = document.getElementById('pathDialog');
  const pathForm = document.getElementById('pathForm');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogIntro = document.getElementById('dialogIntro');
  const dialogNumber = document.getElementById('dialogNumber');
  const dialogChoice = document.getElementById('dialogChoice');
  const dialogDetail = document.getElementById('dialogDetail');
  const contactStepTitle = document.getElementById('contactStepTitle');
  const consentText = document.getElementById('consentText');
  const contactConsent = document.getElementById('contactConsent');
  const contactFieldLabel = document.getElementById('contactFieldLabel');
  const contactField = document.getElementById('contactField');
  const contactMethods = Array.from(pathDialog.querySelectorAll('input[name="kontakt"]'));
  const dialogSteps = Array.from(pathDialog.querySelectorAll('[data-dialog-step]'));
  const dialogProgress = Array.from(pathDialog.querySelectorAll('.dialog-progress span'));

  const galleryDialog = document.getElementById('galleryDialog');
  const galleryMain = document.getElementById('galleryMain');
  const galleryThumbs = Array.from(document.querySelectorAll('[data-gallery-src]'));
  const storyTrack = document.getElementById('storyTrack');
  const storySlides = Array.from(document.querySelectorAll('[data-story-slide]'));
  const storyDots = Array.from(document.querySelectorAll('[data-story-index]'));
  const storyStatus = document.getElementById('storyStatus');
  const toast = document.getElementById('mockToast');
  let toastTimer;
  let activePath = 'elternabend';
  let activeStory = 0;
  let storyFrame;
  const localPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  // gleiche Liste wie die Elternabend-Anmeldung, damit dort keine unbekannte Herkunft ankommt
  const ALLOWED_SOURCES = new Set(['elternabend-qr', 'kidz-station', 'berater-einladung', 'sommerfest-danke', 'facebook', 'instagram', 'whatsapp', 'direkt']);
  const SAFE_SLUG = /^[a-z0-9-]+$/;

  function currentParams() {
    const search = new URLSearchParams(window.location.search);
    const source = String(search.get('quelle') || '').trim().toLowerCase();
    const advisor = String(search.get('berater') || '').trim().toLowerCase();
    return {
      quelle: ALLOWED_SOURCES.has(source) ? source : 'direkt',
      berater: advisor.length <= 80 && SAFE_SLUG.test(advisor) ? advisor : ''
    };
  }

  function livePathTarget(path) {
    if (path === 'elternabend') {
      const { quelle, berater } = currentParams();
      const target = new URL('/kidz/elternabend', window.location.origin);
      target.searchParams.set('quelle', quelle);
      if (berater) target.searchParams.set('berater', berater);
      return `${target.pathname}${target.search}#anmeldung`;
    }
    const messages = {
      termininfo: 'Hallo Kai, ich möchte gern einmalig über den nächsten KIDZ-Elternabend informiert werden.',
      gespraech: 'Hallo Kai, ich möchte das KIDZ-Konzept gern persönlich für meine Familie einordnen.',
    };
    return `https://wa.me/4915154776159?text=${encodeURIComponent(messages[path] || messages.gespraech)}`;
  }

  // Kleines Menue fuers Handy. Ein Klick auf eine Grundlage springt zum
  // Abschnitt und stellt dort gleich die richtige Karte ein.
  const menueKnopf = document.getElementById('mobileMenuButton');
  const menue = document.getElementById('mobileMenu');
  if (menueKnopf && menue) {
    const schliessen = () => {
      menue.hidden = true;
      menueKnopf.setAttribute('aria-expanded', 'false');
    };
    menueKnopf.addEventListener('click', () => {
      const offen = menue.hidden === false;
      menue.hidden = offen;
      menueKnopf.setAttribute('aria-expanded', offen ? 'false' : 'true');
    });
    menue.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        const grundlage = link.dataset.pillarLink;
        if (grundlage) {
          const tab = document.querySelector(`[data-pillar="${grundlage}"]`);
          if (tab) tab.click();
        }
        schliessen();
      });
    });
  }

  // Der Name des eigenen Kindes im Gesetzestext. Nichts davon wird gespeichert
  // oder gesendet; er steht nur im Browser der Eltern.
  const nameFeld = document.getElementById('kindName');
  const nameAusgabe = document.getElementById('kindNameAusgabe');
  if (nameFeld && nameAusgabe) {
    nameFeld.addEventListener('input', () => {
      const wert = nameFeld.value.trim().slice(0, 24);
      nameAusgabe.textContent = wert || 'Ihr Kind';
    });
  }

  function setBodyDialogState() {
    const open = (pathDialog && pathDialog.open) || (galleryDialog && galleryDialog.open);
    document.body.classList.toggle('dialog-open', Boolean(open));
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  function setPillar(key) {
    const item = pillarData[key];
    if (!item) return;
    pillarTabs.forEach((tab) => {
      const active = tab.dataset.pillar === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });
    pillarMedia.classList.add('is-changing');
    window.setTimeout(() => {
      pillarImage.src = item.image;
      pillarImage.alt = item.alt;
      pillarNumber.textContent = item.number;
      pillarKicker.textContent = item.kicker;
      pillarHeading.textContent = item.heading;
      pillarText.textContent = item.text;
      pillarQuestions.innerHTML = item.questions.map((question) => `<li>${question}</li>`).join('');
      const activeTab = document.querySelector(`[data-pillar="${key}"]`);
      pillarPanel.setAttribute('aria-labelledby', activeTab.id);
      pillarMedia.classList.remove('is-changing');
    }, 150);
  }

  pillarTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setPillar(tab.dataset.pillar));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % pillarTabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + pillarTabs.length) % pillarTabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = pillarTabs.length - 1;
      pillarTabs[next].focus();
      setPillar(pillarTabs[next].dataset.pillar);
    });
  });

  function showDialogStep(name) {
    dialogSteps.forEach((step) => { step.hidden = step.dataset.dialogStep !== name; });
    const second = name === 'contact' || name === 'success';
    dialogProgress[0].classList.add('is-active');
    dialogProgress[1].classList.toggle('is-active', second);
  }

  function openPath(path) {
    if (!localPreview) {
      window.location.href = livePathTarget(path);
      return;
    }
    const item = pathData[path] || pathData.elternabend;
    activePath = pathData[path] ? path : 'elternabend';
    dialogTitle.textContent = item.title;
    dialogIntro.textContent = item.intro;
    dialogNumber.textContent = item.number;
    dialogChoice.textContent = item.choice;
    dialogDetail.textContent = item.detail;
    contactStepTitle.textContent = item.contactTitle;
    consentText.textContent = item.consent;
    contactConsent.checked = false;
    showDialogStep('choice');
    pathDialog.showModal();
    setBodyDialogState();
  }

  function closePath() {
    pathDialog.close();
    setBodyDialogState();
  }

  document.querySelectorAll('[data-open-path]').forEach((button) => {
    button.addEventListener('click', () => openPath(button.dataset.openPath));
  });
  pathDialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', closePath));
  pathDialog.querySelector('[data-dialog-next]').addEventListener('click', () => showDialogStep('contact'));
  pathDialog.querySelector('[data-dialog-back]').addEventListener('click', () => showDialogStep('choice'));
  contactMethods.forEach((method) => {
    method.addEventListener('change', () => {
      const email = method.value === 'email' && method.checked;
      contactFieldLabel.textContent = email ? 'E-Mail-Adresse' : 'Mobilnummer';
      contactField.type = email ? 'email' : 'tel';
      contactField.inputMode = email ? 'email' : 'tel';
      contactField.value = email ? 'anna.beispiel@example.de' : '0151 00000000';
    });
  });
  pathForm.addEventListener('submit', (event) => {
    event.preventDefault();
    showDialogStep('success');
    showToast(`Vorschau für "${pathData[activePath].title}" abgeschlossen. Nichts wurde gesendet.`);
  });
  pathDialog.addEventListener('click', (event) => {
    if (event.target === pathDialog) closePath();
  });
  pathDialog.addEventListener('close', setBodyDialogState);

  function openGallery() {
    galleryDialog.showModal();
    setBodyDialogState();
  }

  function closeGallery() {
    galleryDialog.close();
    setBodyDialogState();
  }

  document.querySelectorAll('[data-open-gallery]').forEach((button) => button.addEventListener('click', openGallery));
  document.querySelector('[data-close-gallery]').addEventListener('click', closeGallery);
  galleryDialog.addEventListener('click', (event) => {
    if (event.target === galleryDialog) closeGallery();
  });
  galleryDialog.addEventListener('close', setBodyDialogState);
  galleryThumbs.forEach((button) => {
    button.addEventListener('click', () => {
      galleryMain.src = button.dataset.gallerySrc;
      galleryMain.alt = button.dataset.galleryAlt;
      galleryThumbs.forEach((thumb) => thumb.classList.toggle('is-active', thumb === button));
    });
  });

  function updateStory(index) {
    activeStory = (index + storySlides.length) % storySlides.length;
    storyStatus.textContent = `Bild ${activeStory + 1} von ${storySlides.length}`;
    storyDots.forEach((dot, dotIndex) => {
      const active = dotIndex === activeStory;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function showStory(index) {
    const next = (index + storySlides.length) % storySlides.length;
    storySlides[next].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    updateStory(next);
  }

  document.querySelector('[data-story-prev]').addEventListener('click', () => showStory(activeStory - 1));
  document.querySelector('[data-story-next]').addEventListener('click', () => showStory(activeStory + 1));
  storyDots.forEach((dot) => dot.addEventListener('click', () => showStory(Number(dot.dataset.storyIndex))));
  storyTrack.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') showStory(activeStory - 1);
    if (event.key === 'ArrowRight') showStory(activeStory + 1);
    if (event.key === 'Home') showStory(0);
    if (event.key === 'End') showStory(storySlides.length - 1);
  });
  storyTrack.addEventListener('scroll', () => {
    window.cancelAnimationFrame(storyFrame);
    storyFrame = window.requestAnimationFrame(() => {
      const center = storyTrack.getBoundingClientRect().left + storyTrack.clientWidth / 2;
      let closest = 0;
      let distance = Infinity;
      storySlides.forEach((slide, index) => {
        const rect = slide.getBoundingClientRect();
        const currentDistance = Math.abs(rect.left + rect.width / 2 - center);
        if (currentDistance < distance) {
          distance = currentDistance;
          closest = index;
        }
      });
      if (closest !== activeStory) updateStory(closest);
    });
  }, { passive: true });

  const trainData = {
    vermoegen: { number: '01', label: 'Vermögensaufbau', title: 'Was kann Zeit für Ihr Kind möglich machen?', text: 'Ein kleiner Betrag bekommt eine große Wirkung, wenn er früh beginnt. Eltern legen den Grundstein, später kann das Kind selbst weiterbauen.', bullets: ['Früh starten statt später aufholen', 'Geld im Familienalltag verständlich machen'], question: 'Wie viel Freiheit kann ein früher Start später schenken?', link: 'Die Beispielrechnung ansehen', target: '#vermoegensaufbau' },
    gesundheit: { number: '02', label: 'Gesundheit früh sichern', title: 'Welche Möglichkeiten kann der heutige Gesundheitszustand bewahren?', text: 'Bei Kindern sprechen wir nicht über einen Beruf. Wir sprechen darüber, dass sich Gesundheit verändern kann und spätere Möglichkeiten davon abhängen können.', bullets: ['Die U4 als frühen Orientierungspunkt kennen', 'Spätere Wahlmöglichkeiten im Blick behalten'], question: 'Welche Türen sollen für Ihr Kind auch später noch offenstehen?', link: 'Das VIP-Ticket verstehen', target: '#vip-ticket' },
    schule: { number: '03', label: 'Schulunfähigkeit', title: 'Was passiert, wenn Schule für längere Zeit nicht möglich ist?', text: 'Krankheit oder Pflegebedürftigkeit können den vertrauten Bildungsweg unterbrechen. Dann geht es darum, dem Kind Zeit und der Familie Stabilität zu geben.', bullets: ['Längere Ausfälle mitdenken', 'Entwicklung und Betreuung absichern'], question: 'Wie soll Ihr Kind aufgefangen werden, wenn der normale Weg pausiert?', link: 'Gesundheit früh betrachten', target: '#gesundheit-frueh' },
    versorgung: { number: '04', label: 'Versorgerschutz', title: 'Wie bleibt Ihre Familie handlungsfähig, wenn plötzlich vieles anders ist?', text: 'Eine schwere Erkrankung oder dauerhafte Einschränkung betrifft nie nur das Kind. Zeit, Betreuung und Umbauten können auch Eltern finanziell fordern.', bullets: ['Die Familie als Ganzes betrachten', 'Langfristige Unterstützung früh einordnen'], question: 'Was würde Ihrer Familie helfen, wenn Betreuung plötzlich Vorrang hat?', link: 'Gesundheit früh betrachten', target: '#gesundheit-frueh' },
    ambulant: { number: '05', label: 'Ambulante Versorgung', title: 'Welche Wege zur Gesundheit sollen Ihrem Kind offenstehen?', text: 'Manchmal wünschen Eltern mehr als die vorgesehene Grundversorgung, etwa bei Vorsorge, alternativen Behandlungen oder einer schnellen ärztlichen Einschätzung.', bullets: ['Vorsorge und zusätzliche Wege verstehen', 'Schnelle Hilfe im Familienalltag mitdenken'], question: 'Wie frei möchten Sie bei der Behandlung Ihres Kindes entscheiden können?', link: 'Das Kassenprinzip verstehen', target: '#luecke' },
    stationaer: { number: '06', label: 'Stationäre Versorgung', title: 'Welche Wahl soll Ihre Familie im Krankenhaus haben?', text: 'Im Ernstfall zählt nicht nur, dass behandelt wird. Klinik, ärztliche Betreuung und die Nähe eines Elternteils können für Familien einen spürbaren Unterschied machen.', bullets: ['Freie Klinikwahl verständlich prüfen', 'Begleitung und Unterbringung mitdenken'], question: 'Wer soll entscheiden, was in einem schweren Moment für Ihr Kind das Beste ist?', link: 'Das Krankenhausbeispiel ansehen', target: '#luecke' },
    zaehne: { number: '07', label: 'Zähne und Sehhilfe', title: 'Was ist ausreichend, und was wünschen Sie sich darüber hinaus?', text: 'Krankenkassen sichern eine notwendige Grundversorgung. KIDZ zeigt verständlich, an welchen Stellen Familien eigene Wahlmöglichkeiten wichtig werden können.', bullets: ['Kieferorthopädie früh einordnen', 'Sehhilfen und zusätzliche Wege verstehen'], question: 'Welche Behandlung soll Ihr Kind bekommen können, wenn Standard nicht Ihr Maßstab ist?', link: 'Das Kassenprinzip verstehen', target: '#luecke' },
    alltag: { number: '08', label: 'Sicher im Kinderalltag', title: 'Was hilft Ihrer Familie, wenn beim Entdecken etwas passiert?', text: 'Kinder spielen, klettern und probieren sich aus. Wenn dabei ein Unfall passiert, geht es darum, was Ihr Kind für Genesung, Entwicklung und einen möglichst normalen Alltag braucht.', bullets: ['Hilfe, Betreuung und Alltag gemeinsam betrachten', 'Mögliche Folgen für die Entwicklung einordnen'], question: 'Was braucht Ihr Kind, damit nach einem Unfall möglichst viel Alltag zurückkehrt?', link: 'Gesundheit als Ganzes ansehen', target: '#gesundheit-frueh' }
  };
  const trainButtons = Array.from(document.querySelectorAll('[data-car]'));
  const trainDetail = document.getElementById('train-detail');

  function setTrainCar(key) {
    const item = trainData[key];
    if (!item || !trainDetail) return;
    trainButtons.forEach((button) => {
      const active = button.dataset.car === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.setAttribute('tabindex', active ? '0' : '-1');
    });
    trainDetail.querySelector('.train-detail-index').textContent = item.number;
    trainDetail.querySelector('.train-detail-label').textContent = item.label;
    trainDetail.querySelector('h3').textContent = item.title;
    trainDetail.querySelector('.train-detail-copy > p:not(.train-detail-label)').textContent = item.text;
    trainDetail.querySelector('ul').innerHTML = item.bullets.map((bullet) => `<li>${bullet}</li>`).join('');
    trainDetail.querySelector('.train-detail-question strong').textContent = item.question;
    trainDetail.querySelector('.train-detail-link').firstChild.textContent = `${item.link} `;
    trainDetail.querySelector('.train-detail-link').href = item.target;
  }

  trainButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      setTrainCar(button.dataset.car);
      button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = trainButtons[(index + direction + trainButtons.length) % trainButtons.length];
      next.focus();
      next.click();
    });
  });
  setTrainCar('vermoegen');

  document.querySelectorAll('[data-mock-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showToast('Im fertigen Stand wird hier die bestehende rechtliche Seite verknüpft.');
    });
  });

  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }, { passive: true });
})();
