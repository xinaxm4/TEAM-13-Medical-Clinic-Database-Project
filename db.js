const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "caboose.proxy.rlwy.net",
  user: "root",
  port: 55239,
  password: "nlJDIavQRHMiHBgtNmZHwnNHNrrcZisB",
  database: "railway"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to Railway MySQL - railway");
  }
});

module.exports = db;
