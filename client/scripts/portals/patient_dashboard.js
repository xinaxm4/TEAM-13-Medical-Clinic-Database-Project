/* ── Auth check ── */
const user = JSON.parse(localStorage.getItem("user") || localStorage.getItem("patientUser") || "null");

if (!user || (user.role && user.role !== "patient")) {
    window.location.href = "/client/auth/patient_login.html";
}

/* ── Logout ── */
function logoutUser() {
    localStorage.removeItem("user");
    localStorage.removeItem("patientUser");
    window.location.href = "/client/auth/patient_login.html";
}
document.getElementById("logoutBtn").addEventListener("click", logoutUser);

/* ── HIPAA: Idle auto-logout after 15 minutes ── */
(function setupIdleLogout() {
    const IDLE_MS = 15 * 60 * 1000; // 15 minutes
    let idleTimer = setTimeout(logoutUser, IDLE_MS);
    function resetTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(logoutUser, IDLE_MS);
    }
    ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"].forEach(evt =>
        document.addEventListener(evt, resetTimer, { passive: true })
    );
})();

/* ── Phone auto-formatter ── */
function formatPhoneInput(e) {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (raw.length <= 3)        e.target.value = raw.length ? "(" + raw : "";
    else if (raw.length <= 6)   e.target.value = "(" + raw.slice(0,3) + ") " + raw.slice(3);
    else                        e.target.value = "(" + raw.slice(0,3) + ") " + raw.slice(3,6) + "-" + raw.slice(6);
}
document.addEventListener("DOMContentLoaded", () => {
    ["mf_phone","mf_ec_phone"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", formatPhoneInput);
    });
});

/* ── Navigation history (back / forward buttons) ── */
let _navHistory    = [];
let _navIndex      = -1;
let _navInProgress = false;   // prevents recursive push during back/fwd

function updateNavButtons() {
    const backBtn = document.getElementById("navBackBtn");
    const fwdBtn  = document.getElementById("navFwdBtn");
    if (backBtn) backBtn.disabled = _navIndex <= 0;
    if (fwdBtn)  fwdBtn.disabled  = _navIndex >= _navHistory.length - 1;
}

function navBack() {
    if (_navIndex <= 0) return;
    _navInProgress = true;
    _navIndex--;
    showSection(_navHistory[_navIndex]);
    _navInProgress = false;
    updateNavButtons();
}

function navForward() {
    if (_navIndex >= _navHistory.length - 1) return;
    _navInProgress = true;
    _navIndex++;
    showSection(_navHistory[_navIndex]);
    _navInProgress = false;
    updateNavButtons();
}

/* ── Section nav ── */
function showSection(name) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const sec = document.getElementById("sec-" + name);
    if (sec) sec.classList.remove("hidden");

    const btn = document.querySelector(`.nav-item[onclick*="'${name}'"]`);
    if (btn) btn.classList.add("active");

    const labels = { overview:"Overview", appointments:"My Appointments", history:"Health Records", billing:"Billing & Payments", profile:"My Profile", settings:"Settings" };
    document.getElementById("currentSection").textContent = labels[name] || name;

    // Push to nav history (skip duplicate consecutive entries and back/fwd traversals)
    if (!_navInProgress) {
        _navHistory = _navHistory.slice(0, _navIndex + 1);  // trim forward stack
        if (_navHistory[_navHistory.length - 1] !== name) {
            _navHistory.push(name);
            _navIndex = _navHistory.length - 1;
        }
        updateNavButtons();
    }
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

/* ── Date ── */
document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

