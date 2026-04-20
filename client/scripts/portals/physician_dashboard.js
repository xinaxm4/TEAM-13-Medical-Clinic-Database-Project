/* ── Auth check ── */
const user = JSON.parse(localStorage.getItem("clinicUser") || "null");

/* ── Module-level caches ── */
let _dashPatients   = [];   // patients belonging to this physician (populated in loadDashboard)
let _allSpecialists = [];   // lazy-loaded for Create Referral modal

if (!user || user.role !== "physician") {
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
    const labels = { overview:"Dashboard", appointments:"Schedule", patients:"Patients", schedule:"Work Schedule", referrals:"Referrals", incoming:"Incoming Referrals", notes:"Clinic Notes", settings:"Settings", reports:"Reports" };
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

function fmt(d) {
    if (!d) return "—";
    const s = d.toString().split("T")[0];
    const [y, mo, dy] = s.split("-").map(Number);
    if (!y || !mo || !dy) return "—";
    return new Date(y, mo - 1, dy).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric" });
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
    const cls = { scheduled:"scheduled", completed:"completed", cancelled:"cancelled", pending:"pending", approved:"approved", rejected:"cancelled", expired:"cancelled", accepted:"completed" }[s] || "pending";
    return `<span class="pill pill-${cls}">${status}</span>`;
}

/* ── Member Schedule Builder (Hubstaff-style: people as rows) ── */
async function buildMemberCalendar(currentPhysicianId, ownSchedule, officeId) {
    const container = document.getElementById("memberSchedule");
    if (!container) return;

    let physicians = [];
    try {
        const url = officeId
            ? `/api/staff/all-schedules?office_id=${officeId}`
            : `/api/staff/all-schedules`;
        const r = await fetch(url);
        if (r.ok) {
            physicians = await r.json();
        }
    } catch (e) { /* endpoint not yet available — use fallback */ }

    // Fallback: build a single-row view from the current physician's own schedule
    if (!physicians || physicians.length === 0) {
        if (ownSchedule && ownSchedule.length > 0 && currentPhysicianId) {
            physicians = [{
                physician_id: currentPhysicianId,
                first_name: document.getElementById("greetName")?.textContent.replace("Dr. ","") || "You",
                last_name: "",
                specialty: document.getElementById("specialtyBadge")?.textContent || "Physician",
                schedule: ownSchedule
            }];
        } else {
            container.innerHTML = '<p class="loading-msg">No schedule on record</p>';
            return;
        }
    }

    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const dayShort = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };

    function timeFmt12(t) {
        if (!t) return '';
        const parts = t.toString().split(':');
        const h = parseInt(parts[0]);
        const m = parts[1] || '00';
        return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
    }

    let html = `<table class="ms-table">
      <thead>
        <tr>
          <th>Physician</th>
          ${days.map(d => `<th>${dayShort[d]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>`;

    physicians.forEach(ph => {
        const isMe = ph.physician_id === currentPhysicianId;
        const schedByDay = {};
        days.forEach(d => { schedByDay[d] = []; });
        (ph.schedule || []).forEach(s => {
            if (schedByDay[s.day_of_week]) schedByDay[s.day_of_week].push(s);
        });

        html += `<tr class="${isMe ? 'ms-me' : ''}">
          <td class="ms-name-cell">
            <div class="ms-name">Dr. ${ph.first_name} ${ph.last_name}${isMe ? ' ✦' : ''}</div>
            <div class="ms-spec">${ph.specialty || 'Physician'}</div>
          </td>`;

        days.forEach(day => {
            const shifts = schedByDay[day];
            if (shifts.length > 0) {
                const cellContent = shifts.map(s => {
                    const loc = s.city ? s.city + (s.state ? ', ' + s.state : '') : '';
                    return `<div class="ms-shift">
                        <span class="ms-shift-time">${timeFmt12(s.start_time)} – ${timeFmt12(s.end_time)}</span>
                        ${loc ? `<span class="ms-shift-loc">${loc}</span>` : ''}
                    </div>`;
                }).join('');
                html += `<td class="ms-day-cell">${cellContent}</td>`;
            } else {
                html += `<td class="ms-day-cell"><div class="ms-off">—</div></td>`;
            }
        });

        html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ── Personal Weekly Schedule View ── */
let _schedWeekOffset = 0;
let _ownSchedule     = [];   // physician's work_schedule rows, set in loadDashboard
let _ownAppointments = [];   // all appointments, set in loadDashboard

function shiftSchedWeek(dirOrReset) {
    if (dirOrReset === 0) _schedWeekOffset = 0;
    else _schedWeekOffset += dirOrReset;
    renderMyWeek();
}

function renderMyWeek() {
    const grid    = document.getElementById("myWeekGrid");
    const label   = document.getElementById("schedWeekLabel");
    if (!grid) return;

    // Build Monday of target week
    const today = new Date(); today.setHours(0,0,0,0);
    const dow   = today.getDay();
    const mondayDelta = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDelta + (_schedWeekOffset * 7));

    // Week label
    const wkEnd = new Date(monday); wkEnd.setDate(monday.getDate() + 6);
    const lo = { month:"short", day:"numeric" };
    if (label) label.textContent =
        `${monday.toLocaleDateString("en-US", lo)} – ${wkEnd.toLocaleDateString("en-US", lo)}, ${monday.getFullYear()}`;

    // Index own schedule by day name
    const schedByDay = {};
    (_ownSchedule || []).forEach(s => { schedByDay[s.day_of_week] = s; });

    // Index appointments by YYYY-MM-DD
    const apptsByDate = {};
    (_ownAppointments || []).forEach(a => {
        const ds = (a.appointment_date||'').toString().split('T')[0];
        if (!apptsByDate[ds]) apptsByDate[ds] = [];
        apptsByDate[ds].push(a);
    });

    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const dayShort = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    function fmtTime(t) {
        if (!t) return '';
        const parts = t.toString().split(':');
        const h = parseInt(parts[0]), m = parts[1] || '00';
        return `${h%12||12}:${m} ${h<12?'AM':'PM'}`;
    }

    grid.innerHTML = dayNames.map((dayName, i) => {
        const date = new Date(monday); date.setDate(monday.getDate() + i);
        const ds   = date.toISOString().split('T')[0];
        const isToday  = ds === today.toISOString().split('T')[0];
        const sched    = schedByDay[dayName];
        const dayAppts = apptsByDate[ds] || [];
        const working  = !!sched;

        const completedCount  = dayAppts.filter(a => a.status_name === 'Completed').length;
        const scheduledCount  = dayAppts.filter(a => a.status_name === 'Scheduled').length;
        const noShowCount     = dayAppts.filter(a => a.status_name === 'No-Show').length;

        const bg     = isToday  ? '#f0fdf4' : working ? '#fff'   : '#f9fafb';
        const border = isToday  ? '2px solid #3a9e6a'
                     : working  ? '1px solid #d1fae5'
                     :            '1px solid #e5e7eb';
        const dayColor = isToday ? '#1a4731' : working ? '#1f2a6d' : '#9ca3af';

        return `<div style="border:${border};border-radius:10px;padding:12px 10px;background:${bg};min-height:110px">
            <div style="font-size:11px;font-weight:700;color:${dayColor};text-transform:uppercase;letter-spacing:0.5px">${dayShort[i]}</div>
            <div style="font-size:20px;font-weight:800;color:${dayColor};line-height:1.1;margin:2px 0 6px">${date.getDate()}</div>
            ${working ? `
                <div style="font-size:11px;color:#3a9e6a;font-weight:600;margin-bottom:4px">${fmtTime(sched.start_time)}–${fmtTime(sched.end_time)}</div>
                <div style="font-size:10px;color:#6b7280">${sched.city || ''}</div>
                ${dayAppts.length ? `
                    <div style="margin-top:6px;display:flex;flex-direction:column;gap:2px">
                        ${scheduledCount  ? `<span style="font-size:10px;background:#dbeafe;color:#1e40af;border-radius:4px;padding:1px 5px">${scheduledCount} scheduled</span>` : ''}
                        ${completedCount  ? `<span style="font-size:10px;background:#d1fae5;color:#065f46;border-radius:4px;padding:1px 5px">${completedCount} completed</span>` : ''}
                        ${noShowCount     ? `<span style="font-size:10px;background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 5px">${noShowCount} no-show</span>`   : ''}
                    </div>` : `<div style="font-size:10px;color:#9ca3af;margin-top:6px">No appointments</div>`}
            ` : `<div style="font-size:11px;color:#d1d5db;margin-top:4px">Off</div>`}
        </div>`;
    }).join('');
}

function renderRecurringSchedule(schedule) {
    const el = document.getElementById('recurringSchedule');
    if (!el) return;
    if (!schedule || !schedule.length) {
        el.innerHTML = '<p class="loading-msg">No recurring schedule on record</p>';
        return;
    }

    function fmtTime(t) {
        if (!t) return '';
        const parts = t.toString().split(':');
        const h = parseInt(parts[0]), m = parts[1] || '00';
        return `${h%12||12}:${m} ${h<12?'AM':'PM'}`;
    }

    const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const sorted = [...schedule].sort((a,b) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week));

    el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px;padding:4px 0">` +
        sorted.map(s => `
            <div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #d1fae5;border-radius:8px;padding:10px 16px">
                <div style="font-weight:700;font-size:13px;color:#1a4731;min-width:90px">${s.day_of_week}</div>
                <div style="font-size:13px;color:#374151">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</div>
                <div style="font-size:12px;color:#6b7280;border-left:1px solid #d1fae5;padding-left:10px">${s.city || ''}${s.state ? ', '+s.state : ''}</div>
            </div>`
        ).join('') + `</div>`;
}

/* ── Clinical Note Modal ── */
let _notePatientId = null;

function openNoteModal(patient_id, patient_name) {
    _notePatientId = patient_id;
    document.getElementById("noteModalPatientName").textContent = "Patient: " + patient_name;
    document.getElementById("note_condition").value = "";
    document.getElementById("note_status").value = "Active";
    document.getElementById("note_notes").value = "";
    const msg = document.getElementById("noteSaveMsg");
    msg.style.display = "none"; msg.textContent = "";
    const modal = document.getElementById("noteModal");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeNoteModal() {
    document.getElementById("noteModal").style.display = "none";
    document.body.style.overflow = "";
    _notePatientId = null;
}

async function submitNote() {
    const msg = document.getElementById("noteSaveMsg");
    const condition = document.getElementById("note_condition").value.trim();
    const status    = document.getElementById("note_status").value;
    const notes     = document.getElementById("note_notes").value.trim();

    if (!condition) {
        msg.style.cssText = "display:block;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;background:#fee2e2;color:#991b1b";
        msg.textContent = "Please enter a condition or diagnosis.";
        return;
    }

    msg.style.cssText = "display:block;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;background:#f0f2f8;color:#555";
    msg.textContent = "Saving…";

    try {
        const r = await fetch("/api/staff/physician/note", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patient_id: _notePatientId, condition, status, notes, user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Failed to save note");
        msg.style.cssText = "display:block;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;background:#d1fae5;color:#065f46";
        msg.textContent = "Note saved! Patient's medical history has been updated.";
        setTimeout(closeNoteModal, 1500);
    } catch(err) {
        msg.style.cssText = "display:block;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;background:#fee2e2;color:#991b1b";
        msg.textContent = err.message || "Could not save note.";
    }
}

/* ── Referral Modal (context-aware: PCP issues, Specialist accepts) ── */
function openReferralModal(referral, context) {
    // context = "pcp" (primary issuing) or "specialist" (specialist accepting)
    const status = referral.referral_status_name;

    document.getElementById("refModalPatient").textContent = `${referral.patient_first} ${referral.patient_last}`;
    document.getElementById("refModalReason").textContent  = referral.referral_reason || "—";
    document.getElementById("refModalIssued").textContent  = fmt(referral.date_issued);
    document.getElementById("refModalExpires").textContent = fmt(referral.expiration_date);
    document.getElementById("refModalStatus").innerHTML    = pill(status);

    // Context-specific second row label + value
    const secondLabel = document.getElementById("refModalSecondLabel");
    const secondVal   = document.getElementById("refModalSecondVal");

    if (context === "pcp") {
        // PCP sees: who the patient wants to see
        if (secondLabel) secondLabel.textContent = "Specialist Requested";
        if (secondVal)   secondVal.textContent   = referral.spec_first
            ? `Dr. ${referral.spec_first} ${referral.spec_last} — ${referral.specialty || referral.spec_specialty || "—"}`
            : "—";
    } else {
        // Specialist sees: who referred this patient
        if (secondLabel) secondLabel.textContent = "Referred By";
        if (secondVal)   secondVal.textContent   = referral.primary_first
            ? `Dr. ${referral.primary_first} ${referral.primary_last}`
            : "—";
    }

    const acceptBtn  = document.getElementById("refModalAccept");
    const rejectBtn  = document.getElementById("refModalReject");
    const statusNote = document.getElementById("refModalNote");

    if (context === "pcp") {
        if (status === "Requested") {
            acceptBtn.style.display = "";
            rejectBtn.style.display = "";
            acceptBtn.textContent = "Issue to Specialist";
            acceptBtn.onclick = () => updateReferralStatus(referral.referral_id, "Issued", "pcp");
            rejectBtn.onclick = () => updateReferralStatus(referral.referral_id, "Rejected", "pcp");
            if (statusNote) statusNote.textContent = "Review the patient's request and forward it to the specialist, or decline it.";
        } else {
            acceptBtn.style.display = "none";
            rejectBtn.style.display = "none";
            if (statusNote) statusNote.textContent = `Status: ${status} — no action required.`;
        }
    } else {
        if (status === "Issued") {
            acceptBtn.style.display = "";
            rejectBtn.style.display = "";
            acceptBtn.textContent = "Accept Patient";
            acceptBtn.onclick = () => updateReferralStatus(referral.referral_id, "Accepted", "specialist");
            rejectBtn.onclick = () => updateReferralStatus(referral.referral_id, "Rejected", "specialist");
            if (statusNote) statusNote.textContent = "Review this referral and decide whether to accept this patient.";
        } else {
            acceptBtn.style.display = "none";
            rejectBtn.style.display = "none";
            if (statusNote) statusNote.textContent = `Status: ${status} — no action required.`;
        }
    }

    document.getElementById("referralModal").classList.remove("hidden");
}

function closeReferralModal() {
    document.getElementById("referralModal").classList.add("hidden");
}

async function updateReferralStatus(referral_id, status_name, context) {
    try {
        const res = await fetch(`/api/staff/referral/${referral_id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status_name, user_id: user.id })
        });
        const data = await res.json();
        if (res.ok) {
            closeReferralModal();
            if (context === "pcp") {
                loadDashboard(); // reload to refresh outgoing referrals table
            } else {
                loadIncomingReferrals(window._currentPhysicianId);
            }
        } else {
            alert("Failed to update status: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        alert("Network error updating referral status");
    }
}

async function loadSpecialistReferralHistory(physician_id) {
    const tbody = document.getElementById("referralsBody");
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Loading…</td></tr>`;
    try {
        const res = await fetch(`/api/staff/physician/referrals?physician_id=${physician_id}&user_id=${user.id}`);
        const referrals = await res.json();
        if (!referrals || referrals.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No referrals on record</td></tr>`;
            return;
        }
        tbody.innerHTML = referrals.map(r => `<tr>
            <td class="primary">${r.patient_first} ${r.patient_last}</td>
            <td>Dr. ${r.primary_first} ${r.primary_last}</td>
            <td>${r.referral_reason || "—"}</td>
            <td>${fmt(r.date_issued)}</td>
            <td>${fmt(r.expiration_date)}</td>
            <td>${pill(r.referral_status_name)}</td>
            <td>${r.referral_status_name === "Issued"
                ? `<button class="profile-edit-btn" style="font-size:11px;padding:4px 10px" onclick="openReferralModal(${JSON.stringify(r).replace(/"/g, '&quot;')}, 'specialist')">Review →</button>`
                : "—"}</td>
        </tr>`).join("");
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Error loading referrals</td></tr>`;
    }
}

async function loadIncomingReferrals(physician_id) {
    const container = document.getElementById("incomingReferralCards");
    if (!container) return;
    container.innerHTML = '<p class="loading-msg">Loading incoming referrals…</p>';
    try {
        const res = await fetch(`/api/staff/physician/referrals?physician_id=${physician_id}&user_id=${user.id}`);
        const referrals = await res.json();

        if (!referrals || referrals.length === 0) {
            container.innerHTML = '<p class="loading-msg">No incoming referrals</p>';
            return;
        }

        container.innerHTML = referrals.map(r => `
            <div class="referral-card" onclick="openReferralModal(${JSON.stringify(r).replace(/"/g, '&quot;')}, 'specialist')">
                <div class="referral-card-header">
                    <span class="referral-card-patient">${r.patient_first} ${r.patient_last}</span>
                    ${pill(r.referral_status_name)}
                </div>
                <div class="referral-card-meta">Referred by Dr. ${r.primary_first} ${r.primary_last}</div>
                <div class="referral-card-reason">${r.referral_reason || "—"}</div>
                <div class="referral-card-dates">Issued: ${fmt(r.date_issued)} &bull; Expires: ${fmt(r.expiration_date)}</div>
                ${r.referral_status_name === "Issued" ? `<div style="font-size:12px;color:#f59e0b;font-weight:600;margin-top:6px;padding:3px 8px;background:#fef9ec;border:1px solid #f59e0b44;border-radius:4px;display:inline-block">Awaiting your review</div>` : ""}
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="loading-msg">Error loading referrals</p>';
    }
}

/* ── Create Referral Modal ── */
async function openCreateReferralModal() {
    const modal = document.getElementById("createReferralModal");
    if (!modal) return;

    // Populate patient dropdown from cached list
    const patSel = document.getElementById("cr_patient");
    patSel.innerHTML = _dashPatients.length
        ? '<option value="">— Select patient —</option>' +
          _dashPatients.map(p => `<option value="${p.patient_id}">${p.first_name} ${p.last_name}</option>`).join("")
        : '<option value="">No patients on file</option>';

    // Lazy-load specialists
    const specSel = document.getElementById("cr_specialist");
    if (_allSpecialists.length === 0) {
        specSel.innerHTML = '<option value="">Loading…</option>';
        try {
            const r = await fetch(`/api/staff/specialists?user_id=${user.id}`);
            _allSpecialists = await r.json();
        } catch(e) { _allSpecialists = []; }
    }
    specSel.innerHTML = _allSpecialists.length
        ? '<option value="">— Select specialist —</option>' +
          _allSpecialists.map(s => `<option value="${s.physician_id}">Dr. ${s.first_name} ${s.last_name} — ${s.specialty} (${s.city})</option>`).join("")
        : '<option value="">No specialists found</option>';

    document.getElementById("cr_reason").value = "";
    document.getElementById("crError").style.display = "none";
    modal.classList.remove("hidden");
}

function closeCreateReferralModal() {
    document.getElementById("createReferralModal").classList.add("hidden");
}

async function submitCreateReferral() {
    const errEl   = document.getElementById("crError");
    const btn     = document.getElementById("crSubmitBtn");
    errEl.style.display = "none";

    const patient_id    = document.getElementById("cr_patient").value;
    const specialist_id = document.getElementById("cr_specialist").value;
    const referral_reason = document.getElementById("cr_reason").value.trim();

    if (!patient_id)    { errEl.textContent = "Please select a patient.";          errEl.style.display = "block"; return; }
    if (!specialist_id) { errEl.textContent = "Please select a specialist.";       errEl.style.display = "block"; return; }
    if (!referral_reason) { errEl.textContent = "Please enter a reason for the referral."; errEl.style.display = "block"; return; }

    btn.disabled = true;
    btn.textContent = "Issuing…";

    try {
        // Get physician_id from dashboard data (window._currentPhysicianId is set in loadDashboard)
        const physician_id = window._currentPhysicianId;
        const r = await fetch("/api/staff/referral/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ physician_id, patient_id, specialist_id, referral_reason, user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);

        closeCreateReferralModal();
        loadDashboard();   // refresh referrals table
    } catch(err) {
        errEl.textContent = err.message || "Could not issue referral.";
        errEl.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.textContent = "Issue Referral";
    }
}

/* ── Load data ── */
async function loadDashboard() {
    try {
        const res  = await fetch(`/api/staff/physician/dashboard?user_id=${user.id}`);
        const data = await res.json();

        if (!res.ok) {
            document.getElementById("greetSub").textContent = data.message || "Could not load data.";
            return;
        }

        const { physician, appointments, patients, schedule, referrals } = data;
        _dashPatients = patients || [];   // cache for Create Referral modal
        const isSpecialist = physician && physician.physician_type === 'specialist';

        /* Greeting */
        const docName = physician ? `Dr. ${physician.last_name}` : "Doctor";
        document.getElementById("greetName").textContent     = docName;
        document.getElementById("greetSub").textContent      = `${physician?.department_name || "Department"} · Hire date: ${fmt(physician?.hire_date)}`;
        document.getElementById("sidebarName").textContent   = docName;
        document.getElementById("sidebarSpec").textContent   = physician?.specialty || "Physician";
        document.getElementById("specialtyBadge").textContent = physician?.specialty || "Physician";
        document.getElementById("avatarInitials").textContent = physician ? physician.first_name[0] + physician.last_name[0] : "Dr";

        /* Store physician_id globally for referral reload */
        window._currentPhysicianId = physician ? physician.physician_id : null;

        /* Stats */
        const uniqueOffices = new Set((schedule || []).map(s => s.city)).size;
        document.getElementById("statAppts").textContent    = appointments.length;
        document.getElementById("statPatients").textContent = patients.length;
        document.getElementById("statOffices").textContent  = uniqueOffices;
        document.getElementById("statReferrals").textContent = referrals.length;

        /* Overview: today's schedule (upcoming) */
        const n = new Date();
        const today = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
        const todayAppts = appointments.filter(a => a.appointment_date && a.appointment_date.slice(0, 10) === today).slice(0, 8);
        const oBody = document.getElementById("overviewApptBody");
        oBody.innerHTML = todayAppts.length
            ? todayAppts.map(a => `<tr>
                <td class="primary">${timeFmt(a.appointment_time)}</td>
                <td>${a.patient_first} ${a.patient_last}</td>
                <td>${a.reason_for_visit || "—"}</td>
                <td>${pill(a.status_name)}</td>
            </tr>`).join("")
            : `<tr><td colspan="4" class="table-empty">No upcoming appointments</td></tr>`;

        /* Overview: referrals — primary shows outgoing, specialist shows incoming */
        const rBody = document.getElementById("overviewRefBody");
        if (isSpecialist) {
            rBody.innerHTML = `<tr><td colspan="3" class="table-empty" style="font-size:12px;color:#888">See Referrals tab for full history</td></tr>`;
        } else {
            rBody.innerHTML = referrals.slice(0, 5).length
                ? referrals.slice(0, 5).map(r => `<tr>
                    <td class="primary">${r.patient_first} ${r.patient_last}</td>
                    <td>Dr. ${r.spec_last}</td>
                    <td>${pill(r.referral_status_name)}</td>
                </tr>`).join("")
                : `<tr><td colspan="3" class="table-empty">No referrals on record</td></tr>`;
        }

        /* Appointments — split into upcoming and past */
        const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);

        const upcomingAppts = appointments.filter(a => {
            const ds = (a.appointment_date||'').toString().split('T')[0];
            const [y,mo,dy] = ds.split('-').map(Number);
            return a.status_name === 'Scheduled' && new Date(y, mo-1, dy) >= todayMidnight;
        }).sort((a,b) => a.appointment_date < b.appointment_date ? -1 : 1);

        const pastAppts = appointments.filter(a => {
            const ds = (a.appointment_date||'').toString().split('T')[0];
            const [y,mo,dy] = ds.split('-').map(Number);
            return a.status_name !== 'Scheduled' || new Date(y, mo-1, dy) < todayMidnight;
        }).sort((a,b) => a.appointment_date > b.appointment_date ? -1 : 1);

        // Upcoming table — Update button only, no notes (appointment hasn't happened yet)
        document.getElementById("apptUpcomingBody").innerHTML = upcomingAppts.length
            ? upcomingAppts.map(a => {
                const ds = (a.appointment_date||'').toString().split('T')[0];
                return `<tr>
                    <td class="primary">${fmt(a.appointment_date)}</td>
                    <td>${timeFmt(a.appointment_time)}</td>
                    <td>${a.patient_first} ${a.patient_last}</td>
                    <td>${a.city || "—"}</td>
                    <td>${a.appointment_type || "General"}</td>
                    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.reason_for_visit || "—"}</td>
                    <td>${pill(a.status_name)}</td>
                    <td><button onclick="openStatusModal(${a.appointment_id}, '${a.patient_first} ${a.patient_last}', '${ds}')"
                        style="padding:4px 10px;font-size:11px;background:none;border:1px solid #1f6d45;color:#1f6d45;border-radius:6px;cursor:pointer;font-family:inherit">Update</button></td>
                </tr>`;
            }).join("")
            : `<tr><td colspan="8" class="table-empty">No upcoming appointments</td></tr>`;

        // Past table — Note button only on Completed; Undo on No-Show/Cancelled
        document.getElementById("apptPastBody").innerHTML = pastAppts.length
            ? pastAppts.map(a => {
                const ds = (a.appointment_date||'').toString().split('T')[0];
                const noteBtn = a.status_name === 'Completed'
                    ? `<button onclick='openNoteModal(${a.patient_id},"${a.patient_first} ${a.patient_last}")'
                        style="padding:5px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:11px;font-weight:700;color:#15803d;cursor:pointer;font-family:inherit">+ Note</button>`
                    : '<span style="font-size:11px;color:#9ca3af">—</span>';
                const actionBtn = (a.status_name === 'No-Show' || a.status_name === 'Cancelled')
                    ? `<button onclick="openUndoModal(${a.appointment_id}, '${a.patient_first} ${a.patient_last}', '${ds}', '${a.status_name}')"
                        style="padding:4px 10px;font-size:11px;background:none;border:1px solid #f59e0b;color:#b45309;border-radius:6px;cursor:pointer;font-family:inherit">Undo</button>`
                    : '—';
                return `<tr>
                    <td class="primary">${fmt(a.appointment_date)}</td>
                    <td>${timeFmt(a.appointment_time)}</td>
                    <td>${a.patient_first} ${a.patient_last}</td>
                    <td>${a.city || "—"}</td>
                    <td>${a.appointment_type || "General"}</td>
                    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.reason_for_visit || "—"}</td>
                    <td>${pill(a.status_name)}</td>
                    <td>${noteBtn}</td>
                    <td>${actionBtn}</td>
                </tr>`;
            }).join("")
            : `<tr><td colspan="9" class="table-empty">No past appointments</td></tr>`;

        /* Store appointments globally for calendar + schedule views */
        _allAppointments = appointments;
        _ownAppointments = appointments;
        if (document.getElementById("apptCalendarContainer") &&
            document.getElementById("apptCalendarContainer").style.display !== "none") {
            renderWeekCalendar();
        }

        /* Patients table */
        document.getElementById("patientsBody").innerHTML = patients.length
            ? patients.map(p => `<tr>
                <td class="primary">${p.first_name} ${p.last_name}</td>
                <td>${fmt(p.date_of_birth)}</td>
                <td style="text-transform:capitalize">${p.gender || "—"}</td>
                <td>${p.phone_number || "—"}</td>
                <td>${p.email || "—"}</td>
                <td>${p.provider_name || "—"}</td>
            </tr>`).join("")
            : `<tr><td colspan="6" class="table-empty">No patients found</td></tr>`;

        /* Work schedule — personal weekly view + recurring + team roster */
        _ownSchedule     = schedule || [];
        _ownAppointments = appointments || [];
        renderMyWeek();
        renderRecurringSchedule(schedule);
        const officeId = schedule && schedule.length > 0 ? schedule[0].office_id : null;
        buildMemberCalendar(physician ? physician.physician_id : null, schedule, officeId);

        /* Referrals — behaviour differs by physician type */
        if (isSpecialist) {
            /* Specialist: hide Create Referral, retitle section, swap table headers */
            const createBtn = document.getElementById("createReferralBtn");
            if (createBtn) createBtn.style.display = "none";

            const title = document.getElementById("referralsSectionTitle");
            const sub   = document.getElementById("referralsSectionSubtitle");
            if (title) title.textContent = "Referral History";
            if (sub)   sub.textContent   = "All referrals directed to you as a specialist";

            const thead = document.getElementById("referralsTableHead");
            if (thead) thead.innerHTML = `<tr><th>Patient</th><th>Referred By</th><th>Reason</th><th>Issued</th><th>Expires</th><th>Status</th><th>Action</th></tr>`;

            loadSpecialistReferralHistory(physician.physician_id);
        } else {
            /* Primary physician: outgoing referrals table */
            document.getElementById("referralsBody").innerHTML = referrals.length
                ? referrals.map(r => `<tr>
                    <td class="primary">${r.patient_first} ${r.patient_last}</td>
                    <td>Dr. ${r.spec_first} ${r.spec_last}</td>
                    <td>${r.specialty || "—"}</td>
                    <td>${r.referral_reason || "—"}</td>
                    <td>${fmt(r.date_issued)}</td>
                    <td>${fmt(r.expiration_date)}</td>
                    <td>${pill(r.referral_status_name)}</td>
                    <td>—</td>
                </tr>`).join("")
                : `<tr><td colspan="8" class="table-empty">No referrals on record</td></tr>`;
        }

        /* Load incoming referrals (where this physician is the specialist) */
        if (physician) {
            loadIncomingReferrals(physician.physician_id);
        }

    } catch (err) {
        console.error("Physician dashboard error:", err);
        document.getElementById("greetSub").textContent = "Could not connect to server.";
    }
}

loadDashboard();

/* ── Update Appointment Status ── */
let _statusAppointmentId = null;
let _allAppointments = [];
let _calWeekOffset = 0; // 0 = current week, 1 = next week, -1 = last week

function openStatusModal(appointment_id, patientName, date) {
    _statusAppointmentId = appointment_id;
    document.getElementById("statusModalInfo").textContent = `Patient: ${patientName} | Date: ${date}`;
    document.getElementById("statusModalError").style.display = "none";
    document.getElementById("statusModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeStatusModal() {
    document.getElementById("statusModal").classList.add("hidden");
    document.body.style.overflow = "";
}

async function submitStatusUpdate() {
    const status_id = document.getElementById("statusSelect").value;
    const errEl = document.getElementById("statusModalError");
    errEl.style.display = "none";
    try {
        const r = await fetch(`/api/staff/appointment/${_statusAppointmentId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status_id: parseInt(status_id), user_id: user.id })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeStatusModal();
        loadDashboard();
    } catch(err) {
        errEl.textContent = err.message || "Could not update status.";
        errEl.style.display = "";
    }
}

/* ── Physician Activity Report ── */
async function loadActivityReport() {
    const physician_id = user.physicianId || user.id;
    document.getElementById("reportBody").innerHTML = `<tr><td colspan="6" class="table-empty">Loading…</td></tr>`;
    try {
        const r = await fetch(`/api/reports/physician-activity?physician_id=${physician_id}&user_id=${user.id}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        const { stats, appointments } = data;

        document.getElementById("rpt_total").textContent    = stats.total_appointments || 0;
        document.getElementById("rpt_rate").textContent     = (stats.completion_rate_pct || 0) + "%";
        document.getElementById("rpt_revenue").textContent  = "$" + parseFloat(stats.total_revenue_billed || 0).toFixed(0);
        document.getElementById("rpt_patients").textContent = stats.unique_patients_seen || 0;

        const fmt = d => d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
        const pill = s => {
            const colors = { Completed:"#10b981", "No-Show":"#f59e0b", Cancelled:"#9ca3af", Scheduled:"#6ea8fe" };
            const c = colors[s] || "#9ca3af";
            return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">${s}</span>`;
        };

        document.getElementById("reportBody").innerHTML = appointments.length
            ? appointments.map(a => `<tr>
                <td class="primary">${fmt(a.appointment_date)}</td>
                <td>${a.patient_name}</td>
                <td>${a.appointment_type || "—"}</td>
                <td>${pill(a.status_name)}</td>
                <td>$${parseFloat(a.billed||0).toFixed(2)}</td>
                <td>$${parseFloat(a.owed||0).toFixed(2)}</td>
            </tr>`).join("")
            : `<tr><td colspan="6" class="table-empty">No appointments in the last 90 days</td></tr>`;
    } catch(err) {
        document.getElementById("reportBody").innerHTML = `<tr><td colspan="6" class="table-empty">Could not load report</td></tr>`;
    }
}

/* ── Undo Appointment Status (No-Show / Cancelled → Scheduled) ── */
let _undoAppointmentId = null;

function openUndoModal(appointment_id, patientName, date, currentStatus) {
    _undoAppointmentId = appointment_id;

    // Fill in context
    document.getElementById("undoModalInfo").innerHTML =
        `<strong>Patient:</strong> ${patientName}<br>
         <strong>Date:</strong> ${fmt(date)}<br>
         <strong>Current status:</strong> <span style="font-weight:700;color:${currentStatus === 'No-Show' ? '#b45309' : '#6b7280'}">${currentStatus}</span>`;

    // Adjust copy based on status
    const noteEl = document.getElementById("undoModalNote");
    if (currentStatus === "No-Show") {
        noteEl.textContent = "In most clinical systems, reversing a No-Show requires a brief justification (e.g. patient called in late, entry error). This action will be recorded in the appointment history.";
    } else {
        noteEl.textContent = "Restoring a Cancelled appointment sets it back to Scheduled. The patient will need to be notified separately. This action will be recorded.";
    }

    document.getElementById("undoReason").value = "";
    document.getElementById("undoModalError").style.display = "none";
    document.getElementById("undoModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeUndoModal() {
    document.getElementById("undoModal").classList.add("hidden");
    document.body.style.overflow = "";
    _undoAppointmentId = null;
}

async function confirmUndoStatus() {
    const reason = document.getElementById("undoReason").value.trim();
    const errEl  = document.getElementById("undoModalError");
    errEl.style.display = "none";

    if (!reason) {
        errEl.textContent = "Please enter a reason before restoring the appointment.";
        errEl.style.display = "block";
        return;
    }

    try {
        const r = await fetch(`/api/staff/appointment/${_undoAppointmentId}/undo-status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, reason })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        closeUndoModal();
        loadDashboard();
    } catch(err) {
        errEl.textContent = err.message || "Could not restore appointment. Please try again.";
        errEl.style.display = "block";
    }
}

/* ── Appointment Calendar View ── */
function setApptView(view) {
    const listBtn      = document.getElementById("apptViewList");
    const calBtn       = document.getElementById("apptViewCal");
    const calContainer = document.getElementById("apptCalendarContainer");
    const listContainer = document.getElementById("apptListContainer");

    if (view === "calendar") {
        if (listBtn)  { listBtn.style.background="#fff";     listBtn.style.color="#3a9e6a"; }
        if (calBtn)   { calBtn.style.background="#3a9e6a";   calBtn.style.color="#fff"; }
        if (calContainer)  calContainer.style.display = "block";
        if (listContainer) listContainer.style.display = "none";
        renderWeekCalendar();
    } else {
        if (listBtn)  { listBtn.style.background="#3a9e6a";  listBtn.style.color="#fff"; }
        if (calBtn)   { calBtn.style.background="#fff";      calBtn.style.color="#3a9e6a"; }
        if (calContainer)  calContainer.style.display = "none";
        if (listContainer) listContainer.style.display = "";
    }
}

function shiftCalWeek(dir) {
    _calWeekOffset += dir;
    renderWeekCalendar();
}

function renderWeekCalendar() {
    const cal = document.getElementById("apptCalendar");
    if (!cal) return;

    // Compute the Monday of the target week
    const today = new Date(); today.setHours(0,0,0,0);
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (_calWeekOffset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        days.push(d);
    }

    // Update week label
    const opts = { month:"short", day:"numeric" };
    const labelEl = document.getElementById("calWeekLabel");
    if (labelEl) {
        labelEl.textContent = `Week of ${days[0].toLocaleDateString("en-US", opts)} – ${days[6].toLocaleDateString("en-US", opts)}, ${days[0].getFullYear()}`;
    }

    // Index appointments by date string YYYY-MM-DD
    const apptsByDate = {};
    (_allAppointments || []).forEach(a => {
        const ds = (a.appointment_date || "").toString().split("T")[0];
        if (!apptsByDate[ds]) apptsByDate[ds] = [];
        apptsByDate[ds].push(a);
    });

    const statusColors = {
        Scheduled: { bg:"#dbeafe", border:"#3b82f6", text:"#1e40af" },
        Completed:  { bg:"#d1fae5", border:"#10b981", text:"#065f46" },
        "No-Show":  { bg:"#fef3c7", border:"#f59e0b", text:"#92400e" },
        Cancelled:  { bg:"#f3f4f6", border:"#9ca3af", text:"#374151" }
    };

    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const todayStr = today.toISOString().split("T")[0];

    let html = `<table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <thead>
        <tr>`;
    days.forEach((d, i) => {
        const ds = d.toISOString().split("T")[0];
        const isToday = ds === todayStr;
        const count = (apptsByDate[ds] || []).length;
        html += `<th style="padding:8px 6px;font-size:11px;font-weight:700;text-align:center;border:1px solid #e5e7eb;
            background:${isToday ? "#f0fdf4" : "#f9fafb"};
            color:${isToday ? "#1a4731" : "#4b5563"};
            border-bottom:${isToday ? "2px solid #3a9e6a" : "1px solid #e5e7eb"}">
            <div>${dayNames[i]}</div>
            <div style="font-size:14px;font-weight:${isToday?"800":"600"};color:${isToday?"#1a4731":"#111"}">${d.getDate()}</div>
            <div style="font-size:10px;color:#9ca3af">${d.toLocaleDateString("en-US",{month:"short"})}</div>
            ${count ? `<div style="margin-top:3px;font-size:10px;background:#3a9e6a;color:#fff;border-radius:10px;padding:1px 5px;display:inline-block">${count} appt${count>1?"s":""}</div>` : ""}
        </th>`;
    });
    html += `</tr></thead><tbody><tr>`;

    days.forEach(d => {
        const ds = d.toISOString().split("T")[0];
        const isToday = ds === todayStr;
        const dayAppts = (apptsByDate[ds] || []).sort((a,b) => (a.appointment_time||"") < (b.appointment_time||"") ? -1 : 1);
        html += `<td style="vertical-align:top;padding:6px;border:1px solid #e5e7eb;background:${isToday?"#f7fff7":"#fff"};min-height:80px">`;
        if (dayAppts.length === 0) {
            html += `<div style="color:#d1d5db;font-size:11px;text-align:center;padding-top:8px">—</div>`;
        } else {
            dayAppts.forEach(a => {
                const sc = statusColors[a.status_name] || statusColors["Scheduled"];
                const timeStr = timeFmt(a.appointment_time);
                html += `<div style="margin-bottom:5px;padding:5px 7px;border-radius:5px;border-left:3px solid ${sc.border};
                    background:${sc.bg};cursor:pointer;font-size:11px"
                    onclick="openStatusModal(${a.appointment_id},'${a.patient_first} ${a.patient_last}','${ds}')">
                    <div style="font-weight:700;color:${sc.text}">${timeStr}</div>
                    <div style="color:#374151;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.patient_first} ${a.patient_last}</div>
                    <div style="color:#6b7280;font-size:10px">${a.reason_for_visit || a.appointment_type || "—"}</div>
                </div>`;
            });
        }
        html += `</td>`;
    });

    html += `</tr></tbody></table>`;
    cal.innerHTML = html;
}
