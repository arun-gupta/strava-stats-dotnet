// Global state store for dashboard with subscriber pattern

const state = {
  user: null,
  allActivities: [],
  filteredActivities: [],
  dateRange: { type: 'last30', customStart: null, customEnd: null }, // type: 'all' | 'ytd' | 'last30' | 'custom'
  unitSystem: 'imperial', // 'metric' | 'imperial'
  activeTab: 'overview', // 'overview' | 'activity-count' | 'time-dist' | 'heatmap' | etc.
  heatmapMode: 'all', // 'all' | 'running'
};

const subscribers = [];

// Subscribe to state changes
export function subscribe(callback) {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) subscribers.splice(index, 1);
  };
}

function notify() {
  subscribers.forEach(callback => callback(getState()));
}

// Get current state (read-only copy)
export function getState() {
  return { ...state };
}

// Set user info
export function setUser(user) {
  state.user = user;
  notify();
}

// Set all activities and apply current filter
export function setAllActivities(list) {
  state.allActivities = Array.isArray(list) ? list : [];
  applyFilter();
}

// Set date range and reapply filter
export function setDateRange(type, customStart = null, customEnd = null) {
  state.dateRange = { type, customStart, customEnd };
  applyFilter();
}

// Set unit system preference
export function setUnitSystem(system) {
  if (system === 'metric' || system === 'imperial') {
    state.unitSystem = system;
    notify();
  }
}

// Apply date range filter to activities
function applyFilter() {
  const { type, customStart, customEnd } = state.dateRange;

  if (type === 'all') {
    state.filteredActivities = [...state.allActivities];
  } else {
    const now = new Date();
    let afterDate;

    if (type === 'last7') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 7);
      afterDate.setHours(0, 0, 0, 0);
    } else if (type === 'last30') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 30);
      afterDate.setHours(0, 0, 0, 0);
    } else if (type === 'last90') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 90);
      afterDate.setHours(0, 0, 0, 0);
    } else if (type === 'last6months') {
      afterDate = new Date(now);
      afterDate.setMonth(afterDate.getMonth() - 6);
      afterDate.setHours(0, 0, 0, 0);
    } else if (type === 'ytd') {
      afterDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
    } else if (type === 'custom' && customStart) {
      afterDate = new Date(customStart);
      afterDate.setHours(0, 0, 0, 0);
    } else {
      state.filteredActivities = [...state.allActivities];
      notify();
      return;
    }

    state.filteredActivities = state.allActivities.filter(activity => {
      const activityDate = new Date(activity.start_local);
      if (activityDate < afterDate) return false;
      if (type === 'custom' && customEnd) {
        const beforeDate = new Date(customEnd);
        beforeDate.setHours(23, 59, 59, 999); // Include entire end day
        if (activityDate > beforeDate) return false;
      }
      return true;
    });
  }

  notify();
}

// Set active tab
export function setActiveTab(tabName) {
  state.activeTab = tabName;
  notify();
}

// Set heatmap mode
export function setHeatmapMode(mode) {
  if (mode === 'all' || mode === 'running') {
    state.heatmapMode = mode;
    notify();
  }
}

// Initialize unit system from browser locale
export function initializeUnitSystem() {
  const useMiles = navigator.language?.startsWith('en-US');
  state.unitSystem = useMiles ? 'imperial' : 'metric';
}
