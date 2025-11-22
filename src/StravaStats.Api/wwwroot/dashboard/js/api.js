// Minimal API helpers for the dashboard
// Ensures cookies flow by using credentials: 'include'

async function fetchJson(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res.json();
}

export async function getMe() {
  return fetchJson('/me');
}

export async function getActivities({ page = 1, perPage = 10 } = {}) {
  const q = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  return fetchJson(`/activities?${q}`);
}

export async function getAllActivities({ perPage = 100, before, after, maxPages } = {}) {
  const q = new URLSearchParams({ per_page: String(perPage) });
  if (before) q.set('before', String(before));
  if (after) q.set('after', String(after));
  if (maxPages) q.set('max_pages', String(maxPages));
  return fetchJson(`/activities/all?${q}`);
}

export const api = { getMe, getActivities, getAllActivities };

export default api;
