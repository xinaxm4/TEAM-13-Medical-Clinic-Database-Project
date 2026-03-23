const registerButton = document.getElementById("btn");
const message = document.getElementById("message");

registerButton.addEventListener("click", async function (event) {
  event.preventDefault();

  const fname = document.getElementById("fname").value.trim();
  const lname = document.getElementById("lname").value.trim();
  const name = fname + " " + lname;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!fname || !lname || !email || !password) {
    message.textContent = "Please fill in all fields.";
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "patient" })
    });

    const data = await response.json();

    if (response.ok) {
      message.textContent = "Registration successful!";
      setTimeout(() => {
        window.location.href = "patient_login.html";
      }, 1000);
    } else {
      message.textContent = data.error || "Registration failed.";
    }
  } catch (error) {
    message.textContent = "Server error. Is the server running?";
  }
});
