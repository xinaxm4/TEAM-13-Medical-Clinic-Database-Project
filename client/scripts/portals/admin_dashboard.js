/* ── Auth guard ── */
const user = JSON.parse(localStorage.getItem("clinicUser") || "null");
if (!user || user.role !== "admin") {
    window.location.href = "/client/auth/admin_login.html";
}

/* ── Sidebar name + location ── */
const displayName = (user?.firstName && user?.lastName)
    ? `${user.firstName} ${user.lastName}`
    : user?.username || "Administrator";
document.getElementById("sidebarName").textContent = displayName;

// Location badge in sidebar
const sidebarLoc = document.getElementById("sidebarLocation");
if (sidebarLoc) {
    sidebarLoc.textContent = user?.isGlobal
        ? "🌐 All Locations"
        : `📍 ${user?.clinicCity || user?.clinicName || ""}`;
}

// Greeting card
const greetName = document.getElementById("greetName");
if (greetName) greetName.textContent = `Welcome, ${user?.firstName || "Administrator"}.`;

const greetLocation = document.getElementById("greetLocation");
const greetLocationText = document.getElementById("greetLocationText");
if (greetLocation && greetLocationText) {
    if (user?.isGlobal) {
        greetLocationText.textContent = "Global Admin — All Locations";
    } else {
        greetLocationText.textContent = `${user?.clinicName || ""}${user?.clinicCity ? ` · ${user.clinicCity}, ${user?.clinicState || ""}` : ""}`;
    }
    greetLocation.style.display = "block";
}

// Badge
const adminBadge = document.getElementById("adminBadge");
if (adminBadge) adminBadge.textContent = user?.isGlobal ? "Global Admin" : "Clinic Admin";

/* ── Logout ── */
function logoutUser() {
    localStorage.removeItem("clinicUser");
    window.location.href = "/client/auth/admin_login.html";
}
document.getElementById("logoutBtn").addEventListener("click", logoutUser);

/* ── HIPAA: idle logout after 15 minutes ── */
(function setupIdleLogout() {
    const IDLE_MS = 15 * 60 * 1000;
    let idleTimer = setTimeout(logoutUser, IDLE_MS);
    function resetTimer() { clearTimeout(idleTimer); idleTimer = setTimeout(logoutUser, IDLE_MS); }
    ["mousemove","mousedown","keydown","touchstart","scroll","click"].forEach(e =>
        document.addEventListener(e, resetTimer, { passive: true })
    );
})();

/* ── Section nav ── */
const sectionLabels = {
    overview:"Overview", physicians:"Physicians", staff:"Staff Members",
    reports:"Clinic Reports", analytics:"Analytics", settings:"Settings"
};

function showSection(name) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const sec = document.getElementById("sec-" + name);
    if (sec) sec.classList.remove("hidden");
    const btn = document.querySelector(`.nav-item[onclick*="'${name}'"]`);
    if (btn) btn.classList.add("active");
    document.getElementById("currentSection").textContent = sectionLabels[name] || name;

    // Lazy-load section data
    if (name === "physicians") loadPhysicians();
    if (name === "staff")      loadStaff();
    if (name === "reports")    loadClinicReport();
    if (name === "analytics")  initAnalytics();
}

