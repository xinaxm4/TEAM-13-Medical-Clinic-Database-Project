/* ── Auth guard ── */
const user = JSON.parse(localStorage.getItem("clinicUser") || "null");
if (!user || user.role !== "admin") {
    window.location.href = "/client/auth/admin_login.html";
}

/* ── Sidebar name ── */
document.getElementById("sidebarName").textContent = user?.email || "Administrator";

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
    overview:"System Overview", physicians:"Physicians", staff:"Staff Members",
    reports:"Financial Reports", insurance:"Analytics", analytics:"Analytics Dashboard",
    settings:"Clinic Settings"
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
    if (name === "reports")    { loadClinicReport(); initAdminApptReport(); }
    if (name === "insurance")  loadInsurance();
    if (name === "analytics")  loadAnalytics();
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
/* ── Toast notification ── */
function showToast(msg, type = "success") {
    const t = document.getElementById("adminToast");
    if (!t) return;
    t.textContent = msg;
    t.style.background = type === "success" ? "#0d7a60" : type === "warning" ? "#f5a623" : "#c0392b";
    t.style.color = "#fff";
    t.style.display = "block";
    t.style.opacity = "1";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
        t.style.transition = "opacity 0.4s";
        t.style.opacity = "0";
        setTimeout(() => { t.style.display = "none"; t.style.transition = ""; }, 400);
    }, 3500);
}

let _overviewClinics = [];
let _overviewAppts   = [];

function _renderClinicSummary(rows) {
    document.getElementById("clinicSummaryBody").innerHTML = rows.length
        ? rows.map(c => `<tr>
            <td class="primary">${c.clinic_name}</td>
            <td>${c.city}, ${c.state}</td>
            <td>${c.departments}</td>
            <td>${c.physicians}</td>
            <td>${c.appointments_this_month}</td>
        </tr>`).join("")
        : `<tr><td colspan="5" class="table-empty">No clinics match your search</td></tr>`;
}

function _renderRecentAppts(rows) {
    document.getElementById("recentApptBody").innerHTML = rows.length
        ? rows.map(a => `<tr>
            <td class="primary">${fmt(a.appointment_date)}</td>
            <td>${timeFmt(a.appointment_time)}</td>
            <td>${a.patient_name}</td>
            <td>${a.physician_name}</td>
            <td>${a.city}</td>
            <td>${pill(a.status_name)}</td>
        </tr>`).join("")
        : `<tr><td colspan="6" class="table-empty">No appointments match your filters</td></tr>`;
}

function filterClinicSummary() {
    const q    = (document.getElementById("clinicSearchInput")?.value || "").toLowerCase();
    const sort = document.getElementById("clinicSortBy")?.value || "";
    let rows = _overviewClinics.filter(c =>
        !q || c.clinic_name.toLowerCase().includes(q) || (c.city||"").toLowerCase().includes(q)
    );
    if (sort === "physicians_desc") rows = rows.slice().sort((a,b) => b.physicians - a.physicians);
    if (sort === "physicians_asc")  rows = rows.slice().sort((a,b) => a.physicians - b.physicians);
    if (sort === "appts_desc")      rows = rows.slice().sort((a,b) => b.appointments_this_month - a.appointments_this_month);
    if (sort === "appts_asc")       rows = rows.slice().sort((a,b) => a.appointments_this_month - b.appointments_this_month);
    if (sort === "name_asc")        rows = rows.slice().sort((a,b) => a.clinic_name.localeCompare(b.clinic_name));
    _renderClinicSummary(rows);
}

function filterRecentAppts() {
    const q      = (document.getElementById("apptSearchInput")?.value    || "").toLowerCase();
    const status = document.getElementById("apptStatusFilter")?.value    || "";
    const loc    = document.getElementById("apptLocationFilter")?.value  || "";
    const rows = _overviewAppts.filter(a =>
        (!q      || a.patient_name.toLowerCase().includes(q) || a.physician_name.toLowerCase().includes(q)) &&
        (!status || a.status_name === status) &&
        (!loc    || a.city === loc)
    );
    _renderRecentAppts(rows);
}

async function loadOverview() {
    try {
        const res  = await fetch(`/api/admin/dashboard?user_id=${user.id}`);
        const data = await res.json();
        if (!res.ok) { document.getElementById("greetSub").textContent = data.message || "Could not load data."; return; }

        const stats = data?.stats || {};
        const clinics = Array.isArray(data?.clinics) ? data.clinics : [];
        const recentAppts = Array.isArray(data?.recentAppts) ? data.recentAppts : [];
        _overviewClinics = clinics;
        _overviewAppts   = recentAppts;

        document.getElementById("greetSub").textContent = `Managing ${clinics.length} clinic location(s) · Audit Trail Health`;
        document.getElementById("statPhysicians").textContent = stats?.total_physicians ?? "—";
        document.getElementById("statStaff").textContent      = stats?.total_staff      ?? "—";
        document.getElementById("statPatients").textContent   = stats?.total_patients   ?? "—";
        document.getElementById("statAppts").textContent      = stats?.upcoming_appointments ?? "—";

        _renderClinicSummary(clinics);
        _renderRecentAppts(recentAppts);

        // Populate location filter for recent appts
        const locs = [...new Set(recentAppts.map(a => a.city).filter(Boolean))].sort();
        const sel = document.getElementById("apptLocationFilter");
        if (sel) sel.innerHTML = `<option value="">All Locations</option>` +
            locs.map(l => `<option value="${l}">${l}</option>`).join("");

    } catch(e) {
        document.getElementById("greetSub").textContent = "Could not connect to server.";
    }
}

/* ══════════════════════════════════════
   PHYSICIANS
══════════════════════════════════════ */
let _departmentsLoaded = false;
let _deptData          = [];   // raw dept rows for filtering
let _physicianCache    = {};   // id → row object, for edit modal pre-fill
let _staffCache        = {};   // id → row object
let _physicianRows     = [];   // full list for client-side filtering
let _staffRows         = [];   // full list for client-side filtering

async function loadDepartments() {
    if (_departmentsLoaded) return;
    try {
        const r = await fetch(`/api/admin/departments?user_id=${user.id}`);
        const rows = await r.json();
        _deptData = rows;
        // Physician dropdowns — show all departments
        const opts = '<option value="">— Select Department —</option>' +
            rows.map(d => `<option value="${d.department_id}">${d.clinic_name} → ${d.department_name}</option>`).join("");
        ["ph_dept","ep_dept"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = opts;
        });
        // Staff clinic dropdowns — populate with unique clinics
        const clinics = [...new Map(rows.map(d => [d.clinic_name, d.clinic_name])).entries()].sort();
        const clinicOpts = '<option value="">— Select Clinic —</option>' +
            clinics.map(([name]) => `<option value="${name}">${name}</option>`).join("");
        ["st_clinic","es_clinic"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = clinicOpts;
        });
        // Staff dept dropdowns start empty until clinic is picked
        ["st_dept","es_dept"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<option value="">— Select Department —</option>';
        });
        _departmentsLoaded = true;
    } catch(e) {}
}

function filterStaffDeptsByClinic() {
    const clinic = document.getElementById("st_clinic")?.value;
    const depts = _deptData.filter(d => !clinic || d.clinic_name === clinic);
    const el = document.getElementById("st_dept");
    if (!el) return;
    el.innerHTML = '<option value="">— Select Department —</option>' +
        depts.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join("");
}

function filterEditStaffDeptsByClinic() {
    const clinic = document.getElementById("es_clinic")?.value;
    const depts = _deptData.filter(d => !clinic || d.clinic_name === clinic);
    const el = document.getElementById("es_dept");
    if (!el) return;
    el.innerHTML = '<option value="">— Select Department —</option>' +
        depts.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join("");
}

async function loadOfficesForSchedule() {
    try {
        const r = await fetch(`/api/admin/offices?user_id=${user.id}`);
        return await r.json();
    } catch(e) { return []; }
}

function _renderPhysicianRows(rows) {
    document.getElementById("physicianListBody").innerHTML = rows.length
        ? rows.map(p => {
            const score = p.performance_score || 0;
            const scoreColor = score >= 80 ? "#22c97a" : score >= 60 ? "#f5a623" : "#e05c5c";
            const scoreLabel = score >= 80 ? "High Performer" : score >= 60 ? "Solid" : "Needs Attention";
            const scoreBadge = p.total_appts > 0
                ? `<span style="display:inline-flex;align-items:center;gap:5px;margin-left:6px;background:${scoreColor}22;border:1px solid ${scoreColor};color:${scoreColor};border-radius:12px;padding:2px 8px;font-size:10px;font-weight:700;white-space:nowrap">
                      ${score}/100
                      <span class="info-tip" style="line-height:1">
                        <i class="tip-icon" style="background:${scoreColor}44;color:${scoreColor}">i</i>
                        <span class="tip-text"><strong>${scoreLabel}</strong><br><em>Score = (completion% × 0.70) + ((100 − no‑show%) × 0.30)</em><br><br>Last 90 days:<br>• ${p.completed_appts}/${p.total_appts} appointments completed<br>• ${p.no_show_appts} no-shows (${p.completion_rate}% show-up rate)<br><br>Scores 80+ are protected from deletion.</span>
                      </span>
                   </span>`
                : `<span style="margin-left:6px;font-size:10px;color:#aaa">No data yet</span>`;
            return `<tr>
                <td class="primary" style="white-space:nowrap">Dr. ${p.first_name} ${p.last_name}${scoreBadge}</td>
                <td>${p.specialty || "—"}</td>
                <td style="text-transform:capitalize">${p.physician_type || "—"}</td>
                <td>${p.department_name || "—"}</td>
                <td>${p.clinic_name || "—"}</td>
                <td>${p.email || "—"}</td>
                <td>${fmt(p.hire_date)}</td>
                <td>
                    <div style="display:flex;gap:6px">
                        <button onclick="openEditPhysicianModal(${p.physician_id})"
                            style="padding:4px 10px;background:#4a90d9;border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Edit</button>
                        <button onclick="confirmDeletePhysician(${p.physician_id},'Dr. ${p.first_name} ${p.last_name}')"
                            style="padding:4px 10px;background:none;border:1px solid #e05c5c;border-radius:6px;color:#e05c5c;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Delete</button>
                    </div>
                </td>
            </tr>`;}).join("")
        : `<tr><td colspan="8" class="table-empty">No physicians found</td></tr>`;
}

