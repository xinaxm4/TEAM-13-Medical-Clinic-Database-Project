-- ============================================================
--  Audit Trail Health — Database Triggers
--  Run this file ONCE in the Railway query console or MySQL Workbench.
--  Safe to re-run: uses DROP TRIGGER IF EXISTS first.
-- ============================================================

-- ─── Drop existing triggers first (safe re-run) ─────────────
DROP TRIGGER IF EXISTS after_appointment_completed;
DROP TRIGGER IF EXISTS after_appointment_noshow;

-- ─────────────────────────────────────────────────────────────
-- Trigger 1: Auto-create billing when appointment marked Completed
--
-- Business rule: when a physician marks an appointment Completed,
-- the system automatically calculates the billing record using the
-- patient's insurance coverage — no manual data entry required.
-- ─────────────────────────────────────────────────────────────
DELIMITER $$

CREATE TRIGGER after_appointment_completed
AFTER UPDATE ON appointment
FOR EACH ROW
BEGIN
  -- Only fires when status changes TO Completed (status_id = 2)
  IF NEW.status_id = 2 AND OLD.status_id != 2 THEN

    -- Only insert if no billing row exists yet for this appointment
    IF NOT EXISTS (
      SELECT 1 FROM billing WHERE appointment_id = NEW.appointment_id
    ) THEN

      -- Determine base visit cost by appointment type
      SET @base_cost = CASE NEW.appointment_type
        WHEN 'Physical'   THEN 200.00
        WHEN 'Specialist' THEN 250.00
        WHEN 'Follow-Up'  THEN 125.00
        ELSE 150.00  -- General / default
      END;

      -- Get patient's insurance coverage percentage (0 if uninsured)
      SET @coverage = IFNULL(
        (SELECT i.coverage_percentage
         FROM patient p
         JOIN insurance i ON p.insurance_id = i.insurance_id
         WHERE p.patient_id = NEW.patient_id),
        0
      );

      -- Get insurance_id (NULL if patient is uninsured)
      SET @ins_id = (
        SELECT insurance_id FROM patient WHERE patient_id = NEW.patient_id
      );

      -- Calculate split
      SET @ins_paid = ROUND(@base_cost * (@coverage / 100), 2);
      SET @owed     = ROUND(@base_cost - @ins_paid, 2);

      INSERT INTO billing (
        appointment_id,
        patient_id,
        insurance_id,
        total_amount,
        insurance_paid_amount,
        patient_owed,
        payment_status,
        due_date
      ) VALUES (
        NEW.appointment_id,
        NEW.patient_id,
        @ins_id,
        @base_cost,
        @ins_paid,
        @owed,
        'Unpaid',
        DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      );

    END IF;
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- Trigger 2: Log No-Show to medical_history
--
-- HIPAA-aligned no-show tracking: when an appointment is marked
-- No-Show, an entry is automatically written to the patient's
-- medical history with the date and visit context.
-- ─────────────────────────────────────────────────────────────
DELIMITER $$

CREATE TRIGGER after_appointment_noshow
AFTER UPDATE ON appointment
FOR EACH ROW
BEGIN
  -- Only fires when status changes TO No-Show (status_id = 4)
  IF NEW.status_id = 4 AND OLD.status_id != 4 THEN

    -- Only log if not already logged for this patient on this date
    IF NOT EXISTS (
      SELECT 1 FROM medical_history
      WHERE patient_id     = NEW.patient_id
        AND `condition`    = 'No-Show'
        AND diagnosis_date = NEW.appointment_date
    ) THEN

      INSERT INTO medical_history (
        patient_id,
        physician_id,
        `condition`,
        diagnosis_date,
        status,
        notes
      ) VALUES (
        NEW.patient_id,
        NEW.physician_id,
        'No-Show',
        NEW.appointment_date,
        'Active',
        CONCAT(
          'Patient did not attend scheduled appointment on ',
          DATE_FORMAT(NEW.appointment_date, '%M %d, %Y'),
          '. Reason for visit was: ',
          IFNULL(NEW.reason_for_visit, 'not specified'),
          '.'
        )
      );

    END IF;
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- Trigger 3: Block patient double-booking
--
-- Prevents a patient from booking two appointments at the exact
-- same date and time (even with different physicians).
-- Fires at the DB level — error is returned to the booking UI.
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS before_appointment_double_book;

DELIMITER $$