/* ── Theme ── */
function syncThemeButtons() {
    const dark = localStorage.getItem("theme") === "dark";
    document.getElementById("themeLight")?.classList.toggle("active", !dark);
    document.getElementById("themeDark")?.classList.toggle("active",  dark);
}
function setTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme","dark");
        localStorage.setItem("theme","dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme","light");
    }
    syncThemeButtons();
}
function switchSettingsTab(tab, btn) {
    document.querySelectorAll(".settings-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".settings-tab-content").forEach(c => c.classList.add("hidden"));
    if (btn) btn.classList.add("active");
    const content = document.getElementById("stab-" + tab);
    if (content) content.classList.remove("hidden");
}
syncThemeButtons();

/* ── Helpers ── */
document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-US", {
    weekday:"long", year:"numeric", month:"long", day:"numeric"
});
function fmt(d) { return d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—"; }
function timeFmt(t) {
    if (!t) return "—";
    const [h, m] = t.toString().split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
}
function pill(status) {
    if (!status) return '<span class="pill pill-pending">Unknown</span>';
    const s = status.toLowerCase().replace(/\s+/g,"-");
    const cls = { scheduled:"scheduled", completed:"completed", cancelled:"cancelled",
                  "no-show":"cancelled", pending:"pending", paid:"paid", unpaid:"unpaid" }[s] || "pending";
    return `<span class="pill pill-${cls}">${status}</span>`;
}
function money(v) { return "$" + parseFloat(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,","); }

/* ══════════════════════════════════════
   OVERVIEW — load dashboard stats
══════════════════════════════════════ */
async function loadOverview() {
    try {
        const res  = await fetch(`/api/admin/dashboard?user_id=${user.id}`);
        const data = await res.json();
        if (!res.ok) { document.getElementById("greetSub").textContent = data.message || "Could not load data."; return; }

        const { stats, clinics, recentAppts } = data;

        document.getElementById("greetSub").textContent = `Managing ${clinics.length} clinic location(s) · Audit Trail Health`;
        document.getElementById("statPhysicians").textContent = stats?.total_physicians ?? "—";
        document.getElementById("statStaff").textContent      = stats?.total_staff      ?? "—";
        document.getElementById("statPatients").textContent   = stats?.total_patients   ?? "—";
        document.getElementById("statAppts").textContent      = stats?.upcoming_appointments ?? "—";

        // Clinic summary table
        document.getElementById("clinicSummaryBody").innerHTML = clinics.length
            ? clinics.map(c => `<tr>
                <td class="primary">${c.clinic_name}</td>
                <td>${c.city}, ${c.state}</td>
                <td>${c.departments}</td>
                <td>${c.physicians}</td>
                <td>${c.appointments_this_month}</td>
            </tr>`).join("")
            : `<tr><td colspan="5" class="table-empty">No clinics found</td></tr>`;

        // Recent appointments
        document.getElementById("recentApptBody").innerHTML = recentAppts.length
            ? recentAppts.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_name}</td>
                <td>${a.physician_name}</td>
                <td>${a.city}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="6" class="table-empty">No appointments found</td></tr>`;

    } catch(e) {
        document.getElementById("greetSub").textContent = "Could not connect to server.";
    }
}

/* ══════════════════════════════════════
   PHYSICIANS
══════════════════════════════════════ */
let _departmentsLoaded = false;

async function loadDepartments() {
    if (_departmentsLoaded) return;
    try {
        const r = await fetch(`/api/admin/departments?user_id=${user.id}`);
        const rows = await r.json();
        const opts = '<option value="">— Select Department —</option>' +
            rows.map(d => `<option value="${d.department_id}">${d.clinic_name} → ${d.department_name}</option>`).join("");
        document.getElementById("ph_dept").innerHTML = opts;
        document.getElementById("st_dept").innerHTML = opts;
        _departmentsLoaded = true;
    } catch(e) {}
}

async function loadOfficesForSchedule() {
    try {
        const r = await fetch(`/api/admin/offices?user_id=${user.id}`);
        return await r.json();
    } catch(e) { return []; }
}

async function loadPhysicians() {
    loadDepartments();
    try {
        const r    = await fetch(`/api/admin/physicians?user_id=${user.id}`);
        const rows = await r.json();
        document.getElementById("physicianListBody").innerHTML = rows.length
            ? rows.map(p => `<tr>
                <td class="primary">Dr. ${p.first_name} ${p.last_name}</td>
                <td>${p.specialty || "—"}</td>
                <td style="text-transform:capitalize">${p.physician_type || "—"}</td>
                <td>${p.department_name || "—"}</td>
                <td>${p.clinic_name || "—"}</td>
                <td>${p.email || "—"}</td>
                <td>${fmt(p.hire_date)}</td>
            </tr>`).join("")
            : `<tr><td colspan="7" class="table-empty">No physicians found</td></tr>`;
    } catch(e) {
        document.getElementById("physicianListBody").innerHTML = `<tr><td colspan="7" class="table-empty">Could not load data</td></tr>`;
    }
}

/* ── Schedule builder ── */
let _offices = [];
async function addScheduleRow() {
    if (!_offices.length) _offices = await loadOfficesForSchedule();
    const officeOpts = _offices.map(o => `<option value="${o.office_id}">${o.clinic_name} — ${o.city}</option>`).join("");
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const dayOpts = days.map(d => `<option value="${d}">${d}</option>`).join("");
    const idx = Date.now();
    const row = document.createElement("div");
    row.className = "schedule-row";
    row.id = "srow-" + idx;
    row.innerHTML = `
        <button class="remove-sched-btn" onclick="this.parentElement.remove()">×</button>
        <select style="padding:7px 10px;border:1px solid #e0e3ed;border-radius:7px;font-size:12px;font-family:inherit" class="srow-office">${officeOpts}</select>
        <select style="padding:7px 10px;border:1px solid #e0e3ed;border-radius:7px;font-size:12px;font-family:inherit" class="srow-day">${dayOpts}</select>
        <div style="display:flex;gap:6px;align-items:center">
            <input type="time" class="srow-start" style="padding:7px;border:1px solid #e0e3ed;border-radius:7px;font-size:12px;font-family:inherit">
            <span style="font-size:11px;color:#aaa">to</span>
            <input type="time" class="srow-end" style="padding:7px;border:1px solid #e0e3ed;border-radius:7px;font-size:12px;font-family:inherit">
        </div>`;
    document.getElementById("scheduleRows").appendChild(row);
}

async function submitAddPhysician() {
    const errEl = document.getElementById("phError");
    errEl.style.display = "none";

    const first_name    = document.getElementById("ph_first").value.trim();
    const last_name     = document.getElementById("ph_last").value.trim();
    const email         = document.getElementById("ph_email").value.trim();
    const phone_number  = document.getElementById("ph_phone").value.trim();
    const specialty     = document.getElementById("ph_specialty").value.trim();
    const physician_type = document.getElementById("ph_type").value;
    const department_id = document.getElementById("ph_dept").value;
    const hire_date     = document.getElementById("ph_hire").value;
    const username      = document.getElementById("ph_user").value.trim();
    const password      = document.getElementById("ph_pass").value;

    if (!first_name || !last_name || !username || !password) {
        errEl.textContent = "First name, last name, username, and password are required.";
        errEl.style.display = "block";
        return;
    }

    // Collect schedule rows
    const schedule = [];
    document.querySelectorAll("#scheduleRows .schedule-row").forEach(row => {
        const office_id  = row.querySelector(".srow-office")?.value;
        const day_of_week = row.querySelector(".srow-day")?.value;
        const start_time = row.querySelector(".srow-start")?.value;
        const end_time   = row.querySelector(".srow-end")?.value;
        if (office_id && day_of_week && start_time && end_time)
            schedule.push({ office_id, day_of_week, start_time, end_time });
    });

    try {
        const r = await fetch("/api/admin/add-physician", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, first_name, last_name, email, phone_number,
                specialty, physician_type, department_id: department_id || null,
                hire_date: hire_date || null, username, password, schedule })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        // Reset form
        ["ph_first","ph_last","ph_email","ph_phone","ph_specialty","ph_hire","ph_user","ph_pass"]
            .forEach(id => document.getElementById(id).value = "");
        document.getElementById("scheduleRows").innerHTML = "";
        document.getElementById("ph_type").value = "primary";
        document.getElementById("ph_dept").value = "";

        // Show success and reload list
        errEl.style.color = "#0d7a60";
        errEl.textContent = `✓ Dr. ${first_name} ${last_name} added successfully!`;
        errEl.style.display = "block";
        setTimeout(() => { errEl.style.display = "none"; errEl.style.color = "#e05c5c"; }, 4000);
        loadPhysicians();
    } catch(err) {
        errEl.textContent = err.message || "Could not add physician.";
        errEl.style.display = "block";
    }
}

/* ══════════════════════════════════════
   STAFF
══════════════════════════════════════ */
async function loadStaff() {
    loadDepartments();
    try {
        const r    = await fetch(`/api/admin/staff-members?user_id=${user.id}`);
        const rows = await r.json();
        document.getElementById("staffListBody").innerHTML = rows.length
            ? rows.map(s => `<tr>
                <td class="primary">${s.first_name} ${s.last_name}</td>
                <td>${s.role || "—"}</td>
                <td>${s.department_name || "—"}</td>
                <td>${s.clinic_name || "—"}</td>
                <td>${s.email || "—"}</td>
                <td>${s.shift_start ? timeFmt(s.shift_start) + " – " + timeFmt(s.shift_end) : "—"}</td>
                <td>${fmt(s.hire_date)}</td>
            </tr>`).join("")
            : `<tr><td colspan="7" class="table-empty">No staff members found</td></tr>`;
    } catch(e) {
        document.getElementById("staffListBody").innerHTML = `<tr><td colspan="7" class="table-empty">Could not load data</td></tr>`;
    }
}

async function submitAddStaff() {
    const errEl = document.getElementById("stError");
    errEl.style.display = "none";

    const first_name   = document.getElementById("st_first").value.trim();
    const last_name    = document.getElementById("st_last").value.trim();
    const email        = document.getElementById("st_email").value.trim();
    const phone_number = document.getElementById("st_phone").value.trim();
    const role         = document.getElementById("st_role").value;
    const department_id = document.getElementById("st_dept").value;
    const hire_date    = document.getElementById("st_hire").value;
    const shift_start  = document.getElementById("st_shift_start").value;
    const shift_end    = document.getElementById("st_shift_end").value;
    const username     = document.getElementById("st_user").value.trim();
    const password     = document.getElementById("st_pass").value;

    if (!first_name || !last_name || !username || !password) {
        errEl.textContent = "First name, last name, username, and password are required.";
        errEl.style.display = "block";
        return;
    }

    try {
        const r = await fetch("/api/admin/add-staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, first_name, last_name, email, phone_number,
                role, department_id: department_id || null,
                hire_date: hire_date || null,
                shift_start: shift_start || null, shift_end: shift_end || null,
                username, password })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        ["st_first","st_last","st_email","st_phone","st_hire","st_shift_start","st_shift_end","st_user","st_pass"]
            .forEach(id => document.getElementById(id).value = "");
        document.getElementById("st_role").value = "Receptionist";
        document.getElementById("st_dept").value = "";

        errEl.style.color = "#0d7a60";
        errEl.textContent = `✓ ${first_name} ${last_name} added successfully!`;
        errEl.style.display = "block";
        setTimeout(() => { errEl.style.display = "none"; errEl.style.color = "#e05c5c"; }, 4000);
        loadStaff();
    } catch(err) {
        errEl.textContent = err.message || "Could not add staff member.";
        errEl.style.display = "block";
    }
}

/* ══════════════════════════════════════
   CLINIC REPORTS
══════════════════════════════════════ */
async function loadClinicReport() {
    document.getElementById("clinicReportCards").innerHTML = '<p style="color:#aaa;padding:20px">Loading clinic reports…</p>';
    try {
        const res  = await fetch(`/api/admin/clinic-report?user_id=${user.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const { clinics } = data;

        // Update revenue stats
        const totalBilled   = clinics.reduce((s,c) => s + parseFloat(c.total_billed || 0), 0);
        const totalOutstanding = clinics.reduce((s,c) => s + parseFloat(c.outstanding_balance || 0), 0);
        document.getElementById("rptTotalBilled").textContent   = money(totalBilled);
        document.getElementById("rptOutstanding").textContent   = money(totalOutstanding);

        // Render per-clinic cards
        document.getElementById("clinicReportCards").innerHTML = clinics.map(c => {
            const completionRate = c.total_appointments
                ? Math.round((c.completed / c.total_appointments) * 100)
                : 0;
            return `
            <div class="clinic-report-card">
                <h4>${c.clinic_name}</h4>
                <p class="sub">${c.city}, ${c.state}</p>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="val">${c.total_physicians}</div>
                        <div class="lbl">Physicians</div>
                    </div>
                    <div class="report-stat">
                        <div class="val">${c.total_staff}</div>
                        <div class="lbl">Staff</div>
                    </div>
                    <div class="report-stat">
                        <div class="val">${c.total_appointments}</div>
                        <div class="lbl">Total Appts</div>
                    </div>
                    <div class="report-stat">
                        <div class="val">${completionRate}%</div>
                        <div class="lbl">Completion</div>
                    </div>
                    <div class="report-stat">
                        <div class="val">${c.completed}</div>
                        <div class="lbl">Completed</div>
                    </div>
                    <div class="report-stat">
                        <div class="val">${c.no_shows}</div>
                        <div class="lbl">No-Shows</div>
                    </div>
                    <div class="report-stat">
                        <div class="val">${c.cancelled}</div>
                        <div class="lbl">Cancelled</div>
                    </div>
                    <div class="report-stat">
                        <div class="val" style="font-size:16px">${money(c.total_collected)}</div>
                        <div class="lbl">Collected</div>
                    </div>
                    <div class="report-stat">
                        <div class="val" style="font-size:16px;color:#e74c3c">${money(c.outstanding_balance)}</div>
                        <div class="lbl">Outstanding</div>
                    </div>
                    <div class="report-stat">
                        <div class="val" style="font-size:16px">${money(c.total_billed)}</div>
                        <div class="lbl">Total Billed</div>
                    </div>
                </div>
            </div>`;
        }).join("") || '<p style="color:#aaa;padding:20px">No clinic data found.</p>';

    } catch(e) {
        document.getElementById("clinicReportCards").innerHTML = `<p style="color:#e05c5c;padding:20px">Could not load reports: ${e.message}</p>`;
    }
}

/* ── Bootstrap ── */
loadOverview();

/* ══════════════════════════════════════════════════
   ANALYTICS SECTION
══════════════════════════════════════════════════ */

const chartInstances = {};

function renderChart(id, type, labels, datasets, options = {}) {
    if (chartInstances[id]) chartInstances[id].destroy();
    const ctx = document.getElementById(id);
    if (!ctx) return;
    chartInstances[id] = new Chart(ctx, {
        type,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: "bottom" } },
            ...options
        }
    });
}

