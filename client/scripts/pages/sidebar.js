(function () {

    /* ── Inject sidebar HTML into every page ── */
    const sidebarHTML = `
    <div id="sidebar-overlay" class="sidebar-overlay"></div>
    <div id="login-sidebar" class="login-sidebar" role="dialog" aria-modal="true" aria-label="Login">

        <div class="sidebar-header">
            <h3>Audit Trail Health</h3>
            <button class="sidebar-close" id="sidebar-close-btn" aria-label="Close">&times;</button>
        </div>

        <div class="sidebar-tabs">
            <button class="sidebar-tab active" data-tab="patient">Patient Login</button>
            <button class="sidebar-tab" data-tab="staff">Staff / Physician</button>
        </div>

        <!-- ── Patient Panel ── -->
        <div class="sidebar-panel active" id="sidebar-patient-panel">
            <h2 class="sidebar-panel-title">Welcome Back</h2>
            <p class="sidebar-subtitle">Sign in to manage your appointments</p>
            <div class="sidebar-divider"></div>

            <div class="sidebar-form-group">
                <label for="p-email">Email</label>
                <input type="email" id="p-email" placeholder="your@email.com" autocomplete="email">
            </div>
            <div class="sidebar-form-group">
                <label for="p-password">Password</label>
                <input type="password" id="p-password" placeholder="Enter your password" autocomplete="current-password">
            </div>

            <button class="sidebar-btn sidebar-btn-patient" id="patient-login-btn">Sign In</button>
            <p class="sidebar-message" id="patient-msg"></p>

            <p class="sidebar-note">
                Don't have an account?
                <a href="/client/auth/register.html">Create one here</a>
            </p>
        </div>

        <!-- ── Staff Panel ── -->
        <div class="sidebar-panel" id="sidebar-staff-panel">
            <span class="sidebar-staff-badge">Staff Portal</span>
            <h2 class="sidebar-panel-title staff-title">Physician &amp; Staff Login</h2>
            <p class="sidebar-subtitle">Access your clinic dashboard</p>
            <div class="sidebar-divider"></div>

            <div class="sidebar-form-group">
                <label for="s-username">Username</label>
                <input type="text" id="s-username" placeholder="Enter your username" autocomplete="username">
            </div>
            <div class="sidebar-form-group">
                <label for="s-password">Password</label>
                <input type="password" id="s-password" placeholder="Enter your password" autocomplete="current-password">
            </div>

            <button class="sidebar-btn sidebar-btn-staff" id="staff-login-btn">Sign In</button>
            <p class="sidebar-message" id="staff-msg"></p>

            <p class="sidebar-note">
                No account? Contact your system administrator.
            </p>
        </div>

    </div>`;

    /* ── Mount on DOM ready ── */
    function init() {
        document.body.insertAdjacentHTML('beforeend', sidebarHTML);

        const overlay   = document.getElementById('sidebar-overlay');
        const sidebar   = document.getElementById('login-sidebar');
        const closeBtn  = document.getElementById('sidebar-close-btn');
        const tabs      = document.querySelectorAll('.sidebar-tab');
        const patPanel  = document.getElementById('sidebar-patient-panel');
        const stfPanel  = document.getElementById('sidebar-staff-panel');

        /* open / close helpers */
        window.openSidebar = function (tab) {
            tab = tab || 'patient';
            sidebar.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            switchTab(tab);
            // focus first input
            const first = sidebar.querySelector('.sidebar-panel.active input');
            if (first) setTimeout(() => first.focus(), 350);
        };

        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        function switchTab(tab) {
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
            patPanel.classList.toggle('active', tab === 'patient');
            stfPanel.classList.toggle('active', tab === 'staff');
            clearMessages();
        }

        function clearMessages() {
            ['patient-msg', 'staff-msg'].forEach(id => {
                const el = document.getElementById(id);
                el.textContent = '';
                el.className = 'sidebar-message';
            });
        }

        /* close on overlay click or close button */
        overlay.addEventListener('click', closeSidebar);
        closeBtn.addEventListener('click', closeSidebar);

        /* close on Escape key */
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
        });

        /* tab switching */
        tabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        /* ── Patient login submit ── */
        document.getElementById('patient-login-btn').addEventListener('click', async () => {
            const email    = document.getElementById('p-email').value.trim();
            const password = document.getElementById('p-password').value.trim();
            const msgEl    = document.getElementById('patient-msg');

            if (!email || !password) {
                msgEl.className = 'sidebar-message error';
                msgEl.textContent = 'Please fill in all fields.';
                return;
            }

            msgEl.className = 'sidebar-message';
            msgEl.textContent = 'Signing in…';

            try {
                const res  = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    msgEl.className = 'sidebar-message success';
                    msgEl.textContent = 'Login successful! Redirecting…';
                    localStorage.setItem('patientUser', JSON.stringify(data.user));
                    setTimeout(() => { window.location.href = '/client/portals/patient_dashboard.html'; }, 1000);
                } else {
                    msgEl.className = 'sidebar-message error';
                    msgEl.textContent = data.message || 'Invalid email or password.';
                }
            } catch {
                msgEl.className = 'sidebar-message error';
                msgEl.textContent = 'Cannot reach server. Please try again.';
            }
        });

        /* ── Staff login submit ── */
        document.getElementById('staff-login-btn').addEventListener('click', async () => {
            const username = document.getElementById('s-username').value.trim();
            const password = document.getElementById('s-password').value.trim();
            const msgEl    = document.getElementById('staff-msg');

            if (!username || !password) {
                msgEl.className = 'sidebar-message error';
                msgEl.textContent = 'Please fill in all fields.';
                return;
            }

            msgEl.className = 'sidebar-message';
            msgEl.textContent = 'Signing in…';

            try {
                const res  = await fetch('/api/staff/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (res.ok) {
                    msgEl.className = 'sidebar-message success';
                    msgEl.textContent = 'Login successful! Redirecting…';
                    localStorage.setItem('clinicUser', JSON.stringify(data.user));
                    const dest = data.user.role === 'physician'
                        ? '/client/portals/physician_dashboard.html'
                        : '/client/portals/staff_dashboard.html';
                    setTimeout(() => { window.location.href = dest; }, 1000);
                } else {
                    msgEl.className = 'sidebar-message error';
                    msgEl.textContent = data.message || 'Invalid username or password.';
                }
            } catch {
                msgEl.className = 'sidebar-message error';
                msgEl.textContent = 'Cannot reach server. Please try again.';
            }
        });

        /* allow Enter key to submit */
        document.getElementById('p-password').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('patient-login-btn').click();
        });
        document.getElementById('s-password').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('staff-login-btn').click();
        });

        /* ── Auto-intercept all login links ── */
        document.querySelectorAll('a[href*="patient_login"]').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); window.openSidebar('patient'); });
        });
        document.querySelectorAll('a[href*="staff_login"]').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); window.openSidebar('staff'); });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