/* ── Helpers ── */
function fmt(dateStr) {
    if (!dateStr) return "—";
    // Parse as local date to avoid UTC timezone shift (off-by-one-day bug)
    const s = dateStr.toString().split("T")[0];
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
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

// Sensitive fields (DOB, policy number) — no copy/paste per HIPAA display policy
function sensitiveRow(label, value) {
    return `<div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${label}</span>
        <span style="font-size:14px;color:#333;user-select:none;-webkit-user-select:none" oncopy="return false" oncut="return false">${value || "—"}</span>
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

        const { patient, appointments, history, billing, referrals, referralEligible, treatments } = data;

        // Store globally so filters can re-render without re-fetching
        _allAppointments = appointments || [];
        _allHistory      = history      || [];
        _allTreatments   = treatments   || [];
        _allBilling      = billing      || [];

        /* ── Greeting & sidebar ── */
        const firstName = patient.first_name || "";
        const lastName  = patient.last_name  || "";
        document.getElementById("greetName").textContent = firstName;
        document.getElementById("greetSub").textContent = patient.doc_last
            ? `Primary Physician: Dr. ${patient.doc_last}`
            : "No primary physician assigned yet — choose your care team below";
        document.getElementById("sidebarName").textContent = `${firstName} ${lastName}`;
        document.getElementById("avatarInitials").textContent = (firstName[0] || "") + (lastName[0] || "");

        /* ── Stats ── */
        const today = new Date(); today.setHours(0,0,0,0);
        const upcoming   = appointments.filter(a => a.status_name === "Scheduled" && new Date(a.appointment_date) >= today).length;
        const unpaidBills = billing.filter(b => !b.payment_status || b.payment_status.toLowerCase() !== "paid").length;
        document.getElementById("statAppts").textContent      = appointments.length;
        document.getElementById("statUpcoming").textContent   = upcoming;
        document.getElementById("statConditions").textContent = history.length;
        document.getElementById("statBills").textContent      = unpaidBills;

        /* ── Overview: upcoming appointments (Scheduled only, future dates) ── */
        const overviewAppts = appointments
            .filter(a => a.status_name === "Scheduled" && new Date(a.appointment_date) >= today)
            .slice(0, 5);
        const oBody = document.getElementById("overviewApptBody");
        oBody.innerHTML = overviewAppts.length
            ? overviewAppts.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>Dr. ${a.doc_last}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="3" class="table-empty">No upcoming appointments</td></tr>`;

        /* ── Overview: care card ── */
        if (!patient.primary_physician_id) {
            document.getElementById("careCard").innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:12px 0;text-align:center">
                    <div style="font-size:32px;color:#1f2a6d">&#10010;</div>
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#1f2a6d;margin-bottom:4px">No physician assigned yet</div>
                        <div style="font-size:12px;color:#aaa;font-weight:300;line-height:1.6">Choose a clinic location and primary<br>physician to complete your setup.</div>
                    </div>
                    <button class="profile-edit-btn" onclick="openCareModal()" style="width:100%">Choose My Care Team →</button>
                </div>`;
        } else {
            document.getElementById("careCard").innerHTML = `
                ${infoRow("Primary Physician", `Dr. ${patient.doc_first} ${patient.doc_last}`)}
                ${infoRow("Specialty", patient.specialty)}
                ${infoRow("Physician Phone", patient.doc_phone)}
                <hr style="border:none;border-top:1px solid #f0f2f8;margin:4px 0">
                ${infoRow("Insurance Provider", patient.provider_name || "None / Self-Pay")}
                ${sensitiveRow("Policy Number", patient.policy_number || "—")}
                ${infoRow("Coverage", patient.coverage_percentage ? patient.coverage_percentage + "%" : "—")}
                <button class="profile-edit-btn" onclick="openCareModal()" style="margin-top:8px">Change Care Team</button>`;
        }

        /* ── Appointments, Health Records, Billing — rendered by filter functions ── */
        applyApptFilters();
        applyHistFilters();
        renderMedications();
        applyBillingFilters();

        /* ── Profile completeness banner ── */
        checkProfileCompleteness(patient);
        prefillModal(patient);

        /* ── Profile info ── */
        document.getElementById("profileInfo").innerHTML = `
            ${infoRow("Full Name", `${patient.first_name || "—"} ${patient.last_name || ""}`)}
            ${sensitiveRow("Date of Birth", fmt(patient.date_of_birth))}
            ${infoRow("Gender", patient.gender)}
            ${infoRow("Email", patient.email)}
            ${infoRow("Phone", patient.phone_number)}
            ${infoRow("Address", [patient.street_address, patient.city, patient.state, patient.zip_code].filter(Boolean).join(", ") || "—")}`;

        document.getElementById("emergencyInfo").innerHTML = `
            ${infoRow("Emergency Contact", patient.emergency_contact_name)}
            ${infoRow("Contact Phone", patient.emergency_contact_phone)}`;

        /* ── Profile: Care team card ── */
        const careTeamEl = document.getElementById("profileCareTeam");
        if (careTeamEl) {
            if (patient.primary_physician_id) {
                careTeamEl.innerHTML = `
                    <div style="display:flex;align-items:center;gap:14px;padding-bottom:14px;border-bottom:1px solid #f0f2f8">
                        <div style="width:44px;height:44px;background:#1f2a6d;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:700;flex-shrink:0">
                            ${(patient.doc_first||"")[0]||""}${(patient.doc_last||"")[0]||""}
                        </div>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:#1f2a6d">Dr. ${patient.doc_first} ${patient.doc_last}</div>
                            <div style="font-size:12px;color:#888;margin-top:2px">${patient.specialty || "Primary Care"}</div>
                        </div>
                    </div>
                    ${infoRow("Clinic Location", patient.office_city ? patient.office_city + (patient.office_state ? ", " + patient.office_state : "") : (patient.city || "—"))}
                    ${infoRow("Insurance", patient.provider_name || "No Insurance / Self-Pay")}
                    ${patient.coverage_percentage ? infoRow("Coverage", patient.coverage_percentage + "% of covered services") : ""}
                    <button class="profile-edit-btn" onclick="openCareModal()" style="margin-top:8px;width:100%">Change Care Team</button>`;
            } else {
                careTeamEl.innerHTML = `
                    <div style="text-align:center;padding:8px 0">
                        <div style="font-size:13px;color:#aaa;margin-bottom:12px">No primary physician assigned yet.</div>
                        <button class="profile-edit-btn" onclick="openCareModal()">Choose My Care Team →</button>
                    </div>`;
            }
        }

        /* ── Edit button ── */
        const editWrap = document.getElementById("profileEditBtn");
        if (editWrap) {
            editWrap.innerHTML = `<button class="profile-edit-btn" onclick="openProfileModal()">Edit Personal Information</button>`;
        }

        /* ── Referrals ── */
        const refBtn  = document.getElementById("requestReferralBtn");
        const gateMsg = document.getElementById("referralGateMsg");
        const refList = document.getElementById("referralsList");

        if (patient.primary_physician_id) {
            if (referralEligible) {
                if (refBtn)  refBtn.style.display  = "";
                if (gateMsg) gateMsg.style.display = "none";
            } else {
                if (refBtn)  refBtn.style.display  = "none";
                if (gateMsg) gateMsg.style.display = "";
            }
        }

        if (refList) {
            if (!referrals || referrals.length === 0) {
                refList.innerHTML = `<p class="table-empty">No referrals on record.</p>`;
            } else {
                const statusColor = {
                    Requested:"#6ea8fe", Issued:"#f59e0b", Accepted:"#10b981",
                    Rejected:"#ef4444", Scheduled:"#a78bfa", Completed:"#10b981", Expired:"#9ca3af"
                };
                const statusNote = {
                    Requested:  "Waiting for your primary physician to review and issue.",
                    Issued:     "Your physician has sent this referral to the specialist. Awaiting specialist review.",
                    Accepted:   "The specialist has accepted you as a patient — book your appointment below.",
                    Rejected:   "This referral was declined. Contact your primary physician for next steps.",
                    Scheduled:  "Your specialist appointment is scheduled.",
                    Completed:  "This referral has been completed.",
                    Expired:    "This referral has expired. Request a new one if needed."
                };
                refList.innerHTML = referrals.map(r => `
                    <div class="referral-card">
                        <div class="referral-card-header">
                            <div>
                                <div class="referral-specialist">Dr. ${r.spec_first} ${r.spec_last}</div>
                                <div class="referral-specialty">${r.spec_specialty}</div>
                            </div>
                            <span class="referral-status-badge" style="background:${statusColor[r.status_name] || '#9ca3af'}22;color:${statusColor[r.status_name] || '#9ca3af'};border:1px solid ${statusColor[r.status_name] || '#9ca3af'}44">
                                ${r.status_name}
                            </span>
                        </div>
                        <div class="referral-reason">"${r.referral_reason}"</div>
                        <div class="referral-meta">
                            <span>Referred by Dr. ${r.ref_first} ${r.ref_last}</span>
                            <span>Issued ${fmt(r.date_issued)} &nbsp;·&nbsp; Expires ${fmt(r.expiration_date)}</span>
                        </div>
                        <div style="font-size:12px;color:#6b7280;margin-top:6px">${statusNote[r.status_name] || ""}</div>
                        ${r.status_name === "Accepted" ? `
                        <button class="profile-edit-btn" style="margin-top:10px;width:100%" onclick="bookWithSpecialist(${r.specialist_id}, 'Dr. ${r.spec_first} ${r.spec_last}')">
                            Book Appointment with Dr. ${r.spec_last} →
                        </button>` : ""}
                    </div>`).join("");
            }
        }

    } catch (err) {
        console.error("Dashboard load error:", err);
        document.getElementById("greetSub").textContent = "Could not connect to server.";
    }
}

/* ── Global data stores (populated on dashboard load, used by filters) ── */
let _allAppointments = [];
let _allHistory      = [];
let _allTreatments   = [];
let _allBilling      = [];

/* ── Pill toggle state ── */
// Appointment pills — all on by default (show everything)
let _apptPills = new Set(['Upcoming', 'Completed', 'Cancelled', 'No-Show']);

// Health record section pills — all on by default
let _histPills = new Set(['Medications', 'ActiveConditions', 'VisitNotes', 'Resolved']);

// Billing pills — all on by default
let _billPills = new Set(['Unpaid', 'Overdue', 'Paid']);

/* ── Profile completeness check ── */
let _patientId         = null;
let _patientCity       = null;
let _patientDOB        = null;
let _physicianWorkDays = [];

function checkProfileCompleteness(patient) {
    _patientId   = patient.patient_id;
    _patientCity = patient.city || null;
    _patientDOB  = patient.date_of_birth || null;

    const missing = [];
    if (!patient.first_name)              missing.push("first name");
    if (!patient.last_name)               missing.push("last name");
    if (!patient.date_of_birth)           missing.push("date of birth");
    if (!patient.phone_number)            missing.push("phone number");
    if (!patient.email)                   missing.push("email");
    if (!patient.gender)                  missing.push("gender");
    if (!patient.street_address)          missing.push("address");
    if (!patient.emergency_contact_name)  missing.push("emergency contact name");
    if (!patient.emergency_contact_phone) missing.push("emergency contact phone");

    const banner = document.getElementById("profileBanner");

    // Everything filled in — hide the banner and stop
    if (missing.length === 0) {
        banner.classList.add("hidden");
        return;
    }

    if (_bannerSuppressed) return;   // user just dismissed — don't nag immediately

    const list = document.getElementById("bannerMissingList");
    list.textContent = `Missing: ${missing.join(", ")}.`;
    banner.classList.remove("hidden");
}

let _bannerSuppressed = false;

function dismissBanner() {
    document.getElementById("profileBanner").classList.add("hidden");
    _bannerSuppressed = true;
    setTimeout(() => { _bannerSuppressed = false; }, 30000); // re-check after 30s
}

/* ── Care Setup Modal ── */
async function openCareModal() {
    document.getElementById("careSetupModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const msg = document.getElementById("careSetupMsg");
    if (msg) { msg.className = "modal-save-msg hidden"; msg.textContent = ""; }

    // Load cities
    const citySelect = document.getElementById("care_city");
    citySelect.innerHTML = '<option value="">Loading…</option>';
    try {
        const r = await fetch(`/api/patient/care/cities?user_id=${user.id}`);
        const cities = await r.json();
        citySelect.innerHTML = '<option value="">Select a city…</option>' +
            cities.map(c => `<option value="${c.city}">${c.city}${c.state ? ", " + c.state : ""}</option>`).join("");
    } catch(e) { citySelect.innerHTML = '<option value="">Could not load cities</option>'; }

    // Load insurance options
    const insSelect = document.getElementById("care_insurance");
    insSelect.innerHTML = '<option value="">None / Self-Pay</option>';
    try {
        const r = await fetch(`/api/patient/care/insurance?user_id=${user.id}`);
        const plans = await r.json();
        insSelect.innerHTML += plans.map(p =>
            `<option value="${p.insurance_id}">${p.provider_name}${p.coverage_percentage ? " (" + p.coverage_percentage + "% coverage)" : ""}</option>`
        ).join("");
    } catch(e) { /* keep default */ }
}

async function loadPhysiciansForCity() {
    const city = document.getElementById("care_city").value;
    const phSelect = document.getElementById("care_physician");
    if (!city) { phSelect.innerHTML = '<option value="">Select a city first…</option>'; return; }
    phSelect.innerHTML = '<option value="">Loading…</option>';
    try {
        const r = await fetch(`/api/patient/care/physicians?city=${encodeURIComponent(city)}&user_id=${user.id}`);
        const physicians = await r.json();
        if (physicians.length === 0) {
            phSelect.innerHTML = '<option value="">No physicians at this location</option>';
        } else {
            // Calculate patient age for specialty hints
            let patientAge = null;
            if (_patientDOB) {
                const dob = new Date(_patientDOB);
                patientAge = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
            }
            phSelect.innerHTML = '<option value="">Choose a physician…</option>' +
                physicians.map(p => {
                    const sp = p.specialty || "";
                    let hint = "";
                    if (/geriatric/i.test(sp)) {
                        hint = patientAge !== null && patientAge >= 65
                            ? " — Recommended for your age"
                            : " — Typically for patients 65+";
                    } else if (/pediatric/i.test(sp)) {
                        hint = " — For patients under 18";
                    } else if (/family|general|internal medicine/i.test(sp)) {
                        hint = " — All ages welcome";
                    }
                    return `<option value="${p.physician_id}">Dr. ${p.first_name} ${p.last_name} — ${sp}${hint}</option>`;
                }).join("");
        }
    } catch(e) { phSelect.innerHTML = '<option value="">Could not load physicians</option>'; }
}

function closeCareModal() {
    document.getElementById("careSetupModal").classList.add("hidden");
    document.body.style.overflow = "";
}

function closeCareModalOutside(e) {
    if (e.target === document.getElementById("careSetupModal")) closeCareModal();
}

async function submitCareSetup() {
    const msg = document.getElementById("careSetupMsg");
    const physician_id = document.getElementById("care_physician").value;
    const insurance_id = document.getElementById("care_insurance").value;

    if (!physician_id) {
        msg.className = "modal-save-msg error";
        msg.textContent = "Please select a physician.";
        return;
    }

    // If patient already has a physician assigned, show confirmation
    const confirmEl = document.getElementById("careChangeConfirm");
    if (confirmEl && confirmEl.dataset.shown !== "true") {
        const dashRes = await fetch(`/api/patient/dashboard?user_id=${user.id}`);
        const dashData = await dashRes.json();
        const patient = dashData.patient;
        const currentPhysicianId = patient && patient.primary_physician_id;

        if (currentPhysicianId && String(currentPhysicianId) !== String(physician_id)) {
            // Find upcoming scheduled appointments with old physician
            const upcoming = (dashData.appointments || []).filter(a =>
                String(a.physician_id) === String(currentPhysicianId) &&
                a.status_name === "Scheduled" &&
                new Date(a.appointment_date) >= new Date()
            );

            // Detect location change
            const oldCity = patient.city || "";
            const newCity = document.getElementById("care_city") ? document.getElementById("care_city").value : "";
            const locationChanging = newCity && oldCity && newCity.toLowerCase() !== oldCity.toLowerCase();

            // Build warning content
            const apptListEl = document.getElementById("careChangeAppts");
            if (apptListEl) {
                let html = "";

                if (locationChanging) {
                    html += `
                        <div style="font-size:13px;color:#7f1d1d;font-weight:600;margin-bottom:4px">Location change: ${oldCity} &rarr; ${newCity}</div>
                        <div style="font-size:12px;color:#7f1d1d;margin-bottom:10px;line-height:1.5">
                            Your new physician is in a different city. All future appointments will be at the ${newCity} clinic.
                            Any active specialist referrals tied to your old location remain valid until they expire.
                        </div>`;
                }

                if (upcoming.length > 0) {
                    html += `
                        <div style="font-size:13px;color:#7f1d1d;font-weight:600;margin-bottom:4px">
                            You have ${upcoming.length} upcoming appointment${upcoming.length > 1 ? "s" : ""} with Dr. ${patient.doc_last}:
                        </div>
                        <ul style="margin:4px 0 10px 16px;font-size:12px;color:#7f1d1d">
                            ${upcoming.map(a => `<li>${fmt(a.appointment_date)} — ${a.reason_for_visit || "Visit"} (${a.city || oldCity})</li>`).join("")}
                        </ul>
                        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#7f1d1d;cursor:pointer">
                            <input type="checkbox" id="cancelUpcomingCheck">
                            Cancel these appointments and rebook with my new physician
                        </label>`;
                } else {
                    html += `<div style="font-size:13px;color:#7f1d1d;margin-bottom:6px">You have no upcoming appointments with your current physician.</div>`;
                }

                apptListEl.innerHTML = html;
            }

            confirmEl.style.display = "";
            confirmEl.dataset.shown = "true";
            msg.className = "modal-save-msg";
            msg.textContent = "";
            return;
        }
    }

    // Reset confirm state
    if (confirmEl) { confirmEl.style.display = "none"; confirmEl.dataset.shown = "false"; }

    const cancelUpcoming = !!(document.getElementById("cancelUpcomingCheck") && document.getElementById("cancelUpcomingCheck").checked);
    const newCity = document.getElementById("care_city") ? document.getElementById("care_city").value : null;

    msg.className = "modal-save-msg";
    msg.textContent = "Saving…";

    try {
        const r = await fetch("/api/patient/care/assign", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, physician_id, insurance_id: insurance_id || null, cancelUpcoming, city: newCity || null })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Failed to assign care team");
        msg.className = "modal-save-msg success";
        if (data.physicianChanged) {
            let successMsg = "Physician updated.";
            if (newCity) successMsg += ` Your clinic location is now ${newCity}.`;
            if (cancelUpcoming) successMsg += " Upcoming appointments with your previous physician have been cancelled.";
            msg.textContent = successMsg;
        } else {
            msg.textContent = "Care team saved.";
        }
        setTimeout(() => {
            closeCareModal();
            loadDashboard();
        }, 1500);
    } catch(err) {
        msg.className = "modal-save-msg error";
        msg.textContent = err.message || "Something went wrong. Please try again.";
    }
}

function confirmCareChange() {
    const confirmEl = document.getElementById("careChangeConfirm");
    if (confirmEl) { confirmEl.dataset.shown = "true"; }
    submitCareSetup();
}

function cancelCareChange() {
    const confirmEl = document.getElementById("careChangeConfirm");
    if (confirmEl) { confirmEl.style.display = "none"; confirmEl.dataset.shown = "false"; }
}

/* ── Referral Request Modal ── */
async function openReferralModal() {
    document.getElementById("referralModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const errEl = document.getElementById("referralFormError");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
    document.getElementById("rf_reason").value = "";

    // Load specialists from the patient's city
    const spSelect = document.getElementById("rf_specialist");
    spSelect.innerHTML = '<option value="">Loading…</option>';
    try {
        // Get patient's primary physician city from the care card data already on screen
        const cityEl = document.querySelector("#careCard [data-city]");
        // Fall back: fetch from the user's office city via specialists endpoint
        // We store the city on the dashboard load; use a module-level variable
        const city = _patientCity || "";
        if (!city) { spSelect.innerHTML = '<option value="">No city found — update your profile first</option>'; return; }
        const r = await fetch(`/api/patient/referral/specialists?city=${encodeURIComponent(city)}&user_id=${user.id}`);
        const specialists = await r.json();
        if (!specialists.length) {
            spSelect.innerHTML = '<option value="">No specialists available in your city</option>';
        } else {
            spSelect.innerHTML = '<option value="">Choose a specialist…</option>' +
                specialists.map(s => `<option value="${s.physician_id}">Dr. ${s.first_name} ${s.last_name} — ${s.specialty}</option>`).join("");
        }
    } catch(e) { spSelect.innerHTML = '<option value="">Could not load specialists</option>'; }
}

function closeReferralModal() {
    document.getElementById("referralModal").classList.add("hidden");
    document.body.style.overflow = "";
}

async function submitReferralRequest() {
    const specialist_id    = document.getElementById("rf_specialist").value;
    const referral_reason  = document.getElementById("rf_reason").value.trim();
    const errEl = document.getElementById("referralFormError");

    if (!specialist_id || !referral_reason) {
        errEl.textContent = "Please select a specialist and describe your reason.";
        errEl.style.display = "";
        return;
    }

    try {
        const r = await fetch("/api/patient/referral/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, specialist_id, referral_reason })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeReferralModal();
        loadDashboard();
    } catch(err) {
        errEl.textContent = err.message || "Could not submit request. Please try again.";
        errEl.style.display = "";
    }
}

/* ── Book with specialist from accepted referral ── */
async function bookWithSpecialist(specialist_id, label) {
    // Open the booking modal, skip step 1, go straight to step 2 with specialist locked
    document.getElementById("bookingModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    document.getElementById("bookingError").style.display = "none";

    // Jump directly to step 2 (skip physician selection)
    ["bstep1","bstep2","bstep3"].forEach((id,i) => {
        document.getElementById(id).classList.toggle("hidden", i !== 1);
    });

    // Lock physician dropdown to this specialist
    const phSelect = document.getElementById("b_physician");
    phSelect.innerHTML = `<option value="${specialist_id}">${label}</option>`;
    phSelect.value = specialist_id;
    phSelect.disabled = true;

    // Set min date
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById("b_date");
    dateInput.min = tomorrow.toISOString().split("T")[0];
    const maxDate2 = new Date(); maxDate2.setFullYear(maxDate2.getFullYear() + 2);
    dateInput.max = maxDate2.toISOString().split("T")[0];
    dateInput.value = "";
    document.getElementById("b_date_dayname").textContent = "";
    document.getElementById("b_day_error").style.display = "none";
    document.getElementById("b_slot").innerHTML = '<option value="">Pick a date first…</option>';
    _physicianWorkDays = [];

    // Load schedule hint for specialist
    try {
        const r = await fetch(`/api/patient/appointments/physician-schedule?physician_id=${specialist_id}&user_id=${user.id}`);
        const data = await r.json();
        const schedules = data.schedules || [];
        _physicianWorkDays = schedules.map(s => s.day_of_week);

        const hintEl  = document.getElementById("b_schedule_hint");
        const daysEl  = document.getElementById("b_schedule_days");
        const hoursEl = document.getElementById("b_schedule_hours");
        if (schedules.length) {
            const dayColors = { Monday:"#6ea8fe", Tuesday:"#a78bfa", Wednesday:"#34d399",
                                Thursday:"#f59e0b", Friday:"#f87171", Saturday:"#fb923c", Sunday:"#94a3b8" };
            daysEl.innerHTML = schedules.map(s => {
                const c = dayColors[s.day_of_week] || "#9ca3af";
                const fmtTime = t => { const [h,m] = t.toString().split(":").slice(0,2); const hn=parseInt(h); return `${hn%12||12}:${m} ${hn>=12?"PM":"AM"}`; };
                return `<span style="background:${c}22;color:${c};border:1px solid ${c}55;padding:3px 10px;border-radius:20px;font-weight:700;font-size:12px">${s.day_of_week}</span>
                         <span style="font-size:11px;color:#6b7280">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</span>`;
            }).join("&nbsp;&nbsp;");
            const cities = [...new Set(schedules.map(s => s.city).filter(Boolean))];
            hoursEl.textContent = cities.length ? `Office: ${cities.join(", ")}` : "";
            hintEl.style.display = "block";
        } else {
            hintEl.style.display = "none";
        }
    } catch(e) { document.getElementById("b_schedule_hint").style.display = "none"; }
}

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
    if (!modalOpen) return;

    if (e.key === "Escape") {
        closeProfileModal();
        return;
    }

    if (e.key === "Enter") {
        const active = document.activeElement;
        // Dropdowns handle Enter themselves
        if (active?.tagName === "SELECT") return;
        // "Do this later" — dismiss
        if (active?.classList.contains("modal-cancel-btn")) {
            e.preventDefault();
            closeProfileModal();
            return;
        }
        // Everything else in the modal — run the submit handler directly
        e.preventDefault();
        submitProfile(e);
    }
});

function prefillModal(patient) {
    document.getElementById("mf_first_name").value = patient.first_name || "";
    document.getElementById("mf_last_name").value  = patient.last_name  || "";

    // ── DOB: lock if already set (mirrors real EHR behaviour) ──
    const dobField = document.getElementById("mf_dob");
    const dobNote  = document.getElementById("dob_note");
    const today    = new Date().toISOString().split("T")[0];
    const minDate  = new Date();
    minDate.setFullYear(minDate.getFullYear() - 130);

    if (patient.date_of_birth) {
        dobField.value    = patient.date_of_birth.split("T")[0];
        dobField.readOnly = true;
        dobField.classList.add("dob-locked");
        dobNote.style.display = "block";
    } else {
        dobField.readOnly = false;
        dobField.classList.remove("dob-locked");
        dobField.max      = today;
        dobField.min      = minDate.toISOString().split("T")[0];
        dobNote.style.display = "none";
    }
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
    const phoneRe  = /^\(\d{3}\) \d{3}-\d{4}$/;   // must match (XXX) XXX-XXXX exactly
    const zipRe    = /^\d{5}(-\d{4})?$/;
    const stateRe  = /^[A-Za-z]{2}$/;
    const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const nameRe   = /^[a-zA-Z\s\-'\.]+$/;

    const firstName = document.getElementById("mf_first_name").value.trim();
    const lastName  = document.getElementById("mf_last_name").value.trim();
    const dob       = document.getElementById("mf_dob").value;
    const gender    = document.getElementById("mf_gender").value;
    const phone     = document.getElementById("mf_phone").value.trim();
    const email     = document.getElementById("mf_email").value.trim();
    const street    = document.getElementById("mf_street").value.trim();
    const ecName    = document.getElementById("mf_ec_name").value.trim();
    const ecPhone   = document.getElementById("mf_ec_phone").value.trim();
    const zip       = document.getElementById("mf_zip").value.trim();
    const state     = document.getElementById("mf_state").value.trim();

    // ── Required field checks ──
    if (!firstName)  return "Please enter your first name.";
    if (!lastName)   return "Please enter your last name.";
    if (!dob)        return "Please enter your date of birth.";
    if (!gender)     return "Please select your gender.";
    if (!phone)      return "Please enter your phone number.";
    if (!email)      return "Please enter your email address.";
    if (!street)     return "Please enter your street address.";
    if (!ecName)     return "Please enter an emergency contact name.";
    if (!ecPhone)    return "Please enter an emergency contact phone number.";

    // ── Format / value checks ──
    if (!nameRe.test(firstName))  return "First name should only contain letters.";
    if (!nameRe.test(lastName))   return "Last name should only contain letters.";
    if (ecName && !nameRe.test(ecName))   return "Emergency contact name should only contain letters.";
    if (!phoneRe.test(phone))     return "Phone must be in (XXX) XXX-XXXX format — just type digits and it auto-formats.";
    if (!phoneRe.test(ecPhone))   return "Emergency contact phone must be in (XXX) XXX-XXXX format.";
    if (!emailRe.test(email))     return "Please enter a valid email address (e.g. name@email.com).";
    if (zip && !zipRe.test(zip))  return "ZIP code must be 5 digits (e.g. 77450).";
    if (state && !stateRe.test(state)) return "State must be a 2-letter code (e.g. TX).";
    const ageYears = (new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000);
    if (new Date(dob) > new Date() || ageYears < 18 || ageYears > 130) return "Please enter a valid date of birth.";
    return null;
}

/* ── Confirmation dialog (returns Promise<boolean>) ── */
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const existing = document.getElementById("confirmDialog");
        if (existing) existing.remove();

        const dialog = document.createElement("div");
        dialog.id = "confirmDialog";
        dialog.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;
            display:flex;align-items:center;justify-content:center;`;
        dialog.innerHTML = `
            <div style="background:white;border-radius:14px;padding:32px 28px;max-width:380px;width:90%;
                        box-shadow:0 20px 60px rgba(0,0,0,0.2);font-family:inherit;">
                <h4 style="margin:0 0 10px;color:#1f2a6d;font-size:15px;">${title}</h4>
                <p style="margin:0 0 24px;color:#666;font-size:13px;line-height:1.6;">${message}</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="confirmNo" style="padding:9px 20px;border:1px solid #e0e0e0;background:none;
                        border-radius:8px;cursor:pointer;font-size:13px;color:#888;font-family:inherit;">Cancel</button>
                    <button id="confirmYes" style="padding:9px 22px;background:#1f2a6d;color:white;border:none;
                        border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;">Yes, save</button>
                </div>
            </div>`;
        document.body.appendChild(dialog);

        dialog.querySelector("#confirmYes").onclick = () => { dialog.remove(); resolve(true); };
        dialog.querySelector("#confirmNo").onclick  = () => { dialog.remove(); resolve(false); };
        dialog.onclick = (ev) => { if (ev.target === dialog) { dialog.remove(); resolve(false); } };
    });
}