function filterPhysicians() {
    const name   = (document.getElementById("phSearchInput")?.value  || "").toLowerCase();
    const clinic = (document.getElementById("phClinicFilter")?.value || "");
    const type   = (document.getElementById("phTypeFilter")?.value   || "");
    const filtered = _physicianRows.filter(p =>
        (!name   || `${p.first_name} ${p.last_name}`.toLowerCase().includes(name)) &&
        (!clinic || p.clinic_name === clinic) &&
        (!type   || p.physician_type === type)
    );
    _renderPhysicianRows(filtered);
}

async function loadPhysicians() {
    loadDepartments();
    try {
        const r    = await fetch(`/api/admin/physicians?user_id=${user.id}`);
        const rows = await r.json();
        _physicianCache = {};
        _physicianRows  = rows;
        rows.forEach(p => { _physicianCache[p.physician_id] = p; });
        // Populate clinic filter dropdown
        const clinics = [...new Set(rows.map(p => p.clinic_name).filter(Boolean))].sort();
        const sel = document.getElementById("phClinicFilter");
        if (sel) {
            sel.innerHTML = `<option value="">All Locations</option>` +
                clinics.map(c => `<option value="${c}">${c}</option>`).join("");
        }
        _renderPhysicianRows(rows);
    } catch(e) {
        document.getElementById("physicianListBody").innerHTML = `<tr><td colspan="8" class="table-empty">Could not load data</td></tr>`;
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
    const phone_number  = document.getElementById("ph_phone").value.trim();
    const specialty     = document.getElementById("ph_specialty").value.trim();
    const physician_type = document.getElementById("ph_type").value;
    const department_id = document.getElementById("ph_dept").value;
    const hire_date     = document.getElementById("ph_hire").value;
    const password      = document.getElementById("ph_pass").value;

    if (!first_name || !last_name || !password) {
        errEl.textContent = "First name, last name, and password are required.";
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
            body: JSON.stringify({ user_id: user.id, first_name, last_name, phone_number,
                specialty, physician_type, department_id: department_id || null,
                hire_date: hire_date || null, password, schedule })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        // Reset form — show the auto-generated email to the admin
        if (data.email) {
            errEl.style.color = "#0d7a60";
            errEl.textContent = `✓ Dr. ${first_name} ${last_name} added. Login email: ${data.email}`;
            errEl.style.display = "block";
        }
        ["ph_first","ph_last","ph_phone","ph_specialty","ph_hire","ph_pass"]
            .forEach(id => document.getElementById(id).value = "");
        document.getElementById("scheduleRows").innerHTML = "";
        document.getElementById("ph_type").value = "primary";
        document.getElementById("ph_dept").value = "";

        // Show success with generated email and reload list
        setTimeout(() => { errEl.style.display = "none"; errEl.style.color = "#e05c5c"; }, 6000);
        loadPhysicians();
    } catch(err) {
        errEl.textContent = err.message || "Could not add physician.";
        errEl.style.display = "block";
    }
}

/* ── Edit / Delete Physician ── */
let _editPhysicianId = null;

function openEditPhysicianModal(id) {
    const p = _physicianCache[id];
    if (!p) return;
    _editPhysicianId = id;
    loadDepartments(); // no-op if already loaded
    document.getElementById("ep_first").value     = p.first_name    || "";
    document.getElementById("ep_last").value      = p.last_name     || "";
    document.getElementById("ep_phone").value     = p.phone_number  || "";
    document.getElementById("ep_specialty").value = p.specialty     || "";
    document.getElementById("ep_type").value      = p.physician_type || "primary";
    document.getElementById("ep_hire").value      = p.hire_date ? String(p.hire_date).split("T")[0] : "";
    document.getElementById("ep_dept").value      = p.department_id || "";
    document.getElementById("epError").style.display = "none";
    document.getElementById("editPhysicianModal").classList.remove("hidden");
}

function closeEditPhysicianModal() {
    document.getElementById("editPhysicianModal").classList.add("hidden");
    _editPhysicianId = null;
}

async function submitEditPhysician() {
    const errEl = document.getElementById("epError");
    errEl.style.display = "none";
    const first_name     = document.getElementById("ep_first").value.trim();
    const last_name      = document.getElementById("ep_last").value.trim();
    const phone_number   = document.getElementById("ep_phone").value.trim();
    const specialty      = document.getElementById("ep_specialty").value.trim();
    const physician_type = document.getElementById("ep_type").value;
    const department_id  = document.getElementById("ep_dept").value;
    const hire_date      = document.getElementById("ep_hire").value;

    if (!first_name || !last_name) {
        errEl.textContent = "First name and last name are required.";
        errEl.style.display = "block"; return;
    }
    try {
        const r = await fetch(`/api/admin/physician/${_editPhysicianId}?user_id=${user.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name, last_name,
                phone_number: phone_number || null, specialty: specialty || null,
                physician_type, department_id: department_id || null,
                hire_date: hire_date || null, user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeEditPhysicianModal();
        loadPhysicians();
    } catch(err) {
        errEl.textContent = err.message || "Could not save changes.";
        errEl.style.display = "block";
    }
}

async function confirmDeletePhysician(id, name) {
    if (!confirm(`Remove ${name}?\n\nThis cannot be undone. The system will block this if they have upcoming appointments or a high performance score.`)) return;
    try {
        const r = await fetch(`/api/admin/physician/${id}?user_id=${user.id}`, { method: "DELETE" });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        showToast(`${name} has been removed.`, "success");
        loadPhysicians();
    } catch(err) {
        showToast(err.message || "Could not remove physician.", "error");
    }
}

/* ══════════════════════════════════════
   STAFF
══════════════════════════════════════ */
function _staffTenureScore(hireDateStr) {
    if (!hireDateStr) return null;
    const months = Math.floor((Date.now() - new Date(hireDateStr)) / (1000*60*60*24*30.5));
    if (months < 6)   return { score: 40, label: "New",         color: "#aaaaaa" };
    if (months < 12)  return { score: 60, label: "Developing",  color: "#f5a623" };
    if (months < 24)  return { score: 75, label: "Experienced", color: "#4a90d9" };
    return                   { score: 90, label: "Senior",      color: "#22c97a" };
}

function _renderStaffRows(rows) {
    document.getElementById("staffListBody").innerHTML = rows.length
        ? rows.map(s => {
            const t = _staffTenureScore(s.hire_date);
            const badge = t ? `<span style="display:inline-flex;align-items:center;gap:5px;margin-left:6px;background:${t.color}22;border:1px solid ${t.color};color:${t.color};border-radius:12px;padding:2px 8px;font-size:10px;font-weight:700;white-space:nowrap">
                ${t.score}/100
                <span class="info-tip" style="line-height:1"><i class="tip-icon" style="background:${t.color}44;color:${t.color}">i</i>
                <span class="tip-text"><strong>${t.label}</strong><br>This score is based on how long this staff member has been with the clinic. More detailed activity scoring requires tracking which staff handle each patient interaction.<br><br>Scores 75+ are protected from deletion when the clinic is at minimum staffing.</span></span>
            </span>` : "";
            return `<tr>
            <td class="primary" style="white-space:nowrap">${s.first_name} ${s.last_name}${badge}</td>
            <td>${s.role || "—"}</td>
            <td>${s.department_name || "—"}</td>
            <td>${s.clinic_name || "—"}</td>
            <td>${s.email || "—"}</td>
            <td>${s.shift_start ? timeFmt(s.shift_start) + " – " + timeFmt(s.shift_end) : "—"}</td>
            <td>${fmt(s.hire_date)}</td>
            <td>
                <div style="display:flex;gap:6px">
                    <button onclick="openEditStaffModal(${s.staff_id})"
                        style="padding:4px 10px;background:#4a90d9;border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Edit</button>
                    <button onclick="confirmDeleteStaff(${s.staff_id},'${s.first_name} ${s.last_name}')"
                        style="padding:4px 10px;background:none;border:1px solid #e05c5c;border-radius:6px;color:#e05c5c;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Delete</button>
                </div>
            </td>
        </tr>`;
        }).join("")
        : `<tr><td colspan="8" class="table-empty">No staff members found</td></tr>`;
}

function filterStaff() {
    const name   = (document.getElementById("stSearchInput")?.value  || "").toLowerCase();
    const clinic = (document.getElementById("stClinicFilter")?.value || "");
    const role   = (document.getElementById("stRoleFilter")?.value   || "");
    const filtered = _staffRows.filter(s =>
        (!name   || `${s.first_name} ${s.last_name}`.toLowerCase().includes(name)) &&
        (!clinic || s.clinic_name === clinic) &&
        (!role   || s.role === role)
    );
    _renderStaffRows(filtered);
}

async function loadStaff() {
    loadDepartments();
    try {
        const r    = await fetch(`/api/admin/staff-members?user_id=${user.id}`);
        const rows = await r.json();
        _staffCache = {};
        _staffRows  = rows;
        rows.forEach(s => { _staffCache[s.staff_id] = s; });
        // Populate clinic filter dropdown
        const clinics = [...new Set(rows.map(s => s.clinic_name).filter(Boolean))].sort();
        const sel = document.getElementById("stClinicFilter");
        if (sel) {
            sel.innerHTML = `<option value="">All Locations</option>` +
                clinics.map(c => `<option value="${c}">${c}</option>`).join("");
        }
        _renderStaffRows(rows);
    } catch(e) {
        document.getElementById("staffListBody").innerHTML = `<tr><td colspan="8" class="table-empty">Could not load data</td></tr>`;
    }
}

async function submitAddStaff() {
    const errEl = document.getElementById("stError");
    errEl.style.display = "none";

    const first_name   = document.getElementById("st_first").value.trim();
    const last_name    = document.getElementById("st_last").value.trim();
    const phone_number = document.getElementById("st_phone").value.trim();
    const role         = document.getElementById("st_role").value;
    const clinic_name  = document.getElementById("st_clinic").value;
    const clinic_id    = _deptData.find(d => d.clinic_name === clinic_name)?.clinic_id || null;
    const department_id = document.getElementById("st_dept").value;
    const hire_date    = document.getElementById("st_hire").value;
    const shift_start  = document.getElementById("st_shift_start").value;
    const shift_end    = document.getElementById("st_shift_end").value;
    const password     = document.getElementById("st_pass").value;

    if (!first_name || !last_name || !password) {
        errEl.textContent = "First name, last name, and password are required.";
        errEl.style.display = "block";
        return;
    }

    try {
        const r = await fetch("/api/admin/add-staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, first_name, last_name, phone_number,
                role, clinic_id: clinic_id || null, department_id: department_id || null,
                hire_date: hire_date || null,
                shift_start: shift_start || null, shift_end: shift_end || null,
                password })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        ["st_first","st_last","st_phone","st_hire","st_shift_start","st_shift_end","st_pass"]
            .forEach(id => document.getElementById(id).value = "");
        document.getElementById("st_role").value   = "Receptionist";
        document.getElementById("st_clinic").value = "";
        document.getElementById("st_dept").value   = "";
        filterStaffDeptsByClinic();

        errEl.style.color = "#0d7a60";
        errEl.textContent = data.email
            ? `✓ ${first_name} ${last_name} added. Login email: ${data.email}`
            : `✓ ${first_name} ${last_name} added successfully!`;
        errEl.style.display = "block";
        setTimeout(() => { errEl.style.display = "none"; errEl.style.color = "#e05c5c"; }, 6000);
        loadStaff();
    } catch(err) {
        errEl.textContent = err.message || "Could not add staff member.";
        errEl.style.display = "block";
    }
}

/* ── Edit / Delete Staff ── */
let _editStaffId = null;

function openEditStaffModal(id) {
    const s = _staffCache[id];
    if (!s) return;
    _editStaffId = id;
    loadDepartments(); // no-op if already loaded
    document.getElementById("es_first").value       = s.first_name   || "";
    document.getElementById("es_last").value        = s.last_name    || "";
    document.getElementById("es_phone").value       = s.phone_number || "";
    document.getElementById("es_role").value        = s.role         || "Receptionist";
    document.getElementById("es_hire").value        = s.hire_date ? String(s.hire_date).split("T")[0] : "";
    document.getElementById("es_shift_start").value = s.shift_start ? String(s.shift_start).substring(0, 5) : "";
    document.getElementById("es_shift_end").value   = s.shift_end   ? String(s.shift_end).substring(0, 5) : "";
    // Pre-select clinic first, then filter + select department
    document.getElementById("es_clinic").value = s.clinic_name || "";
    filterEditStaffDeptsByClinic();
    document.getElementById("es_dept").value   = s.department_id || "";
    document.getElementById("esError").style.display = "none";
    document.getElementById("editStaffModal").classList.remove("hidden");
}

function closeEditStaffModal() {
    document.getElementById("editStaffModal").classList.add("hidden");
    _editStaffId = null;
}

async function submitEditStaff() {
    const errEl = document.getElementById("esError");
    errEl.style.display = "none";
    const first_name    = document.getElementById("es_first").value.trim();
    const last_name     = document.getElementById("es_last").value.trim();
    const phone_number  = document.getElementById("es_phone").value.trim();
    const role          = document.getElementById("es_role").value;
    const department_id = document.getElementById("es_dept").value;
    const hire_date     = document.getElementById("es_hire").value;
    const shift_start   = document.getElementById("es_shift_start").value;
    const shift_end     = document.getElementById("es_shift_end").value;
    const es_clinic_name = document.getElementById("es_clinic").value;
    const clinic_id      = _deptData.find(d => d.clinic_name === es_clinic_name)?.clinic_id || null;

    if (!first_name || !last_name) {
        errEl.textContent = "First name and last name are required.";
        errEl.style.display = "block"; return;
    }
    try {
        const r = await fetch(`/api/admin/staff/${_editStaffId}?user_id=${user.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name, last_name,
                phone_number: phone_number || null, role,
                department_id: department_id || null,
                clinic_id: clinic_id || null,
                hire_date: hire_date || null,
                shift_start: shift_start || null, shift_end: shift_end || null,
                user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeEditStaffModal();
        loadStaff();
    } catch(err) {
        errEl.textContent = err.message || "Could not save changes.";
        errEl.style.display = "block";
    }
}

async function confirmDeleteStaff(id, name) {
    if (!confirm(`Remove ${name}?\n\nThis cannot be undone. The system will block this if removing them would leave the clinic understaffed.`)) return;
    try {
        const r = await fetch(`/api/admin/staff/${id}?user_id=${user.id}`, { method: "DELETE" });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        showToast(`${name} has been removed.`, "success");
        loadStaff();
    } catch(err) {
        showToast(err.message || "Could not remove staff member.", "error");
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

        // Revenue chart
        if (window._rptRevenueChart) { window._rptRevenueChart.destroy(); }
        const rc = document.getElementById("rptRevenueChart");
        if (rc) {
            window._rptRevenueChart = new Chart(rc, {
                type:"bar",
                data:{ labels: clinics.map(c => c.clinic_name.replace("Audit Trail Health ","").replace("Clinic","")),
                    datasets:[
                        { label:"Total Billed",   data:clinics.map(c=>parseFloat(c.total_billed)||0),        backgroundColor:"#4a90d9", borderRadius:3 },
                        { label:"Collected",       data:clinics.map(c=>parseFloat(c.total_collected)||0),    backgroundColor:"#0d7a60", borderRadius:3 },
                        { label:"Outstanding",     data:clinics.map(c=>parseFloat(c.outstanding_balance)||0),backgroundColor:"#e05c5c", borderRadius:3 }
                    ]},
                options:{ responsive:true,
                    plugins:{ legend:{ position:"bottom", labels:{ font:{ size:11 } } } },
                    scales:{ x:{ ticks:{ font:{ size:10 } } }, y:{ beginAtZero:true, ticks:{ callback: v => "$"+v.toLocaleString() } } }
                }
            });
        }

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

/* ══════════════════════════════════════
   APPOINTMENTS REPORT (admin)
══════════════════════════════════════ */

/* Pre-fill today's date and load clinic options when reports section opens */
function initAdminApptReport() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const dateEl = document.getElementById("rptDate");
    if (dateEl && !dateEl.value) dateEl.value = today;

    const sel = document.getElementById("rptClinic");
    if (sel && sel.options.length <= 1) {
        // Reuse clinic data from overview endpoint
        fetch(`/api/admin/dashboard?user_id=${user.id}`)
            .then(r => r.json())
            .then(d => {
                (d.clinics || []).forEach(c => {
                    const o = document.createElement("option");
                    o.value = c.clinic_id;
                    o.textContent = c.clinic_name + " — " + c.city;
                    sel.appendChild(o);
                });
            }).catch(() => {});
    }
}

async function loadAdminAppointments() {
    const date     = document.getElementById("rptDate").value;
    const clinicId = document.getElementById("rptClinic").value;
    const tbody    = document.getElementById("rptApptBody");
    if (!date) { tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Please select a date.</td></tr>`; return; }

    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Loading…</td></tr>`;
    const params = `date=${date}&user_id=${user.id}` + (clinicId ? `&clinic_id=${clinicId}` : "");
    try {
        const r = await fetch(`/api/reports/daily-schedule?${params}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        const { summary, appointments } = data;

        // Stats bar
        const stats = document.getElementById("rptApptStats");
        if (stats) {
            stats.style.display = "flex";
            stats.innerHTML = [
                { label:"Total", val: summary.total, col:"#1f2a6d" },
                { label:"Scheduled", val: summary.scheduled, col:"#4a90d9" },
                { label:"Completed", val: summary.completed, col:"#0d7a60" },
                { label:"No-Shows",  val: summary.noShow,    col:"#c87d00" },
                { label:"Cancelled", val: summary.cancelled, col:"#e05c5c" }
            ].map(s => `<span><strong style="color:${s.col}">${s.val}</strong> ${s.label}</span>`).join(" &nbsp;·&nbsp; ");
        }

        tbody.innerHTML = appointments.length
            ? appointments.map(a => `<tr>
                <td class="primary">${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_name}</td>
                <td>${a.physician_name}<br><span style="font-size:11px;color:#aaa">${a.specialty}</span></td>
                <td>${a.appointment_type || "—"}</td>
                <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.reason_for_visit || "—"}</td>
                <td>${a.clinic_name || a.city}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="7" class="table-empty">No appointments on ${date}${clinicId ? " at this location" : ""}</td></tr>`;
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Could not load: ${e.message}</td></tr>`;
    }
}

/* ══════════════════════════════════════
   INSURANCE ANALYTICS — Per-Payer Design
══════════════════════════════════════ */

function switchInsTab(tab, btn) {
    document.querySelectorAll(".ins-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".ins-tab-panel").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    const panel = document.getElementById("ins-panel-" + tab);
    if (panel) panel.classList.add("active");
    if (tab === "manage") loadAcceptedInsurance();
}

/* Chart instance store */
const _insCharts = {};
function _dChart(key) { if (_insCharts[key]) { _insCharts[key].destroy(); delete _insCharts[key]; } }

/* Compute composite score (50% financial, 30% access, 20% reliability) */
function _computeScore(row) {
    const contracted  = parseFloat(row.contracted_rate) || 0;
    const actual      = parseFloat(row.actual_rate)     || 0;
    const paidClaims  = parseInt(row.paid_claims)        || 0;
    const totalClaims = parseInt(row.total_claims)       || 0;
    const completion  = parseFloat(row.completion_rate_pct) || 0;
    const financial   = contracted > 0 ? Math.min((actual / contracted) * 100, 100) : 0;
    const reliability = totalClaims > 0 ? (paidClaims / totalClaims) * 100 : 0;
    const composite   = Math.round((0.50 * financial) + (0.30 * completion) + (0.20 * reliability));
    const status      = composite >= 80 ? "strong" : composite >= 60 ? "monitor" : "risk";
    return { financial: Math.round(financial), reliability: Math.round(reliability),
             access: Math.round(completion), composite, status };
}

/* ── All-payers cache ── */
let _allPayers = [];
let _insuranceOverview = null;

/* ── Main loader ── */
async function loadInsurance() {
    try {
        const [scRes, alRes, ovRes] = await Promise.all([
            fetch(`/api/admin/insurance/scorecard?user_id=${user.id}`),
            fetch(`/api/admin/insurance/alerts?user_id=${user.id}`),
            fetch(`/api/admin/insurance/overview?user_id=${user.id}`)
        ]);
        _allPayers = await scRes.json();
        const alerts = alRes.ok ? await alRes.json() : [];
        _insuranceOverview = ovRes.ok ? await ovRes.json() : null;
        if (!scRes.ok) throw new Error(_allPayers.message || "Could not load scorecard");

        _renderPayerPills(_allPayers);
        _renderAlertBanner(alerts);
        _renderAllPayersTable(_allPayers);
        _renderInsuranceOverview(_insuranceOverview);
        loadAcceptedInsurance();   // pre-load manage tab so it's ready
        if (_allPayers.length) selectPayer(_allPayers[0].insurance_id);
    } catch(e) {
        document.getElementById("insPayerPills").innerHTML =
            `<span style="color:#e05c5c;font-size:13px">Could not load insurance data.</span>`;
    }
}

/* ── Payer pills ── */
function _renderPayerPills(payers) {
    const row = document.getElementById("insPayerPills");
    if (!payers.length) { row.innerHTML = '<span style="color:#aaa;font-size:13px">No payer data.</span>'; return; }
    row.innerHTML = payers.map((p, i) => {
        const s = _computeScore(p);
        const dotColor = s.status === "strong" ? "#22c97a" : s.status === "monitor" ? "#f5a623" : "#e05c5c";
        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};margin-right:6px;vertical-align:middle"></span>`;
        return `<button class="ins-payer-pill${i === 0 ? " active" : ""}"
            onclick="selectPayer(${p.insurance_id}, this)">${dot}${p.provider_name}</button>`;
    }).join("");
}

/* ── Select payer → fetch detail → redraw all charts ── */
async function selectPayer(insuranceId, btnEl) {
    if (btnEl) {
        document.querySelectorAll(".ins-payer-pill").forEach(b => b.classList.remove("active"));
        btnEl.classList.add("active");
    }
    try {
        const r = await fetch(`/api/admin/insurance/payer-detail?insurance_id=${insuranceId}&user_id=${user.id}`);
        const detail = await r.json();
        if (!r.ok) throw new Error(detail.message);
        const scoreRow = _allPayers.find(p => p.insurance_id == insuranceId) || {};
        _renderKpis(detail.stats, scoreRow);
        _renderLineChart(detail.trend, detail.stats);
        _renderScatterChart(detail.scatter, detail.stats);
        _renderClaimsBar(detail.bar);
        _drawGaugeCanvas(detail.stats);
        _drawScoreRingCanvas(scoreRow);
        _renderBreakdown(scoreRow);
        _renderTriggeredAlerts(detail.stats, scoreRow);
    } catch(e) { console.error("payer-detail:", e); }
}

/* ── KPI Row ── */
function _renderKpis(stats, scoreRow) {
    const contracted = parseFloat(stats.contracted_rate) || 0;
    const actual     = parseFloat(stats.avg_reimb_pct)   || 0;
    const kc = (v, g, w) => v >= g ? "good" : v >= w ? "warn" : "bad";

    const set = (id, txt, cls) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = txt;
        el.className = "ins-kpi-val" + (cls ? " " + cls : "");
    };

    set("kpiReimb",    actual + "%",         kc(actual, contracted, contracted * 0.9));
    set("kpiThreshold", contracted + "%");
    set("kpiClaims",   stats.total_claims    || 0);
    set("kpiPatients", stats.total_patients  || 0);
    const paidPct = stats.total_claims > 0 ? Math.round(stats.paid_claims / stats.total_claims * 100) : 0;
    set("kpiPaid",     (stats.paid_claims || 0) + " (" + paidPct + "%)", kc(paidPct, 75, 50));
    const ov = parseInt(stats.overdue_claims) || 0;
    set("kpiOverdue",  ov, ov > 0 ? "bad" : "good");
}

/* ── Line Chart ── */
function _renderLineChart(trend, stats) {
    _dChart("insLine");
    const ctx = document.getElementById("insChartLine"); if (!ctx) return;
    const contracted = parseFloat(stats.contracted_rate) || 0;
    const labels  = trend.map(t => t.month_label);
    const actuals = trend.map(t => parseFloat(t.avg_reimb_pct) || 0);
    _insCharts["insLine"] = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [
            { label: "Avg Reimbursement %", data: actuals, borderColor: "#4a90d9",
              backgroundColor: "rgba(74,144,217,0.1)", borderWidth: 2.5, pointRadius: 5, fill: true, tension: 0.3,
              pointBackgroundColor: actuals.map(v => v < contracted ? "#e05c5c" : "#4a90d9") },
            { label: "Contracted (" + contracted + "%)", data: new Array(labels.length).fill(contracted),
              borderColor: "#e05c5c", borderWidth: 2, borderDash: [8,4], pointRadius: 0, fill: false }
        ]},
        options: { responsive: true,
            plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y}%` } } },
            scales: { y: { min: Math.max(0, contracted - 20), max: 105, ticks: { callback: v => v + "%" } } } }
    });
}

/* ── Scatter Chart ── */
function _renderScatterChart(scatter, stats) {
    _dChart("insScatter");
    const ctx = document.getElementById("insChartScatter"); if (!ctx) return;
    const contracted = parseFloat(stats.contracted_rate) || 0;
    const pts = scatter.map(s => ({ x: new Date(s.date_str).getTime(), y: parseFloat(s.reimb_pct) || 0 }));
    const below = pts.filter(p => p.y < contracted);
    const above = pts.filter(p => p.y >= contracted);
    _insCharts["insScatter"] = new Chart(ctx, {
        type: "scatter",
        data: { datasets: [
            { label: "Below threshold", data: below, backgroundColor: "rgba(224,92,92,0.7)", pointRadius: 5 },
            { label: "At/above threshold", data: above, backgroundColor: "rgba(13,122,96,0.6)", pointRadius: 5 },
            { label: "Threshold (" + contracted + "%)", type: "line",
              data: pts.length > 0 ? [{ x: pts[0].x, y: contracted }, { x: pts[pts.length-1].x, y: contracted }] : [],
              borderColor: "#e05c5c", borderWidth: 1.5, borderDash: [6,3], pointRadius: 0, fill: false }
        ]},
        options: { responsive: true,
            plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } },
                tooltip: { callbacks: { label: c => {
                    const d = new Date(c.parsed.x);
                    return ` ${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"})}: ${c.parsed.y}%`;
                }}}},
            scales: { x: { type:"linear", ticks: { callback: v => new Date(v).toLocaleDateString("en-US",{month:"short",year:"2-digit"}) }},
                      y: { min: 0, max: 110, ticks: { callback: v => v + "%" } } } }
    });
}

