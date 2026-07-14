-- ============================================================
-- Phase 23 / Build-Phase 82 · Team-Momentum
-- ------------------------------------------------------------
-- Präsenz (last_seen) + team-weite, DATENSPARSAME Lesefunktionen für den Hub:
-- jeder eingeloggte Berater sieht Team-Aktivität + wer online/zuletzt aktiv ist.
-- SECURITY DEFINER umgeht bewusst die berater-scoped RLS, gibt aber NUR
-- Berater-Ebene zurück (Name/Foto/Ereignis/Zeit) — KEINE Kunden-/Promoter-Namen.
--
-- Bereits per Supabase-MCP live (Migration phase82_team_momentum).
-- Verifiziert: team_activity/team_presence liefern nur Berater-Felder.
-- ============================================================

alter table public.berater add column if not exists last_seen timestamptz;

create or replace function public.touch_presence()
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.berater set last_seen = now() where auth_user_id = auth.uid();
$$;
revoke execute on function public.touch_presence() from anon;
grant execute on function public.touch_presence() to authenticated;

create or replace function public.team_activity(p_days int default 14)
returns table(berater_name text, berater_foto text, event text, event_at timestamp)
language sql security definer set search_path = public, pg_temp as $$
  select b.name, b.foto_url, 'empfehlung'::text, e.created_at
  from empfehlungen e join berater b on b.id = e.berater_id
  where e.created_at >= (now() - make_interval(days => p_days))::timestamp
  union all
  select b.name, b.foto_url, 'promoter'::text, em.created_at
  from empfehler em join berater b on b.id = em.berater_id
  where em.created_at >= (now() - make_interval(days => p_days))::timestamp
  union all
  select b.name, b.foto_url, 'kunde'::text, p.earned_at::timestamp
  from praemien p join berater b on b.id = p.berater_id
  where p.earned_at >= (now() - make_interval(days => p_days))
  order by 4 desc
  limit 40;
$$;
grant execute on function public.team_activity(int) to authenticated;

create or replace function public.team_presence()
returns table(berater_name text, berater_foto text, last_seen timestamptz, heute_empfehlungen int, heute_promoter int)
language sql security definer set search_path = public, pg_temp as $$
  select b.name, b.foto_url, b.last_seen,
    (select count(*)::int from empfehlungen e where e.berater_id = b.id and e.created_at::date = current_date),
    (select count(*)::int from empfehler em where em.berater_id = b.id and em.created_at::date = current_date)
  from berater b
  where b.ist_aktiv
  order by b.last_seen desc nulls last, b.name;
$$;
grant execute on function public.team_presence() to authenticated;
