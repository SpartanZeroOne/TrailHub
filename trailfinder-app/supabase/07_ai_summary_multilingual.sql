-- ─── Migration 07: Mehrsprachige KI-Zusammenfassungen ────────────────────────
-- Schritt 1: Neue Spalten anlegen (idempotent – kann mehrfach ausgeführt werden)
-- Schritt 2: Bestehende ai_summary-Daten nach ai_summary_de kopieren
-- Schritt 3: ai_summary_updated_at für migrierte Zeilen setzen
--
-- Im Supabase SQL Editor ausführen:
-- Dashboard → SQL Editor → New query → alles markieren → Run

-- ─── 1. Spalten anlegen ───────────────────────────────────────────────────────
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS ai_summary_de         text        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS ai_summary_en         text        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS ai_summary_fr         text        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS ai_summary_nl         text        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS ai_summary_updated_at timestamptz DEFAULT NULL;

-- ─── 2. Datenmigration: alte ai_summary → ai_summary_de ──────────────────────
-- Kopiert bestehende deutsche Texte aus ai_summary in das neue Feld.
-- Überschreibt ai_summary_de NUR wenn es noch NULL ist (safe to re-run).
UPDATE public.events
SET
    ai_summary_de         = ai_summary,
    ai_summary_updated_at = COALESCE(ai_summary_updated_at, now())
WHERE
    ai_summary IS NOT NULL
    AND ai_summary <> ''
    AND ai_summary_de IS NULL;

-- ─── ERGEBNIS PRÜFEN ─────────────────────────────────────────────────────────
-- Nach dem Ausführen kannst du prüfen:
-- SELECT id, name, ai_summary_de, ai_summary_en, ai_summary_fr, ai_summary_nl
-- FROM public.events
-- ORDER BY name;