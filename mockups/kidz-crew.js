const kidzMenu = document.getElementById('kidzPublicMenu');
document.addEventListener('click', (event) => {
  if (!kidzMenu?.open) return;
  if (!kidzMenu.contains(event.target) || event.target.closest('a')) kidzMenu.removeAttribute('open');
});