function filterTable(tableId, query) {
    const q = query.toLowerCase();
    document.querySelectorAll(`#${tableId} tbody tr`).forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
    });
}

function toggleView(panel, mode, btn) {
    const chartView = document.getElementById(`${panel}-chart-view`);
    const listView  = document.getElementById(`${panel}-list-view`);
    const arList    = document.getElementById("fin-ar-list");
    btn.closest(".view-toggle").querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (mode === "chart") {
        chartView?.classList.remove("hidden-view"); chartView?.classList.add("chart-view");
        listView?.classList.remove("visible");
        if (arList) { arList.classList.remove("hidden-view"); arList.classList.add("chart-view"); }
    } else {
        chartView?.classList.add("hidden-view"); chartView?.classList.remove("chart-view");
        listView?.classList.add("visible");
        if (arList) { arList.classList.add("hidden-view"); arList.classList.remove("chart-view"); }
    }
}

function switchReportTab(tab, btn) {
    document.querySelectorAll(".report-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".report-panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`report-${tab}`)?.classList.add("active");

    if (tab === "financial")    loadFinancialReports();
    if (tab === "appointments") loadAppointmentReports();
    if (tab === "physicians")   loadPhysicianReports();
    if (tab === "referrals")    loadReferralReport();
}

function getDateRange(fromId, toId) {
    const from = document.getElementById(fromId)?.value || "2020-01-01";
    const to   = document.getElementById(toId)?.value   || new Date().toISOString().slice(0, 10);
    return { from, to };
}

