const db     = require("../db");
const bcrypt = require("bcryptjs");
const { auditLog } = require("./authController");

// ── In-memory rate limiter — keyed by IP + username ──
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
   Staff / Physician Login
   POST /api/staff/login
   Body: { email, password }
───────────────────────────────────────────── */
const loginStaff = (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // ── Rate limiting: 5 attempts per IP+email per 15 min ──
  if (isRateLimited(ip, email)) {
    return res.status(429).json({ message: "Too many login attempts for this account. Please wait 15 minutes and try again." });
  }

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Something went wrong. Please try again." });

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = results[0];
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role === "patient") {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // ── Clear rate limit on success + audit log ──
    clearRateLimit(ip, email);
    auditLog(user.user_id, "LOGIN", "user", user.user_id, ip);

    res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        physician_id: user.physician_id,
        staff_id: user.staff_id
      }
    });
  });
};

/* ─────────────────────────────────────────────
   Physician Dashboard Data
   GET /api/physician/dashboard?user_id=X
───────────────────────────────────────────── */
const getPhysicianDashboard = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id is required" });

  db.query(
    "SELECT physician_id FROM users WHERE user_id = ? AND role = 'physician'",
    [user_id],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.status(404).json({ message: "Physician user not found" });
      }

      const physician_id = rows[0].physician_id;
      if (!physician_id) {
        return res.status(403).json({ message: "No physician profile linked to this account" });
      }

      const physicianSql = `
        SELECT ph.physician_id, ph.first_name, ph.last_name, ph.email,
               ph.phone_number, ph.specialty, ph.hire_date, ph.physician_type,
               d.department_name, d.description AS dept_description
        FROM physician ph
        LEFT JOIN department d ON ph.department_id = d.department_id
        WHERE ph.physician_id = ?`;

      const appointmentsSql = `
        SELECT a.appointment_id, a.appointment_date, a.appointment_time,
               a.patient_id,
               p.first_name AS patient_first, p.last_name AS patient_last,
               a.reason_for_visit, a.appointment_type, s.status_name,
               o.city, o.street_address
        FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        JOIN appointment_status s ON a.status_id = s.status_id
        JOIN office o ON a.office_id = o.office_id
        WHERE a.physician_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
        LIMIT 200`;

      const patientsSql = `
        SELECT p.patient_id, p.first_name, p.last_name, p.date_of_birth,
               p.phone_number, p.email, p.gender,
               ins.provider_name
        FROM patient p
        LEFT JOIN insurance ins ON p.insurance_id = ins.insurance_id
        WHERE p.primary_physician_id = ?
        ORDER BY p.last_name, p.first_name`;

      const scheduleSql = `
        SELECT ws.office_id, ws.day_of_week, ws.start_time, ws.end_time,
               o.street_address, o.city, o.state
        FROM work_schedule ws
        JOIN office o ON ws.office_id = o.office_id
        WHERE ws.physician_id = ?
        ORDER BY FIELD(ws.day_of_week,
          'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')`;

      const referralsSql = `
        SELECT r.referral_id, r.date_issued, r.expiration_date,
               p.first_name AS patient_first, p.last_name AS patient_last,
               sp.first_name AS spec_first, sp.last_name AS spec_last,
               sp.specialty, rs.referral_status_name, r.referral_reason
        FROM referral r
        JOIN patient p ON r.patient_id = p.patient_id
        JOIN physician sp ON r.specialist_id = sp.physician_id
        JOIN referral_status rs ON r.referral_status_id = rs.referral_status_id
        WHERE r.primary_physician_id = ?
        ORDER BY r.date_issued DESC
        LIMIT 10`;

      let data = {};
      let completed = 0;
      const total = 5;

      function finish() {
        completed++;
        if (completed === total) res.json(data);
      }

      db.query(physicianSql,    [physician_id], (e, r) => { data.physician    = e ? null : r[0]; finish(); });
      db.query(appointmentsSql, [physician_id], (e, r) => { data.appointments = e ? []   : r;    finish(); });
      db.query(patientsSql,     [physician_id], (e, r) => { data.patients     = e ? []   : r;    finish(); });
      db.query(scheduleSql,     [physician_id], (e, r) => { data.schedule     = e ? []   : r;    finish(); });
      db.query(referralsSql,    [physician_id], (e, r) => { data.referrals    = e ? []   : r;    finish(); });
    }
  );
};

