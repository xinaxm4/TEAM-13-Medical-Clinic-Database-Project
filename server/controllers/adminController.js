const db     = require("../db");
const bcrypt = require("bcryptjs");
const { auditLog } = require("./authController");
const { withAdminScope, GLOBAL_ADMIN_EMAIL } = require("../utils/adminScope");

// ── In-memory rate limiter ──
const loginAttempts = new Map();
function isRateLimited(ip, username) {
  const key = `${ip}:${(username || "").toLowerCase()}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  if (!loginAttempts.has(key)) loginAttempts.set(key, []);
  const attempts = loginAttempts.get(key).filter(t => now - t < windowMs);
  loginAttempts.set(key, attempts);
  if (attempts.length >= 5) return true;
  attempts.push(now);
  loginAttempts.set(key, attempts);
  return false;
}
function clearRateLimit(ip, username) { loginAttempts.delete(`${ip}:${(username || "").toLowerCase()}`); }

/* ─────────────────────────────────────────────
   POST /api/admin/login
───────────────────────────────────────────── */
const loginAdmin = (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  if (isRateLimited(ip, email))
    return res.status(429).json({ message: "Too many login attempts. Please wait 15 minutes." });

  db.query("SELECT * FROM users WHERE email = ? AND role = 'admin'", [email], (err, rows) => {
    if (err) return res.status(500).json({ message: "Something went wrong. Please try again." });
    if (!rows.length) return res.status(401).json({ message: "Invalid email or password" });

    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ message: "Invalid email or password" });

    clearRateLimit(ip, email);
    auditLog(user.user_id, "ADMIN_LOGIN", "user", user.user_id, ip);

    res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        admin_id: user.admin_id || null,
        clinic_id: user.clinic_id || null,
        is_global_admin: user.email === GLOBAL_ADMIN_EMAIL || user.clinic_id == null
      }
    });
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/dashboard
   Returns clinic-wide stats for the overview
───────────────────────────────────────────── */
const getAdminDashboard = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const statsSql = scope.isGlobal ? `
    SELECT
      (SELECT COUNT(*) FROM physician)  AS total_physicians,
      (SELECT COUNT(*) FROM staff)      AS total_staff,
      (SELECT COUNT(*) FROM patient)    AS total_patients,
      (SELECT COUNT(*) FROM appointment WHERE appointment_date >= CURDATE()) AS upcoming_appointments,
      (SELECT IFNULL(SUM(patient_owed),0) FROM billing WHERE payment_status != 'Paid') AS outstanding_revenue,
      (SELECT IFNULL(SUM(total_amount),0) FROM billing) AS total_billed`
  : `
    SELECT
      (SELECT COUNT(*)
         FROM physician ph
         JOIN department d ON ph.department_id = d.department_id
        WHERE d.clinic_id = ?) AS total_physicians,
      (SELECT COUNT(*)
         FROM staff st
         LEFT JOIN department d ON st.department_id = d.department_id
        WHERE COALESCE(st.clinic_id, d.clinic_id) = ?) AS total_staff,
      (SELECT COUNT(*)
         FROM patient pt
         JOIN physician ph ON pt.primary_physician_id = ph.physician_id
         JOIN department d ON ph.department_id = d.department_id
        WHERE d.clinic_id = ?) AS total_patients,
      (SELECT COUNT(*)
         FROM appointment a
         JOIN office o ON a.office_id = o.office_id
        WHERE a.appointment_date >= CURDATE() AND o.clinic_id = ?) AS upcoming_appointments,
      (SELECT IFNULL(SUM(b.patient_owed),0)
         FROM billing b
         JOIN appointment a ON b.appointment_id = a.appointment_id
         JOIN office o ON a.office_id = o.office_id
        WHERE b.payment_status != 'Paid' AND o.clinic_id = ?) AS outstanding_revenue,
      (SELECT IFNULL(SUM(b.total_amount),0)
         FROM billing b
         JOIN appointment a ON b.appointment_id = a.appointment_id
         JOIN office o ON a.office_id = o.office_id
        WHERE o.clinic_id = ?) AS total_billed`;

  const clinicsSql = `
    SELECT c.clinic_id, c.clinic_name, c.city, c.state,
      COUNT(DISTINCT d.department_id) AS departments,
      COUNT(DISTINCT ph.physician_id) AS physicians,
      COUNT(DISTINCT CASE
        WHEN a.appointment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND a.appointment_date <  DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
        THEN a.appointment_id
      END) AS appointments_this_month
    FROM clinic c
    LEFT JOIN department d ON d.clinic_id = c.clinic_id
    LEFT JOIN physician ph ON ph.department_id = d.department_id
    LEFT JOIN office o ON o.clinic_id = c.clinic_id
    LEFT JOIN appointment a ON a.office_id = o.office_id
    ${scope.isGlobal ? "" : "WHERE c.clinic_id = ?"}
    GROUP BY c.clinic_id, c.clinic_name, c.city, c.state
    ORDER BY c.clinic_name`;

  const recentApptSql = `
    SELECT a.appointment_id, a.appointment_date, a.appointment_time,
      CONCAT(pt.first_name,' ',pt.last_name) AS patient_name,
      CONCAT(ph.first_name,' ',ph.last_name) AS physician_name,
      s.status_name, o.city
    FROM appointment a
    JOIN patient pt ON a.patient_id = pt.patient_id
    JOIN physician ph ON a.physician_id = ph.physician_id
    JOIN appointment_status s ON a.status_id = s.status_id
    JOIN office o ON a.office_id = o.office_id
    ${scope.isGlobal ? "" : "WHERE o.clinic_id = ?"}
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
    LIMIT 10`;

  let data = {};
  let done = 0;
  const total = 3;
  function finish() { done++; if (done === total) res.json(data); }

  const statsParams = scope.isGlobal ? [] : Array(6).fill(scope.clinic_id);
  const clinicParams = scope.isGlobal ? [] : [scope.clinic_id];
  const apptParams = scope.isGlobal ? [] : [scope.clinic_id];

  db.query(statsSql, statsParams,      (e, r) => { data.stats        = e ? null : r[0]; finish(); });
  db.query(clinicsSql, clinicParams,   (e, r) => { data.clinics      = e ? []   : r;    finish(); });
  db.query(recentApptSql, apptParams,  (e, r) => { data.recentAppts  = e ? []   : r;    finish(); });
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/clinic-report
   Full report per clinic: appointments, revenue, physicians, staff
───────────────────────────────────────────── */
const getClinicReport = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const sql = `
    SELECT
      c.clinic_id,
      c.clinic_name,
      c.city,
      c.state,
      COUNT(DISTINCT ph.physician_id)   AS total_physicians,
      COUNT(DISTINCT st.staff_id)       AS total_staff,
      COUNT(DISTINCT a.appointment_id)  AS total_appointments,
      SUM(CASE WHEN aps.status_name = 'Completed'  THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN aps.status_name = 'No-Show'    THEN 1 ELSE 0 END) AS no_shows,
      SUM(CASE WHEN aps.status_name = 'Cancelled'  THEN 1 ELSE 0 END) AS cancelled,
      IFNULL(SUM(b.total_amount), 0)    AS total_billed,
      IFNULL(SUM(b.patient_owed), 0)    AS outstanding_balance,
      IFNULL(SUM(CASE WHEN b.payment_status = 'Paid' THEN b.total_amount ELSE 0 END), 0) AS total_collected
    FROM clinic c
    LEFT JOIN office o          ON o.clinic_id      = c.clinic_id
    LEFT JOIN department d      ON d.clinic_id      = c.clinic_id
    LEFT JOIN physician ph      ON ph.department_id = d.department_id
    LEFT JOIN staff st          ON st.department_id = d.department_id
    LEFT JOIN appointment a     ON a.office_id      = o.office_id
    LEFT JOIN appointment_status aps ON a.status_id = aps.status_id
    LEFT JOIN billing b         ON b.appointment_id = a.appointment_id
    ${scope.isGlobal ? "" : "WHERE c.clinic_id = ?"}
    GROUP BY c.clinic_id, c.clinic_name, c.city, c.state
    ORDER BY c.clinic_name`;

  db.query(sql, scope.isGlobal ? [] : [scope.clinic_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Query failed: " + err.message });
    res.json({ clinics: rows });
  });
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/physicians  — list all
───────────────────────────────────────────── */
const getAllPhysicians = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  db.query(
    `SELECT ph.physician_id, ph.first_name, ph.last_name, ph.email,
            ph.phone_number, ph.specialty, ph.physician_type, ph.hire_date,
            d.department_name, c.clinic_name,
            -- Performance stats from last 90 days
            IFNULL(perf.total_appts, 0)     AS total_appts,
            IFNULL(perf.completed, 0)       AS completed_appts,
            IFNULL(perf.no_shows, 0)        AS no_show_appts,
            IFNULL(perf.completion_rate, 0) AS completion_rate,
            -- Performance score: 70% completion rate + 30% no-show avoidance
            ROUND(
              IFNULL(perf.completion_rate, 0) * 0.70 +
              GREATEST(100 - IFNULL(perf.noshow_rate, 0), 0) * 0.30
            , 0) AS performance_score
     FROM physician ph
     LEFT JOIN department d ON ph.department_id = d.department_id
     LEFT JOIN clinic c ON d.clinic_id = c.clinic_id
     LEFT JOIN (
       SELECT a.physician_id,
         COUNT(a.appointment_id) AS total_appts,
         SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN s.status_name = 'No-Show'   THEN 1 ELSE 0 END) AS no_shows,
         ROUND(SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END)
           / NULLIF(COUNT(a.appointment_id), 0) * 100, 1) AS completion_rate,
         ROUND(SUM(CASE WHEN s.status_name = 'No-Show' THEN 1 ELSE 0 END)
           / NULLIF(COUNT(a.appointment_id), 0) * 100, 1) AS noshow_rate
       FROM appointment a
       JOIN appointment_status s ON a.status_id = s.status_id
       WHERE a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
       GROUP BY a.physician_id
     ) perf ON perf.physician_id = ph.physician_id
     ${scope.isGlobal ? "" : "WHERE c.clinic_id = ?"}
     ORDER BY ph.last_name, ph.first_name`,
    scope.isGlobal ? [] : [scope.clinic_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Query failed" });
      res.json(rows);
    }
  );
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/staff-members  — list all
───────────────────────────────────────────── */
const getAllStaff = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  db.query(
    `SELECT st.staff_id, st.first_name, st.last_name, st.email,
            st.phone_number, st.role, st.hire_date, st.shift_start, st.shift_end,
            st.clinic_id, st.department_id, d.department_name,
            c.clinic_name
     FROM staff st
     LEFT JOIN department d ON st.department_id = d.department_id
     LEFT JOIN clinic c ON c.clinic_id = COALESCE(st.clinic_id, d.clinic_id)
     ${scope.isGlobal ? "" : "WHERE COALESCE(st.clinic_id, d.clinic_id) = ?"}
     ORDER BY st.last_name, st.first_name`,
    scope.isGlobal ? [] : [scope.clinic_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Query failed" });
      res.json(rows);
    }
  );
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/departments  — for dropdowns
───────────────────────────────────────────── */
const getDepartments = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  db.query(
    `SELECT d.department_id, d.department_name, c.clinic_id, c.clinic_name
     FROM department d JOIN clinic c ON d.clinic_id = c.clinic_id
     ${scope.isGlobal ? "" : "WHERE c.clinic_id = ?"}
     ORDER BY c.clinic_name, d.department_name`,
    scope.isGlobal ? [] : [scope.clinic_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Query failed" });
      res.json(rows);
    }
  );
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/offices  — for dropdowns
───────────────────────────────────────────── */
const getOffices = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  db.query(
    `SELECT o.office_id, o.city, o.street_address, c.clinic_name
     FROM office o JOIN clinic c ON o.clinic_id = c.clinic_id
     ${scope.isGlobal ? "" : "WHERE c.clinic_id = ?"}
     ORDER BY c.clinic_name, o.city`,
    scope.isGlobal ? [] : [scope.clinic_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Query failed" });
      res.json(rows);
    }
  );
  });
};

/* ─────────────────────────────────────────────
   POST /api/admin/add-physician
   Body: { first_name, last_name, phone_number, specialty,
           physician_type, department_id, hire_date, password,
           schedule: [{ office_id, day_of_week, start_time, end_time }] }
   Email is auto-generated: lastnameNNN@audittrailhealth.com
───────────────────────────────────────────── */

/* Generate a unique lastnameNNN@audittrailhealth.com email */
function generateStaffEmail(lastName, cb) {
  const base = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const tryEmail = () => {
    const num   = Math.floor(100 + Math.random() * 900); // 100–999
    const email = `${base}${num}@audittrailhealth.com`;
    db.query("SELECT user_id FROM users WHERE email = ?", [email], (err, rows) => {
      if (err) return cb(err);
      if (rows.length) return tryEmail(); // collision — try again
      cb(null, email);
    });
  };
  tryEmail();
}

const addPhysician = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const {
    first_name, last_name, phone_number,
    specialty, physician_type, department_id, hire_date,
    password, schedule
  } = req.body;

  if (!first_name || !last_name || !password)
    return res.status(400).json({ message: "first_name, last_name, and password are required" });

  const ensureDepartmentSql = `
    SELECT d.department_id
    FROM department d
    WHERE d.department_id = ?
    ${scope.isGlobal ? "" : "AND d.clinic_id = ?"}`;
  const ensureDeptParams = scope.isGlobal ? [department_id] : [department_id, scope.clinic_id];

  db.query(ensureDepartmentSql, ensureDeptParams, (deptErr, deptRows) => {
    if (deptErr) return res.status(500).json({ message: "Could not validate department." });
    if (!deptRows.length) return res.status(403).json({ message: "Department is outside your clinic scope." });

    const officeIds = Array.isArray(schedule) ? schedule.map(s => s.office_id).filter(Boolean) : [];
    const validateSchedule = (next) => {
      if (!officeIds.length || scope.isGlobal) return next();
      const placeholders = officeIds.map(() => "?").join(",");
      db.query(
        `SELECT office_id FROM office WHERE clinic_id = ? AND office_id IN (${placeholders})`,
        [scope.clinic_id, ...officeIds],
        (offErr, officeRows) => {
          if (offErr) return res.status(500).json({ message: "Could not validate schedule offices." });
          if (officeRows.length !== officeIds.length) {
            return res.status(403).json({ message: "Schedule contains an office outside your clinic scope." });
          }
          next();
        }
      );
    };

    validateSchedule(() => {

  // Auto-generate unique email: lastnameNNN@audittrailhealth.com
  generateStaffEmail(last_name, (genErr, autoEmail) => {
    if (genErr) return res.status(500).json({ message: "Could not generate email" });

    const hash = bcrypt.hashSync(password, 10);

    // Insert user FIRST (physician.email FK references users.email)
    db.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'physician')",
      [autoEmail, hash],
      (uErr, uResult) => {
        if (uErr) return res.status(500).json({ message: "Could not create user account: " + uErr.message });

        const user_id = uResult.insertId;

        const phSql = `INSERT INTO physician
          (first_name, last_name, email, phone_number, specialty, physician_type, department_id, hire_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(phSql, [
          first_name, last_name, autoEmail, phone_number || null,
          specialty || null, physician_type || "primary",
          department_id || null, hire_date || null
        ], (phErr, phResult) => {
          if (phErr) {
            db.query("DELETE FROM users WHERE user_id = ?", [user_id], () => {});
            return res.status(500).json({ message: "Could not insert physician: " + phErr.message });
          }

          const physician_id = phResult.insertId;

          // Link physician_id back to the user row
          db.query("UPDATE users SET physician_id = ? WHERE user_id = ?", [physician_id, user_id], () => {});

          if (schedule && schedule.length > 0) {
            const schSql = "INSERT IGNORE INTO work_schedule (physician_id, office_id, day_of_week, start_time, end_time) VALUES ?";
            const schVals = schedule.map(s => [physician_id, s.office_id, s.day_of_week, s.start_time, s.end_time]);
            db.query(schSql, [schVals], () => {});
          }

          res.status(201).json({ message: "Physician added successfully", physician_id, email: autoEmail });
        });
      }
    );
  });
    });
  });
  });
};

