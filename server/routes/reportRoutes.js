const express = require("express");
const router  = express.Router();
const { getBillingStatement, getDailySchedule, getPhysicianActivity, getMissedCancelledReport, getUpcomingAppointments } = require("../controllers/reportController");
const { requireRole } = require("../middleware/auth");

// Report 1 — accessible by patient (their own) and staff
router.get("/billing-statement",  requireRole("patient", "staff"), getBillingStatement);

// Report 2 — staff and physician can view daily schedule
router.get("/daily-schedule",     requireRole("staff", "physician"), getDailySchedule);

// Report 3 — physician views their own activity
router.get("/physician-activity", requireRole("physician", "staff"), getPhysicianActivity);

// Report 4 — missed / cancelled appointments
router.get("/missed-cancelled",   requireRole("staff"), getMissedCancelledReport);

// Report 5 — upcoming scheduled appointments
router.get("/upcoming",           requireRole("staff"), getUpcomingAppointments);

module.exports = router;
