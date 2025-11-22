import { getState, setUser, setAllActivities, setDateRange, setActiveTab, initializeUnitSystem, subscribe, setHeatmapMode } from './js/state.js';

// Register Chart.js datalabels plugin globally
Chart.register(ChartDataLabels);

const authArea = document.getElementById('authArea');

const totalsLoading = document.getElementById('totalsLoading');
const totals = document.getElementById('totals');
const totalsEmpty = document.getElementById('totalsEmpty');
const totalsTitle = document.getElementById('totalsTitle');
const totCount = document.getElementById('totCount');
const totTime = document.getElementById('totTime');

const dateRangeBtns = document.querySelectorAll('.date-range-btn');
const customDateInputs = document.getElementById('customDateInputs');
const customStart = document.getElementById('customStart');
const customEnd = document.getElementById('customEnd');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Heatmap elements
const hmAllBtn = document.getElementById('hmAllBtn');
const hmRunBtn = document.getElementById('hmRunBtn');
const heatmapEl = document.getElementById('heatmap');
const currentStreakEl = document.getElementById('currentStreak');
const showGapDetailsBtn = document.getElementById('showGapDetailsBtn');
const gapDetails = document.getElementById('gapDetails');
const gapList = document.getElementById('gapList');

// Workout statistics elements
const workoutDaysEl = document.getElementById('workoutDays');
const missedDaysEl = document.getElementById('missedDays');
const daysSinceLastEl = document.getElementById('daysSinceLast');
const longestGapEl = document.getElementById('longestGap');
const totalGapDaysEl = document.getElementById('totalGapDays');

// Chart instances
let activityCountChart = null;
let timeDistChart = null;
let distanceHistogramChart = null;

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

  const count = list.length;
  const totalTime = list.reduce((s, a) => s + (a.moving_time_s || 0), 0);

  totCount.textContent = String(count);
  totTime.textContent = fmtTime(totalTime);
  totals.classList.remove('hidden');
}

async function loadData() {
  // Initialize unit system from browser locale
  initializeUnitSystem();

  const signedIn = await loadAuth();
  if (!signedIn) {
    // Hide loaders and prompt sign-in in empty states
    totalsLoading.classList.add('hidden');
    totalsEmpty.textContent = 'Please sign in to see your activities.';
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

    // Render totals (all filtered)
    renderTotals(filteredActivities);

    // Update title
    updateTotalsTitle();
  } catch (e) {
    console.error('Failed to load activities:', e);
    totalsLoading.classList.add('hidden');
    totalsEmpty.textContent = 'Failed to load totals.';
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

// Heatmap mode toggle
if (hmAllBtn && hmRunBtn) {
  [hmAllBtn, hmRunBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      [hmAllBtn, hmRunBtn].forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setHeatmapMode(mode);
    });
  });
}

// Show Gap Details button
if (showGapDetailsBtn) {
  showGapDetailsBtn.addEventListener('click', () => {
    if (gapDetails.classList.contains('hidden')) {
      // Calculate and show gaps
      const gaps = calculateGaps(currentDayValues);

      if (gaps.length === 0) {
        gapList.innerHTML = '<p>No gaps found! You have been consistently active.</p>';
      } else {
        gapList.innerHTML = gaps.map(gap => `
          <article style="margin-bottom: 0.5rem; padding: 0.75rem; border: 1px solid var(--pico-muted-border-color); border-radius: 4px;">
            <div><strong>${gap.start.toLocaleDateString([], { dateStyle: 'medium' })} - ${gap.end.toLocaleDateString([], { dateStyle: 'medium' })}</strong></div>
            <div style="color: var(--pico-muted-color); font-size: 0.875rem;">${gap.duration} day${gap.duration === 1 ? '' : 's'} without activity</div>
          </article>
        `).join('');
      }

      gapDetails.classList.remove('hidden');
      showGapDetailsBtn.textContent = 'Hide Gap Details';
    } else {
      gapDetails.classList.add('hidden');
      showGapDetailsBtn.textContent = 'Show Gap Details';
    }
  });
}

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
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value, context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(0);
            return percentage > 5 ? value : ''; // Only show label if slice is > 5%
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
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value, context) => {
            const index = context.dataIndex;
            const seconds = dataInSeconds[index];
            const total = data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(0);
            return percentage > 5 ? formatTime(seconds) : ''; // Only show label if slice is > 5%
          }
        }
      }
    }
  });
}

