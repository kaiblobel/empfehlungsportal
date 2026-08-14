const title = document.getElementById('paTitle');
const message = document.getElementById('paMessage');
const loader = document.getElementById('paLoader');
const again = document.getElementById('paAgain');
const hash = new URLSearchParams(window.location.hash.slice(1));
const token = String(hash.get('token') || '').trim();
const adviser = String(hash.get('berater') || '').trim().toLowerCase();
history.replaceState(null, '', window.location.pathname);

function retryUrl(state) {
  const params = new URLSearchParams({ zugang: state });
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adviser)) params.set('berater', adviser);
  return `/promoter-start.html?${params.toString()}`;
}

function fail(temporary = false) {
  title.textContent = temporary ? 'Der Zugang ist gerade nicht erreichbar' : 'Dieser Einmal-Link ist nicht mehr gültig';
  message.textContent = temporary
    ? 'Bitte versuche es gleich noch einmal oder fordere einen neuen Link an.'
    : 'Der Link ist abgelaufen oder wurde bereits verwendet. Fordere einfach einen neuen an.';
  loader.hidden = true;
  again.href = retryUrl(temporary ? 'fehler' : 'ungueltig');
  again.hidden = false;
}

if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
  fail(false);
} else {
  try {
    const response = await fetch('/api/promoter-access-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 410 || response.status === 400) {
      fail(false);
    } else if (!response.ok || !result?.code) {
      fail(true);
    } else {
      try { localStorage.setItem('empfehler_code', result.code); } catch (_) {}
      window.location.replace(`/empfehler.html?code=${encodeURIComponent(result.code)}&zugang=1`);
    }
  } catch (_) {
    fail(true);
  }
}
