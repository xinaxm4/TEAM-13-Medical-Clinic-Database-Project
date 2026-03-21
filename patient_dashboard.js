 const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    window.location.href = "patient_login.html";
  } else {
    document.getElementById("welcome").textContent =
      "Welcome, " + user.name + "!";
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "patient_login.html";
  });