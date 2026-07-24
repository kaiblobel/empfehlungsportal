import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandPlan, BB_KEYS, LINK_KEYS } from '../js/berater-brand-core.js';

const KAI_ID = 'b3cbf981-ea3e-4e6d-a993-2fe158ca0d48';

const kai = {
  id: KAI_ID, name: 'Kai Blobel', rolle: 'Regionaldirektion', foto_url: 'kai.jpg',
  whatsapp: '4915154776159', telefon: '+4915154776159', email: 'kai.blobel@dvag.de',
  impressum_url: 'https://www.dvag.de/kai.blobel/impressum.html',
  datenschutz_url: 'https://www.dvag.de/kai.blobel/datenschutz.html',
  bookings_url: 'https://book/kai',
};
const claudia = {
  id: 'c1a0-claudia', name: 'Claudia Sommer', rolle: 'Vermögensberaterin', foto_url: null,
  whatsapp: '491700000000', telefon: null, email: 'claudia@dvag.de',
  impressum_url: 'https://www.dvag.de/claudia.sommer/impressum.html',
  datenschutz_url: 'https://www.dvag.de/claudia.sommer/datenschutz.html',
  bookings_url: null,
};

test('Plan setzt IMMER jeden bekannten data-bb-Schlüssel (nichts bleibt vom Vor-Berater hängen)', () => {
  for (const b of [kai, claudia, null]) {
    const { bb } = brandPlan(b, KAI_ID);
    for (const k of BB_KEYS) assert.ok(k in bb, `fehlt: ${k} (b=${b && b.name})`);
  }
});

test('neutral → Kai: Kai-exklusive Inhalte + eigene Kontakte/Rechtslinks wieder sichtbar', () => {
  const p = brandPlan(kai, KAI_ID);
  assert.equal(p.defaultOnly, true); // Leistungszahlen + Bewertungen sichtbar
  assert.equal(p.bb.impressum.shown, true);
  assert.equal(p.bb.impressum.href, kai.impressum_url);
  assert.equal(p.bb.whatsapp.shown, true);
  assert.equal(p.bb.whatsapp.href, 'https://wa.me/4915154776159');
  assert.equal(p.bb.booking.shown, true);
});

test('neutral → Claudia: eigene Kontakte sichtbar, Kai-exklusive Inhalte verborgen', () => {
  const p = brandPlan(claudia, KAI_ID);
  assert.equal(p.defaultOnly, false); // KEINE Leistungszahlen/Bewertungen
  assert.equal(p.bb.impressum.href, claudia.impressum_url);
  assert.equal(p.bb.impressum.shown, true);
  assert.equal(p.bb.whatsapp.shown, true);
  assert.equal(p.bb.name.text, 'Claudia Sommer');
});

test('Berater A → neutral → Berater B: nichts von A bleibt (Plan enthält nur B-Daten)', () => {
  const pB = brandPlan(claudia, KAI_ID);
  const flat = JSON.stringify(pB);
  assert.ok(!flat.includes('kai.blobel'), 'Kai-Impressum darf nicht in Claudias Plan sein');
  assert.ok(!flat.includes('4915154776159'), 'Kais Nummer darf nicht in Claudias Plan sein');
  assert.notEqual(pB.bb.impressum.href, kai.impressum_url);
});

test('neutraler Zustand: keine href-Ziele mehr (kein altes Kai-Ziel im DOM)', () => {
  const p = brandPlan(null, KAI_ID);
  for (const k of LINK_KEYS) {
    // finanzcheck beim Standard-Berater hat kein href-Feld; im Neutralfall aber schon (null)
    const spec = p.bb[k];
    assert.equal(spec.href ?? null, null, `${k} darf im neutralen Zustand kein href haben`);
    assert.equal(!!spec.shown, false, `${k} muss neutral ausgeblendet sein`);
  }
  assert.equal(p.bb.name.text, '');
  assert.equal(p.bb.rolle.text, '');
  assert.equal(p.bb.foto.src, null); // Anwender setzt neutrales Initialen-Bild
  assert.equal(p.defaultOnly, false);
});

test('fehlende Felder bleiben verborgen (Claudia ohne Telefon/Bookings)', () => {
  const p = brandPlan(claudia, KAI_ID);
  assert.equal(p.bb.tel.shown, false);
  assert.equal(p.bb.tel.href, null);
  assert.equal(p.bb.booking.shown, false);
  assert.equal(p.bb.booking.href, null);
});

test('vorhandene Felder werden sichtbar (Kai vollständig)', () => {
  const p = brandPlan(kai, KAI_ID);
  for (const k of ['booking', 'whatsapp', 'tel', 'email', 'impressum', 'datenschutz']) {
    assert.equal(p.bb[k].shown, true, `${k} muss sichtbar sein`);
    assert.ok(p.bb[k].href, `${k} braucht ein href`);
  }
});

test('Kai-Freischaltung strikt über ID, nicht über Slug/Name', () => {
  const fremdMitKaiName = { ...claudia, name: 'Kai Blobel', slug: 'kai-blobel' };
  assert.equal(brandPlan(fremdMitKaiName, KAI_ID).defaultOnly, false);
  assert.equal(brandPlan(kai, KAI_ID).defaultOnly, true);
});
