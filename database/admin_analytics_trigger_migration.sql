-- ============================================================
-- Audit Trail Health — Admin Analytics Trigger Migration
-- Purpose:
--   Adds the extra schema needed for staff/admin analytics and
--   creates triggers/events that align with the current project
--   schema instead of the earlier draft-only column names.
--
-- Run order:
--   1. Team_13_Medical_Clinic_DB.sql
--   2. seed.sql
--   3. triggers.sql
--   4. THIS FILE
--
-- Notes:
--   - Written for MySQL 8.x
--   - Event scheduler must be enabled for scheduled events:
--       SET GLOBAL event_scheduler = ON;
--   - This file avoids changing existing app behavior where possible.
--   - Existing core triggers are left intact; these are additive.
-- ============================================================

USE team_13_medical_clinic_db;

-- ============================================================
-- SECTION 1: SCHEMA ADDITIONS
-- ============================================================

-- Staff analytics fields
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS composite_score DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS improvement_plan_status
    ENUM('none','open','in_progress','formal_review','closed')
    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS improvement_plan_opened_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role_criticality TINYINT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS peer_feedback_score DECIMAL(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS credential_type VARCHAR(80) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS credential_expiry_date DATE DEFAULT NULL;

-- Physician/network fields
ALTER TABLE physician
  ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS in_network TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS insurance_id INT DEFAULT NULL;

-- Clinic staffing config
ALTER TABLE clinic
  ADD COLUMN IF NOT EXISTS provider_ratio_max DECIMAL(5,2) NOT NULL DEFAULT 20.00;

-- Appointment fields useful for future staff analytics
ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS staff_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS patient_feedback DECIMAL(3,2) DEFAULT NULL;

-- Billing fields for claims/admin analytics
ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS claim_status ENUM('paid','denied','pending') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS denial_code VARCHAR(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS staff_id INT DEFAULT NULL;

-- Insurance defaults used by triggers; clinic-specific terms still live
-- in clinic_accepted_insurance and remain the preferred contract source.
ALTER TABLE insurance
  ADD COLUMN IF NOT EXISTS min_network_pct DECIMAL(5,4) NOT NULL DEFAULT 0.7000,
  ADD COLUMN IF NOT EXISTS target_network_pct DECIMAL(5,4) NOT NULL DEFAULT 0.7500;

-- Department role minimums should be relational, not JSON, so triggers can
-- compare one role at a time safely.
CREATE TABLE IF NOT EXISTS department_role_minimum (
  department_role_minimum_id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  role_name VARCHAR(50) NOT NULL,
  min_required INT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_department_role_minimum (department_id, role_name),
  CONSTRAINT fk_department_role_minimum_department
    FOREIGN KEY (department_id) REFERENCES department(department_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Staff scheduling table for overtime/capacity style analytics.
CREATE TABLE IF NOT EXISTS staff_schedule (
  staff_schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  department_id INT NOT NULL,
  office_id INT DEFAULT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity_per_shift INT NOT NULL DEFAULT 20,
  hours_worked DECIMAL(5,2) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_schedule (staff_id, shift_date, start_time),
  CONSTRAINT fk_staff_schedule_staff
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_staff_schedule_department
    FOREIGN KEY (department_id) REFERENCES department(department_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_staff_schedule_office
    FOREIGN KEY (office_id) REFERENCES office(office_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Notification inbox for admin dashboard alert panels
CREATE TABLE IF NOT EXISTS admin_notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  notification_type VARCHAR(60) NOT NULL,
  related_table VARCHAR(40) NOT NULL,
  related_id INT NOT NULL,
  message TEXT NOT NULL,
  severity ENUM('info','warning','critical') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  resolved_by INT DEFAULT NULL
) ENGINE=InnoDB;

-- Note compliance tracker for 48-hour unsigned-note alerts
CREATE TABLE IF NOT EXISTS note_compliance_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  physician_id INT DEFAULT NULL,
  completed_at DATETIME NOT NULL,
  note_due_by DATETIME NOT NULL,
  note_signed TINYINT(1) NOT NULL DEFAULT 0,
  signed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_note_compliance_log_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_note_compliance_log_physician
    FOREIGN KEY (physician_id) REFERENCES physician(physician_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Proper access-log table instead of overloading users
CREATE TABLE IF NOT EXISTS ehr_access_log (
  access_log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  patient_id INT NOT NULL,
  action_type VARCHAR(40) NOT NULL,
  accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  physician_id INT DEFAULT NULL,
  staff_id INT DEFAULT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  CONSTRAINT fk_ehr_access_log_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ehr_access_log_patient
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ehr_access_log_physician
    FOREIGN KEY (physician_id) REFERENCES physician(physician_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_ehr_access_log_staff
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- SECTION 2: INITIAL DATA BACKFILL
-- ============================================================

-- Existing staff and physicians are active by default.
UPDATE staff
SET active = 1
WHERE active IS NULL;

UPDATE physician
SET active = 1,
    in_network = COALESCE(in_network, 1)
WHERE active IS NULL OR in_network IS NULL;

-- Reasonable default criticality by role; adjust manually later if desired.
UPDATE staff
SET role_criticality = CASE
  WHEN role IN ('Nurse', 'Nurse Practitioner', 'NP', 'Med Asst', 'Medical Assistant') THEN 8
  WHEN role IN ('Billing') THEN 5
  WHEN role IN ('Scheduler', 'Front Desk', 'Receptionist') THEN 4
  ELSE COALESCE(role_criticality, 5)
END
WHERE role_criticality IS NULL OR role_criticality = 5;

-- Seed composite score demo values only where blank so the staff-review
-- triggers and admin analytics have immediate non-null data to work with.
UPDATE staff
SET composite_score = CASE
  WHEN role IN ('Billing') THEN 68.00
  WHEN role IN ('Scheduler', 'Front Desk', 'Receptionist') THEN 74.00
  WHEN role IN ('Nurse', 'Nurse Practitioner', 'NP', 'Med Asst', 'Medical Assistant') THEN 79.00
  ELSE 72.00
END
WHERE composite_score IS NULL;

UPDATE staff
SET peer_feedback_score = COALESCE(peer_feedback_score, 4.20),
    improvement_plan_status = CASE
      WHEN composite_score < 45 THEN 'formal_review'
      WHEN composite_score < 60 THEN 'open'
      ELSE 'none'
    END,
    improvement_plan_opened_date = CASE
      WHEN composite_score < 60 AND improvement_plan_opened_date IS NULL THEN CURDATE()
      ELSE improvement_plan_opened_date
    END
WHERE 1 = 1;

-- Populate claim_status from existing payment_status.
UPDATE billing
SET claim_status = CASE
  WHEN payment_status = 'Paid' THEN 'paid'
  WHEN due_date IS NOT NULL AND due_date < CURDATE() THEN 'denied'
  ELSE 'pending'
END
WHERE claim_status IS NULL OR claim_status = 'pending';

-- Default created_at for old billing rows if missing.
UPDATE billing
SET created_at = COALESCE(
  created_at,
  CASE
    WHEN payment_date IS NOT NULL THEN CONCAT(payment_date, ' 12:00:00')
    ELSE CONCAT(CURDATE(), ' 12:00:00')
  END
);

-- Backfill physician.insurance_id to a clinic-accepted plan when available.
-- This is a simplified single-primary-network field for dashboard purposes.
UPDATE physician ph
JOIN department d ON d.department_id = ph.department_id
LEFT JOIN clinic_accepted_insurance cai
  ON cai.clinic_id = d.clinic_id AND cai.is_active = TRUE
SET ph.insurance_id = COALESCE(
  ph.insurance_id,
  (
    SELECT cai2.insurance_id
    FROM clinic_accepted_insurance cai2
    WHERE cai2.clinic_id = d.clinic_id
      AND cai2.is_active = TRUE
    ORDER BY cai2.insurance_id
    LIMIT 1
  )
)
WHERE ph.department_id IS NOT NULL;

-- Seed department role minimums from existing headcount.
INSERT INTO department_role_minimum (department_id, role_name, min_required)
SELECT
  s.department_id,
  s.role,
  GREATEST(COUNT(*) - 1, 1) AS min_required
FROM staff s
WHERE s.department_id IS NOT NULL
  AND s.role IS NOT NULL
GROUP BY s.department_id, s.role
ON DUPLICATE KEY UPDATE min_required = VALUES(min_required);

-- Optional starter staff_schedule rows for the next 5 weekdays so the
-- staffing/overtime triggers have immediate data to work against.
WITH RECURSIVE next_days AS (
  SELECT CURDATE() AS shift_date
  UNION ALL
  SELECT DATE_ADD(shift_date, INTERVAL 1 DAY)
  FROM next_days
  WHERE shift_date < DATE_ADD(CURDATE(), INTERVAL 4 DAY)
)
INSERT IGNORE INTO staff_schedule (
  staff_id, department_id, office_id, shift_date, start_time, end_time, capacity_per_shift, hours_worked
)
SELECT
  s.staff_id,
  s.department_id,
  (
    SELECT o.office_id
    FROM department d
    JOIN office o ON o.clinic_id = d.clinic_id
    WHERE d.department_id = s.department_id
    ORDER BY o.office_id
    LIMIT 1
  ) AS office_id,
  nd.shift_date,
  COALESCE(s.shift_start, '08:00:00'),
  COALESCE(s.shift_end, '16:00:00'),
  20,
  ROUND(TIMESTAMPDIFF(MINUTE, COALESCE(s.shift_start, '08:00:00'), COALESCE(s.shift_end, '16:00:00')) / 60, 2)
FROM staff s
JOIN next_days nd
WHERE s.active = 1
  AND s.department_id IS NOT NULL;

-- ============================================================
-- SECTION 3: DROP/RECREATE NEW TRIGGERS & EVENTS
-- ============================================================

DROP TRIGGER IF EXISTS trg_staff_score_policy;
DROP TRIGGER IF EXISTS trg_staff_score_notify;
DROP TRIGGER IF EXISTS trg_staff_reduction_coverage_check;
DROP TRIGGER IF EXISTS trg_appointment_completed_note_check;
DROP TRIGGER IF EXISTS trg_staff_schedule_overtime_insert;
DROP TRIGGER IF EXISTS trg_staff_schedule_overtime_update;
DROP TRIGGER IF EXISTS trg_billing_underpayment_admin;
DROP TRIGGER IF EXISTS trg_billing_charge_lag;
DROP TRIGGER IF EXISTS trg_network_participation_check;
DROP TRIGGER IF EXISTS trg_appointment_noshow_rate;
DROP TRIGGER IF EXISTS trg_appointment_to_medical_history;
DROP TRIGGER IF EXISTS trg_ehr_access_anomaly;
DROP TRIGGER IF EXISTS trg_referral_validate;

DROP EVENT IF EXISTS evt_unsigned_note_escalation;
DROP EVENT IF EXISTS evt_insurance_unpaid_rate_check;
DROP EVENT IF EXISTS evt_credential_expiry_check;

DELIMITER $$

-- ============================================================
-- SECTION 4: STAFF PERFORMANCE TRIGGERS
-- ============================================================

-- 4A. Normalize improvement-plan state before the row is saved.
CREATE TRIGGER trg_staff_score_policy
BEFORE UPDATE ON staff
FOR EACH ROW
BEGIN
  IF NEW.composite_score IS NOT NULL THEN
    IF NEW.composite_score < 45 THEN
      SET NEW.improvement_plan_status = 'formal_review';
      IF OLD.improvement_plan_opened_date IS NULL THEN
        SET NEW.improvement_plan_opened_date = CURDATE();
      END IF;
    ELSEIF NEW.composite_score < 60 THEN
      IF OLD.improvement_plan_status IN ('none', 'closed') THEN
        SET NEW.improvement_plan_status = 'open';
      END IF;
      IF OLD.improvement_plan_opened_date IS NULL THEN
        SET NEW.improvement_plan_opened_date = CURDATE();
      END IF;
    ELSEIF NEW.composite_score >= 60 AND OLD.improvement_plan_status = 'none' THEN
      SET NEW.improvement_plan_status = 'none';
    END IF;
  END IF;
END$$

-- 4B. Notify admin when the score crosses key thresholds.
CREATE TRIGGER trg_staff_score_notify
AFTER UPDATE ON staff
FOR EACH ROW
BEGIN
  IF NEW.composite_score IS NOT NULL AND OLD.composite_score IS NOT NULL THEN
    IF NEW.composite_score < 60 AND OLD.composite_score >= 60 THEN
      INSERT INTO admin_notifications (
        notification_type, related_table, related_id, message, severity, created_at
      ) VALUES (
        'staff_score_low',
        'staff',
        NEW.staff_id,
        CONCAT(
          'Staff member ', COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, ''),
          ' dropped below the improvement threshold with a score of ',
          ROUND(NEW.composite_score, 1), '.'
        ),
        'warning',
        NOW()
      );
    END IF;

    IF NEW.composite_score < 45 AND OLD.composite_score >= 45 THEN
      INSERT INTO admin_notifications (
        notification_type, related_table, related_id, message, severity, created_at
      ) VALUES (
        'staff_score_critical',
        'staff',
        NEW.staff_id,
        CONCAT(
          'Staff member ', COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, ''),
          ' is now at ', ROUND(NEW.composite_score, 1),
          ' and requires formal review.'
        ),
        'critical',
        NOW()
      );
    END IF;
  END IF;
END$$

-- 4C. Block deactivation when it would drop a role below minimum.
CREATE TRIGGER trg_staff_reduction_coverage_check
BEFORE UPDATE ON staff
FOR EACH ROW
BEGIN
  DECLARE remaining_count INT DEFAULT 0;
  DECLARE min_required INT DEFAULT 0;

  IF NEW.active = 0 AND OLD.active = 1 THEN
    SELECT COUNT(*)
    INTO remaining_count
    FROM staff
    WHERE department_id = OLD.department_id
      AND role = OLD.role
      AND active = 1
      AND staff_id <> OLD.staff_id;

    SELECT COALESCE(drm.min_required, 0)
    INTO min_required
    FROM department_role_minimum drm
    WHERE drm.department_id = OLD.department_id
      AND drm.role_name = OLD.role
    LIMIT 1;

    IF remaining_count < min_required THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot deactivate staff member: remaining active headcount would fall below the department minimum for this role.';
    END IF;
  END IF;
END$$

-- 4D. Queue 48-hour note compliance checks when an appointment completes.
CREATE TRIGGER trg_appointment_completed_note_check
AFTER UPDATE ON appointment
FOR EACH ROW
BEGIN
  IF NEW.status_id = 2 AND OLD.status_id <> 2 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM note_compliance_log ncl
      WHERE ncl.appointment_id = NEW.appointment_id
    ) THEN
      INSERT INTO note_compliance_log (
        appointment_id, physician_id, completed_at, note_due_by, note_signed, created_at
      ) VALUES (
        NEW.appointment_id,
        NEW.physician_id,
        NOW(),
        DATE_ADD(NOW(), INTERVAL 48 HOUR),
        0,
        NOW()
      );
    END IF;
  END IF;
END$$

-- 4E. Flag overtime after insert into staff_schedule.
CREATE TRIGGER trg_staff_schedule_overtime_insert
AFTER INSERT ON staff_schedule
FOR EACH ROW
BEGIN
  DECLARE daily_hours DECIMAL(6,2) DEFAULT 0;

  SELECT COALESCE(SUM(COALESCE(hours_worked, TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60)), 0)
  INTO daily_hours
  FROM staff_schedule
  WHERE staff_id = NEW.staff_id
    AND shift_date = NEW.shift_date;

  IF daily_hours > 8 THEN
    INSERT INTO admin_notifications (
      notification_type, related_table, related_id, message, severity, created_at
    ) VALUES (
      'overtime_flagged',
      'staff_schedule',
      NEW.staff_schedule_id,
      CONCAT(
        'Staff #', NEW.staff_id, ' is scheduled for ',
        ROUND(daily_hours, 2), ' hours on ', DATE_FORMAT(NEW.shift_date, '%Y-%m-%d'),
        ', which exceeds the 8-hour threshold.'
      ),
      'info',
      NOW()
    );
  END IF;
END$$

-- 4F. Re-check overtime on update too.
CREATE TRIGGER trg_staff_schedule_overtime_update
AFTER UPDATE ON staff_schedule
FOR EACH ROW
BEGIN
  DECLARE daily_hours DECIMAL(6,2) DEFAULT 0;

  SELECT COALESCE(SUM(COALESCE(hours_worked, TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60)), 0)
  INTO daily_hours
  FROM staff_schedule
  WHERE staff_id = NEW.staff_id
    AND shift_date = NEW.shift_date;

  IF daily_hours > 8 THEN
    INSERT INTO admin_notifications (
      notification_type, related_table, related_id, message, severity, created_at
    ) VALUES (
      'overtime_flagged',
      'staff_schedule',
      NEW.staff_schedule_id,
      CONCAT(
        'Staff #', NEW.staff_id, ' is scheduled for ',
        ROUND(daily_hours, 2), ' hours on ', DATE_FORMAT(NEW.shift_date, '%Y-%m-%d'),
        ', which exceeds the 8-hour threshold.'
      ),
      'info',
      NOW()
    );
  END IF;
END$$

-- ============================================================
-- SECTION 5: INSURANCE & BILLING TRIGGERS
-- ============================================================

-- 5A. Flag billing rows that reimburse below the clinic contract threshold.
CREATE TRIGGER trg_billing_underpayment_admin
AFTER INSERT ON billing
FOR EACH ROW
BEGIN
  DECLARE contract_threshold DECIMAL(5,2) DEFAULT NULL;
  DECLARE clinic_name_val VARCHAR(100) DEFAULT NULL;
  DECLARE payer_name_val VARCHAR(100) DEFAULT NULL;
  DECLARE actual_pct DECIMAL(6,2) DEFAULT 0.00;

  IF NEW.insurance_id IS NOT NULL AND NEW.total_amount IS NOT NULL AND NEW.total_amount > 0 THEN
    SET actual_pct = ROUND((COALESCE(NEW.insurance_paid_amount, 0) / NEW.total_amount) * 100, 2);

    SELECT cai.reimbursement_threshold_pct, c.clinic_name, ins.provider_name
    INTO contract_threshold, clinic_name_val, payer_name_val
    FROM appointment a
    JOIN office o ON o.office_id = a.office_id
    JOIN clinic c ON c.clinic_id = o.clinic_id
    JOIN clinic_accepted_insurance cai
      ON cai.clinic_id = c.clinic_id
     AND cai.insurance_id = NEW.insurance_id
     AND cai.is_active = TRUE
    JOIN insurance ins ON ins.insurance_id = NEW.insurance_id
    WHERE a.appointment_id = NEW.appointment_id
    LIMIT 1;

    IF contract_threshold IS NOT NULL AND actual_pct < contract_threshold THEN
      INSERT INTO admin_notifications (
        notification_type, related_table, related_id, message, severity, created_at
      ) VALUES (
        'billing_underpayment',
        'billing',
        NEW.bill_id,
        CONCAT(
          payer_name_val, ' reimbursed ', actual_pct, '% for bill #', NEW.bill_id,
          ' at ', clinic_name_val,
          ', below the contracted threshold of ', contract_threshold, '%.'
        ),
        'warning',
        NOW()
      );
    END IF;
  END IF;
END$$

-- 5B. Flag charge-entry lag.
CREATE TRIGGER trg_billing_charge_lag
AFTER INSERT ON billing
FOR EACH ROW
BEGIN
  DECLARE appt_date DATE DEFAULT NULL;
  DECLARE lag_days INT DEFAULT 0;

  SELECT appointment_date
  INTO appt_date
  FROM appointment
  WHERE appointment_id = NEW.appointment_id
  LIMIT 1;

  IF appt_date IS NOT NULL THEN
    SET lag_days = DATEDIFF(DATE(NEW.created_at), appt_date);

    IF lag_days > 2 THEN
      INSERT INTO admin_notifications (
        notification_type, related_table, related_id, message, severity, created_at
      ) VALUES (
        'charge_entry_lag',
        'billing',
        NEW.bill_id,
        CONCAT(
          'Bill #', NEW.bill_id, ' was entered ',
          lag_days, ' day(s) after the appointment date.'
        ),
        CASE WHEN lag_days > 4 THEN 'critical' ELSE 'warning' END,
        NOW()
      );
    END IF;
  END IF;
END$$

-- 5C. Flag network participation changes using simplified physician-insurance assignment.
CREATE TRIGGER trg_network_participation_check
AFTER UPDATE ON physician
FOR EACH ROW
BEGIN
  DECLARE total_physicians INT DEFAULT 0;
  DECLARE in_network_count INT DEFAULT 0;
  DECLARE participation_rate DECIMAL(6,4) DEFAULT 0.0000;
  DECLARE min_pct DECIMAL(6,4) DEFAULT 0.7000;
  DECLARE target_pct DECIMAL(6,4) DEFAULT 0.7500;
  DECLARE payer_name_val VARCHAR(100) DEFAULT NULL;

  IF (COALESCE(NEW.in_network, 0) <> COALESCE(OLD.in_network, 0))
     OR (COALESCE(NEW.insurance_id, 0) <> COALESCE(OLD.insurance_id, 0))
     OR (COALESCE(NEW.active, 0) <> COALESCE(OLD.active, 0)) THEN

    IF NEW.insurance_id IS NOT NULL THEN
      SELECT COUNT(*)
      INTO total_physicians
      FROM physician
      WHERE active = 1;

      SELECT COUNT(*)
      INTO in_network_count
      FROM physician
      WHERE active = 1
        AND insurance_id = NEW.insurance_id
        AND in_network = 1;

      IF total_physicians > 0 THEN
        SET participation_rate = in_network_count / total_physicians;
      END IF;

      SELECT provider_name, min_network_pct, target_network_pct
      INTO payer_name_val, min_pct, target_pct
      FROM insurance
      WHERE insurance_id = NEW.insurance_id
      LIMIT 1;

      IF participation_rate < min_pct THEN
        INSERT INTO admin_notifications (
          notification_type, related_table, related_id, message, severity, created_at
        ) VALUES (
          'network_below_minimum',
          'insurance',
          NEW.insurance_id,
          CONCAT(
            payer_name_val, ' network participation is now ',
            ROUND(participation_rate * 100, 1), '%, below the ',
            ROUND(min_pct * 100, 1), '% minimum.'
          ),
          'critical',
          NOW()
        );
      ELSEIF participation_rate < target_pct THEN
        INSERT INTO admin_notifications (
          notification_type, related_table, related_id, message, severity, created_at
        ) VALUES (
          'network_borderline',
          'insurance',
          NEW.insurance_id,
          CONCAT(
            payer_name_val, ' network participation is ',
            ROUND(participation_rate * 100, 1), '%, below the ',
            ROUND(target_pct * 100, 1), '% target.'
          ),
          'warning',
          NOW()
        );
      END IF;
    END IF;
  END IF;
END$$

-- ============================================================
-- SECTION 6: APPOINTMENT / PATIENT TRIGGERS
-- ============================================================

-- 6A. Flag high physician no-show rate for the current month.
CREATE TRIGGER trg_appointment_noshow_rate
AFTER UPDATE ON appointment
FOR EACH ROW
BEGIN
  DECLARE total_appts INT DEFAULT 0;
  DECLARE noshow_count INT DEFAULT 0;
  DECLARE noshow_rate DECIMAL(6,4) DEFAULT 0.0000;

  IF NEW.status_id = 4 AND OLD.status_id <> 4 THEN
    SELECT COUNT(*)
    INTO total_appts
    FROM appointment
    WHERE physician_id = NEW.physician_id
      AND appointment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01');

    SELECT COUNT(*)
    INTO noshow_count
    FROM appointment
    WHERE physician_id = NEW.physician_id
      AND status_id = 4
      AND appointment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01');

    IF total_appts > 0 THEN
      SET noshow_rate = noshow_count / total_appts;
    END IF;

    IF noshow_rate > 0.10 THEN
      INSERT INTO admin_notifications (
        notification_type, related_table, related_id, message, severity, created_at
      ) VALUES (
        'noshow_rate_high',
        'physician',
        NEW.physician_id,
        CONCAT(
          'Physician #', NEW.physician_id,
          ' has a no-show rate of ',
          ROUND(noshow_rate * 100, 1),
          '% for the current month.'
        ),
        'warning',
        NOW()
      );
    END IF;
  END IF;
END$$

-- 6B. Auto-log appointment completion to medical history without requiring
-- extra columns that do not exist in the current schema.
CREATE TRIGGER trg_appointment_to_medical_history
AFTER UPDATE ON appointment
FOR EACH ROW
BEGIN
  IF NEW.status_id = 2 AND OLD.status_id <> 2 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM medical_history
      WHERE patient_id = NEW.patient_id
        AND physician_id = NEW.physician_id
        AND `condition` = 'Visit Completed'
        AND diagnosis_date = NEW.appointment_date
    ) THEN
      INSERT INTO medical_history (
        patient_id, physician_id, `condition`, diagnosis_date, status, notes
      ) VALUES (
        NEW.patient_id,
        NEW.physician_id,
        'Visit Completed',
        NEW.appointment_date,
        'Resolved',
        CONCAT(
          'Appointment marked completed. Type: ',
          COALESCE(NEW.appointment_type, 'General'),
          '. Reason: ',
          COALESCE(NEW.reason_for_visit, 'not specified'),
          '.'
        )
      );
    END IF;
  END IF;
END$$

-- ============================================================
-- SECTION 7: COMPLIANCE TRIGGERS
-- ============================================================

-- 7A. HIPAA access anomaly detection using ehr_access_log.
CREATE TRIGGER trg_ehr_access_anomaly
AFTER INSERT ON ehr_access_log
FOR EACH ROW
BEGIN
  DECLARE has_valid_appt INT DEFAULT 0;

  IF NEW.action_type = 'chart_access' THEN
    SELECT COUNT(*)
    INTO has_valid_appt
    FROM appointment a
    WHERE a.patient_id = NEW.patient_id
      AND a.appointment_date = DATE(NEW.accessed_at)
      AND a.status_id IN (1, 2)
      AND (
        (NEW.physician_id IS NOT NULL AND a.physician_id = NEW.physician_id)
        OR NEW.staff_id IS NOT NULL
      );

    IF has_valid_appt = 0 THEN
      INSERT INTO admin_notifications (
        notification_type, related_table, related_id, message, severity, created_at
      ) VALUES (
        'hipaa_access_anomaly',
        'ehr_access_log',
        NEW.access_log_id,
        CONCAT(
          'User #', NEW.user_id,
          ' accessed patient #', NEW.patient_id,
          ' without a matching scheduled/completed appointment on ',
          DATE_FORMAT(NEW.accessed_at, '%Y-%m-%d'),
          '.'
        ),
        'critical',
        NOW()
      );
    END IF;
  END IF;
END$$

-- ============================================================
-- SECTION 8: REFERRAL VALIDATION TRIGGER
-- ============================================================

-- Validates against the current referral schema:
--   referral.patient_id
--   referral.specialist_id
--   patient.insurance_id
--   specialist physician -> department -> clinic
CREATE TRIGGER trg_referral_validate
BEFORE INSERT ON referral
FOR EACH ROW
BEGIN
  DECLARE specialist_active INT DEFAULT 0;
  DECLARE patient_insurance_id INT DEFAULT NULL;
  DECLARE specialist_clinic_id INT DEFAULT NULL;
  DECLARE accepted_count INT DEFAULT 0;

  SELECT COUNT(*)
  INTO specialist_active
  FROM physician
  WHERE physician_id = NEW.specialist_id
    AND active = 1;

  IF specialist_active = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Referral rejected: specialist is not active in the system.';
  END IF;

  SELECT p.insurance_id
  INTO patient_insurance_id
  FROM patient p
  WHERE p.patient_id = NEW.patient_id
  LIMIT 1;

  IF patient_insurance_id IS NOT NULL THEN
    SELECT d.clinic_id
    INTO specialist_clinic_id
    FROM physician ph
    JOIN department d ON d.department_id = ph.department_id
    WHERE ph.physician_id = NEW.specialist_id
    LIMIT 1;

    SELECT COUNT(*)
    INTO accepted_count
    FROM clinic_accepted_insurance cai
    WHERE cai.clinic_id = specialist_clinic_id
      AND cai.insurance_id = patient_insurance_id
      AND cai.is_active = TRUE;

    IF accepted_count = 0 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Referral rejected: the patient insurance plan is not currently accepted by the specialist clinic.';
    END IF;
  END IF;
END$$

-- ============================================================
-- SECTION 9: SCHEDULED EVENTS
-- ============================================================

-- 9A. Escalate unsigned notes once they pass 48 hours.
CREATE EVENT evt_unsigned_note_escalation
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
  INSERT INTO admin_notifications (
    notification_type, related_table, related_id, message, severity, created_at
  )
  SELECT
    'unsigned_note_overdue',
    'note_compliance_log',
    ncl.log_id,
    CONCAT(
      'Appointment #', ncl.appointment_id,
      ' still has no signed note after the 48-hour deadline.'
    ),
    'warning',
    NOW()
  FROM note_compliance_log ncl
  WHERE ncl.note_signed = 0
    AND ncl.note_due_by < NOW()
    AND NOT EXISTS (
      SELECT 1
      FROM admin_notifications an
      WHERE an.related_table = 'note_compliance_log'
        AND an.related_id = ncl.log_id
        AND an.notification_type = 'unsigned_note_overdue'
    );
END$$

-- 9B. Check monthly unpaid/denied claim rate per payer.
-- If you later start setting billing.claim_status more precisely, this
-- event becomes more meaningful immediately.
CREATE EVENT evt_insurance_unpaid_rate_check
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 5 MINUTE
DO
BEGIN
  INSERT INTO admin_notifications (
    notification_type, related_table, related_id, message, severity, created_at
  )
  SELECT
    'claim_rate_high',
    'insurance',
    b.insurance_id,
    CONCAT(
      ins.provider_name, ' has ',
      ROUND(SUM(CASE WHEN b.claim_status IN ('denied', 'pending') THEN 1 ELSE 0 END) / COUNT(*) * 100, 1),
      '% pending/denied claims this month.'
    ),
    'warning',
    NOW()
  FROM billing b
  JOIN insurance ins ON ins.insurance_id = b.insurance_id
  WHERE b.insurance_id IS NOT NULL
    AND DATE(b.created_at) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
  GROUP BY b.insurance_id, ins.provider_name
  HAVING SUM(CASE WHEN b.claim_status IN ('denied', 'pending') THEN 1 ELSE 0 END) / COUNT(*) > 0.10
     AND NOT EXISTS (
       SELECT 1
       FROM admin_notifications an
       WHERE an.related_table = 'insurance'
         AND an.related_id = b.insurance_id
         AND an.notification_type = 'claim_rate_high'
         AND an.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
     );
END$$

-- 9C. Credential expiry reminders.
CREATE EVENT evt_credential_expiry_check
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 10 MINUTE
DO
BEGIN
  INSERT INTO admin_notifications (
    notification_type, related_table, related_id, message, severity, created_at
  )
  SELECT
    'credential_expiring_30d',
    'staff',
    s.staff_id,
    CONCAT(
      COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, ''),
      ' has a ', COALESCE(s.credential_type, 'credential'),
      ' expiring on ', DATE_FORMAT(s.credential_expiry_date, '%Y-%m-%d'),
      ' (', DATEDIFF(s.credential_expiry_date, CURDATE()), ' day(s) left).'
    ),
    'warning',
    NOW()
  FROM staff s
  WHERE s.active = 1
    AND s.credential_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    AND NOT EXISTS (
      SELECT 1
      FROM admin_notifications an
      WHERE an.related_table = 'staff'
        AND an.related_id = s.staff_id
        AND an.notification_type = 'credential_expiring_30d'
        AND DATE(an.created_at) = CURDATE()
    );

  INSERT INTO admin_notifications (
    notification_type, related_table, related_id, message, severity, created_at
  )
  SELECT
    'credential_expiring_7d',
    'staff',
    s.staff_id,
    CONCAT(
      'Urgent: ',
      COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, ''),
      ' has a ', COALESCE(s.credential_type, 'credential'),
      ' expiring in ', DATEDIFF(s.credential_expiry_date, CURDATE()), ' day(s).'
    ),
    'critical',
    NOW()
  FROM staff s
  WHERE s.active = 1
    AND s.credential_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    AND NOT EXISTS (
      SELECT 1
      FROM admin_notifications an
      WHERE an.related_table = 'staff'
        AND an.related_id = s.staff_id
        AND an.notification_type = 'credential_expiring_7d'
        AND DATE(an.created_at) = CURDATE()
    );
END$$

DELIMITER ;

-- ============================================================
-- END OF FILE
-- ============================================================
