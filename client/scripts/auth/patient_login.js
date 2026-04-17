const loginButton = document.getElementById("btn");
const message = document.getElementById("message");

loginButton.addEventListener("click", async function (event) {
  event.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!email || !password) {
        message.style.color = "#c0392b";
        message.textContent = "Please enter both email and password.";
        return;
      }

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
      message.style.color = "#1a6b3a";
      message.textContent = "Login successful! Redirecting...";
      localStorage.setItem("patientUser", JSON.stringify(data.user));
      setTimeout(() => {
        window.location.href = "/client/portals/patient_dashboard.html";
      }, 1000);
    } else {
      message.style.color = "#c0392b";
      message.textContent = data.error || data.message || "Invalid email or password.";
    }
  } catch (err) {
    message.style.color = "#c0392b";
    message.textContent = "Server error. Is the server running?";
  }
});