async function submitProfile(e) {
    if (e && e.preventDefault) e.preventDefault();
    const msg = document.getElementById("profileSaveMsg");

    const validationError = validateProfileForm();
    if (validationError) {
        msg.className = "modal-save-msg error";
        msg.textContent = validationError;
        return;
    }

    // ── Confirmation popup ──
    const confirmed = await showConfirmDialog(
        "Save changes?",
        "Are you sure you want to update your personal information?"
    );
    if (!confirmed) return;

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
        if (err.message === "server_unavailable") {
            msg.textContent = "Server is unreachable. Please try again or call your clinic.";
        } else if (err.message === "Failed to fetch") {
            msg.textContent = "No internet connection. Please check your connection and try again.";
        } else {
            // Show the actual error from the server (validation messages, etc.)
            msg.textContent = err.message || "Something went wrong. Please try again.";
        }
    }
}

loadDashboard();

/* ─────────────────────────────────────────────
   APPOINTMENT PILLS + FILTER + RENDER
─────────────────────────────────────────────── */
function toggleApptPill(value) {
    if (_apptPills.has(value)) {
        _apptPills.delete(value);
    } else {
        _apptPills.add(value);
    }
    const btn = document.getElementById("pill-appt-" + value);
    if (btn) btn.classList.toggle("on", _apptPills.has(value));
    applyApptFilters();
}