CREATE TRIGGER before_appointment_double_book
BEFORE INSERT ON appointment
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM appointment
    WHERE patient_id       = NEW.patient_id
      AND appointment_date = NEW.appointment_date
      AND appointment_time = NEW.appointment_time
      AND status_id        != 3  -- ignore Cancelled slots
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Patient already has an appointment at this date and time.';
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- Supporting table: patient_notification
-- Created by Trigger A2 on insurance deactivation. Safe to re-run.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_notification (
  notification_id   INT AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT NOT NULL,
  message           VARCHAR(500) NOT NULL,
  notification_type ENUM('insurance_change','appointment_reminder','general') DEFAULT 'general',
  is_read           BOOLEAN DEFAULT FALSE,
  effective_date    DATE,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- Trigger A: BLOCK insurance deactivation if payer score >= 70
--
-- Composite payer score formula (mirrors the dashboard JS):
--   financial_score   = LEAST( (actual_reimb% / contracted%) * 100, 100 )
--   reliability_score = paid_claims / total_claims * 100
--   completion_rate   = completed_appts / total_appts * 100
--   composite = 0.50 * financial_score
--             + 0.30 * completion_rate
--             + 0.20 * reliability_score
--
-- Score >= 70 → BLOCK: payer is performing well, keep the plan
-- Score <  70 → ALLOW: payer is underperforming, deactivation is justified
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS before_insurance_plan_deactivated;

DELIMITER $$

CREATE TRIGGER before_insurance_plan_deactivated
BEFORE UPDATE ON clinic_accepted_insurance
FOR EACH ROW
BEGIN
  DECLARE v_contracted_rate   DECIMAL(6,2) DEFAULT 0;
  DECLARE v_total_billed      DECIMAL(12,2) DEFAULT 0;
  DECLARE v_total_paid        DECIMAL(12,2) DEFAULT 0;
  DECLARE v_total_claims      INT DEFAULT 0;
  DECLARE v_paid_claims       INT DEFAULT 0;
  DECLARE v_total_appts       INT DEFAULT 0;
  DECLARE v_completed_appts   INT DEFAULT 0;
  DECLARE v_financial_score   DECIMAL(6,2) DEFAULT 0;
  DECLARE v_reliability_score DECIMAL(6,2) DEFAULT 0;
  DECLARE v_completion_rate   DECIMAL(6,2) DEFAULT 0;
  DECLARE v_composite         DECIMAL(6,2) DEFAULT 0;
  DECLARE v_provider_name     VARCHAR(100) DEFAULT '';
  DECLARE v_msg               VARCHAR(512);

  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN

    -- Get contracted rate + provider name
    SELECT coverage_percentage, provider_name
      INTO v_contracted_rate, v_provider_name
      FROM insurance WHERE insurance_id = NEW.insurance_id;

    -- Billing stats for this payer
    SELECT
      IFNULL(SUM(b.total_amount), 0),
      IFNULL(SUM(b.insurance_paid_amount), 0),
      COUNT(b.bill_id),
      SUM(CASE WHEN b.payment_status = 'Paid' THEN 1 ELSE 0 END)
    INTO v_total_billed, v_total_paid, v_total_claims, v_paid_claims
    FROM billing b
    WHERE b.insurance_id = NEW.insurance_id;

    -- Appointment completion rate for patients on this plan
    SELECT
      COUNT(a.appointment_id),
      SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END)
    INTO v_total_appts, v_completed_appts
    FROM patient p
    JOIN appointment a        ON a.patient_id = p.patient_id
    JOIN appointment_status s ON a.status_id  = s.status_id
    WHERE p.insurance_id = NEW.insurance_id;

    -- Financial score: how close actual reimbursement tracks contracted rate
    IF v_total_billed > 0 AND v_contracted_rate > 0 THEN
      SET v_financial_score = LEAST(
        ((v_total_paid / v_total_billed) * 100 / v_contracted_rate) * 100,
        100
      );
    END IF;

    -- Reliability score: % of claims fully paid
    IF v_total_claims > 0 THEN
      SET v_reliability_score = (v_paid_claims / v_total_claims) * 100;
    END IF;

    -- Access score: appointment completion rate
    IF v_total_appts > 0 THEN
      SET v_completion_rate = (v_completed_appts / v_total_appts) * 100;
    END IF;

    -- Composite score (same weights as JS dashboard)
    SET v_composite = (0.50 * v_financial_score)
                    + (0.30 * v_completion_rate)
                    + (0.20 * v_reliability_score);

    -- Block if payer scores >= 70 (performing well — keep the plan)
    IF v_composite >= 70 THEN
      SET v_msg = CONCAT(
        'Cannot deactivate ', LEFT(v_provider_name, 20),
        ': score ', ROUND(v_composite, 1),
        '/100 >= 70. Fin:', ROUND(v_financial_score, 1),
        '% Rel:', ROUND(v_reliability_score, 1),
        '% Comp:', ROUND(v_completion_rate, 1), '%'
      );
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;

  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- Trigger A2: After insurance deactivation approved → notify patients
--
-- Only fires when the BEFORE trigger did NOT block the update
-- (meaning the payer scored < 70 and deactivation was justified).
-- Inserts a 60-day notice for every patient enrolled in this plan.
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS after_insurance_plan_deactivated;

DELIMITER $$

