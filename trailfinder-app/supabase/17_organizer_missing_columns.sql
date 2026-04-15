-- ============================================================
-- Migration 17: Add missing columns to organizers table
-- Combines migration 15 (logo_bg_color) which was never run.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

alter table public.organizers
  add column if not exists email         text,
  add column if not exists phone         text,
  add column if not exists status        text default 'active',
  add column if not exists logo_bg_color text default 'black';
