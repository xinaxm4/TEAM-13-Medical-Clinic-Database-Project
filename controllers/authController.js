const db = require("../db");

const testRoute = (req, res) => {
  db.query("SELECT 1 + 1 AS result", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json({ message: "Database connection works", result: results[0].result });
  });
};

const registerUser = (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  const checkEmailSql = "SELECT * FROM users WHERE username = ?";

  db.query(checkEmailSql, [email], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({ error: "Error checking email" });
    }

    if (checkResults.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const insertSql =
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)";

    db.query(
      insertSql,
      [email, password, role || "patient"],
      (insertErr, insertResult) => {
        if (insertErr) {
          return res.status(500).json({ error: "Error registering user" });
        }

        const newUserId = insertResult.insertId;

        // Only create a patient profile for patient-role registrations
        if ((role || "patient") !== "patient") {
          return res.status(201).json({ message: "User registered successfully", userId: newUserId });
        }

        // Split full name into first / last (everything after first space is last name)
        const nameParts = (name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "New";
        const lastName = nameParts.slice(1).join(" ") || "Patient";

        const patientSql = `INSERT INTO patient
          (patient_id, user_id, first_name, last_name, primary_physician_id, insurance_id)
          VALUES (?, ?, ?, ?, 1, 1)`;

        db.query(patientSql, [newUserId, newUserId, firstName, lastName], (patErr) => {
          if (patErr) {
            console.error("Patient row creation failed:", patErr.message);
            // User was created — still return success, profile just incomplete
          }
          res.status(201).json({ message: "User registered successfully", userId: newUserId });
        });
      }
    );
  });
};

const loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "SELECT * FROM users WHERE username = ? AND password_hash = ?";

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Login query failed" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = results[0];

    if (user.role !== "patient") {
      return res.status(403).json({ error: "Please use the Staff Portal to log in." });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        name: user.username,
        email: user.username,
        role: user.role
      }
    });
  });
};

module.exports = { testRoute, registerUser, loginUser };
