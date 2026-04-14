const db = require("../db");

/* ─────────────────────────────────────────────
   Report 1: Patient Billing Statement
   GET /api/reports/billing-statement?patient_id=X&user_id=Y
───────────────────────────────────────────── */
const getBillingStatement = (req, res) => {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ message: "patient_id required" });

    const sql = `
        SELECT
          b.bill_id,
          a.appointment_date,
          a.appointment_type,
          CONCAT(ph.first_name, ' ', ph.last_name)  AS physician_name,
          ph.specialty,
          o.city                                     AS office_city,
          b.total_amount,
          IFNULL(b.insurance_paid_amount, 0)         AS insurance_paid,
          IFNULL(b.patient_owed, 0)                  AS patient_owed,
          b.payment_status,
          b.payment_method,
          b.payment_date,
          b.due_date,
          ins.provider_name,
          ins.coverage_percentage,
          CONCAT(pt.first_name, ' ', pt.last_name)   AS patient_name
        FROM billing b
        JOIN  appointment a    ON b.appointment_id = a.appointment_id
        JOIN  physician ph     ON a.physician_id   = ph.physician_id
        JOIN  office o         ON a.office_id      = o.office_id
        JOIN  patient pt       ON b.patient_id     = pt.patient_id
        LEFT JOIN insurance ins ON b.insurance_id  = ins.insurance_id
        WHERE b.patient_id = ?
        ORDER BY a.appointment_date DESC`;

    db.query(sql, [patient_id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Query failed" });

        // Summary totals
        const totalCharged  = rows.reduce((s, r) => s + parseFloat(r.total_amount  || 0), 0);
        const totalInsurance = rows.reduce((s, r) => s + parseFloat(r.insurance_paid || 0), 0);
        const totalOwed     = rows.reduce((s, r) => s + parseFloat(r.patient_owed  || 0), 0);
        const unpaidCount   = rows.filter(r => r.payment_status !== "Paid").length;

        res.json({
            patient_name: rows[0]?.patient_name || "Patient",
            summary: { totalCharged, totalInsurance, totalOwed, unpaidCount, billCount: rows.length },
            bills: rows
        });
    });
};

/* ─────────────────────────────────────────────
   Report 2: Daily Appointment Schedule
   GET /api/reports/daily-schedule?date=YYYY-MM-DD&user_id=Y
───────────────────────────────────────────── */
const getDailySchedule = (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const sql = `
        SELECT
          a.appointment_id,
          a.appointment_time,
          CONCAT(pt.first_name, ' ', pt.last_name)  AS patient_name,
          pt.phone_number                            AS patient_phone,
          CONCAT(ph.first_name, ' ', ph.last_name)  AS physician_name,
          ph.specialty,
          a.appointment_type,
          a.duration_minutes,
          a.reason_for_visit,
          s.status_name,
          o.city,
          o.street_address
        FROM appointment a
        JOIN patient pt              ON a.patient_id  = pt.patient_id
        JOIN physician ph             ON a.physician_id = ph.physician_id
        JOIN appointment_status s     ON a.status_id    = s.status_id
        JOIN office o                 ON a.office_id    = o.office_id
        WHERE a.appointment_date = ?
        ORDER BY o.city, a.appointment_time`;

    db.query(sql, [targetDate], (err, rows) => {
        if (err) return res.status(500).json({ message: "Query failed" });

        const scheduled  = rows.filter(r => r.status_name === "Scheduled").length;
        const completed  = rows.filter(r => r.status_name === "Completed").length;
        const noShow     = rows.filter(r => r.status_name === "No-Show").length;
        const cancelled  = rows.filter(r => r.status_name === "Cancelled").length;

        res.json({
            date: targetDate,
            summary: { total: rows.length, scheduled, completed, noShow, cancelled },
            appointments: rows
        });
    });
};

/* ─────────────────────────────────────────────
   Report 3: Physician Activity Report
   GET /api/reports/physician-activity?physician_id=X&user_id=Y
───────────────────────────────────────────── */
const getPhysicianActivity = (req, res) => {
    const { physician_id } = req.query;
    if (!physician_id) return res.status(400).json({ message: "physician_id required" });

    const sql = `
        SELECT
          ph.physician_id,
          CONCAT(ph.first_name, ' ', ph.last_name)  AS physician_name,
          ph.specialty,
          COUNT(a.appointment_id)                   AS total_appointments,
          SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN s.status_name = 'No-Show'   THEN 1 ELSE 0 END) AS no_shows,
          SUM(CASE WHEN s.status_name = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
          ROUND(
            SUM(CASE WHEN s.status_name = 'Completed' THEN 1 ELSE 0 END)
            / NULLIF(COUNT(a.appointment_id), 0) * 100, 1
          )                                          AS completion_rate_pct,
          IFNULL(SUM(b.total_amount), 0)             AS total_revenue_billed,
          IFNULL(SUM(b.patient_owed), 0)             AS outstanding_balance,
          COUNT(DISTINCT a.patient_id)               AS unique_patients_seen
        FROM physician ph
        LEFT JOIN appointment a
          ON ph.physician_id = a.physician_id
          AND a.appointment_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 90 DAY) AND CURDATE()
        LEFT JOIN appointment_status s ON a.status_id     = s.status_id
        LEFT JOIN billing b            ON a.appointment_id = b.appointment_id
        WHERE ph.physician_id = ?
        GROUP BY ph.physician_id, ph.first_name, ph.last_name, ph.specialty`;

    // Also fetch recent appointment breakdown for table
    const recentSql = `
        SELECT
          a.appointment_id,
          a.appointment_date,
          a.appointment_time,
          a.appointment_type,
          CONCAT(pt.first_name, ' ', pt.last_name) AS patient_name,
          s.status_name,
          IFNULL(b.total_amount, 0)       AS billed,
          IFNULL(b.patient_owed, 0)       AS owed,
          b.payment_status
        FROM appointment a
        JOIN patient pt           ON a.patient_id  = pt.patient_id
        JOIN appointment_status s  ON a.status_id   = s.status_id
        LEFT JOIN billing b        ON a.appointment_id = b.appointment_id
        WHERE a.physician_id = ?
          AND a.appointment_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 90 DAY) AND CURDATE()
        ORDER BY a.appointment_date DESC
        LIMIT 30`;

    db.query(sql, [physician_id], (err, rows) => {
        if (err || rows.length === 0)
            return res.status(500).json({ message: "Query failed" });

        const stats = rows[0];
        db.query(recentSql, [physician_id], (e2, recent) => {
            res.json({
                stats,
                appointments: e2 ? [] : recent
            });
        });
    });
};

module.exports = { getBillingStatement, getDailySchedule, getPhysicianActivity };
