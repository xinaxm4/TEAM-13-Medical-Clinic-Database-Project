# Team 13 – Medical Clinic Database Project
> AGENTS.md — auto-read at session start. Use this to scope your focus.

---

## Quick Orientation

**Project:** Full-stack web app for a medical clinic. Patients, physicians, staff, and admins each have their own login portal.

**Stack:**
- **Backend:** Node.js + Express (`server.js`)
- **Database:** MySQL via `mysql2` connection pool — credentials in `.env`
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Auth:** bcrypt password hashing (`bcryptjs`)
- **Charts:** Chart.js 4 via CDN (admin insurance analytics)
- **Dev tool:** `nodemon` for auto-restart

**Current branch:** `TinaT2` (active development)
**Other branches:** `TinaT` (cleanup branch), `main` (stable)

**Live database:** Railway MySQL (used for demo)
**Submission plan:** Export from Railway → import to local MySQL before submission

---

## Folder Structure

```
project root
├── server.js                        ← Express entry point
├── .env                             ← DB credentials (never commit)
├── .env.example
├── railway.toml
├── package.json
│
├── client/
│   ├── pages/
│   │   ├── home_page.html
│   │   ├── about.html
│   │   └── locations/locations.html
│   ├── auth/
│   │   ├── patient_login.html
│   │   ├── staff_login.html
│   │   └── register.html            ← 3-step (no insurance step — removed)
│   ├── portals/
│   │   ├── patient_dashboard.html
│   │   ├── physician_dashboard.html
│   │   ├── staff_dashboard.html
│   │   └── admin_dashboard.html     ← Insurance analytics + staff/physician CRUD
│   ├── scripts/
│   │   ├── auth/
│   │   │   ├── login.js
│   │   │   ├── staff_login.js
│   │   │   └── register.js          ← 3-step wizard (insurance step removed)
│   │   ├── portals/
│   │   │   ├── patient_dashboard.js
│   │   │   ├── physician_dashboard.js
│   │   │   ├── staff_dashboard.js
│   │   │   └── admin_dashboard.js
│   │   └── pages/
│   └── styles/
│       ├── dashboard.css
│       ├── auth/
│       └── pages/
│
├── server/
│   ├── db.js
│   ├── middleware/
│   │   └── auth.js                  ← requireRole() middleware
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── patientController.js
│   │   ├── staffController.js       ← includes getAllSpecialists, createReferral
│   │   ├── adminController.js       ← CRUD + insurance analytics (6 insurance fns)
│   │   ├── reportController.js      ← 3 report queries (billing, schedule, physician)
│   │   └── locationsController.js
│   └── routes/
│       ├── authRoutes.js            ← includes GET /insurance-plans (public)
│       ├── patientRoutes.js
│       ├── staffRoutes.js
│       ├── adminRoutes.js
│       ├── reportRoutes.js
│       └── locationsRoutes.js
│
├── database/
│   ├── Team_13_Medical_Clinic_DB.sql  ← Full schema
│   ├── seed.sql                       ← 12 insurance providers, 12 appointments
│   ├── triggers.sql                   ← All 4 triggers
│   ├── queries.sql                    ← Reference SQL for 3 report queries
│   ├── add_today_appointments.sql     ← Railway migration (INSERT IGNORE)
│   ├── add_insurance_plans.sql        ← Railway migration (INSERT IGNORE)
│   ├── add_admin.sql
│   ├── add_admin_user.sql
│   └── backups/                       ← gitignored
│
└── images/
```

---

## API Routes Summary

### Auth
| Method | Route | What it does |
|--------|-------|--------------|
| POST | `/api/auth/register` | Create user + patient row |
| POST | `/api/auth/login` | Login, returns role |
| GET | `/api/auth/insurance-plans` | All insurance plans — **public**, used by registration + staff onboarding |

### Patient
| Method | Route | What it does |
|--------|-------|--------------|
| GET | `/api/patient/dashboard` | Full patient dashboard data |
| PUT | `/api/patient/profile` | Save profile edits |
| GET | `/api/patient/appointments` | Patient's appointments |
| GET | `/api/patient/appointments/slots` | Available slots for booking |
| POST | `/api/patient/appointments/book` | Book appointment |
| PUT | `/api/patient/appointments/:id/cancel` | Cancel appointment |
| GET | `/api/patient/care/cities` | City list |
| GET | `/api/patient/care/physicians` | Physicians by city |
| GET | `/api/patient/care/insurance` | Insurance (patient role only — use `/api/auth/insurance-plans` for other roles) |
| PUT | `/api/patient/care/assign` | Assign physician + insurance |
| GET | `/api/patient/referral/specialists` | Specialists by city |
| POST | `/api/patient/referral/request` | Request referral |

