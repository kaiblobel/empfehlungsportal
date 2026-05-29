-- ============================================================
-- Empfehlungsportal · Phase 10 · Vorlagen-CMS-Update-Policy
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'vorlagen auth update' and tablename = 'vorlagen') then
    create policy "vorlagen auth update" on vorlagen for update
      using (auth.role() = 'authenticated');
  end if;
end $$;
