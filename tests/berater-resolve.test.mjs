import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planResolution,
  buildLegacyRedirectUrl,
  normalizePath,
  KAI_SLUG,
} from '../js/berater-resolve-core.js';

// ---- Gegenproben (Kai-Vorgaben) ----

test('bare /programm leitet zu Kai', () => {
  assert.equal(planResolution({ pathname: '/programm' }).by, 'redirect');
  assert.equal(planResolution({ pathname: '/programm.html' }).redirectSlug, KAI_SLUG);
});

test('bare /empfehlen leitet zu Kai', () => {
  assert.equal(planResolution({ pathname: '/empfehlen' }).by, 'redirect');
  assert.equal(planResolution({ pathname: '/empfehlen.html' }).redirectSlug, KAI_SLUG);
});

test('?berater=max-kudlek bleibt Max', () => {
  const r = planResolution({ pathname: '/programm.html', search: '?berater=max-kudlek' });
  assert.deepEqual([r.by, r.value], ['slug', 'max-kudlek']);
});

test('?berater=claudia bleibt Claudia', () => {
  const r = planResolution({ pathname: '/programm.html', search: '?berater=claudia' });
  assert.deepEqual([r.by, r.value], ['slug', 'claudia']);
});

test('?code=... gewinnt eindeutig (auch neben Slug und gespeichertem Code)', () => {
  const r = planResolution({
    pathname: '/empfehlen.html',
    search: '?code=abc123&berater=sven-augustin',
    storedCode: 'alt-999',
  });
  assert.deepEqual([r.by, r.value], ['code', 'abc123']);
});

test('alter gespeicherter Code überschreibt keinen URL-Berater', () => {
  const r = planResolution({
    pathname: '/programm.html',
    search: '?berater=sven-augustin',
    storedCode: 'alt-999',
  });
  assert.deepEqual([r.by, r.value], ['slug', 'sven-augustin']);
});

test('alter gespeicherter Code mischt auf Legacy-Seite NICHT hinein (bare → Kai)', () => {
  const r = planResolution({ pathname: '/programm.html', storedCode: 'alt-999' });
  assert.equal(r.by, 'redirect');
  assert.equal(r.redirectSlug, KAI_SLUG);
});

test('Empfängerseite ohne Token zeigt Fehler und niemals Kai', () => {
  assert.equal(planResolution({ pathname: '/empfaenger.html' }).by, 'error');
  assert.equal(planResolution({ pathname: '/baufi.html' }).by, 'error');
  assert.equal(planResolution({ pathname: '/danke.html' }).by, 'error');
  assert.equal(planResolution({ pathname: '/austragen.html' }).by, 'error');
});

test('Empfängerseite MIT Token wird über Token ermittelt', () => {
  const r = planResolution({ pathname: '/empfaenger.html', search: '?token=6f-uuid&vorlage=allgemein' });
  assert.deepEqual([r.by, r.value], ['token', '6f-uuid']);
});

test('keine Weiterleitungsschleife: ?berater=kai-blobel wird nicht erneut umgeleitet', () => {
  const r = planResolution({ pathname: '/programm.html', search: '?berater=kai-blobel' });
  assert.equal(r.by, 'slug');
});

test('zusätzliche URL-Angaben und Sprungmarken bleiben bei der Weiterleitung erhalten', () => {
  const url = buildLegacyRedirectUrl('/programm.html', '?mode=slides&utm=x', '#abschnitt');
  const u = new URL('https://h' + url);
  assert.equal(u.searchParams.get('mode'), 'slides');
  assert.equal(u.searchParams.get('utm'), 'x');
  assert.equal(u.searchParams.get('berater'), KAI_SLUG);
  assert.equal(u.hash, '#abschnitt');
  assert.equal(u.pathname, '/programm.html');
});

test('Legacy-Weiterleitung ohne bestehende Params setzt nur berater', () => {
  assert.equal(buildLegacyRedirectUrl('/empfehlen.html'), '/empfehlen.html?berater=kai-blobel');
});

test('eingeloggter Berater gewinnt vor Legacy (bare /programm mit Login → Session, nicht Kai-Redirect)', () => {
  const r = planResolution({ pathname: '/programm.html', hasSession: true });
  assert.equal(r.by, 'session');
});

test('normalizePath: voller Pfad, klein, ohne Trailing-Slash', () => {
  assert.equal(normalizePath('/programm'), '/programm');
  assert.equal(normalizePath('/PROGRAMM.HTML'), '/programm.html');
  assert.equal(normalizePath('/empfehlen/'), '/empfehlen');
  assert.equal(normalizePath('/x/programm'), '/x/programm');
});

test('sonstige Seite ohne Kontext bleibt neutral (kein Kai)', () => {
  assert.equal(planResolution({ pathname: '/irgendwas.html' }).by, 'neutral');
});

test('/irgendwo/programm ist KEIN Kai-Legacy-Pfad (kein Redirect zu Kai)', () => {
  const r = planResolution({ pathname: '/irgendwo/programm' });
  assert.notEqual(r.by, 'redirect');
  assert.equal(r.by, 'neutral');
});

test('/unterordner/programm.html leitet NICHT zu Kai', () => {
  assert.notEqual(planResolution({ pathname: '/promo/programm.html' }).by, 'redirect');
});

test('Strikt-Seite auch im Unterordner: Fehler, nie Kai', () => {
  assert.equal(planResolution({ pathname: '/x/empfaenger.html' }).by, 'error');
});
