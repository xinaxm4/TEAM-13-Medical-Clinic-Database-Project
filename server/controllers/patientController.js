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
      SELECT b.bill_id, b.total_amount, b.insurance_paid_amount,
             b.patient_owed, b.payment_status, b.payment_method,
             b.payment_date, b.due_date,
             ins.provider_name,
             a.appointment_date, a.appointment_type,
             ph.first_name AS doc_first, ph.last_name AS doc_last
      FROM billing b
      LEFT JOIN insurance ins ON b.insurance_id = ins.insurance_id
      LEFT JOIN appointment a  ON b.appointment_id = a.appointment_id
      LEFT JOIN physician ph   ON a.physician_id = ph.physician_id
      WHERE b.patient_id = ?
      ORDER BY b.bill_id DESC
      LIMIT 10`;

    const referralSql = `
      SELECT r.referral_id, r.date_issued, r.expiration_date, r.referral_reason,
             rs.status_name,
             ph1.first_name AS ref_first, ph1.last_name AS ref_last, ph1.specialty AS ref_specialty,
             ph2.first_name AS spec_first, ph2.last_name AS spec_last, ph2.specialty AS spec_specialty
      FROM referral r
      JOIN referral_status rs ON r.referral_status_id = rs.referral_status_id
      JOIN physician ph1 ON r.primary_physician_id = ph1.physician_id
      JOIN physician ph2 ON r.specialist_id = ph2.physician_id
      WHERE r.patient_id = ?
      ORDER BY r.date_issued DESC`;

    // Check if patient has at least one completed appointment with their primary physician
    const eligibilitySql = `
      SELECT COUNT(*) AS cnt FROM appointment
      WHERE patient_id = ? AND physician_id = ? AND status_id = 2`;

    let data = { patient };
    let completed = 0;
    function finish() { completed++; if (completed === 5) res.json(data); }

    db.query(appointmentsSql, [patient_id], (e, r) => { data.appointments = e ? [] : r; finish(); });
    db.query(historySQL,      [patient_id], (e, r) => { data.history      = e ? [] : r; finish(); });
    db.query(billingSql,      [patient_id], (e, r) => { data.billing      = e ? [] : r; finish(); });
    db.query(referralSql,     [patient_id], (e, r) => { data.referrals    = e ? [] : r; finish(); });
    db.query(eligibilitySql,  [patient_id, patient.primary_physician_id || 0],
        (e, r) => { data.referralEligible = !e && r[0].cnt > 0; finish(); });
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
    const phoneRe = /^\(\d{3}\) \d{3}-\d{4}$/;   // must match trigger format: (XXX) XXX-XXXX
    const zipRe   = /^\d{5}(-\d{4})?$/;
    const stateRe = /^[A-Za-z]{2}$/;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRe  = /^[a-zA-Z\s\-'\.]+$/;

    if (first_name && !nameRe.test(first_name))
        return res.status(400).json({ message: "First name should only contain letters." });
    if (last_name && !nameRe.test(last_name))
        return res.status(400).json({ message: "Last name should only contain letters." });
    if (phone_number && !phoneRe.test(phone_number))
        return res.status(400).json({ message: "Phone number must be in (XXX) XXX-XXXX format." });
    if (emergency_contact_phone && !phoneRe.test(emergency_contact_phone))
        return res.status(400).json({ message: "Emergency contact phone must be in (XXX) XXX-XXXX format." });
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

/* GET /api/patient/care/cities */
const getCareCities = (req, res) => {
    db.query(
        "SELECT DISTINCT city, state FROM office WHERE city IS NOT NULL ORDER BY city",
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Query failed" });
            res.json(rows);
        }
    );
};

/* GET /api/patient/care/physicians?city=X */
const getPhysiciansByCity = (req, res) => {
    const { city } = req.query;
    if (!city) return res.status(400).json({ message: "city required" });
    const sql = `
        SELECT DISTINCT ph.physician_id, ph.first_name, ph.last_name, ph.specialty
        FROM physician ph
        JOIN work_schedule ws ON ph.physician_id = ws.physician_id
        JOIN office o ON ws.office_id = o.office_id
        WHERE o.city = ? AND ph.physician_type = 'primary'
        ORDER BY ph.last_name`;
    db.query(sql, [city], (err, rows) => {
        if (err) return res.status(500).json({ message: "Query failed" });
        res.json(rows);
    });
};

/* GET /api/patient/care/insurance */
const getInsuranceOptions = (req, res) => {
    db.query(
        "SELECT insurance_id, provider_name, coverage_percentage FROM insurance ORDER BY provider_name",
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Query failed" });
            res.json(rows);
        }
    );
};

/* PUT /api/patient/care/assign */
const assignCare = (req, res) => {
    const { user_id, physician_id, insurance_id } = req.body;
    if (!user_id || !physician_id) return res.status(400).json({ message: "user_id and physician_id required" });
    db.query(
        "UPDATE patient SET primary_physician_id = ?, insurance_id = ? WHERE user_id = ?",
        [physician_id, insurance_id || null, user_id],
        (err) => {
            if (err) return res.status(500).json({ message: "Could not assign care team" });
            res.json({ message: "Care team assigned successfully" });
        }
    );
};

/* GET /api/patient/referral/specialists?city=X */
const getSpecialistsByCity = (req, res) => {
    const { city } = req.query;
    if (!city) return res.status(400).json({ message: "city required" });
    const sql = `
        SELECT DISTINCT ph.physician_id, ph.first_name, ph.last_name, ph.specialty
        FROM physician ph
        JOIN work_schedule ws ON ph.physician_id = ws.physician_id
        JOIN office o ON ws.office_id = o.office_id
        WHERE o.city = ? AND ph.physician_type = 'specialist'
        ORDER BY ph.specialty, ph.last_name`;
    db.query(sql, [city], (err, rows) => {
        if (err) return res.status(500).json({ message: "Query failed" });
        res.json(rows);
    });
};

/* POST /api/patient/referral/request */
const requestReferral = (req, res) => {
    const { user_id, specialist_id, referral_reason } = req.body;
    if (!user_id || !specialist_id || !referral_reason)
        return res.status(400).json({ message: "user_id, specialist_id, and referral_reason are required" });

    // Get patient + primary_physician_id
    db.query(
        "SELECT patient_id, primary_physician_id FROM patient WHERE user_id = ?",
        [user_id],
        (err, rows) => {
            if (err || rows.length === 0)
                return res.status(400).json({ message: "Patient not found" });

            const { patient_id, primary_physician_id } = rows[0];
            if (!primary_physician_id)
                return res.status(400).json({ message: "You must have a primary physician assigned before requesting a referral" });

            // Verify eligibility: at least one completed appointment with primary
            db.query(
                "SELECT COUNT(*) AS cnt FROM appointment WHERE patient_id = ? AND physician_id = ? AND status_id = 2",
                [patient_id, primary_physician_id],
                (e2, r2) => {
                    if (e2 || r2[0].cnt === 0)
                        return res.status(403).json({ message: "You must have at least one completed appointment with your primary physician before requesting a specialist referral" });

                    const today = new Date().toISOString().split("T")[0];
                    const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

                    db.query(
                        `INSERT INTO referral (patient_id, primary_physician_id, specialist_id, date_issued, expiration_date, referral_status_id, referral_reason)
                         VALUES (?, ?, ?, ?, ?, 1, ?)`,
                        [patient_id, primary_physician_id, specialist_id, today, expiry, referral_reason],
                        (e3) => {
                            if (e3) return res.status(500).json({ message: "Could not create referral request" });
                            res.json({ message: "Referral request submitted successfully" });
                        }
                    );
                }
            );
        }
    );
};

/* GET /api/patient/appointments/slots?physician_id=X&date=YYYY-MM-DD */
const getAvailableSlots = (req, res) => {
    const { physician_id, date } = req.query;
    if (!physician_id || !date) return res.status(400).json({ message: "physician_id and date required" });

    // Get the weekday name from the date
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayOfWeek = dayNames[new Date(date + "T12:00:00").getDay()];

    // Get work schedule for this physician on this weekday
    const scheduleSql = `
        SELECT ws.start_time, ws.end_time, ws.office_id
        FROM work_schedule ws
        WHERE ws.physician_id = ? AND ws.day_of_week = ?
        LIMIT 1`;

    db.query(scheduleSql, [physician_id, dayOfWeek], (err, schedule) => {
        if (err) return res.status(500).json({ message: "Query failed" });
        if (!schedule.length) return res.json({ slots: [], office_id: null, message: "Physician not scheduled on this day" });

        const { start_time, end_time, office_id } = schedule[0];

        // Get already-booked times for that day
        const bookedSql = `
            SELECT appointment_time FROM appointment
            WHERE physician_id = ? AND appointment_date = ? AND status_id != 3`;

        db.query(bookedSql, [physician_id, date], (e2, booked) => {
            if (e2) return res.status(500).json({ message: "Query failed" });

            const bookedTimes = new Set(booked.map(b => b.appointment_time.slice(0,5)));

            // Generate 30-min slots
            const slots = [];
            const [sh, sm] = start_time.split(":").map(Number);
            const [eh, em] = end_time.split(":").map(Number);
            let cur = sh * 60 + sm;
            const end = eh * 60 + em;

            while (cur + 30 <= end) {
                const hh = String(Math.floor(cur / 60)).padStart(2, "0");
                const mm = String(cur % 60).padStart(2, "0");
                const timeStr = `${hh}:${mm}`;
                if (!bookedTimes.has(timeStr)) slots.push(timeStr);
                cur += 30;
            }

            res.json({ slots, office_id });
        });
    });
};

/* POST /api/patient/appointments/book */
const bookAppointment = (req, res) => {
    const { user_id, physician_id, date, time, reason, appointment_type } = req.body;
    if (!user_id || !physician_id || !date || !time)
        return res.status(400).json({ message: "user_id, physician_id, date, and time are required" });

    // Validate date is in the future
    if (new Date(date + "T00:00:00") <= new Date(new Date().toDateString()))
        return res.status(400).json({ message: "Appointment date must be in the future" });

    // Get patient_id from user_id
    db.query("SELECT patient_id FROM patient WHERE user_id = ?", [user_id], (err, rows) => {
        if (err || !rows.length) return res.status(400).json({ message: "Patient not found" });
        const patient_id = rows[0].patient_id;

        // Get office_id from work_schedule
        const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const dayOfWeek = dayNames[new Date(date + "T12:00:00").getDay()];

        db.query(
            "SELECT office_id FROM work_schedule WHERE physician_id = ? AND day_of_week = ? LIMIT 1",
            [physician_id, dayOfWeek],
            (e2, sched) => {
                if (e2 || !sched.length)
                    return res.status(400).json({ message: "Physician not scheduled on that day" });

                const office_id = sched[0].office_id;

                const sql = `INSERT INTO appointment
                    (patient_id, physician_id, office_id, appointment_date, appointment_time,
                     status_id, booking_method, reason_for_visit, appointment_type, duration_minutes)
                    VALUES (?, ?, ?, ?, ?, 1, 'online', ?, ?, 30)`;

                db.query(sql, [patient_id, physician_id, office_id, date, time,
                               reason || null, appointment_type || "General"], (e3, result) => {
                    if (e3) {
                        if (e3.code === "ER_DUP_ENTRY")
                            return res.status(409).json({ message: "That time slot is no longer available. Please choose another." });
                        return res.status(500).json({ message: "Could not book appointment" });
                    }
                    res.json({ message: "Appointment booked successfully", appointment_id: result.insertId });
                });
            }
        );
    });
};

/* PUT /api/patient/appointments/:id/cancel */
const cancelAppointment = (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id required" });

    // Verify the appointment belongs to this patient and is Scheduled
    const checkSql = `
        SELECT a.appointment_id FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        WHERE a.appointment_id = ? AND p.user_id = ? AND a.status_id = 1`;

    db.query(checkSql, [id, user_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Query failed" });
        if (!rows.length) return res.status(403).json({ message: "Appointment not found or cannot be cancelled" });

        db.query("UPDATE appointment SET status_id = 3 WHERE appointment_id = ?", [id], (e2) => {
            if (e2) return res.status(500).json({ message: "Could not cancel appointment" });
            res.json({ message: "Appointment cancelled successfully" });
        });
    });
};

module.exports = { getPatientDashboard, updatePatientProfile, getCareCities, getPhysiciansByCity, getInsuranceOptions, assignCare, getSpecialistsByCity, requestReferral, getAvailableSlots, bookAppointment, cancelAppointment };
