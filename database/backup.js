// ============================================================
//  Audit Trail Health — Database Backup Script
//  Usage: npm run backup
//  Creates a timestamped .sql dump in database/backups/
// ============================================================

require("dotenv").config();
const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

const backupDir = path.join(__dirname, "backups");
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

const now       = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const filename  = `backup_${timestamp}.sql`;
const filepath  = path.join(backupDir, filename);

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("❌ Missing DB credentials in .env");
  process.exit(1);
}

console.log(`📦 Backing up ${DB_NAME} → ${filename} ...`);

try {
  const cmd = [
    "/opt/homebrew/bin/mysqldump",
    `-h ${DB_HOST}`,
    `-P ${DB_PORT || 3306}`,
    `-u ${DB_USER}`,
    `--password=${DB_PASSWORD}`,
    "--single-transaction",
    "--routines",
    "--triggers",
    "--no-tablespaces",
    DB_NAME
  ].join(" ");

  const dump = execSync(cmd, { maxBuffer: 50 * 1024 * 1024 }); // 50MB max
  fs.writeFileSync(filepath, dump);

  const sizeKB = (fs.statSync(filepath).size / 1024).toFixed(1);
  console.log(`✅ Backup saved: database/backups/${filename} (${sizeKB} KB)`);

  // Keep only the 10 most recent backups — delete older ones
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith(".sql"))
    .sort()
    .reverse();

  if (files.length > 10) {
    files.slice(10).forEach(old => {
      fs.unlinkSync(path.join(backupDir, old));
      console.log(`🗑️  Removed old backup: ${old}`);
    });
  }

} catch (err) {
  console.error("❌ Backup failed:", err.message);
  process.exit(1);
}
