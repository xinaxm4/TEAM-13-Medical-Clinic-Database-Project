require('dotenv').config();
const db = require('../db');

// Normalize a phone string to (XXX) XXX-XXXX format
function normalizePhone(str) {
  if (!str) return null;
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  // Return original if we can't normalize
  return str;
}

function runStep(label, sql, params, cb) {
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(`[ERROR] ${label}:`, err.message);
    } else {
      console.log(`[OK] ${label}`);
    }
    if (cb) cb(err, result);
  });
}

function dropTriggerIfExists(name, cb) {
  db.query(`DROP TRIGGER IF EXISTS ${name}`, (err) => {
    if (err) console.error(`[WARN] Drop trigger ${name}:`, err.message);
    cb();
  });
}

// Step 1: fetch all patients and normalize phones
function fixPatients(done) {
  db.query('SELECT patient_id, phone_number, emergency_contact_phone FROM patient', (err, rows) => {
    if (err) { console.error('[ERROR] fetch patients:', err.message); return done(); }
    let pending = rows.length;
    if (pending === 0) return done();
    rows.forEach(row => {
      const newPhone = normalizePhone(row.phone_number);
      const newEC = normalizePhone(row.emergency_contact_phone);
      db.query(
        'UPDATE patient SET phone_number=?, emergency_contact_phone=? WHERE patient_id=?',
        [newPhone, newEC, row.patient_id],
        (e) => {
          if (e) console.error(`[ERROR] update patient ${row.patient_id}:`, e.message);
          else console.log(`[OK] patient ${row.patient_id}: phone=${newPhone}, ec=${newEC}`);
          if (--pending === 0) done();
        }
      );
    });
  });
}

// Step 2: fix physician phones
function fixPhysicians(done) {
  db.query('SELECT physician_id, phone_number FROM physician', (err, rows) => {
    if (err) { console.error('[ERROR] fetch physicians:', err.message); return done(); }
    let pending = rows.length;
    if (pending === 0) return done();
    rows.forEach(row => {
      const newPhone = normalizePhone(row.phone_number);
      db.query(
        'UPDATE physician SET phone_number=? WHERE physician_id=?',
        [newPhone, row.physician_id],
        (e) => {
          if (e) console.error(`[ERROR] update physician ${row.physician_id}:`, e.message);
          else console.log(`[OK] physician ${row.physician_id}: phone=${newPhone}`);
          if (--pending === 0) done();
        }
      );
    });
  });
}

// Step 3: fix staff phones
function fixStaff(done) {
  db.query('SELECT staff_id, phone_number FROM staff', (err, rows) => {
    if (err) { console.error('[ERROR] fetch staff:', err.message); return done(); }
    let pending = rows.length;
    if (pending === 0) return done();
    rows.forEach(row => {
      const newPhone = normalizePhone(row.phone_number);
      db.query(
        'UPDATE staff SET phone_number=? WHERE staff_id=?',
        [newPhone, row.staff_id],
        (e) => {
          if (e) console.error(`[ERROR] update staff ${row.staff_id}:`, e.message);
          else console.log(`[OK] staff ${row.staff_id}: phone=${newPhone}`);
          if (--pending === 0) done();
        }
      );
    });
  });
}

