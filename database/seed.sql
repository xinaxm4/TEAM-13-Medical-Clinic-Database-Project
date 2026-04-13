-- ============================================================
--  Audit Trail Health — Seed Data (Trimmed & Clean)
--  Passwords meet strength requirements: 8+ chars, uppercase,
--  number, special character — all pre-hashed with bcrypt.
--
--  Demo credentials:
--    Patients   → username: their email    | password: Patient@123
--    Physicians → username: dr.lastname    | password: Doctor@123
--    Staff      → username: staff.lastname | password: Staff@123
-- ============================================================

-- ─── Reference Tables ───────────────────────────────────────

INSERT IGNORE INTO appointment_status (status_id, status_name) VALUES
  (1, 'Scheduled'),
  (2, 'Completed'),
  (3, 'Cancelled'),
  (4, 'No-Show');

-- Full referral lifecycle
INSERT IGNORE INTO referral_status (referral_status_id, referral_status_name) VALUES
  (1, 'Requested'),
  (2, 'Issued'),
  (3, 'Accepted'),
  (4, 'Rejected'),
  (5, 'Scheduled'),
  (6, 'Completed'),
  (7, 'Expired');

-- ─── Insurance (3 providers) ────────────────────────────────

INSERT IGNORE INTO insurance (insurance_id, provider_name, policy_number, coverage_percentage, group_number, phone_number) VALUES
  (1, 'BlueCross BlueShield', 'BCB-100001', 80.00, 'GRP-001', '(800) 555-2583'),
  (2, 'Aetna',                'AET-200002', 75.00, 'GRP-002', '(800) 555-2386'),
  (3, 'UnitedHealth',         'UHC-300003', 85.00, 'GRP-003', '(800) 555-4822');

-- ─── Clinics (3 Texas locations) ────────────────────────────

INSERT IGNORE INTO clinic (clinic_id, clinic_name, phone_number, street_address, city, state, zip_code) VALUES
  (1, 'Audit Trail Health Dallas',  '(214) 555-0200', '3001 Knox St Suite 200',     'Dallas',  'TX', '75205'),
  (2, 'Audit Trail Health Houston', '(713) 555-0200', '2900 Weslayan St Suite 300', 'Houston', 'TX', '77027'),
  (3, 'Audit Trail Health Austin',  '(512) 555-0200', '3824 Medical Pkwy',          'Austin',  'TX', '78756');

-- ─── Offices (one per clinic) ───────────────────────────────

INSERT IGNORE INTO office (office_id, clinic_id, phone_number, street_address, city, state, zip_code) VALUES
  (1, 1, '(214) 555-0200', '3001 Knox St Suite 200',     'Dallas',  'TX', '75205'),
  (2, 2, '(713) 555-0200', '2900 Weslayan St Suite 300', 'Houston', 'TX', '77027'),
  (3, 3, '(512) 555-0200', '3824 Medical Pkwy',          'Austin',  'TX', '78756');

-- ─── Departments (2 per clinic: 1 primary, 1 specialist) ────

INSERT IGNORE INTO department (department_id, department_name, description, clinic_id) VALUES
  (1, 'Internal Medicine', 'Chronic disease management, diagnostics, and preventive wellness', 1),
  (2, 'Orthopedics',       'Joint replacement, sports medicine, and spine care',               1),
  (3, 'Family Medicine',   'Comprehensive primary care for all ages and conditions',            2),
  (4, 'Cardiology',        'Heart disease prevention, diagnostics, and treatment',              2),
  (5, 'General Practice',  'Primary care and preventive medicine for all ages',                 3),
  (6, 'Neurology',         'Brain, spinal cord, and nervous system conditions',                 3);

-- ─── Physicians (6 total: 3 primary, 3 specialist) ──────────

INSERT IGNORE INTO physician (physician_id, first_name, last_name, email, phone_number, specialty, department_id, hire_date, physician_type) VALUES
  (1, 'Emily',    'Johnson', 'e.johnson@palantirclinic.com', '(214) 555-0301', 'Internal Medicine', 1, '2019-01-10', 'primary'),
  (2, 'Maria',    'Garcia',  'm.garcia@palantirclinic.com',  '(214) 555-0302', 'Orthopedics',       2, '2018-03-15', 'specialist'),
  (3, 'Patricia', 'Moore',   'p.moore@palantirclinic.com',   '(713) 555-0301', 'Family Medicine',   3, '2015-04-01', 'primary'),
  (4, 'Angela',   'White',   'a.white@palantirclinic.com',   '(713) 555-0302', 'Cardiology',        4, '2016-09-01', 'specialist'),
  (5, 'Robert',   'Davis',   'r.davis@palantirclinic.com',   '(512) 555-0301', 'General Practice',  5, '2014-04-01', 'primary'),
  (6, 'Rachel',   'Foster',  'r.foster@palantirclinic.com',  '(512) 555-0302', 'Neurology',         6, '2019-06-15', 'specialist');

