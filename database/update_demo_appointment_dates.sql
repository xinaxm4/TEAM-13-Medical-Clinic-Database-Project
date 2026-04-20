-- ─── Move demo "today" appointments to the actual current date ───────────────
-- The original add_today_appointments.sql hardcoded '2026-04-18'.
-- Run this once on Railway whenever the demo date falls behind.
-- Safe to re-run (idempotent — just updates the date column).

UPDATE appointment
SET appointment_date = CURDATE()
WHERE appointment_id IN (9, 10, 11, 12);
