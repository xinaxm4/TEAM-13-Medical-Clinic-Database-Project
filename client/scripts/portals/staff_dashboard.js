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
    const labels = { overview:"Dashboard", schedule:"Schedule & Booking", checkin:"Check In / Out", billing:"Billing & Payments", comms:"Communications", reports:"Appointment Reports", profile:"Staff Profile", settings:"Settings" };
    if (name === "reports") {
        showReportTab("daily", document.querySelector(".report-tab"));
        const today = localDateStr(new Date());
        const di = document.getElementById("rpt_daily_date");
        if (di) { di.value = today; }
        const mc_s = document.getElementById("rpt_mc_start");
        const mc_e = document.getElementById("rpt_mc_end");
        if (mc_s && !mc_s.value) mc_s.value = today;
        if (mc_e && !mc_e.value) mc_e.value = today;
        runDailyReport();
    }
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
                <td style="color:#10b981">$${parseFloat(b.insurance_paid_amount || 0).toFixed(2)}</td>
                <td style="color:#e74c3c;font-weight:600">$${parseFloat(b.patient_owed || 0).toFixed(2)}</td>
                <td style="text-transform:capitalize">${b.payment_method || "—"}</td>
                <td>${fmt(b.payment_date)}</td>
                <td>${pill(b.payment_status || "Unpaid")}</td>
                <td>${b.payment_status !== 'Paid'
                    ? `<button onclick="openPaymentModal(${b.bill_id},'${b.first_name} ${b.last_name}',${parseFloat(b.total_amount||0).toFixed(2)},${parseFloat(b.insurance_paid_amount||0).toFixed(2)},${parseFloat(b.patient_owed||0).toFixed(2)})"
                        style="padding:4px 10px;font-size:11px;background:none;border:1px solid #10b981;color:#10b981;border-radius:6px;cursor:pointer;font-family:inherit">Mark Paid</button>`
                    : '<span style="color:#10b981;font-size:12px;font-weight:600">✓ Paid</span>'}</td>
            </tr>`).join("")
            : `<tr><td colspan="9" class="table-empty">No billing records</td></tr>`;

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

/* ── Staff: Mark Billing Paid — Modal ── */
let _payBillId = null;

function openPaymentModal(bill_id, patientName, total, insurancePaid, patientOwed) {
    _payBillId = bill_id;
    document.getElementById("paymentModalSub").textContent = `Bill #${bill_id} — ${patientName}`;
    document.getElementById("payTotal").textContent     = `$${parseFloat(total).toFixed(2)}`;
    document.getElementById("payInsurance").textContent = `−$${parseFloat(insurancePaid).toFixed(2)}`;
    document.getElementById("payOwed").textContent      = `$${parseFloat(patientOwed).toFixed(2)}`;
    document.getElementById("paymentMethod").value = "";
    document.getElementById("paymentRef").value    = "";
    document.getElementById("paymentError").style.display = "none";
    document.getElementById("paymentModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closePaymentModal() {
    document.getElementById("paymentModal").classList.add("hidden");
    document.body.style.overflow = "";
    _payBillId = null;
}

async function confirmPayment() {
    const method = document.getElementById("paymentMethod").value;
    const ref    = document.getElementById("paymentRef").value.trim();
    const errEl  = document.getElementById("paymentError");

    if (!method) {
        errEl.textContent = "Please select a payment method.";
        errEl.style.display = "block";
        return;
    }

    const methodLabel = ref ? `${method} (${ref})` : method;

    try {
        const r = await fetch(`/api/staff/billing/${_payBillId}/pay`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, payment_method: methodLabel })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closePaymentModal();
        loadDashboard();
    } catch(err) {
        errEl.textContent = err.message || "Could not record payment. Please try again.";
        errEl.style.display = "block";
    }
}

