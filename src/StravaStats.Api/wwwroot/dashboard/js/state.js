// Global state store for dashboard with subscriber pattern
// Preferences are persisted to localStorage

// Helper functions for localStorage
const STORAGE_KEYS = {
  UNIT_SYSTEM: 'strava_dashboard_unit_system',
  DATE_RANGE: 'strava_dashboard_date_range'
};

function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    console.warn(`Failed to load ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

// Load preferences from localStorage or use defaults
const savedUnitSystem = loadFromStorage(STORAGE_KEYS.UNIT_SYSTEM, 'imperial');
const savedDateRange = loadFromStorage(STORAGE_KEYS.DATE_RANGE, { type: 'last7', customStart: null, customEnd: null });

const state = {
  user: null,
  allActivities: [],
  filteredActivities: [],
  dateRange: savedDateRange,
  unitSystem: savedUnitSystem,
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
  saveToStorage(STORAGE_KEYS.DATE_RANGE, state.dateRange);
  applyFilter();
}

// Set unit system preference
export function setUnitSystem(system) {
  if (system === 'metric' || system === 'imperial') {
    state.unitSystem = system;
    saveToStorage(STORAGE_KEYS.UNIT_SYSTEM, system);
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
      afterDate.setDate(afterDate.getDate() - 6);
      afterDate.setHours(0, 0, 0, 0);
    } else if (type === 'last30') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 29);
      afterDate.setHours(0, 0, 0, 0);
    } else if (type === 'last90') {
      afterDate = new Date(now);
      afterDate.setDate(afterDate.getDate() - 89);
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

// Initialize unit system (loads from localStorage or defaults to imperial)
export function initializeUnitSystem() {
  // Unit system is already loaded from localStorage during state initialization
  // This function is kept for compatibility but doesn't need to do anything
  // since the unit system is now loaded from localStorage on module load
}
