-- ============================================================
--  Palantir Clinic — Seed Data
--  Run this on the Railway database after the schema is set up.
--  Safe to re-run: uses INSERT IGNORE / ON DUPLICATE KEY where possible.
-- ============================================================

-- ─── Reference tables ───────────────────────────────────────

INSERT IGNORE INTO appointment_status (status_id, status_name) VALUES
  (1, 'Scheduled'),
  (2, 'Completed'),
  (3, 'Cancelled'),
  (4, 'No-Show');

INSERT IGNORE INTO referral_status (referral_status_id, referral_status_name) VALUES
  (1, 'Pending'),
  (2, 'Approved'),
  (3, 'Rejected'),
  (4, 'Expired');

-- ─── Insurance ──────────────────────────────────────────────

INSERT IGNORE INTO insurance (insurance_id, provider_name, policy_number, coverage_percentage, group_number, phone_number) VALUES
  (1, 'BlueCross BlueShield', 'BCB-100001', 80.00, 'GRP-001', '(800) 555-2583'),
  (2, 'Aetna',                'AET-200002', 75.00, 'GRP-002', '(800) 555-2386'),
  (3, 'UnitedHealth',         'UHC-300003', 85.00, 'GRP-003', '(800) 555-4822'),
  (4, 'Cigna',                'CIG-400004', 70.00, 'GRP-004', '(800) 555-2446'),
  (5, 'Humana',               'HUM-500005', 78.00, 'GRP-005', '(800) 555-4862');

-- ─── Clinics ────────────────────────────────────────────────

INSERT IGNORE INTO clinic (clinic_id, clinic_name, phone_number, street_address, city, state, zip_code) VALUES
  (1, 'Palantir Clinic Dallas',      '(214) 555-0200', '3001 Knox St Suite 200',     'Dallas',      'TX', '75205'),
  (2, 'Palantir Clinic Houston',     '(713) 555-0200', '2900 Weslayan St Suite 300', 'Houston',     'TX', '77027'),
  (3, 'Palantir Clinic Austin',      '(512) 555-0200', '3824 Medical Pkwy',          'Austin',      'TX', '78756'),
  (4, 'Palantir Clinic San Antonio', '(210) 555-0200', '4615 Medical Dr',            'San Antonio', 'TX', '78229'),
  (5, 'Palantir Clinic Chicago',     '(312) 555-0200', '225 N Michigan Ave',         'Chicago',     'IL', '60601'),
  (6, 'Palantir Clinic Los Angeles', '(213) 555-0200', '6200 Wilshire Blvd',         'Los Angeles', 'CA', '90048'),
  (7, 'Palantir Clinic New York',    '(212) 555-0200', '405 Lexington Ave',          'New York',    'NY', '10174');

-- ─── Offices (one per clinic) ───────────────────────────────

INSERT IGNORE INTO office (office_id, clinic_id, phone_number, street_address, city, state, zip_code) VALUES
  (1, 1, '(214) 555-0200', '3001 Knox St Suite 200',     'Dallas',      'TX', '75205'),
  (2, 2, '(713) 555-0200', '2900 Weslayan St Suite 300', 'Houston',     'TX', '77027'),
  (3, 3, '(512) 555-0200', '3824 Medical Pkwy',          'Austin',      'TX', '78756'),
  (4, 4, '(210) 555-0200', '4615 Medical Dr',            'San Antonio', 'TX', '78229'),
  (5, 5, '(312) 555-0200', '225 N Michigan Ave',         'Chicago',     'IL', '60601'),
  (6, 6, '(213) 555-0200', '6200 Wilshire Blvd',         'Los Angeles', 'CA', '90048'),
  (7, 7, '(212) 555-0200', '405 Lexington Ave',          'New York',    'NY', '10174');

-- ─── Departments ────────────────────────────────────────────