function applyApptFilters() {
    const typeVal  = (document.getElementById("apptTypeFilter")?.value || "all");
    const sortVal  = (document.getElementById("apptSortOrder")?.value  || "newest");
    const search   = (document.getElementById("apptSearch")?.value     || "").toLowerCase().trim();

    const today      = new Date(); today.setHours(0,0,0,0);
    const allPillsOff = _apptPills.size === 0;   // empty = show all (none deselected yet)

    let filtered = _allAppointments.filter(a => {
        // Pill filter — empty set means show everything; 4/4 on also shows everything
        if (!allPillsOff) {
            const isUpcoming   = a.status_name === "Scheduled" && new Date(a.appointment_date) >= today;
            const isCompleted  = a.status_name === "Completed";
            const isCancelled  = a.status_name === "Cancelled";
            const isNoShow     = a.status_name === "No-Show" || a.status_name === "No Show";
            // Edge case: scheduled but past date — lump with Upcoming pill
            const isOverdueScheduled = a.status_name === "Scheduled" && new Date(a.appointment_date) < today;

            const match =
                (_apptPills.has("Upcoming")   && (isUpcoming || isOverdueScheduled)) ||
                (_apptPills.has("Completed")  && isCompleted)  ||
                (_apptPills.has("Cancelled")  && isCancelled)  ||
                (_apptPills.has("No-Show")    && isNoShow);

            if (!match) return false;
        }
        // Type filter
        if (typeVal !== "all" && (a.appointment_type || "General") !== typeVal) return false;
        // Search
        if (search) {
            const hay = `${a.doc_first} ${a.doc_last} ${a.reason_for_visit} ${a.appointment_type}`.toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    // Sort
    filtered.sort((a, b) => {
        const da = new Date(a.appointment_date), db = new Date(b.appointment_date);
        return sortVal === "oldest" ? da - db : db - da;
    });

    // Split
    const upcoming = filtered.filter(a => a.status_name === "Scheduled" && new Date(a.appointment_date) >= today);
    const past     = filtered.filter(a => !(a.status_name === "Scheduled" && new Date(a.appointment_date) >= today));

    // Count badge
    const countEl = document.getElementById("apptFilterCount");
    if (countEl) {
        const isFiltered = (!allPillsOff && _apptPills.size < 4) || typeVal !== "all" || search;
        countEl.textContent = isFiltered
            ? `${filtered.length} of ${_allAppointments.length} appointments match`
            : `${_allAppointments.length} total appointments`;
    }

    // Sub-section visibility
    const showUpcoming = allPillsOff || _apptPills.has("Upcoming");
    const showPast     = allPillsOff || _apptPills.has("Completed") || _apptPills.has("Cancelled") || _apptPills.has("No-Show");
    const upSec   = document.getElementById("apptUpcomingSection");
    const pastSec = document.getElementById("apptPastSection");
    if (upSec)   upSec.style.display   = showUpcoming ? "" : "none";
    if (pastSec) pastSec.style.display  = showPast    ? "" : "none";

    // Render upcoming
    const upBody = document.getElementById("apptUpcomingBody");
    if (upBody) {
        upBody.innerHTML = upcoming.length
            ? upcoming.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${timeFmt(a.appointment_time)}</td>
                <td>Dr. ${a.doc_first} ${a.doc_last}</td>
                <td>${a.city || "—"}</td>
                <td>${a.appointment_type || "General"}</td>
                <td>${a.reason_for_visit || "—"}</td>
                <td>${pill(a.status_name)}</td>
                <td><button onclick="cancelAppointment(${a.appointment_id})" style="padding:4px 10px;font-size:11px;background:none;border:1px solid #e05c5c;color:#e05c5c;border-radius:6px;cursor:pointer;font-family:inherit">Cancel</button></td>
            </tr>`).join("")
            : `<tr><td colspan="8" class="table-empty">No upcoming appointments</td></tr>`;
    }

    // Render past
    const pastBody = document.getElementById("apptPastBody");
    if (pastBody) {
        pastBody.innerHTML = past.length
            ? past.map(a => {
                const bill = _allBilling.find(b =>
                    b.appointment_date && a.appointment_date &&
                    b.appointment_date.toString().split("T")[0] === a.appointment_date.toString().split("T")[0] &&
                    (b.doc_last === a.doc_last || !b.doc_last)
                );
                let billCell = "—";
                if (a.status_name === "Completed") {
                    if (bill) {
                        const isPaid = (bill.payment_status || "").toLowerCase() === "paid";
                        billCell = isPaid
                            ? `<span style="color:#10b981;font-size:12px;font-weight:600">✓ Paid</span>`
                            : `<button onclick="showSection('billing')" style="padding:4px 10px;font-size:11px;background:none;border:1px solid #f59e0b;color:#d97706;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:600">Pay $${parseFloat(bill.patient_owed||0).toFixed(2)} →</button>`;
                    } else {
                        billCell = `<button onclick="showSection('billing')" style="padding:4px 10px;font-size:11px;background:none;border:1px solid #e0e3ed;color:#888;border-radius:6px;cursor:pointer;font-family:inherit">View Bill</button>`;
                    }
                }
                return `<tr>
                    <td class="primary">${fmt(a.appointment_date)}</td>
                    <td>${timeFmt(a.appointment_time)}</td>
                    <td>Dr. ${a.doc_first} ${a.doc_last}</td>
                    <td>${a.city || "—"}</td>
                    <td>${a.appointment_type || "General"}</td>
                    <td>${pill(a.status_name)}</td>
                    <td>${billCell}</td>
                </tr>`;
            }).join("")
            : `<tr><td colspan="7" class="table-empty">No past appointments on record</td></tr>`;
    }
}

function resetApptFilters() {
    _apptPills = new Set(["Upcoming", "Completed", "Cancelled", "No-Show"]);
    ["Upcoming", "Completed", "Cancelled", "No-Show"].forEach(k => {
        document.getElementById("pill-appt-" + k)?.classList.add("on");
    });
    ["apptTypeFilter","apptSortOrder"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.selectedIndex = 0;
    });
    const s = document.getElementById("apptSearch");
    if (s) s.value = "";
    applyApptFilters();
}

/* ─────────────────────────────────────────────
   HEALTH RECORD PILLS + SECTION VISIBILITY
─────────────────────────────────────────────── */
function toggleHistPill(key) {
    if (_histPills.has(key)) {
        _histPills.delete(key);
    } else {
        _histPills.add(key);
    }
    const btn = document.getElementById("pill-hist-" + key);
    if (btn) btn.classList.toggle("on", _histPills.has(key));
    applyHistSectionVisibility();
}

function applyHistSectionVisibility() {
    const allOff = _histPills.size === 0;  // no pills selected = show everything

    const showMeds    = allOff || _histPills.has("Medications");
    const showActive  = allOff || _histPills.has("ActiveConditions");
    const showResolved= allOff || _histPills.has("Resolved");
    const showNotes   = allOff || _histPills.has("VisitNotes");

    // Medications section
    const medSec = document.getElementById("histSection-Medications");
    if (medSec) medSec.style.display = showMeds ? "" : "none";

    // Active conditions inner section
    const activeSec = document.getElementById("activeConditionsSection");
    if (activeSec) activeSec.style.display = showActive ? "" : "none";

    // Resolved conditions inner section
    const resolvedSec = document.getElementById("resolvedConditionsSection");
    if (resolvedSec) resolvedSec.style.display = showResolved ? "" : "none";

    // Health Conditions parent block — hide if both active and resolved are off
    const condBlock = document.getElementById("histConditionsBlock");
    if (condBlock) condBlock.style.display = (showActive || showResolved) ? "" : "none";

    // Visit Notes section
    const notesSec = document.getElementById("histSection-VisitNotes");
    if (notesSec) notesSec.style.display = showNotes ? "" : "none";
}

/* ─────────────────────────────────────────────
   HEALTH RECORDS FILTER + RENDER
─────────────────────────────────────────────── */
function applyHistFilters() {
    const sortVal = (document.getElementById("histSortOrder")?.value || "newest");
    const search  = (document.getElementById("histSearch")?.value    || "").toLowerCase().trim();

    const adminConditions = ["No-Show", "Appointment Status Correction"];

    // Strip admin entries, separate notes
    const visibleHistory = _allHistory.filter(h =>
        !adminConditions.some(a => (h.condition || "").startsWith(a))
    );

    const visitNotes = visibleHistory.filter(h =>
        (h.condition || "").toLowerCase() === "clinical note"
    );

    let conditions = visibleHistory.filter(h =>
        (h.condition || "").toLowerCase() !== "clinical note"
    );

    // Apply search
    if (search) {
        conditions = conditions.filter(h =>
            (h.condition || "").toLowerCase().includes(search) ||
            (h.notes || "").toLowerCase().includes(search)
        );
    }

    // Sort
    conditions.sort((a, b) => {
        const da = new Date(a.diagnosis_date), db = new Date(b.diagnosis_date);
        return sortVal === "oldest" ? da - db : db - da;
    });

    // Count badge
    const countEl = document.getElementById("histFilterCount");
    const totalConditions = visibleHistory.filter(h => (h.condition || "").toLowerCase() !== "clinical note").length;
    if (countEl) {
        countEl.textContent = search
            ? `${conditions.length} of ${totalConditions} conditions match`
            : `${totalConditions} conditions on record`;
    }

    // Split active / resolved
    const active   = conditions.filter(h => (h.status || "").toLowerCase() === "active");
    const resolved = conditions.filter(h => (h.status || "").toLowerCase() !== "active");

    // Active conditions — card layout
    const activeEl = document.getElementById("activeConditionsBody");
    if (activeEl) {
        activeEl.innerHTML = active.length
            ? active.map(h => `
                <div style="border:1px solid #e0e4f0;border-left:4px solid #6ea8fe;border-radius:10px;padding:16px 20px;background:white">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
                        <div style="font-size:15px;font-weight:700;color:#1f2a6d">${h.condition || "—"}</div>
                        ${pill(h.status || "Active")}
                    </div>
                    <div style="font-size:12px;color:#888;margin-bottom:${h.notes ? "10px" : "0"}">
                        Recorded ${fmt(h.diagnosis_date)}${h.physician_name ? ` &nbsp;·&nbsp; ${h.physician_name}` : ""}
                    </div>
                    ${h.notes ? `<div style="font-size:13px;color:#555;line-height:1.6;background:#f8fbff;border-radius:7px;padding:10px 14px;border:1px solid #e8ecf8">${h.notes}</div>` : ""}
                </div>`).join("")
            : `<p class="table-empty" style="padding:12px 0">${search ? "No active conditions match your search." : "No active conditions on record."}</p>`;
    }

    // Resolved — table
    const resolvedEl = document.getElementById("resolvedHistoryBody");
    if (resolvedEl) {
        resolvedEl.innerHTML = resolved.length
            ? resolved.map(h => `<tr>
                <td class="primary">${h.condition || "—"}</td>
                <td>${fmt(h.diagnosis_date)}</td>
                <td>${h.physician_name || "—"}</td>
                <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#888">${h.notes || "—"}</td>
            </tr>`).join("")
            : `<tr><td colspan="4" class="table-empty">${search ? "No resolved conditions match your search." : "No resolved conditions on record"}</td></tr>`;
    }

    // Visit notes — always render all (not filterable by search/sort for privacy)
    const notesEl = document.getElementById("visitNotesBody");
    if (notesEl) {
        notesEl.innerHTML = visitNotes.length
            ? visitNotes.map(h => `
                <div style="border:1px solid #f0f2f8;border-radius:10px;padding:14px 18px;background:white">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px">
                            ${h.physician_name || "Your Care Team"} &nbsp;·&nbsp; ${fmt(h.diagnosis_date)}
                        </div>
                        <span style="font-size:11px;background:#f0f4ff;color:#1f2a6d;border-radius:20px;padding:2px 10px;font-weight:600">Visit Note</span>
                    </div>
                    <div style="font-size:13px;color:#444;line-height:1.7">${h.notes || "—"}</div>
                </div>`).join("")
            : `<p class="table-empty" style="padding:8px 0">No visit notes on record yet. Notes are added after completed appointments.</p>`;
    }

    // Re-apply section visibility after re-render
    applyHistSectionVisibility();
}

function resetHistFilters() {
    _histPills = new Set(["Medications", "ActiveConditions", "VisitNotes", "Resolved"]);
    ["Medications", "ActiveConditions", "VisitNotes", "Resolved"].forEach(k => {
        document.getElementById("pill-hist-" + k)?.classList.add("on");
    });
    const sortEl = document.getElementById("histSortOrder");
    if (sortEl) sortEl.selectedIndex = 0;
    const s = document.getElementById("histSearch");
    if (s) s.value = "";
    applyHistFilters();
}

/* ─────────────────────────────────────────────
   MEDICATIONS RENDER
─────────────────────────────────────────────── */
function renderMedications() {
    const el = document.getElementById("medicationsBody");
    if (!el) return;

    if (!_allTreatments || _allTreatments.length === 0) {
        el.innerHTML = `<p class="table-empty" style="padding:8px 0">No medications or treatments on file. Your care team adds these after your visits.</p>`;
        return;
    }

    el.innerHTML = _allTreatments.map(t => {
        const followUp = t.follow_up_date
            ? (new Date(t.follow_up_date) < new Date()
                ? `<span class="med-card-followup" style="background:#fee2e2;color:#b91c1c">Follow-up overdue: ${fmt(t.follow_up_date)}</span>`
                : `<span class="med-card-followup">Follow-up: ${fmt(t.follow_up_date)}</span>`)
            : "";
        return `
        <div class="med-card">
            <div class="med-card-name">${t.prescribed_medication || "Treatment Plan"}</div>
            <div class="med-card-detail">
                For: <strong>${t.diagnosis_description || t.diagnosis_code || "—"}</strong>
                &nbsp;·&nbsp; Prescribed by ${t.physician_name || "your physician"}
                &nbsp;·&nbsp; ${fmt(t.appointment_date)}
            </div>
            ${t.treatment_plan ? `<div class="med-card-plan">${t.treatment_plan}</div>` : ""}
            ${followUp}
        </div>`;
    }).join("");
}

/* ─────────────────────────────────────────────
   BILLING PILLS + SUMMARY + FILTER + RENDER
─────────────────────────────────────────────── */
function toggleBillingPill(value) {
    if (_billPills.has(value)) {
        _billPills.delete(value);
    } else {
        _billPills.add(value);
    }
    const btn = document.getElementById("pill-bill-" + value);
    if (btn) btn.classList.toggle("on", _billPills.has(value));
    applyBillingFilters();
}

function applyBillingFilters() {
    const timeRange   = document.getElementById("billTimeRange")?.value || "all";
    const allPillsOff = _billPills.size === 0;

    const today = new Date(); today.setHours(0,0,0,0);

    // Time range — compute start cutoff
    let startDate = null;
    if (timeRange === "month") {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (timeRange === "3months") {
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 3);
    } else if (timeRange === "year") {
        startDate = new Date(today.getFullYear(), 0, 1);
    }

    let filtered = _allBilling.filter(b => {
        // Time range
        if (startDate && b.appointment_date) {
            if (new Date(b.appointment_date) < startDate) return false;
        }
        // Pill filter — empty = show all
        if (!allPillsOff) {
            const isPaid    = (b.payment_status || "").toLowerCase() === "paid";
            const isOverdue = !isPaid && b.due_date && new Date(b.due_date) < today;
            const isUnpaid  = !isPaid && !isOverdue;

            const match =
                (_billPills.has("Unpaid")  && isUnpaid)  ||
                (_billPills.has("Overdue") && isOverdue) ||
                (_billPills.has("Paid")    && isPaid);
            if (!match) return false;
        }
        return true;
    });

    // ── Summary calculations ──
    const totalBilled = filtered.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
    const totalInsPaid = filtered.reduce((s, b) => s + parseFloat(b.insurance_paid_amount || 0), 0);
    const paidBills   = filtered.filter(b => (b.payment_status || "").toLowerCase() === "paid");
    const unpaidBills = filtered.filter(b => (b.payment_status || "").toLowerCase() !== "paid");
    const totalOutOfPocket = paidBills.reduce((s, b) => s + parseFloat(b.patient_owed || 0), 0);
    const totalOwed        = unpaidBills.reduce((s, b) => s + parseFloat(b.patient_owed || 0), 0);

    // Next due — earliest unpaid bill with a due date
    const nextDue = unpaidBills
        .filter(b => b.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

    const periodLabel = timeRange === "month" ? "This month" :
                        timeRange === "3months" ? "Last 3 months" :
                        timeRange === "year"  ? "This year" : "All time";

    // Render summary cards
    const summaryEl = document.getElementById("billingSummary");
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;padding:16px 20px">
                <div style="background:#f8fbff;border:1px solid #e0e4f0;border-radius:10px;padding:14px 16px">
                    <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Total Billed</div>
                    <div style="font-size:22px;font-weight:800;color:#1f2a6d">$${totalBilled.toFixed(2)}</div>
                    <div style="font-size:11px;color:#aaa;margin-top:3px">${periodLabel}</div>
                </div>
                <div style="background:#f0f4ff;border:1px solid #c7d7fd;border-radius:10px;padding:14px 16px">
                    <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Insurance Covered</div>
                    <div style="font-size:22px;font-weight:800;color:#3b82f6">$${totalInsPaid.toFixed(2)}</div>
                    <div style="font-size:11px;color:#aaa;margin-top:3px">Paid by your plan</div>
                </div>
                <div style="background:${totalOwed > 0 ? "#fff5f5" : "#f0fdf4"};border:1px solid ${totalOwed > 0 ? "#fecaca" : "#bbf7d0"};border-radius:10px;padding:14px 16px">
                    <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Outstanding</div>
                    <div style="font-size:22px;font-weight:800;color:${totalOwed > 0 ? "#e05c5c" : "#10b981"}">$${totalOwed.toFixed(2)}</div>
                    <div style="font-size:11px;color:#aaa;margin-top:3px">Balance due</div>
                </div>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px">
                    <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">You've Paid</div>
                    <div style="font-size:22px;font-weight:800;color:#10b981">$${totalOutOfPocket.toFixed(2)}</div>
                    <div style="font-size:11px;color:#aaa;margin-top:3px">Out of pocket</div>
                </div>
                ${nextDue ? `
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px">
                    <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Next Payment</div>
                    <div style="font-size:22px;font-weight:800;color:#d97706">$${parseFloat(nextDue.patient_owed||0).toFixed(2)}</div>
                    <div style="font-size:11px;color:#aaa;margin-top:3px">Due ${fmt(nextDue.due_date)}</div>
                </div>` : ""}
            </div>`;
    }

    // Render billing table
    const bBody = document.getElementById("billingBody");
    if (bBody) {
        bBody.innerHTML = filtered.length
            ? filtered.map(b => {
                const isPaid    = (b.payment_status || "").toLowerCase() === "paid";
                const isOverdue = !isPaid && b.due_date && new Date(b.due_date) < today;
                return `<tr>
                    <td class="primary">${fmt(b.appointment_date)}</td>
                    <td>${b.doc_last ? "Dr. " + b.doc_last : "—"}</td>
                    <td>$${parseFloat(b.total_amount || 0).toFixed(2)}</td>
                    <td style="color:#3b82f6">$${parseFloat(b.insurance_paid_amount || 0).toFixed(2)}</td>
                    <td style="font-weight:600;color:${isPaid ? "#10b981" : isOverdue ? "#e05c5c" : "#f59e0b"}">
                        $${parseFloat(b.patient_owed || 0).toFixed(2)}
                    </td>
                    <td style="color:${isOverdue ? "#e05c5c" : "inherit"}">${fmt(b.due_date)}</td>
                    <td>${pill(b.payment_status || "Unpaid")}</td>
                </tr>`;
            }).join("")
            : `<tr><td colspan="7" class="table-empty">No billing records match your filters.</td></tr>`;
    }
}

/* ── Booking Modal ── */
let _bookingOfficeId = null;

async function openBookingModal() {
    document.getElementById("bookingModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    document.getElementById("bookingError").style.display = "none";
    // Reset to step 1
    ["bstep1","bstep2","bstep3"].forEach((id,i) => {
        document.getElementById(id).classList.toggle("hidden", i !== 0);
    });
    // Set minimum date to tomorrow (no same-day booking)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];
    const dateInput = document.getElementById("b_date");
    dateInput.min = minDate;
    const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 2);
    dateInput.max = maxDate.toISOString().split("T")[0];
    if (!dateInput.value || dateInput.value < minDate) dateInput.value = "";

    // Only show the patient's assigned primary physician
    // Specialists can only be booked through an accepted referral
    const phSelect = document.getElementById("b_physician");
    phSelect.innerHTML = '<option value="">Loading…</option>';
    phSelect.disabled = false;
    try {
        const profileRes = await fetch(`/api/patient/dashboard?user_id=${user.id}`);
        const profileData = await profileRes.json();
        const patient = profileData.patient;
        if (patient && patient.primary_physician_id && patient.doc_last) {
            phSelect.innerHTML = `<option value="${patient.primary_physician_id}">Dr. ${patient.doc_first} ${patient.doc_last} — ${patient.specialty}</option>`;
            phSelect.value = patient.primary_physician_id;
            phSelect.disabled = true; // only one option — lock it
        } else {
            phSelect.innerHTML = '<option value="">No primary physician assigned — set up your care team first</option>';
        }
    } catch(e) { phSelect.innerHTML = '<option value="">Could not load physician</option>'; }

    document.getElementById("b_slot").innerHTML = '<option value="">Pick a date first…</option>';
}

function closeBookingModal() {
    document.getElementById("bookingModal").classList.add("hidden");
    document.body.style.overflow = "";
    const phSelect = document.getElementById("b_physician");
    if (phSelect) phSelect.disabled = false;
    document.getElementById("b_schedule_hint").style.display = "none";
    document.getElementById("b_day_error").style.display = "none";
    document.getElementById("b_date_dayname").textContent = "";
    _physicianWorkDays = [];
}

async function bookingStep2() {
    const ph = document.getElementById("b_physician").value;
    if (!ph) { alert("Please select a physician."); return; }
    document.getElementById("bstep1").classList.add("hidden");
    document.getElementById("bstep2").classList.remove("hidden");

    // Reset date + slot + error state
    document.getElementById("b_date").value = "";
    document.getElementById("b_date_dayname").textContent = "";
    document.getElementById("b_slot").innerHTML = '<option value="">Pick a date first…</option>';
    document.getElementById("b_day_error").style.display = "none";
    _physicianWorkDays = [];

    // Fetch physician's working schedule and surface it above the date picker
    try {
        const r = await fetch(`/api/patient/appointments/physician-schedule?physician_id=${ph}&user_id=${user.id}`);
        const data = await r.json();
        const schedules = data.schedules || [];
        _physicianWorkDays = schedules.map(s => s.day_of_week);

        const hintEl   = document.getElementById("b_schedule_hint");
        const daysEl   = document.getElementById("b_schedule_days");
        const hoursEl  = document.getElementById("b_schedule_hours");

        if (schedules.length) {
            // Render day pills
            const dayColors = { Monday:"#6ea8fe", Tuesday:"#a78bfa", Wednesday:"#34d399",
                                Thursday:"#f59e0b", Friday:"#f87171", Saturday:"#fb923c", Sunday:"#94a3b8" };
            daysEl.innerHTML = schedules.map(s => {
                const c = dayColors[s.day_of_week] || "#9ca3af";
                const fmtTime = t => {
                    const [h,m] = t.toString().split(":").slice(0,2);
                    const hn = parseInt(h); return `${hn%12||12}:${m} ${hn>=12?"PM":"AM"}`;
                };
                return `<span style="background:${c}22;color:${c};border:1px solid ${c}55;padding:3px 10px;border-radius:20px;font-weight:700;font-size:12px">${s.day_of_week}</span>
                         <span style="font-size:11px;color:#6b7280">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</span>`;
            }).join("&nbsp;&nbsp;");

            // Group by city if multiple
            const cities = [...new Set(schedules.map(s => s.city).filter(Boolean))];
            hoursEl.textContent = cities.length ? `Office: ${cities.join(", ")}` : "";
            hintEl.style.display = "block";
        } else {
            hintEl.style.display = "none";
        }
    } catch(e) {
        // Non-fatal — hint just won't show
        document.getElementById("b_schedule_hint").style.display = "none";
    }
}

function bookingBack1() {
    document.getElementById("bstep2").classList.add("hidden");
    document.getElementById("bstep1").classList.remove("hidden");
    // Clear schedule hint so it reloads fresh if they pick a different physician
    document.getElementById("b_schedule_hint").style.display = "none";
    document.getElementById("b_day_error").style.display = "none";
    document.getElementById("b_date_dayname").textContent = "";
    _physicianWorkDays = [];
}

async function loadSlots() {
    const physician_id = document.getElementById("b_physician").value;
    const date = document.getElementById("b_date").value;
    const slotSelect = document.getElementById("b_slot");
    const dayNameEl  = document.getElementById("b_date_dayname");
    const dayErrEl   = document.getElementById("b_day_error");
    if (!date) return;

    // Show day of week on the date input
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const [y,mo,d] = date.split("-").map(Number);
    const pickedDay = dayNames[new Date(y, mo-1, d).getDay()];
    dayNameEl.textContent = pickedDay;

    // Validate against physician's working days (if we loaded them)
    dayErrEl.style.display = "none";
    if (_physicianWorkDays.length && !_physicianWorkDays.includes(pickedDay)) {
        const availList = _physicianWorkDays.join(", ");
        dayErrEl.textContent = `This physician doesn't work on ${pickedDay}s. Available days: ${availList}.`;
        dayErrEl.style.display = "block";
        slotSelect.innerHTML = '<option value="">Not a working day</option>';
        return;
    }

    slotSelect.innerHTML = '<option value="">Loading…</option>';
    try {
        const r = await fetch(`/api/patient/appointments/slots?physician_id=${physician_id}&date=${date}&user_id=${user.id}`);
        const data = await r.json();
        if (!data.slots || !data.slots.length) {
            slotSelect.innerHTML = '<option value="">No available slots on this day</option>';
        } else {
            _bookingOfficeId = data.office_id;
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

function bookingStep3() {
    const date = document.getElementById("b_date").value;
    const slot = document.getElementById("b_slot").value;
    if (!date) { alert("Please select a date."); return; }
    if (!slot)  { alert("Please select a time slot."); return; }
    document.getElementById("bstep2").classList.add("hidden");
    document.getElementById("bstep3").classList.remove("hidden");
}

function bookingBack2() {
    document.getElementById("bstep3").classList.add("hidden");
    document.getElementById("bstep2").classList.remove("hidden");
}

async function submitBooking() {
    const physician_id     = document.getElementById("b_physician").value;
    const date             = document.getElementById("b_date").value;
    const time             = document.getElementById("b_slot").value;
    const appointment_type = document.getElementById("b_type").value;
    const reason           = document.getElementById("b_reason").value.trim();
    const errEl            = document.getElementById("bookingError");

    errEl.style.display = "none";
    try {
        const r = await fetch("/api/patient/appointments/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, physician_id, date, time, reason, appointment_type })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeBookingModal();
        loadDashboard();
    } catch(err) {
        errEl.textContent = err.message || "Could not book. Please try again.";
        errEl.style.display = "";
    }
}

async function cancelAppointment(appointment_id) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
        const r = await fetch(`/api/patient/appointments/${appointment_id}/cancel`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        loadDashboard();
    } catch(err) {
        alert(err.message || "Could not cancel appointment.");
    }
}
