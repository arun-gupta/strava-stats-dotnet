import { getState, setUser, setAllActivities, setDateRange, setActiveTab, initializeUnitSystem, subscribe } from './js/state.js';

const authArea = document.getElementById('authArea');
const recentLoading = document.getElementById('recentLoading');
const recentTable = document.getElementById('recentTable');
const recentTbody = recentTable.querySelector('tbody');
const recentEmpty = document.getElementById('recentEmpty');

const totalsLoading = document.getElementById('totalsLoading');
const totals = document.getElementById('totals');
const totalsEmpty = document.getElementById('totalsEmpty');
const totalsTitle = document.getElementById('totalsTitle');
const totCount = document.getElementById('totCount');
const totDistance = document.getElementById('totDistance');
const totTime = document.getElementById('totTime');
const avgPer = document.getElementById('avgPer');

const dateRangeBtns = document.querySelectorAll('.date-range-btn');
const customDateInputs = document.getElementById('customDateInputs');
const customStart = document.getElementById('customStart');
const customEnd = document.getElementById('customEnd');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Chart instances
let activityCountChart = null;
let timeDistChart = null;

// Simple helpers
const fmtDate = (iso) => new Date(iso).toLocaleDateString();
const fmtTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
};
const metersToKm = (m) => (m / 1000);
const metersToMiles = (m) => (m / 1609.344);

function setAuthUI(isSignedIn, name) {
  if (isSignedIn) {
    authArea.innerHTML = `
      <li class="muted">Signed in${name ? ` as ${name}` : ''}</li>
      <li><a role="button" class="secondary" href="/auth/logout">Logout</a></li>
    `;
  } else {
    authArea.innerHTML = `
      <li class="muted">You are not signed in</li>
      <li><a role="button" href="/auth/login">Sign in</a></li>
    `;
  }
}

async function fetchJson(url) {
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error(`${resp.status}`);
  return await resp.json();
}

async function loadAuth() {
  try {
    const me = await fetch('/me');
    if (me.status === 401) {
      setAuthUI(false);
      setUser(null);
      return false;
    }
    if (!me.ok) throw new Error('me_failed');
    const data = await me.json();
    const name = [data.firstname, data.lastname].filter(Boolean).join(' ') || data.username || '';
    setUser(data);
    setAuthUI(true, name);
    return true;
  } catch (_) {
    setAuthUI(false);
    setUser(null);
    return false;
  }
}

function renderRecent(list) {
  recentLoading.classList.add('hidden');
  if (!list || list.length === 0) {
    recentEmpty.classList.remove('hidden');
    recentTable.classList.add('hidden');
    return;
  }

  recentEmpty.classList.add('hidden');
  recentTable.classList.remove('hidden');
  recentTbody.innerHTML = '';

  const { unitSystem } = getState();
  const useMiles = unitSystem === 'imperial';
  const distLabel = useMiles ? 'mi' : 'km';

  for (const a of list) {
    const tr = document.createElement('tr');
    const date = new Date(a.start_local).toLocaleString([], { dateStyle: 'medium' });

    const dist = useMiles ? metersToMiles(a.distance_m) : metersToKm(a.distance_m);
    const distStr = `${dist.toFixed(2)} ${distLabel}`;

    tr.innerHTML = `
      <td>${date}</td>
      <td>${a.name ?? ''}</td>
      <td><span class="chip">${a.sport_type ?? ''}</span></td>
      <td class="right distance">${distStr}</td>
      <td class="right">${fmtTime(a.moving_time_s)}</td>
    `;
    recentTbody.appendChild(tr);
  }
}

function renderTotals(list) {
  totalsLoading.classList.add('hidden');
  if (!list || list.length === 0) {
    // Update empty message based on current date range
    const { dateRange } = getState();
    const emptyMessages = {
      last7: 'No activities in the last 7 days.',
      last30: 'No activities in the last 30 days.',
      last90: 'No activities in the last 90 days.',
      last6months: 'No activities in the last 6 months.',
      ytd: 'No activities this year.',
      all: 'No activities found.',
      custom: 'No activities in the selected date range.'
    };
    totalsEmpty.textContent = emptyMessages[dateRange.type] || 'No activities found.';
    totalsEmpty.classList.remove('hidden');
    totals.classList.add('hidden');
    return;
  }

  totalsEmpty.classList.add('hidden');

  const { unitSystem } = getState();
  const useMiles = unitSystem === 'imperial';
  const distLabel = useMiles ? 'mi' : 'km';

  const count = list.length;
  const totalMeters = list.reduce((s, a) => s + (a.distance_m || 0), 0);
  const totalTime = list.reduce((s, a) => s + (a.moving_time_s || 0), 0);
  const totalDist = useMiles ? metersToMiles(totalMeters) : metersToKm(totalMeters);
  const avgDist = totalDist / count;
  totCount.textContent = String(count);
  totDistance.textContent = `${totalDist.toFixed(1)} ${distLabel}`;
  totTime.textContent = fmtTime(totalTime);
  avgPer.textContent = `${avgDist.toFixed(2)} ${distLabel}`;
  totals.classList.remove('hidden');
}

