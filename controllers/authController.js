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

        res.status(201).json({
          message: "User registered successfully",
          userId: insertResult.insertId
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
