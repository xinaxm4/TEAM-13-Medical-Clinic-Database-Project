const express = require("express");
const router  = express.Router();
const {
  loginAdmin, getAdminDashboard, getClinicReport,
  getAllPhysicians, getPhysicianPerformanceDetail, getAllStaff, getDepartments, getOffices,
  addPhysician, addStaff, editPhysician, deletePhysician, editStaff, deleteStaff,
  getPayerScorecard, getPayerDetail, getInsuranceOverview, getAcceptedInsurance, addAcceptedInsurance,
  deactivateInsurance, getPayerAlerts, markAlertRead,
  checkTerminationEligibility, terminateStaff
} = require("../controllers/adminController");
const { requireRole } = require("../middleware/auth");

router.post("/login",            loginAdmin);
router.get("/dashboard",         requireRole("admin"), getAdminDashboard);
router.get("/clinic-report",     requireRole("admin"), getClinicReport);
router.get("/physicians",        requireRole("admin"), getAllPhysicians);
router.get("/physician/:id/performance", requireRole("admin"), getPhysicianPerformanceDetail);
router.get("/staff-members",     requireRole("admin"), getAllStaff);
router.get("/departments",       requireRole("admin"), getDepartments);
router.get("/offices",           requireRole("admin"), getOffices);
router.post("/add-physician",    requireRole("admin"), addPhysician);
router.post("/add-staff",        requireRole("admin"), addStaff);
router.put("/physician/:id",     requireRole("admin"), editPhysician);
router.delete("/physician/:id",  requireRole("admin"), deletePhysician);
router.put("/staff/:id",         requireRole("admin"), editStaff);
router.delete("/staff/:id",      requireRole("admin"), deleteStaff);

// ── Insurance Analytics ──────────────────────────────────────
router.get("/insurance/scorecard",           requireRole("admin"), getPayerScorecard);
router.get("/insurance/payer-detail",        requireRole("admin"), getPayerDetail);
router.get("/insurance/overview",            requireRole("admin"), getInsuranceOverview);
router.get("/insurance/accepted",            requireRole("admin"), getAcceptedInsurance);
router.post("/insurance/accept",             requireRole("admin"), addAcceptedInsurance);
router.put("/insurance/:id/deactivate",      requireRole("admin"), deactivateInsurance);
router.get("/insurance/alerts",              requireRole("admin"), getPayerAlerts);
router.put("/insurance/alerts/:id/read",     requireRole("admin"), markAlertRead);

// ── Staff termination trigger ────────────────────────────────
router.get("/staff/:id/termination-check",   requireRole("admin"), checkTerminationEligibility);
router.delete("/staff/:id/terminate",        requireRole("admin"), terminateStaff);

module.exports = router;
