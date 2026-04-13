/* ── Auth check ── */
const user = JSON.parse(localStorage.getItem("clinicUser") || "null");

if (!user || user.role !== "staff") {
    window.location.href = "/client/auth/staff_login.html";
}

/* ── Logout ── */
function logoutUser() {
    localStorage.removeItem("clinicUser");
    window.location.href = "/client/auth/staff_login.html";
}
document.getElementById("logoutBtn").addEventListener("click", logoutUser);

/* ── HIPAA: Idle auto-logout after 15 minutes ── */
(function setupIdleLogout() {
    const IDLE_MS = 15 * 60 * 1000;
    let idleTimer = setTimeout(logoutUser, IDLE_MS);
    function resetTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(logoutUser, IDLE_MS);
    }
    ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"].forEach(evt =>
        document.addEventListener(evt, resetTimer, { passive: true })
    );
})();

/* ── Section nav ── */
function showSection(name) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const sec = document.getElementById("sec-" + name);
    if (sec) sec.classList.remove("hidden");
    const btn = document.querySelector(`.nav-item[onclick*="'${name}'"]`);
    if (btn) btn.classList.add("active");
    const labels = { overview:"Overview", appointments:"Appointments", billing:"Billing Queue", profile:"My Profile" };
    document.getElementById("currentSection").textContent = labels[name] || name;
}

/* ── Helpers ── */
document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

function fmt(d) { return d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—"; }
function timeFmt(t) {
    if (!t) return "—";
    const [h, m] = t.toString().split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
}
function pill(status) {
    if (!status) return '<span class="pill pill-pending">Unknown</span>';
    const s = status.toLowerCase().replace(/\s+/g, "-");
    const cls = { scheduled:"scheduled", completed:"completed", cancelled:"cancelled", pending:"pending", paid:"paid", unpaid:"unpaid" }[s] || "pending";
    return `<span class="pill pill-${cls}">${status}</span>`;
}
function infoRow(label, value) {
    return `<div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${label}</span>
        <span style="font-size:14px;color:#333">${value || "—"}</span>
    </div>`;
}

/* ── Load data ── */
async function loadDashboard() {
    try {
        const res  = await fetch(`/api/staff/staff/dashboard?user_id=${user.id}`);
        const data = await res.json();

        if (!res.ok) {
            document.getElementById("greetSub").textContent = data.message || "Could not load data.";
            return;
        }

        const { staff, appointments, billing } = data;

        /* Greeting */
        const firstName = staff?.first_name || "";
        const lastName  = staff?.last_name  || "";
        document.getElementById("greetName").textContent   = firstName;
        document.getElementById("greetSub").textContent    = `${staff?.department_name || "Department"} · ${staff?.clinic_name || "Audit Trail Health"}`;
        document.getElementById("sidebarName").textContent = `${firstName} ${lastName}`;
        document.getElementById("sidebarRole").textContent = staff?.role || "Staff";
        document.getElementById("roleBadge").textContent   = staff?.role || "Staff";
        document.getElementById("avatarInitials").textContent = (firstName[0] || "") + (lastName[0] || "");

        const shiftStr = staff?.shift_start ? `Shift: ${timeFmt(staff.shift_start)} – ${timeFmt(staff.shift_end)}` : "";
        document.getElementById("shiftInfo").textContent = shiftStr;

        /* Stats */
        const unpaid = billing.filter(b => !b.payment_status || b.payment_status.toLowerCase() !== "paid").length;
        document.getElementById("statAppts").textContent  = appointments.length;
        document.getElementById("statBills").textContent  = unpaid;
        document.getElementById("statDept").textContent   = staff?.department_name || "—";
        document.getElementById("statClinic").textContent = staff?.clinic_name || "—";
        document.getElementById("statShift").textContent  = staff?.shift_start ? `${timeFmt(staff.shift_start)}–${timeFmt(staff.shift_end)}` : "—";

        /* Overview appointments */
        const oBody = document.getElementById("overviewApptBody");
        oBody.innerHTML = appointments.slice(0, 6).length
            ? appointments.slice(0, 6).map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_first} ${a.patient_last}</td>
                <td>${a.physician_name}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="5" class="table-empty">No upcoming appointments</td></tr>`;

        /* Overview billing */
        const bOverview = document.getElementById("overviewBillBody");
        bOverview.innerHTML = billing.slice(0, 5).length
            ? billing.slice(0, 5).map(b => `<tr>
                <td class="primary">${b.first_name} ${b.last_name}</td>
                <td>$${parseFloat(b.total_amount || 0).toFixed(2)}</td>
                <td>${pill(b.payment_status || "Unpaid")}</td>
            </tr>`).join("")
            : `<tr><td colspan="3" class="table-empty">No outstanding bills</td></tr>`;

        /* Full appointments table */
        document.getElementById("apptBody").innerHTML = appointments.length
            ? appointments.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_first} ${a.patient_last}</td>
                <td>${a.physician_name}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="5" class="table-empty">No appointments found</td></tr>`;

        /* Full billing table */
        document.getElementById("billingBody").innerHTML = billing.length
            ? billing.map(b => `<tr>
                <td class="primary">#${b.bill_id}</td>
                <td>${b.first_name} ${b.last_name}</td>
                <td>$${parseFloat(b.total_amount || 0).toFixed(2)}</td>
                <td>$${parseFloat(b.tax_amount || 0).toFixed(2)}</td>
                <td style="text-transform:capitalize">${b.payment_method || "—"}</td>
                <td>${fmt(b.payment_date)}</td>
                <td>${pill(b.payment_status || "Unpaid")}</td>
            </tr>`).join("")
            : `<tr><td colspan="7" class="table-empty">No billing records</td></tr>`;

        /* Profile */
        document.getElementById("profileGrid").innerHTML = `
            ${infoRow("Full Name", `${firstName} ${lastName}`)}
            ${infoRow("Date of Birth", fmt(staff?.date_of_birth))}
            ${infoRow("Role", staff?.role)}
            ${infoRow("Department", staff?.department_name)}
            ${infoRow("Clinic", staff?.clinic_name)}
            ${infoRow("Email", staff?.email)}
            ${infoRow("Phone", staff?.phone_number)}
            ${infoRow("Hire Date", fmt(staff?.hire_date))}
            ${infoRow("Shift", shiftStr || "—")}`;

    } catch (err) {
        console.error("Staff dashboard error:", err);
        document.getElementById("greetSub").textContent = "Could not connect to server.";
    }
}

loadDashboard();