/* ─────────────────────────────────────────────
   POST /api/admin/add-staff
   Body: { first_name, last_name, phone_number, role,
           department_id, hire_date, shift_start, shift_end, password }
   Email is auto-generated: lastnameNNN@audittrailhealth.com
───────────────────────────────────────────── */
const addStaff = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const {
    first_name, last_name, phone_number,
    role, department_id, clinic_id, hire_date,
    shift_start, shift_end, password
  } = req.body;

  if (!first_name || !last_name || !password)
    return res.status(400).json({ message: "first_name, last_name, and password are required" });

  const resolvedClinicId = scope.isGlobal ? (clinic_id || null) : scope.clinic_id;
  const deptSql = `
    SELECT d.department_id
    FROM department d
    WHERE d.department_id = ?
    ${resolvedClinicId ? "AND d.clinic_id = ?" : ""}`;
  const deptParams = resolvedClinicId ? [department_id, resolvedClinicId] : [department_id];

  db.query(deptSql, deptParams, (deptErr, deptRows) => {
    if (deptErr) return res.status(500).json({ message: "Could not validate department." });
    if (!deptRows.length) return res.status(403).json({ message: "Department is outside your clinic scope." });

  generateStaffEmail(last_name, (genErr, autoEmail) => {
    if (genErr) return res.status(500).json({ message: "Could not generate email" });

    const hash = bcrypt.hashSync(password, 10);

    // Insert user FIRST (staff.email FK references users.email)
    db.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'staff')",
      [autoEmail, hash],
      (uErr, uResult) => {
        if (uErr) return res.status(500).json({ message: "Could not create user account: " + uErr.message });

        const user_id = uResult.insertId;

        const stSql = `INSERT INTO staff
          (first_name, last_name, email, phone_number, role, department_id, clinic_id, hire_date, shift_start, shift_end)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(stSql, [
          first_name, last_name, autoEmail, phone_number || null,
          role || "Receptionist", department_id || null, resolvedClinicId,
          hire_date || null, shift_start || null, shift_end || null
        ], (stErr, stResult) => {
          if (stErr) {
            db.query("DELETE FROM users WHERE user_id = ?", [user_id], () => {});
            return res.status(500).json({ message: "Could not insert staff: " + stErr.message });
          }

          const staff_id = stResult.insertId;

          // Link staff_id back to the user row
          db.query("UPDATE users SET staff_id = ? WHERE user_id = ?", [staff_id, user_id], () => {});

          res.status(201).json({ message: "Staff member added successfully", staff_id, email: autoEmail });
        });
      }
    );
  });
  });
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/insurance/scorecard
   Returns Query A (financial) + Query B (outcomes) merged per payer.
   The frontend computes the composite score from this data.
───────────────────────────────────────────── */
const getPayerScorecard = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const financialSql = `
    SELECT
      ins.insurance_id,
      ins.provider_name,
      ins.coverage_percentage                                                  AS contracted_rate,
      ROUND(SUM(b.insurance_paid_amount) / NULLIF(SUM(b.total_amount),0) * 100, 1) AS actual_rate,
      COUNT(b.bill_id)                                                         AS total_claims,
      IFNULL(SUM(b.total_amount), 0)                                           AS total_billed,
      IFNULL(SUM(b.insurance_paid_amount), 0)                                  AS total_paid,
      IFNULL(SUM(b.patient_owed), 0)                                           AS total_outstanding,
      SUM(CASE WHEN b.payment_status = 'Paid'  THEN 1 ELSE 0 END)             AS paid_claims,
      SUM(CASE WHEN b.payment_status != 'Paid' THEN 1 ELSE 0 END)             AS unpaid_claims
    FROM insurance ins
    LEFT JOIN billing b ON ins.insurance_id = b.insurance_id
    LEFT JOIN appointment a ON b.appointment_id = a.appointment_id
    LEFT JOIN office o ON a.office_id = o.office_id
    ${scope.isGlobal ? "" : "WHERE o.clinic_id = ? OR o.clinic_id IS NULL"}
    GROUP BY ins.insurance_id, ins.provider_name, ins.coverage_percentage
    ORDER BY ins.provider_name`;

  const outcomesSql = `
    SELECT
      ins.insurance_id,
      COUNT(DISTINCT p.patient_id)                                              AS total_patients,
      COUNT(a.appointment_id)                                                   AS total_appointments,
      SUM(CASE WHEN s.status_name = 'Completed'  THEN 1 ELSE 0 END)            AS completed,
      SUM(CASE WHEN s.status_name = 'No-Show'    THEN 1 ELSE 0 END)            AS no_shows,
      SUM(CASE WHEN s.status_name = 'Cancelled'  THEN 1 ELSE 0 END)            AS cancelled,
      ROUND(
        SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(a.appointment_id), 0) * 100, 1
      )                                                                         AS completion_rate_pct
    FROM insurance ins
    LEFT JOIN patient p ON p.insurance_id = ins.insurance_id
    LEFT JOIN appointment a ON a.patient_id = p.patient_id
    LEFT JOIN office o ON a.office_id = o.office_id
    LEFT JOIN appointment_status s ON a.status_id = s.status_id
    ${scope.isGlobal ? "" : "WHERE o.clinic_id = ? OR o.clinic_id IS NULL"}
    GROUP BY ins.insurance_id
    ORDER BY ins.insurance_id`;

  let financial = null, outcomes = null;

  const scopeParams = scope.isGlobal ? [] : [scope.clinic_id];
  db.query(financialSql, scopeParams, (e1, r1) => {
    if (e1) return res.status(500).json({ message: "Something went wrong. Please try again." });
    financial = r1;
    if (outcomes !== null) mergeAndRespond();
  });

  db.query(outcomesSql, scopeParams, (e2, r2) => {
    if (e2) return res.status(500).json({ message: "Something went wrong. Please try again." });
    outcomes = r2;
    if (financial !== null) mergeAndRespond();
  });

  function mergeAndRespond() {
    const outcomesMap = {};
    outcomes.forEach(o => { outcomesMap[o.insurance_id] = o; });
    const merged = financial.map(f => ({
      ...f,
      ...(outcomesMap[f.insurance_id] || {
        total_patients: 0, total_appointments: 0,
        completed: 0, no_shows: 0, cancelled: 0, completion_rate_pct: 0
      })
    }));
    res.json(merged);
  }
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/insurance/accepted
   Returns all clinic_accepted_insurance rows with clinic + insurance names.
───────────────────────────────────────────── */
const getAcceptedInsurance = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const sql = `
    SELECT cai.id, cai.clinic_id, c.clinic_name,
           ins.insurance_id, ins.provider_name, ins.coverage_percentage,
           cai.reimbursement_threshold_pct, cai.min_participation_rate,
           cai.is_active, cai.effective_date, cai.removed_date, cai.removal_reason
    FROM clinic_accepted_insurance cai
    JOIN clinic c      ON cai.clinic_id    = c.clinic_id
    JOIN insurance ins ON cai.insurance_id = ins.insurance_id
    ${scope.isGlobal ? "" : "WHERE cai.clinic_id = ?"}
    ORDER BY c.clinic_name, ins.provider_name`;

  db.query(sql, scope.isGlobal ? [] : [scope.clinic_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Something went wrong. Please try again." });
    res.json(rows);
  });
  });
};

/* ─────────────────────────────────────────────
   POST /api/admin/insurance/accept
   Body: { clinic_id, insurance_id, reimbursement_threshold_pct,
           min_participation_rate, effective_date, notes, user_id }
───────────────────────────────────────────── */
const addAcceptedInsurance = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const {
    clinic_id, insurance_id,
    reimbursement_threshold_pct, min_participation_rate,
    effective_date, user_id
  } = req.body;

  const resolvedClinicId = scope.isGlobal ? clinic_id : scope.clinic_id;
  if (!resolvedClinicId || !insurance_id || !reimbursement_threshold_pct)
    return res.status(400).json({ message: "clinic_id, insurance_id, and reimbursement_threshold_pct are required" });

  const sql = `
    INSERT INTO clinic_accepted_insurance
      (clinic_id, insurance_id, is_active, reimbursement_threshold_pct,
       min_participation_rate, effective_date, added_by)
    VALUES (?, ?, TRUE, ?, ?, ?, ?)`;

  db.query(sql, [
    resolvedClinicId, insurance_id,
    reimbursement_threshold_pct,
    min_participation_rate || 75.00,
    effective_date || null,
    user_id || null
  ], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res.status(409).json({ message: "This insurance plan is already accepted at that clinic." });
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
    res.status(201).json({ message: "Insurance plan added successfully", id: result.insertId });
  });
  });
};

/* ─────────────────────────────────────────────
   PUT /api/admin/insurance/:id/deactivate
   Body: { removal_reason, user_id }
───────────────────────────────────────────── */
const deactivateInsurance = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const { id } = req.params;
  const { removal_reason, user_id } = req.body;

  if (!removal_reason || !removal_reason.trim())
    return res.status(400).json({ message: "A removal reason is required." });

  db.query(
    `UPDATE clinic_accepted_insurance
     SET is_active = FALSE, removed_date = CURDATE(),
         removal_reason = ?, removed_by = ?
     WHERE id = ? ${scope.isGlobal ? "" : "AND clinic_id = ?"}`,
    scope.isGlobal
      ? [removal_reason.trim(), user_id || null, id]
      : [removal_reason.trim(), user_id || null, id, scope.clinic_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.sqlMessage || err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Record not found." });
      res.json({ message: "Insurance plan deactivated." });
    }
  );
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/insurance/alerts
   Returns unread payer_alert rows with insurance name.
───────────────────────────────────────────── */
const getPayerAlerts = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const sql = `
    SELECT pa.alert_id, pa.alert_type, pa.alert_message,
           pa.triggered_at, pa.is_read, pa.clinic_id,
           ins.provider_name, c.clinic_name
    FROM payer_alert pa
    JOIN insurance ins ON pa.insurance_id = ins.insurance_id
    LEFT JOIN clinic c ON pa.clinic_id = c.clinic_id
    WHERE pa.is_read = FALSE
    ${scope.isGlobal ? "" : "AND pa.clinic_id = ?"}
    ORDER BY pa.triggered_at DESC
    LIMIT 20`;

  db.query(sql, scope.isGlobal ? [] : [scope.clinic_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Something went wrong. Please try again." });
    res.json(rows);
  });
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/insurance/payer-detail?insurance_id=X
   Per-payer detail for the analytics charts:
     stats    – aggregate KPIs
     trend    – monthly avg reimbursement (last 8 months)
     scatter  – individual billing rows
     bar      – monthly paid/unpaid counts
───────────────────────────────────────────── */
const getPayerDetail = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const insId = parseInt(req.query.insurance_id);
  if (!insId) return res.status(400).json({ message: "insurance_id is required" });

  const statsSql = `
    SELECT
      ins.insurance_id,
      ins.provider_name,
      ins.coverage_percentage                                                     AS contracted_rate,
      COUNT(b.bill_id)                                                            AS total_claims,
      COUNT(DISTINCT b.patient_id)                                                AS total_patients,
      ROUND(AVG(CASE WHEN b.total_amount > 0
                     THEN b.insurance_paid_amount / b.total_amount * 100 END), 1) AS avg_reimb_pct,
      IFNULL(SUM(b.total_amount), 0)                                              AS total_billed,
      IFNULL(SUM(b.insurance_paid_amount), 0)                                     AS total_paid,
      SUM(CASE WHEN b.payment_status = 'Paid'  THEN 1 ELSE 0 END)                AS paid_claims,
      SUM(CASE WHEN b.payment_status != 'Paid' THEN 1 ELSE 0 END)                AS unpaid_claims,
      SUM(CASE WHEN b.due_date < CURDATE()
               AND b.payment_status != 'Paid'  THEN 1 ELSE 0 END)                AS overdue_claims
    FROM insurance ins
    LEFT JOIN billing b ON ins.insurance_id = b.insurance_id
    LEFT JOIN appointment a ON b.appointment_id = a.appointment_id
    LEFT JOIN office o ON a.office_id = o.office_id
    WHERE ins.insurance_id = ?
    ${scope.isGlobal ? "" : "AND (o.clinic_id = ? OR o.clinic_id IS NULL)"}
    GROUP BY ins.insurance_id, ins.provider_name, ins.coverage_percentage`;

  const trendSql = `
    SELECT
      DATE_FORMAT(a.appointment_date, '%Y-%m')   AS month,
      DATE_FORMAT(a.appointment_date, '%b %Y')   AS month_label,
      ROUND(AVG(CASE WHEN b.total_amount > 0
                     THEN b.insurance_paid_amount / b.total_amount * 100 END), 1) AS avg_reimb_pct,
      COUNT(b.bill_id)                                                             AS claim_count
    FROM billing b
    JOIN appointment a ON b.appointment_id = a.appointment_id
    JOIN office o ON a.office_id = o.office_id
    WHERE b.insurance_id = ?
    ${scope.isGlobal ? "" : "AND o.clinic_id = ?"}
    GROUP BY DATE_FORMAT(a.appointment_date, '%Y-%m'),
             DATE_FORMAT(a.appointment_date, '%b %Y')
    ORDER BY month`;

  const scatterSql = `
    SELECT
      DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS date_str,
      ROUND(CASE WHEN b.total_amount > 0
                 THEN b.insurance_paid_amount / b.total_amount * 100 ELSE 0 END, 1) AS reimb_pct,
      b.total_amount,
      b.payment_status,
      IFNULL(a.appointment_type, 'General') AS appointment_type
    FROM billing b
    JOIN appointment a ON b.appointment_id = a.appointment_id
    JOIN office o ON a.office_id = o.office_id
    WHERE b.insurance_id = ?
    ${scope.isGlobal ? "" : "AND o.clinic_id = ?"}
    ORDER BY a.appointment_date`;

  const barSql = `
    SELECT
      DATE_FORMAT(a.appointment_date, '%Y-%m')   AS month,
      DATE_FORMAT(a.appointment_date, '%b %Y')   AS month_label,
      b.payment_status,
      COUNT(*)                                    AS cnt
    FROM billing b
    JOIN appointment a ON b.appointment_id = a.appointment_id
    JOIN office o ON a.office_id = o.office_id
    WHERE b.insurance_id = ?
    ${scope.isGlobal ? "" : "AND o.clinic_id = ?"}
    GROUP BY DATE_FORMAT(a.appointment_date, '%Y-%m'),
             DATE_FORMAT(a.appointment_date, '%b %Y'),
             b.payment_status
    ORDER BY month`;

  let out = {}, left = 4;
  const done = () => { if (--left === 0) res.json(out); };
  const bail = () => res.status(500).json({ message: "Something went wrong. Please try again." });

  const payerParams = scope.isGlobal ? [insId] : [insId, scope.clinic_id];
  db.query(statsSql,   payerParams, (e, r) => { if (e) return bail(); out.stats   = r[0] || {}; done(); });
  db.query(trendSql,   payerParams, (e, r) => { if (e) return bail(); out.trend   = r;           done(); });
  db.query(scatterSql, payerParams, (e, r) => { if (e) return bail(); out.scatter = r;           done(); });
  db.query(barSql,     payerParams, (e, r) => { if (e) return bail(); out.bar     = r;           done(); });
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/insurance/overview
   Cross-payer analytics for the admin dashboard.
   Uses existing schema only:
     billing, patient, appointment, appointment_status,
     insurance, clinic_accepted_insurance
───────────────────────────────────────────── */
const getInsuranceOverview = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const summarySql = `
    SELECT
      (SELECT COUNT(DISTINCT cai.insurance_id)
         FROM clinic_accepted_insurance cai
        WHERE cai.is_active = TRUE
          ${scope.isGlobal ? "" : "AND cai.clinic_id = ?"})                       AS active_payers,
      (SELECT ROUND(AVG(CASE WHEN b.total_amount > 0
                             THEN b.insurance_paid_amount / b.total_amount * 100 END), 1)
         FROM billing b
         JOIN appointment a ON b.appointment_id = a.appointment_id
         JOIN office o ON a.office_id = o.office_id
        WHERE b.insurance_id IS NOT NULL
          ${scope.isGlobal ? "" : "AND o.clinic_id = ?"})                         AS avg_reimbursement_pct,
      (SELECT ROUND(
                SUM(CASE WHEN b.payment_status = 'Paid' THEN 0 ELSE 1 END)
                / NULLIF(COUNT(b.bill_id), 0) * 100, 1)
         FROM billing b
         JOIN appointment a ON b.appointment_id = a.appointment_id
         JOIN office o ON a.office_id = o.office_id
        WHERE b.insurance_id IS NOT NULL
          ${scope.isGlobal ? "" : "AND o.clinic_id = ?"})                         AS unpaid_claim_rate,
      (SELECT COUNT(*)
         FROM patient p
         JOIN physician ph ON p.primary_physician_id = ph.physician_id
         JOIN department d ON ph.department_id = d.department_id
        WHERE p.insurance_id IS NOT NULL
          ${scope.isGlobal ? "" : "AND d.clinic_id = ?"})                         AS covered_patients`;

  const payerPerformanceSql = `
    SELECT
      ins.insurance_id,
      ins.provider_name,
      ROUND(AVG(CASE WHEN b.total_amount > 0
                     THEN b.insurance_paid_amount / b.total_amount * 100 END), 1) AS actual_reimb_pct,
      ROUND(AVG(CASE WHEN cai.is_active = TRUE
                     THEN cai.reimbursement_threshold_pct END), 1)                 AS threshold_pct,
      COUNT(b.bill_id)                                                             AS total_claims
    FROM insurance ins
    LEFT JOIN billing b ON b.insurance_id = ins.insurance_id
    LEFT JOIN appointment a ON b.appointment_id = a.appointment_id
    LEFT JOIN office o ON a.office_id = o.office_id
    LEFT JOIN clinic_accepted_insurance cai ON cai.insurance_id = ins.insurance_id
      ${scope.isGlobal ? "" : "AND cai.clinic_id = ?"}
    ${scope.isGlobal ? "" : "WHERE o.clinic_id = ? OR o.clinic_id IS NULL OR cai.clinic_id = ?"}
    GROUP BY ins.insurance_id, ins.provider_name
    HAVING COUNT(b.bill_id) > 0 OR threshold_pct IS NOT NULL
    ORDER BY ins.provider_name`;

  const payerStatusSql = `
    SELECT
      ins.insurance_id,
      ins.provider_name,
      SUM(CASE WHEN b.payment_status = 'Paid' THEN 1 ELSE 0 END)   AS paid_claims,
      SUM(CASE WHEN b.payment_status = 'Paid' THEN 0 ELSE 1 END)   AS unpaid_claims
    FROM insurance ins
    LEFT JOIN billing b ON b.insurance_id = ins.insurance_id
    LEFT JOIN appointment a ON b.appointment_id = a.appointment_id
    LEFT JOIN office o ON a.office_id = o.office_id
    ${scope.isGlobal ? "" : "WHERE o.clinic_id = ? OR o.clinic_id IS NULL"}
    GROUP BY ins.insurance_id, ins.provider_name
    HAVING COUNT(b.bill_id) > 0
    ORDER BY ins.provider_name`;

  const volumeSql = `
    SELECT
      DATE_FORMAT(a.appointment_date, '%Y-%m') AS month,
      DATE_FORMAT(a.appointment_date, '%b %Y') AS month_label,
      ins.insurance_id,
      ins.provider_name,
      COUNT(*) AS completed_visits
    FROM appointment a
    JOIN patient p ON p.patient_id = a.patient_id
    JOIN insurance ins ON ins.insurance_id = p.insurance_id
    JOIN appointment_status aps ON aps.status_id = a.status_id
    WHERE aps.status_name = 'Completed'
      AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      ${scope.isGlobal ? "" : "AND EXISTS (SELECT 1 FROM office o2 WHERE o2.office_id = a.office_id AND o2.clinic_id = ?)"}
    GROUP BY DATE_FORMAT(a.appointment_date, '%Y-%m'),
             DATE_FORMAT(a.appointment_date, '%b %Y'),
             ins.insurance_id, ins.provider_name
    ORDER BY month, ins.provider_name`;

  const procedureSql = `
    SELECT
      t.appointment_type,
      t.provider_name,
      ROUND(t.avg_reimb_pct, 1) AS avg_reimb_pct
    FROM (
      SELECT
        a.appointment_type,
        ins.provider_name,
        AVG(CASE WHEN b.total_amount > 0
                 THEN b.insurance_paid_amount / b.total_amount * 100 END) AS avg_reimb_pct,
        COUNT(*) AS claim_count
      FROM billing b
      JOIN appointment a ON a.appointment_id = b.appointment_id
      JOIN insurance ins ON ins.insurance_id = b.insurance_id
      WHERE a.appointment_type IS NOT NULL
        AND a.appointment_type <> ''
        ${scope.isGlobal ? "" : "AND EXISTS (SELECT 1 FROM office o WHERE o.office_id = a.office_id AND o.clinic_id = ?)"}
      GROUP BY a.appointment_type, ins.provider_name
    ) t
    JOIN (
      SELECT a.appointment_type
      FROM billing b
      JOIN appointment a ON a.appointment_id = b.appointment_id
      WHERE a.appointment_type IS NOT NULL
        AND a.appointment_type <> ''
        ${scope.isGlobal ? "" : "AND EXISTS (SELECT 1 FROM office o WHERE o.office_id = a.office_id AND o.clinic_id = ?)"}
      GROUP BY a.appointment_type
      ORDER BY COUNT(*) DESC, a.appointment_type
      LIMIT 4
    ) top_types ON top_types.appointment_type = t.appointment_type
    ORDER BY t.appointment_type, t.provider_name`;

  let out = {}, left = 5, sent = false;
  const done = () => { if (!sent && --left === 0) res.json(out); };
  const bail = () => {
    if (sent) return;
    sent = true;
    res.status(500).json({ message: "Something went wrong. Please try again." });
  };

  const fourScope = scope.isGlobal ? [] : Array(4).fill(scope.clinic_id);
  const perfScope = scope.isGlobal ? [] : [scope.clinic_id, scope.clinic_id, scope.clinic_id];
  db.query(summarySql,          fourScope, (e, r) => { if (e) return bail(); out.summary          = r[0] || {}; done(); });
  db.query(payerPerformanceSql, perfScope, (e, r) => { if (e) return bail(); out.payerPerformance = r || [];   done(); });
  db.query(payerStatusSql,      scope.isGlobal ? [] : [scope.clinic_id], (e, r) => { if (e) return bail(); out.payerStatus      = r || [];   done(); });
  db.query(volumeSql,           scope.isGlobal ? [] : [scope.clinic_id], (e, r) => { if (e) return bail(); out.volumeTrend      = r || [];   done(); });
  db.query(procedureSql,        scope.isGlobal ? [] : [scope.clinic_id, scope.clinic_id], (e, r) => { if (e) return bail(); out.procedureMix     = r || [];   done(); });
  });
};

/* ─────────────────────────────────────────────
   PUT /api/admin/physician/:id  — edit
───────────────────────────────────────────── */
const editPhysician = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, specialty, physician_type, department_id, hire_date } = req.body;
  if (!first_name || !last_name)
    return res.status(400).json({ message: "First name and last name are required." });

  db.query(
    `SELECT ph.physician_id
     FROM physician ph
     LEFT JOIN department d ON ph.department_id = d.department_id
     WHERE ph.physician_id = ?
     ${scope.isGlobal ? "" : "AND d.clinic_id = ?"}`,
    scope.isGlobal ? [id] : [id, scope.clinic_id],
    (checkErr, checkRows) => {
      if (checkErr) return res.status(500).json({ message: "Could not validate physician." });
      if (!checkRows.length) return res.status(404).json({ message: "Physician not found." });

      db.query(
        `UPDATE physician SET first_name=?, last_name=?, phone_number=?, specialty=?,
                physician_type=?, department_id=?, hire_date=? WHERE physician_id=?`,
        [first_name, last_name, phone_number || null, specialty || null,
         physician_type || "primary", department_id || null, hire_date || null, id],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Could not update physician: " + err.message });
          if (result.affectedRows === 0) return res.status(404).json({ message: "Physician not found." });
          res.json({ message: "Physician updated successfully." });
        }
      );
    }
  );
  });
};

/* ─────────────────────────────────────────────
   DELETE /api/admin/physician/:id
───────────────────────────────────────────── */
const deletePhysician = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const { id } = req.params;
  // Get email to also delete from users
  db.query(
    `SELECT ph.email
     FROM physician ph
     LEFT JOIN department d ON ph.department_id = d.department_id
     WHERE ph.physician_id = ?
     ${scope.isGlobal ? "" : "AND d.clinic_id = ?"}`,
    scope.isGlobal ? [id] : [id, scope.clinic_id],
    (e, rows) => {
    if (e || !rows.length) return res.status(404).json({ message: "Physician not found." });
    const email = rows[0].email;
    db.query("DELETE FROM physician WHERE physician_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: err.sqlMessage || err.message });
      if (email) db.query("DELETE FROM users WHERE email = ?", [email], () => {});
      res.json({ message: "Physician deleted." });
    });
  });
  });
};

/* ─────────────────────────────────────────────
   PUT /api/admin/staff/:id  — edit
───────────────────────────────────────────── */
const editStaff = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, role, department_id, clinic_id, hire_date, shift_start, shift_end } = req.body;
  if (!first_name || !last_name)
    return res.status(400).json({ message: "First name and last name are required." });

  const resolvedClinicId = scope.isGlobal ? (clinic_id || null) : scope.clinic_id;
  db.query(
    `UPDATE staff
     LEFT JOIN department d ON staff.department_id = d.department_id
     SET staff.first_name=?, staff.last_name=?, staff.phone_number=?, staff.role=?,
         staff.department_id=?, staff.clinic_id=?, staff.hire_date=?, staff.shift_start=?, staff.shift_end=?
     WHERE staff.staff_id=? ${scope.isGlobal ? "" : "AND COALESCE(staff.clinic_id, d.clinic_id) = ?"}`,
    scope.isGlobal
      ? [first_name, last_name, phone_number || null, role || "Receptionist",
         department_id || null, resolvedClinicId, hire_date || null, shift_start || null, shift_end || null, id]
      : [first_name, last_name, phone_number || null, role || "Receptionist",
         department_id || null, resolvedClinicId, hire_date || null, shift_start || null, shift_end || null, id, scope.clinic_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Could not update staff: " + err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Staff not found." });
      res.json({ message: "Staff updated successfully." });
    }
  );
  });
};

/* ─────────────────────────────────────────────
   DELETE /api/admin/staff/:id
───────────────────────────────────────────── */
const deleteStaff = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const { id } = req.params;
  db.query(
    `SELECT staff.email
     FROM staff
     LEFT JOIN department d ON staff.department_id = d.department_id
     WHERE staff.staff_id = ? ${scope.isGlobal ? "" : "AND COALESCE(staff.clinic_id, d.clinic_id) = ?"}`,
    scope.isGlobal ? [id] : [id, scope.clinic_id],
    (e, rows) => {
    if (e || !rows.length) return res.status(404).json({ message: "Staff not found." });
    const email = rows[0].email;
    db.query("DELETE FROM staff WHERE staff_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: err.sqlMessage || err.message });
      if (email) db.query("DELETE FROM users WHERE email = ?", [email], () => {});
      res.json({ message: "Staff member deleted." });
    });
  });
  });
};

/* ─────────────────────────────────────────────
   PUT /api/admin/insurance/alerts/:id/read
───────────────────────────────────────────── */
const markAlertRead = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const { id } = req.params;
  db.query(
    `UPDATE payer_alert SET is_read = TRUE
     WHERE alert_id = ? ${scope.isGlobal ? "" : "AND clinic_id = ?"}`,
    scope.isGlobal ? [id] : [id, scope.clinic_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Something went wrong. Please try again." });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Alert not found." });
      res.json({ message: "Alert dismissed." });
    }
  );
  });
};

/* ─────────────────────────────────────────────
   GET /api/admin/staff/:id/termination-check
   Formula: min_staff = MAX(2, CEIL(patients / 10))
            can_fire  = (current_staff - 1) >= min_staff
───────────────────────────────────────────── */
const checkTerminationEligibility = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const staffId = parseInt(req.params.id);
  if (!staffId) return res.status(400).json({ message: 'staff_id required' });

  const clinicSql = `SELECT COALESCE(s.clinic_id, d.clinic_id) AS clinic_id
    FROM staff s
    LEFT JOIN department d ON s.department_id = d.department_id
    WHERE s.staff_id = ?`;

  db.query(clinicSql, [staffId], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows.length) return res.status(404).json({ message: 'Staff not found' });
    const clinicId = rows[0].clinic_id;
    if (!scope.isGlobal && clinicId !== scope.clinic_id) {
      return res.status(403).json({ message: "Staff member is outside your clinic scope." });
    }

    const statsSql = `SELECT
      (SELECT COUNT(*) FROM staff s2 LEFT JOIN department d2 ON s2.department_id=d2.department_id
        WHERE COALESCE(s2.clinic_id, d2.clinic_id)=?) AS current_staff,
      (SELECT COUNT(*) FROM patient pt JOIN physician ph ON pt.primary_physician_id=ph.physician_id
        JOIN department dp ON ph.department_id=dp.department_id WHERE dp.clinic_id=?) AS clinic_patients`;

    db.query(statsSql, [clinicId, clinicId], (err2, stats) => {
      if (err2) return res.status(500).json({ message: err2.message });
      const { current_staff, clinic_patients } = stats[0];
      const min_staff = Math.max(2, Math.ceil(clinic_patients / 10));
      const can_fire  = (current_staff - 1) >= min_staff;
      res.json({ can_fire, current_staff, clinic_patients, min_staff,
        reason: can_fire ? null :
          `Cannot terminate: clinic would drop to ${current_staff - 1} staff (minimum is ${min_staff} for ${clinic_patients} patients).`
      });
    });
  });
  });
};

/* ─────────────────────────────────────────────
   DELETE /api/admin/staff/:id/terminate
───────────────────────────────────────────── */
const terminateStaff = (req, res) => {
  withAdminScope(db, req, res, (scope) => {
  const staffId = parseInt(req.params.id);
  if (!staffId) return res.status(400).json({ message: 'staff_id required' });

  const lookupSql = `SELECT s.staff_id, u.user_id, COALESCE(s.clinic_id, d.clinic_id) AS clinic_id
    FROM staff s LEFT JOIN department d ON s.department_id=d.department_id
    LEFT JOIN users u ON u.staff_id=s.staff_id WHERE s.staff_id=?`;

  db.query(lookupSql, [staffId], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows.length) return res.status(404).json({ message: 'Staff not found' });
    const { user_id, clinic_id } = rows[0];
    if (!scope.isGlobal && clinic_id !== scope.clinic_id) {
      return res.status(403).json({ message: "Staff member is outside your clinic scope." });
    }

    const statsSql = `SELECT
      (SELECT COUNT(*) FROM staff s2 LEFT JOIN department d2 ON s2.department_id=d2.department_id
        WHERE COALESCE(s2.clinic_id, d2.clinic_id)=?) AS current_staff,
      (SELECT COUNT(*) FROM patient pt JOIN physician ph ON pt.primary_physician_id=ph.physician_id
        JOIN department dp ON ph.department_id=dp.department_id WHERE dp.clinic_id=?) AS clinic_patients`;

    db.query(statsSql, [clinic_id, clinic_id], (err2, stats) => {
      if (err2) return res.status(500).json({ message: err2.message });
      const { current_staff, clinic_patients } = stats[0];
      const min_staff = Math.max(2, Math.ceil(clinic_patients / 10));
      if ((current_staff - 1) < min_staff)
        return res.status(403).json({ message: `Cannot terminate: would drop to ${current_staff - 1} staff (min ${min_staff}).` });

      db.query('DELETE FROM users WHERE staff_id=?', [staffId], (err3) => {
        if (err3) return res.status(500).json({ message: err3.message });
        db.query('DELETE FROM staff WHERE staff_id=?', [staffId], (err4) => {
          if (err4) return res.status(500).json({ message: err4.message });
          res.json({ message: 'Staff member terminated successfully.' });
        });
      });
    });
  });
  });
};

module.exports = {
  loginAdmin, getAdminDashboard, getClinicReport,
  getAllPhysicians, getAllStaff, getDepartments, getOffices,
  addPhysician, addStaff, editPhysician, deletePhysician, editStaff, deleteStaff,
  getPayerScorecard, getPayerDetail, getInsuranceOverview, getAcceptedInsurance, addAcceptedInsurance,
  deactivateInsurance, getPayerAlerts, markAlertRead,
  checkTerminationEligibility, terminateStaff
};
