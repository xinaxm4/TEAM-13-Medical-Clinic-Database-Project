const express = require("express");
const router = express.Router();

const { testRoute, registerUser, loginUser } = require("../controllers/authController");

router.get("/test", testRoute);
router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;
