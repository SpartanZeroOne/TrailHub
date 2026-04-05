-- ─── Migration 04: Privacy – "Alle" Option entfernen ────────────────────────
-- Problem:  privacy_registration_visibility hatte den Wert 'everyone', was
--           bedeutete, dass Event-Anmeldungen für alle sichtbar sind.
--           Diese Option wird aus Datenschutzgründen entfernt.
-- Lösung:   Alle User mit 'everyone' werden auf 'friends' migriert.
--           Gültige Werte sind nun nur noch: 'friends' | 'nobody'

-- ─── Bestehende 'everyone'-Einträge migrieren ────────────────────────────────
UPDATE public.users
SET privacy_registration_visibility = 'friends'
WHERE privacy_registration_visibility = 'everyone'
   OR privacy_registration_visibility IS NULL;

-- ─── Optional: CHECK Constraint hinzufügen (verhindert 'everyone' in Zukunft) ─
-- Nur ausführen wenn noch kein Constraint existiert:
-- ALTER TABLE public.users
--     DROP CONSTRAINT IF EXISTS users_privacy_check;
-- ALTER TABLE public.users
--     ADD CONSTRAINT users_privacy_check
--     CHECK (privacy_registration_visibility IN ('friends', 'nobody'));

-- ─── ANLEITUNG ────────────────────────────────────────────────────────────────
-- Wurde bereits automatisch ausgeführt (2026-03-31).
-- Alle 4 User wurden auf 'friends' migriert.