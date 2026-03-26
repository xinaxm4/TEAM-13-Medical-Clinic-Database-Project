/* ── Auth check ── */
const user = JSON.parse(localStorage.getItem("user") || localStorage.getItem("patientUser") || "null");

if (!user || (user.role && user.role !== "patient")) {
    window.location.href = "/auth/patient_login.html";
}

/* ── Logout ── */
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    localStorage.removeItem("patientUser");
    window.location.href = "/auth/patient_login.html";
});

/* ── Section nav ── */
function showSection(name) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const sec = document.getElementById("sec-" + name);
    if (sec) sec.classList.remove("hidden");

    const btn = document.querySelector(`.nav-item[onclick*="'${name}'"]`);
    if (btn) btn.classList.add("active");

    const labels = { overview:"Overview", appointments:"My Appointments", history:"Medical History", billing:"Billing", profile:"My Profile" };
    document.getElementById("currentSection").textContent = labels[name] || name;
}

/* ── Date ── */
document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

/* ── Helpers ── */
function fmt(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

function timeFmt(t) {
    if (!t) return "—";
    const [h, m] = t.toString().split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
}

function pill(status) {
    if (!status) return '<span class="pill pill-pending">Unknown</span>';
    const s = status.toLowerCase().replace(/\s+/g, "-");
    const map = { scheduled:"scheduled", completed:"completed", cancelled:"cancelled", pending:"pending", paid:"paid", unpaid:"unpaid", active:"active", resolved:"resolved" };
    const cls = map[s] || "pending";
    return `<span class="pill pill-${cls}">${status}</span>`;
}

function infoRow(label, value) {
    return `<div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${label}</span>
        <span style="font-size:14px;color:#333">${value || "—"}</span>
    </div>`;
}

/* ── Load dashboard data ── */
async function loadDashboard() {
    const userId = user.id;
    if (!userId) return;

    try {
        const res  = await fetch(`/api/patient/dashboard?user_id=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (!res.ok) {
            document.getElementById("greetName").textContent = "there";
            document.getElementById("greetSub").textContent = data.message || "Could not load patient data.";
            return;
        }

        const { patient, appointments, history, billing } = data;

        /* ── Greeting & sidebar ── */
        const firstName = patient.first_name || "";
        const lastName  = patient.last_name  || "";
        document.getElementById("greetName").textContent = firstName;
        document.getElementById("greetSub").textContent  = `Primary Physician: Dr. ${patient.doc_last} · ${patient.specialty}`;
        document.getElementById("sidebarName").textContent = `${firstName} ${lastName}`;
        document.getElementById("avatarInitials").textContent = (firstName[0] || "") + (lastName[0] || "");

        /* ── Stats ── */
        const upcoming   = appointments.filter(a => new Date(a.appointment_date) >= new Date()).length;
        const unpaidBills = billing.filter(b => !b.payment_status || b.payment_status.toLowerCase() !== "paid").length;
        document.getElementById("statAppts").textContent      = appointments.length;
        document.getElementById("statUpcoming").textContent   = upcoming;
        document.getElementById("statConditions").textContent = history.length;
        document.getElementById("statBills").textContent      = unpaidBills;

        /* ── Overview: upcoming appointments ── */
        const overviewAppts = appointments.filter(a => a.status_name !== "Cancelled").slice(0, 5);
        const oBody = document.getElementById("overviewApptBody");
        oBody.innerHTML = overviewAppts.length
            ? overviewAppts.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>Dr. ${a.doc_last}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="3" class="table-empty">No upcoming appointments</td></tr>`;

        /* ── Overview: care card ── */
        document.getElementById("careCard").innerHTML = `
            ${infoRow("Primary Physician", `Dr. ${patient.doc_first} ${patient.doc_last}`)}
            ${infoRow("Specialty", patient.specialty)}
            ${infoRow("Physician Phone", patient.doc_phone)}
            <hr style="border:none;border-top:1px solid #f0f2f8;margin:4px 0">
            ${infoRow("Insurance Provider", patient.provider_name)}
            ${infoRow("Policy Number", patient.policy_number)}
            ${infoRow("Coverage", patient.coverage_percentage ? patient.coverage_percentage + "%" : "—")}`;

        /* ── Appointments table ── */
        const aBody = document.getElementById("apptBody");
        aBody.innerHTML = appointments.length
            ? appointments.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${timeFmt(a.appointment_time)}</td>
                <td>Dr. ${a.doc_first} ${a.doc_last}</td>
                <td>${a.city || "—"}</td>
                <td>${a.reason_for_visit || "—"}</td>
                <td style="text-transform:capitalize">${a.booking_method || "—"}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="7" class="table-empty">No appointments found</td></tr>`;

        /* ── Medical history table ── */
        const hBody = document.getElementById("historyBody");
        hBody.innerHTML = history.length
            ? history.map(h => `<tr>
                <td class="primary">${h.condition || "—"}</td>
                <td>${fmt(h.diagnosis_date)}</td>
                <td>${pill(h.status)}</td>
                <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.notes || "—"}</td>
            </tr>`).join("")
            : `<tr><td colspan="4" class="table-empty">No medical history on record</td></tr>`;

        /* ── Billing table ── */
        const bBody = document.getElementById("billingBody");
        bBody.innerHTML = billing.length
            ? billing.map(b => `<tr>
                <td class="primary">#${b.bill_id}</td>
                <td>$${parseFloat(b.total_amount || 0).toFixed(2)}</td>
                <td>$${parseFloat(b.tax_amount || 0).toFixed(2)}</td>
                <td>${b.provider_name || "—"}</td>
                <td style="text-transform:capitalize">${b.payment_method || "—"}</td>
                <td>${fmt(b.payment_date)}</td>
                <td>${pill(b.payment_status || "Unpaid")}</td>
            </tr>`).join("")
            : `<tr><td colspan="7" class="table-empty">No billing records found</td></tr>`;

        /* ── Profile completeness banner ── */
        checkProfileCompleteness(patient);
        prefillModal(patient);

        /* ── Profile info ── */
        document.getElementById("profileInfo").innerHTML = `
            ${infoRow("Full Name", `${patient.first_name} ${patient.last_name}`)}
            ${infoRow("Date of Birth", fmt(patient.date_of_birth))}
            ${infoRow("Gender", patient.gender)}
            ${infoRow("Email", patient.email)}
            ${infoRow("Phone", patient.phone_number)}
            ${infoRow("Address", `${patient.street_address || ""}, ${patient.city || ""}, ${patient.state || ""} ${patient.zip_code || ""}`)}`;

        document.getElementById("emergencyInfo").innerHTML = `
            ${infoRow("Emergency Contact", patient.emergency_contact_name)}
            ${infoRow("Contact Phone", patient.emergency_contact_phone)}`;

    } catch (err) {
        console.error("Dashboard load error:", err);
        document.getElementById("greetSub").textContent = "Could not connect to server.";
    }
}

/* ── Profile completeness check ── */
let _patientId = null;

function checkProfileCompleteness(patient) {
    _patientId = patient.patient_id;

    const missing = [];
    if (!patient.date_of_birth)           missing.push("date of birth");
    if (!patient.phone_number)            missing.push("phone number");
    if (!patient.email)                   missing.push("email");
    if (!patient.gender)                  missing.push("gender");
    if (!patient.street_address)          missing.push("address");
    if (!patient.emergency_contact_name)  missing.push("emergency contact name");
    if (!patient.emergency_contact_phone) missing.push("emergency contact phone");

    if (missing.length === 0) return;
    if (_bannerSuppressed) return;   // user just dismissed modal — don't nag immediately

    const banner = document.getElementById("profileBanner");
    const list   = document.getElementById("bannerMissingList");
    list.textContent = `Missing: ${missing.join(", ")}.`;
    banner.classList.remove("hidden");
}

let _bannerSuppressed = false;

function openProfileModal() {
    document.getElementById("profileModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeProfileModal() {
    document.getElementById("profileModal").classList.add("hidden");
    document.body.style.overflow = "";
    // Reset save message so it's clean next time modal opens
    const msg = document.getElementById("profileSaveMsg");
    if (msg) { msg.className = "modal-save-msg hidden"; msg.textContent = ""; }
    // Stop the banner from immediately re-appearing after the user dismisses
    _bannerSuppressed = true;
    setTimeout(() => { _bannerSuppressed = false; }, 5000);
}

function closeModalOutside(e) {
    if (e.target === document.getElementById("profileModal")) closeProfileModal();
}

// Keyboard shortcuts for modal
document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("profileModal");
    const modalOpen = modal && !modal.classList.contains("hidden");

    if (e.key === "Escape" && modalOpen) {
        closeProfileModal();
    }

    // Enter anywhere inside the modal submits the form (unless already on a button)
    if (e.key === "Enter" && modalOpen) {
        const tag = document.activeElement?.tagName;
        // Let textarea newlines and button clicks work naturally
        if (tag === "TEXTAREA") return;
        // If focused on "Do this later" button, click it (dismiss)
        if (document.activeElement?.classList.contains("modal-cancel-btn")) {
            e.preventDefault();
            closeProfileModal();
            return;
        }
        // If focused on Save or anywhere else in modal, submit
        if (tag !== "SELECT") {
            e.preventDefault();
            document.getElementById("profileForm")?.requestSubmit();
        }
    }
});

function prefillModal(patient) {
    document.getElementById("mf_first_name").value = patient.first_name || "";
    document.getElementById("mf_last_name").value  = patient.last_name  || "";
    document.getElementById("mf_dob").value        = patient.date_of_birth ? patient.date_of_birth.split("T")[0] : "";
    document.getElementById("mf_gender").value     = patient.gender || "";
    document.getElementById("mf_phone").value      = patient.phone_number || "";
    document.getElementById("mf_email").value      = patient.email || "";
    document.getElementById("mf_street").value     = patient.street_address || "";
    document.getElementById("mf_city").value       = patient.city || "";
    document.getElementById("mf_state").value      = patient.state || "";
    document.getElementById("mf_zip").value        = patient.zip_code || "";
    document.getElementById("mf_ec_name").value    = patient.emergency_contact_name  || "";
    document.getElementById("mf_ec_phone").value   = patient.emergency_contact_phone || "";
}

function validateProfileForm() {
    const phoneRe  = /^[\d\s\(\)\-\+\.]{7,15}$/;
    const zipRe    = /^\d{5}(-\d{4})?$/;
    const stateRe  = /^[A-Za-z]{2}$/;
    const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRe   = /^[a-zA-Z\s\-'\.]+$/;

    const phone    = document.getElementById("mf_phone").value.trim();
    const ecPhone  = document.getElementById("mf_ec_phone").value.trim();
    const zip      = document.getElementById("mf_zip").value.trim();
    const state    = document.getElementById("mf_state").value.trim();
    const email    = document.getElementById("mf_email").value.trim();
    const firstName = document.getElementById("mf_first_name").value.trim();
    const lastName  = document.getElementById("mf_last_name").value.trim();
    const dob       = document.getElementById("mf_dob").value;
    const ecName    = document.getElementById("mf_ec_name").value.trim();

    if (firstName && !nameRe.test(firstName))
        return "First name should only contain letters.";
    if (lastName && !nameRe.test(lastName))
        return "Last name should only contain letters.";
    if (ecName && !nameRe.test(ecName))
        return "Emergency contact name should only contain letters.";
    if (phone && !phoneRe.test(phone))
        return "Phone number must be digits only (e.g. 555-123-4567).";
    if (ecPhone && !phoneRe.test(ecPhone))
        return "Emergency contact phone must be digits only.";
    if (email && !emailRe.test(email))
        return "Please enter a valid email address (e.g. name@email.com).";
    if (zip && !zipRe.test(zip))
        return "ZIP code must be 5 digits (e.g. 77450).";
    if (state && !stateRe.test(state))
        return "State must be a 2-letter code (e.g. TX).";
    if (dob && new Date(dob) > new Date())
        return "Date of birth cannot be in the future.";
    return null;
}

async function submitProfile(e) {
    e.preventDefault();
    const msg = document.getElementById("profileSaveMsg");

    const validationError = validateProfileForm();
    if (validationError) {
        msg.className = "modal-save-msg error";
        msg.textContent = validationError;
        return;
    }

    msg.className = "modal-save-msg";
    msg.textContent = "Saving…";

    const body = {
        user_id:                user.id,
        first_name:             document.getElementById("mf_first_name").value.trim(),
        last_name:              document.getElementById("mf_last_name").value.trim(),
        date_of_birth:          document.getElementById("mf_dob").value       || null,
        gender:                 document.getElementById("mf_gender").value    || null,
        phone_number:           document.getElementById("mf_phone").value.trim()   || null,
        email:                  document.getElementById("mf_email").value.trim()   || null,
        street_address:         document.getElementById("mf_street").value.trim()  || null,
        city:                   document.getElementById("mf_city").value.trim()    || null,
        state:                  document.getElementById("mf_state").value.trim()   || null,
        zip_code:               document.getElementById("mf_zip").value.trim()     || null,
        emergency_contact_name: document.getElementById("mf_ec_name").value.trim()  || null,
        emergency_contact_phone:document.getElementById("mf_ec_phone").value.trim() || null,
    };

    try {
        const r = await fetch("/api/patient/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        // Guard against server returning HTML instead of JSON
        const contentType = r.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            throw new Error("server_unavailable");
        }

        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "save_failed");

        msg.className = "modal-save-msg success";
        msg.textContent = "Your profile has been updated!";
        setTimeout(() => {
            closeProfileModal();
            loadDashboard();
        }, 1200);
    } catch (err) {
        msg.className = "modal-save-msg error";
        const friendly = {
            server_unavailable: "We're having trouble connecting right now. Please try again in a moment or call your clinic.",
            save_failed: "We weren't able to save your changes. Please try again.",
            "Failed to fetch": "No internet connection detected. Please check your connection and try again."
        };
        msg.textContent = friendly[err.message] || "Something went wrong. You can close this and try again later, or call us directly.";
    }
}

loadDashboard();
