/**
 * seed_comprehensive.js
 * Tasks 2-5: offices, physicians, staff, patients, referrals
 */
require('dotenv').config();
const db = require('../db');

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = null;
}

function hashPassword(plain) {
  if (bcrypt) {
    return bcrypt.hashSync(plain, 10);
  }
  return plain;
}

function insertOne(label, sql, params, cb) {
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(`[ERROR] ${label}:`, err.message);
      cb(null);
    } else {
      console.log(`[OK] ${label} -> id=${result.insertId}`);
      cb(result.insertId);
    }
  });
}

function runQuery(label, sql, params, cb) {
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(`[ERROR] ${label}:`, err.message);
    } else {
      console.log(`[OK] ${label}`);
    }
    if (cb) cb(err, result);
  });
}

// ============================================================
// TASK 2: Add office locations
// clinic_id mapping: Dallas=1, Houston=2, Austin=3, San Antonio=4, Chicago=5, LA=6, NY=7
// ============================================================
function task2_addOffices(done) {
  console.log('\n=== TASK 2: Adding office locations ===');
  const offices = [
    { clinic_id: 1, phone: '(214) 555-0300', street: '5323 Harry Hines Blvd', city: 'Dallas', state: 'TX', zip: '75235', label: 'Dallas North Campus' },
    { clinic_id: 1, phone: '(214) 555-0400', street: '1801 Inwood Rd Suite 400', city: 'Dallas', state: 'TX', zip: '75390', label: 'Dallas Medical District' },
    { clinic_id: 2, phone: '(713) 555-0300', street: '6560 Fannin St Suite 1400', city: 'Houston', state: 'TX', zip: '77030', label: 'Houston Medical Center' },
    { clinic_id: 2, phone: '(713) 555-0400', street: '5085 Westheimer Rd Suite 200', city: 'Houston', state: 'TX', zip: '77056', label: 'Houston Galleria' },
    { clinic_id: 3, phone: '(512) 555-0300', street: '11410 Century Oaks Terrace Suite 150', city: 'Austin', state: 'TX', zip: '78758', label: 'Austin Domain' },
    { clinic_id: 5, phone: '(312) 555-0300', street: '233 S Wacker Dr Suite 800', city: 'Chicago', state: 'IL', zip: '60606', label: 'Chicago Loop' },
    { clinic_id: 6, phone: '(310) 555-0300', street: '2001 Santa Monica Blvd Suite 500', city: 'Los Angeles', state: 'CA', zip: '90404', label: 'LA Westside' },
    { clinic_id: 7, phone: '(718) 555-0200', street: '350 Jay St Suite 200', city: 'Brooklyn', state: 'NY', zip: '11201', label: 'Brooklyn' },
  ];

  // Track new office IDs by label
  const officeIds = {};
  let idx = 0;

  function insertNext() {
    if (idx >= offices.length) return done(officeIds);
    const o = offices[idx++];
    insertOne(
      `office: ${o.label}`,
      'INSERT INTO office (clinic_id, phone_number, street_address, city, state, zip_code) VALUES (?,?,?,?,?,?)',
      [o.clinic_id, o.phone, o.street, o.city, o.state, o.zip],
      (id) => {
        if (id) officeIds[o.label] = id;
        insertNext();
      }
    );
  }
  insertNext();
}

