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

loadDashboard();
