import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPotentialText,
  potentialInitials,
  potentialPhoneDigits,
  formatPotentialPhone,
  findPotentialDuplicate,
  potentialCircleKeys,
  potentialCircleLabels,
  potentialContactStrength,
  potentialDueState,
} from '../js/potenziale-utils.mjs';

test('bereinigt Namen und bildet ruhige Initialen', () => {
  assert.equal(cleanPotentialText('  Jana   Mustermann  '), 'Jana Mustermann');
  assert.equal(potentialInitials('Jana Mustermann'), 'JM');
  assert.equal(potentialInitials(''), '?');
});

test('vereinheitlicht deutsche Telefonnummern für Anzeige und WhatsApp', () => {
  assert.equal(potentialPhoneDigits('0151 23456789'), '4915123456789');
  assert.equal(potentialPhoneDigits('0049 151 23456789'), '4915123456789');
  assert.equal(formatPotentialPhone('0151 23456789'), '+49 151 23456789');
});

test('erkennt Dubletten über Telefon und E-Mail', () => {
  const rows = [{ id: '1', name: 'Jana Mustermann', telefon: '+49 151 23456789', email: 'jana@beispiel.de', kreis: 'Verein' }];
  assert.equal(findPotentialDuplicate(rows, { name: 'Andere Person', telefon: '015123456789', email: '', kreis: '' })?.id, '1');
  assert.equal(findPotentialDuplicate(rows, { name: 'Andere Person', telefon: '', email: 'JANA@BEISPIEL.DE', kreis: '' })?.id, '1');
  assert.equal(findPotentialDuplicate(rows, { name: 'Andere Person', telefon: '', email: '', kreis: '' }), null);
});

test('erkennt ohne Kontaktdaten gleichen Namen im gleichen Umfeld', () => {
  const rows = [{ id: '1', name: 'Jana Mustermann', telefon: null, email: null, kreis: 'Verein' }];
  assert.equal(findPotentialDuplicate(rows, { name: 'jana mustermann', telefon: '', email: '', kreis: 'verein' })?.id, '1');
  assert.equal(findPotentialDuplicate(rows, { name: 'Jana Mustermann', telefon: '', email: '', kreis: 'Nachbarschaft' }), null);
  assert.equal(findPotentialDuplicate([{ id: '2', name: 'Max Test', telefon: null, email: null, kreis: null }], { name: 'max test' })?.id, '2');
});

test('übernimmt mehrere Kreise und versteht alte Umfeldangaben', () => {
  assert.deepEqual(potentialCircleKeys({ kreise: ['schulzeit', 'verein_hobby', 'schulzeit'] }), ['schulzeit', 'verein_hobby']);
  assert.deepEqual(potentialCircleKeys({ kreis: 'Sportverein' }), ['verein_hobby']);
  assert.deepEqual(potentialCircleLabels({ kreise: ['familie'], kreis: 'Unternehmernetzwerk' }), ['Familie', 'Unternehmernetzwerk']);
});

test('stuft fehlenden Kontaktweg unabhängig von Überschneidungen kalt ein', () => {
  const strength = potentialContactStrength({
    kreise: ['schulzeit', 'verein_hobby'],
    beziehungsnaehe: 'eng_vertraut',
    kontakthaeufigkeit: 'regelmaessig',
  });
  assert.equal(strength.key, 'kalt');
  assert.match(strength.reason, /kein direkter Kontaktweg/);
});

test('stuft Schulfreund mit Hobby und regelmäßigem Kontakt sehr heiß ein', () => {
  const strength = potentialContactStrength({
    telefon: '0151 23456789',
    kreise: ['schulzeit', 'verein_hobby', 'enger_freundeskreis'],
    beziehungsnaehe: 'eng_vertraut',
    kontakthaeufigkeit: 'regelmaessig',
  });
  assert.equal(strength.key, 'sehr_heiss');
  assert.ok(strength.score >= 16);
});

test('stuft regelmäßigen erreichbaren Familienkontakt sehr heiß ein', () => {
  const strength = potentialContactStrength({
    kreise: ['familie'],
    beziehungsnaehe: 'gut_bekannt',
    kontakthaeufigkeit: 'regelmaessig',
    direkt_erreichbar: true,
  });
  assert.equal(strength.key, 'sehr_heiss');
});

test('stuft flüchtige Alltagsbekanntschaft kalt ein und erlaubt bewusste Korrektur', () => {
  const base = {
    kreise: ['alltag', 'fluechtige_bekanntschaft'],
    beziehungsnaehe: 'fluechtig',
    kontakthaeufigkeit: 'selten',
    direkt_erreichbar: true,
  };
  assert.equal(potentialContactStrength(base).key, 'kalt');
  assert.equal(potentialContactStrength({ ...base, kontaktstaerke_override: 'warm' }).key, 'warm');
  assert.equal(potentialContactStrength({ ...base, kontaktstaerke_override: 'warm' }).overridden, true);
});

test('ordnet Wiedervorlagen verständlich ein', () => {
  const now = new Date('2026-08-09T10:00:00');
  assert.equal(potentialDueState(null, now).kind, '');
  assert.equal(potentialDueState('2026-08-08', now).kind, 'overdue');
  assert.equal(potentialDueState('2026-08-09', now).label, 'Heute nachfassen');
  assert.equal(potentialDueState('2026-08-10', now).label, 'Morgen nachfassen');
  assert.equal(potentialDueState('2026-08-15', now).kind, 'due');
  assert.equal(potentialDueState('2026-08-20', now).kind, '');
});