INSERT IGNORE INTO department (department_id, department_name, description, clinic_id) VALUES
  -- Dallas
  (1,  'Orthopedics',       'Joint replacement, sports medicine, and spine care',             1),
  (2,  'Pediatrics',        'Well-child visits, immunizations, and adolescent care',           1),
  (3,  'Internal Medicine', 'Chronic disease management, diagnostics, and wellness',           1),
  -- Houston
  (4,  'Cardiology',        'Heart disease prevention, diagnostics, and treatment',            2),
  (5,  'Endocrinology',     'Diabetes, thyroid, and hormonal disorder management',             2),
  (6,  'Family Medicine',   'Comprehensive care for all ages and conditions',                  2),
  -- Austin
  (7,  'Neurology',         'Brain, spinal cord, and nervous system conditions',               3),
  (8,  'Dermatology',       'Skin, hair, and nail disorders and cosmetic care',                3),
  (9,  'Urgent Care',       'Walk-in treatment for non-emergency acute conditions',            3),
  -- San Antonio
  (10, 'Orthopedics',       'Joint replacement, sports medicine, and spine care',             4),
  (11, 'Pulmonology',       'Asthma, COPD, lung disease, and sleep disorders',                4),
  (12, 'OB/GYN',            'Obstetrics, gynecology, and women\'s health services',           4),
  -- Chicago
  (13, 'Cardiology',        'Heart disease prevention, diagnostics, and treatment',            5),
  (14, 'Neurology',         'Brain, spinal cord, and nervous system conditions',               5),
  (15, 'General Practice',  'Primary care and preventive medicine for all ages',               5),
  -- Los Angeles
  (16, 'Dermatology',       'Skin, hair, and nail disorders and cosmetic care',                6),
  (17, 'Psychiatry',        'Mental health evaluation, therapy, and medication management',    6),
  (18, 'Oncology',          'Cancer screening, diagnosis, treatment, and survivorship care',   6),
  -- New York
  (19, 'Emergency Medicine','Immediate treatment of acute illness and injury',                 7),
  (20, 'Surgery',           'General and specialized surgical procedures',                     7),
  (21, 'OB/GYN',            'Obstetrics, gynecology, and women\'s health services',           7);

-- ─── Physicians ─────────────────────────────────────────────

INSERT IGNORE INTO physician (physician_id, first_name, last_name, email, phone_number, specialty, department_id, hire_date) VALUES
  -- Dallas
  (1,  'Maria',    'Garcia',    'm.garcia@palantirclinic.com',     '(214) 555-0301', 'Orthopedics',       1,  '2018-03-15'),
  (2,  'William',  'Turner',    'w.turner@palantirclinic.com',     '(214) 555-0302', 'Pediatrics',        2,  '2017-07-01'),
  (3,  'Emily',    'Johnson',   'e.johnson@palantirclinic.com',    '(214) 555-0303', 'Internal Medicine', 3,  '2019-01-10'),
  (4,  'Carlos',   'Navarro',   'c.navarro@palantirclinic.com',    '(214) 555-0304', 'Orthopedics',       1,  '2020-05-20'),
  -- Houston
  (5,  'Angela',   'White',     'a.white@palantirclinic.com',      '(713) 555-0301', 'Cardiology',        4,  '2016-09-01'),
  (6,  'Samuel',   'Nguyen',    's.nguyen@palantirclinic.com',     '(713) 555-0302', 'Endocrinology',     5,  '2018-11-15'),
  (7,  'Patricia', 'Moore',     'p.moore@palantirclinic.com',      '(713) 555-0303', 'Family Medicine',   6,  '2015-04-01'),
  (8,  'Kevin',    'Park',      'k.park@palantirclinic.com',       '(713) 555-0304', 'Cardiology',        4,  '2021-02-01'),
  -- Austin
  (9,  'Rachel',   'Foster',    'r.foster@palantirclinic.com',     '(512) 555-0301', 'Neurology',         7,  '2019-06-15'),
  (10, 'Jonathan', 'Lee',       'j.lee@palantirclinic.com',        '(512) 555-0302', 'Dermatology',       8,  '2017-03-01'),
  (11, 'Diana',    'Cruz',      'd.cruz@palantirclinic.com',       '(512) 555-0303', 'Urgent Care',       9,  '2020-08-01'),
  (12, 'Marcus',   'Hill',      'm.hill@palantirclinic.com',       '(512) 555-0304', 'Neurology',         7,  '2022-01-10'),
  -- San Antonio
  (13, 'Rosa',     'Martinez',  'r.martinez@palantirclinic.com',   '(210) 555-0301', 'Orthopedics',       10, '2018-05-01'),
  (14, 'Brian',    'Collins',   'b.collins@palantirclinic.com',    '(210) 555-0302', 'Pulmonology',       11, '2016-12-01'),
  (15, 'Sandra',   'Reyes',     's.reyes@palantirclinic.com',      '(210) 555-0303', 'OB/GYN',            12, '2019-09-15'),
  (16, 'Derek',    'Thompson',  'd.thompson@palantirclinic.com',   '(210) 555-0304', 'Orthopedics',       10, '2021-03-01'),
  -- Chicago
  (17, 'James',    'Mitchell',  'j.mitchell@palantirclinic.com',   '(312) 555-0301', 'Cardiology',        13, '2015-07-01'),
  (18, 'Sarah',    'Chen',      's.chen@palantirclinic.com',       '(312) 555-0302', 'Neurology',         14, '2017-10-15'),
  (19, 'Robert',   'Davis',     'r.davis@palantirclinic.com',      '(312) 555-0303', 'General Practice',  15, '2014-04-01'),
  (20, 'Emily',    'Park',      'e.park@palantirclinic.com',       '(312) 555-0304', 'General Practice',  15, '2020-06-01'),
  -- Los Angeles
  (21, 'David',    'Kim',       'd.kim@palantirclinic.com',        '(213) 555-0301', 'Oncology',          18, '2016-03-01'),
  (22, 'Lisa',     'Martinez',  'l.martinez@palantirclinic.com',   '(213) 555-0302', 'Dermatology',       16, '2018-08-15'),
  (23, 'Michael',  'Brown',     'm.brown@palantirclinic.com',      '(213) 555-0303', 'Psychiatry',        17, '2019-11-01'),
  -- New York
  (24, 'Jennifer', 'Lee',       'jen.lee@palantirclinic.com',      '(212) 555-0301', 'Emergency Medicine',19, '2017-05-01'),
  (25, 'Thomas',   'Wilson',    't.wilson@palantirclinic.com',     '(212) 555-0302', 'Surgery',           20, '2015-09-15'),
  (26, 'Amanda',   'Rodriguez', 'a.rodriguez@palantirclinic.com',  '(212) 555-0303', 'OB/GYN',            21, '2020-01-15');