// Step 4: create phone validation triggers
function createTriggers(done) {
  const phoneRegex = '^\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}$';

  // Patient triggers
  const patientInsertSQL = `
    CREATE TRIGGER trg_validate_patient_phone
    BEFORE INSERT ON patient
    FOR EACH ROW
    BEGIN
      IF NEW.phone_number IS NOT NULL AND NEW.phone_number NOT REGEXP '^\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid phone format. Use (XXX) XXX-XXXX';
      END IF;
    END
  `;
  const patientUpdateSQL = `
    CREATE TRIGGER trg_validate_patient_phone_update
    BEFORE UPDATE ON patient
    FOR EACH ROW
    BEGIN
      IF NEW.phone_number IS NOT NULL AND NEW.phone_number NOT REGEXP '^\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid phone format. Use (XXX) XXX-XXXX';
      END IF;
    END
  `;

  const physicianInsertSQL = `
    CREATE TRIGGER trg_validate_physician_phone
    BEFORE INSERT ON physician
    FOR EACH ROW
    BEGIN
      IF NEW.phone_number IS NOT NULL AND NEW.phone_number NOT REGEXP '^\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid phone format. Use (XXX) XXX-XXXX';
      END IF;
    END
  `;
  const physicianUpdateSQL = `
    CREATE TRIGGER trg_validate_physician_phone_update
    BEFORE UPDATE ON physician
    FOR EACH ROW
    BEGIN
      IF NEW.phone_number IS NOT NULL AND NEW.phone_number NOT REGEXP '^\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid phone format. Use (XXX) XXX-XXXX';
      END IF;
    END
  `;

  const staffInsertSQL = `
    CREATE TRIGGER trg_validate_staff_phone
    BEFORE INSERT ON staff
    FOR EACH ROW
    BEGIN
      IF NEW.phone_number IS NOT NULL AND NEW.phone_number NOT REGEXP '^\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid phone format. Use (XXX) XXX-XXXX';
      END IF;
    END
  `;
  const staffUpdateSQL = `
    CREATE TRIGGER trg_validate_staff_phone_update
    BEFORE UPDATE ON staff
    FOR EACH ROW
    BEGIN
      IF NEW.phone_number IS NOT NULL AND NEW.phone_number NOT REGEXP '^\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid phone format. Use (XXX) XXX-XXXX';
      END IF;
    END
  `;

  // Drop existing triggers, then recreate
  const drops = [
    'trg_validate_patient_phone',
    'trg_validate_patient_phone_update',
    'trg_validate_physician_phone',
    'trg_validate_physician_phone_update',
    'trg_validate_staff_phone',
    'trg_validate_staff_phone_update'
  ];

  let dropCount = drops.length;
  drops.forEach(name => {
    dropTriggerIfExists(name, () => {
      if (--dropCount === 0) {
        // Now create triggers sequentially
        db.query(patientInsertSQL, (e) => {
          if (e) console.error('[ERROR] create trg_validate_patient_phone:', e.message);
          else console.log('[OK] Created trigger trg_validate_patient_phone (BEFORE INSERT)');
          db.query(patientUpdateSQL, (e) => {
            if (e) console.error('[ERROR] create trg_validate_patient_phone_update:', e.message);
            else console.log('[OK] Created trigger trg_validate_patient_phone_update (BEFORE UPDATE)');
            db.query(physicianInsertSQL, (e) => {
              if (e) console.error('[ERROR] create trg_validate_physician_phone:', e.message);
              else console.log('[OK] Created trigger trg_validate_physician_phone (BEFORE INSERT)');
              db.query(physicianUpdateSQL, (e) => {
                if (e) console.error('[ERROR] create trg_validate_physician_phone_update:', e.message);
                else console.log('[OK] Created trigger trg_validate_physician_phone_update (BEFORE UPDATE)');
                db.query(staffInsertSQL, (e) => {
                  if (e) console.error('[ERROR] create trg_validate_staff_phone:', e.message);
                  else console.log('[OK] Created trigger trg_validate_staff_phone (BEFORE INSERT)');
                  db.query(staffUpdateSQL, (e) => {
                    if (e) console.error('[ERROR] create trg_validate_staff_phone_update:', e.message);
                    else console.log('[OK] Created trigger trg_validate_staff_phone_update (BEFORE UPDATE)');
                    done();
                  });
                });
              });
            });
          });
        });
      }
    });
  });
}

// Main execution
console.log('=== Step 1: Normalizing patient phone numbers ===');
fixPatients(() => {
  console.log('=== Step 2: Normalizing physician phone numbers ===');
  fixPhysicians(() => {
    console.log('=== Step 3: Normalizing staff phone numbers ===');
    fixStaff(() => {
      console.log('=== Step 4: Creating phone validation triggers ===');
      createTriggers(() => {
        console.log('=== fix_phones.js complete ===');
        setTimeout(() => process.exit(0), 500);
      });
    });
  });
});
