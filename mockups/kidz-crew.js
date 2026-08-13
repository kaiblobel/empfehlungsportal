const contacts = {
  sandro: {
    name: 'Sandro Wernicke',
    role: 'Sommerfest und Aktionen',
    image: '/assets/images/portrait-sandro.png',
    text: 'Sandro beantwortet Fragen zum Programm, zu den Aktivitäten und zum Ablauf am Veranstaltungstag.',
  },
  josy: {
    name: 'Josephine „Josy“ Bürger',
    role: 'Organisation und Anmeldung',
    image: 'https://kaiblobel.de/assets/portrait-josie.jpg',
    text: 'Josy hilft bei Fragen zur Anmeldung, zur Organisation und zur Vorbereitung auf das Sommerfest.',
  },
  kai: {
    name: 'Kai Blobel',
    role: 'Veranstalter und KIDZ Initiator',
    image: '/assets/images/kai-portrait.jpg',
    text: 'Kai ist für grundsätzliche Fragen zum Sommerfest und zum KIDZ Konzept persönlich erreichbar.',
  },
};

const dialog = document.getElementById('crewDialog');
const dialogTitle = document.getElementById('crewDialogTitle');
const dialogRole = document.getElementById('crewDialogRole');
const dialogText = document.getElementById('crewDialogText');
const dialogImage = document.getElementById('crewDialogImage');
const toast = document.getElementById('crewToast');
let selectedContact = null;
let toastTimer = null;

function openContact(key) {
  const contact = contacts[key];
  if (!contact) return;
  selectedContact = contact;
  dialogTitle.textContent = contact.name;
  dialogRole.textContent = contact.role;
  dialogText.textContent = contact.text;
  dialogImage.src = contact.image;
  dialogImage.alt = contact.name;
  dialog.showModal();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

document.querySelectorAll('[data-contact]').forEach((button) => {
  button.addEventListener('click', () => openContact(button.dataset.contact));
});

document.querySelector('.crew-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelectorAll('[data-demo-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const channel = button.dataset.demoAction === 'phone' ? 'Anruf' : 'WhatsApp';
    showToast(`${channel} zu ${selectedContact?.name || 'der KIDZ Crew'} würde jetzt geöffnet.`);
  });
});

const kidzMenu = document.getElementById('kidzPublicMenu');
document.addEventListener('click', (event) => {
  if (!kidzMenu?.open) return;
  if (!kidzMenu.contains(event.target) || event.target.closest('a')) kidzMenu.removeAttribute('open');
});
