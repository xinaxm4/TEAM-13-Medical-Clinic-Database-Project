const loginButton = document.getElementById("btn");
const message = document.getElementById("message");

loginButton.addEventListener("click", async function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    message.textContent = "Please enter both email and password.";
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      message.textContent = "Login successful!";
      localStorage.setItem("user", JSON.stringify(data.user));
      setTimeout(() => {
        window.location.href = "/portals/patient_dashboard.html";
      }, 1000);
    } else {
      message.textContent = data.error;
    }
  } catch (err) {
    message.textContent = "Server error. Is the server running?";
  }
});
