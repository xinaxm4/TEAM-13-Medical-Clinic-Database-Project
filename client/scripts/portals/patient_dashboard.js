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

/* ── Section nav ── */
function showSection(name) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const sec = document.getElementById("sec-" + name);
    if (sec) sec.classList.remove("hidden");

    const btn = document.querySelector(`.nav-item[onclick*="'${name}'"]`);
    if (btn) btn.classList.add("active");

    const labels = { overview:"Overview", appointments:"My Appointments", history:"Medical History", billing:"Billing", profile:"My Profile", settings:"Settings" };
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

        const { patient, appointments, history, billing, referrals } = data;

        /* ── Greeting & sidebar ── */
        const firstName = patient.first_name || "";
        const lastName  = patient.last_name  || "";
        document.getElementById("greetName").textContent = firstName;
        document.getElementById("greetSub").textContent = patient.doc_last
            ? `Primary Physician: Dr. ${patient.doc_last} · ${patient.specialty}`
            : "No primary physician assigned yet — choose your care team below";
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
            ${infoRow("Full Name", `${patient.first_name || "—"} ${patient.last_name || ""}`)}
            ${sensitiveRow("Date of Birth", fmt(patient.date_of_birth))}
            ${infoRow("Gender", patient.gender)}
            ${infoRow("Email", patient.email)}
            ${infoRow("Phone", patient.phone_number)}
            ${infoRow("Address", [patient.street_address, patient.city, patient.state, patient.zip_code].filter(Boolean).join(", ") || "—")}`;

        document.getElementById("emergencyInfo").innerHTML = `
            ${infoRow("Emergency Contact", patient.emergency_contact_name)}
            ${infoRow("Contact Phone", patient.emergency_contact_phone)}`;

        /* ── Edit button ── */
        const editWrap = document.getElementById("profileEditBtn");
        if (editWrap) {
            editWrap.innerHTML = `<button class="profile-edit-btn" onclick="openProfileModal()">Edit Personal Information</button>`;
        }

        /* ── Referrals ── */
        const refList = document.getElementById("referralsList");
        if (refList) {
            if (!referrals || referrals.length === 0) {
                refList.innerHTML = `<p class="table-empty">No referrals on record.</p>`;
            } else {
                const statusColor = { Pending:"#f59e0b", Accepted:"#10b981", Rejected:"#ef4444", Expired:"#9ca3af" };
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
                            <span>Referred by Dr. ${r.ref_first} ${r.ref_last} (${r.ref_specialty})</span>
                            <span>Issued ${fmt(r.date_issued)} &nbsp;·&nbsp; Expires ${fmt(r.expiration_date)}</span>
                        </div>
                    </div>`).join("");
            }
        }

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
            phSelect.innerHTML = '<option value="">Choose a physician…</option>' +
                physicians.map(p => `<option value="${p.physician_id}">Dr. ${p.first_name} ${p.last_name}${p.specialty ? " — " + p.specialty : ""}</option>`).join("");
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

    msg.className = "modal-save-msg";
    msg.textContent = "Saving…";

    try {
        const r = await fetch("/api/patient/care/assign", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, physician_id, insurance_id: insurance_id || null })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Failed to assign care team");
        msg.className = "modal-save-msg success";
        msg.textContent = "Care team set! Loading your dashboard…";
        setTimeout(() => {
            closeCareModal();
            loadDashboard();
        }, 1000);
    } catch(err) {
        msg.className = "modal-save-msg error";
        msg.textContent = err.message || "Something went wrong. Please try again.";
    }
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