/* ─────────────────────────────────────────────
   Staff Dashboard Data
   GET /api/staff/dashboard?user_id=X
───────────────────────────────────────────── */
const getStaffDashboard = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id is required" });

  db.query(
    "SELECT staff_id FROM users WHERE user_id = ? AND role = 'staff'",
    [user_id],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.status(404).json({ message: "Staff user not found" });
      }

      const staff_id = rows[0].staff_id;
      if (!staff_id) {
        return res.status(403).json({ message: "No staff profile linked to this account" });
      }

      const staffSql = `
        SELECT s.staff_id, s.first_name, s.last_name, s.date_of_birth,
               s.role, s.phone_number, s.email, s.hire_date,
               s.shift_start, s.shift_end,
               d.department_name, c.clinic_name
        FROM staff s
        LEFT JOIN department d ON s.department_id = d.department_id
        LEFT JOIN clinic c ON d.clinic_id = c.clinic_id
        WHERE s.staff_id = ?`;

      const appointmentsSql = `
        SELECT a.appointment_id, a.appointment_date, a.appointment_time,
               p.first_name AS patient_first, p.last_name AS patient_last,
               CONCAT(ph.first_name, ' ', ph.last_name) AS physician_name,
               st.status_name
        FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        JOIN physician ph ON a.physician_id = ph.physician_id
        JOIN appointment_status st ON a.status_id = st.status_id
        WHERE ph.department_id = (
          SELECT department_id FROM staff WHERE staff_id = ?
        )
        AND a.appointment_date >= CURDATE()
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
        LIMIT 20`;

      const billingSql = `
        SELECT b.bill_id,
               IFNULL(b.total_amount, 0)            AS total_amount,
               IFNULL(b.insurance_paid_amount, 0)   AS insurance_paid_amount,
               IFNULL(b.patient_owed, 0)            AS patient_owed,
               b.payment_status, b.payment_method, b.payment_date,
               b.due_date,
               p.first_name, p.last_name,
               i.provider_name AS insurance_provider
        FROM billing b
        JOIN patient p    ON b.patient_id   = p.patient_id
        LEFT JOIN insurance i ON b.insurance_id = i.insurance_id
        ORDER BY
          CASE WHEN b.payment_status = 'Unpaid' OR b.payment_status IS NULL THEN 0 ELSE 1 END ASC,
          b.due_date ASC,
          b.bill_id DESC
        LIMIT 50`;

      let data = {};
      let completed = 0;

      function finish() {
        completed++;
        if (completed === 3) res.json(data);
      }

      db.query(staffSql,        [staff_id],  (e, r) => { data.staff        = e ? null : r[0]; finish(); });
      db.query(appointmentsSql, [staff_id],  (e, r) => { data.appointments = e ? []   : r;    finish(); });
      db.query(billingSql,      [],          (e, r) => { data.billing      = e ? []   : r;    finish(); });
    }
  );
};