-- ─── Work Schedules ─────────────────────────────────────────

INSERT IGNORE INTO work_schedule (schedule_id, physician_id, office_id, day_of_week, start_time, end_time) VALUES
  -- Dallas physicians → office 1
  (1,  1,  1, 'Monday',    '08:00:00', '17:00:00'),
  (2,  1,  1, 'Wednesday', '08:00:00', '17:00:00'),
  (3,  2,  1, 'Tuesday',   '09:00:00', '17:00:00'),
  (4,  2,  1, 'Thursday',  '09:00:00', '17:00:00'),
  (5,  3,  1, 'Monday',    '08:00:00', '16:00:00'),
  (6,  3,  1, 'Friday',    '08:00:00', '16:00:00'),
  (7,  4,  1, 'Tuesday',   '08:00:00', '17:00:00'),
  (8,  4,  1, 'Thursday',  '08:00:00', '17:00:00'),
  -- Houston physicians → office 2
  (9,  5,  2, 'Monday',    '08:00:00', '17:00:00'),
  (10, 5,  2, 'Wednesday', '08:00:00', '17:00:00'),
  (11, 6,  2, 'Tuesday',   '09:00:00', '18:00:00'),
  (12, 6,  2, 'Friday',    '09:00:00', '18:00:00'),
  (13, 7,  2, 'Monday',    '08:00:00', '17:00:00'),
  (14, 7,  2, 'Thursday',  '08:00:00', '17:00:00'),
  (15, 8,  2, 'Wednesday', '09:00:00', '17:00:00'),
  (16, 8,  2, 'Friday',    '09:00:00', '17:00:00'),
  -- Austin physicians → office 3
  (17, 9,  3, 'Monday',    '08:00:00', '17:00:00'),
  (18, 9,  3, 'Thursday',  '08:00:00', '17:00:00'),
  (19, 10, 3, 'Tuesday',   '09:00:00', '17:00:00'),
  (20, 10, 3, 'Friday',    '09:00:00', '17:00:00'),
  (21, 11, 3, 'Monday',    '08:00:00', '20:00:00'),
  (22, 11, 3, 'Wednesday', '08:00:00', '20:00:00'),
  (23, 12, 3, 'Tuesday',   '08:00:00', '17:00:00'),
  (24, 12, 3, 'Thursday',  '08:00:00', '17:00:00'),
  -- San Antonio physicians → office 4
  (25, 13, 4, 'Monday',    '08:00:00', '17:00:00'),
  (26, 13, 4, 'Wednesday', '08:00:00', '17:00:00'),
  (27, 14, 4, 'Tuesday',   '09:00:00', '17:00:00'),
  (28, 14, 4, 'Friday',    '09:00:00', '17:00:00'),
  (29, 15, 4, 'Monday',    '08:00:00', '16:00:00'),
  (30, 15, 4, 'Thursday',  '08:00:00', '16:00:00'),
  (31, 16, 4, 'Wednesday', '08:00:00', '17:00:00'),
  (32, 16, 4, 'Friday',    '08:00:00', '17:00:00'),
  -- Chicago physicians → office 5
  (33, 17, 5, 'Monday',    '08:00:00', '17:00:00'),
  (34, 17, 5, 'Thursday',  '08:00:00', '17:00:00'),
  (35, 18, 5, 'Tuesday',   '09:00:00', '17:00:00'),
  (36, 18, 5, 'Friday',    '09:00:00', '17:00:00'),
  (37, 19, 5, 'Monday',    '08:00:00', '18:00:00'),
  (38, 19, 5, 'Wednesday', '08:00:00', '18:00:00'),
  (39, 20, 5, 'Tuesday',   '08:00:00', '17:00:00'),
  (40, 20, 5, 'Thursday',  '08:00:00', '17:00:00'),
  -- Los Angeles physicians → office 6
  (41, 21, 6, 'Monday',    '08:00:00', '17:00:00'),
  (42, 21, 6, 'Wednesday', '08:00:00', '17:00:00'),
  (43, 22, 6, 'Tuesday',   '09:00:00', '17:00:00'),
  (44, 22, 6, 'Friday',    '09:00:00', '17:00:00'),
  (45, 23, 6, 'Monday',    '10:00:00', '18:00:00'),
  (46, 23, 6, 'Thursday',  '10:00:00', '18:00:00'),
  -- New York physicians → office 7
  (47, 24, 7, 'Monday',    '07:00:00', '19:00:00'),
  (48, 24, 7, 'Thursday',  '07:00:00', '19:00:00'),
  (49, 25, 7, 'Tuesday',   '08:00:00', '17:00:00'),
  (50, 25, 7, 'Friday',    '08:00:00', '17:00:00'),
  (51, 26, 7, 'Wednesday', '08:00:00', '17:00:00'),
  (52, 26, 7, 'Friday',    '08:00:00', '16:00:00');

