(function () {
  'use strict';

  const pillarData = {
    kompetenz: {
      number: '01',
      kicker: 'Finanzielle Kompetenz',
      heading: 'Geld wird im Alltag gelernt, nicht erst mit dem ersten Gehalt.',
      text: 'Kinder erleben täglich, wie Erwachsene über Wünsche, Sparen und Entscheidungen sprechen. KIDZ gibt Eltern einfache Impulse, wie daraus Schritt für Schritt ein gutes Gefühl für Geld entstehen kann.',
      image: 'assets/kidz-themenseite/kidz-finanzkompetenz.png',
      alt: 'Familien-, Schul- und Ausbildungsszenen aus den KIDZ-Unterlagen',
      questions: [
        'Wie sprechen wir altersgerecht über Geld?',
        'Wie werden aus Wünschen gute Entscheidungen?',
        'Welche Rolle spielen Vorbilder im Familienalltag?'
      ]
    },
    gesundheit: {
      number: '02',
      kicker: 'Gesundheit',
      heading: 'Gesundheit schafft Chancen, wenn wichtige Fragen früh gestellt werden.',
      text: 'KIDZ macht Eltern auf Vorsorge und langfristige Entscheidungen aufmerksam. Es geht um Orientierung und den Blick auf mögliche Lücken, nicht um medizinische Beratung.',
      image: 'assets/kidz-themenseite/kidz-gesundheit.jpg',
      alt: 'Familie nutzt gemeinsam eine Videosprechstunde',
      questions: [
        'Welche Vorsorge gehört zu welcher Lebensphase?',
        'Wo endet die gesetzliche Grundversorgung?',
        'Welche Entscheidungen brauchen eine persönliche Prüfung?'
      ]
    },
    absicherung: {
      number: '03',
      kicker: 'Finanzielle Absicherung',
      heading: 'Pläne sollen weitergehen können, auch wenn das Leben anders läuft.',
      text: 'Eltern möchten Chancen eröffnen und gleichzeitig Stabilität schaffen. KIDZ zeigt, welche Risiken eine Familie früh besprechen sollte. Konkrete Lösungen entstehen erst in einer aktuellen Beratung.',
      image: 'assets/kidz-themenseite/kidz-absicherung.jpg',
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
      intro: 'Sie erhalten eine Information, sobald der nächste passende Termin feststeht.',
      number: '01',
      choice: 'Als Gast teilnehmen',
      detail: 'Unverbindlich und ohne Beratungspflicht'
    },
    termininfo: {
      title: 'Termininfo erhalten',
      intro: 'Sie möchten erst Datum, Ort und Thema des nächsten KIDZ-Abends erfahren.',
      number: '02',
      choice: 'Einmalig informieren lassen',
      detail: 'Nur für die nächste passende Terminankündigung'
    },
    gespraech: {
      title: 'Persönlich sprechen',
      intro: 'Sie möchten Ihre Fragen lieber direkt mit einem Ansprechpartner sortieren.',
      number: '03',
      choice: 'Gespräch anfragen',
      detail: 'Persönlich, verständlich und in Ihrem Tempo'
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
  const dialogSteps = Array.from(pathDialog.querySelectorAll('[data-dialog-step]'));
  const dialogProgress = Array.from(pathDialog.querySelectorAll('.dialog-progress span'));

  const galleryDialog = document.getElementById('galleryDialog');
  const galleryMain = document.getElementById('galleryMain');
  const galleryThumbs = Array.from(document.querySelectorAll('[data-gallery-src]'));
  const toast = document.getElementById('mockToast');
  let toastTimer;
  let activePath = 'elternabend';

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
    const item = pathData[path] || pathData.elternabend;
    activePath = pathData[path] ? path : 'elternabend';
    dialogTitle.textContent = item.title;
    dialogIntro.textContent = item.intro;
    dialogNumber.textContent = item.number;
    dialogChoice.textContent = item.choice;
    dialogDetail.textContent = item.detail;
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
