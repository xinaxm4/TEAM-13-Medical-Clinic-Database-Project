# Team 13 — Audit Trail Health

A full-stack medical clinic management system with role-based portals for patients, physicians, and staff. Built with **Node.js / Express**, **vanilla HTML/CSS/JS**, and a **MySQL** database hosted on Railway.

**Live URL:** https://team-13-medical-clinic-database-project-production.up.railway.app

---

## Team Members

| Branch | Member | Contributions |
|--------|--------|---------------|
| `TinaT` | Tina T. | Frontend, dashboards, CSS, project structure, API integration, deployment |
| `MaxC` | Max C. | Backend auth, patient login/register, DB queries |
| `Timi-A` | Timi A. | Database schema, seed data, triggers |
| `main` | All | Stable merged branch — always deployable |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Backend | Node.js + Express v5 |
| Database | MySQL hosted on Railway |
| DB Driver | mysql2 (connection pool, parameterized queries) |
| Auth | bcryptjs password hashing, localStorage session |
| Deployment | Railway (auto-deploys from `main` branch) |

---

## Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/xinaxm4/TEAM-13-Medical-Clinic-Database-Project.git
cd TEAM-13-Medical-Clinic-Database-Project
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your `.env` file
```bash
cp .env.example .env
```

Fill in the credentials (get from a teammate — do not commit):
```
DB_HOST=caboose.proxy.rlwy.net
DB_USER=root
DB_PORT=55239
DB_PASSWORD=<ask teammate>
DB_NAME=railway
PORT=3000
```

> `.env` is gitignored and never committed. The database is shared on Railway — no local MySQL needed.

### 4. Start the server
```bash
node server.js
```

### 5. Open in browser
```
http://localhost:3000
```

---

## Demo Login Credentials

### Patient Portal
**URL:** `/auth/patient_login.html`

| Email | Password |
|-------|----------|
| `alex.smith@email.com` | `password123` |
| `taylor.jones@email.com` | `password123` |
| `morgan.w@email.com` | `password123` |
| `casey.davis@email.com` | `password123` |

New patients can register at `/auth/register.html` — a profile row is auto-created on first login.

### Staff & Physician Portal
**URL:** `/auth/staff_login.html`

| Username | Password | Role | Specialty / Location |
|----------|----------|------|----------------------|
| `dr.garcia` | `clinic123` | Physician | Orthopedics — Dallas |
| `dr.turner` | `clinic123` | Physician | Pediatrics — Dallas |
| `dr.johnson` | `clinic123` | Physician | Internal Medicine — Dallas |
| `dr.white` | `clinic123` | Physician | Cardiology — Houston |
| `dr.mitchell` | `clinic123` | Physician | Cardiology — Chicago |
| `dr.kim` | `clinic123` | Physician | Oncology — Los Angeles |
| `dr.sharma` | `clinic123` | Physician | Cardiology — Dallas (multi-location) |
| `dr.webb` | `clinic123` | Physician | Neurology — Houston (multi-location) |
| `dr.lin` | `clinic123` | Physician | Oncology — Chicago (multi-location) |
| `staff.adams` | `staff123` | Staff | Dallas |
| `staff.brooks` | `staff123` | Staff | Dallas |
| `staff.washington` | `staff123` | Staff | Dallas |
| `staff.murphy` | `staff123` | Staff | Houston |

---

## Pages & Portals

### Public Pages
| URL | Description |
|-----|-------------|
| `/` | Home page |
| `/pages/about.html` | About — mission, 16 specialties, 15 locations |
| `/pages/locations/locations.html` | All clinic locations |

### Authentication
| URL | Description |
|-----|-------------|
| `/auth/patient_login.html` | Patient login |
| `/auth/register.html` | New patient registration |
| `/auth/staff_login.html` | Physician & staff login |

### Dashboards (login required)
| URL | Role | Features |
|-----|------|---------|
| `/portals/patient_dashboard.html` | Patient | Overview, appointments, medical history, billing, profile edit with confirmation |
| `/portals/physician_dashboard.html` | Physician | Work schedule (filtered by location), appointments, incoming referrals with accept/reject |
| `/portals/staff_dashboard.html` | Staff | Department info, appointments, profile |

