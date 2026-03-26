"use strict";

// Satire-tinged seed data for the Palantir Clinic database.
// Run with: node database/seed_more.js

const db = require("../db");

function run(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function seed() {
  console.log("=== seed_more.js starting ===\n");

  /* ──────────────────────────────────────────────────
     1. PATIENTS (5 new, with Palantir satire)
  ────────────────────────────────────────────────── */
  console.log("Inserting patients...");

  const patients = [
    {
      first_name: "Edward", last_name: "Snowfield",
      date_of_birth: "1983-06-21", gender: "Male",
      phone_number: "2025550183", email: "edward.snowfield@protonmail.net",
      street_address: "1 Encrypted Lane", city: "Austin", state: "TX", zip_code: "78701",
      emergency_contact_name: "Laura Snowfield", emergency_contact_phone: "2025550184",
      primary_physician_id: 9, insurance_id: 3
    },
    {
      first_name: "Peter", last_name: "Thayer",
      date_of_birth: "1967-10-11", gender: "Male",
      phone_number: "4155550147", email: "pthayer@foundersf.com",
      street_address: "7 Founders Fund Blvd", city: "Houston", state: "TX", zip_code: "77001",
      emergency_contact_name: "Blake Thayer", emergency_contact_phone: "4155550148",
      primary_physician_id: 5, insurance_id: 1
    },
    {
      first_name: "Alexandra", last_name: "Karpova",
      date_of_birth: "1977-08-02", gender: "Female",
      phone_number: "3235550134", email: "akarpova@gmail.com",
      street_address: "22 Silicon Blvd", city: "Los Angeles", state: "CA", zip_code: "90001",
      emergency_contact_name: "Dmitri Karpov", emergency_contact_phone: "3235550135",
      primary_physician_id: 21, insurance_id: 2
    },
    {
      first_name: "Ira", last_name: "Clyburn",
      date_of_birth: "1959-03-15", gender: "Male",
      phone_number: "2025550198", email: "iclyburn@senate.gov",
      street_address: "1 Capitol Hill Rd", city: "Chicago", state: "IL", zip_code: "60601",
      emergency_contact_name: "Sandra Clyburn", emergency_contact_phone: "2025550199",
      primary_physician_id: 17, insurance_id: 4
    },
    {
      first_name: "Shyam", last_name: "Sankaranarayan",
      date_of_birth: "1980-11-30", gender: "Male",
      phone_number: "6175550180", email: "shyam.s@palantirclinic.net",
      street_address: "100 Palantir Way", city: "Los Angeles", state: "CA", zip_code: "90002",
      emergency_contact_name: "Priya Sankaranarayan", emergency_contact_phone: "6175550181",
      primary_physician_id: 23, insurance_id: 5
    }
  ];

  const newPatientIds = [];
  for (const p of patients) {
    const result = await run(
      `INSERT INTO patient
        (first_name, last_name, date_of_birth, phone_number, email,
         street_address, city, state, zip_code, gender,
         emergency_contact_name, emergency_contact_phone,
         primary_physician_id, insurance_id, user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
      [
        p.first_name, p.last_name, p.date_of_birth, p.phone_number, p.email,
        p.street_address, p.city, p.state, p.zip_code, p.gender,
        p.emergency_contact_name, p.emergency_contact_phone,
        p.primary_physician_id, p.insurance_id
      ]
    );
    newPatientIds.push(result.insertId);
    console.log(`  Inserted patient ${p.first_name} ${p.last_name} -> patient_id=${result.insertId}`);
  }

  const [edwardId, peterId, alexandraId, iraId, shyamId] = newPatientIds;

  /* ──────────────────────────────────────────────────
     2. MEDICAL HISTORY (5 records)
  ────────────────────────────────────────────────── */
  console.log("\nInserting medical history...");

  const medHistories = [
    {
      patient_id: edwardId,
      condition: "Hypervigilance Disorder",
      diagnosis_date: "2023-03-15",
      status: "Chronic",
      notes: "Patient reports persistent feeling of being monitored. Recommended cognitive behavioral therapy."
    },
    {
      patient_id: peterId,
      condition: "Libertarian Anxiety Syndrome",
      diagnosis_date: "2022-09-01",
      status: "Managed",
      notes: "Patient expresses strong ideological opposition to treatment oversight. Agreed to minimal intervention protocol."
    },
    {
      patient_id: alexandraId,
      condition: "Executive Burnout",
      diagnosis_date: "2024-01-10",
      status: "Active",
      notes: "Presents with symptoms consistent with prolonged exposure to government contract negotiations."
    },
    {
      patient_id: iraId,
      condition: "Regulatory Fatigue",
      diagnosis_date: "2021-06-20",
      status: "Chronic",
      notes: "Long-standing condition. Patient notes symptom onset coincides with committee hearings on data privacy."
    },
    {
      patient_id: shyamId,
      condition: "Predictive Modeling Stress Disorder",
      diagnosis_date: "2023-11-05",
      status: "Active",
      notes: "Occupational stress related to algorithmic decision-making responsibilities. Referred to psychiatry."
    }
  ];

  for (const mh of medHistories) {
    const result = await run(
      "INSERT INTO medical_history (patient_id, `condition`, diagnosis_date, `status`, notes) VALUES (?,?,?,?,?)",
      [mh.patient_id, mh.condition, mh.diagnosis_date, mh.status, mh.notes]
    );
    console.log(`  Inserted medical_history id=${result.insertId} for patient_id=${mh.patient_id}`);
  }

  /* ──────────────────────────────────────────────────
     3. REFERRALS (8 new records)
     referral_status: 1=Pending, 2=Approved, 3=Rejected, 4=Expired
  ────────────────────────────────────────────────── */
  console.log("\nInserting referrals...");

  const referrals = [
    {
      patient_id: 1, primary_physician_id: 1, specialist_id: 5,
      date_issued: "2026-03-01", expiration_date: "2026-06-01",
      referral_status_id: 1,
      referral_reason: "Chest pain during physical therapy sessions. Cardiology evaluation recommended."
    },
    {
      patient_id: 2, primary_physician_id: 2, specialist_id: 9,
      date_issued: "2026-02-15", expiration_date: "2026-05-15",
      referral_status_id: 1,
      referral_reason: "Recurring migraines unresponsive to standard pediatric treatment. Neurology consult requested."
    },
    {
      patient_id: 3, primary_physician_id: 3, specialist_id: 21,
      date_issued: "2026-01-20", expiration_date: "2026-04-20",
      referral_status_id: 2,
      referral_reason: "Abnormal CBC results requiring oncology follow-up. Patient counseled on next steps."
    },
    {
      patient_id: 4, primary_physician_id: 1, specialist_id: 14,
      date_issued: "2026-03-10", expiration_date: "2026-06-10",
      referral_status_id: 1,
      referral_reason: "Persistent cough and reduced lung capacity. Pulmonology workup recommended."
    },
    {
      patient_id: 5, primary_physician_id: 2, specialist_id: 23,
      date_issued: "2026-02-28", expiration_date: "2026-05-28",
      referral_status_id: 1,
      referral_reason: "Patient experiencing significant anxiety. Psychiatric evaluation and potential medication management."
    },
    {
      patient_id: 1, primary_physician_id: 1, specialist_id: 10,
      date_issued: "2025-11-01", expiration_date: "2026-02-01",
      referral_status_id: 4,
      referral_reason: "Suspicious skin lesions noted during routine exam."
    },
    {
      patient_id: 3, primary_physician_id: 3, specialist_id: 15,
      date_issued: "2026-03-05", expiration_date: "2026-06-05",
      referral_status_id: 1,
      referral_reason: "Annual gynecology referral for comprehensive evaluation."
    },
    {
      patient_id: 2, primary_physician_id: 2, specialist_id: 17,
      date_issued: "2026-03-12", expiration_date: "2026-06-12",
      referral_status_id: 3,
      referral_reason: "Precautionary cardiac screening. Specialist determined not clinically indicated at this time."
    }
  ];

  for (const r of referrals) {
    const result = await run(
      `INSERT INTO referral
        (patient_id, primary_physician_id, specialist_id,
         date_issued, expiration_date, referral_status_id, referral_reason)
       VALUES (?,?,?,?,?,?,?)`,
      [r.patient_id, r.primary_physician_id, r.specialist_id,
       r.date_issued, r.expiration_date, r.referral_status_id, r.referral_reason]
    );
    console.log(`  Inserted referral id=${result.insertId} patient_id=${r.patient_id} -> specialist_id=${r.specialist_id}`);
  }

  /* ──────────────────────────────────────────────────
     4. DIAGNOSIS (5 new records with satire)
     diagnosis requires appointment_id (NOT NULL).
     Using existing appointment_ids matched to patient+physician pairs.
     patient1->appt1(phys3), patient2->appt3(phys5), patient3->appt5(phys9),
     patient4->appt6(phys17), patient5->appt7(phys21)
  ────────────────────────────────────────────────── */
  console.log("\nInserting diagnoses...");

  const diagnoses = [
    {
      appointment_id: 1, physician_id: 1, diagnosis_date: "2026-02-10",
      diagnosis_code: "M79.3",
      diagnosis_description: "Mild panniculitis. Patient also flagged for Pattern Recognition Syndrome — coincidental finding during routine scan.",
      severity: "Mild",
      notes: "Recommend follow-up in 3 months. Patient data flagged for longitudinal study per clinic protocol."
    },
    {
      appointment_id: 3, physician_id: 2, diagnosis_date: "2026-01-15",
      diagnosis_code: "F41.1",
      diagnosis_description: "Generalized Anxiety Disorder. Patient expresses concern about data collection practices during intake.",
      severity: "Moderate",
      notes: "Prescribed standard anxiolytic regimen. Patient requested paper-only records."
    },
    {
      appointment_id: 5, physician_id: 3, diagnosis_date: "2026-02-20",
      diagnosis_code: "R53.83",
      diagnosis_description: "Other fatigue. Consistent with prolonged exposure to algorithmic workflow systems.",
      severity: "Mild",
      notes: "Rest recommended. Patient advised to limit screen time and data dashboard monitoring."
    },
    {
      appointment_id: 6, physician_id: 4, diagnosis_date: "2026-03-01",
      diagnosis_code: "M54.5",
      diagnosis_description: "Low back pain. Likely occupational — patient reports extended seated surveillance shifts.",
      severity: "Mild",
      notes: "Physical therapy referral. Ergonomic assessment of workstation recommended."
    },
    {
      appointment_id: 7, physician_id: 5, diagnosis_date: "2026-02-28",
      diagnosis_code: "I10",
      diagnosis_description: "Essential hypertension. Patient attributes onset to 2013. Will not elaborate further.",
      severity: "Moderate",
      notes: "Antihypertensive initiated. Patient declined digital health monitoring option."
    }
  ];

  const diagnosisIds = [];
  for (const d of diagnoses) {
    const result = await run(
      `INSERT INTO diagnosis
        (appointment_id, physician_id, diagnosis_code, diagnosis_description,
         diagnosis_date, severity, notes)
       VALUES (?,?,?,?,?,?,?)`,
      [d.appointment_id, d.physician_id, d.diagnosis_code, d.diagnosis_description,
       d.diagnosis_date, d.severity, d.notes]
    );
    diagnosisIds.push(result.insertId);
    console.log(`  Inserted diagnosis id=${result.insertId} code=${d.diagnosis_code}`);
  }

  /* ──────────────────────────────────────────────────
     5. TREATMENT (3 new records linked to new diagnoses)
     treatment table: diagnosis_id, treatment_plan,
     prescribed_medication, follow_up_date, notes
  ────────────────────────────────────────────────── */
  console.log("\nInserting treatments...");

  const treatments = [
    {
      diagnosis_id: diagnosisIds[0],
      treatment_plan: "Predictive Wellness Protocol: Data-informed preventive care regimen. Includes quarterly biomarker panels and behavioral health screening.",
      prescribed_medication: "Lisinopril 10mg — once daily",
      follow_up_date: "2026-08-10",
      notes: "Part of clinic's longitudinal health modeling initiative."
    },
    {
      diagnosis_id: diagnosisIds[1],
      treatment_plan: "Cognitive Load Reduction Therapy: Structured program to reduce decision fatigue in high-responsibility occupations. Combined with weekly CBT sessions.",
      prescribed_medication: "Sertraline 50mg — once daily AM",
      follow_up_date: "2026-07-15",
      notes: "6-month course. Reassess at completion."
    },
    {
      diagnosis_id: diagnosisIds[4],
      treatment_plan: "Surveillance Detox Plan: Mindfulness-based stress reduction for patients experiencing hypervigilance and trust deficits. 12-week behavioral intervention.",
      prescribed_medication: "None — behavioral intervention only",
      follow_up_date: "2026-05-28",
      notes: "Patient must consent to anonymous outcomes tracking. Ironic but required for grant compliance."
    }
  ];

  for (const t of treatments) {
    const result = await run(
      `INSERT INTO treatment
        (diagnosis_id, treatment_plan, prescribed_medication, follow_up_date, notes)
       VALUES (?,?,?,?,?)`,
      [t.diagnosis_id, t.treatment_plan, t.prescribed_medication, t.follow_up_date, t.notes]
    );
    console.log(`  Inserted treatment id=${result.insertId} for diagnosis_id=${t.diagnosis_id}`);
  }

  console.log("\n=== seed_more.js completed successfully ===");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
