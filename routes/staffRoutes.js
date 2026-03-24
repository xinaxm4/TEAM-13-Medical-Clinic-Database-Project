const express = require("express");
const router = express.Router();
const { loginStaff, getPhysicianDashboard, getStaffDashboard } = require("../controllers/staffController");

router.post("/login",                loginStaff);
router.get("/physician/dashboard",   getPhysicianDashboard);
router.get("/staff/dashboard",       getStaffDashboard);

module.exports = router;