### Staff & Physician
| Method | Route | What it does |
|--------|-------|--------------|
| POST | `/api/staff/login` | Physician or staff login |
| GET | `/api/staff/physician/dashboard` | Physician dashboard data |
| GET | `/api/staff/staff/dashboard` | Staff dashboard data |
| GET | `/api/staff/all-schedules` | All physician schedules |
| GET | `/api/staff/physician/referrals` | Incoming referrals for physician |
| PUT | `/api/staff/referral/:id/status` | Accept or reject referral |
| POST | `/api/staff/physician/note` | Add clinical note |
| PUT | `/api/staff/appointment/:id/status` | Update appointment status |
| PUT | `/api/staff/appointment/:id/undo-status` | Undo last status change |
| DELETE | `/api/staff/medical-history/:id` | Delete medical history note |
| POST | `/api/staff/appointments/book` | Staff books appointment |
| PUT | `/api/staff/billing/:id/pay` | Mark billing paid |
| GET | `/api/staff/patients` | All patients |
| GET | `/api/staff/physicians` | All physicians |
| POST | `/api/staff/patients/onboard` | Onboard new patient |
| GET | `/api/staff/physicians/accepting` | Physicians accepting new patients |
| GET | `/api/staff/specialists` | All specialist physicians |
| POST | `/api/staff/referral/create` | Physician creates referral (PCP-initiated) |

### Admin
| Method | Route | What it does |
|--------|-------|--------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/dashboard` | Admin overview stats |
| GET | `/api/admin/clinic-report` | Financial report grouped by location |
| GET | `/api/admin/physicians` | All physicians |
| GET | `/api/admin/staff-members` | All staff |
| GET | `/api/admin/departments` | All departments |
| GET | `/api/admin/offices` | All offices |
| POST | `/api/admin/add-physician` | Add physician |
| POST | `/api/admin/add-staff` | Add staff member |
| PUT | `/api/admin/physician/:id` | Edit physician |
| DELETE | `/api/admin/physician/:id` | Delete physician |
| PUT | `/api/admin/staff/:id` | Edit staff member |
| DELETE | `/api/admin/staff/:id` | Delete staff member |
| GET | `/api/admin/insurance/scorecard` | Payer performance (Query A + B) |
| GET | `/api/admin/insurance/payer-detail` | Single payer detail |
| GET | `/api/admin/insurance/accepted` | Accepted plans per clinic (Query C) |
| POST | `/api/admin/insurance/accept` | Add plan to clinic |
| PUT | `/api/admin/insurance/:id/deactivate` | Deactivate plan |
| GET | `/api/admin/insurance/alerts` | Unread payer alerts |
| PUT | `/api/admin/insurance/alerts/:id/read` | Mark alert read |

### Reports
| Method | Route | What it does |
|--------|-------|--------------|
| GET | `/api/reports/billing-statement` | Patient billing statement |
| GET | `/api/reports/daily-schedule` | Daily schedule (optional `?clinic_id=`) |
| GET | `/api/reports/physician-activity` | Physician 90-day activity |

---

## Auth & Session Flow

1. User registers → `users` row created (bcrypt hashed) + blank `patient` row auto-created
2. User logs in → server returns `{ role, userId, email, patientId / physicianId / staffId }`
   - Note: login response field is `email` (not `username`) — `users` table column was renamed
3. Frontend stores in `localStorage` as `clinicUser`, appends `user_id` to every API call
4. Role determines portal:
   - `patient` → `/client/portals/patient_dashboard.html`
   - `physician` → `/client/portals/physician_dashboard.html`
   - `staff` → `/client/portals/staff_dashboard.html`
   - `admin` → `/client/portals/admin_dashboard.html`

---

## Current State of the Database (Railway — live)

| Table | Rows | Notes |
|-------|------|-------|
| `clinic` | 8 | Dallas, Houston, Austin, New York, Chicago, LA, Phoenix, Seattle |
| `department` | 46 | |
| `office` | 8 | One per city |
| `physician` | 65 | 38 primary + 27 specialist; `physician_type` column present |
| `work_schedule` | 138 | |
| `insurance` | 12 | Expanded from 5 via `add_insurance_plans.sql` migration |
| `staff` | 8 | |
| `users` | 78+ | All bcrypt hashed |
| `patient` | 5 | Alex, Taylor, Morgan, Jordan, Casey |
| `appointment` | 12 | Includes 4 for today (2026-04-18) via `add_today_appointments.sql` |
| `medical_history` | 6 | |
| `diagnosis` | 3 | |
| `treatment` | 3 | |
| `billing` | 5 | |
| `referral` | 2 | |
| `clinic_accepted_insurance` | 7 | Seeded contractual terms |
| `payer_alert` | auto | Populated by trigger |

**New schema columns (all live on Railway):**
- `physician.physician_type` ENUM('primary','specialist')
- `medical_history.physician_id` (who wrote the note)
- `appointment.appointment_type`, `appointment.duration_minutes`
- `billing.insurance_paid_amount`, `billing.patient_owed`, `billing.copay_amount`, `billing.due_date`
- `referral.specialist_appointment_id`
- `users.totp_secret`, `users.totp_enabled`
- `audit_log` table

**New tables (live on Railway):**
- `clinic_accepted_insurance` — contracted terms per clinic per insurer
- `payer_alert` — auto-populated by billing insert trigger

---

## Triggers (live on Railway)

| Trigger | Event | Table | What it does |
|---------|-------|-------|--------------|
| `after_appointment_completed` | AFTER UPDATE | `appointment` | Auto-creates billing with insurance math |
| `after_appointment_noshow` | AFTER UPDATE | `appointment` | Auto-logs No-Show to medical_history |
| `before_appointment_double_book` | BEFORE INSERT | `appointment` | Blocks same patient same time double-book |
| `after_billing_insert_check_threshold` | AFTER INSERT | `billing` | Fires payer_alert if claim reimbursement < contracted % |

Run from: `database/triggers.sql` — use MySQL Workbench (not Railway query editor for multi-statement triggers).

---

## Known Bugs Fixed

1. **Staff insurance dropdown empty (silent 403):** Staff onboarding called `/api/patient/care/insurance` which enforces `requireRole("patient")`. Staff gets 403 → catch silences it → dropdown empty. Fixed: use public endpoint `/api/auth/insurance-plans` instead.

2. **UTC date bug in Today's Schedule:** `new Date().toISOString().split("T")[0]` returns UTC date — off by one in US timezones. Fixed with local date:
   ```js
   function localDateStr() {
     const n = new Date();
     return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
   }
   ```
   Applied in both `staff_dashboard.js` and `reportController.js`.

3. **Admin edit modal dept dropdowns empty:** `loadDepartments()` had an early-return guard (`_departmentsLoaded`). Edit modal selects (`ep_dept`, `es_dept`) were added later and never got populated. Fixed: include them in the initial population loop alongside `ph_dept` and `st_dept`.

## Teammate Merge (from `main` — applied via rebase)

Two commits from Max's branch were merged in during rebase:

1. **`feat: standardize physician/staff emails to lastname###@audittrailhealth.com`**
   - All physician/staff login usernames are now auto-generated as `lastnameNNN@audittrailhealth.com` (e.g. `johnson101@audittrailhealth.com`)
   - `generateStaffEmail(lastName, cb)` function added to `adminController.js` — generates unique 3-digit suffix, retries on collision
   - Admin "Add Physician" and "Add Staff" forms now **require** a password (no silent default)
   - Seed updated: physician emails use `@audittrailhealth.com`, staff use `@audittrailhealth.com`

