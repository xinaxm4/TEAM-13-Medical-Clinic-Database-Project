// ============================================================
//  Role Middleware — server/middleware/auth.js
//  Usage: router.get("/route", requireRole("physician"), handler)
//         router.get("/route", requireRole("physician", "staff"), handler)
//
//  Reads userId + role from query params or request body,
//  verifies the role against the database, then either
//  calls next() or returns 401/403.
// ============================================================

const db = require("../db");

/**
 * requireRole(...allowedRoles)
 * Returns Express middleware that checks the caller's role.
 *
 * Callers must pass ?user_id=X in the query string (GET)
 * or { user_id } in the JSON body (POST/PUT).
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userId = req.query.user_id || req.body?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized — user_id required" });
    }

    db.query(
      "SELECT role FROM users WHERE user_id = ?",
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: "Auth check failed" });
        if (!rows || rows.length === 0) {
          return res.status(401).json({ error: "Unauthorized — user not found" });
        }

        const { role } = rows[0];

        if (!allowedRoles.includes(role)) {
          return res.status(403).json({ error: `Forbidden — ${role} cannot access this resource` });
        }

        req.userRole = role;
        next();
      }
    );
  };
}

module.exports = { requireRole };