/* ─────────────────────────────────────────────
   All Physicians' Work Schedules
   GET /api/staff/all-schedules?office_id=X
───────────────────────────────────────────── */
const getAllSchedules = (req, res) => {
  const { office_id } = req.query;

  let sql, params;
  if (office_id) {
    sql = `
      SELECT p.physician_id, p.first_name, p.last_name, p.specialty,
             ws.day_of_week, ws.start_time, ws.end_time,
             o.city, o.state, o.street_address
      FROM physician p
      JOIN work_schedule ws ON p.physician_id = ws.physician_id
      JOIN office o ON ws.office_id = o.office_id
      WHERE ws.office_id = ?
      ORDER BY p.last_name,
        FIELD(ws.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')`;
    params = [office_id];
  } else {
    sql = `
      SELECT ph.physician_id, ph.first_name, ph.last_name, ph.specialty,
             ws.day_of_week, ws.start_time, ws.end_time,
             o.city, o.state, o.street_address
      FROM physician ph
      LEFT JOIN work_schedule ws ON ph.physician_id = ws.physician_id
      LEFT JOIN office o ON ws.office_id = o.office_id
      ORDER BY ph.last_name,
        FIELD(ws.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')`;
    params = [];
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Schedule query failed" });

    // Group by physician
    const map = {};
    rows.forEach(r => {
      if (!map[r.physician_id]) {
        map[r.physician_id] = {
          physician_id: r.physician_id,
          first_name:   r.first_name,
          last_name:    r.last_name,
          specialty:    r.specialty,
          schedule:     []
        };
      }
      if (r.day_of_week) {
        map[r.physician_id].schedule.push({
          day_of_week:  r.day_of_week,
          start_time:   r.start_time,
          end_time:     r.end_time,
          city:         r.city,
          state:        r.state,
          street_address: r.street_address
        });
      }
    });

    res.json(Object.values(map));
  });
};

/* ─────────────────────────────────────────────
   Get Referrals for a Specialist Physician
   GET /api/staff/physician/referrals?physician_id=X
───────────────────────────────────────────── */
const getPhysicianReferrals = (req, res) => {
  const { physician_id } = req.query;
  if (!physician_id) return res.status(400).json({ message: "physician_id is required" });

  const sql = `
    SELECT r.referral_id, r.date_issued, r.expiration_date, r.referral_reason,
           p.first_name AS patient_first, p.last_name AS patient_last,
           pp.first_name AS primary_first, pp.last_name AS primary_last,
           pp.specialty AS primary_specialty,
           rs.referral_status_name
    FROM referral r
    JOIN patient p ON r.patient_id = p.patient_id
    JOIN physician pp ON r.primary_physician_id = pp.physician_id
    JOIN referral_status rs ON r.referral_status_id = rs.referral_status_id
    WHERE r.specialist_id = ?
    ORDER BY r.date_issued DESC`;

  db.query(sql, [physician_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Referral query failed", error: err.message });
    res.json(rows);
  });
};

/* ─────────────────────────────────────────────
   Update Referral Status (Accept / Reject)
   PUT /api/staff/referral/:referral_id/status
   Body: { status_name: 'Accepted' | 'Rejected' }
───────────────────────────────────────────── */
const updateReferralStatus = (req, res) => {
  const { referral_id } = req.params;
  const { status_name } = req.body;

  if (!status_name) return res.status(400).json({ message: "status_name is required" });

  db.query(
    "SELECT referral_status_id FROM referral_status WHERE referral_status_name = ?",
    [status_name],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.status(400).json({ message: "Invalid status name: " + status_name });
      }

      const status_id = rows[0].referral_status_id;

      db.query(
        "UPDATE referral SET referral_status_id = ? WHERE referral_id = ?",
        [status_id, referral_id],
        (err2, result) => {
          if (err2) return res.status(500).json({ message: "Update failed", error: err2.message });
          if (result.affectedRows === 0) return res.status(404).json({ message: "Referral not found" });
          res.json({ message: "Referral status updated", referral_id, status_name });
        }
      );
    }
  );
};