CREATE TRIGGER after_insurance_plan_deactivated
AFTER UPDATE ON clinic_accepted_insurance
FOR EACH ROW
BEGIN
  DECLARE v_provider_name VARCHAR(255);
  DECLARE v_clinic_name   VARCHAR(255);
  DECLARE v_effective_dt  DATE;

  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    SELECT provider_name INTO v_provider_name FROM insurance WHERE insurance_id = NEW.insurance_id;
    SELECT clinic_name   INTO v_clinic_name   FROM clinic    WHERE clinic_id    = NEW.clinic_id;
    SET v_effective_dt = DATE_ADD(CURDATE(), INTERVAL 60 DAY);

    INSERT INTO patient_notification (patient_id, message, notification_type, effective_date)
    SELECT
      p.patient_id,
      CONCAT('Notice: ', v_provider_name,
             ' will no longer be accepted at ', v_clinic_name,
             ' after ', DATE_FORMAT(v_effective_dt, '%M %d, %Y'),
             '. Please contact us to discuss your care options.'),
      'insurance_change',
      v_effective_dt
    FROM patient p
    WHERE p.insurance_id = NEW.insurance_id;
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- Trigger B: Block physician deletion with upcoming appointments
--
-- Prevents removing a physician if they still have future scheduled
-- appointments — admin must reassign or cancel them first.
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS before_physician_delete_check;

DELIMITER $$

CREATE TRIGGER before_physician_delete_check
BEFORE DELETE ON physician
FOR EACH ROW
BEGIN
  DECLARE upcoming_count    INT DEFAULT 0;
  DECLARE total_appts       INT DEFAULT 0;
  DECLARE completed_appts   INT DEFAULT 0;
  DECLARE noshow_appts      INT DEFAULT 0;
  DECLARE completion_rate   DECIMAL(5,1) DEFAULT 0;
  DECLARE noshow_rate       DECIMAL(5,1) DEFAULT 0;
  DECLARE perf_score        INT DEFAULT 0;
  DECLARE v_msg             VARCHAR(512);

  -- Block if they have upcoming scheduled appointments
  SELECT COUNT(*) INTO upcoming_count
  FROM appointment a
  JOIN appointment_status s ON a.status_id = s.status_id
  WHERE a.physician_id      = OLD.physician_id
    AND s.status_name       = 'Scheduled'
    AND a.appointment_date >= CURDATE();

  IF upcoming_count > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot remove this doctor: they still have upcoming patient appointments on their schedule. Please reassign or cancel those visits first.';
  END IF;

  -- Block if they are a high performer (score >= 80 over last 90 days)
  SELECT
    COUNT(a.appointment_id),
    SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END),
    SUM(CASE WHEN s.status_name = 'No-Show'   THEN 1 ELSE 0 END)
  INTO total_appts, completed_appts, noshow_appts
  FROM appointment a
  JOIN appointment_status s ON a.status_id = s.status_id
  WHERE a.physician_id = OLD.physician_id
    AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY);

  IF total_appts > 0 THEN
    SET completion_rate = (completed_appts / total_appts) * 100;
    SET noshow_rate     = (noshow_appts    / total_appts) * 100;
    SET perf_score      = ROUND((completion_rate * 0.70) + (GREATEST(100 - noshow_rate, 0) * 0.30));

    IF perf_score >= 80 THEN
      SET v_msg = CONCAT(
        'Cannot remove Dr. ', OLD.first_name, ' ', OLD.last_name,
        ': their performance score is ', perf_score, '/100, ',
        'which is above the protection threshold of 80. ',
        'High-performing doctors are protected to maintain quality of care.'
      );
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- Trigger C: Block staff deletion when clinic would be understaffed
--
-- Formula: 1 staff member is required per 50 active patients at the
-- clinic (minimum 1). Active patients = distinct patients with any
-- appointment at this clinic's office.
--
-- remaining_after = current staff at clinic − 1
-- required        = GREATEST( CEIL(patient_count / 50), 1 )
-- Block if remaining_after < required
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS before_staff_delete_check;

DELIMITER $$

CREATE TRIGGER before_staff_delete_check
BEFORE DELETE ON staff
FOR EACH ROW
BEGIN
  DECLARE v_clinic_id      INT DEFAULT NULL;
  DECLARE v_remaining      INT DEFAULT 0;
  DECLARE v_patient_count  INT DEFAULT 0;
  DECLARE v_required       INT DEFAULT 1;
  DECLARE v_msg            VARCHAR(512);

  -- Find which clinic this staff member belongs to
  SELECT d.clinic_id INTO v_clinic_id
  FROM department d
  WHERE d.department_id = OLD.department_id
  LIMIT 1;

  IF v_clinic_id IS NOT NULL THEN

    -- How many staff would remain after this deletion
    SELECT COUNT(*) INTO v_remaining
    FROM staff s
    JOIN department d ON s.department_id = d.department_id
    WHERE d.clinic_id = v_clinic_id
      AND s.staff_id != OLD.staff_id;

    -- Active patient count: distinct patients with appointments at this clinic
    SELECT COUNT(DISTINCT a.patient_id) INTO v_patient_count
    FROM appointment a
    JOIN office o ON a.office_id = o.office_id
    WHERE o.clinic_id = v_clinic_id;

    -- Required staff = 1 per 50 patients, minimum 1
    SET v_required = GREATEST(CEIL(v_patient_count / 50), 1);

    IF v_remaining < v_required THEN
      SET v_msg = CONCAT(
        'Cannot delete staff: clinic has ', v_patient_count, ' active patients ',
        'requiring at least ', v_required, ' staff member(s). ',
        'Only ', v_remaining, ' would remain after this deletion.'
      );
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;

  END IF;
END$$

DELIMITER ;