function money(v) { return "$" + parseFloat(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function buildTableRows(tbodySelector, rows, cellFns) {
    const tbody = document.querySelector(tbodySelector);
    if (!tbody) return;
    tbody.innerHTML = rows.length
        ? rows.map(r => `<tr>${cellFns.map(fn => `<td>${fn(r) ?? "—"}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${cellFns.length}" style="text-align:center;color:#aaa;padding:20px">No data found.</td></tr>`;
}

function initAnalytics() {
    setDefaultDates();
    populatePhysicianDropdown();
    populateSpecialtyDropdown();
    loadFinancialReports();
}

function setDefaultDates() {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10);
    ["fin-from","fin-to","appt-from","appt-to","phy-from","phy-to","ref-from","ref-to"].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.value = i % 2 === 0 ? from : to;
    });
}

async function populatePhysicianDropdown() {
    try {
        const rows = await fetch(`/api/admin/physicians?user_id=${user.id}`).then(r => r.json());
        const sel  = document.getElementById("appt-physician");
        if (!sel) return;
        rows.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.physician_id;
            opt.textContent = `${p.first_name} ${p.last_name}`;
            sel.appendChild(opt);
        });
    } catch {}
}

async function populateSpecialtyDropdown() {
    try {
        const rows = await fetch(`/api/admin/physicians?user_id=${user.id}`).then(r => r.json());
        const sel  = document.getElementById("phy-specialty");
        if (!sel) return;
        const specialties = [...new Set(rows.map(p => p.specialty).filter(Boolean))].sort();
        specialties.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s; opt.textContent = s;
            sel.appendChild(opt);
        });
    } catch {}
}

