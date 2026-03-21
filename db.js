/* Import MySQL library */
const mysql = require("mysql2");          /* What this does:Loads the MySQL package you installed, Gives you tools to connect and run queries, This is what lets Node.js talk to MySQL */

/* Create database connection */ /* What this means:You are telling Node: “Connect to THIS database” */
const db = mysql.createConnection({
  host: "localhost", /* Database is running on your computer */
  user: "root",     /* Your MySQL username */
  password: "Mysql$695697$2019", /* Your MySQL password */ /* This must match your MySQL Workbench login */
  database: "clinic_app"      /** The specific database you created */    /** This is where your users table lives */
});

/* Connect to database */   /** What this means:“Try to connect to MySQL” */
db.connect((err) => {
  /** If there is an error */
  if (err) {
    console.error("Database connection failed:", err);
  } else {                            /** If connection is successful */
    console.log("Connected to MySQL");
  }
});

/* Export the connection */   /** What this means:“Make this database connection available to other files” */
module.exports = db;
/** Where this is used 
In your controllers:
      const db = require("../db");
Then you can do:
      db.query("SELECT * FROM users", ...) */