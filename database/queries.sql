-- ============================================================
--  Audit Trail Health — Reference Queries
--  These queries power the 3 data reports in the application.
--  Use ? placeholders when running via Node.js (mysql2).
--  Replace ? with actual values when testing in Workbench.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Query 1: Patient Billing Statement
-- Joins: billing → appointment → physician → office → insurance
-- Usage: GET /api/reports/billing-statement?patient_id=X
-- Test:  Replace ? with a patient_id (e.g. 1)
-- ─────────────────────────────────────────────────────────────
SELECT
  b.bill_id,
  a.appointment_date,
  a.appointment_type,
  CONCAT(ph.first_name, ' ', ph.last_name)  AS physician_name,
  ph.specialty,
  o.city                                     AS office_city,
  b.total_amount,
  IFNULL(b.insurance_paid_amount, 0)         AS insurance_paid,
  IFNULL(b.patient_owed, 0)                  AS patient_owed,
  b.payment_status,
  b.payment_method,
  b.payment_date,
  b.due_date,
  ins.provider_name,
  ins.coverage_percentage
FROM billing b
JOIN  appointment a   ON b.appointment_id = a.appointment_id
JOIN  physician ph    ON a.physician_id   = ph.physician_id
JOIN  office o        ON a.office_id      = o.office_id
LEFT JOIN insurance ins ON b.insurance_id = ins.insurance_id
WHERE b.patient_id = ?
ORDER BY a.appointment_date DESC;


-- ─────────────────────────────────────────────────────────────
-- Query 2: Daily Appointment Schedule
-- All appointments for a given date, sorted by city then time
-- Usage: GET /api/reports/daily-schedule?date=YYYY-MM-DD
-- Test:  Replace ? with a date (e.g. '2026-04-28')
-- ─────────────────────────────────────────────────────────────
SELECT
  a.appointment_time,
  CONCAT(pt.first_name, ' ', pt.last_name)  AS patient_name,
  pt.phone_number                            AS patient_phone,
  CONCAT(ph.first_name, ' ', ph.last_name)  AS physician_name,
  ph.specialty,
  a.appointment_type,
  a.duration_minutes,
  a.reason_for_visit,
  s.status_name,
  o.city,
  o.street_address
FROM appointment a
JOIN patient pt              ON a.patient_id  = pt.patient_id
JOIN physician ph             ON a.physician_id = ph.physician_id
JOIN appointment_status s     ON a.status_id    = s.status_id
JOIN office o                 ON a.office_id    = o.office_id
WHERE a.appointment_date = ?
ORDER BY o.city, a.appointment_time;


-- ─────────────────────────────────────────────────────────────
-- Query 3: Physician Activity Report (rolling 90-day window)
-- Uses CASE WHEN aggregation to compute completion rate %,
-- revenue billed, no-show rate, unique patients seen.
-- Usage: GET /api/reports/physician-activity?physician_id=X
-- Test:  Replace ? with a physician_id (e.g. 1)
-- ─────────────────────────────────────────────────────────────
SELECT
  ph.physician_id,
  CONCAT(ph.first_name, ' ', ph.last_name)  AS physician_name,
  ph.specialty,
  COUNT(a.appointment_id)                   AS total_appointments,
  SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END)  AS completed,
  SUM(CASE WHEN s.status_name = 'No-Show'   THEN 1 ELSE 0 END)  AS no_shows,
  SUM(CASE WHEN s.status_name = 'Cancelled' THEN 1 ELSE 0 END)  AS cancelled,
  ROUND(
    SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END)
    / NULLIF(COUNT(a.appointment_id), 0) * 100, 1
  )                                          AS completion_rate_pct,
  IFNULL(SUM(b.total_amount), 0)             AS total_revenue_billed,
  IFNULL(SUM(b.patient_owed), 0)             AS outstanding_patient_balance,
  COUNT(DISTINCT a.patient_id)               AS unique_patients_seen
FROM physician ph
LEFT JOIN appointment a
  ON ph.physician_id = a.physician_id
  AND a.appointment_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 90 DAY) AND CURDATE()
LEFT JOIN appointment_status s ON a.status_id    = s.status_id
LEFT JOIN billing b            ON a.appointment_id = b.appointment_id
WHERE ph.physician_id = ?
GROUP BY ph.physician_id, ph.first_name, ph.last_name, ph.specialty;