-- ─── Staff ──────────────────────────────────────────────────

INSERT IGNORE INTO staff (staff_id, first_name, last_name, date_of_birth, department_id, role, hire_date, phone_number, email, shift_start, shift_end) VALUES
  (1, 'Nicole',  'Adams',   '1990-04-12', 1,  'Medical Assistant', '2021-01-10', '(214) 555-0401', 'n.adams@palantirclinic.com',   '08:00:00', '16:00:00'),
  (2, 'Jordan',  'Brooks',  '1988-09-23', 4,  'Billing Specialist','2019-06-15', '(713) 555-0401', 'j.brooks@palantirclinic.com',  '09:00:00', '17:00:00'),
  (3, 'Morgan',  'Taylor',  '1993-02-17', 13, 'Receptionist',      '2020-03-01', '(312) 555-0401', 'm.taylor@palantirclinic.com',  '08:00:00', '16:00:00'),
  (4, 'Casey',   'Rivera',  '1995-07-30', 18, 'Lab Technician',    '2022-05-20', '(213) 555-0401', 'c.rivera@palantirclinic.com',  '07:00:00', '15:00:00');

-- ─── Sample Patients ────────────────────────────────────────

INSERT IGNORE INTO patient (patient_id, first_name, last_name, date_of_birth, phone_number, email, street_address, city, state, zip_code, gender, emergency_contact_name, emergency_contact_phone, primary_physician_id, insurance_id) VALUES
  (1, 'Alex',    'Smith',    '1992-05-14', '(214) 555-1001', 'alex.smith@email.com',    '123 Elm St',      'Dallas',      'TX', '75201', 'Male',   'Jamie Smith',    '(214) 555-1002', 3,  1),
  (2, 'Taylor',  'Jones',    '1985-11-22', '(713) 555-1001', 'taylor.jones@email.com',  '456 Oak Ave',     'Houston',     'TX', '77001', 'Female', 'Chris Jones',    '(713) 555-1002', 5,  2),
  (3, 'Morgan',  'Williams', '1998-03-08', '(512) 555-1001', 'morgan.w@email.com',      '789 Pine Rd',     'Austin',      'TX', '78701', 'Female', 'Sam Williams',   '(512) 555-1002', 9,  3),
  (4, 'Jordan',  'Brown',    '1975-07-19', '(312) 555-1001', 'jordan.brown@email.com',  '321 Maple Blvd',  'Chicago',     'IL', '60601', 'Male',   'Riley Brown',    '(312) 555-1002', 17, 4),
  (5, 'Casey',   'Davis',    '2001-01-30', '(213) 555-1001', 'casey.davis@email.com',   '654 Cedar Lane',  'Los Angeles', 'CA', '90001', 'Female', 'Quinn Davis',    '(213) 555-1002', 21, 5);