---

## API Endpoints

### Auth — `/api/auth`
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/register` | Register a new patient |
| `POST` | `/api/auth/login` | Patient portal login |

### Patient — `/api/patient`
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/patient/dashboard?user_id=X` | Full patient data — auto-creates record for new users |
| `PUT` | `/api/patient/profile` | Update patient info (validated server + client side) |

### Staff & Physician — `/api/staff`
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/staff/login` | Physician or staff login |
| `GET` | `/api/staff/physician/dashboard?user_id=X` | Physician dashboard data |
| `GET` | `/api/staff/staff/dashboard?user_id=X` | Staff dashboard data |
| `GET` | `/api/staff/all-schedules?office_id=X` | All physicians at a given office |
| `GET` | `/api/staff/physician/referrals?physician_id=X` | Incoming specialist referrals |
| `PUT` | `/api/staff/referral/:id/status` | Accept or reject a referral |

### Locations — `/api/locations`
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/locations` | All clinic offices |
| `GET` | `/api/locations/:id` | Single office detail |

---

## Database

Fully hosted on Railway — all team members connect to the same live instance.

### Current Data

| Table | Records |
|-------|---------|
| `patient` | 27 |
| `physician` | 36 (16 specialties) |
| `staff` | 10 |
| `office` | 15 (multiple per city) |
| `appointment` | 13 |
| `referral` | 24 |
| `diagnosis` | 13 |
| `treatment` | 11 |
| `billing` | 5 |

### Key Tables

| Table | Description |
|-------|-------------|
| `users` | Login credentials. `role` (`patient`/`physician`/`staff`) controls portal access. |
| `patient` | Demographics, contact info, emergency contact, primary physician, insurance. |
| `physician` | Doctor info and specialty. Can appear in multiple `work_schedule` rows across offices. |
| `staff` | Non-physician staff with role, department, and office assignment. |
| `appointment` | Visits linking patient, physician, office, and status. |
| `work_schedule` | Physician availability per office per day. Physicians can work at multiple locations. |
| `referral` | Specialist referrals — referring physician, specialist, patient, reason, status, expiration. |
| `referral_status` | Lookup: Pending, Accepted, Rejected, Expired. |
| `diagnosis` | ICD-10 coded diagnoses linked to patients. |
| `treatment` | Treatment plans and medications. |
| `medical_history` | Long-term conditions per patient. |
| `billing` | Payment records — auto-created by trigger on appointment completion. |
| `office` | 15 physical locations across 7 cities. |
| `insurance` | Provider names, policy numbers, coverage percentages. |
| `department` | Clinical departments linked to a clinic. |
| `clinic` | Top-level clinic entity. |

### Entity Relationships

- `users` → `patient` via `patient.user_id`
- `users` → `physician` via `users.physician_id`
- `users` → `staff` via `users.staff_id`
- `patient` → `physician` (primary care) via `patient.primary_physician_id`
- `patient` → `physician` (specialist) via `referral.specialist_id`
- `appointment` → `patient`, `physician`, `office`, `appointment_status`
- `work_schedule` → `physician`, `office` (many-to-many: one physician, many offices)
- `referral` → `patient`, primary `physician`, specialist `physician`, `referral_status`
- `billing` → `appointment`, `patient`, `insurance`

---

## MySQL Triggers

9 triggers are live in the Railway database:

| Trigger | Event | Table | Purpose |
|---------|-------|-------|---------|
| `trg_auto_billing_on_complete` | `AFTER UPDATE` | `appointment` | Creates a billing record (Unpaid) when status changes to Completed |
| `trg_prevent_past_appointments` | `BEFORE INSERT` | `appointment` | Rejects appointments with a past date |
| `trg_validate_referral_dates` | `BEFORE INSERT` | `referral` | Rejects referrals where expiration ≤ date issued |
| `trg_validate_patient_phone` | `BEFORE INSERT` | `patient` | Enforces `(XXX) XXX-XXXX` phone format |
| `trg_validate_patient_phone_update` | `BEFORE UPDATE` | `patient` | Same on updates |
| `trg_validate_physician_phone` | `BEFORE INSERT` | `physician` | Enforces phone format for physicians |
| `trg_validate_physician_phone_update` | `BEFORE UPDATE` | `physician` | Same on updates |
| `trg_validate_staff_phone` | `BEFORE INSERT` | `staff` | Enforces phone format for staff |
| `trg_validate_staff_phone_update` | `BEFORE UPDATE` | `staff` | Same on updates |

