const mysql = require("mysql2");

const db = mysql.createPool({
  host: "caboose.proxy.rlwy.net",
  user: "root",
  port: 55239,
  password: "nlJDIavQRHMiHBgtNmZHwnNHNrrcZisB",
  database: "railway",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to Railway MySQL - railway");
    connection.release();
  }
});

module.exports = db;