/* ── Stacked Bar ── */
function _renderClaimsBar(barData) {
    _dChart("insBar");
    const ctx = document.getElementById("insChartBar"); if (!ctx) return;
    const months = [...new Set(barData.map(r => r.month))].sort();
    const labels  = months.map(m => (barData.find(r => r.month === m) || {}).month_label || m);
    const getPaid   = m => parseInt((barData.find(r => r.month === m && r.payment_status === "Paid") || {}).cnt) || 0;
    const getUnpaid = m => parseInt((barData.find(r => r.month === m && r.payment_status !== "Paid") || {}).cnt) || 0;
    _insCharts["insBar"] = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [
            { label: "Paid", data: months.map(getPaid), backgroundColor: "rgba(13,122,96,0.8)", borderRadius: 4 },
            { label: "Unpaid", data: months.map(getUnpaid), backgroundColor: "rgba(224,92,92,0.7)", borderRadius: 4 }
        ]},
        options: { responsive: true,
            plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
            scales: { x: { stacked: true }, y: { stacked: true, ticks: { stepSize: 1 } } } }
    });
}

/* ── Gauge Canvas ── */
function _drawGaugeCanvas(stats) {
    const canvas = document.getElementById("insGauge"); if (!canvas) return;
    const actual    = parseFloat(stats.avg_reimb_pct)   || 0;
    const threshold = parseFloat(stats.contracted_rate) || 75;
    const c = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, cx = W/2, cy = H-8, r = Math.min(W/2-10, H-20);
    c.clearRect(0, 0, W, H);

    // Track
    c.beginPath(); c.arc(cx,cy,r,Math.PI,0); c.lineWidth=16; c.strokeStyle="#f0f2f8"; c.lineCap="round"; c.stroke();

    // Zones (red, amber, green)
    const zones = [{from:0,to:70,col:"rgba(224,92,92,0.22)"},{from:70,to:threshold,col:"rgba(200,125,0,0.22)"},{from:threshold,to:100,col:"rgba(13,122,96,0.22)"}];
    zones.forEach(z => {
        if (z.from >= z.to) return;
        c.beginPath(); c.arc(cx,cy,r, Math.PI+(z.from/100)*Math.PI, Math.PI+(z.to/100)*Math.PI);
        c.lineWidth=16; c.strokeStyle=z.col; c.stroke();
    });

    // Value arc
    const col = actual >= threshold ? "#0d7a60" : actual >= 70 ? "#c87d00" : "#e05c5c";
    c.beginPath(); c.arc(cx,cy,r,Math.PI,Math.PI+(Math.min(actual,100)/100)*Math.PI);
    c.lineWidth=16; c.strokeStyle=col; c.lineCap="round"; c.stroke();

    // Threshold needle
    const ta = Math.PI+(threshold/100)*Math.PI;
    c.beginPath(); c.moveTo(cx+(r-18)*Math.cos(ta),cy+(r-18)*Math.sin(ta));
    c.lineTo(cx+(r+5)*Math.cos(ta),cy+(r+5)*Math.sin(ta));
    c.strokeStyle="#1a3a6d"; c.lineWidth=2.5; c.lineCap="square"; c.stroke();

    // Center text
    c.textAlign="center"; c.textBaseline="alphabetic";
    c.fillStyle=col; c.font="bold 19px system-ui,sans-serif";
    c.fillText(Math.round(actual)+"%",cx,cy-8);
    c.fillStyle="#aaa"; c.font="10px system-ui,sans-serif"; c.fillText("avg reimb",cx,cy+4);

    const label = document.getElementById("insGaugeLabel");
    if (label) {
        const diff = (actual - threshold).toFixed(1);
        label.textContent = (diff >= 0 ? "+" : "") + diff + "% vs contracted";
        label.style.color = actual >= threshold ? "#0d7a60" : "#e05c5c";
    }
}