2. **`refactor: rename users.username → users.email`**
   - `users` table column renamed from `username` to `email`
   - `staffController.js` login response: `username` field → `email` field
   - `admin_dashboard.js` sidebar reads `user?.email` (not `user?.username`)
   - All `INSERT INTO users` queries updated to use `email` column name

---

## Module-Level Caches (important for understanding dashboard JS)

- `admin_dashboard.js`: `_physicianCache = {}`, `_staffCache = {}` — keyed by ID, populated during `loadPhysicians()` / `loadStaff()`, used to pre-fill edit modals instantly
- `physician_dashboard.js`: `_dashPatients = []`, `_allSpecialists = []` — populated from dashboard load, reused by Create Referral modal
- `window._currentPhysicianId` — set in `loadDashboard()`, reused by referral creation and incoming referral handlers

---

## Railway Migrations Still Needed (if starting fresh)

Run these SQL files in order on Railway query editor:
1. `database/Team_13_Medical_Clinic_DB.sql` — schema
2. `database/seed.sql` — seed data
3. `database/triggers.sql` — in MySQL Workbench (not Railway editor)
4. `database/add_today_appointments.sql` — today's demo appointments
5. `database/add_insurance_plans.sql` — expanded insurance list
6. `database/add_admin.sql` — admin rows
7. `database/add_admin_user.sql` — admin login

---

## Professor Must-Haves — Current Status