// ============================================================
// TASK 3: Add physicians + work schedules + user accounts
// ============================================================
function task3_addPhysicians(officeIds, done) {
  console.log('\n=== TASK 3: Adding physicians ===');

  // officeIds keys: 'Dallas North Campus', 'Dallas Medical District', 'Houston Medical Center',
  //                 'Houston Galleria', 'Austin Domain', 'Chicago Loop', 'LA Westside', 'Brooklyn'
  // Existing office IDs: Dallas=1, Houston=2, Austin=3, SA=4, Chicago=5, LA=6, NY=7

  const physicians = [
    {
      first: 'Priya', last: 'Sharma', specialty: 'Cardiology',
      phone: '(469) 555-0210', email: 'priya.sharma@palantirclinic.net',
      schedules: [
        { office_id: 1, days: ['Monday', 'Wednesday'] },
        { office_id: officeIds['Dallas North Campus'], days: ['Tuesday', 'Thursday'] }
      ],
      user: { username: 'dr.sharma', password: 'clinic123' }
    },
    {
      first: 'Marcus', last: 'Webb', specialty: 'Neurology',
      phone: '(832) 555-0220', email: 'marcus.webb@palantirclinic.net',
      schedules: [
        { office_id: 2, days: ['Monday', 'Friday'] },
        { office_id: officeIds['Houston Medical Center'], days: ['Wednesday'] }
      ],
      user: { username: 'dr.webb', password: 'clinic123' }
    },
    {
      first: 'Sofia', last: 'Delgado', specialty: 'OB/GYN',
      phone: '(737) 555-0230', email: 'sofia.delgado@palantirclinic.net',
      schedules: [
        { office_id: 3, days: ['Tuesday', 'Thursday'] },
        { office_id: officeIds['Austin Domain'], days: ['Monday'] }
      ],
      user: null
    },
    {
      first: 'Nathan', last: 'Okafor', specialty: 'Psychiatry',
      phone: '(210) 555-0240', email: 'nathan.okafor@palantirclinic.net',
      schedules: [
        { office_id: 4, days: ['Monday', 'Wednesday', 'Friday'] }
      ],
      user: null
    },
    {
      first: 'Mei', last: 'Lin', specialty: 'Oncology',
      phone: '(312) 555-0250', email: 'mei.lin@palantirclinic.net',
      schedules: [
        { office_id: 5, days: ['Monday', 'Thursday'] },
        { office_id: officeIds['Chicago Loop'], days: ['Tuesday', 'Friday'] }
      ],
      user: { username: 'dr.lin', password: 'clinic123' }
    },
    {
      first: 'Jordan', last: 'Blake', specialty: 'Dermatology',
      phone: '(424) 555-0260', email: 'jordan.blake@palantirclinic.net',
      schedules: [
        { office_id: 6, days: ['Monday', 'Wednesday'] },
        { office_id: officeIds['LA Westside'], days: ['Friday'] }
      ],
      user: null
    },
    {
      first: 'Amara', last: 'Osei', specialty: 'Endocrinology',
      phone: '(646) 555-0270', email: 'amara.osei@palantirclinic.net',
      schedules: [
        { office_id: 7, days: ['Tuesday', 'Thursday'] },
        { office_id: officeIds['Brooklyn'], days: ['Monday', 'Wednesday'] }
      ],
      user: null
    },
    {
      first: 'Carlos', last: 'Espinoza', specialty: 'Surgery',
      phone: '(214) 555-0280', email: 'carlos.espinoza@palantirclinic.net',
      schedules: [
        { office_id: officeIds['Dallas Medical District'], days: ['Monday', 'Tuesday', 'Wednesday'] }
      ],
      user: null
    },
    {
      first: 'Hannah', last: 'Petrov', specialty: 'Pulmonology',
      phone: '(713) 555-0290', email: 'hannah.petrov@palantirclinic.net',
      schedules: [
        { office_id: officeIds['Houston Galleria'], days: ['Monday', 'Wednesday', 'Friday'] }
      ],
      user: null
    },
    {
      first: 'Darius', last: 'Stone', specialty: 'Emergency Medicine',
      phone: '(512) 555-0295', email: 'darius.stone@palantirclinic.net',
      schedules: [
        { office_id: officeIds['Austin Domain'], days: ['Tuesday', 'Thursday', 'Saturday'] }
      ],
      user: null
    }
  ];

  // Track physician IDs by name for later use in referrals
  const physicianIds = {};
  let idx = 0;

  function insertNextPhysician() {
    if (idx >= physicians.length) {
      // Add existing physicians Garcia(1) and Johnson(3) to Dallas North Campus on Friday
      addExistingPhysiciansToNewOffice(physicianIds, done);
      return;
    }
    const p = physicians[idx++];

    // Insert physician
    insertOne(
      `physician: ${p.first} ${p.last}`,
      'INSERT INTO physician (first_name, last_name, specialty, phone_number, email) VALUES (?,?,?,?,?)',
      [p.first, p.last, p.specialty, p.phone, p.email],
      (physicianId) => {
        if (!physicianId) { insertNextPhysician(); return; }
        physicianIds[`${p.first} ${p.last}`] = physicianId;

        // Insert user account if needed
        if (p.user) {
          const pwHash = hashPassword(p.user.password);
          insertOne(
            `user: ${p.user.username}`,
            'INSERT INTO users (username, password_hash, role, physician_id) VALUES (?,?,?,?)',
            [p.user.username, pwHash, 'physician', physicianId],
            (userId) => {
              if (userId) {
                // Update physician with user_id
                db.query('UPDATE physician SET user_id=? WHERE physician_id=?', [userId, physicianId], (e) => {
                  if (e) console.error(`[ERROR] link user to physician ${physicianId}:`, e.message);
                });
              }
              insertSchedules(p.schedules, physicianId, insertNextPhysician);
            }
          );
        } else {
          insertSchedules(p.schedules, physicianId, insertNextPhysician);
        }
      }
    );
  }

  function insertSchedules(schedules, physicianId, cb) {
    if (!schedules || schedules.length === 0) return cb();
    let pending = 0;
    // Count total schedule entries
    schedules.forEach(s => { pending += s.days.length; });
    if (pending === 0) return cb();

    let done_count = 0;
    schedules.forEach(s => {
      s.days.forEach(day => {
        if (!s.office_id) {
          console.error(`[WARN] Missing office_id for schedule day ${day} of physician ${physicianId}`);
          if (++done_count === pending) cb();
          return;
        }
        runQuery(
          `schedule: physician=${physicianId} office=${s.office_id} ${day}`,
          'INSERT INTO work_schedule (physician_id, office_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
          [physicianId, s.office_id, day, '08:00:00', '17:00:00'],
          () => { if (++done_count === pending) cb(); }
        );
      });
    });
  }

  function addExistingPhysiciansToNewOffice(physicianIds, done) {
    const dallasNorthId = officeIds['Dallas North Campus'];
    if (!dallasNorthId) {
      console.error('[WARN] Dallas North Campus office_id not found, skipping existing physician schedules');
      return done(physicianIds);
    }
    let pending = 2;
    // Garcia (physician_id=1) on Friday at Dallas North Campus
    runQuery(
      'schedule: Garcia(1) Dallas North Campus Friday',
      'INSERT INTO work_schedule (physician_id, office_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
      [1, dallasNorthId, 'Friday', '08:00:00', '17:00:00'],
      () => { if (--pending === 0) done(physicianIds); }
    );
    // Johnson (physician_id=3) on Friday at Dallas North Campus
    runQuery(
      'schedule: Johnson(3) Dallas North Campus Friday',
      'INSERT INTO work_schedule (physician_id, office_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
      [3, dallasNorthId, 'Friday', '08:00:00', '17:00:00'],
      () => { if (--pending === 0) done(physicianIds); }
    );
  }

  insertNextPhysician();
}

