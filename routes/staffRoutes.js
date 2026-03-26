const express = require("express");
const router = express.Router();
const { loginStaff, getPhysicianDashboard, getStaffDashboard, getAllSchedules, getPhysicianReferrals, updateReferralStatus } = require("../controllers/staffController");

router.post("/login",                        loginStaff);
router.get("/physician/dashboard",           getPhysicianDashboard);
router.get("/staff/dashboard",               getStaffDashboard);
router.get("/all-schedules",                 getAllSchedules);
router.get("/physician/referrals",           getPhysicianReferrals);
router.put("/referral/:referral_id/status",  updateReferralStatus);

module.exports = router;
