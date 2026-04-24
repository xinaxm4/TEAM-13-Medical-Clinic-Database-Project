# Team 13 — Audit Trail Health
### CS 4347 — Database Systems | Medical Clinic Database Project

A full-stack medical clinic management system with role-based portals for patients, physicians, staff, and administrators. Built on Node.js + Express with a MySQL relational database hosted on Railway.

---

## 🌐 Hosted Application

**Live URL:** https://team-13-medical-clinic-database-project-production.up.railway.app

The application is fully deployed and accessible at the link above. No local setup is needed to evaluate the project — all four role portals are live and connected to the live Railway MySQL database.

---

## 👥 Login Credentials for Graders

### Patient Portal
**Login page:** `/client/auth/patient_login.html`

| Email | Password | Notes |
|-------|----------|-------|
| `alex.smith@email.com` | `Patient@123` | Has appointments, billing, referral |
| `taylor.jones@email.com` | `Patient@123` | Alternative patient account |

> New patient accounts can also be registered at `/client/auth/register.html`

---

### Physician & Staff Portal
**Login page:** `/client/auth/staff_login.html`

| Email | Password | Role | Location |
|-------|----------|------|----------|
| `johnson101@audittrailhealth.com` | `Doctor@123` | Primary Physician | Dallas |
| `moore103@audittrailhealth.com` | `Doctor@123` | Primary Physician | Houston |
| `garcia102@audittrailhealth.com` | `Doctor@123` | Specialist Physician | Dallas |
| `adams201@audittrailhealth.com` | `Staff@123` | Staff | Dallas |
| `brooks202@audittrailhealth.com` | `Staff@123` | Staff | Houston |

---

### Admin Portal
**Login page:** `/client/auth/staff_login.html`

| Email | Password | Scope |
|-------|----------|-------|
| `admin@ath.admin.com` | `Admin@123` | Global (all clinics) |

---

## 👥 Team Members

| Branch | Member | Contributions |
|--------|--------|---------------|
| `TinaT2` | Tina T. | Frontend dashboards, CSS, project structure, API integration, deployment, triggers, reports, insurance analytics |
| `MaxC` | Max C. | Backend auth, patient login/register, DB queries, email standardization |
| `Timi-A` | Timi A. | Database schema design, seed data, initial trigger definitions |
| `main` | All | Stable merged branch |

---

## 📁 Submitted Files — What's Included and What Each File Does

### Root
| File | Description |
|------|-------------|
| `server.js` | Express application entry point. Registers all route groups, serves static files from `client/`, and starts the HTTP server on the configured port. |
| `package.json` | Node.js project manifest. Lists all dependencies (`express`, `mysql2`, `bcryptjs`, `cors`, `dotenv`) and scripts (`npm start`, `npm run dev`, `npm run backup`). |
| `.env.example` | Template showing required environment variables. The real `.env` is gitignored and never committed. |
| `railway.toml` | Railway deployment configuration — tells Railway how to build and start the app. |

---

### `database/` — SQL Files