| # | Requirement | Status |
|---|-------------|--------|
| 1 | **Authentication** — patient, physician, staff, admin | ✅ All 4 portals working |
| 2 | **Data entry forms** — add, modify, delete per role | ✅ All roles covered |
| 3 | **Triggers** — at least 2 meaningful | ✅ 4 triggers live |
| 4 | **Data queries** — at least 3 | ✅ 3 parameterized report queries + insurance analytics queries |
| 5 | **Data reports** — at least 3 | ✅ Billing statement, daily schedule, physician activity |

### What Each Role Can Add / Modify / Delete

| Portal | Add | Modify | Delete |
|--------|-----|--------|--------|
| Patient | Book appointment | Edit profile | Cancel appointment |
| Physician | Add clinical note, create referral | Update appointment status, accept/reject referral | Delete own medical history note |
| Staff | Onboard patient, book appointment | Mark billing paid, update status | Cancel appointment |
| Admin | Add physician/staff, add insurance plan | Edit physician/staff, deactivate insurance | Delete physician/staff |

---

## Features Built (Completed)

### Patient Portal
- ✅ Book appointment — 4-step modal (physician → date → slot → reason)
- ✅ Cancel appointment
- ✅ Edit profile
- ✅ View billing statement with insurance math
- ✅ View referral status
- ✅ Registration: 3-step (removed insurance step — set later in care setup)

### Physician Portal
- ✅ View daily schedule + appointment list
- ✅ Update appointment status (Completed / No-Show / Cancelled / Scheduled)
- ✅ Undo last status change
- ✅ Add clinical note to patient
- ✅ Delete own medical history notes
- ✅ View incoming referrals — accept or reject
- ✅ Create outgoing referrals (PCP-initiated) — picks patient + specialist + reason
- ✅ View physician activity report (90-day window)

### Staff Portal
- ✅ Onboard new patient — insurance eligibility check → demographics → first appointment
- ✅ Book appointment for any patient (manual scheduling)
- ✅ Mark billing records as paid
- ✅ Today's Schedule report — filterable by date + location (UTC date bug fixed)
- ✅ Insurance dropdown uses public endpoint (not patient-only endpoint)

### Admin Portal
- ✅ Overview stats
- ✅ Manage physicians: add, edit, delete
- ✅ Manage staff: add, edit, delete
- ✅ Financial report grouped by clinic location
- ✅ Appointments report: filter by date + clinic location
- ✅ Insurance Analytics Dashboard:
  - Payer score cards (composite score per insurer)
  - Grouped bar chart: contracted vs actual reimbursement %
  - Donut chart: patient distribution by payer
  - Horizontal bar: appointment completion rate by payer
  - Alert banner for below-threshold claims
  - Manage accepted plans (add / deactivate)

### Database
- ✅ Trigger 1: auto-billing on appointment completion
- ✅ Trigger 2: no-show auto-logs to medical_history
- ✅ Trigger 3: double-booking prevention (BEFORE INSERT)
- ✅ Trigger 4: billing threshold alert (AFTER INSERT on billing)
- ✅ 3 parameterized report queries
- ✅ clinic_accepted_insurance + payer_alert tables created and seeded

---

## .env Format

```env
DB_HOST=your-host
DB_PORT=3306
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=team_13_medical_clinic_db
PORT=3000
```

---

## How To Run Locally

```bash
npm install
npm run dev     # nodemon auto-restart on changes
# or
npm start       # plain node
```

App runs at: `http://localhost:3000`

---

## Session Focus Guide

- **"Schema/DB session"** → `database/` folder, SQL design, triggers, migrations
- **"Backend session"** → `server/controllers/`, `server/routes/`, `server/db.js`
- **"Frontend session"** → `client/portals/`, `client/scripts/`, `client/styles/`
- **"Feature session: [name]"** → Full-stack work on one specific feature

## Demo Credentials (quick reference)

| Role | Username / Email | Password |
|------|-----------------|----------|
| Patient | alex.smith@email.com | Patient@123 |
| Patient | taylor.jones@email.com | Patient@123 |
| Physician (primary, Dallas) | johnson101@audittrailhealth.com | Doctor@123 |
| Physician (primary, Houston) | moore103@audittrailhealth.com | Doctor@123 |
| Physician (specialist, Dallas) | garcia102@audittrailhealth.com | Doctor@123 |
| Staff (Dallas) | adams201@audittrailhealth.com | Staff@123 |
| Staff (Houston) | brooks202@audittrailhealth.com | Staff@123 |
| Admin (global) | admin@ath.admin.com | Admin@123 |

> **Note:** Old-style credentials (`dr.johnson`, `staff.adams`) no longer work — emails were standardized in a teammate commit. Use the `@audittrailhealth.com` format above.
