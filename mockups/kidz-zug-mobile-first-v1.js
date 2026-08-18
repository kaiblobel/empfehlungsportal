const trainContent = {
  alltag: {
    number: '08',
    label: 'Sicher im Kinderalltag',
    title: 'Was hilft Ihrer Familie, wenn beim Entdecken etwas passiert?',
    text: 'Kinder spielen, klettern und probieren sich aus. Wenn dabei ein Unfall passiert, geht es darum, was Ihr Kind für Genesung, Entwicklung und einen möglichst normalen Alltag braucht.',
    bullets: ['Hilfe, Betreuung und Alltag gemeinsam betrachten', 'Mögliche Folgen für die Entwicklung einordnen'],
    question: 'Was braucht Ihr Kind, damit nach einem Unfall möglichst viel Alltag zurückkehrt?',
    link: 'Gesundheit als Ganzes ansehen',
    target: '#gesundheit-frueh'
  },
  zaehne: {
    number: '07',
    label: 'Zähne und Sehhilfe',
    title: 'Was ist ausreichend, und was wünschen Sie sich darüber hinaus?',
    text: 'Krankenkassen sichern eine notwendige Grundversorgung. KIDZ zeigt verständlich, an welchen Stellen Familien eigene Wahlmöglichkeiten wichtig werden können.',
    bullets: ['Kieferorthopädie früh einordnen', 'Sehhilfen und Zusatzleistungen verstehen'],
    question: 'Welche Behandlung soll Ihr Kind bekommen können, wenn Standard nicht Ihr Maßstab ist?',
    link: 'Das Kassenprinzip verstehen',
    target: '#gesetz'
  },
  stationaer: {
    number: '06',
    label: 'Stationäre Versorgung',
    title: 'Welche Wahl soll Ihre Familie im Krankenhaus haben?',
    text: 'Im Ernstfall zählt nicht nur, dass behandelt wird. Klinik, ärztliche Betreuung und die Nähe eines Elternteils können für Familien einen spürbaren Unterschied machen.',
    bullets: ['Freie Klinikwahl verständlich prüfen', 'Begleitung und Unterbringung mitdenken'],
    question: 'Wer soll entscheiden, was in einem schweren Moment für Ihr Kind das Beste ist?',
    link: 'Das Krankenhausbeispiel ansehen',
    target: '#gesetz'
  },
  ambulant: {
    number: '05',
    label: 'Ambulante Versorgung',
    title: 'Welche Wege zur Gesundheit sollen Ihrem Kind offenstehen?',
    text: 'Manchmal wünschen Eltern mehr als die vorgesehene Grundversorgung, etwa bei Vorsorge, alternativen Behandlungen oder einer schnellen ärztlichen Einschätzung.',
    bullets: ['Vorsorge und zusätzliche Wege verstehen', 'Schnelle Hilfe im Familienalltag mitdenken'],
    question: 'Wie frei möchten Sie bei der Behandlung Ihres Kindes entscheiden können?',
    link: 'Das Kassenprinzip verstehen',
    target: '#gesetz'
  },
  versorgung: {
    number: '04',
    label: 'Versorgerschutz',
    title: 'Wie bleibt Ihre Familie handlungsfähig, wenn plötzlich vieles anders ist?',
    text: 'Eine schwere Erkrankung oder dauerhafte Einschränkung betrifft nie nur das Kind. Zeit, Betreuung und Umbauten können auch Eltern finanziell fordern.',
    bullets: ['Die Familie als Ganzes betrachten', 'Langfristige Unterstützung früh einordnen'],
    question: 'Was würde Ihrer Familie helfen, wenn Betreuung plötzlich Vorrang hat?',
    link: 'Gesundheit früh betrachten',
    target: '#gesundheit-frueh'
  },
  schule: {
    number: '03',
    label: 'Schulunfähigkeit',
    title: 'Was passiert, wenn Schule für längere Zeit nicht möglich ist?',
    text: 'Krankheit oder Pflegebedürftigkeit können den vertrauten Bildungsweg unterbrechen. Dann geht es darum, dem Kind Zeit und der Familie Stabilität zu geben.',
    bullets: ['Längere Ausfälle mitdenken', 'Entwicklung und Betreuung absichern'],
    question: 'Wie soll Ihr Kind aufgefangen werden, wenn der normale Weg pausiert?',
    link: 'Gesundheit früh betrachten',
    target: '#gesundheit-frueh'
  },
  gesundheit: {
    number: '02',
    label: 'Gesundheit früh sichern',
    title: 'Welche Möglichkeiten kann der heutige Gesundheitszustand bewahren?',
    text: 'Bei Kindern sprechen wir nicht über einen Beruf. Wir sprechen darüber, dass sich Gesundheit verändern kann und spätere Möglichkeiten davon abhängen können.',
    bullets: ['Die U4 als frühen Orientierungspunkt kennen', 'Spätere Wahlmöglichkeiten im Blick behalten'],
    question: 'Welche Türen sollen für Ihr Kind auch später noch offenstehen?',
    link: 'Das VIP-Ticket verstehen',
    target: '#vip-ticket'
  },
  vermoegen: {
    number: '01',
    label: 'Vermögensaufbau',
    title: 'Was kann Zeit für Ihr Kind möglich machen?',
    text: 'Ein kleiner Betrag bekommt eine große Wirkung, wenn er früh beginnt. Eltern legen den Grundstein, später kann das Kind selbst weiterbauen.',
    bullets: ['Früh starten statt später aufholen', 'Geld im Familienalltag verständlich machen'],
    question: 'Wie viel Freiheit kann ein früher Start später schenken?',
    link: 'Die Beispielrechnung ansehen',
    target: '#vermoegen-beispiel'
  }
};