// Render Distance Histogram (Bar Chart for Running Activities)
function renderDistanceHistogram(activities) {
  const ctx = document.getElementById('distanceHistogramChart');
  if (!ctx) return;

  // Filter to running activities only
  const runningTypes = ['Run', 'TrailRun', 'VirtualRun'];
  const runs = activities.filter(a => runningTypes.includes(a.sport_type));

  // Get unit system
  const { unitSystem } = getState();
  const useMiles = unitSystem === 'imperial';
  const distLabel = useMiles ? 'mi' : 'km';

  // Convert distances and create bins
  const distances = runs.map(a => {
    const meters = a.distance_m || 0;
    return useMiles ? metersToMiles(meters) : metersToKm(meters);
  });

  // Define bin ranges (in miles or km depending on unit)
  const binSize = useMiles ? 1 : 2; // 1 mile or 2 km bins
  const maxDistance = Math.max(...distances, 0);
  const numBins = Math.ceil(maxDistance / binSize);

  // Create bin labels and counts
  const bins = Array(numBins).fill(0);
  const binLabels = [];

  for (let i = 0; i < numBins; i++) {
    const start = i * binSize;
    const end = (i + 1) * binSize;
    binLabels.push(`${start.toFixed(0)}-${end.toFixed(0)} ${distLabel}`);
  }

  // Count activities in each bin
  distances.forEach(dist => {
    const binIndex = Math.min(Math.floor(dist / binSize), numBins - 1);
    if (binIndex >= 0) bins[binIndex]++;
  });

  // Destroy existing chart
  if (distanceHistogramChart) {
    distanceHistogramChart.destroy();
  }

  distanceHistogramChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: binLabels,
      datasets: [{
        label: 'Number of Runs',
        data: bins,
        backgroundColor: '#36A2EB',
        borderColor: '#1e293b',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#cbd5e1'
          },
          grid: {
            color: '#334155'
          }
        },
        x: {
          ticks: {
            color: '#cbd5e1',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: '#334155'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Runs: ${context.parsed.y}`;
            }
          }
        }
      }
    }
  });
}

// Render Running Statistics Summary
function renderRunningStats(activities) {
  const runningStatsLoading = document.getElementById('runningStatsLoading');
  const runningStats = document.getElementById('runningStats');
  const runningStatsEmpty = document.getElementById('runningStatsEmpty');

  // Filter to running activities only
  const runningTypes = ['Run', 'TrailRun', 'VirtualRun'];
  const runs = activities.filter(a => runningTypes.includes(a.sport_type));

  runningStatsLoading.classList.add('hidden');

  if (!runs || runs.length === 0) {
    runningStatsEmpty.classList.remove('hidden');
    runningStats.classList.add('hidden');
    return;
  }

  runningStatsEmpty.classList.add('hidden');
  runningStats.classList.remove('hidden');

  // Get unit system
  const { unitSystem } = getState();
  const useMiles = unitSystem === 'imperial';
  const distLabel = useMiles ? 'mi' : 'km';
  const paceLabel = useMiles ? 'min/mi' : 'min/km';

  // Total Runs
  const totalRuns = runs.length;
  document.getElementById('totalRuns').textContent = totalRuns;

  // 10K+ Runs (10000 meters = 10 km)
  const runs10kPlus = runs.filter(a => a.distance_m >= 10000).length;
  document.getElementById('runs10kPlus').textContent = runs10kPlus;

  // Total Distance
  const totalMeters = runs.reduce((sum, a) => sum + (a.distance_m || 0), 0);
  const totalDistance = useMiles ? metersToMiles(totalMeters) : metersToKm(totalMeters);
  document.getElementById('totalRunDistance').textContent = `${totalDistance.toFixed(1)} ${distLabel}`;

  // Average Pace (total time / total distance)
  const totalTime = runs.reduce((sum, a) => sum + (a.moving_time_s || 0), 0);
  const avgPaceMinPerUnit = totalDistance > 0 ? (totalTime / 60) / totalDistance : 0;
  const avgPaceMin = Math.floor(avgPaceMinPerUnit);
  const avgPaceSec = Math.floor((avgPaceMinPerUnit - avgPaceMin) * 60);
  document.getElementById('avgPace').textContent = avgPaceMinPerUnit > 0
    ? `${avgPaceMin}:${avgPaceSec.toString().padStart(2, '0')} ${paceLabel}`
    : '—';

  // Fastest 10K (minimum pace for runs >= 10K)
  const runs10k = runs.filter(a => a.distance_m >= 10000);
  let fastest10kText = '—';
  if (runs10k.length > 0) {
    // Find the run with the best pace (lowest time for >= 10K)
    const fastest = runs10k.reduce((best, a) => {
      const dist = useMiles ? metersToMiles(a.distance_m) : metersToKm(a.distance_m);
      const pace = (a.moving_time_s / 60) / dist;
      const bestDist = useMiles ? metersToMiles(best.distance_m) : metersToKm(best.distance_m);
      const bestPace = (best.moving_time_s / 60) / bestDist;
      return pace < bestPace ? a : best;
    });

    // Calculate total time for this run
    const fastestTime = fastest.moving_time_s;
    const fastestMin = Math.floor(fastestTime / 60);
    const fastestSec = Math.floor(fastestTime % 60);
    fastest10kText = `${fastestMin}:${fastestSec.toString().padStart(2, '0')}`;
  }
  document.getElementById('fastest10k').textContent = fastest10kText;

  // Longest Run
  if (runs.length > 0) {
    const longest = runs.reduce((max, a) => a.distance_m > max.distance_m ? a : max);
    const longestDist = useMiles ? metersToMiles(longest.distance_m) : metersToKm(longest.distance_m);
    document.getElementById('longestRun').textContent = `${longestDist.toFixed(2)} ${distLabel}`;
  } else {
    document.getElementById('longestRun').textContent = '—';
  }
}

// Helper to format date as YYYY-MM-DD in local timezone
function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Transform activities to heatmap data structure
// Returns { "YYYY-MM-DD": value } for easy lookup by date
function transformToHeatmapData(activities, mode = 'all') {
  const heatmapData = {};

  // Filter activities based on mode
  let filteredActivities = activities;
  if (mode === 'running') {
    const runningTypes = ['Run', 'TrailRun', 'VirtualRun'];
    filteredActivities = activities.filter(a => runningTypes.includes(a.sport_type));
  }

  filteredActivities.forEach(activity => {
    // Extract date from start_local (YYYY-MM-DD)
    const date = activity.start_local ? activity.start_local.split('T')[0] : null;
    if (!date) return;

    // Initialize date entry if it doesn't exist
    if (!heatmapData[date]) {
      heatmapData[date] = {
        count: 0,
        time: 0,
        distance: 0
      };
    }

    // Accumulate metrics for the day
    heatmapData[date].count += 1;
    heatmapData[date].time += activity.moving_time_s || 0;
    heatmapData[date].distance += activity.distance_m || 0;
  });

  return heatmapData;
}

// Build date range domain for heatmap grid
function getDateDomain() {
  const { dateRange, filteredActivities } = getState();
  let start, end;

  const today = new Date();
  const endCandidate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dateRange.type === 'all') {
    if (filteredActivities.length === 0) return null;
    const dates = filteredActivities.map(a => new Date(a.start_local));
    dates.sort((a,b) => a - b);
    start = new Date(dates[0].getFullYear(), dates[0].getMonth(), dates[0].getDate());
    end = new Date(dates[dates.length - 1].getFullYear(), dates[dates.length - 1].getMonth(), dates[dates.length - 1].getDate());
  } else if (dateRange.type === 'custom' && dateRange.customStart) {
    start = new Date(dateRange.customStart);
    end = dateRange.customEnd ? new Date(dateRange.customEnd) : endCandidate;
  } else {
    // mirror filter logic from state.js
    let afterDate;
    const now = new Date();
    if (dateRange.type === 'last7') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 6);
      afterDate.setHours(0, 0, 0, 0);
    } else if (dateRange.type === 'last30') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 29);
      afterDate.setHours(0, 0, 0, 0);
    } else if (dateRange.type === 'last90') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 89);
      afterDate.setHours(0, 0, 0, 0);
    } else if (dateRange.type === 'last6months') {
      afterDate = new Date(now);
      afterDate.setMonth(afterDate.getMonth() - 6);
      afterDate.setHours(0, 0, 0, 0);
    } else if (dateRange.type === 'ytd') {
      afterDate = new Date(now.getFullYear(), 0, 1);
    } else {
      afterDate = null;
    }

    if (!afterDate) return null;
    start = new Date(afterDate.getFullYear(), afterDate.getMonth(), afterDate.getDate());
    end = endCandidate;
  }

  return { start, end };
}

function quantizeLevel(value, mode) {
  if (!value || value <= 0) return 0;

  if (mode === 'running') {
    // Distance-based for running (in meters)
    const km = value / 1000;
    if (km >= 15) return 3; // 15km+
    if (km >= 10) return 2; // 10-15km
    if (km >= 5) return 1;  // 5-10km
    return 1; // Any running
  } else {
    // Time-based for all activities (in seconds)
    const hours = value / 3600;
    if (hours >= 2) return 3;   // 2h+
    if (hours >= 1) return 2;   // 1-2h
    return 1;                   // < 1h
  }
}

function formatDayTitle(date, metrics, mode) {
  const d = date.toLocaleDateString([], { dateStyle: 'medium' });
  if (!metrics) return `${d}: No activity`;
  if (mode === 'running') {
    const km = (metrics.distance / 1000).toFixed(2);
    return `${d}: ${km} km run`;
  }
  // Format time for All Activities mode
  const hours = Math.floor(metrics.time / 3600);
  const minutes = Math.floor((metrics.time % 3600) / 60);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return `${d}: ${timeStr} active`;
}

function calculateStreaks(dayValues, endDate) {
  // dayValues: array of {date: Date, active: boolean}, sorted asc
  let longest = 0, current = 0;
  let streak = 0;
  const today = new Date();
  const clampEnd = endDate > today ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : endDate;

  for (let i = 0; i < dayValues.length; i++) {
    const { active } = dayValues[i];
    if (active) {
      streak += 1;
      longest = Math.max(longest, streak);
    } else {
      streak = 0;
    }
  }

  // Compute current streak ending at clampEnd
  current = 0;
  for (let i = dayValues.length - 1; i >= 0; i--) {
    const { date, active } = dayValues[i];
    if (date > clampEnd) continue;
    if (active) current += 1; else break;
  }
  return { current, longest };
}

function calculateGaps(dayValues) {
  // dayValues: array of {date: Date, active: boolean}, sorted asc
  const gaps = [];
  let gapStart = null;

  for (let i = 0; i < dayValues.length; i++) {
    const { date, active } = dayValues[i];
    if (!active) {
      if (gapStart === null) {
        gapStart = date;
      }
    } else {
      if (gapStart !== null) {
        const gapEnd = new Date(date);
        gapEnd.setDate(gapEnd.getDate() - 1); // End is the day before activity resumed
        const duration = Math.floor((gapEnd - gapStart) / (1000 * 60 * 60 * 24)) + 1;
        gaps.push({ start: gapStart, end: gapEnd, duration });
        gapStart = null;
      }
    }
  }

  // If we ended in a gap, close it
  if (gapStart !== null && dayValues.length > 0) {
    const gapEnd = dayValues[dayValues.length - 1].date;
    const duration = Math.floor((gapEnd - gapStart) / (1000 * 60 * 60 * 24)) + 1;
    gaps.push({ start: gapStart, end: gapEnd, duration });
  }

  return gaps;
}

// Store days for gap calculation
let currentDayValues = [];

function updateLegendLabels(mode) {
  const label0 = document.getElementById('legendLabel0');
  const label1 = document.getElementById('legendLabel1');
  const label2 = document.getElementById('legendLabel2');
  const label3 = document.getElementById('legendLabel3');

  if (mode === 'running') {
    if (label0) label0.textContent = 'No Activity';
    if (label1) label1.textContent = '< 5km';
    if (label2) label2.textContent = '10-15km';
    if (label3) label3.textContent = '15km+';
  } else {
    if (label0) label0.textContent = 'No Activity';
    if (label1) label1.textContent = '< 1h';
    if (label2) label2.textContent = '1-2h';
    if (label3) label3.textContent = '2h+';
  }
}

function renderHeatmap(activities) {
  if (!heatmapEl) return;
  const { heatmapMode } = getState();
  const domain = getDateDomain();
  heatmapEl.innerHTML = '';
  if (!domain) return;

  const map = transformToHeatmapData(activities, heatmapMode);

  // Build values per day over full domain and compute max
  const days = [];
  let maxValue = 0;
  for (let d = new Date(domain.start); d <= domain.end; d.setDate(d.getDate()+1)) {
    const key = formatDateKey(d);
    const metrics = map[key];
    let value = 0;
    if (metrics) {
      value = (heatmapMode === 'running') ? metrics.distance : metrics.time;
    }
    maxValue = Math.max(maxValue, value);
    days.push({ date: new Date(d), value, metrics });
  }

  // Create week columns (7 rows)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i+7));
  }

  // Update legend labels based on mode
  updateLegendLabels(heatmapMode);

  weeks.forEach(week => {
    const col = document.createElement('div');
    col.className = 'week';
    week.forEach(({ date, value, metrics }) => {
      const cell = document.createElement('div');
      const level = quantizeLevel(value, heatmapMode);
      cell.className = `day level-${level}`;
      cell.title = formatDayTitle(date, metrics, heatmapMode);
      cell.setAttribute('aria-label', cell.title);
      col.appendChild(cell);
    });
    heatmapEl.appendChild(col);
  });

  // Calculate and display workout statistics
  const dayValues = days.map(x => ({ date: x.date, active: x.value > 0 }));
  currentDayValues = dayValues; // Store for gap calculation

  const workoutDays = dayValues.filter(d => d.active).length;
  const missedDays = dayValues.length - workoutDays;

  const { longest, current } = calculateStreaks(dayValues, domain.end);
  if (currentStreakEl) currentStreakEl.textContent = `${current}`;

  // Days since last activity
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysSinceLast = 0;
  for (let i = dayValues.length - 1; i >= 0; i--) {
    const { date, active } = dayValues[i];
    if (active) break;
    if (date <= today) daysSinceLast++;
  }

  // Calculate gaps
  const gaps = calculateGaps(dayValues);
  const longestGap = gaps.length > 0 ? Math.max(...gaps.map(g => g.duration)) : 0;
  const totalGapDays = gaps.reduce((sum, g) => sum + g.duration, 0);

  // Update UI
  if (workoutDaysEl) workoutDaysEl.textContent = String(workoutDays);
  if (missedDaysEl) missedDaysEl.textContent = String(missedDays);
  if (daysSinceLastEl) daysSinceLastEl.textContent = String(daysSinceLast);
  if (longestGapEl) longestGapEl.textContent = String(longestGap);
  if (totalGapDaysEl) totalGapDaysEl.textContent = String(totalGapDays);

  // Hide gap details when heatmap rerenders
  gapDetails.classList.add('hidden');
  showGapDetailsBtn.textContent = 'Show Gap Details';
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
    renderTotals(state.filteredActivities);
    updateTotalsTitle();
    renderActivityCountChart(state.filteredActivities);
    renderTimeDistChart(state.filteredActivities);
    renderDistanceHistogram(state.filteredActivities);
    renderRunningStats(state.filteredActivities);
    renderHeatmap(state.filteredActivities);
  }
});

loadData().then(() => {
  dataLoaded = true;
  // Initial render of charts
  const { filteredActivities } = getState();
  renderActivityCountChart(filteredActivities);
  renderTimeDistChart(filteredActivities);
  renderDistanceHistogram(filteredActivities);
  renderRunningStats(filteredActivities);
  renderHeatmap(filteredActivities);
});