/* ── Financial ── */
async function loadFinancialReports() {
    const { from, to } = getDateRange("fin-from", "fin-to");
    const uid = user.id;

    try {
        const [revData, arData, insData] = await Promise.all([
            fetch(`/api/admin/reports/revenue?user_id=${uid}&from=${from}&to=${to}`).then(r => r.json()),
            fetch(`/api/admin/reports/ar?user_id=${uid}`).then(r => r.json()),
            fetch(`/api/admin/reports/insurance-breakdown?user_id=${uid}&from=${from}&to=${to}`).then(r => r.json())
        ]);

        // Revenue line chart
        renderChart("chart-revenue", "line",
            revData.chart.map(r => r.month),
            [
                { label: "Total Billed",  data: revData.chart.map(r => +r.billed),      borderColor: "#1a3a6d", backgroundColor: "rgba(26,58,109,0.1)", fill: true, tension: 0.3 },
                { label: "Collected",     data: revData.chart.map(r => +r.collected),    borderColor: "#0d7a60", backgroundColor: "rgba(13,122,96,0.1)",  fill: true, tension: 0.3 },
                { label: "Outstanding",   data: revData.chart.map(r => +r.outstanding),  borderColor: "#e74c3c", backgroundColor: "rgba(231,76,60,0.1)",  fill: true, tension: 0.3 }
            ],
            { scales: { y: { ticks: { callback: v => "$" + v.toLocaleString() } } } }
        );

        // AR aging bar chart
        const aging = arData.aging || {};
        renderChart("chart-ar", "bar",
            ["0–30 days", "31–60 days", "61–90 days", "90+ days"],
            [{ label: "Amount Owed ($)", data: [+aging["0-30"]||0, +aging["31-60"]||0, +aging["61-90"]||0, +aging["90+"]||0], backgroundColor: ["#4a90d9","#f39c12","#e67e22","#e74c3c"] }],
            { scales: { y: { ticks: { callback: v => "$" + v.toLocaleString() } } } }
        );

        // Insurance doughnut
        const insRows = insData.rows || [];
        renderChart("chart-insurance", "doughnut",
            insRows.map(r => r.provider_name),
            [{ data: insRows.map(r => +r.insurance_paid), backgroundColor: ["#1a3a6d","#0d7a60","#4a90d9","#f39c12","#9b59b6"] }]
        );

        // Financial list table
        buildTableRows("#fin-table tbody", revData.list || [], [
            r => r.patient, r => money(r.total_amount), r => money(r.insurance_paid_amount),
            r => money(r.patient_owed),
            r => `<span class="status-pill ${r.payment_status === 'Paid' ? 'pill-completed' : 'pill-cancelled'}">${r.payment_status}</span>`,
            r => r.payment_date?.slice(0,10) || "—", r => r.due_date?.slice(0,10) || "—", r => r.clinic_city
        ]);

        // AR detail list
        buildTableRows("#ar-table tbody", arData.list || [], [
            r => r.patient, r => money(r.patient_owed),
            r => r.due_date?.slice(0,10) || "—",
            r => `<span style="color:${+r.days_overdue > 90 ? '#e74c3c' : +r.days_overdue > 60 ? '#e67e22' : '#f39c12'}">${r.days_overdue} days</span>`,
            r => r.clinic_city
        ]);

    } catch(e) { console.error("Financial report error:", e); }
}

