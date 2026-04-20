# Team 13 — Audit Trail Health

A full-stack medical clinic management system with role-based portals for patients, physicians, staff, and administrators.

**Live URL:** [team-13-medical-clinic-database-project-production.up.railway.app](https://team-13-medical-clinic-database-project-production.up.railway.app)

---

## Team Members

| Branch | Member | Contributions |
|--------|--------|---------------|
| `TinaT2` | Tina T. | Frontend, dashboards, CSS, project structure, API integration, deployment |
| `MaxC` | Max C. | Backend auth, patient login/register, DB queries |
| `Timi-A` | Timi A. | Database schema, seed data, triggers |
| `main` | All | Stable merged branch |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | Node.js + Express |
| Database | MySQL via `mysql2` connection pool |
| Auth | `bcryptjs` password hashing |
| Charts | Chart.js 4 via CDN |
| Deployment | Railway (auto-deploy on push to `main`) |

---

## Features

### Patient Portal
- 3-step registration (no insurance required upfront)
- View dashboard, upcoming and past appointments, billing, and referral status
- Book and cancel appointments via a 4-step modal (physician → date → slot → reason)
- Edit profile information
- Assign primary physician and insurance plan (care setup)
- View referrals issued by their primary physician

### Physician Portal

**Primary Physicians**
- View daily schedule and full appointment history
- Update appointment status (Completed, No-Show, Cancelled, Scheduled)
- Undo the last status change
- Add clinical notes to patient records after appointments
- Delete their own notes
- Create specialist referrals on behalf of patients
- View 90-day physician activity report

**Specialist Physicians**
- View daily schedule and full appointment history
- Update appointment status and undo changes
- Add and delete clinical notes
- View full referral history directed to them (all statuses)
- Accept or reject incoming referrals from primary physicians

### Staff Portal
- Onboard new patients via a 3-step wizard (insurance verification → demographics → first appointment)
- Book appointments for any patient
- Patient check-in / check-out queue management
- Mark billing records as paid with payment method and reference number
- **Appointment Reports** (3 tabs):
  - *Daily Schedule* — all appointments for any selected date with summary stats; auto-loads on tab open
  - *Missed / Cancelled* — date-range report of no-shows and cancellations with patient phone numbers for follow-up
  - *Upcoming* — 7 to 90-day lookahead of all scheduled appointments

### Admin Portal
- Dashboard summary statistics
- Manage physicians: add, edit, delete
- Manage staff: add, edit, delete; termination eligibility check enforces minimum staffing ratios
- Clinic financial report grouped by location
- Appointments report filtered by date and clinic
- Insurance Analytics Dashboard:
  - Composite payer scorecard (weighted formula across 5 dimensions)
  - Grouped bar chart: contracted vs actual reimbursement %
  - Donut chart: patient distribution by payer
  - Horizontal bar: appointment completion rate by payer
  - Alert banner for below-threshold claims
  - Manage accepted insurance plans per clinic (add / deactivate); deactivation blocked if payer composite score ≥ 70

---

## Business Logic Rules

| Rule | Where enforced |
|------|---------------|
| Referrals are created by the primary physician, not the patient | Physician portal only |
| Specialist physicians cannot create new referrals | UI hidden based on `physician_type` |
| Staff termination blocked if it would leave clinic understaffed | `min_staff = MAX(2, CEIL(patients / 10))` |
| Insurance deactivation blocked if composite payer score ≥ 70 | Admin portal; backend check |
| Billing auto-created when appointment is marked Completed | DB trigger |
| No-show auto-logged to medical history | DB trigger |
| Double-booking for same patient at same time blocked | DB trigger (BEFORE INSERT) |
| Payer alert auto-generated when claim reimbursement falls below contracted % | DB trigger (AFTER INSERT on billing) |

---

## Demo Credentials

### Patient Portal
**Login URL:** `/client/auth/patient_login.html`

| Email | Password |
|-------|----------|
| `alex.smith@email.com` | `Patient@123` |
| `taylor.jones@email.com` | `Patient@123` |

New patients can register at `/client/auth/register.html`.

### Physician & Staff Portal
**Login URL:** `/client/auth/staff_login.html`

| Email | Password | Role | Location |
|-------|----------|------|----------|
| `johnson101@audittrailhealth.com` | `Doctor@123` | Physician (primary) | Dallas |
| `moore103@audittrailhealth.com` | `Doctor@123` | Physician (primary) | Houston |
| `garcia102@audittrailhealth.com` | `Doctor@123` | Physician (specialist) | Dallas |
| `adams201@audittrailhealth.com` | `Staff@123` | Staff | Dallas |
| `brooks202@audittrailhealth.com` | `Staff@123` | Staff | Houston |

### Admin Portal
**Login URL:** `/client/auth/staff_login.html`

| Email | Password |
|-------|----------|
| `admin@ath.admin.com` | `Admin@123` |

---

## Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/xinaxm4/TEAM-13-Medical-Clinic-Database-Project.git
cd TEAM-13-Medical-Clinic-Database-Project
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:

```env
DB_HOST=your-host
DB_PORT=3306
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=team_13_medical_clinic_db
PORT=3000
```

### 4. Start the server
```bash
npm run dev    # nodemon auto-restart
npm start      # plain node
```

### 5. Open the app
Visit [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
TEAM-13-Medical-Clinic-Database-Project/
├── server.js                        ← Express entry point
├── .env                             ← DB credentials (never commit)
├── railway.toml
├── package.json
│
├── client/
│   ├── pages/                       ← Home, About, Locations
│   ├── auth/                        ← Login and registration pages
│   ├── portals/                     ← Role dashboards (HTML)
│   ├── scripts/
│   │   ├── auth/                    ← Login/register JS
│   │   └── portals/                 ← Dashboard JS per role
│   └── styles/                      ← dashboard.css + auth styles
│
├── server/
│   ├── db.js                        ← mysql2 pool
│   ├── middleware/auth.js           ← requireRole() middleware
│   └── controllers/
│       ├── authController.js
│       ├── patientController.js
│       ├── staffController.js       ← Physician + staff logic
│       ├── adminController.js       ← CRUD + insurance analytics
│       ├── reportController.js      ← 5 report queries
│       └── locationsController.js
│
├── server/routes/
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   ├── staffRoutes.js
│   ├── adminRoutes.js
│   ├── reportRoutes.js
│   └── locationsRoutes.js
│
└── database/
    ├── Team_13_Medical_Clinic_DB.sql         ← Full schema
    ├── seed.sql                              ← Core seed data
    ├── triggers.sql                          ← All 4 triggers
    ├── queries.sql                           ← Reference SQL
    ├── add_today_appointments.sql            ← Demo appointments
    ├── add_insurance_plans.sql               ← Expanded payer list
    ├── add_admin.sql                         ← Admin clinic rows
    ├── add_admin_user.sql                    ← Admin login
    ├── update_demo_appointment_dates.sql     ← Re-date demo appts to CURDATE()
    └── admin_analytics_trigger_migration.sql ← Insurance analytics tables
```

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/register` | Create user and patient records |
| `POST` | `/api/auth/login` | Patient login |
| `GET` | `/api/auth/insurance-plans` | Public — used by registration and staff onboarding |

### Patient
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/patient/dashboard` | Full patient dashboard data |
| `PUT` | `/api/patient/profile` | Update profile |
| `GET` | `/api/patient/appointments` | List appointments |
| `GET` | `/api/patient/appointments/slots` | Available time slots |
| `POST` | `/api/patient/appointments/book` | Book appointment |
| `PUT` | `/api/patient/appointments/:id/cancel` | Cancel appointment |
| `GET` | `/api/patient/care/cities` | City list |
| `GET` | `/api/patient/care/physicians` | Physicians by city |
| `GET` | `/api/patient/care/insurance` | Insurance plans (patient role) |
| `PUT` | `/api/patient/care/assign` | Assign physician and insurance |

### Staff & Physician
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/staff/login` | Physician or staff login |
| `GET` | `/api/staff/physician/dashboard` | Physician dashboard data |
| `GET` | `/api/staff/staff/dashboard` | Staff dashboard data |
| `GET` | `/api/staff/all-schedules` | All physician schedules |
| `GET` | `/api/staff/physician/referrals` | Incoming referrals for a specialist |
| `PUT` | `/api/staff/referral/:id/status` | Accept or reject referral |
| `POST` | `/api/staff/referral/create` | Primary physician creates referral |
| `POST` | `/api/staff/physician/note` | Add clinical note |
| `PUT` | `/api/staff/appointment/:id/status` | Update appointment status |
| `PUT` | `/api/staff/appointment/:id/undo-status` | Undo last status change |
| `DELETE` | `/api/staff/medical-history/:id` | Delete medical history note |
| `GET` | `/api/staff/patients` | All patients |
| `GET` | `/api/staff/physicians` | All physicians |
| `GET` | `/api/staff/physicians/accepting` | Physicians accepting new patients |
| `GET` | `/api/staff/specialists` | All specialist physicians |
| `POST` | `/api/staff/appointments/book` | Staff books appointment |
| `POST` | `/api/staff/patients/onboard` | Onboard new patient |
| `PUT` | `/api/staff/billing/:id/pay` | Mark billing record paid |

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/admin/login` | Admin login |
| `GET` | `/api/admin/dashboard` | Admin overview stats |
| `GET` | `/api/admin/clinic-report` | Financial report by clinic |
| `GET` | `/api/admin/physicians` | All physicians |
| `GET` | `/api/admin/staff-members` | All staff |
| `GET` | `/api/admin/departments` | All departments |
| `GET` | `/api/admin/offices` | All offices |
| `POST` | `/api/admin/add-physician` | Add physician |
| `POST` | `/api/admin/add-staff` | Add staff member |
| `PUT` | `/api/admin/physician/:id` | Edit physician |
| `DELETE` | `/api/admin/physician/:id` | Delete physician |
| `PUT` | `/api/admin/staff/:id` | Edit staff member |
| `DELETE` | `/api/admin/staff/:id` | Delete staff member |
| `GET` | `/api/admin/staff/:id/termination-check` | Check termination eligibility |
| `DELETE` | `/api/admin/staff/:id/terminate` | Terminate staff member |
| `GET` | `/api/admin/insurance/scorecard` | Payer composite scorecard |
| `GET` | `/api/admin/insurance/payer-detail` | Single payer breakdown |
| `GET` | `/api/admin/insurance/accepted` | Accepted plans per clinic |
| `POST` | `/api/admin/insurance/accept` | Add insurance plan to clinic |
| `PUT` | `/api/admin/insurance/:id/deactivate` | Deactivate plan (score-gated) |
| `GET` | `/api/admin/insurance/alerts` | Unread payer alerts |
| `PUT` | `/api/admin/insurance/alerts/:id/read` | Mark alert read |

### Reports
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/reports/billing-statement` | Patient billing statement |
| `GET` | `/api/reports/daily-schedule` | Daily schedule by date and clinic |
| `GET` | `/api/reports/physician-activity` | Physician 90-day activity report |
| `GET` | `/api/reports/missed-cancelled` | No-shows and cancellations by date range |
| `GET` | `/api/reports/upcoming` | Upcoming scheduled appointments (7–90 day window) |

---

## Database

### Table Summary

| Table | Rows | Notes |
|-------|------|-------|
| `clinic` | 8 | Dallas, Houston, Austin, New York, Chicago, LA, Phoenix, Seattle |
| `department` | 46 | |
| `office` | 8 | One per city |
| `physician` | 65 | 38 primary, 27 specialist; `physician_type` column |
| `work_schedule` | 138 | |
| `insurance` | 12 | Expanded payer list |
| `staff` | 8 | |
| `users` | 78+ | All bcrypt hashed |
| `patient` | 5 | Demo accounts |
| `appointment` | 12 | Includes 4 demo appointments for today |
| `medical_history` | 6 | |
| `billing` | 5 | Auto-generated by trigger |
| `referral` | 2+ | Physician-initiated |
| `clinic_accepted_insurance` | 7 | Contract terms per clinic |
| `payer_alert` | auto | Trigger-populated |
| `audit_log` | auto | Action audit trail |

### Triggers

| Trigger | Event | Purpose |
|---------|-------|---------|
| `after_appointment_completed` | `AFTER UPDATE` on `appointment` | Auto-creates billing with insurance math |
| `after_appointment_noshow` | `AFTER UPDATE` on `appointment` | Auto-logs no-show to medical history |
| `before_appointment_double_book` | `BEFORE INSERT` on `appointment` | Blocks same-patient double-booking |
| `after_billing_insert_check_threshold` | `AFTER INSERT` on `billing` | Fires payer alert if reimbursement falls below contracted % |

### Setup Order (fresh database)

Run these SQL files in order on your MySQL instance. Use MySQL Workbench for `triggers.sql` (multi-statement syntax not supported in Railway's query editor).

1. `database/Team_13_Medical_Clinic_DB.sql` — schema
2. `database/seed.sql` — core seed data
3. `database/triggers.sql` — 4 triggers *(MySQL Workbench only)*
4. `database/add_today_appointments.sql` — demo appointments
5. `database/add_insurance_plans.sql` — expanded payer list
6. `database/add_admin.sql` — admin clinic rows
7. `database/add_admin_user.sql` — admin login
8. `database/admin_analytics_trigger_migration.sql` — insurance analytics tables

**To refresh demo appointment dates** (run whenever demo data falls behind today's date):
```sql
-- database/update_demo_appointment_dates.sql
UPDATE appointment SET appointment_date = CURDATE() WHERE appointment_id IN (9, 10, 11, 12);
```

---

## Security

- Passwords hashed with `bcryptjs` (never stored in plain text)
- All SQL queries use parameterized placeholders (no string concatenation)
- Role-based access enforced server-side via `requireRole()` middleware
- HIPAA-style idle auto-logout after 15 minutes of inactivity on all portals
- `.env` is gitignored — credentials never committed
- `/api/auth/insurance-plans` is intentionally public for registration and staff onboarding flows