/* ── Score Ring Canvas ── */
function _drawScoreRingCanvas(scoreRow) {
    const canvas = document.getElementById("insScoreRing"); if (!canvas) return;
    const s = _computeScore(scoreRow);
    const c = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2, r = Math.min(W,H)/2-12;
    c.clearRect(0,0,W,H);
    const col = s.composite >= 80 ? "#0d7a60" : s.composite >= 60 ? "#c87d00" : "#e05c5c";
    c.beginPath(); c.arc(cx,cy,r,0,2*Math.PI); c.lineWidth=14; c.strokeStyle="#f0f2f8"; c.stroke();
    c.beginPath(); c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+(s.composite/100)*2*Math.PI);
    c.lineWidth=14; c.strokeStyle=col; c.lineCap="round"; c.stroke();
    c.textAlign="center"; c.textBaseline="middle";
    c.fillStyle=col; c.font="bold 24px system-ui,sans-serif"; c.fillText(s.composite,cx,cy-8);
    c.fillStyle="#aaa"; c.font="11px system-ui,sans-serif"; c.fillText("/ 100",cx,cy+12);

    const lbl = document.getElementById("insRingLabel");
    if (lbl) {
        lbl.textContent = s.status === "strong" ? "Strong" : s.status === "monitor" ? "Monitor" : "At Risk";
        lbl.style.color = col;
    }
}