async function loadData() {
  // Initialize unit system from browser locale
  initializeUnitSystem();

  const signedIn = await loadAuth();
  if (!signedIn) {
    // Hide loaders and prompt sign-in in empty states
    recentLoading.classList.add('hidden');
    totalsLoading.classList.add('hidden');
    recentEmpty.textContent = 'Please sign in to see your recent activities.';
    totalsEmpty.textContent = 'Please sign in to see totals.';
    recentEmpty.classList.remove('hidden');
    totalsEmpty.classList.remove('hidden');
    return;
  }

  try {
    // Load all activities (up to 500)
    const all = await fetchJson('/activities/all/normalized?per_page=100&max_pages=5');
    console.log('Loaded activities:', all.length);

    setAllActivities(all);

    // Get filtered activities from state (currently defaults to last 30 days)
    const { filteredActivities } = getState();
    console.log('Filtered activities:', filteredActivities.length);

    // Render recent (first 20 from filtered)
    renderRecent(filteredActivities.slice(0, 20));

    // Render totals (all filtered)
    renderTotals(filteredActivities);

    // Update title
    updateTotalsTitle();
  } catch (e) {
    console.error('Failed to load activities:', e);
    recentLoading.classList.add('hidden');
    totalsLoading.classList.add('hidden');
    recentEmpty.textContent = 'Failed to load activities.';
    totalsEmpty.textContent = 'Failed to load totals.';
    recentEmpty.classList.remove('hidden');
    totalsEmpty.classList.remove('hidden');
  }
}

// Update totals title based on date range
function updateTotalsTitle() {
  const { dateRange } = getState();
  const titles = {
    last7: 'Last 7 Days',
    last30: 'Last 30 Days',
    last90: 'Last 90 Days',
    last6months: 'Last 6 Months',
    ytd: 'Year to Date',
    all: 'All Time',
    custom: 'Custom Range'
  };

  let title = titles[dateRange.type] || 'Activities';

  // Add date range for time-based filters
  const now = new Date();
  let startDate, endDate = now;

  if (dateRange.type === 'last7') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (dateRange.type === 'last30') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (dateRange.type === 'last90') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (dateRange.type === 'last6months') {
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
  } else if (dateRange.type === 'ytd') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (dateRange.type === 'custom' && dateRange.customStart) {
    startDate = new Date(dateRange.customStart);
    if (dateRange.customEnd) {
      endDate = new Date(dateRange.customEnd);
    }
  }

  if (startDate) {
    const formatDate = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    title += ` (${formatDate(startDate)} - ${formatDate(endDate)})`;
  }

  totalsTitle.textContent = title;
}

// Update active button state
function updateActiveButton(activeRange) {
  dateRangeBtns.forEach(btn => {
    if (btn.dataset.range === activeRange) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Date range button handlers
dateRangeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const range = btn.dataset.range;

    if (range === 'custom') {
      customDateInputs.classList.remove('hidden');
      updateActiveButton(range);

      // Set default dates: last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      customEnd.value = today.toISOString().split('T')[0];
      customStart.value = thirtyDaysAgo.toISOString().split('T')[0];

      setDateRange('custom', customStart.value, customEnd.value);
      updateTotalsTitle();
    } else {
      customDateInputs.classList.add('hidden');
      setDateRange(range);
      updateActiveButton(range);
      updateTotalsTitle();
    }
  });
});

customStart.addEventListener('change', () => {
  if (customStart.value) {
    setDateRange('custom', customStart.value, customEnd.value || null);
    updateTotalsTitle();
  }
});

customEnd.addEventListener('change', () => {
  if (customStart.value) {
    setDateRange('custom', customStart.value, customEnd.value || null);
    updateTotalsTitle();
  }
});

// Tab switching handlers
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    setActiveTab(tabName);
  });
});

// Generate chart colors
function generateColors(count) {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF9F40'
  ];
  return colors.slice(0, count);
}

// Render Activity Count Chart (Donut)
function renderActivityCountChart(activities) {
  const ctx = document.getElementById('activityCountChart');
  if (!ctx) return;

  // Group by sport_type
  const counts = {};
  activities.forEach(a => {
    const type = a.sport_type || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const data = Object.values(counts);
  const colors = generateColors(labels.length);

  // Destroy existing chart
  if (activityCountChart) {
    activityCountChart.destroy();
  }

  activityCountChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Activities',
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#cbd5e1',
            font: { size: 12 },
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Render Time Distribution Chart (Donut)
function renderTimeDistChart(activities) {
  const ctx = document.getElementById('timeDistChart');
  if (!ctx) return;

  // Group by sport_type, sum moving_time_s
  const times = {};
  activities.forEach(a => {
    const type = a.sport_type || 'Unknown';
    times[type] = (times[type] || 0) + (a.moving_time_s || 0);
  });

  const labels = Object.keys(times);
  const dataInSeconds = Object.values(times);
  const data = dataInSeconds.map(secs => secs / 3600); // Convert to hours for chart values
  const colors = generateColors(labels.length);

  // Helper to format seconds to HH:MM
  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Destroy existing chart
  if (timeDistChart) {
    timeDistChart.destroy();
  }

  timeDistChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Time',
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#cbd5e1',
            font: { size: 12 },
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const index = context.dataIndex;
              const seconds = dataInSeconds[index];
              const total = data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${label}: ${formatTime(seconds)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Update UI when active tab changes
function updateActiveTab() {
  const { activeTab } = getState();

  // Update button states
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update panel visibility
  tabPanels.forEach(panel => {
    if (panel.id === `tab-${activeTab}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

// Subscribe to state changes to re-render when filter/units/tabs change
// (but skip rendering if we haven't loaded data yet)
let dataLoaded = false;
subscribe((state) => {
  updateActiveTab();

  if (dataLoaded) {
    renderRecent(state.filteredActivities.slice(0, 20));
    renderTotals(state.filteredActivities);
    updateTotalsTitle();
    renderActivityCountChart(state.filteredActivities);
    renderTimeDistChart(state.filteredActivities);
  }
});

loadData().then(() => {
  dataLoaded = true;
  // Initial render of charts
  const { filteredActivities } = getState();
  renderActivityCountChart(filteredActivities);
  renderTimeDistChart(filteredActivities);
});
