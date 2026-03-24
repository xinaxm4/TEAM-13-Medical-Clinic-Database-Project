const express = require("express");
const router = express.Router();
const { getPatientDashboard } = require("../controllers/patientController");

router.get("/dashboard", getPatientDashboard);

module.exports = router;
