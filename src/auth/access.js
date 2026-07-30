const API = import.meta.env.VITE_LICENSE_API || '';
const TOKEN = import.meta.env.VITE_LICENSE_TOKEN || '';
const APP = 'arpent';
const CACHE_KEY = 'arpent.access';
const GRACE_DAYS = 30;

export const GATING_ENABLED = Boolean(API);

const OPEN = { access: 'pro', reason: 'gating_disabled', trialDaysLeft: null, stale: false };

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, at: Date.now() }));
  } catch { /* private mode */ }
}

export function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

function shape(json, stale) {
  return {
    access: json.access,
    reason: json.reason,
    trialDaysLeft: json.trial_days_left ?? null,
    trialEnds: json.trial_ends ?? null,
    plan: json.plan ?? null,
    stale: Boolean(stale),
  };
}

function cachedAnswer() {
  const c = readCache();
  if (!c) return null;
  const ageDays = (Date.now() - (c.at || 0)) / 86400000;
  if (ageDays > GRACE_DAYS) return null;
  return shape(c, ageDays > 1);
}

export async function checkAccess(email, { startTrial = false, idToken = null } = {}) {
  if (!GATING_ENABLED || !email) return OPEN;

  const bearer = idToken || TOKEN;
  if (!bearer) return cachedAnswer() || { ...OPEN, reason: 'no_auth_fail_open', stale: true };

  const headers = { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' };
  try {
    let json;
    if (startTrial) {
      const res = await fetch(`${API}/trial/start`, {
        method: 'POST', headers,
        body: JSON.stringify({ email, app: APP }),
      });
      if (!res.ok) throw new Error(res.status);
      json = await res.json();
    } else {
      const res = await fetch(`${API}/access/${encodeURIComponent(email)}?app=${APP}`, { headers });
      if (!res.ok) throw new Error(res.status);
      json = await res.json();
    }
    writeCache(json);
    return shape(json, false);
  } catch {
    return cachedAnswer() || { ...OPEN, reason: 'unreachable_fail_open', stale: true };
  }
}

export function isLocked(state) {
  if (!state || !GATING_ENABLED) return false;
  return state.access === 'expired' || state.access === 'none';
}
