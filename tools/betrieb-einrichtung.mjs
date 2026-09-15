// Einrichtung und Pruefung der Betriebsanbindung des Portals (ADR-0063, Adapter vercel-portal).
//
// Nur ueber "vercel env run" aufrufen: Schluessel und Geheimnisse kommen aus der Umgebung dieses einen
// Prozesses und werden nie geschrieben oder ausgegeben. Ausgabe ist eine JSON-Zeile mit Wahrheitswerten
// und Fingerabdruecken. Liegt unter tools/ und wird nicht veroeffentlicht (.vercelignore).
//
//   node tools/betrieb-einrichtung.mjs pruefe-vorschau <erwarteter-host>
//   node tools/betrieb-einrichtung.mjs pruefe-produktion
//   node tools/betrieb-einrichtung.mjs lese
//   node tools/betrieb-einrichtung.mjs initialisiere      (legt nur an, ueberschreibt nie)
import { createHash } from 'node:crypto';
import { put, head } from '@vercel/blob';
import { leer, leseStand, ist } from '../lib/betrieb/kern.mjs';
import { BLOB_PFAD, mitBlob } from '../lib/betrieb/speicher-blob.mjs';

const aus = o => console.log(JSON.stringify(o));
const fp = w => (/^[0-9a-f]{64}$/.test(w || '') ? createHash('sha256').update(`kai-betrieb-fingerabdruck:${w}`).digest('hex').slice(0, 16) : null);
const tokenOk = t => /^vercel_blob_rw_[A-Za-z0-9_]+$/.test(t || '');
const sichtbar = namen => namen.filter(n => Object.hasOwn(process.env, n));
const e = process.env;
const [modus, erwarteterHost = ''] = process.argv.slice(2);
const PRODUKTION = ['BETRIEB_GEHEIMNIS_EMPFEHLUNG', 'BETRIEB_PORTAL_AKTIV', 'BETRIEB_PORTAL_NOTFALL', 'BETRIEB_BLOB_TOKEN'];
const VORSCHAU = ['BETRIEB_VORSCHAU_GEHEIMNIS', 'BETRIEB_VORSCHAU_AKTIV', 'BETRIEB_VORSCHAU_HOST', 'BETRIEB_VORSCHAU_NOTFALL', 'BETRIEB_VORSCHAU_BLOB_TOKEN'];

if (modus === 'pruefe-vorschau') {
  aus({
    ok: true, aktiv: e.BETRIEB_VORSCHAU_AKTIV === '1', host_ok: e.BETRIEB_VORSCHAU_HOST === erwarteterHost && erwarteterHost !== '',
    geheimnis_fingerabdruck: fp(e.BETRIEB_VORSCHAU_GEHEIMNIS), blob_token_ok: tokenOk(e.BLOB_READ_WRITE_TOKEN),
    notfall: e.BETRIEB_VORSCHAU_NOTFALL === '1', produktionswerte_sichtbar: sichtbar(PRODUKTION),
  });
} else if (modus === 'pruefe-produktion') {
  aus({
    ok: true, aktiv: e.BETRIEB_PORTAL_AKTIV === '1', notfall: e.BETRIEB_PORTAL_NOTFALL === '1',
    geheimnis_fingerabdruck: fp(e.BETRIEB_GEHEIMNIS_EMPFEHLUNG), blob_token_ok: tokenOk(e.BLOB_READ_WRITE_TOKEN),
    vorschauwerte_sichtbar: sichtbar(VORSCHAU),
  });
} else if (modus === 'lese' || modus === 'initialisiere') {
  const token = e.BLOB_READ_WRITE_TOKEN;
  if (!tokenOk(token)) { aus({ ok: false, grund: 'kein gueltiger Speicher-Schluessel in dieser Umgebung' }); process.exit(4); }
  if (modus === 'lese') {
    try {
      const s = await mitBlob(token, async store => leseStand(await store.read()));
      const i = ist(s, Math.floor(Date.now() / 1000));
      aus({ ok: true, betriebszustand: i.betriebszustand, version: i.version, gesperrt: i.gesperrt, notfall: i.notfall, zugaenge_aktiv: i.zugaenge_aktiv, nonces: Object.keys(s.nonces).length });
    } catch (err) {
      aus({ ok: false, grund: `nicht lesbar: ${String(err?.message || err).slice(0, 80)}` }); process.exit(2);
    }
  } else {
    try {
      await put(BLOB_PFAD, JSON.stringify(leer()), { token, access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json', cacheControlMaxAge: 60 });
      aus({ ok: true, ergebnis: 'angelegt', pfad: BLOB_PFAD });
    } catch (err) {
      try {
        const h = await head(BLOB_PFAD, { token });
        aus({ ok: true, ergebnis: 'vorhanden, nicht ueberschrieben', groesse: h.size });
      } catch {
        aus({ ok: false, grund: `Anlegen fehlgeschlagen: ${String(err?.message || err).slice(0, 80)}` }); process.exit(2);
      }
    }
  }
} else {
  aus({ ok: false, grund: 'Modus: pruefe-vorschau <host> | pruefe-produktion | lese | initialisiere' });
  process.exit(5);
}
