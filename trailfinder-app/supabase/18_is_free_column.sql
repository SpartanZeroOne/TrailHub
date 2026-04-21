-- Migration 18: Add is_free boolean to events
-- Allows marking events as free (Kostenlos / Free / Gratuit / Gratis)
-- in the Admin Panel and displaying the label in the app instead of a price.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;
