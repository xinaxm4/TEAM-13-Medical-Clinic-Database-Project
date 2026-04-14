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
