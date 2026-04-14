const express = require("express");
const router = express.Router();
const { loginStaff, getPhysicianDashboard, getStaffDashboard, getAllSchedules, getPhysicianReferrals, updateReferralStatus, addPhysicianNote, updateAppointmentStatus, deleteMedicalHistoryNote, staffBookAppointment, markBillingPaid, getAllPatients, getAllPhysicians } = require("../controllers/staffController");
const { requireRole } = require("../middleware/auth");

router.post("/login",                        loginStaff);
router.get("/physician/dashboard",           requireRole("physician"), getPhysicianDashboard);
router.get("/staff/dashboard",               requireRole("staff"),     getStaffDashboard);
router.get("/all-schedules",                 requireRole("physician", "staff"), getAllSchedules);
router.get("/physician/referrals",           requireRole("physician"), getPhysicianReferrals);
router.put("/referral/:referral_id/status",  requireRole("physician"), updateReferralStatus);
router.post("/physician/note",               requireRole("physician"),         addPhysicianNote);
router.put("/appointment/:id/status",        requireRole("physician","staff"),  updateAppointmentStatus);
router.delete("/medical-history/:id",        requireRole("physician"),          deleteMedicalHistoryNote);
router.post("/appointments/book",            requireRole("staff"),              staffBookAppointment);
router.put("/billing/:id/pay",              requireRole("staff"),              markBillingPaid);
router.get("/patients",                      requireRole("physician","staff"),  getAllPatients);
router.get("/physicians",                    requireRole("staff"),              getAllPhysicians);

module.exports = router;
