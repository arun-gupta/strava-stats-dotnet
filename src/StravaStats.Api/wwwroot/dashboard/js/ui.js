import { api } from './api.js';
import { state, setUser, setAllActivities } from './state.js';

function $(sel) { return document.querySelector(sel); }
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function fmtDistanceMeters(m) {
  if (m == null) return '—';
  // Simple default: km to 1 decimal. Unit toggle arrives in 3.7/5.4
  const km = m / 1000;
  return `${km.toFixed(1)} km`;
}

function fmtSeconds(s) {
  if (!Number.isFinite(s)) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
}

function renderAuthArea() {
  const el = $('#authArea');
  el.innerHTML = '';
  if (state.user) {
    el.innerHTML = `<li class="chip">${state.user.firstname ?? ''} ${state.user.lastname ?? ''}</li>
      <li><a href="/auth/logout">Logout</a></li>`;
  } else {
    el.innerHTML = `<li><a href="/auth/login" role="button">Login with Strava</a></li>`;
  }
}

function renderRecentTable(activities) {
  const table = $('#recentTable');
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  for (const a of activities.slice(0, 10)) {
    const tr = document.createElement('tr');
    const date = (a.start_date_local ?? a.start_date ?? '').substring(0, 10);
    tr.innerHTML = `
      <td>${date}</td>
      <td>${a.name ?? ''}</td>
      <td>${a.sport_type ?? a.type ?? ''}</td>
      <td class="right distance">${fmtDistanceMeters(a.distance)}</td>
      <td class="right">${fmtSeconds(a.moving_time)}</td>`;
    tbody.appendChild(tr);
  }
}

function renderTotals(activities) {
  const loading = $('#totalsLoading');
  const empty = $('#totalsEmpty');
  const block = $('#totals');
  if (!activities.length) {
    hide(loading); hide(block); show(empty); return;
  }
  const totCount = activities.length;
  const totDistance = activities.reduce((s, a) => s + (a.distance || 0), 0);
  const totTime = activities.reduce((s, a) => s + (a.moving_time || 0), 0);
  const avgPer = totDistance / Math.max(1, totCount);
  $('#totCount').textContent = String(totCount);
  $('#totDistance').textContent = fmtDistanceMeters(totDistance);
  $('#totTime').textContent = fmtSeconds(totTime);
  $('#avgPer').textContent = fmtDistanceMeters(avgPer);
  hide(loading); hide(empty); show(block);
}

async function boot() {
  // Auth check
  try {
    const me = await api.getMe();
    setUser(me);
  } catch (err) {
    if (err.status !== 401) console.error(err);
  }
  renderAuthArea();

  // Load recent activities (single page for 3.1)
  try {
    const acts = await api.getActivities({ page: 1, perPage: 20 });
    setAllActivities(acts);
    renderRecentTable(state.filteredActivities);
    renderTotals(state.filteredActivities);
    hide($('#recentLoading'));
    show($('#recentTable'));
    hide($('#recentEmpty'));
  } catch (err) {
    hide($('#recentLoading'));
    if (err.status === 401) {
      // Not logged in: show empty + CTA
      show($('#recentEmpty'));
    } else {
      console.error(err);
      $('#recentEmpty').textContent = 'Failed to load activities.';
      show($('#recentEmpty'));
    }
  }
}

document.addEventListener('DOMContentLoaded', boot);