/* ── Breakdown bars ── */
function _renderBreakdown(scoreRow) {
    const s = _computeScore(scoreRow);
    const el = document.getElementById("insBreakdown"); if (!el) return;
    const items = [
        { label:"Financial (50%)",    value: s.financial,   color:"#4a90d9" },
        { label:"Access (30%)",       value: s.access,      color:"#8a4af5" },
        { label:"Reliability (20%)",  value: s.reliability, color:"#0d7a60" }
    ];
    el.innerHTML = items.map(i => `
        <div class="ins-breakdown-item">
            <div class="ins-breakdown-row"><span>${i.label}</span><span>${i.value}</span></div>
            <div class="ins-breakdown-track"><div class="ins-breakdown-fill" style="width:${i.value}%;background:${i.color}"></div></div>
        </div>`).join("");
}

/* ── Risk Indicator Rows ── */
function _renderTriggeredAlerts(stats, scoreRow) {
    const el = document.getElementById("insTriggeredAlerts"); if (!el) return;
    const s = _computeScore(scoreRow);
    const contracted = parseFloat(stats.contracted_rate) || 0;
    const actual     = parseFloat(stats.avg_reimb_pct)   || 0;
    const ov = parseInt(stats.overdue_claims) || 0;
    const paidPct = stats.total_claims > 0 ? Math.round(stats.paid_claims / stats.total_claims * 100) : 100;

    const rows = [
        { label:"Composite Score", value:`${s.composite} / 100`,
          badge: s.composite>=80?"ok":s.composite>=60?"watch":"alert",
          bText: s.composite>=80?"OK":s.composite>=60?"WATCH":"ALERT",
          desc: s.composite>=80?"Payer performing well.":s.composite>=60?"Some metrics need attention — monitor closely.":"At risk — consider contract review." },
        { label:"Reimbursement vs Contracted", value:`${actual}% vs ${contracted}% contracted`,
          badge: actual>=contracted?"ok":actual>=contracted*0.9?"watch":"alert",
          bText: actual>=contracted?"OK":actual>=contracted*0.9?"WATCH":"ALERT",
          desc: actual>=contracted?"Payer meeting contracted rate.":"Actual reimbursement is below contracted threshold." },
        { label:"Claims Paid Rate", value:`${paidPct}%`,
          badge: paidPct>=75?"ok":paidPct>=50?"watch":"alert",
          bText: paidPct>=75?"OK":paidPct>=50?"WATCH":"ALERT",
          desc: paidPct>=75?"Strong claims resolution rate.":paidPct>=50?"Moderate unpaid claims — review open items.":"High proportion of unpaid claims — escalate." },
        { label:"Overdue Claims", value:`${ov} overdue`,
          badge: ov===0?"ok":ov<=2?"watch":"alert",
          bText: ov===0?"OK":ov<=2?"WATCH":"ALERT",
          desc: ov===0?"No overdue claims.":ov<=2?"A small number of claims are past due.":"Multiple claims past due — follow up required." }
    ];

    el.innerHTML = rows.map(a => `
        <div class="ins-alert-row">
            <div style="flex:1">
                <div style="font-weight:700;color:#333;font-size:12px;margin-bottom:2px">${a.label}</div>
                <div style="color:#888;font-size:11px">${a.desc}</div>
            </div>
            <div style="text-align:right;min-width:140px;flex-shrink:0">
                <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:3px">${a.value}</div>
                <span class="ins-tbadge ${a.badge}">${a.bText}</span>
            </div>
        </div>`).join("");
}

/* ── DB Alert Banner ── */
let _alertIds = [];
function _renderAlertBanner(alerts) {
    const banner = document.getElementById("payerAlertBanner");
    const list   = document.getElementById("payerAlertList");
    if (!alerts.length) { banner.style.display = "none"; return; }
    _alertIds = alerts.map(a => a.alert_id);
    list.innerHTML = alerts.slice(0,5).map(a =>
        `<li>${a.provider_name}${a.clinic_name ? " at " + a.clinic_name : ""}: ${a.alert_message}</li>`
    ).join("");
    if (alerts.length > 5) list.innerHTML += `<li>…and ${alerts.length-5} more</li>`;
    banner.style.display = "flex";
}
async function dismissAllAlerts() {
    await Promise.all(_alertIds.map(id =>
        fetch(`/api/admin/insurance/alerts/${id}/read`, { method:"PUT",
            headers:{"Content-Type":"application/json"}, body:JSON.stringify({user_id:user.id}) })
    ));
    document.getElementById("payerAlertBanner").style.display = "none";
}

