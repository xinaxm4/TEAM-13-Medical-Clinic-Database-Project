/* ─────────────────────────────────────────────
   Smart Search — homepage
   Data loaded from GET /api/locations/search
───────────────────────────────────────────── */

/* ── DOM refs ── */
var searchInput = document.getElementById('hero-search');
var resultsBox  = document.getElementById('search-results');

/* ── Search data (populated from API) ── */
var SEARCH_DATA = [];

var CATEGORY_LABELS = {
  location:  'Locations',
  doctor:    'Physicians',
  specialty: 'Specialties & Departments'
};

/* ── Load data from backend ── */
fetch('/api/locations/search')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var locations   = data.locations   || [];
    var physicians  = data.physicians  || [];
    var specialties = data.specialties || [];

    SEARCH_DATA = [];

    /* Locations */
    locations.forEach(function(l) {
      SEARCH_DATA.push({
        type: 'location',
        icon: '📍',
        name: l.city + ', ' + l.state,
        desc: l.departments || 'Multiple departments',
        url:  '/pages/locations/location_detail.html?city=' + encodeURIComponent(l.city)
      });
    });

    /* Physicians */
    physicians.forEach(function(p) {
      SEARCH_DATA.push({
        type: 'doctor',
        icon: '🩺',
        name: 'Dr. ' + p.first_name + ' ' + p.last_name,
        desc: (p.specialty || 'Physician') + ' \u2014 ' + p.city + ', ' + p.state,
        url:  '/pages/locations/location_detail.html?city=' + encodeURIComponent(p.city)
      });
    });

    /* Specialties */
    specialties.forEach(function(s) {
      SEARCH_DATA.push({
        type: 'specialty',
        icon: '🏥',
        name: s.specialty,
        desc: s.locations || '',
        url:  '/pages/locations/locations.html'
      });
    });
  })
  .catch(function(err) {
    console.error('Search data load error:', err);
  });

/* ── Filter + render ── */
function renderResults(query) {
  query = query.toLowerCase().trim();
  resultsBox.innerHTML = '';

  if (!query) {
    resultsBox.classList.remove('visible');
    return;
  }

  /* every word in the query must appear somewhere in name or desc */
  var words = query.split(/\s+/);
  var matches = SEARCH_DATA.filter(function(item) {
    var haystack = (item.name + ' ' + item.desc).toLowerCase();
    return words.every(function(w) { return haystack.includes(w); });
  });

  if (matches.length === 0) {
    resultsBox.innerHTML = '<p class="search-no-results">No results found \u2014 try a doctor name or specialty.</p>';
    resultsBox.classList.add('visible');
    return;
  }

  /* group by type */
  var grouped = {};
  matches.forEach(function(item) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item);
  });

  var order = ['location', 'doctor', 'specialty'];
  order.forEach(function(type) {
    if (!grouped[type]) return;

    var catEl = document.createElement('div');
    catEl.className   = 'search-category';
    catEl.textContent = CATEGORY_LABELS[type];
    resultsBox.appendChild(catEl);

    grouped[type].slice(0, 5).forEach(function(item) {
      var a = document.createElement('a');
      a.className = 'search-item';
      a.href      = item.url;
      a.innerHTML =
        '<span class="search-item-icon">' + item.icon + '</span>'
        + '<span class="search-item-text">'
        + '<strong>' + highlight(item.name, query) + '</strong>'
        + '<span>' + item.desc + '</span>'
        + '</span>';
      resultsBox.appendChild(a);
    });
  });

  resultsBox.classList.add('visible');
}

/* ── Highlight matched text ── */
function highlight(text, query) {
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp('(' + escaped + ')', 'gi'),
    '<mark style="background:#d0e8ff;border-radius:3px;padding:0 2px">$1</mark>'
  );
}

/* ── Event listeners ── */
searchInput.addEventListener('input', function() { renderResults(searchInput.value); });

searchInput.addEventListener('focus', function() {
  if (searchInput.value.trim()) renderResults(searchInput.value);
});

/* close when clicking outside */
document.addEventListener('click', function(e) {
  if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
    resultsBox.classList.remove('visible');
  }
});

/* keyboard navigation */
searchInput.addEventListener('keydown', function(e) {
  var items   = resultsBox.querySelectorAll('.search-item');
  var focused = resultsBox.querySelector('.search-item:focus');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!focused && items.length) { items[0].focus(); return; }
    var idx = Array.from(items).indexOf(focused);
    if (idx < items.length - 1) items[idx + 1].focus();
  }
  if (e.key === 'Escape') {
    resultsBox.classList.remove('visible');
    searchInput.blur();
  }
});
