import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPotentialText,
  potentialInitials,
  potentialPhoneDigits,
  formatPotentialPhone,
  findPotentialDuplicate,
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
