/* ── Phone auto-formatter ── */
function formatPhone(e) {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (raw.length <= 3)       e.target.value = raw.length ? "(" + raw : "";
    else if (raw.length <= 6)  e.target.value = "(" + raw.slice(0,3) + ") " + raw.slice(3);
    else                       e.target.value = "(" + raw.slice(0,3) + ") " + raw.slice(3,6) + "-" + raw.slice(6);
}
const phoneInput = document.getElementById("phonenum");
if (phoneInput) phoneInput.addEventListener("input", formatPhone);

/* ── Password strength indicator ── */
function checkPasswordStrength(pw) {
    return {
        len:   pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        num:   /[0-9]/.test(pw),
        spec:  /[^A-Za-z0-9]/.test(pw)
    };
}

const pwInput    = document.getElementById("password");
const pwStrength = document.getElementById("pwStrength");

pwInput.addEventListener("focus", () => {
    pwStrength.style.display = "flex";
});

pwInput.addEventListener("input", () => {
    const s = checkPasswordStrength(pwInput.value);
    const set = (id, pass) => {
        const el = document.getElementById(id);
        el.className = "pw-rule" + (pass ? " pass" : "");
    };
    set("pw-len",   s.len);
    set("pw-upper", s.upper);
    set("pw-num",   s.num);
    set("pw-spec",  s.spec);
});

/* ── Registration submit ── */
const registerButton = document.getElementById("btn");
const message        = document.getElementById("message");

registerButton.addEventListener("click", async function (event) {
    event.preventDefault();

    const fname         = document.getElementById("fname").value.trim();
    const lname         = document.getElementById("lname").value.trim();
    const email         = document.getElementById("email").value.trim();
    const password      = document.getElementById("password").value;
    const phone_number  = document.getElementById("phonenum").value.trim();
    const date_of_birth = document.getElementById("DOB").value || null;

    if (!fname || !lname || !email || !password) {
        message.style.color = "#c0392b";
        message.textContent = "Please fill in your name, email, and password.";
        return;
    }

    // ── Age validation: required, 18+, no future dates ──
    if (!date_of_birth) {
        message.style.color = "#c0392b";
        message.textContent = "Please enter a valid date of birth.";
        return;
    }
    const dob = new Date(date_of_birth);
    const ageYears = (new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000);
    if (dob > new Date() || ageYears < 18 || ageYears > 130) {
        message.style.color = "#c0392b";
        message.textContent = "Please enter a valid date of birth.";
        return;
    }

    // ── Client-side password strength gate ──
    const s = checkPasswordStrength(password);
    if (!s.len || !s.upper || !s.num || !s.spec) {
        pwStrength.style.display = "flex";
        message.style.color = "#c0392b";
        message.textContent = "Please create a stronger password that meets all the requirements shown.";
        return;
    }

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: fname + " " + lname, email, password, phone_number, date_of_birth, role: "patient" })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "#1a6b3a";
            message.textContent = "Registration successful! Redirecting to login...";
            setTimeout(() => {
                window.location.href = "/client/auth/patient_login.html";
            }, 1000);
        } else {
            message.style.color = "#c0392b";
            message.textContent = data.error || "Registration failed.";
        }
    } catch (error) {
        message.style.color = "#c0392b";
        message.textContent = "Server error. Is the server running?";
    }
});