| File | Description |
|------|-------------|
| `Team_13_Medical_Clinic_DB.sql` | **Full schema** — all `CREATE TABLE` statements for every table in the database. Run this first on a fresh MySQL instance. |
| `seed.sql` | **Core seed data** — inserts clinics, departments, offices, physicians, staff, patients, users (bcrypt-hashed passwords), appointments, billing, medical history, referrals, diagnoses, treatments, and insurance records. Run this second. |
| `triggers.sql` | **All 4 database triggers** — must be run in MySQL Workbench (not Railway's query editor) due to multi-statement `DELIMITER` syntax. See trigger documentation below. |
| `queries.sql` | Reference SQL file containing the 3 parameterized report queries used by the backend. Included for academic review; these queries are also embedded in `reportController.js`. |
| `add_today_appointments.sql` | Migration that inserts 4 demo appointments dated to today (`CURDATE()`) so the Daily Schedule report is non-empty during a demo. Uses `INSERT IGNORE` — safe to re-run. |
| `add_insurance_plans.sql` | Migration that expands the insurance table from 3 to 12 real-world payers (Aetna, Anthem, BlueCross, Cigna, Humana, Kaiser, Medicaid, Medicare, Molina, Oscar, UnitedHealth, WellCare). Uses `INSERT IGNORE`. |
| `add_admin.sql` | Inserts admin rows into the `admin` table linking the global admin account to all clinics. |
| `add_admin_user.sql` | Inserts the admin login into the `users` table with a bcrypt-hashed password. |
| `admin_analytics_trigger_migration.sql` | Creates the `clinic_accepted_insurance` and `payer_alert` tables needed for the insurance analytics dashboard. Also seeds the 7 initial contracted-plan rows. |
| `physician_performance_seed.sql` | Seeds additional historical appointment data used to give physicians non-zero performance scores for the physician deletion trigger and admin analytics. |
| `update_demo_appointment_dates.sql` | Helper migration — re-dates the 4 demo appointments to `CURDATE()`. Run this if the demo data falls behind today's date. |
| `insurance_triggers.sql` | Standalone file for the billing threshold trigger (`after_billing_insert_check_threshold`). Included in `triggers.sql` as well. |
| `migrate_nullable_care.sql` | One-time migration that makes `patient.physician_id` and `patient.insurance_id` nullable (needed for the 3-step patient onboarding flow). |
| `onboarding_schema.sql` | Schema additions supporting the staff patient onboarding wizard (new patient status columns). |
| `backup.js` | Node.js script (`npm run backup`) that exports a timestamped SQL dump to `database/backups/` and keeps only the last 10 backups. |

---

### `server/` — Backend (Node.js / Express)

#### `server/db.js`
MySQL connection pool using `mysql2`. Reads credentials from `.env`. All database queries across the application go through this pool.

#### `server/middleware/auth.js`
`requireRole(...roles)` middleware factory. Every protected API route passes through this — it reads `user_id` from the request, validates it against the `users` table, and rejects requests from the wrong role with HTTP 403.

#### `server/controllers/`

| File | What it does |
|------|-------------|
| `authController.js` | Patient registration (creates `users` + `patient` rows), patient login, public insurance plan listing. Passwords hashed with bcryptjs (10 salt rounds). |
| `patientController.js` | All patient-facing data: dashboard, appointments, available booking slots, book appointment, cancel appointment, care setup (physician + insurance assignment), referral request. |
| `staffController.js` | Physician and staff logic: dashboard data for both roles, appointment status updates (with undo), clinical note add/delete, referral create/accept/reject, staff onboarding (3-step: insurance check → demographics → first appointment), manual appointment booking by staff, mark billing paid. |
| `adminController.js` | Admin CRUD for physicians and staff (with `generateStaffEmail()` for standardized email generation). Full insurance analytics: payer scorecard (composite score from live billing + appointment data), accepted plan management (add/deactivate), payer alert retrieval. Financial and appointment reports. |
| `reportController.js` | Three parameterized report queries: patient billing statement (5-table JOIN), daily schedule (filterable by date + clinic), physician 90-day activity (conditional aggregation using `CASE WHEN` inside `SUM`). Also: missed/cancelled date-range report, upcoming appointments lookahead. |
| `locationsController.js` | Clinic locations data for the public Locations page. |

#### `server/routes/`

| File | Route prefix | Who uses it |
|------|-------------|-------------|
| `authRoutes.js` | `/api/auth` | Patient login, registration, public insurance endpoint |
| `patientRoutes.js` | `/api/patient` | Patient portal (protected: `requireRole("patient")`) |
| `staffRoutes.js` | `/api/staff` | Physician + staff portals (protected by role) |
| `adminRoutes.js` | `/api/admin` | Admin portal (protected: `requireRole("admin")`) |
| `reportRoutes.js` | `/api/reports` | Report endpoints (role-protected per report) |
| `locationsRoutes.js` | `/api/locations` | Public locations data |

---

### `client/` — Frontend (Vanilla HTML / CSS / JavaScript)

#### `client/pages/`
| File | Description |
|------|-------------|
| `home_page.html` | Public landing page |
| `about.html` | About page |
| `locations/locations.html` | Clinic locations with map data |

#### `client/auth/`
| File | Description |
|------|-------------|
| `patient_login.html` | Patient login form |
| `staff_login.html` | Shared login for physicians, staff, and admin |
| `register.html` | 3-step patient registration wizard (name/email/password → demographics → confirmation) |

#### `client/portals/`
| File | Description |
|------|-------------|
| `patient_dashboard.html` | Patient portal: overview, appointments, health records, billing, profile, care setup |
| `physician_dashboard.html` | Physician portal: daily schedule, appointment management, patient notes, referrals (create and incoming), activity report |
| `staff_dashboard.html` | Staff portal: appointment management, patient onboarding, billing queue, 3-tab reports (daily schedule, missed/cancelled, upcoming) |
| `admin_dashboard.html` | Admin portal: overview stats, physician/staff CRUD, financial reports, insurance analytics dashboard with Chart.js charts |

#### `client/scripts/auth/`
| File | Description |
|------|-------------|
| `login.js` | Patient login — posts credentials, reads role from response, routes to correct portal |
| `staff_login.js` | Physician/staff/admin login — same pattern, handles three roles |
| `register.js` | 3-step registration wizard logic |

#### `client/scripts/portals/`
| File | Description |
|------|-------------|
| `patient_dashboard.js` | All patient portal interactivity: load dashboard data, appointment booking 4-step modal, cancel, billing statement, care setup, referral status |
| `physician_dashboard.js` | Physician portal: daily schedule, appointment status updates + undo, clinical notes CRUD, referral create + accept/reject, activity report rendering |
| `staff_dashboard.js` | Staff portal: appointment management, patient onboarding wizard (3-step modal), billing mark-paid, today's schedule, missed/cancelled, upcoming reports |
| `admin_dashboard.js` | Admin portal: physician/staff tables with add/edit/delete modals, insurance analytics (Chart.js charts, score cards, payer detail modal, manage plans tab), financial and appointment reports |

#### `client/styles/`
| File | Description |
|------|-------------|
| `dashboard.css` | Shared styles for all four portals — sidebar, nav, cards, tables, modals, charts |
| `auth/` | Login and registration page styles |
| `pages/` | Public page styles |

---

## ⚙️ Local Setup Instructions

Follow these steps to run the application locally against your own MySQL instance.

### Prerequisites
- **Node.js** v18 or higher — download at [nodejs.org](https://nodejs.org)
- **MySQL** 8.0 or higher — via MySQL Workbench or homebrew
- **Git**

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/xinaxm4/TEAM-13-Medical-Clinic-Database-Project.git
cd TEAM-13-Medical-Clinic-Database-Project
```

---

### Step 2 — Install Node dependencies

```bash
npm install
```

This installs: `express`, `mysql2`, `bcryptjs`, `cors`, `dotenv`, and `nodemon` (dev).

---

### Step 3 — Create the database

Open MySQL Workbench and connect to your local MySQL server. Then run the SQL files in this exact order:

| Order | File | How to run |
|-------|------|-----------|
| 1 | `database/Team_13_Medical_Clinic_DB.sql` | MySQL Workbench → Open SQL Script → Run |
| 2 | `database/seed.sql` | MySQL Workbench → Open SQL Script → Run |
| 3 | `database/triggers.sql` | MySQL Workbench → Open SQL Script → Run |
| 4 | `database/add_today_appointments.sql` | Railway query editor or Workbench |
| 5 | `database/add_insurance_plans.sql` | Railway query editor or Workbench |
| 6 | `database/add_admin.sql` | Railway query editor or Workbench |
| 7 | `database/add_admin_user.sql` | Railway query editor or Workbench |
| 8 | `database/admin_analytics_trigger_migration.sql` | Railway query editor or Workbench |
| 9 | `database/physician_performance_seed.sql` | Railway query editor or Workbench |

> **Important:** `triggers.sql` (step 3) must be run in **MySQL Workbench**, not Railway's query editor. Railway's editor does not support the `DELIMITER $$` syntax required for multi-statement trigger bodies. In Workbench: File → Open SQL Script → select `triggers.sql` → click the lightning bolt to run.

---

### Step 4 — Configure environment variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=team_13_medical_clinic_db
PORT=3000
```

Replace `your_mysql_username` and `your_mysql_password` with your local MySQL credentials.

---

### Step 5 — Start the server

```bash
npm run dev    # development mode — auto-restarts on file changes (nodemon)
# or
npm start      # production mode — plain node
```

---

### Step 6 — Open the app

Visit: **http://localhost:3000**

The home page loads automatically. Use the navigation or go directly to a login page:

| Portal | URL |
|--------|-----|
| Patient login | `http://localhost:3000/client/auth/patient_login.html` |
| Physician / Staff / Admin login | `http://localhost:3000/client/auth/staff_login.html` |
| Patient registration | `http://localhost:3000/client/auth/register.html` |

Use the same demo credentials listed at the top of this file.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Backend | Node.js + Express 5 |
| Database | MySQL 8 via `mysql2` connection pool |
| Auth | `bcryptjs` password hashing (10 salt rounds) |
| Charts | Chart.js 4 via CDN (admin insurance analytics) |
| Deployment | Railway (auto-deploy on push to `main`) |

---

## ✅ Professor Requirements Checklist

| # | Requirement | Status | Where to see it |
|---|-------------|--------|-----------------|
| 1 | **Authentication** — multiple user roles | ✅ | 4 separate portals: patient, physician, staff, admin |
| 2 | **Data entry forms** — add, modify, delete per role | ✅ | See role breakdown below |
| 3 | **Database triggers** — at least 2 meaningful | ✅ | 4 triggers live in Railway (see Triggers section) |
| 4 | **Data queries** — at least 3 | ✅ | 3 parameterized report queries + 2 insurance analytics queries |
| 5 | **Data reports** — at least 3 | ✅ | Billing statement, daily schedule, physician activity + 2 more |

### Data Entry Forms by Role

| Portal | ADD | MODIFY | DELETE |
|--------|-----|--------|--------|
| **Patient** | Book appointment (4-step modal), register new account | Edit profile, assign physician/insurance | Cancel appointment |
| **Physician** | Add clinical note, create referral | Update appointment status, accept/reject referral, undo status | Delete own medical history notes |
| **Staff** | Onboard new patient (3-step wizard), book appointment | Mark billing paid, update appointment status | Cancel appointment |
| **Admin** | Add physician, add staff member, add insurance plan to clinic | Edit physician info, edit staff info, deactivate insurance plan | Delete physician (trigger-gated), delete staff (trigger-gated) |

---

## 🔁 Database Triggers

All 4 triggers are live on the Railway MySQL database. Run `SHOW TRIGGERS FROM railway;` in Workbench to verify.

| Trigger | Table | Event | Business Rule |
|---------|-------|-------|---------------|
| `after_appointment_completed` | `appointment` | `AFTER UPDATE` | When physician marks appointment Completed → automatically calculates billing using patient's insurance coverage %, inserts row into `billing` with `insurance_paid_amount`, `patient_owed`, and 30-day `due_date`. Zero manual data entry required. |
| `after_appointment_noshow` | `appointment` | `AFTER UPDATE` | When appointment is marked No-Show → automatically inserts an entry into `medical_history` with date, physician, and reason. HIPAA-aligned audit trail. |
| `before_appointment_double_book` | `appointment` | `BEFORE INSERT` | Checks if patient already has a non-cancelled appointment at the same date + time. If so, raises `SQLSTATE '45000'` — the error message is returned to the booking UI. Enforced at the DB level, cannot be bypassed from the frontend. |
| `after_billing_insert_check_threshold` | `billing` | `AFTER INSERT` | After every billing insert, checks if the insurance reimbursement % for that claim falls below the clinic's contracted threshold for that payer. If so, inserts a row into `payer_alert`. Alert banner appears on the admin insurance dashboard. |

**Additional triggers (in `triggers.sql` — used by admin portal):**

| Trigger | Table | Event | Business Rule |
|---------|-------|-------|---------------|
| `before_insurance_plan_deactivated` | `clinic_accepted_insurance` | `BEFORE UPDATE` | Calculates a composite payer score (50% financial + 30% appointment completion + 20% claims reliability) on the fly from live billing + appointment data. **Blocks** deactivation if score ≥ 70 — good payers cannot be arbitrarily dropped. |
| `after_insurance_plan_deactivated` | `clinic_accepted_insurance` | `AFTER UPDATE` | When deactivation is allowed (score < 70), automatically notifies every patient on that plan with a 60-day notice in `patient_notification`. |
| `before_physician_delete_check` | `physician` | `BEFORE DELETE` | Two separate checks: (1) blocks deletion if physician has upcoming scheduled appointments — admin must reassign first; (2) blocks deletion if physician's 90-day performance score ≥ 80 — high performers are protected. |
| `before_staff_delete_check` | `staff` | `BEFORE DELETE` | Enforces staffing ratio: 1 staff per 50 active patients, minimum 1. Blocks deletion if remaining staff would fall below required minimum. |

---

## 📊 Reports

Three formatted reports are accessible from the portals and powered by multi-table SQL queries with `JOIN`, `GROUP BY`, `ORDER BY`, and conditional aggregation (`CASE WHEN` inside `SUM`).

| Report | Portal | Access | Query complexity |
|--------|--------|--------|-----------------|
| **Patient Billing Statement** | Patient → Billing tab → "View Full Statement" | `GET /api/reports/billing-statement?patient_id=X` | 5-table JOIN: `billing` + `appointment` + `physician` + `office` + `insurance` |
| **Daily Appointment Schedule** | Staff → Appointments → Reports tab | `GET /api/reports/daily-schedule?date=YYYY-MM-DD` | 5-table JOIN across all clinic locations; filterable by date + clinic |
| **Physician 90-Day Activity** | Physician → Reports section | `GET /api/reports/physician-activity?physician_id=X` | Conditional aggregation: `SUM(CASE WHEN status = 'Completed' ...)` computes completion rate, no-show rate, revenue, unique patients |
| **Missed / Cancelled Report** | Staff → Reports tab | `GET /api/reports/missed-cancelled?start=...&end=...` | Date-range filter on No-Show + Cancelled statuses with patient contact info |
| **Upcoming Appointments** | Staff → Reports tab | `GET /api/reports/upcoming?days=7\|30\|90` | Forward-looking window query with physician and patient detail |

---

## 🔒 Security Features

- Passwords hashed with `bcryptjs` — the database never stores plain text
- All SQL queries use parameterized placeholders — no string concatenation, no SQL injection risk
- Role-based access enforced server-side via `requireRole()` middleware on every protected route
- HIPAA-style idle auto-logout after 15 minutes of inactivity on all four portals
- `.env` is gitignored — credentials are never committed to the repository
- `/api/auth/insurance-plans` is intentionally public (used by patient registration and staff onboarding before login exists)

---

## 🗄️ Database Schema Summary

### Tables

| Table | Rows | Notes |
|-------|------|-------|
| `clinic` | 8 | Dallas, Houston, Austin, New York, Chicago, LA, Phoenix, Seattle |
| `department` | 46 | Primary and specialist departments per clinic |
| `office` | 8 | One office per clinic |
| `physician` | 65 | 38 primary, 27 specialist; `physician_type` column |
| `work_schedule` | 138 | Days + hours per physician |
| `insurance` | 12 | All major US payers |
| `staff` | 8 | Front desk / admin staff |
| `users` | 78+ | All roles; bcrypt-hashed passwords |
| `patient` | 5 | Alex, Taylor, Morgan, Jordan, Casey |
| `appointment` | 12+ | Mix of Scheduled, Completed, No-Show statuses |
| `medical_history` | 6 | Includes auto-logged No-Show entries from trigger |
| `diagnosis` | 3 | Linked to completed appointments |
| `treatment` | 3 | With follow-up dates |
| `billing` | 5+ | Auto-generated by trigger; includes insurance math |
| `referral` | 2+ | Physician-initiated; statuses: Requested → Issued → Accepted → Scheduled |
| `clinic_accepted_insurance` | 7 | Contracted terms per clinic-insurer pair |
| `payer_alert` | auto | Populated by billing threshold trigger |
| `patient_notification` | auto | Insurance deactivation notices |
| `audit_log` | auto | Action audit trail |
| `appointment_status` | 4 | Scheduled, Completed, Cancelled, No-Show |

### Key Schema Design Decisions

- `physician.physician_type` — ENUM('primary', 'specialist') controls referral flow direction and which portal tabs are visible
- `billing.insurance_paid_amount` + `billing.patient_owed` — pre-calculated by the `after_appointment_completed` trigger; never manually entered
- `clinic_accepted_insurance.reimbursement_threshold_pct` — the contracted floor percentage; compared against actual reimbursements by the threshold trigger
- `users.email` — the unified login identifier across all roles (was `username` — renamed in a schema migration)
- `appointment.physician_id` — nullable (supports physician deletion while preserving historical records)

---

## 🌐 Project Structure

```
TEAM-13-Medical-Clinic-Database-Project/
├── server.js                              ← Express entry point
├── .env.example                           ← Environment variable template
├── railway.toml                           ← Railway deployment config
├── package.json                           ← Dependencies and scripts
│
├── client/
│   ├── pages/                             ← Public pages (home, about, locations)
│   ├── auth/
│   │   ├── patient_login.html             ← Patient login
│   │   ├── staff_login.html               ← Physician / staff / admin login
│   │   └── register.html                  ← Patient registration (3-step)
│   ├── portals/
│   │   ├── patient_dashboard.html         ← Patient portal
│   │   ├── physician_dashboard.html       ← Physician portal
│   │   ├── staff_dashboard.html           ← Staff portal
│   │   └── admin_dashboard.html           ← Admin portal (with Chart.js)
│   ├── scripts/
│   │   ├── auth/                          ← Login + register JS
│   │   └── portals/                       ← Dashboard JS (one file per role)
│   └── styles/
│       ├── dashboard.css                  ← Shared portal styles
│       ├── auth/                          ← Login/register styles
│       └── pages/                         ← Public page styles
│
├── server/
│   ├── db.js                              ← mysql2 connection pool
│   ├── middleware/auth.js                 ← requireRole() route guard
│   ├── utils/adminScope.js               ← Global vs clinic-scoped admin helper
│   └── controllers/
│       ├── authController.js              ← Login + registration
│       ├── patientController.js           ← All patient-facing logic
│       ├── staffController.js             ← Physician + staff logic
│       ├── adminController.js             ← Admin CRUD + insurance analytics
│       ├── reportController.js            ← 5 formatted reports
│       └── locationsController.js         ← Public locations data
│   └── routes/
│       ├── authRoutes.js
│       ├── patientRoutes.js
│       ├── staffRoutes.js
│       ├── adminRoutes.js
│       ├── reportRoutes.js
│       └── locationsRoutes.js
│
└── database/
    ├── Team_13_Medical_Clinic_DB.sql      ← FULL SCHEMA — run this first
    ├── seed.sql                           ← CORE SEED DATA — run this second
    ├── triggers.sql                       ← ALL TRIGGERS — run in Workbench
    ├── queries.sql                        ← Reference SQL for report queries
    ├── add_today_appointments.sql         ← Demo appointments for today
    ├── add_insurance_plans.sql            ← Expanded 12-payer insurance list
    ├── add_admin.sql                      ← Admin clinic rows
    ├── add_admin_user.sql                 ← Admin login credentials
    ├── admin_analytics_trigger_migration.sql  ← Insurance analytics tables + seed
    ├── physician_performance_seed.sql     ← Historical data for physician scores
    └── update_demo_appointment_dates.sql  ← Re-date demo data to today
```

---

## 🔗 API Routes Summary

### Auth (`/api/auth`)
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/register` | Create user and patient records |
| `POST` | `/login` | Patient login |
| `GET` | `/insurance-plans` | All insurance plans (public) |

### Patient (`/api/patient`)
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/dashboard` | Full patient dashboard data |
| `PUT` | `/profile` | Update profile |
| `GET` | `/appointments` | List appointments |
| `GET` | `/appointments/slots` | Available time slots for booking |
| `POST` | `/appointments/book` | Book appointment |
| `PUT` | `/appointments/:id/cancel` | Cancel appointment |
| `GET` | `/care/cities` | City list |
| `GET` | `/care/physicians` | Physicians by city |
| `PUT` | `/care/assign` | Assign physician and insurance |
| `GET` | `/referral/specialists` | Specialists by city |
| `POST` | `/referral/request` | Request referral |

### Staff & Physician (`/api/staff`)
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/login` | Physician or staff login |
| `GET` | `/physician/dashboard` | Physician dashboard data |
| `GET` | `/staff/dashboard` | Staff dashboard data |
| `GET` | `/physician/referrals` | Incoming referrals for specialist |
| `PUT` | `/referral/:id/status` | Accept or reject referral |
| `POST` | `/referral/create` | Primary physician creates referral |
| `POST` | `/physician/note` | Add clinical note |
| `PUT` | `/appointment/:id/status` | Update appointment status |
| `PUT` | `/appointment/:id/undo-status` | Undo last status change |
| `DELETE` | `/medical-history/:id` | Delete medical history note |
| `GET` | `/patients` | All patients |
| `GET` | `/physicians` | All physicians |
| `GET` | `/physicians/accepting` | Physicians accepting new patients |
| `GET` | `/specialists` | All specialist physicians |
| `POST` | `/appointments/book` | Staff books appointment |
| `POST` | `/patients/onboard` | Onboard new patient |
| `PUT` | `/billing/:id/pay` | Mark billing record paid |

### Admin (`/api/admin`)
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/login` | Admin login |
| `GET` | `/dashboard` | Admin overview stats |
| `GET` | `/clinic-report` | Financial report by clinic |
| `GET` | `/physicians` | All physicians |
| `GET` | `/staff-members` | All staff |
| `POST` | `/add-physician` | Add physician |
| `POST` | `/add-staff` | Add staff member |
| `PUT` | `/physician/:id` | Edit physician |
| `DELETE` | `/physician/:id` | Delete physician (trigger-gated) |
| `PUT` | `/staff/:id` | Edit staff member |
| `DELETE` | `/staff/:id` | Delete staff member (trigger-gated) |
| `GET` | `/insurance/scorecard` | Composite payer scorecard |
| `GET` | `/insurance/payer-detail` | Single payer breakdown |
| `GET` | `/insurance/accepted` | Accepted plans per clinic |
| `POST` | `/insurance/accept` | Add insurance plan to clinic |
| `PUT` | `/insurance/:id/deactivate` | Deactivate plan (score-gated by trigger) |
| `GET` | `/insurance/alerts` | Unread payer alerts |
| `PUT` | `/insurance/alerts/:id/read` | Mark alert read |

### Reports (`/api/reports`)
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/billing-statement` | Patient billing statement (5-table JOIN) |
| `GET` | `/daily-schedule` | Daily schedule by date and clinic |
| `GET` | `/physician-activity` | Physician 90-day activity report |
| `GET` | `/missed-cancelled` | No-shows and cancellations by date range |
| `GET` | `/upcoming` | Upcoming appointments (7/30/90-day window) |
