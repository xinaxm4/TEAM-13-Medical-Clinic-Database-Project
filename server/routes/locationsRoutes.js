const express = require("express");
const router  = express.Router();
const { getLocations, getLocationDetail, getSearchData, getStats } = require("../controllers/locationsController");

// GET /api/locations              — all clinics for the locations grid
router.get("/",        getLocations);

// GET /api/locations/detail?city= — one clinic's full details (departments + physicians)
router.get("/detail",  getLocationDetail);

// GET /api/locations/search       — all data needed for the homepage smart search
router.get("/search",  getSearchData);

// GET /api/locations/stats        — live counts for the about page
router.get("/stats",   getStats);

module.exports = router;