/* ── Staff: Daily Schedule Report ── */
function localDateStr(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
async function loadDailySchedule() {
    const dateInput = document.getElementById("scheduleDate");
    if (!dateInput.value) {
        dateInput.value = localDateStr();
    }
    const date = dateInput.value;

    // Update header label with human-readable date
    const [y,m,d] = date.split("-").map(Number);
    const labelDate = new Date(y, m-1, d);
    const isToday = labelDate.toDateString() === new Date().toDateString();
    const dateLabel = labelDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
    const labelEl = document.getElementById("scheduleDateLabel");
    if (labelEl) labelEl.textContent = isToday ? `Today, ${dateLabel}` : dateLabel;

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

/* ── Staff: Onboard New Patient Modal ── */
let _onboardStep = 1;
let _onboardInsuranceList = [];
let _acceptingPhysicians  = [];

async function openOnboardModal() {
    _onboardStep = 1;
    renderOnboardStep();
    document.getElementById("onboardModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    document.getElementById("onboardError").style.display = "none";

    // Reset all fields
    ["ob_first","ob_last","ob_email","ob_phone","ob_street","ob_city","ob_state","ob_zip","ob_ec_name","ob_ec_phone","ob_reason","ob_member_id"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    ["ob_dob","ob_date"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    ["ob_gender"].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
    document.getElementById("ob_slot").innerHTML = '<option value="">Pick physician &amp; date first</option>';
    document.getElementById("ob_physician_schedule").textContent = "";
    document.getElementById("ob_coverage_badge").style.display = "none";

    // Set min date for appointment to tomorrow
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById("ob_date").min = tomorrow.toISOString().split("T")[0];

    // Load insurance options — use public auth endpoint (not patient-role-gated)
    const insSelect = document.getElementById("ob_insurance");
    insSelect.innerHTML = '<option value="">None / Self-Pay</option>';
    try {
        const r = await fetch(`/api/auth/insurance-plans`);
        _onboardInsuranceList = await r.json();
        insSelect.innerHTML = '<option value="">None / Self-Pay</option>' +
            _onboardInsuranceList.map(i => `<option value="${i.insurance_id}" data-cov="${i.coverage_percentage}">${i.provider_name} (${i.coverage_percentage}% coverage)</option>`).join("");
    } catch(e) { /* non-fatal */ }

    // Load accepting physicians for step 3
    try {
        const r2 = await fetch(`/api/staff/physicians/accepting?user_id=${user.id}`);
        _acceptingPhysicians = await r2.json();
    } catch(e) { _acceptingPhysicians = []; }
}

function closeOnboardModal() {
    document.getElementById("onboardModal").classList.add("hidden");
    document.body.style.overflow = "";
}

function showInsuranceCoverage() {
    const sel = document.getElementById("ob_insurance");
    const badge = document.getElementById("ob_coverage_badge");
    const opt = sel.options[sel.selectedIndex];
    if (!sel.value) { badge.style.display = "none"; return; }
    const cov = opt.getAttribute("data-cov");
    badge.style.display = "";
    badge.textContent = `✓ ${opt.text} — This plan is accepted. ${cov}% of the visit cost will be covered by insurance.`;
}

function renderOnboardStep() {
    const labels = ["Step 1 of 3 — Insurance", "Step 2 of 3 — Patient Information", "Step 3 of 3 — First Appointment"];
    document.getElementById("onboardStepLabel").textContent = labels[_onboardStep - 1];

    // Show/hide steps
    [1, 2, 3].forEach(i => {
        const el = document.getElementById(`onboard-step-${i}`);
        if (el) el.style.display = i === _onboardStep ? "flex" : "none";
    });

    // Step indicator pills
    [1, 2, 3].forEach(i => {
        const dot = document.getElementById(`onboard-dot-${i}`);
        if (!dot) return;
        dot.style.color = i === _onboardStep ? "#10b981" : (i < _onboardStep ? "#10b981" : "#aaa");
        dot.style.borderBottomColor = i === _onboardStep ? "#10b981" : (i < _onboardStep ? "#10b981" : "transparent");
        dot.style.fontWeight = i === _onboardStep ? "700" : "600";
    });

    // Prev/Next buttons
    const prevBtn = document.getElementById("onboardPrevBtn");
    const nextBtn = document.getElementById("onboardNextBtn");
    prevBtn.style.display = _onboardStep > 1 ? "" : "none";
    nextBtn.textContent = _onboardStep < 3 ? "Next →" : "Create Patient & Book Appointment";

    // Populate physician dropdown on step 3
    if (_onboardStep === 3) {
        const phSelect = document.getElementById("ob_physician");
        phSelect.innerHTML = '<option value="">Select physician…</option>' +
            _acceptingPhysicians.map(p =>
                `<option value="${p.physician_id}" data-city="${p.city}" data-days="${p.schedule.map(s=>s.day_of_week).join(', ')}">`
                + `Dr. ${p.first_name} ${p.last_name} — ${p.specialty} (${p.city})</option>`
            ).join("");
    }
}

function onboardPrev() {
    if (_onboardStep > 1) { _onboardStep--; renderOnboardStep(); }
    document.getElementById("onboardError").style.display = "none";
}

function onboardNext() {
    document.getElementById("onboardError").style.display = "none";

    if (_onboardStep === 1) {
        _onboardStep = 2;
        renderOnboardStep();
        return;
    }

    if (_onboardStep === 2) {
        const first = document.getElementById("ob_first").value.trim();
        const last  = document.getElementById("ob_last").value.trim();
        const email = document.getElementById("ob_email").value.trim();
        if (!first || !last) { showOnboardError("First name and last name are required."); return; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showOnboardError("A valid email address is required (used as portal login)."); return; }
        _onboardStep = 3;
        renderOnboardStep();
        return;
    }

    if (_onboardStep === 3) {
        submitOnboarding();
    }
}

function showOnboardError(msg) {
    const el = document.getElementById("onboardError");
    el.textContent = msg;
    el.style.display = "";
}

async function loadOnboardSlots() {
    const physician_id = document.getElementById("ob_physician").value;
    const date = document.getElementById("ob_date").value;
    const slotSelect = document.getElementById("ob_slot");
    const schedEl = document.getElementById("ob_physician_schedule");

    if (physician_id) {
        const opt = document.getElementById("ob_physician").options[document.getElementById("ob_physician").selectedIndex];
        const days = opt.getAttribute("data-days");
        schedEl.textContent = days ? `Works: ${days}` : "";
    }

    if (!physician_id || !date) { slotSelect.innerHTML = '<option value="">Pick physician &amp; date first</option>'; return; }
    slotSelect.innerHTML = '<option value="">Loading…</option>';
    try {
        const r = await fetch(`/api/patient/appointments/slots?physician_id=${physician_id}&date=${date}&user_id=${user.id}`);
        const data = await r.json();
        if (!data.slots || !data.slots.length) {
            slotSelect.innerHTML = '<option value="">No slots available on this day</option>';
        } else {
            slotSelect.innerHTML = '<option value="">Choose a time…</option>' +
                data.slots.map(s => {
                    const [h, m] = s.split(":");
                    const hn = parseInt(h);
                    return `<option value="${s}">${hn % 12 || 12}:${m} ${hn >= 12 ? "PM" : "AM"}</option>`;
                }).join("");
        }
    } catch(e) { slotSelect.innerHTML = '<option value="">Could not load slots</option>'; }
}

async function submitOnboarding() {
    const physician_id = document.getElementById("ob_physician").value;
    const date         = document.getElementById("ob_date").value;
    const time         = document.getElementById("ob_slot").value;

    if (!physician_id) { showOnboardError("Please select a physician."); return; }
    if (!date)         { showOnboardError("Please select an appointment date."); return; }
    if (!time)         { showOnboardError("Please select a time slot."); return; }

    const nextBtn = document.getElementById("onboardNextBtn");
    nextBtn.textContent = "Creating…";
    nextBtn.disabled = true;

    const payload = {
        first_name:               document.getElementById("ob_first").value.trim(),
        last_name:                document.getElementById("ob_last").value.trim(),
        email:                    document.getElementById("ob_email").value.trim(),
        phone_number:             document.getElementById("ob_phone").value.trim() || null,
        date_of_birth:            document.getElementById("ob_dob").value || null,
        gender:                   document.getElementById("ob_gender").value || null,
        street_address:           document.getElementById("ob_street").value.trim() || null,
        city:                     document.getElementById("ob_city").value.trim() || null,
        state:                    document.getElementById("ob_state").value.trim().toUpperCase() || null,
        zip_code:                 document.getElementById("ob_zip").value.trim() || null,
        emergency_contact_name:   document.getElementById("ob_ec_name").value.trim() || null,
        emergency_contact_phone:  document.getElementById("ob_ec_phone").value.trim() || null,
        insurance_id:             document.getElementById("ob_insurance").value || null,
        physician_id, date, time,
        reason:                   document.getElementById("ob_reason").value.trim() || null,
        user_id: user.id
    };

    try {
        const r = await fetch("/api/staff/patients/onboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await r.json();

        if (!r.ok && !data.temp_password) {
            // Hard error — no patient created
            showOnboardError(data.message || "Could not complete onboarding.");
            nextBtn.textContent = "Create Patient & Book Appointment";
            nextBtn.disabled = false;
            return;
        }

        // Success (or partial success where patient created but appointment had an issue)
        closeOnboardModal();
        showOnboardSuccess(data);
        loadDashboard();

    } catch(err) {
        showOnboardError(err.message || "Could not connect to server.");
        nextBtn.textContent = "Create Patient & Book Appointment";
        nextBtn.disabled = false;
    }
}

function showOnboardSuccess(data) {
    const fmt = d => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }) : "—";
    const timeFmtLocal = t => { if(!t) return "—"; const [h,m]=t.split(":"); const hr=parseInt(h); return `${hr%12||12}:${m} ${hr<12?"AM":"PM"}`; };

    const payload_date   = document.getElementById("ob_date").value;
    const payload_time   = document.getElementById("ob_slot").value;
    const payload_first  = document.getElementById("ob_first").value.trim();
    const payload_last   = document.getElementById("ob_last").value.trim();

    const body = document.getElementById("onboardSuccessBody");
    body.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:6px">
            <div style="font-size:12px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Patient Created</div>
            <div style="font-size:16px;font-weight:700;color:#065f46">${payload_first} ${payload_last}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
                <div style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Portal Login</div>
                <div style="font-size:13px;color:#333">${data.email}</div>
            </div>
            <div>
                <div style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Temp Password</div>
                <div style="font-size:14px;font-weight:700;color:#7c3aed;font-family:monospace;background:#f5f3ff;padding:4px 8px;border-radius:5px;display:inline-block">${data.temp_password}</div>
            </div>
            <div style="grid-column:1/-1">
                <div style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">First Appointment</div>
                <div style="font-size:13px;color:#333">${data.appointmentError ? "⚠ Not booked — book manually" : fmt(payload_date) + " at " + timeFmtLocal(payload_time) + " (New Patient Visit, 60 min)"}</div>
            </div>
        </div>`;

    document.getElementById("onboardSuccessModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeOnboardSuccessModal() {
    document.getElementById("onboardSuccessModal").classList.add("hidden");
    document.body.style.overflow = "";
}

/* ── Appointment Reports ── */
function showReportTab(tab, btn) {
    ["daily","missed","upcoming"].forEach(t => {
        document.getElementById(`rcontent-${t}`).style.display = "none";
    });
    document.querySelectorAll(".report-tab").forEach(b => b.classList.remove("active"));
    document.getElementById(`rcontent-${tab}`).style.display = "flex";
    if (btn) btn.classList.add("active");
}

function statBox(value, label, color) {
    return `<div style="background:#f8faff;border:1px solid #e0e4f0;border-radius:10px;padding:14px 18px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:${color}">${value}</div>
        <div style="font-size:11px;color:#aaa;margin-top:3px;text-transform:uppercase;letter-spacing:.5px;font-weight:600">${label}</div>
    </div>`;
}

async function runDailyReport() {
    const dateInput = document.getElementById("rpt_daily_date");
    if (!dateInput.value) {
        const n = new Date();
        dateInput.value = localDateStr(n);
    }
    const date = dateInput.value;

    const statsEl = document.getElementById("rpt_daily_stats");
    const tableEl = document.getElementById("rpt_daily_table");
    const tbody   = document.getElementById("rpt_daily_body");
    statsEl.style.display = "none";
    tableEl.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Loading…</td></tr>`;

    try {
        const r = await fetch(`/api/reports/daily-schedule?date=${date}&user_id=${user.id}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        const { summary, appointments } = data;
        statsEl.innerHTML =
            statBox(summary.total,     "Total",     "#4a2c8a") +
            statBox(summary.scheduled, "Scheduled", "#6ea8fe") +
            statBox(summary.completed, "Completed", "#10b981") +
            statBox(summary.noShow,    "No-Shows",  "#f59e0b");
        statsEl.style.display = "grid";

        tbody.innerHTML = appointments.length
            ? appointments.map(a => `<tr>
                <td class="primary">${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_name}</td>
                <td>${a.physician_name}</td>
                <td style="color:#888;font-size:12px">${a.specialty}</td>
                <td>${a.appointment_type || "—"}</td>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.reason_for_visit || "—"}</td>
                <td>${a.city}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="8" class="table-empty">No appointments on this date</td></tr>`;
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Could not load report</td></tr>`;
    }
}

async function runMissedCancelledReport() {
    const n = new Date();
    const today = localDateStr(n);
    const startEl = document.getElementById("rpt_mc_start");
    const endEl   = document.getElementById("rpt_mc_end");
    if (!startEl.value) startEl.value = today;
    if (!endEl.value)   endEl.value   = today;

    const statsEl = document.getElementById("rpt_mc_stats");
    const tableEl = document.getElementById("rpt_mc_table");
    const tbody   = document.getElementById("rpt_mc_body");
    statsEl.style.display = "none";
    tableEl.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Loading…</td></tr>`;

    try {
        const r = await fetch(`/api/reports/missed-cancelled?start_date=${startEl.value}&end_date=${endEl.value}&user_id=${user.id}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        const { summary, appointments } = data;
        statsEl.innerHTML =
            statBox(summary.total,     "Total",     "#d97706") +
            statBox(summary.noShows,   "No-Shows",  "#ef4444") +
            statBox(summary.cancelled, "Cancelled", "#9ca3af");
        statsEl.style.display = "grid";

        tbody.innerHTML = appointments.length
            ? appointments.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_name}</td>
                <td style="color:#888;font-size:12px">${a.patient_phone || "—"}</td>
                <td>${a.physician_name}</td>
                <td>${a.appointment_type || "—"}</td>
                <td>${a.city}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="8" class="table-empty">No missed or cancelled appointments in this range</td></tr>`;
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Could not load report</td></tr>`;
    }
}

async function runUpcomingReport() {
    const days  = document.getElementById("rpt_up_days").value;
    const statsEl = document.getElementById("rpt_up_stats");
    const tableEl = document.getElementById("rpt_up_table");
    const tbody   = document.getElementById("rpt_up_body");
    statsEl.style.display = "none";
    tableEl.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Loading…</td></tr>`;

    try {
        const r = await fetch(`/api/reports/upcoming?days=${days}&user_id=${user.id}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        statsEl.innerHTML = `<div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:12px 18px;font-size:13px;color:#065f46;font-weight:600">${data.total} scheduled appointment${data.total !== 1 ? "s" : ""} in the next ${data.days} days</div>`;
        statsEl.style.display = "block";

        tbody.innerHTML = data.appointments.length
            ? data.appointments.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_name}</td>
                <td style="color:#888;font-size:12px">${a.patient_phone || "—"}</td>
                <td>${a.physician_name}</td>
                <td style="color:#888;font-size:12px">${a.specialty}</td>
                <td>${a.appointment_type || "—"}</td>
                <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.reason_for_visit || "—"}</td>
                <td>${a.city}</td>
            </tr>`).join("")
            : `<tr><td colspan="9" class="table-empty">No upcoming appointments in this window</td></tr>`;
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Could not load report</td></tr>`;
    }
}
