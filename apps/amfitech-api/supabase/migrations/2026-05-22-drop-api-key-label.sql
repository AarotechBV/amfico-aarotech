-- =============================================================
-- 2026-05-22 — drop label column from admin_pulse_keys
-- =============================================================
-- The label served no purpose — there is exactly one key per office
-- and the office's name already identifies it.
--
-- Idempotent — safe to re-run.
-- =============================================================

alter table public.admin_pulse_keys drop column if exists label;