-- ─── Work Schedules (2 days per physician = 12 rows) ────────

INSERT IGNORE INTO work_schedule (schedule_id, physician_id, office_id, day_of_week, start_time, end_time) VALUES
  (1,  1, 1, 'Monday',    '08:00:00', '17:00:00'),
  (2,  1, 1, 'Wednesday', '08:00:00', '17:00:00'),
  (3,  2, 1, 'Tuesday',   '08:00:00', '17:00:00'),
  (4,  2, 1, 'Thursday',  '08:00:00', '17:00:00'),
  (5,  3, 2, 'Monday',    '08:00:00', '17:00:00'),
  (6,  3, 2, 'Thursday',  '08:00:00', '17:00:00'),
  (7,  4, 2, 'Tuesday',   '08:00:00', '17:00:00'),
  (8,  4, 2, 'Friday',    '08:00:00', '17:00:00'),
  (9,  5, 3, 'Wednesday', '08:00:00', '17:00:00'),
  (10, 5, 3, 'Friday',    '08:00:00', '17:00:00'),
  (11, 6, 3, 'Monday',    '09:00:00', '17:00:00'),
  (12, 6, 3, 'Thursday',  '09:00:00', '17:00:00');

-- ─── Staff (3 members) ──────────────────────────────────────

INSERT IGNORE INTO staff (staff_id, first_name, last_name, date_of_birth, department_id, role, hire_date, phone_number, email, shift_start, shift_end) VALUES
  (1, 'Nicole', 'Adams',  '1990-04-12', 1, 'Medical Assistant',  '2021-01-10', '(214) 555-0401', 'n.adams@palantirclinic.com',  '08:00:00', '16:00:00'),
  (2, 'Jordan', 'Brooks', '1988-09-23', 4, 'Billing Specialist', '2019-06-15', '(713) 555-0401', 'j.brooks@palantirclinic.com', '09:00:00', '17:00:00'),
  (3, 'Morgan', 'Taylor', '1993-02-17', 3, 'Receptionist',       '2020-03-01', '(512) 555-0401', 'm.taylor@palantirclinic.com', '08:00:00', '16:00:00');

-- ─── Users (login accounts) ─────────────────────────────────
-- Passwords bcrypt-hashed (10 rounds)
-- Patient@123  → $2b$10$2BNnadEL3Jfi23zImdwLM.uDE.3W3.51V2Xa2FVIUfJIW40dhz2vy
-- Doctor@123   → $2b$10$iYtcOYwO7FI7XmaNKeVAYev4WdRcLNaYzcT08LtJoBxGdGXHElDk6
-- Staff@123    → $2b$10$1lOpxTZx1crCArWmk/jP6OPz40BsG3qPJeTQQP5WF6y0PveuhvnA6