// ============================================================
// TASK 4: Add staff members
// ============================================================
function task4_addStaff(officeIds, done) {
  console.log('\n=== TASK 4: Adding staff members ===');

  // Get existing department IDs first
  db.query('SELECT department_id, department_name FROM department ORDER BY department_id', (err, depts) => {
    if (err) {
      console.error('[ERROR] fetch departments:', err.message);
      return done();
    }

    const deptMap = {};
    depts.forEach(d => { deptMap[d.department_id] = d.department_name; });
    const deptIds = depts.map(d => d.department_id);
    console.log('[INFO] Available department_ids:', deptIds.join(', '));

    // Helper: get a valid dept_id, clamped to existing
    function validDept(requested) {
      if (deptIds.includes(requested)) return requested;
      // Return closest available
      return deptIds[Math.min(requested - 1, deptIds.length - 1)] || deptIds[0];
    }

    const staffMembers = [
      {
        first: 'Aaliyah', last: 'Washington', role: 'Nurse Practitioner',
        phone: '(214) 555-0310', email: 'a.washington@palantirclinic.net',
        hire_date: '2023-03-15', dept: validDept(1), office_id: 1,
        user: { username: 'staff.washington', password: 'staff123' }
      },
      {
        first: 'Connor', last: 'Murphy', role: 'Medical Assistant',
        phone: '(713) 555-0320', email: 'c.murphy@palantirclinic.net',
        hire_date: '2022-08-01', dept: validDept(2), office_id: 2,
        user: { username: 'staff.murphy', password: 'staff123' }
      },
      {
        first: 'Yuki', last: 'Tanaka', role: 'Radiologist Technician',
        phone: '(512) 555-0330', email: 'y.tanaka@palantirclinic.net',
        hire_date: '2024-01-10', dept: validDept(3), office_id: 3,
        user: null
      },
      {
        first: 'Marcus', last: 'Obi', role: 'Billing Specialist',
        phone: '(312) 555-0340', email: 'm.obi@palantirclinic.net',
        hire_date: '2021-06-20', dept: validDept(4), office_id: 5,
        user: null
      },
      {
        first: 'Fatima', last: 'Hassan', role: 'Receptionist',
        phone: '(424) 555-0350', email: 'f.hassan@palantirclinic.net',
        hire_date: '2023-11-05', dept: validDept(5), office_id: 6,
        user: null
      },
      {
        first: 'Tyler', last: 'Grant', role: 'Lab Technician',
        phone: '(646) 555-0360', email: 't.grant@palantirclinic.net',
        hire_date: '2022-04-18', dept: validDept(1), office_id: 7,
        user: null
      }
    ];

    let idx = 0;

    function insertNextStaff() {
      if (idx >= staffMembers.length) return done();
      const s = staffMembers[idx++];

      // staff table has no office_id column per DESCRIBE, skip it
      insertOne(
        `staff: ${s.first} ${s.last}`,
        'INSERT INTO staff (first_name, last_name, role, phone_number, email, hire_date, department_id) VALUES (?,?,?,?,?,?,?)',
        [s.first, s.last, s.role, s.phone, s.email, s.hire_date, s.dept],
        (staffId) => {
          if (!staffId) { insertNextStaff(); return; }

          if (s.user) {
            const pwHash = hashPassword(s.user.password);
            insertOne(
              `user: ${s.user.username}`,
              'INSERT INTO users (username, password_hash, role, staff_id) VALUES (?,?,?,?)',
              [s.user.username, pwHash, 'staff', staffId],
              (userId) => {
                if (userId) {
                  db.query('UPDATE staff SET user_id=? WHERE staff_id=?', [userId, staffId], (e) => {
                    if (e) console.error(`[ERROR] link user to staff ${staffId}:`, e.message);
                  });
                }
                insertNextStaff();
              }
            );
          } else {
            insertNextStaff();
          }
        }
      );
    }

    insertNextStaff();
  });
}