---

## Validation

Both client-side (instant feedback) and server-side (backend rejection) run on all profile updates:

| Field | Rule |
|-------|------|
| Phone number | Must match `(XXX) XXX-XXXX` |
| ZIP code | 5 digits (e.g. `77450`) |
| State | 2-letter code (e.g. `TX`) |
| Email | Must contain `@` and valid domain |
| Names | Letters, spaces, hyphens only |
| Date of birth | Cannot be in the future |

---

## Access Control

| Role | Login Page | Session Key | Blocked From |
|------|-----------|-------------|--------------|
| `patient` | `/auth/patient_login.html` | `patientUser` | Staff Portal |
| `physician` | `/auth/staff_login.html` | `clinicUser` | Patient Portal |
| `staff` | `/auth/staff_login.html` | `clinicUser` | Patient Portal |

Role enforced at both frontend redirect and server-side API.

---

## Project Structure

```
TEAM-13-Medical-Clinic-Database-Project/
│
├── server.js                    # Express app entry point
├── db.js                        # MySQL connection pool
├── railway.toml                 # Railway deployment config
├── .env                         # Local credentials (gitignored)
├── .env.example                 # Credential template for teammates
├── package.json
│
├── controllers/
│   ├── authController.js        # register, login
│   ├── patientController.js     # patient dashboard, profile update
│   ├── staffController.js       # physician/staff dashboards, schedules, referrals
│   └── locationsController.js   # office locations
│
├── routes/
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   ├── staffRoutes.js
│   └── locationsRoutes.js
│
├── pages/                       # Public-facing pages
│   ├── home_page.html
│   ├── about.html
│   └── locations/
│       ├── locations.html
│       └── location_detail.html
│
├── auth/                        # Login & registration
│   ├── patient_login.html
│   ├── register.html
│   └── staff_login.html
│
├── portals/                     # Role-based dashboards
│   ├── patient_dashboard.html
│   ├── physician_dashboard.html
│   └── staff_dashboard.html
│
├── styles/
│   ├── dashboard.css            # Shared dashboard styles (all 3 portals)
│   ├── home_page.css
│   ├── about.css
│   ├── locations.css
│   ├── location_detail.css
│   ├── patient_login.css
│   ├── staff_login.css
│   └── register.css
│
├── scripts/
│   ├── search.js
│   ├── sidebar.js
│   ├── auth/
│   │   ├── patient_login.js
│   │   ├── register.js
│   │   └── staff_login.js
│   └── portals/
│       ├── patient_dashboard.js
│       ├── physician_dashboard.js
│       └── staff_dashboard.js
│
├── database/
│   ├── Team_13_Medical_Clinic_DB.sql  # Full schema (CREATE TABLE statements)
│   ├── seed_clinical.js               # Initial clinical seed data
│   ├── seed_more.js                   # Extended data with satirical references
│   ├── seed_comprehensive.js          # Full data — locations, physicians, patients
│   └── fix_phones.js                  # Phone normalization + trigger setup
│
└── images/
    ├── medical_homepage_image.jpg
    ├── locations.jpg
    └── about.jpg
```

---

## Deploying Updates

Railway auto-deploys on every push to `main`:

```bash
git add .
git commit -m "describe your change"
git push origin TinaT:main --force
```

Requires a GitHub Personal Access Token (classic, `repo` scope).

---

## Security Notes

- Passwords hashed with **bcryptjs** for seed accounts; acceptable plain text for demo patient accounts
- DB credentials in `.env` only — never committed to source control
- All queries use parameterized `?` placeholders — protected against SQL injection
- Phone format enforced by server-side validation and MySQL triggers
- No JWT or rate limiting — acceptable for demo scope