-- ─── Sample Appointments ────────────────────────────────────

INSERT IGNORE INTO appointment (appointment_id, patient_id, physician_id, office_id, appointment_date, appointment_time, status_id, booking_method, reason_for_visit) VALUES
  (1, 1, 3,  1, '2026-04-10', '09:00:00', 1, 'online',  'Annual physical exam'),
  (2, 1, 3,  1, '2025-12-05', '10:30:00', 2, 'phone',   'Follow-up on blood pressure'),
  (3, 2, 5,  2, '2026-04-15', '11:00:00', 1, 'online',  'Chest pain evaluation'),
  (4, 2, 5,  2, '2025-11-20', '14:00:00', 2, 'in-person','Routine cardiology check'),
  (5, 3, 9,  3, '2026-04-22', '13:00:00', 1, 'online',  'Headache and dizziness'),
  (6, 4, 17, 5, '2026-05-01', '09:30:00', 1, 'phone',   'Heart palpitations'),
  (7, 5, 21, 6, '2026-04-18', '15:00:00', 1, 'online',  'Skin lesion evaluation');

-- ─── Sample Billing ──────────────────────────────────────────

INSERT IGNORE INTO billing (bill_id, appointment_id, patient_id, insurance_id, total_amount, tax_amount, payment_status, payment_method, payment_date) VALUES
  (1, 2, 1, 1, 150.00, 12.38, 'Paid',   'credit card', '2025-12-06'),
  (2, 4, 2, 2, 250.00, 20.63, 'Paid',   'insurance',   '2025-11-25'),
  (3, 1, 1, 1, 200.00, 16.50, 'Unpaid', NULL,           NULL),
  (4, 3, 2, 2, 350.00, 28.88, 'Unpaid', NULL,           NULL),
  (5, 5, 3, 3, 175.00, 14.44, 'Unpaid', NULL,           NULL);

-- ─── Sample Medical History ──────────────────────────────────

INSERT IGNORE INTO medical_history (medical_history_id, patient_id, `condition`, diagnosis_date, status, notes) VALUES
  (1, 1, 'Hypertension',          '2022-03-10', 'Active',   'Managed with lisinopril 10mg daily'),
  (2, 1, 'Type 2 Diabetes',       '2023-07-15', 'Active',   'Diet-controlled, monitoring A1C quarterly'),
  (3, 2, 'Atrial Fibrillation',   '2021-09-20', 'Active',   'On anticoagulation therapy'),
  (4, 3, 'Migraine',              '2020-05-01', 'Active',   'Triggers: stress and dehydration'),
  (5, 4, 'Coronary Artery Disease','2019-11-30', 'Active',   'Stent placed 2020, on aspirin therapy');

-- ─── Users (login accounts) ──────────────────────────────────
-- Patients log in with email as username
-- Physicians/staff log in with their username

INSERT IGNORE INTO users (user_id, username, password_hash, role, physician_id, staff_id) VALUES
  -- Patient accounts (username = email, password = password123 for demo)
  (1,  'alex.smith@email.com',    'password123', 'patient',   NULL, NULL),
  (2,  'taylor.jones@email.com',  'password123', 'patient',   NULL, NULL),
  (3,  'morgan.w@email.com',      'password123', 'patient',   NULL, NULL),
  (4,  'jordan.brown@email.com',  'password123', 'patient',   NULL, NULL),
  (5,  'casey.davis@email.com',   'password123', 'patient',   NULL, NULL),
  -- Physician accounts
  (6,  'dr.garcia',               'clinic123',   'physician', 1,    NULL),
  (7,  'dr.turner',               'clinic123',   'physician', 2,    NULL),
  (8,  'dr.johnson',              'clinic123',   'physician', 3,    NULL),
  (9,  'dr.white',                'clinic123',   'physician', 5,    NULL),
  (10, 'dr.mitchell',             'clinic123',   'physician', 17,   NULL),
  (11, 'dr.kim',                  'clinic123',   'physician', 21,   NULL),
  -- Staff accounts
  (12, 'staff.adams',             'staff123',    'staff',     NULL, 1),
  (13, 'staff.brooks',            'staff123',    'staff',     NULL, 2),
  (14, 'staff.taylor',            'staff123',    'staff',     NULL, 3);
