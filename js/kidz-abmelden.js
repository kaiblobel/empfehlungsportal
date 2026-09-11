/**
 * Abmelden von KIDZ-Mails über den persönlichen Link aus der Mail (?t=<Schlüssel>).
 *
 * Abgemeldet wird erst nach einem Klick auf „Ja, abmelden“, nie schon beim
 * Laden der Seite. Virenscanner und Mailprogramme öffnen Links aus Mails oft
 * vorab, um sie zu prüfen. Würde das Laden allein abmelden, wären Menschen
 * ausgetragen, die nie auf den Link getippt haben.
 *
 * Kein Login, kein Cookie, kein Speicher im Browser. Der Schlüssel geht an die
 * Datenbankfunktion kidz_mail_abmelden_public (schema-phase346), die nur den
 * Abmeldezeitpunkt setzt und keine Adresse zurückgibt.
 */

const SCHLUESSEL_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZUSTAENDE = ['frage', 'fertig', 'ungueltig', 'fehler'];

// Der Link in der Mail hat die Form /kidz/abmelden/<Schlüssel>, ganz ohne "=".
// Outlook verschickt HTML als quoted-printable, ohne "=" zu kodieren; aus
// "?t=3f2b…" würde beim Empfänger Zeichensalat. ?t= bleibt als Rückfall erlaubt.
const schluessel = String(
  new URLSearchParams(window.location.search).get('t')
  || window.location.pathname.split('/').filter(Boolean).pop()
  || '',
).trim();

function zeige(name) {
  for (const zustand of ZUSTAENDE) {
    const bereich = document.getElementById(`kab-${zustand}`);
    if (bereich) bereich.hidden = zustand !== name;
  }
}

async function abmelden(knopf) {
  knopf.disabled = true;
  try {
    const schluesselOeffentlich = window.ENV_SUPABASE_ANON_KEY;
    const antwort = await fetch(`${window.ENV_SUPABASE_URL}/rest/v1/rpc/kidz_mail_abmelden_public`, {
      method: 'POST',
      headers: {
        apikey: schluesselOeffentlich,
        Authorization: `Bearer ${schluesselOeffentlich}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_token: schluessel }),
    });
    if (!antwort.ok) throw new Error(`Status ${antwort.status}`);
    const ergebnis = await antwort.json();
    zeige(ergebnis && ergebnis.ok === true ? 'fertig' : 'ungueltig');
  } catch (fehler) {
    console.error('[kidz-abmelden]', fehler.message);
    knopf.disabled = false;
    zeige('fehler');
  }
}

if (!SCHLUESSEL_MUSTER.test(schluessel)) {
  zeige('ungueltig');
} else {
  zeige('frage');
  document.getElementById('kab-knopf').addEventListener('click', (e) => abmelden(e.currentTarget));
  document.getElementById('kab-nochmal').addEventListener('click', (e) => abmelden(e.currentTarget));
}