/* ── Appointments ── */
async function loadAppointmentReports() {
    const { from, to } = getDateRange("appt-from", "appt-to");
    const type  = document.getElementById("appt-type")?.value || "";
    const phyId = document.getElementById("appt-physician")?.value || "";
    const uid   = user.id;

    let url = `/api/admin/reports/appointments?user_id=${uid}&from=${from}&to=${to}`;
    if (type)  url += `&type=${encodeURIComponent(type)}`;
    if (phyId) url += `&physician_id=${phyId}`;

    try {
        const data = await fetch(url).then(r => r.json());

        // Build stacked bar by month
        const months   = [...new Set((data.chart || []).map(r => r.month))].sort();
        const statuses = ["Scheduled", "Completed", "Cancelled", "No-Show"];
        const colors   = { Scheduled: "#4a90d9", Completed: "#0d7a60", Cancelled: "#e74c3c", "No-Show": "#f39c12" };

        const datasets = statuses.map(s => ({
            label: s,
            data: months.map(m => {
                const row = data.chart.find(r => r.month === m && r.status_name === s);
                return row ? +row.count : 0;
            }),
            backgroundColor: colors[s]
        }));

        renderChart("chart-appt-volume", "bar", months, datasets, { scales: { x: { stacked: true }, y: { stacked: true } } });

        // Type pie
        const typeRows = data.typeBreak || [];
        renderChart("chart-appt-type", "pie",
            typeRows.map(r => r.appointment_type || "Unknown"),
            [{ data: typeRows.map(r => +r.count), backgroundColor: ["#1a3a6d","#0d7a60","#4a90d9","#f39c12","#9b59b6"] }]
        );

        // List table
        buildTableRows("#appt-table tbody", data.list || [], [
            r => r.appointment_date?.slice(0,10), r => r.appointment_time?.slice(0,5),
            r => r.patient, r => r.physician, r => r.appointment_type || "—",
            r => `<span class="status-pill pill-${(r.status_name||"").toLowerCase().replace("-","")}">${r.status_name}</span>`,
            r => r.city
        ]);

    } catch(e) { console.error("Appointment report error:", e); }
}

