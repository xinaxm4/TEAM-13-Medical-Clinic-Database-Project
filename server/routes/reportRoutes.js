const express = require("express");
const router  = express.Router();
const { getBillingStatement, getDailySchedule, getPhysicianActivity } = require("../controllers/reportController");
const { requireRole } = require("../middleware/auth");

// Report 1 — accessible by patient (their own) and staff
router.get("/billing-statement",  requireRole("patient", "staff"), getBillingStatement);

// Report 2 — staff and physician can view daily schedule
router.get("/daily-schedule",     requireRole("staff", "physician"), getDailySchedule);

// Report 3 — physician views their own activity
router.get("/physician-activity", requireRole("physician", "staff"), getPhysicianActivity);

module.exports = router;
