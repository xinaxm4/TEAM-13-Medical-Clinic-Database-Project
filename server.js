const express = require("express");
const cors    = require("cors");
const path    = require("path");

const authRoutes    = require("./routes/authRoutes");
const staffRoutes   = require("./routes/staffRoutes");
const patientRoutes = require("./routes/patientRoutes");

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve everything from project root
app.use(express.static(path.join(__dirname)));

// API routes
app.use("/api/auth",    authRoutes);
app.use("/api/staff",   staffRoutes);
app.use("/api/patient", patientRoutes);

// Default: home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "home_page.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Home:      http://localhost:${PORT}/`);
  console.log(`Locations: http://localhost:${PORT}/pages/locations/locations.html`);
  console.log(`Patient:   http://localhost:${PORT}/auth/patient_login.html`);
  console.log(`Staff:     http://localhost:${PORT}/auth/staff_login.html`);
});
