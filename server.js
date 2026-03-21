/* Import packages */
const express = require("express");         /* express → your backend framework (handles routes, requests) */
const cors = require("cors");          /* cors → allows frontend ↔ backend communication */
const path = require("path");         /* path → helps with file paths (like your HTML files) */

/* Import your routes */
const authRoutes = require("./routes/authRoutes");          /* “Go to routes/authRoutes.js and bring in all login/register routes” */

/* Create the app */
const app = express();          /* Creates your server (Think: app = your backend application) */

/* Set the port */
const PORT = 3000;          /* Your server runs at: http://localhost:3000 */

/* Middleware */         /* What is middleware? Code that runs before requests reach your routes */
app.use(cors());          /* Allows frontend to talk to backend, Without this → browser blocks requests */
app.use(express.json());          /* Lets server read JSON data, Without this → req.body would be undefined */
app.use(express.static(path.join(__dirname, "public")));          /* This means: “Serve all files inside public folder” */
                                                                  /* So now you can open: http://localhost:3000/patient_login.html */

/* Connect routes */
app.use("/api/auth", authRoutes);         /* What this means: All routes in authRoutes.js will start with: /api/auth */

app.get("/", (req, res) => {          /* Default route (homepage) */  /* What this means: When someone goes to:   http://localhost:3000/   Show the login page */
  res.sendFile(__dirname + "/public/patient_login.html");
});

/* Start the server */     /* What this means: Starts the server, Prints message in terminal */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});