-- ============================================================
-- Migration 15: Add logo_bg_color column to organizers table
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

alter table public.organizers
  add column if not exists logo_bg_color text default 'black';