/* POST /api/staff/physician/note */
const addPhysicianNote = (req, res) => {
    const { patient_id, condition, notes, status, user_id } = req.body;
    if (!patient_id || !condition) {
        return res.status(400).json({ message: "patient_id and condition are required" });
    }

    // Look up physician_id from the logged-in user
    db.query("SELECT physician_id FROM users WHERE user_id = ?", [user_id || 0], (err, rows) => {
        const physician_id = (!err && rows.length) ? rows[0].physician_id : null;

        const sql = `INSERT INTO medical_history (patient_id, physician_id, \`condition\`, diagnosis_date, status, notes)
                     VALUES (?, ?, ?, CURDATE(), ?, ?)`;
        db.query(sql, [patient_id, physician_id, condition, status || "Active", notes || null], (err2) => {
            if (err2) return res.status(500).json({ message: "Could not add note: " + err2.message });
            res.json({ message: "Note added successfully" });
        });
    });
};

/* PUT /api/staff/appointment/:id/status — physician or staff */
const updateAppointmentStatus = (req, res) => {
    const { id } = req.params;
    const { status_id, user_id } = req.body;
    if (!status_id) return res.status(400).json({ message: "status_id required" });

    // Valid status transitions: Completed(2), No-Show(4), Cancelled(3)
    const allowed = [2, 3, 4];
    if (!allowed.includes(Number(status_id)))
        return res.status(400).json({ message: "Invalid status. Use 2 (Completed), 3 (Cancelled), or 4 (No-Show)" });

    db.query(
        "UPDATE appointment SET status_id = ? WHERE appointment_id = ?",
        [status_id, id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Could not update appointment status" });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Appointment not found" });
            res.json({ message: "Appointment status updated successfully" });
        }
    );
};

/* PUT /api/staff/appointment/:id/undo-status — revert No-Show or Cancelled back to Scheduled */
const undoAppointmentStatus = (req, res) => {
    const { id } = req.params;
    const { user_id, reason } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id required" });
    if (!reason || !reason.trim()) return res.status(400).json({ message: "A reason is required to reverse this status." });

    // Fetch appointment + current status before changing
    db.query(
        `SELECT a.status_id, a.patient_id, a.appointment_date,
                s.status_name
         FROM appointment a
         JOIN appointment_status s ON a.status_id = s.status_id
         WHERE a.appointment_id = ?`,
        [id],
        (err, rows) => {
            if (err || !rows.length) return res.status(404).json({ message: "Appointment not found" });
            const { status_id, patient_id, appointment_date, status_name } = rows[0];
            if (status_id !== 3 && status_id !== 4) {
                return res.status(400).json({ message: "Can only undo Cancelled or No-Show appointments" });
            }

            // Get physician_id from user_id for the audit note
            db.query("SELECT physician_id FROM users WHERE user_id = ?", [user_id], (e0, uRows) => {
                const physician_id = (!e0 && uRows.length) ? uRows[0].physician_id : null;

                // Revert status to Scheduled
                db.query(
                    "UPDATE appointment SET status_id = 1 WHERE appointment_id = ?",
                    [id],
                    (e2) => {
                        if (e2) return res.status(500).json({ message: "Could not revert status" });

                        // Log the reversal to medical_history as an audit note
                        const apptDate = appointment_date
                            ? appointment_date.toString().split("T")[0]
                            : "unknown date";
                        const auditNote = `Status reversed from "${status_name}" to Scheduled. Reason: ${reason.trim()}`;
                        db.query(
                            `INSERT INTO medical_history (patient_id, physician_id, \`condition\`, diagnosis_date, status, notes)
                             VALUES (?, ?, 'Appointment Status Correction', CURDATE(), 'Resolved', ?)`,
                            [patient_id, physician_id, auditNote],
                            () => {} // non-fatal — don't block response
                        );

                        res.json({ message: "Appointment restored to Scheduled" });
                    }
                );
            });
        }
    );
};

