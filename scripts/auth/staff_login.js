document.getElementById('btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const message  = document.getElementById('message');

    if (!username || !password) {
        message.textContent = 'Please enter your username and password.';
        return;
    }

    try {
        const res = await fetch('/api/staff/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            message.style.color = '#1f6d45';
            message.textContent = 'Login successful. Redirecting...';
            // Store role info for the dashboard
            localStorage.setItem('staffUser', JSON.stringify(data.user));
            setTimeout(() => {
                window.location.href = '/portals/staff_dashboard.html';
            }, 1000);
        } else {
            message.style.color = '#c0392b';
            message.textContent = data.message || 'Invalid username or password.';
        }
    } catch (err) {
        message.style.color = '#c0392b';
        message.textContent = 'Unable to connect to server. Please try again.';
    }
});
