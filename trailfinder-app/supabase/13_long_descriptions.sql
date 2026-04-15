-- ============================================================
-- Migration 13: Add long_description columns (DE, EN, FR, NL)
-- Run in Supabase SQL Editor
-- ============================================================

alter table public.events
  add column if not exists long_description_de text,
  add column if not exists long_description_en text,
  add column if not exists long_description_fr text,
  add column if not exists long_description_nl text;
