const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "Team_13",
  password: "Cl1n1cDB",
  database: "team_13_medical_clinic_db"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL - team_13_medical_clinic_db");
  }
});

module.exports = db;
