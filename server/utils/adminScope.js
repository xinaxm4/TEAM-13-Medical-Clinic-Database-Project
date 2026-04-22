const GLOBAL_ADMIN_EMAIL = "admin@ath.admin.com";

function getAdminScope(db, userId, cb) {
  db.query(
    `SELECT u.user_id, u.email, u.admin_id,
            COALESCE(u.clinic_id, a.clinic_id) AS clinic_id,
            a.city, a.state
     FROM users u
     LEFT JOIN admin a ON u.admin_id = a.admin_id
     WHERE u.user_id = ? AND u.role = 'admin'`,
    [userId],
    (err, rows) => {
      if (err) return cb(err);
      if (!rows.length) return cb(null, null);

      const row = rows[0];
      cb(null, {
        user_id: row.user_id,
        email: row.email,
        admin_id: row.admin_id,
        clinic_id: row.clinic_id,
        city: row.city,
        state: row.state,
        isGlobal: row.email === GLOBAL_ADMIN_EMAIL || row.clinic_id == null
      });
    }
  );
}

function withAdminScope(db, req, res, cb) {
  const userId = req.query.user_id || req.body?.user_id;
  if (!userId) return res.status(401).json({ message: "user_id is required" });

  getAdminScope(db, userId, (err, scope) => {
    if (err) return res.status(500).json({ message: "Could not resolve admin scope." });
    if (!scope) return res.status(403).json({ message: "Admin account not found." });
    cb(scope);
  });
}

module.exports = { GLOBAL_ADMIN_EMAIL, getAdminScope, withAdminScope };
