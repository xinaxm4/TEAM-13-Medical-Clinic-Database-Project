const express = require("express");
const router = express.Router();
const { getPatientDashboard, updatePatientProfile } = require("../controllers/patientController");

router.get("/dashboard", getPatientDashboard);
router.put("/profile",   updatePatientProfile);

module.exports = router;
