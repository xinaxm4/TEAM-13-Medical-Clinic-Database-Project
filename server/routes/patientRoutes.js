const express = require("express");
const router = express.Router();
const { getPatientDashboard, updatePatientProfile, getCareCities, getPhysiciansByCity, getInsuranceOptions, assignCare, getSpecialistsByCity, requestReferral, getAvailableSlots, bookAppointment, cancelAppointment } = require("../controllers/patientController");
const { requireRole } = require("../middleware/auth");

router.get("/dashboard",       requireRole("patient"), getPatientDashboard);
router.put("/profile",         requireRole("patient"), updatePatientProfile);
router.get("/care/cities",     requireRole("patient"), getCareCities);
router.get("/care/physicians", requireRole("patient"), getPhysiciansByCity);
router.get("/care/insurance",  requireRole("patient"), getInsuranceOptions);
router.put("/care/assign",            requireRole("patient"), assignCare);
router.get("/referral/specialists",       requireRole("patient"), getSpecialistsByCity);
router.post("/referral/request",          requireRole("patient"), requestReferral);
router.get("/appointments/slots",         requireRole("patient"), getAvailableSlots);
router.post("/appointments/book",         requireRole("patient"), bookAppointment);
router.put("/appointments/:id/cancel",    requireRole("patient"), cancelAppointment);

module.exports = router;
