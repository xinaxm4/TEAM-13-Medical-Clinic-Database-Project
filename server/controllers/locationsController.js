const db = require("../db");

/* ─────────────────────────────────────────────
   All Locations (grid overview)
   GET /api/locations
   Returns every clinic with its departments
───────────────────────────────────────────── */
const getLocations = (req, res) => {
  const sql = `
    SELECT c.clinic_id, c.clinic_name, c.city, c.state,
           c.street_address, c.zip_code, c.phone_number,
           GROUP_CONCAT(
             DISTINCT d.department_name
             ORDER BY d.department_name
             SEPARATOR ' · '
           ) AS departments
    FROM clinic c
    LEFT JOIN department d ON d.clinic_id = c.clinic_id
    GROUP BY c.clinic_id
    ORDER BY c.state, c.city`;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to load locations", error: err.message });
    res.json(results);
  });
};

/* ─────────────────────────────────────────────
   Single Location Detail
   GET /api/locations/detail?city=Dallas
   Returns clinic info, departments, physicians
───────────────────────────────────────────── */
const getLocationDetail = (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ message: "city query parameter is required" });

  const clinicSql = `
    SELECT c.clinic_id, c.clinic_name, c.city, c.state,
           c.street_address, c.zip_code, c.phone_number
    FROM clinic c
    WHERE c.city = ?
    LIMIT 1`;

  const departmentsSql = `
    SELECT d.department_id, d.department_name, d.description
    FROM department d
    JOIN clinic c ON d.clinic_id = c.clinic_id
    WHERE c.city = ?
    ORDER BY d.department_name`;

  const physiciansSql = `
    SELECT DISTINCT ph.physician_id, ph.first_name, ph.last_name, ph.specialty
    FROM physician ph
    JOIN department d ON ph.department_id = d.department_id
    JOIN clinic c ON d.clinic_id = c.clinic_id
    WHERE c.city = ?
    ORDER BY ph.last_name`;

  let data = {};
  let done = 0;
  const total = 3;

  function finish() {
    done++;
    if (done === total) res.json(data);
  }

  db.query(clinicSql,      [city], (e, r) => { data.clinic      = e ? null : (r[0] || null); finish(); });
  db.query(departmentsSql, [city], (e, r) => { data.departments = e ? []   : r;               finish(); });
  db.query(physiciansSql,  [city], (e, r) => { data.physicians  = e ? []   : r;               finish(); });
};

/* ─────────────────────────────────────────────
   Search Data (locations + doctors + specialties)
   GET /api/locations/search
   Used by the homepage smart search bar
───────────────────────────────────────────── */
const getSearchData = (req, res) => {
  const locationsSql = `
    SELECT c.city, c.state,
           GROUP_CONCAT(
             DISTINCT d.department_name
             ORDER BY d.department_name
             SEPARATOR ' · '
           ) AS departments
    FROM clinic c
    LEFT JOIN department d ON d.clinic_id = c.clinic_id
    GROUP BY c.clinic_id
    ORDER BY c.state, c.city`;

  const physiciansSql = `
    SELECT DISTINCT ph.first_name, ph.last_name, ph.specialty,
           c.city, c.state
    FROM physician ph
    JOIN department d ON ph.department_id = d.department_id
    JOIN clinic c ON d.clinic_id = c.clinic_id
    ORDER BY ph.last_name`;

  const specialtiesSql = `
    SELECT ph.specialty,
           GROUP_CONCAT(
             DISTINCT CONCAT(c.city, ', ', c.state)
             ORDER BY c.city
             SEPARATOR ' · '
           ) AS locations
    FROM physician ph
    JOIN department d ON ph.department_id = d.department_id
    JOIN clinic c ON d.clinic_id = c.clinic_id
    WHERE ph.specialty IS NOT NULL AND ph.specialty != ''
    GROUP BY ph.specialty
    ORDER BY ph.specialty`;

  let data = {};
  let done = 0;
  const total = 3;

  function finish() {
    done++;
    if (done === total) res.json(data);
  }

  db.query(locationsSql,   (e, r) => { data.locations   = e ? [] : r; finish(); });
  db.query(physiciansSql,  (e, r) => { data.physicians  = e ? [] : r; finish(); });
  db.query(specialtiesSql, (e, r) => { data.specialties = e ? [] : r; finish(); });
};

/* ─────────────────────────────────────────────
   About Page Stats
   GET /api/locations/stats
   Returns live counts for the about page
───────────────────────────────────────────── */
const getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(DISTINCT city) FROM clinic)                              AS city_count,
      (SELECT COUNT(*)             FROM physician)                           AS physician_count,
      (SELECT COUNT(DISTINCT specialty) FROM physician WHERE specialty IS NOT NULL AND specialty != '') AS specialty_count`;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to load stats" });
    res.json(results[0]);
  });
};

module.exports = { getLocations, getLocationDetail, getSearchData, getStats };
