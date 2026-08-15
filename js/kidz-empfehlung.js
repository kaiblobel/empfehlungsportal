/**
 * Persönliches Band auf der KIDZ-Elternseite.
 *
 * Wer über eine Empfehlung hierher kommt, soll oben sehen, von wem sie stammt.
 * Ohne Empfehlung bleibt die Seite unverändert; das Band ist dann nicht da.
 *
 * Den Weg zum Elternabend ergänzt kidz-konzept.js bereits um Berater und
 * Herkunft. Hier kommt nur der Name dazu, den die Empfehlung mitbringt.
 */
import { getEmpfehlungByToken } from './supabase.js';

const band = document.getElementById('empfehlungsband');
if (band) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token')
    || document.querySelector('meta[name="referral-token"]')?.content
    || '';
  const vonParameter = String(params.get('von') || '').trim();

  const zeige = (name) => {
    const sauber = String(name || '').trim();
    if (sauber) {
      const feld = document.getElementById('empfehlungsbandName');
      if (feld) feld.textContent = sauber;
      const mark = document.getElementById('empfehlungsbandMark');
      if (mark) mark.textContent = sauber.slice(0, 1).toUpperCase();
    }
    band.hidden = false;
  };

  if (token) {
    getEmpfehlungByToken(token)
      .then((ergebnis) => zeige(ergebnis?.data?.empfehler_name))
      .catch(() => zeige(''));
  } else if (vonParameter) {
    zeige(vonParameter);
  }
}