// ============================================================
// TASK 5: Add patients + referrals
// ============================================================
function task5_addPatients(physicianIds, done) {
  console.log('\n=== TASK 5: Adding patients ===');

  // All physician IDs for referrals will be resolved by name from physicianIds map
  // We need both existing and new physician IDs.
  // Existing physician_ids used:
  //   1=Garcia, 3=Johnson, 4=Navarro, 6=Nguyen, 7=Moore, 8=Park, 9=Foster,
  //   11=Cruz, 17=Mitchell, 19=Davis, 21=Kim, 22=Martinez, 24=Lee(EM), 25=Wilson

  const patients = [
    {
      first: 'Rebecca', last: 'Chen', dob: '1988-04-22', gender: 'F',
      phone: '(214) 555-1001', email: 'rchen@email.com',
      street: '4521 Oak Lawn Ave', city: 'Dallas', state: 'TX', zip: '75219',
      primary_physician_id: 1, insurance_id: 1,
      ec_name: 'David Chen', ec_phone: '(214) 555-1002'
    },
    {
      first: 'Omar', last: 'Farouk', dob: '1975-09-14', gender: 'M',
      phone: '(713) 555-1003', email: 'ofarouk@email.com',
      street: '3200 Kirby Dr', city: 'Houston', state: 'TX', zip: '77098',
      primary_physician_id: 7, insurance_id: 2,
      ec_name: 'Fatima Farouk', ec_phone: '(713) 555-1004'
    },
    {
      first: 'Natalie', last: 'Russo', dob: '1992-12-05', gender: 'F',
      phone: '(512) 555-1005', email: 'nrusso@email.com',
      street: '2400 Nueces St', city: 'Austin', state: 'TX', zip: '78705',
      primary_physician_id: 9, insurance_id: 3,
      ec_name: 'Marco Russo', ec_phone: '(512) 555-1006'
    },
    {
      first: 'Kwame', last: 'Asante', dob: '1969-07-30', gender: 'M',
      phone: '(312) 555-1007', email: 'kasante@email.com',
      street: '1400 N Lake Shore Dr', city: 'Chicago', state: 'IL', zip: '60610',
      primary_physician_id: 19, insurance_id: 4,
      ec_name: 'Abena Asante', ec_phone: '(312) 555-1008'
    },
    {
      first: 'Elena', last: 'Volkova', dob: '1984-02-18', gender: 'F',
      phone: '(424) 555-1009', email: 'evolkova@email.com',
      street: '1200 Montana Ave', city: 'Los Angeles', state: 'CA', zip: '90403',
      primary_physician_id: 21, insurance_id: 5,
      ec_name: 'Ivan Volkov', ec_phone: '(424) 555-1010'
    },
    {
      first: 'James', last: 'Calloway', dob: '1951-11-03', gender: 'M',
      phone: '(646) 555-1011', email: 'jcalloway@email.com',
      street: '345 W 58th St', city: 'New York', state: 'NY', zip: '10019',
      primary_physician_id: 24, insurance_id: 1,
      ec_name: 'Margaret Calloway', ec_phone: '(646) 555-1012'
    },
    {
      first: 'Priscilla', last: 'Monroe', dob: '1996-06-12', gender: 'F',
      phone: '(210) 555-1013', email: 'pmonroe@email.com',
      street: '890 Broadway', city: 'San Antonio', state: 'TX', zip: '78215',
      primary_physician_id: 7, insurance_id: 2,
      ec_name: 'Charles Monroe', ec_phone: '(210) 555-1014'
    },
    {
      first: 'Raj', last: 'Patel', dob: '1980-03-25', gender: 'M',
      phone: '(214) 555-1015', email: 'rpatel@email.com',
      street: '6200 Gaston Ave', city: 'Dallas', state: 'TX', zip: '75214',
      primary_physician_id: 3, insurance_id: 3,
      ec_name: 'Sunita Patel', ec_phone: '(214) 555-1016'
    },
    {
      first: 'Chloe', last: 'Beaumont', dob: '1999-08-08', gender: 'F',
      phone: '(713) 555-1017', email: 'cbeaumont@email.com',
      street: '2800 Post Oak Blvd', city: 'Houston', state: 'TX', zip: '77056',
      primary_physician_id: 6, insurance_id: 4,
      ec_name: 'Henri Beaumont', ec_phone: '(713) 555-1018'
    },
    {
      first: 'Dwayne', last: 'Jackson', dob: '1965-01-19', gender: 'M',
      phone: '(512) 555-1019', email: 'djackson@email.com',
      street: '1100 Congress Ave', city: 'Austin', state: 'TX', zip: '78701',
      primary_physician_id: 11, insurance_id: 5,
      ec_name: 'Lorraine Jackson', ec_phone: '(512) 555-1020'
    },
    {
      first: 'Mei-Ling', last: 'Zhou', dob: '1991-05-28', gender: 'F',
      phone: '(312) 555-1021', email: 'mlzhou@email.com',
      street: '875 N Michigan Ave', city: 'Chicago', state: 'IL', zip: '60611',
      primary_physician_id: 17, insurance_id: 1,
      ec_name: 'Wei Zhou', ec_phone: '(312) 555-1022'
    },
    {
      first: 'Arjun', last: 'Mehta', dob: '1977-10-15', gender: 'M',
      phone: '(424) 555-1023', email: 'amehta@email.com',
      street: '500 S Grand Ave', city: 'Los Angeles', state: 'CA', zip: '90071',
      primary_physician_id: 22, insurance_id: 2,
      ec_name: 'Priya Mehta', ec_phone: '(424) 555-1024'
    },
    {
      first: 'Grace', last: 'Okonkwo', dob: '1988-03-11', gender: 'F',
      phone: '(646) 555-1025', email: 'gokonkwo@email.com',
      street: '200 Water St', city: 'New York', state: 'NY', zip: '10038',
      primary_physician_id: 25, insurance_id: 3,
      ec_name: 'Emeka Okonkwo', ec_phone: '(646) 555-1026'
    },
    {
      first: 'Victor', last: 'Castillo', dob: '1958-12-20', gender: 'M',
      phone: '(214) 555-1027', email: 'vcastillo@email.com',
      street: '3400 Swiss Ave', city: 'Dallas', state: 'TX', zip: '75204',
      primary_physician_id: 4, insurance_id: 4,
      ec_name: 'Rosa Castillo', ec_phone: '(214) 555-1028'
    },
    {
      first: 'Ingrid', last: 'Sorensen', dob: '1993-07-04', gender: 'F',
      phone: '(713) 555-1029', email: 'isorensen@email.com',
      street: '1500 Lamar St', city: 'Houston', state: 'TX', zip: '77010',
      primary_physician_id: 8, insurance_id: 5,
      ec_name: 'Lars Sorensen', ec_phone: '(713) 555-1030'
    }
  ];

  const patientIds = {}; // key: "First Last"
  let idx = 0;

  function insertNextPatient() {
    if (idx >= patients.length) {
      return addReferrals(patientIds, physicianIds, done);
    }
    const p = patients[idx++];
    insertOne(
      `patient: ${p.first} ${p.last}`,
      `INSERT INTO patient
        (first_name, last_name, date_of_birth, phone_number, email, street_address, city, state, zip_code, gender, emergency_contact_name, emergency_contact_phone, primary_physician_id, insurance_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [p.first, p.last, p.dob, p.phone, p.email, p.street, p.city, p.state, p.zip, p.gender, p.ec_name, p.ec_phone, p.primary_physician_id, p.insurance_id],
      (patientId) => {
        if (patientId) patientIds[`${p.first} ${p.last}`] = patientId;
        insertNextPatient();
      }
    );
  }

  insertNextPatient();
}

function addReferrals(patientIds, physicianIds, done) {
  console.log('\n=== TASK 5: Adding referrals ===');

  // Get pending referral_status_id
  db.query("SELECT referral_status_id FROM referral_status WHERE referral_status_name='Pending'", (err, rows) => {
    if (err || !rows.length) {
      console.error('[ERROR] Could not find Pending referral status:', err ? err.message : 'not found');
      return done();
    }
    const pendingStatusId = rows[0].referral_status_id;
    console.log(`[INFO] Pending referral_status_id = ${pendingStatusId}`);

    // Map new physician names to IDs
    const sharmaId = physicianIds['Priya Sharma'];
    const webbId = physicianIds['Marcus Webb'];
    const linId = physicianIds['Mei Lin'];
    const blakeId = physicianIds['Jordan Blake'];

    const referrals = [
      {
        patient: 'Rebecca Chen', primary: 1, specialist: sharmaId,
        reason: 'Palpitations during exercise stress test. Cardiology evaluation recommended.'
      },
      {
        patient: 'Omar Farouk', primary: 7, specialist: webbId,
        reason: 'Chronic migraines with visual aura. Neurology workup requested.'
      },
      {
        patient: 'Kwame Asante', primary: 19, specialist: linId,
        reason: 'Elevated PSA levels requiring oncology consultation.'
      },
      {
        patient: 'Elena Volkova', primary: 21, specialist: blakeId,
        reason: 'Atypical mole growth pattern. Dermatology biopsy recommended.'
      },
      {
        patient: 'Raj Patel', primary: 3, specialist: sharmaId,
        reason: 'Family history of heart disease. Preventive cardiology assessment.'
      },
      {
        patient: 'Mei-Ling Zhou', primary: 17, specialist: linId,
        reason: 'Follow-up imaging results require specialist review.'
      }
    ];

    const today = new Date().toISOString().split('T')[0];
    const expiration = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let pending = referrals.length;
    if (pending === 0) return done();

    referrals.forEach(r => {
      const patientId = patientIds[r.patient];
      if (!patientId) {
        console.error(`[WARN] No patient_id found for ${r.patient}, skipping referral`);
        if (--pending === 0) done();
        return;
      }
      if (!r.specialist) {
        console.error(`[WARN] No specialist_id found for referral patient ${r.patient}, skipping`);
        if (--pending === 0) done();
        return;
      }
      runQuery(
        `referral: ${r.patient} -> specialist=${r.specialist}`,
        'INSERT INTO referral (patient_id, primary_physician_id, specialist_id, date_issued, expiration_date, referral_status_id, referral_reason) VALUES (?,?,?,?,?,?,?)',
        [patientId, r.primary, r.specialist, today, expiration, pendingStatusId, r.reason],
        () => { if (--pending === 0) done(); }
      );
    });
  });
}

// ============================================================
// MAIN: chain all tasks
// ============================================================
task2_addOffices((officeIds) => {
  console.log('[INFO] New office IDs:', JSON.stringify(officeIds));
  task3_addPhysicians(officeIds, (physicianIds) => {
    console.log('[INFO] New physician IDs:', JSON.stringify(physicianIds));
    task4_addStaff(officeIds, () => {
      task5_addPatients(physicianIds, () => {
        console.log('\n=== seed_comprehensive.js complete ===');
        setTimeout(() => process.exit(0), 1000);
      });
    });
  });
});
