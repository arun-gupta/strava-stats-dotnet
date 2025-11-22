// Minimal global state holder for early Phase 3

export const state = {
  user: null,
  allActivities: [],
  filteredActivities: [],
  dateRange: 'last30', // 'all' | 'ytd' | 'last30' | 'custom'
  unitSystem: 'metric', // 'metric' | 'imperial'
};

export function setUser(u) {
  state.user = u;
}

export function setAllActivities(list) {
  state.allActivities = Array.isArray(list) ? list : [];
  state.filteredActivities = state.allActivities; // filtering comes in 3.4
}
