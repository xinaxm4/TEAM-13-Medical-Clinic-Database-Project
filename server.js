const express = require("express");
const cors    = require("cors");
const path    = require("path");

const authRoutes      = require("./server/routes/authRoutes");
const staffRoutes     = require("./server/routes/staffRoutes");
const patientRoutes   = require("./server/routes/patientRoutes");
const locationsRoutes = require("./server/routes/locationsRoutes");
const reportRoutes    = require("./server/routes/reportRoutes");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve everything from project root
app.use(express.static(path.join(__dirname)));

// API routes
app.use("/api/auth",      authRoutes);
app.use("/api/staff",     staffRoutes);
app.use("/api/patient",   patientRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/reports",   reportRoutes);

// Default: home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "pages", "home_page.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
