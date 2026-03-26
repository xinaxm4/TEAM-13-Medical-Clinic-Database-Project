const db = require("../db");

/* ─────────────────────────────────────────────
   Patient Dashboard Data
   GET /api/patient/dashboard?user_id=X
───────────────────────────────────────────── */
const getPatientDashboard = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id is required" });

  // LEFT JOINs so patients without physician/insurance still load
  const patientSql = `
    SELECT p.patient_id, p.first_name, p.last_name, p.date_of_birth,
           p.phone_number, p.email, p.gender,
           p.street_address, p.city, p.state, p.zip_code,
           p.emergency_contact_name, p.emergency_contact_phone,
           ph.first_name AS doc_first, ph.last_name AS doc_last, ph.specialty,
           ph.phone_number AS doc_phone,
           ins.provider_name, ins.policy_number, ins.coverage_percentage
    FROM patient p
    LEFT JOIN physician ph ON p.primary_physician_id = ph.physician_id
    LEFT JOIN insurance ins ON p.insurance_id = ins.insurance_id
    WHERE p.user_id = ?`;

  db.query(patientSql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Query failed" });

    // New user — auto-create a blank patient row so profile can be filled in
    if (rows.length === 0) {
      const insertSql = `
        INSERT INTO patient (user_id, first_name, last_name)
        VALUES (?, '', '')`;
      return db.query(insertSql, [user_id], (ie, ir) => {
        if (ie) return res.status(500).json({ message: "Could not initialize patient record" });
        // Return empty patient so dashboard renders with banner
        return res.json({
          patient: { patient_id: ir.insertId, first_name: "", last_name: "" },
          appointments: [], history: [], billing: []
        });
      });
    }

    const patient    = rows[0];
    const patient_id = patient.patient_id;

    const appointmentsSql = `
      SELECT a.appointment_id, a.appointment_date, a.appointment_time,
             ph.first_name AS doc_first, ph.last_name AS doc_last,
             a.reason_for_visit, s.status_name,
             o.city, o.street_address, a.booking_method
      FROM appointment a
      JOIN physician ph ON a.physician_id = ph.physician_id
      JOIN appointment_status s ON a.status_id = s.status_id
      JOIN office o ON a.office_id = o.office_id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time ASC
      LIMIT 20`;

    const historySQL = `
      SELECT medical_history_id, \`condition\`, diagnosis_date, status, notes
      FROM medical_history
      WHERE patient_id = ?
      ORDER BY diagnosis_date DESC`;

    const billingSql = `
      SELECT b.bill_id, b.total_amount, b.tax_amount,
             b.payment_status, b.payment_method, b.payment_date,
             ins.provider_name
      FROM billing b
      LEFT JOIN insurance ins ON b.insurance_id = ins.insurance_id
      WHERE b.patient_id = ?
      ORDER BY b.bill_id DESC
      LIMIT 10`;

    let data = { patient };
    let completed = 0;
    function finish() { completed++; if (completed === 3) res.json(data); }

    db.query(appointmentsSql, [patient_id], (e, r) => { data.appointments = e ? [] : r; finish(); });
    db.query(historySQL,      [patient_id], (e, r) => { data.history      = e ? [] : r; finish(); });
    db.query(billingSql,      [patient_id], (e, r) => { data.billing      = e ? [] : r; finish(); });
  });
};

/* ─────────────────────────────────────────────
   Update Patient Profile
   PUT /api/patient/profile
───────────────────────────────────────────── */
const updatePatientProfile = (req, res) => {
    const {
        user_id, first_name, last_name, date_of_birth, gender,
        phone_number, email, street_address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone
    } = req.body;

    if (!user_id) return res.status(400).json({ message: "user_id is required" });

    // ── Server-side validation ──
    const phoneRe = /^[\d\s\(\)\-\+\.]{7,15}$/;
    const zipRe   = /^\d{5}(-\d{4})?$/;
    const stateRe = /^[A-Za-z]{2}$/;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRe  = /^[a-zA-Z\s\-'\.]+$/;

    if (first_name && !nameRe.test(first_name))
        return res.status(400).json({ message: "First name should only contain letters." });
    if (last_name && !nameRe.test(last_name))
        return res.status(400).json({ message: "Last name should only contain letters." });
    if (phone_number && !phoneRe.test(phone_number))
        return res.status(400).json({ message: "Phone number must be digits only (e.g. 555-123-4567)." });
    if (emergency_contact_phone && !phoneRe.test(emergency_contact_phone))
        return res.status(400).json({ message: "Emergency contact phone must be digits only." });
    if (email && !emailRe.test(email))
        return res.status(400).json({ message: "Please enter a valid email address." });
    if (zip_code && !zipRe.test(zip_code))
        return res.status(400).json({ message: "ZIP code must be 5 digits (e.g. 77450)." });
    if (state && !stateRe.test(state))
        return res.status(400).json({ message: "State must be a 2-letter code (e.g. TX)." });
    if (date_of_birth && new Date(date_of_birth) > new Date())
        return res.status(400).json({ message: "Date of birth cannot be in the future." });

    const sql = `
        UPDATE patient SET
            first_name              = COALESCE(NULLIF(?, ''), first_name),
            last_name               = COALESCE(NULLIF(?, ''), last_name),
            date_of_birth           = COALESCE(?, date_of_birth),
            gender                  = COALESCE(?, gender),
            phone_number            = COALESCE(?, phone_number),
            email                   = COALESCE(?, email),
            street_address          = COALESCE(?, street_address),
            city                    = COALESCE(?, city),
            state                   = COALESCE(?, state),
            zip_code                = COALESCE(?, zip_code),
            emergency_contact_name  = COALESCE(?, emergency_contact_name),
            emergency_contact_phone = COALESCE(?, emergency_contact_phone)
        WHERE user_id = ?`;

    db.query(sql, [
        first_name || null, last_name || null,
        date_of_birth || null, gender || null,
        phone_number || null, email || null,
        street_address || null, city || null, state || null, zip_code || null,
        emergency_contact_name || null, emergency_contact_phone || null,
        user_id
    ], (err, result) => {
        if (err) {
            console.error("Profile update error:", err.message);
            return res.status(500).json({ message: "Could not update profile" });
        }
        res.json({ message: "Profile updated successfully" });
    });
};

module.exports = { getPatientDashboard, updatePatientProfile };
