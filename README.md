# Team 13 — Palantir Clinic Database Project

A full-stack medical clinic web application built with **Node.js / Express** on the backend and **vanilla HTML/CSS/JS** on the frontend, backed by a **MySQL** database.

---

## How to Run

1. Make sure MySQL is running locally and the database is set up (see [Database Setup](#database-setup))
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Open your browser to `http://localhost:3000`

---

## Database Setup

The full schema is in `database/Team_13_Medical_Clinic_DB.sql`.

Run it in MySQL:
```sql
SOURCE /path/to/database/Team_13_Medical_Clinic_DB.sql;
```

The database connection is configured in `db.js` (host, user, password, database name). Each team member should update this file to match their local MySQL credentials.

---

## Project Structure

```
TEAM-13-Medical-Clinic-Database-Project/
│
├── server.js                        # Express server — starts on port 3000, registers all routes
├── db.js                            # MySQL connection — update credentials for your local DB
├── package.json                     # Node dependencies (express, cors, mysql2)
│
├── pages/                           # Public-facing marketing pages (no login required)
│   ├── home_page.html               # Landing page with hero, smart search, and nav
│   ├── about.html                   # About the clinic
│   └── locations/                   # One page per clinic location
│       ├── locations.html           # Grid overview of all clinic locations
│       ├── chicago.html
│       ├── dallas.html
│       ├── houston.html
│       ├── austin.html
│       ├── san_antonio.html
│       ├── los_angeles.html
│       └── new_york.html
│
├── auth/                            # Login and registration pages
│   ├── patient_login.html           # Patient login form
│   ├── register.html                # New patient registration form
│   └── staff_login.html             # Physician & staff login form (no self-registration)
│
├── portals/                         # Role-based dashboards (require login)
│   ├── patient_dashboard.html       # Patient portal: appointments, billing, medical history
│   ├── physician_dashboard.html     # Physician portal: schedule, patients, referrals
│   └── staff_dashboard.html         # Staff portal: department appointments, billing queue
│
├── styles/                          # All CSS files
│   ├── home_page.css                # Styles for landing page hero + search
│   ├── about.css                    # Styles for about page
│   ├── locations.css                # Styles for locations grid page
│   ├── location_detail.css          # Shared styles for individual clinic location pages
│   ├── patient_login.css            # Styles for patient login page
│   ├── staff_login.css              # Styles for staff/physician login page
│   ├── register.css                 # Styles for registration page
│   ├── sidebar.css                  # Styles for the sliding login drawer (used on all pages)
│   └── dashboard.css                # Shared styles for all three portal dashboards
│
├── scripts/                         # All JavaScript files
│   ├── sidebar.js                   # Sliding login drawer — injected on every page automatically.
│   │                                #   Intercepts Patient Login / Staff Portal nav clicks,
│   │                                #   handles login API calls, redirects by role.
│   ├── search.js                    # Smart search on home page — filters doctors,
│   │                                #   specialties, and locations as you type.
│   ├── auth/
│   │   ├── patient_login.js         # Submits patient login form → /api/auth/login
│   │   ├── register.js              # Submits new patient registration → /api/auth/register
│   │   └── staff_login.js           # Submits staff login form → /api/staff/login
│   └── portals/
│       ├── patient_dashboard.js     # Fetches patient data → /api/patient/dashboard
│       ├── physician_dashboard.js   # Fetches physician data → /api/staff/physician/dashboard
│       └── staff_dashboard.js       # Fetches staff data → /api/staff/staff/dashboard
│
├── controllers/                     # Business logic (called by routes)
│   ├── authController.js            # Patient register + login (MaxC)
│   ├── staffController.js           # Staff/physician login + dashboard data queries
│   └── patientController.js         # Patient dashboard data queries
│
├── routes/                          # Express route definitions
│   ├── authRoutes.js                # POST /api/auth/login, POST /api/auth/register
│   ├── staffRoutes.js               # POST /api/staff/login
│   │                                # GET  /api/staff/physician/dashboard?user_id=X
│   │                                # GET  /api/staff/staff/dashboard?user_id=X
│   └── patientRoutes.js             # GET  /api/patient/dashboard?email=X
│
├── database/                        # Database-related files
│   ├── Team_13_Medical_Clinic_DB.sql  # Full MySQL schema (all CREATE TABLE statements)
│   ├── clinic_db.js                 # Sample DB queries / data utilities
│   └── clinic_triggers.js           # MySQL trigger definitions
│
└── images/                          # Static images used by CSS backgrounds
    ├── medical_homepage_image.jpg   # Hero background on home + login pages
    ├── locations.jpg                # Hero background on locations + clinic detail pages
    └── about.jpg                    # Hero background on about page
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/register` | Register a new patient account |
| `POST` | `/api/auth/login` | Patient login (email + password) |
| `POST` | `/api/staff/login` | Physician or staff login (username + password) |
| `GET`  | `/api/patient/dashboard?email=X` | Load patient portal data |
| `GET`  | `/api/staff/physician/dashboard?user_id=X` | Load physician portal data |
| `GET`  | `/api/staff/staff/dashboard?user_id=X` | Load staff portal data |

---

## User Roles & Portals

| Role | Login Page | Dashboard | How account is created |
|------|-----------|-----------|------------------------|
| `patient` | `/auth/patient_login.html` | `/portals/patient_dashboard.html` | Self-register via `/auth/register.html` |
| `physician` | `/auth/staff_login.html` | `/portals/physician_dashboard.html` | Admin creates account in `users` table |
| `staff` | `/auth/staff_login.html` | `/portals/staff_dashboard.html` | Admin creates account in `users` table |

The `users` table stores all login credentials. The `role` column (`patient`, `physician`, `staff`) determines which dashboard the user is redirected to after login.

---

## Key Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Login credentials — links to `physician` or `staff` via foreign key |
| `patient` | Patient demographics, primary physician, insurance |
| `physician` | Doctor info, specialty, department |
| `staff` | Non-physician staff, role, department, shift hours |
| `appointment` | All scheduled visits — links patient, physician, office |
| `work_schedule` | Which offices a physician works at, and on which days |
| `referral` | Specialist referrals issued by a primary physician |
| `diagnosis` / `treatment` | Clinical records attached to appointments |
| `medical_history` | Long-term conditions on record for a patient |
| `billing` | Payment records linked to appointments |

---

## Branch Ownership

| Branch | Owner | Focus |
|--------|-------|-------|
| `TinaT` | Tina T. | Frontend pages, CSS, project structure |
| `MaxC` | Max C. | Backend auth, patient login/register logic |
| `Timi-A` | Timi A. | TBD |
| `main` | Everyone | Stable merged code |

---

## Notes

- Passwords are currently stored as **plain text** in the `password_hash` column. For a production app this should use `bcrypt`. Fine for demo/class purposes.
- The `users` table does **not** have a `patient_id` column, so patient records are looked up by matching `patient.email = users.username`. A future improvement would be to add `patient_id INT NULL` to the `users` table.
- The `sidebar.js` script is automatically included on every page and intercepts all "Patient Login" and "Staff Portal" nav links to open the sliding drawer instead of navigating to a separate page.
