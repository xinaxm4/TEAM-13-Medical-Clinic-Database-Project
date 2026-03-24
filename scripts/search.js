/* ── Search data: locations, doctors, specialties ── */
const SEARCH_DATA = [

    /* Locations */
    { type: 'location', icon: '📍', name: 'Dallas, TX',        desc: 'Orthopedics · Pediatrics · Internal Medicine', url: '/pages/locations/dallas.html' },
    { type: 'location', icon: '📍', name: 'Houston, TX',       desc: 'Cardiology · Endocrinology · Family Medicine',  url: '/pages/locations/houston.html' },
    { type: 'location', icon: '📍', name: 'Austin, TX',        desc: 'Neurology · Dermatology · Urgent Care',         url: '/pages/locations/austin.html' },
    { type: 'location', icon: '📍', name: 'San Antonio, TX',   desc: 'Orthopedics · Pulmonology · OB/GYN',           url: '/pages/locations/san_antonio.html' },
    { type: 'location', icon: '📍', name: 'Chicago, IL',       desc: 'Cardiology · Neurology · General Practice',    url: '/pages/locations/chicago.html' },
    { type: 'location', icon: '📍', name: 'Los Angeles, CA',   desc: 'Dermatology · Psychiatry · Oncology',          url: '/pages/locations/los_angeles.html' },
    { type: 'location', icon: '📍', name: 'New York, NY',      desc: 'Emergency Medicine · Surgery · OB/GYN',        url: '/pages/locations/new_york.html' },

    /* Doctors — Dallas */
    { type: 'doctor', icon: '🩺', name: 'Dr. Maria Garcia',    desc: 'Orthopedics — Dallas, TX',        url: '/pages/locations/dallas.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. William Turner',  desc: 'Pediatrics — Dallas, TX',         url: '/pages/locations/dallas.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Emily Johnson',   desc: 'Internal Medicine — Dallas, TX',  url: '/pages/locations/dallas.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Carlos Navarro',  desc: 'Orthopedics — Dallas, TX',        url: '/pages/locations/dallas.html' },

    /* Doctors — Houston */
    { type: 'doctor', icon: '🩺', name: 'Dr. Angela White',    desc: 'Cardiology — Houston, TX',        url: '/pages/locations/houston.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Samuel Nguyen',   desc: 'Endocrinology — Houston, TX',     url: '/pages/locations/houston.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Patricia Moore',  desc: 'Family Medicine — Houston, TX',   url: '/pages/locations/houston.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Kevin Park',      desc: 'Cardiology — Houston, TX',        url: '/pages/locations/houston.html' },

    /* Doctors — Austin */
    { type: 'doctor', icon: '🩺', name: 'Dr. Rachel Foster',   desc: 'Neurology — Austin, TX',          url: '/pages/locations/austin.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Jonathan Lee',    desc: 'Dermatology — Austin, TX',        url: '/pages/locations/austin.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Diana Cruz',      desc: 'Urgent Care — Austin, TX',        url: '/pages/locations/austin.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Marcus Hill',     desc: 'Neurology — Austin, TX',          url: '/pages/locations/austin.html' },

    /* Doctors — San Antonio */
    { type: 'doctor', icon: '🩺', name: 'Dr. Rosa Martinez',   desc: 'Orthopedics — San Antonio, TX',   url: '/pages/locations/san_antonio.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Brian Collins',   desc: 'Pulmonology — San Antonio, TX',   url: '/pages/locations/san_antonio.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Sandra Reyes',    desc: 'OB/GYN — San Antonio, TX',        url: '/pages/locations/san_antonio.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Derek Thompson',  desc: 'Orthopedics — San Antonio, TX',   url: '/pages/locations/san_antonio.html' },

    /* Doctors — Chicago */
    { type: 'doctor', icon: '🩺', name: 'Dr. James Mitchell',  desc: 'Cardiology — Chicago, IL',        url: '/pages/locations/chicago.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Sarah Chen',      desc: 'Neurology — Chicago, IL',         url: '/pages/locations/chicago.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Robert Davis',    desc: 'General Practice — Chicago, IL',  url: '/pages/locations/chicago.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Emily Park',      desc: 'General Practice — Chicago, IL',  url: '/pages/locations/chicago.html' },

    /* Doctors — LA */
    { type: 'doctor', icon: '🩺', name: 'Dr. David Kim',       desc: 'Oncology — Los Angeles, CA',      url: '/pages/locations/los_angeles.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Lisa Martinez',   desc: 'Dermatology — Los Angeles, CA',   url: '/pages/locations/los_angeles.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Michael Brown',   desc: 'Psychiatry — Los Angeles, CA',    url: '/pages/locations/los_angeles.html' },

    /* Doctors — New York */
    { type: 'doctor', icon: '🩺', name: 'Dr. Jennifer Lee',    desc: 'Emergency Medicine — New York, NY', url: '/pages/locations/new_york.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Thomas Wilson',   desc: 'Surgery — New York, NY',            url: '/pages/locations/new_york.html' },
    { type: 'doctor', icon: '🩺', name: 'Dr. Amanda Rodriguez', desc: 'OB/GYN — New York, NY',            url: '/pages/locations/new_york.html' },

    /* Specialties */
    { type: 'specialty', icon: '🏥', name: 'Cardiology',         desc: 'Chicago, IL · Houston, TX',          url: '/pages/locations/locations.html' },
    { type: 'specialty', icon: '🏥', name: 'Neurology',          desc: 'Chicago, IL · Austin, TX',           url: '/pages/locations/locations.html' },
    { type: 'specialty', icon: '🏥', name: 'Orthopedics',        desc: 'Dallas, TX · San Antonio, TX',       url: '/pages/locations/locations.html' },
    { type: 'specialty', icon: '🏥', name: 'Pediatrics',         desc: 'Dallas, TX',                         url: '/pages/locations/dallas.html' },
    { type: 'specialty', icon: '🏥', name: 'Internal Medicine',  desc: 'Dallas, TX',                         url: '/pages/locations/dallas.html' },
    { type: 'specialty', icon: '🏥', name: 'Endocrinology',      desc: 'Houston, TX',                        url: '/pages/locations/houston.html' },
    { type: 'specialty', icon: '🏥', name: 'Family Medicine',    desc: 'Houston, TX',                        url: '/pages/locations/houston.html' },
    { type: 'specialty', icon: '🏥', name: 'Dermatology',        desc: 'Austin, TX · Los Angeles, CA',       url: '/pages/locations/locations.html' },
    { type: 'specialty', icon: '🏥', name: 'Urgent Care',        desc: 'Austin, TX',                         url: '/pages/locations/austin.html' },
    { type: 'specialty', icon: '🏥', name: 'Pulmonology',        desc: 'San Antonio, TX',                    url: '/pages/locations/san_antonio.html' },
    { type: 'specialty', icon: '🏥', name: 'OB/GYN',             desc: 'San Antonio, TX · New York, NY',     url: '/pages/locations/locations.html' },
    { type: 'specialty', icon: '🏥', name: 'Oncology',           desc: 'Los Angeles, CA',                    url: '/pages/locations/los_angeles.html' },
    { type: 'specialty', icon: '🏥', name: 'Psychiatry',         desc: 'Los Angeles, CA',                    url: '/pages/locations/los_angeles.html' },
    { type: 'specialty', icon: '🏥', name: 'General Practice',   desc: 'Chicago, IL',                        url: '/pages/locations/chicago.html' },
    { type: 'specialty', icon: '🏥', name: 'Emergency Medicine', desc: 'New York, NY',                       url: '/pages/locations/new_york.html' },
    { type: 'specialty', icon: '🏥', name: 'Surgery',            desc: 'New York, NY',                       url: '/pages/locations/new_york.html' },
];