/* DELETE /api/staff/medical-history/:id — physician only, must own the note */
const deleteMedicalHistoryNote = (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id required" });

    // Get physician_id from user_id
    db.query("SELECT physician_id FROM users WHERE user_id = ?", [user_id], (err, rows) => {
        if (err || !rows.length || !rows[0].physician_id)
            return res.status(403).json({ message: "Not authorized" });

        const physician_id = rows[0].physician_id;

        // Verify physician owns this note
        db.query(
            "SELECT medical_history_id FROM medical_history WHERE medical_history_id = ? AND physician_id = ?",
            [id, physician_id],
            (e2, check) => {
                if (e2) return res.status(500).json({ message: "Query failed" });
                if (!check.length) return res.status(403).json({ message: "You can only delete notes you created" });

                db.query("DELETE FROM medical_history WHERE medical_history_id = ?", [id], (e3) => {
                    if (e3) return res.status(500).json({ message: "Could not delete note" });
                    res.json({ message: "Note deleted successfully" });
                });
            }
        );
    });
};

/* POST /api/staff/appointments/book — staff books for any patient */
const staffBookAppointment = (req, res) => {
    const { patient_id, physician_id, date, time, reason, appointment_type } = req.body;
    if (!patient_id || !physician_id || !date || !time)
        return res.status(400).json({ message: "patient_id, physician_id, date, and time are required" });

    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayOfWeek = dayNames[new Date(date + "T12:00:00").getDay()];

    db.query(
        "SELECT office_id FROM work_schedule WHERE physician_id = ? AND day_of_week = ? LIMIT 1",
        [physician_id, dayOfWeek],
        (err, sched) => {
            if (err || !sched.length)
                return res.status(400).json({ message: "Physician not scheduled on that day" });

            const office_id = sched[0].office_id;
            const sql = `INSERT INTO appointment
                (patient_id, physician_id, office_id, appointment_date, appointment_time,
                 status_id, booking_method, reason_for_visit, appointment_type, duration_minutes)
                VALUES (?, ?, ?, ?, ?, 1, 'in-person', ?, ?, 30)`;

            db.query(sql, [patient_id, physician_id, office_id, date, time,
                           reason || null, appointment_type || "General"], (e2, result) => {
                if (e2) {
                    if (e2.code === "ER_DUP_ENTRY")
                        return res.status(409).json({ message: "That time slot is already booked." });
                    return res.status(500).json({ message: "Could not book appointment: " + e2.message });
                }
                res.json({ message: "Appointment booked successfully", appointment_id: result.insertId });
            });
        }
    );
};

/* PUT /api/staff/billing/:id/pay */
const markBillingPaid = (req, res) => {
    const { id } = req.params;
    const { payment_method } = req.body;
    if (!payment_method) return res.status(400).json({ message: "payment_method required" });

    db.query(
        "UPDATE billing SET payment_status = 'Paid', payment_method = ?, payment_date = CURDATE() WHERE bill_id = ?",
        [payment_method, id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Could not update billing record" });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Bill not found" });
            res.json({ message: "Billing marked as paid" });
        }
    );
};

/* GET /api/staff/patients — all patients for staff booking */
const getAllPatients = (req, res) => {
    db.query(
        `SELECT patient_id, first_name, last_name, phone_number, email
         FROM patient WHERE first_name != '' ORDER BY last_name, first_name`,
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Query failed" });
            res.json(rows);
        }
    );
};

/* POST /api/staff/patients/onboard — 3-step new patient onboarding
   Creates: users row + patient row + first 'New Patient' appointment in one flow.
   Trigger fires automatically to create patient_intake row.                        */
