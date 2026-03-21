/** Import Express */
const express = require("express");     /** Loads Express so you can use routing features */

/** Create a router */
const router = express.Router();        /** Creates a mini version of your app just for routes(router = place where you define endpoints) */

/** Import controller functions */
const { testRoute, registerUser, loginUser } = require("../controllers/authController");
/** What this means:
“Go to authController.js and bring these functions”
testRoute → test DB connection
registerUser → handles registration
loginUser → handles login */

/** Define routes */
router.get("/test", testRoute);     /** Test route (Run testRoute) */
router.post("/register", registerUser);     /** Register route (Run registerUser) */
router.post("/login", loginUser);       /** Login route (Run loginUser) */

/** Export router */
module.exports = router;        /** “Make these routes available to server.js” */

/** How this connects to server.js
In server.js you had:
    app.use("/api/auth", authRoutes);

That means:
Every route in this file gets:
    /api/auth
sadded to it.

So these become:
Route in file	            Actual URL
/test	                    /api/auth/test
/register	                /api/auth/register
/login	                    /api/auth/login */