/* ── All-payers summary table ── */
function _renderAllPayersTable(payers) {
    const tbody = document.getElementById("payerDetailBody");
    if (!payers.length) { tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No data</td></tr>`; return; }
    tbody.innerHTML = payers.map(p => {
        const s = _computeScore(p);
        const col = s.status==="strong"?"#0d7a60":s.status==="monitor"?"#c87d00":"#e05c5c";
        const actualCol = (p.actual_rate||0) < (p.contracted_rate||0) ? "#e05c5c" : "#0d7a60";
        return `<tr>
            <td class="primary">${p.provider_name}</td>
            <td>${p.total_patients??0}</td>
            <td>${p.total_claims??0}</td>
            <td>${parseFloat(p.contracted_rate||0).toFixed(0)}%</td>
            <td style="color:${actualCol}">${p.actual_rate??'—'}%</td>
            <td>${money(p.total_paid)}</td>
            <td style="color:#e05c5c">${money(p.total_outstanding)}</td>
            <td>${p.completion_rate_pct??0}%</td>
            <td><span style="color:${col};font-weight:700">${s.composite}</span></td>
        </tr>`;
    }).join("");
}

function _renderInsuranceOverview(overview) {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    if (!overview) {
        setText("ovActivePayers", "—");
        setText("ovAvgReimb", "—");
        setText("ovUnpaidRate", "—");
        setText("ovCoveredPatients", "—");
        const alerts = document.getElementById("insPortfolioAlerts");
        if (alerts) alerts.innerHTML = `<div style="color:#aaa;font-size:13px;padding:10px 0">Could not load portfolio signals.</div>`;
        return;
    }

    const summary = overview.summary || {};
    setText("ovActivePayers", summary.active_payers ?? 0);
    setText("ovAvgReimb", ((summary.avg_reimbursement_pct ?? 0) + "%"));
    setText("ovUnpaidRate", ((summary.unpaid_claim_rate ?? 0) + "%"));
    setText("ovCoveredPatients", summary.covered_patients ?? 0);

    _renderOverviewReimbursementChart(overview.payerPerformance || []);
    _renderOverviewStatusChart(overview.payerStatus || []);
    _renderOverviewVolumeChart(overview.volumeTrend || []);
    _renderOverviewTypesChart(overview.procedureMix || []);
    _renderPortfolioAlerts(overview);
}

function _renderOverviewReimbursementChart(rows) {
    _dChart("insOverviewBar");
    const ctx = document.getElementById("insOverviewBar"); if (!ctx) return;
    const labels = rows.map(r => r.provider_name);
    const actual = rows.map(r => parseFloat(r.actual_reimb_pct) || 0);
    const threshold = rows.map(r => parseFloat(r.threshold_pct) || 0);
    _insCharts.insOverviewBar = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [
            { label: "Actual %", data: actual,
              backgroundColor: actual.map((v, i) => threshold[i] > 0 && v < threshold[i] ? "#e05c5c" : "#4a90d9"),
              borderRadius: 4 },
            { label: "Threshold %", data: threshold, backgroundColor: "#d7ddea", borderRadius: 4 }
        ]},
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%" } },
                x: { ticks: { font: { size: 10 } } }
            }
        }
    });
}

function _renderOverviewStatusChart(rows) {
    _dChart("insOverviewStatus");
    const ctx = document.getElementById("insOverviewStatus"); if (!ctx) return;
    const labels = rows.map(r => r.provider_name);
    const paid = rows.map(r => parseInt(r.paid_claims) || 0);
    const unpaid = rows.map(r => parseInt(r.unpaid_claims) || 0);
    _insCharts.insOverviewStatus = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [
            { label: "Paid", data: paid, backgroundColor: "rgba(13,122,96,0.8)", stack: "claims", borderRadius: 4 },
            { label: "Unpaid", data: unpaid, backgroundColor: "rgba(224,92,92,0.7)", stack: "claims", borderRadius: 4 }
        ]},
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
        }
    });
}

function _renderOverviewVolumeChart(rows) {
    _dChart("insOverviewVolume");
    const ctx = document.getElementById("insOverviewVolume"); if (!ctx) return;
    const months = [...new Set(rows.map(r => r.month))].sort();
    const labels = months.map(m => (rows.find(r => r.month === m) || {}).month_label || m);
    const payers = [...new Set(rows.map(r => r.provider_name))];
    const palette = ["#4a90d9", "#0d7a60", "#f0a43b", "#8f6de0", "#dd6b66", "#4aa6a1"];
    _insCharts.insOverviewVolume = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: payers.map((payer, idx) => ({
                label: payer,
                data: months.map(month => {
                    const row = rows.find(r => r.month === month && r.provider_name === payer);
                    return row ? parseInt(row.completed_visits) || 0 : 0;
                }),
                borderColor: palette[idx % palette.length],
                backgroundColor: "transparent",
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3
            }))
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
            scales: { y: { beginAtZero: true }, x: { ticks: { font: { size: 10 } } } }
        }
    });
}

function _renderOverviewTypesChart(rows) {
    _dChart("insOverviewTypes");
    const ctx = document.getElementById("insOverviewTypes"); if (!ctx) return;
    const types = [...new Set(rows.map(r => r.appointment_type))];
    const payers = [...new Set(rows.map(r => r.provider_name))];
    const palette = ["#4a90d9", "#9fd8c3", "#f7c56b", "#c9bef2", "#e59e97", "#77b7f0"];
    _insCharts.insOverviewTypes = new Chart(ctx, {
        type: "bar",
        data: {
            labels: types,
            datasets: payers.map((payer, idx) => ({
                label: payer,
                data: types.map(type => {
                    const row = rows.find(r => r.appointment_type === type && r.provider_name === payer);
                    return row ? parseFloat(row.avg_reimb_pct) || 0 : 0;
                }),
                backgroundColor: palette[idx % palette.length],
                borderRadius: 3
            }))
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%" } },
                x: { ticks: { font: { size: 10 } } }
            }
        }
    });
}

function _renderPortfolioAlerts(overview) {
    const el = document.getElementById("insPortfolioAlerts");
    if (!el) return;

    const performance = overview.payerPerformance || [];
    const statusRows = overview.payerStatus || [];
    const volumeRows = overview.volumeTrend || [];

    const alerts = [];
    performance.forEach(row => {
        const actual = parseFloat(row.actual_reimb_pct) || 0;
        const threshold = parseFloat(row.threshold_pct) || 0;
        if (threshold > 0 && actual < threshold) {
            alerts.push({
                sev: "r",
                t: `${row.provider_name} is averaging ${actual}% reimbursement against a ${threshold}% threshold`,
                a: "This compares billing reimbursement performance against the active accepted-plan threshold."
            });
        }
    });

    statusRows.forEach(row => {
        const paid = parseInt(row.paid_claims) || 0;
        const unpaid = parseInt(row.unpaid_claims) || 0;
        const total = paid + unpaid;
        const unpaidRate = total ? Math.round((unpaid / total) * 100) : 0;
        if (unpaidRate >= 30) {
            alerts.push({
                sev: unpaidRate >= 40 ? "r" : "y",
                t: `${row.provider_name} has an unpaid claim rate of ${unpaidRate}%`,
                a: "This is based on billing.payment_status and is a good signal for follow-up workload."
            });
        }
    });

    const payerVolumes = {};
    volumeRows.forEach(row => {
        payerVolumes[row.provider_name] = (payerVolumes[row.provider_name] || 0) + (parseInt(row.completed_visits) || 0);
    });
    Object.entries(payerVolumes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .forEach(([payer, visits]) => {
            alerts.push({
                sev: "g",
                t: `${payer} is among the highest-volume payers with ${visits} completed visits in the last 6 months`,
                a: "High-volume payers matter more when you review contract performance or reimbursement slippage."
            });
        });

    if (!alerts.length) {
        el.innerHTML = `<div style="color:#aaa;font-size:13px;padding:10px 0">No cross-payer issues detected from the available schema fields.</div>`;
        return;
    }

    el.innerHTML = alerts.slice(0, 6).map(a => `
        <div class="ins-alert-row">
            <div style="flex:1">
                <div style="font-weight:700;color:#333;font-size:12px;margin-bottom:2px">${a.t}</div>
                <div style="color:#888;font-size:11px">${a.a}</div>
            </div>
            <div style="text-align:right;min-width:110px;flex-shrink:0">
                <span class="ins-tbadge ${a.sev === "r" ? "alert" : a.sev === "y" ? "watch" : "ok"}">${a.sev === "r" ? "ACTION" : a.sev === "y" ? "MONITOR" : "GOOD"}</span>
            </div>
        </div>
    `).join("");
}

/* ══════════════════════════════════════
   MANAGE ACCEPTED PLANS
══════════════════════════════════════ */

/* Load clinics into the insurance form dropdown (reuses clinic data from overview if loaded) */
async function loadInsuranceClinics() {
    const sel = document.getElementById("ins_clinic");
    if (sel.options.length > 1) return; // already loaded
    try {
        const r = await fetch(`/api/admin/dashboard?user_id=${user.id}`);
        const d = await r.json();
        (d.clinics || []).forEach(c => {
            const o = document.createElement("option");
            o.value = c.clinic_id; o.textContent = c.clinic_name;
            sel.appendChild(o);
        });
    } catch(e) {}
}

async function loadInsurancePlans() {
    const sel = document.getElementById("ins_plan");
    if (sel.options.length > 1) return;
    try {
        const r = await fetch(`/api/admin/departments?user_id=${user.id}`);
        // departments endpoint doesn't give us insurance — use a workaround: fetch scorecard which has all insurance rows
        const r2 = await fetch(`/api/admin/insurance/scorecard?user_id=${user.id}`);
        const plans = await r2.json();
        plans.forEach(p => {
            const o = document.createElement("option");
            o.value = p.insurance_id; o.textContent = p.provider_name;
            sel.appendChild(o);
        });
    } catch(e) {}
}

let _acceptedPlansRows = [];

async function loadAcceptedInsurance() {
    loadInsuranceClinics();
    loadInsurancePlans();
    const tbody = document.getElementById("acceptedInsBody");
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Loading…</td></tr>`;
    try {
        const r    = await fetch(`/api/admin/insurance/accepted?user_id=${user.id}`);
        const rows = await r.json();
        if (!r.ok) throw new Error(rows.message);
        _acceptedPlansRows = rows;

        tbody.innerHTML = rows.length ? rows.map(row => {
            const dot = row.is_active
                ? `<span class="dot active"></span>Active`
                : `<span class="dot inactive"></span>Inactive`;
            const deactivateBtn = row.is_active
                ? `<button onclick="deactivateInsuranceRow(${row.id})" style="padding:4px 10px;background:none;border:1px solid #e05c5c;border-radius:6px;color:#e05c5c;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Deactivate</button>`
                : `<span style="font-size:11px;color:#aaa">Removed ${fmt(row.removed_date)}</span>`;
            return `<tr>
                <td>${dot}</td>
                <td class="primary">${row.provider_name}</td>
                <td>${row.clinic_name}</td>
                <td>${parseFloat(row.coverage_percentage).toFixed(0)}%</td>
                <td>${parseFloat(row.reimbursement_threshold_pct).toFixed(0)}%</td>
                <td>${parseFloat(row.min_participation_rate).toFixed(0)}%</td>
                <td>${fmt(row.effective_date)}</td>
                <td>${deactivateBtn}</td>
            </tr>`;
        }).join("") : `<tr><td colspan="8" class="table-empty">No accepted plans found</td></tr>`;
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Could not load plans</td></tr>`;
    }
}

async function submitAddInsurance() {
    const errEl = document.getElementById("insError");
    errEl.style.display = "none"; errEl.style.color = "#e05c5c";

    const insurance_id              = document.getElementById("ins_plan").value;
    const clinic_id                 = document.getElementById("ins_clinic").value;
    const reimbursement_threshold_pct = document.getElementById("ins_threshold").value;
    const min_participation_rate    = document.getElementById("ins_participation").value;
    const effective_date            = document.getElementById("ins_effective").value;

    if (!insurance_id || !clinic_id || !reimbursement_threshold_pct) {
        errEl.textContent = "Insurance plan, clinic, and contracted minimum reimbursement % are required.";
        errEl.style.display = "block"; return;
    }

    try {
        const r = await fetch("/api/admin/insurance/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ insurance_id, clinic_id, reimbursement_threshold_pct,
                min_participation_rate: min_participation_rate || 75,
                effective_date: effective_date || null, user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        errEl.style.color = "#0d7a60";
        errEl.textContent = "✓ Insurance plan accepted and added successfully.";
        errEl.style.display = "block";
        setTimeout(() => { errEl.style.display = "none"; errEl.style.color = "#e05c5c"; }, 5000);

        ["ins_plan","ins_clinic","ins_threshold"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("ins_participation").value = "75";
        document.getElementById("ins_effective").value = "";
        loadAcceptedInsurance();
    } catch(e) {
        errEl.textContent = e.message || "Could not add insurance plan.";
        errEl.style.display = "block";
    }
}

let _deactivatingId = null;

function deactivateInsuranceRow(id) {
    _deactivatingId = id;
    // Find row from accepted plans cache
    const row = (_acceptedPlansRows || []).find(r => r.id === id);
    const desc = row
        ? `You are about to remove <strong>${row.provider_name}</strong> from <strong>${row.clinic_name}</strong>.`
        : `You are about to remove plan #${id} from this clinic.`;
    const descEl = document.getElementById("deactivateModalDesc");
    if (descEl) descEl.innerHTML = desc;
    const reasonEl = document.getElementById("deactivateReason");
    if (reasonEl) reasonEl.value = "";
    const errEl = document.getElementById("deactivateError");
    if (errEl) { errEl.textContent = ""; errEl.style.display = "none"; }
    document.getElementById("deactivateModal")?.classList.remove("hidden");
}

function closeDeactivateModal() {
    _deactivatingId = null;
    document.getElementById("deactivateModal")?.classList.add("hidden");
}

async function confirmDeactivate() {
    const reason = (document.getElementById("deactivateReason")?.value || "").trim();
    const errEl  = document.getElementById("deactivateError");
    if (!reason) {
        if (errEl) { errEl.textContent = "Please enter a reason before removing."; errEl.style.display = "block"; }
        return;
    }
    const btn = document.getElementById("deactivateConfirmBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Removing…"; }
    try {
        const r = await fetch(`/api/admin/insurance/${_deactivatingId}/deactivate`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ removal_reason: reason, user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeDeactivateModal();
        showToast("Insurance plan removed and patients notified.", "success");
        loadAcceptedInsurance();
    } catch(e) {
        if (errEl) { errEl.textContent = e.message || "Could not remove plan."; errEl.style.display = "block"; }
        showToast(e.message || "Could not remove plan.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Remove Plan"; }
    }
}

/* ══════════════════════════════════════
   ANALYTICS SECTION
══════════════════════════════════════ */
const _anaCharts = {};
function _dAna(k) { if (_anaCharts[k]) { _anaCharts[k].destroy(); delete _anaCharts[k]; } }

function switchAnalyticsTab(tab, btn) {
    document.querySelectorAll("#sec-analytics .ins-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll("#sec-analytics .ins-tab-panel").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    const panel = document.getElementById("ana-panel-" + tab);
    if (panel) panel.classList.add("active");
    if (tab === "insurance") renderAnaInsurance();
    if (tab === "staffing")  renderAnaStaffing();
    if (tab === "reviews")   renderAnaReviews();
}

async function loadAnalytics() {
    await renderAnaInsurance();
}

async function renderAnaInsurance() {
    try {
        const r = await fetch(`/api/admin/insurance/overview?user_id=${user.id}`);
        if (!r.ok) return;
        const d = await r.json();
        const s = d.summary || {};
        const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setV("anaActivePayers",    s.active_payers ?? "—");
        setV("anaAvgReimb",        s.avg_reimbursement_pct != null ? s.avg_reimbursement_pct + "%" : "—");
        setV("anaUnpaidRate",      s.unpaid_claim_rate != null ? s.unpaid_claim_rate + "%" : "—");
        setV("anaCoveredPatients", s.covered_patients ?? "—");

        const pal = ["#4a90d9","#0d7a60","#f0a43b","#8f6de0","#dd6b66","#4aa6a1"];
        // Chart 1: Reimbursement vs Threshold
        const perf = d.payerPerformance || [];
        _dAna("anaReimbChart");
        const rc = document.getElementById("anaReimbChart"); if (rc) {
            _anaCharts.anaReimbChart = new Chart(rc, {
                type: "bar",
                data: { labels: perf.map(p => p.provider_name),
                        datasets: [
                            { label: "Actual %", data: perf.map(p => parseFloat(p.actual_reimb_pct)||0),
                              backgroundColor: perf.map((p,i) => {
                                  const t = parseFloat(p.threshold_pct)||0;
                                  return t > 0 && (parseFloat(p.actual_reimb_pct)||0) < t ? "#e05c5c" : "#4a90d9";
                              }), borderRadius: 4 },
                            { label: "Threshold %", data: perf.map(p => parseFloat(p.threshold_pct)||0),
                              backgroundColor: "#d7ddea", borderRadius: 4 }
                        ]},
                options: { responsive: true,
                           plugins: { legend: { position:"bottom", labels:{ font:{size:11} } } },
                           scales: { y: { max:100, ticks:{callback:v=>v+"%"} } } }
            });
        }
        // Chart 2: Claim status
        const st = d.payerStatus || [];
        _dAna("anaStatusChart");
        const sc = document.getElementById("anaStatusChart"); if (sc) {
            _anaCharts.anaStatusChart = new Chart(sc, {
                type: "bar",
                data: { labels: st.map(p => p.provider_name),
                        datasets: [
                            { label:"Paid",   data: st.map(p => parseInt(p.paid_claims)||0),   backgroundColor:"rgba(13,122,96,0.8)", stack:"s", borderRadius:4 },
                            { label:"Unpaid", data: st.map(p => parseInt(p.unpaid_claims)||0), backgroundColor:"rgba(224,92,92,0.7)", stack:"s", borderRadius:4 }
                        ]},
                options: { responsive: true, plugins:{legend:{position:"bottom",labels:{font:{size:11}}}},
                           scales: { x:{stacked:true}, y:{stacked:true, beginAtZero:true} } }
            });
        }
        // Chart 3: Volume trend
        const vt = d.volumeTrend || [];
        const months = [...new Set(vt.map(r=>r.month))].sort();
        const labels3 = months.map(m => (vt.find(r=>r.month===m)||{}).month_label || m);
        const payers3 = [...new Set(vt.map(r=>r.provider_name))];
        _dAna("anaVolumeChart");
        const vc = document.getElementById("anaVolumeChart"); if (vc) {
            _anaCharts.anaVolumeChart = new Chart(vc, {
                type: "line",
                data: { labels: labels3,
                        datasets: payers3.map((p,i) => ({
                            label: p, borderColor: pal[i%pal.length],
                            backgroundColor: "transparent", borderWidth:2, tension:0.3, pointRadius:3,
                            data: months.map(m => { const row = vt.find(r=>r.month===m&&r.provider_name===p); return row ? parseInt(row.completed_visits)||0 : 0; })
                        }))},
                options: { responsive:true, plugins:{legend:{position:"bottom",labels:{font:{size:11}}}},
                           scales:{ x:{ticks:{font:{size:10}}}, y:{beginAtZero:true} } }
            });
        }
        // Chart 4: By appointment type
        const pm = d.procedureMix || [];
        const types4 = [...new Set(pm.map(r=>r.appointment_type))];
        const payers4 = [...new Set(pm.map(r=>r.provider_name))];
        _dAna("anaTypesChart");
        const tc2 = document.getElementById("anaTypesChart"); if (tc2) {
            _anaCharts.anaTypesChart = new Chart(tc2, {
                type: "bar",
                data: { labels: types4,
                        datasets: payers4.map((p,i) => ({
                            label: p, backgroundColor: pal[i%pal.length], borderRadius:3,
                            data: types4.map(t => { const row = pm.find(r=>r.provider_name===p&&r.appointment_type===t); return row ? parseFloat(row.avg_reimb_pct)||0 : 0; })
                        }))},
                options: { responsive:true, plugins:{legend:{position:"bottom",labels:{font:{size:11}}}},
                           scales:{ y:{ max:100, ticks:{callback:v=>v+"%"} }, x:{ticks:{font:{size:10}}} } }
            });
        }
    } catch(e) { console.error("analytics insurance:", e); }
}

async function renderAnaStaffing() {
    try {
        const [phRes, stRes, patRes, apptRes] = await Promise.all([
            fetch(`/api/admin/physicians?user_id=${user.id}`),
            fetch(`/api/admin/staff-members?user_id=${user.id}`),
            fetch(`/api/admin/dashboard?user_id=${user.id}`),
            fetch(`/api/admin/clinic-report?user_id=${user.id}`)
        ]);
        const physicians = phRes.ok ? await phRes.json() : [];
        const staffList  = stRes.ok  ? await stRes.json() : [];
        const dash       = patRes.ok ? await patRes.json() : {};
        const report     = apptRes.ok ? await apptRes.json() : [];

        const stats  = dash.stats || {};
        const setV = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        setV("anaPhysCount",   physicians.length || "—");
        setV("anaStaffCount",  staffList.length  || "—");
        setV("anaPatientCount", stats.total_patients ?? "—");
        const ratio = physicians.length > 0 && stats.total_patients
            ? Math.round(stats.total_patients / physicians.length * 10) / 10 : "—";
        setV("anaRatioVal", ratio);

        // Chart: Physicians by clinic (primary vs specialist)
        const byClinic = {};
        physicians.forEach(p => {
            const loc = p.city || p.clinic_name || "Unknown";
            if (!byClinic[loc]) byClinic[loc] = { primary:0, specialist:0 };
            if (p.physician_type === "specialist") byClinic[loc].specialist++;
            else byClinic[loc].primary++;
        });
        const locs = Object.keys(byClinic);
        _dAna("anaPhysChart");
        const pc = document.getElementById("anaPhysChart"); if (pc) {
            _anaCharts.anaPhysChart = new Chart(pc, {
                type:"bar",
                data:{ labels:locs, datasets:[
                    { label:"Primary",    data:locs.map(l=>byClinic[l].primary),    backgroundColor:"#4a90d9", borderRadius:4 },
                    { label:"Specialist", data:locs.map(l=>byClinic[l].specialist), backgroundColor:"#0d7a60", borderRadius:4 }
                ]},
                options:{ responsive:true, plugins:{legend:{position:"bottom",labels:{font:{size:11}}}},
                          scales:{ x:{ticks:{font:{size:10}}}, y:{beginAtZero:true,ticks:{stepSize:1}} } }
            });
        }
        // Chart: Patients per staff member by clinic location
        // Builds a ratio per clinic from the clinic report data + staff list
        const clinicReport = Array.isArray(report) ? report : (report.clinics || []);
        const staffByClinic = {};
        staffList.forEach(s => {
            const loc = s.clinic_name || "Unknown";
            staffByClinic[loc] = (staffByClinic[loc] || 0) + 1;
        });
        const patientsByClinic = {};
        clinicReport.forEach(row => {
            const loc = row.clinic_name || "Unknown";
            // Use appointment-based unique patient count as proxy
            patientsByClinic[loc] = parseInt(row.total_appointments) || 0;
        });
        const ratioLocs = [...new Set([...Object.keys(staffByClinic), ...Object.keys(patientsByClinic)])].sort();
        const ratioData = ratioLocs.map(loc => {
            const s = staffByClinic[loc] || 1;
            const p = patientsByClinic[loc] || 0;
            return Math.round(p / s * 10) / 10;
        });
        _dAna("anaStaffRatioChart");
        const arc = document.getElementById("anaStaffRatioChart"); if (arc) {
            _anaCharts.anaStaffRatioChart = new Chart(arc, {
                type:"bar",
                data:{ labels:ratioLocs, datasets:[{
                    label:"Visits per Staff Member",
                    data:ratioData,
                    backgroundColor: ratioData.map(v => v > 50 ? "#e05c5c" : "#4a90d9"),
                    borderRadius:4
                }]},
                options:{ responsive:true,
                    plugins:{ legend:{ display:false },
                        annotation:{ annotations:[{ type:"line", yMin:50, yMax:50, borderColor:"#e05c5c", borderWidth:2, borderDash:[5,5], label:{ content:"Max recommended (50)", enabled:true } }] }
                    },
                    scales:{ x:{ticks:{font:{size:10}}}, y:{beginAtZero:true, title:{display:true,text:"Visits / Staff"}} }
                }
            });
        }
    } catch(e) { console.error("analytics staffing:", e); }
}

async function renderAnaReviews() {
    try {
        const r = await fetch(`/api/admin/clinic-report?user_id=${user.id}`);
        const raw = r.ok ? await r.json() : {};
        const report = raw.clinics || (Array.isArray(raw) ? raw : []);

        let totalCompleted=0, totalNoShow=0, totalAppts=0, totalBilled=0, totalPaid=0;
        report.forEach(row => {
            totalCompleted += parseInt(row.completed)  || 0;
            totalNoShow    += parseInt(row.no_shows)   || 0;
            totalAppts     += (parseInt(row.completed)||0)+(parseInt(row.no_shows)||0)+(parseInt(row.cancelled)||0)+(parseInt(row.scheduled)||0);
            totalBilled    += parseFloat(row.total_billed) || 0;
            totalPaid      += parseFloat(row.total_paid)   || 0;
        });
        const noShowPct = totalAppts > 0 ? Math.round(totalNoShow / totalAppts * 100) + "%" : "—";
        const outstanding = "$" + (totalBilled - totalPaid).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",");
        const setV = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        setV("anaCompleted",   totalCompleted);
        setV("anaNoShow",      noShowPct);
        setV("anaOutstanding", outstanding);

        // Chart: Outcomes by clinic
        const labels = report.map(r => r.clinic_name || r.city || "Clinic");
        _dAna("anaOutcomeChart");
        const oc = document.getElementById("anaOutcomeChart"); if (oc) {
            _anaCharts.anaOutcomeChart = new Chart(oc, {
                type:"bar",
                data:{ labels, datasets:[
                    { label:"Completed", data:report.map(r=>parseInt(r.completed)||0),  backgroundColor:"#0d7a60", stack:"s", borderRadius:3 },
                    { label:"No-Show",   data:report.map(r=>parseInt(r.no_shows)||0),   backgroundColor:"#f0a43b", stack:"s", borderRadius:3 },
                    { label:"Cancelled", data:report.map(r=>parseInt(r.cancelled)||0),  backgroundColor:"#e05c5c", stack:"s", borderRadius:3 },
                    { label:"Scheduled", data:report.map(r=>parseInt(r.scheduled)||0),  backgroundColor:"#4a90d9", stack:"s", borderRadius:3 }
                ]},
                options:{ responsive:true, plugins:{legend:{position:"bottom",labels:{font:{size:11}}}},
                          scales:{ x:{stacked:true,ticks:{font:{size:10}}}, y:{stacked:true,beginAtZero:true} } }
            });
        }
        // Chart: Billing breakdown
        const totalUnpaid = totalBilled - totalPaid;
        _dAna("anaBillingChart");
        const bc = document.getElementById("anaBillingChart"); if (bc) {
            _anaCharts.anaBillingChart = new Chart(bc, {
                type:"doughnut",
                data:{ labels:["Paid","Outstanding"],
                       datasets:[{ data:[totalPaid, totalUnpaid < 0 ? 0 : totalUnpaid],
                           backgroundColor:["#0d7a60","#e05c5c"], borderWidth:0 }]},
                options:{ responsive:true, plugins:{legend:{position:"bottom",labels:{font:{size:11}}}} }
            });
        }
    } catch(e) { console.error("analytics reviews:", e); }
}

/* ── Bootstrap ── */
const _apptSearch = document.getElementById("apptSearchInput");
if (_apptSearch) _apptSearch.value = "";  // clear any browser autofill
loadOverview();

/* ── Staff termination trigger ── */
async function terminateStaffMember(staffId, btn) {
    const chk = await fetch(`/api/admin/staff/${staffId}/termination-check?user_id=${user.id}`);
    const eligibility = await chk.json();
    if (!eligibility.can_fire) {
        alert(`Cannot terminate:\n${eligibility.reason}\n\nCurrent staff: ${eligibility.current_staff} | Min required: ${eligibility.min_staff}`);
        return;
    }
    if (!confirm(`Terminate this staff member?\n\nAfter: ${eligibility.current_staff - 1} staff | Min required: ${eligibility.min_staff} | Patients: ${eligibility.clinic_patients}`)) return;
    btn.disabled = true; btn.textContent = 'Processing…';
    const r = await fetch(`/api/admin/staff/${staffId}/terminate?user_id=${user.id}`, { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) { alert(d.message || 'Termination failed.'); btn.disabled = false; btn.textContent = 'Terminate'; return; }
    alert(d.message);
    loadStaff();
}
