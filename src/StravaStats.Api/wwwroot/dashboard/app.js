const authArea = document.getElementById('authArea');
const recentLoading = document.getElementById('recentLoading');
const recentTable = document.getElementById('recentTable');
const recentTbody = recentTable.querySelector('tbody');
const recentEmpty = document.getElementById('recentEmpty');

const totalsLoading = document.getElementById('totalsLoading');
const totals = document.getElementById('totals');
const totalsEmpty = document.getElementById('totalsEmpty');
const totCount = document.getElementById('totCount');
const totDistance = document.getElementById('totDistance');
const totTime = document.getElementById('totTime');
const avgPer = document.getElementById('avgPer');

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

// Unit preference (basic): default to miles for US locale
const useMiles = navigator.language?.startsWith('en-US');
const distLabel = useMiles ? 'mi' : 'km';

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
    if (me.status === 401) { setAuthUI(false); return false; }
    if (!me.ok) throw new Error('me_failed');
    const data = await me.json();
    const name = [data.firstname, data.lastname].filter(Boolean).join(' ') || data.username || '';
    setAuthUI(true, name);
    return true;
  } catch (_) {
    setAuthUI(false);
    return false;
  }
}

function renderRecent(list) {
  recentLoading.classList.add('hidden');
  if (!list || list.length === 0) { recentEmpty.classList.remove('hidden'); return; }
  recentTable.classList.remove('hidden');
  recentTbody.innerHTML = '';
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
  if (!list || list.length === 0) { totalsEmpty.classList.remove('hidden'); return; }
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
    // Recent: first page, 20 items
    const recent = await fetchJson('/activities/normalized?page=1&per_page=20');
    renderRecent(recent);
  } catch (e) {
    recentLoading.classList.add('hidden');
    recentEmpty.textContent = 'Failed to load recent activities.';
    recentEmpty.classList.remove('hidden');
  }

  try {
    // Totals: last 30 days using unix seconds
    const nowSec = Math.floor(Date.now() / 1000);
    const thirtyDaysSec = 30 * 24 * 3600;
    const after = nowSec - thirtyDaysSec;
    const all = await fetchJson(`/activities/all/normalized?per_page=100&max_pages=50&after=${after}`);
    renderTotals(all);
  } catch (e) {
    totalsLoading.classList.add('hidden');
    totalsEmpty.textContent = 'Failed to load totals.';
    totalsEmpty.classList.remove('hidden');
  }
}

loadData();