const trainButtons = [...document.querySelectorAll('[data-car]')];
const trainDetail = document.querySelector('#train-detail');

function renderTrainDetail(key) {
  const item = trainContent[key];
  if (!item || !trainDetail) return;

  trainButtons.forEach((button) => {
    const selected = button.dataset.car === key;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  });

  trainDetail.querySelector('.detail-index').textContent = item.number;
  trainDetail.querySelector('.detail-label').textContent = item.label;
  trainDetail.querySelector('h3').textContent = item.title;
  trainDetail.querySelector('.detail-copy > p:not(.detail-label)').textContent = item.text;
  trainDetail.querySelector('.detail-copy ul').innerHTML = item.bullets.map((bullet) => `<li>${bullet}</li>`).join('');
  trainDetail.querySelector('.detail-question strong').textContent = item.question;
  trainDetail.querySelector('.detail-link').firstChild.textContent = `${item.link} `;
  trainDetail.querySelector('.detail-link').setAttribute('href', item.target);
  trainDetail.classList.remove('is-changing');
  requestAnimationFrame(() => trainDetail.classList.add('is-changing'));
}

trainButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    renderTrainDetail(button.dataset.car);
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

const menuButton = document.querySelector('.menu-button');
const mainMenu = document.querySelector('.main-menu');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  mainMenu?.classList.toggle('is-open', open);
});
mainMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  mainMenu.classList.remove('is-open');
}));

const recommendationDialog = document.querySelector('.recommendation-dialog');
document.querySelectorAll('[data-open-recommendation]').forEach((button) => {
  button.addEventListener('click', () => recommendationDialog?.showModal());
});
document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => recommendationDialog?.close());
});
recommendationDialog?.addEventListener('click', (event) => {
  if (event.target === recommendationDialog) recommendationDialog.close();
});

const childNameInput = document.querySelector('[data-child-name]');
const lawChildName = document.querySelector('[data-law-child]');
childNameInput?.addEventListener('input', () => {
  const cleanedName = childNameInput.value.trim().replace(/[^A-Za-zÄÖÜäöüß\- ]/g, '').slice(0, 30);
  if (childNameInput.value !== cleanedName) childNameInput.value = cleanedName;
  lawChildName.textContent = cleanedName || 'Ihr Kind';
});

const nextStepCopy = {
  elternabend: 'Hier würde die kurze, unverbindliche Vormerkung für den nächsten KIDZ-Elternabend beginnen.',
  termininfo: 'Hier würden Sie wählen, ob die einmalige Termininfo per E-Mail oder Mobilnummer kommen soll.',
  gespraech: 'Hier würden Sie Ihren Ansprechpartner sehen und könnten selbst entscheiden, ob Sie eine Nachricht öffnen.',
  sommerfest: 'Hier würden Datum, Uhrzeit, Ort und die beiden Wege zum Kinder-Sommerfest erscheinen.'
};
const nextDialog = document.querySelector('.next-dialog');
const nextDialogText = document.querySelector('[data-next-dialog-text]');
document.querySelectorAll('[data-next-step]').forEach((button) => {
  button.addEventListener('click', () => {
    nextDialogText.textContent = nextStepCopy[button.dataset.nextStep] || 'Hier würde später der gewählte Weg beginnen.';
    nextDialog?.showModal();
  });
});
document.querySelectorAll('[data-close-next-dialog]').forEach((button) => {
  button.addEventListener('click', () => nextDialog?.close());
});
nextDialog?.addEventListener('click', (event) => {
  if (event.target === nextDialog) nextDialog.close();
});

const mobileBottomCta = document.querySelector('.mobile-bottom-cta');
const parentsSection = document.querySelector('.parents-section');
function updateMobileBottomCta() {
  if (!mobileBottomCta || !parentsSection) return;
  const hasReachedRecommendation = parentsSection.getBoundingClientRect().top < window.innerHeight * 0.85;
  mobileBottomCta.classList.toggle('is-visible', hasReachedRecommendation);
}
window.addEventListener('scroll', updateMobileBottomCta, { passive: true });
window.addEventListener('resize', updateMobileBottomCta);
updateMobileBottomCta();