const CATEGORY_LABELS = {
    location: 'Locations',
    doctor:   'Physicians',
    specialty: 'Specialties & Departments'
};

/* ── DOM refs ── */
const searchInput   = document.getElementById('hero-search');
const resultsBox    = document.getElementById('search-results');

if (!searchInput || !resultsBox) return; // not on home page

/* ── Filter + render ── */
function renderResults(query) {
    query = query.toLowerCase().trim();
    resultsBox.innerHTML = '';

    if (!query) {
        resultsBox.classList.remove('visible');
        return;
    }

    /* fuzzy-ish: check if every word of the query appears somewhere in name+desc */
    const words = query.split(/\s+/);
    const matches = SEARCH_DATA.filter(item => {
        const haystack = (item.name + ' ' + item.desc).toLowerCase();
        return words.every(w => haystack.includes(w));
    });

    if (matches.length === 0) {
        resultsBox.innerHTML = '<p class="search-no-results">No results found — try a doctor name or specialty.</p>';
        resultsBox.classList.add('visible');
        return;
    }

    /* group by type */
    const grouped = {};
    matches.forEach(item => {
        if (!grouped[item.type]) grouped[item.type] = [];
        grouped[item.type].push(item);
    });

    const order = ['location', 'doctor', 'specialty'];
    order.forEach(type => {
        if (!grouped[type]) return;
        const catEl = document.createElement('div');
        catEl.className = 'search-category';
        catEl.textContent = CATEGORY_LABELS[type];
        resultsBox.appendChild(catEl);

        grouped[type].slice(0, 5).forEach(item => {
            const a = document.createElement('a');
            a.className = 'search-item';
            a.href = item.url;
            a.innerHTML = `
                <span class="search-item-icon">${item.icon}</span>
                <span class="search-item-text">
                    <strong>${highlight(item.name, query)}</strong>
                    <span>${item.desc}</span>
                </span>`;
            resultsBox.appendChild(a);
        });
    });

    resultsBox.classList.add('visible');
}

/* highlight matched text */
function highlight(text, query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:#d0e8ff;border-radius:3px;padding:0 2px">$1</mark>');
}

/* ── Event listeners ── */
searchInput.addEventListener('input', () => renderResults(searchInput.value));

searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) renderResults(searchInput.value);
});

/* close dropdown when clicking outside */
document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
        resultsBox.classList.remove('visible');
    }
});

/* keyboard nav */
searchInput.addEventListener('keydown', e => {
    const items = resultsBox.querySelectorAll('.search-item');
    const focused = resultsBox.querySelector('.search-item:focus');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!focused && items.length) { items[0].focus(); return; }
        const idx = Array.from(items).indexOf(focused);
        if (idx < items.length - 1) items[idx + 1].focus();
    }
    if (e.key === 'Escape') {
        resultsBox.classList.remove('visible');
        searchInput.blur();
    }
});