INSERT IGNORE INTO users (user_id, username, password_hash, role, physician_id, staff_id) VALUES
  (1,  'alex.smith@email.com',    '$2b$10$2BNnadEL3Jfi23zImdwLM.uDE.3W3.51V2Xa2FVIUfJIW40dhz2vy', 'patient',   NULL, NULL),
  (2,  'taylor.jones@email.com',  '$2b$10$2BNnadEL3Jfi23zImdwLM.uDE.3W3.51V2Xa2FVIUfJIW40dhz2vy', 'patient',   NULL, NULL),
  (3,  'morgan.w@email.com',      '$2b$10$2BNnadEL3Jfi23zImdwLM.uDE.3W3.51V2Xa2FVIUfJIW40dhz2vy', 'patient',   NULL, NULL),
  (4,  'jordan.brown@email.com',  '$2b$10$2BNnadEL3Jfi23zImdwLM.uDE.3W3.51V2Xa2FVIUfJIW40dhz2vy', 'patient',   NULL, NULL),
  (5,  'casey.davis@email.com',   '$2b$10$2BNnadEL3Jfi23zImdwLM.uDE.3W3.51V2Xa2FVIUfJIW40dhz2vy', 'patient',   NULL, NULL),
  (6,  'dr.johnson',              '$2b$10$iYtcOYwO7FI7XmaNKeVAYev4WdRcLNaYzcT08LtJoBxGdGXHElDk6', 'physician', 1,    NULL),
  (7,  'dr.garcia',               '$2b$10$iYtcOYwO7FI7XmaNKeVAYev4WdRcLNaYzcT08LtJoBxGdGXHElDk6', 'physician', 2,    NULL),
  (8,  'dr.moore',                '$2b$10$iYtcOYwO7FI7XmaNKeVAYev4WdRcLNaYzcT08LtJoBxGdGXHElDk6', 'physician', 3,    NULL),
  (9,  'dr.white',                '$2b$10$iYtcOYwO7FI7XmaNKeVAYev4WdRcLNaYzcT08LtJoBxGdGXHElDk6', 'physician', 4,    NULL),
  (10, 'dr.davis',                '$2b$10$iYtcOYwO7FI7XmaNKeVAYev4WdRcLNaYzcT08LtJoBxGdGXHElDk6', 'physician', 5,    NULL),
  (11, 'dr.foster',               '$2b$10$iYtcOYwO7FI7XmaNKeVAYev4WdRcLNaYzcT08LtJoBxGdGXHElDk6', 'physician', 6,    NULL),
  (12, 'staff.adams',             '$2b$10$1lOpxTZx1crCArWmk/jP6OPz40BsG3qPJeTQQP5WF6y0PveuhvnA6', 'staff',     NULL, 1),
  (13, 'staff.brooks',            '$2b$10$1lOpxTZx1crCArWmk/jP6OPz40BsG3qPJeTQQP5WF6y0PveuhvnA6', 'staff',     NULL, 2),
  (14, 'staff.taylor',            '$2b$10$1lOpxTZx1crCArWmk/jP6OPz40BsG3qPJeTQQP5WF6y0PveuhvnA6', 'staff',     NULL, 3);

-- ─── Patients (5 — linked to user accounts) ─────────────────

INSERT IGNORE INTO patient (patient_id, user_id, first_name, last_name, date_of_birth, phone_number, email, street_address, city, state, zip_code, gender, emergency_contact_name, emergency_contact_phone, primary_physician_id, insurance_id) VALUES
  (1, 1, 'Alex',   'Smith',    '1992-05-14', '(214) 555-1001', 'alex.smith@email.com',   '123 Elm St',     'Dallas',  'TX', '75201', 'Male',   'Jamie Smith',  '(214) 555-1002', 1, 1),
  (2, 2, 'Taylor', 'Jones',    '1985-11-22', '(713) 555-1001', 'taylor.jones@email.com', '456 Oak Ave',    'Houston', 'TX', '77001', 'Female', 'Chris Jones',  '(713) 555-1002', 3, 2),
  (3, 3, 'Morgan', 'Williams', '1998-03-08', '(512) 555-1001', 'morgan.w@email.com',     '789 Pine Rd',    'Austin',  'TX', '78701', 'Female', 'Sam Williams', '(512) 555-1002', 5, 3),
  (4, 4, 'Jordan', 'Brown',    '1975-07-19', '(214) 555-1003', 'jordan.brown@email.com', '321 Maple Blvd', 'Dallas',  'TX', '75202', 'Male',   'Riley Brown',  '(214) 555-1004', 1, 1),
  (5, 5, 'Casey',  'Davis',    '2000-01-30', '(713) 555-1003', 'casey.davis@email.com',  '654 Cedar Lane', 'Houston', 'TX', '77002', 'Female', 'Quinn Davis',  '(713) 555-1004', 3, 2);

-- ─── Appointments (8 — mix of statuses and types) ────────────

INSERT IGNORE INTO appointment (appointment_id, patient_id, physician_id, office_id, appointment_date, appointment_time, status_id, booking_method, reason_for_visit, appointment_type, duration_minutes) VALUES
  (1, 1, 1, 1, '2026-04-28', '09:00:00', 1, 'online',    'Annual physical exam',        'Physical',   60),
  (2, 1, 1, 1, '2025-12-05', '10:30:00', 2, 'phone',     'Follow-up on blood pressure', 'Follow-Up',  30),
  (3, 2, 3, 2, '2026-05-06', '11:00:00', 1, 'online',    'Routine checkup',             'General',    30),
  (4, 2, 3, 2, '2025-11-20', '14:00:00', 2, 'in-person', 'Hypertension management',     'Follow-Up',  30),
  (5, 2, 4, 2, '2026-05-13', '10:00:00', 1, 'online',    'Cardiology consultation',     'Specialist', 45),
  (6, 3, 5, 3, '2025-10-15', '09:00:00', 4, 'phone',     'Headache evaluation',         'General',    30),
  (7, 4, 1, 1, '2026-04-30', '14:00:00', 1, 'online',    'Diabetes management check',   'Follow-Up',  30),
  (8, 5, 3, 2, '2026-05-08', '13:00:00', 1, 'online',    'New patient visit',           'Physical',   60);