const onboardPatient = (req, res) => {
    const {
        first_name, last_name, date_of_birth, gender,
        phone_number, email,
        street_address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone,
        insurance_id,
        physician_id, appointment_date, appointment_time, reason
    } = req.body;

    if (!first_name || !last_name || !email || !physician_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ message: "First name, last name, email, physician, date, and time are required" });
    }

    const tempPassword = "Welcome@123";
    const password_hash = bcrypt.hashSync(tempPassword, 10);
    const userEmail = email.toLowerCase().trim();

    // Step 1: Create login account
    db.query(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'patient')",
        [userEmail, password_hash],
        (err, userResult) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({ message: `A patient account with email "${email}" already exists.` });
                }
                return res.status(500).json({ message: "Could not create user account: " + err.message });
            }
            const user_id = userResult.insertId;

            // Step 2: Create patient record (onboarding_status = 'Intake Pending' — trigger will also set this)
            db.query(
                `INSERT INTO patient (user_id, first_name, last_name, date_of_birth, gender,
                    phone_number, email, street_address, city, state, zip_code,
                    emergency_contact_name, emergency_contact_phone,
                    primary_physician_id, insurance_id, onboarding_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Intake Pending')`,
                [user_id, first_name, last_name, date_of_birth || null, gender || null,
                 phone_number || null, email,
                 street_address || null, city || null, state || null, zip_code || null,
                 emergency_contact_name || null, emergency_contact_phone || null,
                 physician_id, insurance_id || null],
                (err2, patResult) => {
                    if (err2) {
                        db.query("DELETE FROM users WHERE user_id = ?", [user_id], () => {});
                        return res.status(500).json({ message: "Could not create patient record: " + err2.message });
                    }
                    const patient_id = patResult.insertId;

                    // Step 3: Look up office_id from physician's work schedule
                    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                    const dayOfWeek = dayNames[new Date(appointment_date + "T12:00:00").getDay()];

                    db.query(
                        "SELECT office_id FROM work_schedule WHERE physician_id = ? AND day_of_week = ? LIMIT 1",
                        [physician_id, dayOfWeek],
                        (err3, sched) => {
                            if (err3 || !sched.length) {
                                return res.json({
                                    message: "Patient created — physician not scheduled that day, book appointment manually.",
                                    patient_id, user_id, email: userEmail, temp_password: tempPassword,
                                    appointmentError: true
                                });
                            }
                            const office_id = sched[0].office_id;

                            // Step 4: Book first appointment as 'New Patient' (60 min)
                            // Trigger fires here → creates patient_intake row automatically
                            db.query(
                                `INSERT INTO appointment
                                    (patient_id, physician_id, office_id, appointment_date, appointment_time,
                                     status_id, booking_method, reason_for_visit, appointment_type, duration_minutes)
                                 VALUES (?, ?, ?, ?, ?, 1, 'in-person', ?, 'New Patient', 60)`,
                                [patient_id, physician_id, office_id, appointment_date, appointment_time,
                                 reason || "New Patient Visit"],
                                (err4, apptResult) => {
                                    if (err4) {
                                        const msg = err4.code === "ER_DUP_ENTRY"
                                            ? "That time slot is already booked. Patient created — book appointment manually."
                                            : "Could not book appointment. Patient created — book manually.";
                                        return res.json({
                                            message: msg,
                                            patient_id, user_id, email: userEmail, temp_password: tempPassword,
                                            appointmentError: true
                                        });
                                    }
                                    res.json({
                                        message: "Patient onboarded successfully",
                                        patient_id, user_id, email: userEmail,
                                        temp_password: tempPassword,
                                        appointment_id: apptResult.insertId
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

/* GET /api/staff/physicians/accepting — physicians accepting new patients */
const getAcceptingPhysicians = (req, res) => {
    db.query(
        `SELECT ph.physician_id, ph.first_name, ph.last_name, ph.specialty, ph.physician_type,
                o.city, ws.day_of_week, ws.start_time, ws.end_time
         FROM physician ph
         JOIN work_schedule ws ON ph.physician_id = ws.physician_id
         JOIN office o ON ws.office_id = o.office_id
         WHERE COALESCE(ph.accepting_new_patients, 1) = 1
           AND ph.physician_type = 'primary'
         ORDER BY o.city, ph.last_name`,
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Query failed" });
            const map = {};
            rows.forEach(r => {
                if (!map[r.physician_id]) {
                    map[r.physician_id] = {
                        physician_id: r.physician_id,
                        first_name: r.first_name, last_name: r.last_name,
                        specialty: r.specialty, physician_type: r.physician_type,
                        city: r.city, schedule: []
                    };
                }
                map[r.physician_id].schedule.push({
                    day_of_week: r.day_of_week,
                    start_time:  r.start_time,
                    end_time:    r.end_time
                });
            });
            res.json(Object.values(map));
        }
    );
};

/* GET /api/staff/physicians — all physicians for staff booking */
const getAllPhysicians = (req, res) => {
    db.query(
        `SELECT ph.physician_id, ph.first_name, ph.last_name, ph.specialty, ph.physician_type,
                o.city
         FROM physician ph
         JOIN work_schedule ws ON ph.physician_id = ws.physician_id
         JOIN office o ON ws.office_id = o.office_id
         GROUP BY ph.physician_id, o.city
         ORDER BY o.city, ph.last_name`,
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Query failed" });
            res.json(rows);
        }
    );
};

/* ─────────────────────────────────────────────
   GET /api/staff/specialists — all specialist physicians
   Used by physician dashboard Create Referral modal
───────────────────────────────────────────── */
const getAllSpecialists = (req, res) => {
    db.query(
        `SELECT DISTINCT ph.physician_id, ph.first_name, ph.last_name, ph.specialty, o.city
         FROM physician ph
         JOIN work_schedule ws ON ph.physician_id = ws.physician_id
         JOIN office o ON ws.office_id = o.office_id
         WHERE ph.physician_type = 'specialist'
         ORDER BY ph.specialty, ph.last_name`,
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Query failed" });
            res.json(rows);
        }
    );
};

/* ─────────────────────────────────────────────
   POST /api/staff/referral/create
   Body: { physician_id, patient_id, specialist_id, referral_reason, user_id }
   PCP directly issues a referral (status = "Issued", bypassing patient request step)
───────────────────────────────────────────── */
const createReferral = (req, res) => {
    const { physician_id, patient_id, specialist_id, referral_reason } = req.body;
    if (!physician_id || !patient_id || !specialist_id) {
        return res.status(400).json({ message: "physician_id, patient_id, and specialist_id are required." });
    }

    // Get "Issued" status id
    db.query(
        "SELECT referral_status_id FROM referral_status WHERE referral_status_name = 'Issued' LIMIT 1",
        [],
        (e, statusRows) => {
            if (e || !statusRows.length) {
                return res.status(500).json({ message: "Could not resolve referral status." });
            }
            const statusId = statusRows[0].referral_status_id;
            const expDate  = new Date();
            expDate.setDate(expDate.getDate() + 90);
            const expStr   = expDate.toISOString().split("T")[0];

            db.query(
                `INSERT INTO referral
                   (patient_id, primary_physician_id, specialist_id, referral_status_id,
                    referral_reason, date_issued, expiration_date)
                 VALUES (?, ?, ?, ?, ?, CURDATE(), ?)`,
                [patient_id, physician_id, specialist_id, statusId,
                 referral_reason || null, expStr],
                (err2, result) => {
                    if (err2) return res.status(500).json({ message: "Could not create referral: " + err2.message });
                    res.status(201).json({ message: "Referral issued successfully.", referral_id: result.insertId });
                }
            );
        }
    );
};

module.exports = { loginStaff, getPhysicianDashboard, getStaffDashboard, getAllSchedules, getPhysicianReferrals, updateReferralStatus, addPhysicianNote, updateAppointmentStatus, undoAppointmentStatus, deleteMedicalHistoryNote, staffBookAppointment, markBillingPaid, getAllPatients, getAllPhysicians, onboardPatient, getAcceptingPhysicians, getAllSpecialists, createReferral };
