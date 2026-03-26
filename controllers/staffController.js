const db = require("../db");

/* ─────────────────────────────────────────────
   Staff / Physician Login
   POST /api/staff/login
   Body: { username, password }
───────────────────────────────────────────── */
const loginStaff = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const sql = "SELECT * FROM users WHERE username = ? AND password_hash = ?";

  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json({ message: "Login query failed" });

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = results[0];

    if (user.role === "patient") {
      return res.status(403).json({ message: "Please use the patient login portal." });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        username: user.username,
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
               ph.phone_number, ph.specialty, ph.hire_date,
               d.department_name, d.description AS dept_description
        FROM physician ph
        LEFT JOIN department d ON ph.department_id = d.department_id
        WHERE ph.physician_id = ?`;

      const appointmentsSql = `
        SELECT a.appointment_id, a.appointment_date, a.appointment_time,
               p.first_name AS patient_first, p.last_name AS patient_last,
               a.reason_for_visit, s.status_name,
               o.city, o.street_address
        FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        JOIN appointment_status s ON a.status_id = s.status_id
        JOIN office o ON a.office_id = o.office_id
        WHERE a.physician_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
        LIMIT 20`;

      const patientsSql = `
        SELECT p.patient_id, p.first_name, p.last_name, p.date_of_birth,
               p.phone_number, p.email, p.gender,
               ins.provider_name
        FROM patient p
        JOIN insurance ins ON p.insurance_id = ins.insurance_id
        WHERE p.primary_physician_id = ?
        LIMIT 20`;

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
        SELECT b.bill_id, b.total_amount, b.tax_amount,
               b.payment_status, b.payment_method, b.payment_date,
               p.first_name, p.last_name
        FROM billing b
        JOIN patient p ON b.patient_id = p.patient_id
        WHERE b.payment_status IS NULL OR b.payment_status != 'Paid'
        ORDER BY b.bill_id DESC
        LIMIT 15`;

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

module.exports = { loginStaff, getPhysicianDashboard, getStaffDashboard, getAllSchedules, getPhysicianReferrals, updateReferralStatus };
