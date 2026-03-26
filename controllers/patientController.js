const db = require("../db");

/* ─────────────────────────────────────────────
   Patient Dashboard Data
   GET /api/patient/dashboard?user_id=X
───────────────────────────────────────────── */
const getPatientDashboard = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id is required" });

  const patientSql = `
    SELECT p.patient_id, p.first_name, p.last_name, p.date_of_birth,
           p.phone_number, p.email, p.gender,
           p.street_address, p.city, p.state, p.zip_code,
           p.emergency_contact_name, p.emergency_contact_phone,
           ph.first_name AS doc_first, ph.last_name AS doc_last, ph.specialty,
           ph.phone_number AS doc_phone,
           ins.provider_name, ins.policy_number, ins.coverage_percentage
    FROM patient p
    JOIN physician ph ON p.primary_physician_id = ph.physician_id
    JOIN insurance ins ON p.insurance_id = ins.insurance_id
    WHERE p.user_id = ?`;

  db.query(patientSql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Query failed" });
    if (rows.length === 0) return res.status(404).json({ message: "Patient record not found" });

    const patient = rows[0];
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

    function finish() {
      completed++;
      if (completed === 3) res.json(data);
    }

    db.query(appointmentsSql, [patient_id], (e, r) => { data.appointments = e ? [] : r; finish(); });
    db.query(historySQL,      [patient_id], (e, r) => { data.history      = e ? [] : r; finish(); });
    db.query(billingSql,      [patient_id], (e, r) => { data.billing      = e ? [] : r; finish(); });
  });
};

module.exports = { getPatientDashboard };