/* ── Physician Productivity ── */
async function loadPhysicianReports() {
    const { from, to } = getDateRange("phy-from", "phy-to");
    const specialty = document.getElementById("phy-specialty")?.value || "";
    const phyType   = document.getElementById("phy-type")?.value || "";
    const uid = user.id;

    let url = `/api/admin/reports/physician-productivity?user_id=${uid}&from=${from}&to=${to}`;
    if (specialty) url += `&specialty=${encodeURIComponent(specialty)}`;
    if (phyType)   url += `&physician_type=${phyType}`;

    try {
        const data = await fetch(url).then(r => r.json());
        const rows = data.rows || [];
        const top20 = rows.slice(0, 20);

        renderChart("chart-phy-productivity", "bar",
            top20.map(r => r.physician),
            [
                { label: "Total Appointments", data: top20.map(r => r.total_appointments), backgroundColor: "#1a3a6d" },
                { label: "Completed",          data: top20.map(r => r.completed),          backgroundColor: "#0d7a60" }
            ],
            { indexAxis: "y", scales: { x: { stacked: false } } }
        );

        renderChart("chart-phy-revenue", "bar",
            top20.map(r => r.physician),
            [{ label: "Revenue ($)", data: top20.map(r => +r.total_revenue), backgroundColor: "#4a90d9" }],
            { indexAxis: "y", scales: { x: { ticks: { callback: v => "$" + v.toLocaleString() } } } }
        );

        buildTableRows("#phy-table tbody", rows, [
            r => r.physician, r => r.specialty || "—", r => r.physician_type,
            r => r.total_appointments, r => r.completed,
            r => `${r.completion_rate ?? 0}%`,
            r => money(r.total_revenue)
        ]);

    } catch(e) { console.error("Physician report error:", e); }
}

/* ── Referrals ── */
async function loadReferralReport() {
    const { from, to } = getDateRange("ref-from", "ref-to");
    const uid = user.id;
    const url = `/api/admin/reports/referrals?user_id=${uid}&from=${from}&to=${to}`;

    try {
        const data = await fetch(url).then(r => r.json());
        const chart = data.chart || [];
        const statusColors = { Requested:"#4a90d9", Issued:"#1a3a6d", Accepted:"#0d7a60", Rejected:"#e74c3c", Scheduled:"#f39c12", Completed:"#27ae60", Expired:"#aaa" };

        renderChart("chart-referrals", "bar",
            chart.map(r => r.status),
            [{ label: "Referrals", data: chart.map(r => +r.count), backgroundColor: chart.map(r => statusColors[r.status] || "#999") }],
            { indexAxis: "y" }
        );

        buildTableRows("#ref-table tbody", data.list || [], [
            r => r.patient, r => r.referring_doctor, r => r.specialist,
            r => `<span class="status-pill">${r.status}</span>`,
            r => r.date_issued?.slice(0,10) || "—",
            r => r.expiration_date?.slice(0,10) || "—",
            r => r.referral_reason || "—"
        ]);

    } catch(e) { console.error("Referral report error:", e); }
}
