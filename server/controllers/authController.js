const db              = require("../db");
const bcrypt          = require("bcryptjs");
const { validatePassword } = require("../utils/validatePassword");

// ── In-memory rate limiter: 5 attempts per IP per 15 minutes ──
const loginAttempts = new Map();

// Key = IP + username so different accounts don't share the same counter
function isRateLimited(ip, username) {
  const key = `${ip}:${(username || "").toLowerCase()}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  if (!loginAttempts.has(key)) loginAttempts.set(key, []);
  const attempts = loginAttempts.get(key).filter(t => now - t < windowMs);
  loginAttempts.set(key, attempts);

  if (attempts.length >= maxAttempts) return true;

  attempts.push(now);
  loginAttempts.set(key, attempts);
  return false;
}

function clearRateLimit(ip, username) {
  loginAttempts.delete(`${ip}:${(username || "").toLowerCase()}`);
}

// ── Audit log helper ──
function auditLog(userId, action, targetType, targetId, ip) {
  db.query(
    "INSERT INTO audit_log (user_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [userId || null, action, targetType || null, targetId || null, ip || null],
    () => {} // fire-and-forget
  );
}

const testRoute = (req, res) => {
  db.query("SELECT 1 + 1 AS result", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json({ message: "Database connection works", result: results[0].result });
  });
};

/* ── GET /api/auth/insurance-plans ── */
const getInsurancePlans = (req, res) => {
  db.query(
    "SELECT insurance_id, provider_name, coverage_percentage, policy_number FROM insurance ORDER BY provider_name",
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to load insurance plans" });
      res.json(rows);
    }
  );
};

const registerUser = (req, res) => {
  const { name, email, password, role, phone_number, date_of_birth, insurance_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  // ── Phone validation: required for patient registration ──
  if (!phone_number || phone_number.replace(/\D/g, "").length !== 10) {
    return res.status(400).json({ error: "A valid 10-digit phone number is required." });
  }

  // ── Password strength (uses shared utility) ──
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  // ── Age validation: must be 18+, no future dates ──
  if (date_of_birth) {
    const dob = new Date(date_of_birth);
    const today = new Date();
    if (dob > today) {
      return res.status(400).json({ error: "Date of birth cannot be in the future." });
    }
    const ageMs = today - dob;
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 18) {
      return res.status(400).json({ error: "You must be 18 or older to register." });
    }
  }

  const checkEmailSql = "SELECT * FROM users WHERE email = ?";

  db.query(checkEmailSql, [email], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({ error: "Error checking email" });
    }

    if (checkResults.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const insertSql =
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)";

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.query(
      insertSql,
      [email, hashedPassword, role || "patient"],
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
          (patient_id, user_id, first_name, last_name, email, phone_number, date_of_birth, insurance_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(patientSql, [newUserId, newUserId, firstName, lastName, email || null, phone_number || null, date_of_birth || null, insurance_id || null], (patErr) => {
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
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // ── Rate limiting: 5 failed attempts per IP+email per 15 min ──
  if (isRateLimited(ip, email)) {
    return res.status(429).json({ error: "Too many login attempts for this account. Please wait 15 minutes and try again." });
  }

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Login query failed" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = results[0];
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.role !== "patient") {
      return res.status(403).json({ error: "Please use the Staff Portal to log in." });
    }

    // ── Clear rate limit on success + audit log ──
    clearRateLimit(ip, email);
    auditLog(user.user_id, "LOGIN", "user", user.user_id, ip);

    res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        name: user.email,
        email: user.email,
        role: user.role
      }
    });
  });
};

module.exports = { testRoute, registerUser, loginUser, auditLog, getInsurancePlans };
