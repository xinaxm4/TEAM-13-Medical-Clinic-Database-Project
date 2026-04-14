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
    const labels = { overview:"Overview", appointments:"Appointments", billing:"Billing Queue", profile:"My Profile", settings:"Settings" };
    document.getElementById("currentSection").textContent = labels[name] || name;
}

/* ── Settings tabs ── */
function switchSettingsTab(tab, btn) {
    document.querySelectorAll(".settings-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".settings-tab-content").forEach(c => c.classList.add("hidden"));
    if (btn) btn.classList.add("active");
    const content = document.getElementById("stab-" + tab);
    if (content) content.classList.remove("hidden");
}

/* ── Theme buttons sync ── */
function syncThemeButtons() {
    const dark = localStorage.getItem("theme") === "dark";
    document.getElementById("themeLight")?.classList.toggle("active", !dark);
    document.getElementById("themeDark")?.classList.toggle("active",  dark);
}

function setTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
    }
    syncThemeButtons();
    const btn = document.getElementById("darkModeToggle");
    if (btn) btn.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

syncThemeButtons();

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
                <td>${b.payment_status !== 'Paid' ? `<button onclick="markBillingPaid(${b.bill_id})" style="padding:4px 10px;font-size:11px;background:none;border:1px solid #10b981;color:#10b981;border-radius:6px;cursor:pointer;font-family:inherit">Mark Paid</button>` : '—'}</td>
            </tr>`).join("")
            : `<tr><td colspan="8" class="table-empty">No billing records</td></tr>`;

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

/* ── Staff: Book Appointment Modal ── */
async function openStaffBookingModal() {
    document.getElementById("staffBookingModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    document.getElementById("staffBookingError").style.display = "none";

    // Set min date
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById("sb_date").min = tomorrow.toISOString().split("T")[0];
    document.getElementById("sb_date").value = "";
    document.getElementById("sb_slot").innerHTML = '<option value="">Pick date first…</option>';

    // Load patients
    const patSelect = document.getElementById("sb_patient");
    patSelect.innerHTML = '<option value="">Loading…</option>';
    try {
        const r = await fetch(`/api/staff/patients?user_id=${user.id}`);
        const pts = await r.json();
        patSelect.innerHTML = '<option value="">Select patient…</option>' +
            pts.map(p => `<option value="${p.patient_id}">${p.first_name} ${p.last_name}</option>`).join("");
    } catch(e) { patSelect.innerHTML = '<option value="">Could not load patients</option>'; }

    // Load physicians
    const phSelect = document.getElementById("sb_physician");
    phSelect.innerHTML = '<option value="">Loading…</option>';
    try {
        const r = await fetch(`/api/staff/physicians?user_id=${user.id}`);
        const phs = await r.json();
        phSelect.innerHTML = '<option value="">Select physician…</option>' +
            phs.map(p => `<option value="${p.physician_id}">Dr. ${p.first_name} ${p.last_name} — ${p.specialty} (${p.city})</option>`).join("");
    } catch(e) { phSelect.innerHTML = '<option value="">Could not load physicians</option>'; }
}

function closeStaffBookingModal() {
    document.getElementById("staffBookingModal").classList.add("hidden");
    document.body.style.overflow = "";
}

async function loadStaffSlots() {
    const physician_id = document.getElementById("sb_physician").value;
    const date = document.getElementById("sb_date").value;
    const slotSelect = document.getElementById("sb_slot");
    if (!physician_id || !date) { slotSelect.innerHTML = '<option value="">Select physician and date</option>'; return; }
    slotSelect.innerHTML = '<option value="">Loading…</option>';
    try {
        const r = await fetch(`/api/patient/appointments/slots?physician_id=${physician_id}&date=${date}&user_id=${user.id}`);
        const data = await r.json();
        if (!data.slots || !data.slots.length) {
            slotSelect.innerHTML = '<option value="">No slots available</option>';
        } else {
            slotSelect.innerHTML = '<option value="">Choose a time…</option>' +
                data.slots.map(s => {
                    const [h, m] = s.split(":");
                    const hNum = parseInt(h);
                    const ampm = hNum >= 12 ? "PM" : "AM";
                    const h12 = hNum % 12 || 12;
                    return `<option value="${s}">${h12}:${m} ${ampm}</option>`;
                }).join("");
        }
    } catch(e) { slotSelect.innerHTML = '<option value="">Could not load slots</option>'; }
}

async function submitStaffBooking() {
    const patient_id       = document.getElementById("sb_patient").value;
    const physician_id     = document.getElementById("sb_physician").value;
    const date             = document.getElementById("sb_date").value;
    const time             = document.getElementById("sb_slot").value;
    const appointment_type = document.getElementById("sb_type").value;
    const reason           = document.getElementById("sb_reason").value.trim();
    const errEl            = document.getElementById("staffBookingError");

    if (!patient_id || !physician_id || !date || !time) {
        errEl.textContent = "Please fill in all required fields.";
        errEl.style.display = "";
        return;
    }
    errEl.style.display = "none";

    try {
        const r = await fetch("/api/staff/appointments/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, patient_id, physician_id, date, time, reason, appointment_type })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeStaffBookingModal();
        loadDashboard();
    } catch(err) {
        errEl.textContent = err.message || "Could not book appointment.";
        errEl.style.display = "";
    }
}

/* ── Staff: Mark Billing Paid ── */
async function markBillingPaid(bill_id) {
    const method = prompt("Payment method (e.g. cash, credit card, insurance):");
    if (!method) return;
    try {
        const r = await fetch(`/api/staff/billing/${bill_id}/pay`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, payment_method: method })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        loadDashboard();
    } catch(err) {
        alert(err.message || "Could not mark as paid.");
    }
}

/* ── Staff: Daily Schedule Report ── */
async function loadDailySchedule() {
    const dateInput = document.getElementById("scheduleDate");
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    const date = dateInput.value;

    document.getElementById("scheduleModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    document.getElementById("scheduleBody").innerHTML = `<tr><td colspan="7" class="table-empty">Loading…</td></tr>`;

    try {
        const r = await fetch(`/api/reports/daily-schedule?date=${date}&user_id=${user.id}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        const { summary, appointments } = data;
        document.getElementById("scheduleStats").innerHTML = `
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#4a2c8a">${summary.total}</div><div style="font-size:11px;color:#aaa;margin-top:3px">Total</div></div>
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#6ea8fe">${summary.scheduled}</div><div style="font-size:11px;color:#aaa;margin-top:3px">Scheduled</div></div>
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#10b981">${summary.completed}</div><div style="font-size:11px;color:#aaa;margin-top:3px">Completed</div></div>
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#f59e0b">${summary.noShow}</div><div style="font-size:11px;color:#aaa;margin-top:3px">No-Shows</div></div>`;

        const timeFmt = t => { if(!t) return "—"; const [h,m] = t.split(":"); const hn=parseInt(h); return `${hn%12||12}:${m} ${hn>=12?"PM":"AM"}`; };
        const pill = s => { const c={Completed:"#10b981","No-Show":"#f59e0b",Cancelled:"#9ca3af",Scheduled:"#6ea8fe"}[s]||"#9ca3af"; return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">${s}</span>`; };

        document.getElementById("scheduleBody").innerHTML = appointments.length
            ? appointments.map(a => `<tr>
                <td class="primary">${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_name}</td>
                <td>${a.physician_name}<br><span style="font-size:11px;color:#aaa">${a.specialty}</span></td>
                <td>${a.appointment_type}</td>
                <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.reason_for_visit||"—"}</td>
                <td>${a.city}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="7" class="table-empty">No appointments on this date</td></tr>`;
    } catch(err) {
        document.getElementById("scheduleBody").innerHTML = `<tr><td colspan="7" class="table-empty">Could not load schedule</td></tr>`;
    }
}

function closeScheduleModal() {
    document.getElementById("scheduleModal").classList.add("hidden");
    document.body.style.overflow = "";
}