-- ─── Medical History (6 entries — includes no-show log) ─────

INSERT IGNORE INTO medical_history (medical_history_id, patient_id, physician_id, `condition`, diagnosis_date, status, notes) VALUES
  (1, 1, 1, 'Hypertension',    '2022-03-10', 'Active',   'Managed with lisinopril 10mg daily. Monitor BP monthly.'),
  (2, 1, 1, 'Type 2 Diabetes', '2023-07-15', 'Active',   'Diet-controlled. A1C checked quarterly. Last reading: 7.1'),
  (3, 2, 3, 'Hypertension',    '2021-04-05', 'Active',   'On amlodipine 5mg. BP consistently elevated at visits.'),
  (4, 3, 5, 'Migraine',        '2020-05-01', 'Active',   'Triggers: stress, dehydration. Prescribed sumatriptan PRN.'),
  (5, 4, 1, 'Type 2 Diabetes', '2019-11-30', 'Active',   'Metformin 1000mg twice daily. A1C: 7.8 — needs follow-up.'),
  (6, 3, 5, 'No-Show',         '2025-10-15', 'Active',   'Patient did not attend scheduled appointment on 2025-10-15');

-- ─── Diagnosis (3 entries — linked to completed appointments) ──

INSERT IGNORE INTO diagnosis (diagnosis_id, appointment_id, physician_id, diagnosis_code, diagnosis_description, diagnosis_date, severity, notes) VALUES
  (1, 2, 1, 'I10',   'Essential Hypertension', '2025-12-05', 'Moderate', 'BP 148/92 at visit. Adjusted lisinopril dosage.'),
  (2, 4, 3, 'I10',   'Essential Hypertension', '2025-11-20', 'Moderate', 'BP stable but still elevated. Continue current regimen.'),
  (3, 4, 3, 'E11.9', 'Type 2 Diabetes',        '2025-11-20', 'Mild',     'A1C within target range. Continue diet management.');

-- ─── Treatment (linked to diagnoses) ────────────────────────

INSERT IGNORE INTO treatment (treatment_id, diagnosis_id, treatment_plan, prescribed_medication, follow_up_date, notes) VALUES
  (1, 1, 'Continue antihypertensive therapy. Reduce sodium intake.',       'Lisinopril 10mg daily',      '2026-03-05', 'Return if BP exceeds 160/100'),
  (2, 2, 'Continue current antihypertensive. Increase physical activity.', 'Amlodipine 5mg daily',       '2026-02-20', 'Recheck in 3 months'),
  (3, 3, 'Monitor A1C every 3 months. Continue diet and exercise plan.',   'Metformin 500mg twice daily', '2026-02-20', 'Schedule nutritionist consult');

-- ─── Billing (5 records — includes math breakdown) ───────────
-- insurance_paid = total * (coverage% / 100)
-- patient_owed   = total - insurance_paid
-- BlueCross 80%, Aetna 75%, UnitedHealth 85%

INSERT IGNORE INTO billing (bill_id, appointment_id, patient_id, insurance_id, total_amount, tax_amount, insurance_paid_amount, patient_owed, payment_status, payment_method, payment_date, due_date) VALUES
  (1, 2, 1, 1, 150.00, 0.00, 120.00, 30.00, 'Paid',   'credit card', '2025-12-06', '2026-01-05'),
  (2, 4, 2, 2, 150.00, 0.00, 112.50, 37.50, 'Paid',   'insurance',   '2025-11-25', '2025-12-20'),
  (3, 1, 1, 1, 200.00, 0.00, 160.00, 40.00, 'Unpaid', NULL,          NULL,         '2026-05-28'),
  (4, 3, 2, 2, 150.00, 0.00, 112.50, 37.50, 'Unpaid', NULL,          NULL,         '2026-06-06'),
  (5, 7, 4, 1, 150.00, 0.00, 120.00, 30.00, 'Unpaid', NULL,          NULL,         '2026-05-30');

-- ─── Referrals (2 — demos the full referral flow) ────────────

INSERT IGNORE INTO referral (referral_id, patient_id, primary_physician_id, specialist_id, date_issued, expiration_date, referral_status_id, referral_reason, specialist_appointment_id) VALUES
  (1, 2, 3, 4, '2026-04-20', '2026-07-20', 5, 'Persistent hypertension with possible cardiac involvement. Cardiology evaluation requested.', 5),
  (2, 1, 1, 2, '2026-04-25', '2026-07-25', 1, 'Knee pain on exertion for 3 months. Orthopedic assessment needed.', NULL);
