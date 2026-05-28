-- ============================================================
-- Empfehlungsportal · Phase 3 · Interesse-Tracking
-- ============================================================
-- Idempotent: kann beliebig oft ausgeführt werden.
-- ============================================================

alter table empfehlungen add column if not exists interessiert    boolean   default false;
alter table empfehlungen add column if not exists interessiert_at timestamp;
