-- Phase 346: Abmelden von KIDZ-Mails per persoenlichem Link
--
-- Am 11.09.2026 geht die erste KIDZ-Mail an alle Gewinnspiel-Teilnehmer mit
-- Mailadresse (Dank, Aufloesung, KIDZ for Future). Kai will dafuer eine
-- Abmeldung wie bei richtigen Newslettern: ein Link in jeder Mail, ein Klick,
-- danach keine KIDZ-Mails mehr. Eine Antwortmail mit "Abmelden" haette das Team
-- von Hand austragen muessen und waere leicht untergegangen.
--
-- Jede Teilnahme bekommt einen zufaelligen Schluessel (abmelde_token). Der Link
-- in der Mail traegt ihn, nicht die Mailadresse. So kann niemand fremde
-- Adressen austragen, indem er eine Adresse in die Adresszeile tippt.
--
-- Abgemeldet wird die Mailadresse, nicht die einzelne Zeile. Manche Menschen
-- stehen mit derselben Adresse mehrfach in der Liste (online und auf Papier).
-- Wer sich abmeldet, meint alle Eintraege mit seiner Adresse.
--
-- Die Funktion schreibt ausschliesslich mail_abgemeldet_at und behaelt den
-- ersten Zeitpunkt (coalesce). Gewinnspiel, Losnummer, Zuordnung und die
-- einmalige KIDZ-for-Future-Einwilligung bleiben unberuehrt: Wer keine Mails
-- mehr will, nimmt trotzdem an der Auslosung teil.
--
-- Bewusst ohne Anmeldung aufrufbar (anon): Der Empfaenger hat kein Konto. Der
-- Schluessel ist eine UUID, raten ist aussichtslos. Die Funktion verraet nicht,
-- welche Adresse dahintersteht.

begin;

alter table public.kidz_gewinnspiel_teilnahmen
  add column if not exists abmelde_token uuid not null default gen_random_uuid(),
  add column if not exists mail_abgemeldet_at timestamptz;

create unique index if not exists kidz_gewinnspiel_teilnahmen_abmelde_token_key
  on public.kidz_gewinnspiel_teilnahmen (abmelde_token);

comment on column public.kidz_gewinnspiel_teilnahmen.abmelde_token is
  'Persoenlicher Schluessel fuer den Abmeldelink in KIDZ-Mails. Steht im Link statt der Mailadresse.';
comment on column public.kidz_gewinnspiel_teilnahmen.mail_abgemeldet_at is
  'Zeitpunkt, zu dem sich die Mailadresse von KIDZ-Mails abgemeldet hat. Gesetzt fuer alle Zeilen derselben Adresse.';

create or replace function public.kidz_mail_abmelden_public(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mail text;
begin
  if p_token is null then
    return jsonb_build_object('ok', false);
  end if;

  select lower(trim(t.email)) into v_mail
    from public.kidz_gewinnspiel_teilnahmen t
   where t.abmelde_token = p_token
   limit 1;

  if coalesce(v_mail, '') = '' then
    return jsonb_build_object('ok', false);
  end if;

  update public.kidz_gewinnspiel_teilnahmen
     set mail_abgemeldet_at = coalesce(mail_abgemeldet_at, now())
   where lower(trim(email)) = v_mail;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.kidz_mail_abmelden_public(uuid) from public;
grant execute on function public.kidz_mail_abmelden_public(uuid) to anon, authenticated;

comment on function public.kidz_mail_abmelden_public(uuid) is
  'Meldet die Mailadresse hinter einem Abmeldeschluessel von KIDZ-Mails ab. Schreibt nur mail_abgemeldet_at, verraet keine Adresse.';

commit;
