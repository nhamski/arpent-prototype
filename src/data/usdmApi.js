const USDM_BASE = 'https://droughtmonitor.unl.edu/DmData/DataDownload.aspx';
const USDM_API = 'https://usdmdataservices.unl.edu/api';
const CACHE_KEY = 'arpent.usdm';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function cached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function cache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* quota */ }
}

export const DROUGHT_LABELS = {
  None: 'No Drought',
  D0: 'Abnormally Dry',
  D1: 'Moderate Drought',
  D2: 'Severe Drought',
  D3: 'Extreme Drought',
  D4: 'Exceptional Drought',
};

export const DROUGHT_COLORS = {
  None: '#FFFFFF',
  D0: '#FFFF00',
  D1: '#FCD37F',
  D2: '#E8C84A',
  D3: '#FF8000',
  D4: '#E60000',
};

export async function fetchCountyDrought(fips) {
  const cacheKey = `${CACHE_KEY}.county.${fips}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const url = `${USDM_API}/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=${fips}&startdate=${weekAgo()}&enddate=${today()}&statisticsType=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await res.json();
    cache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchStateDrought(state) {
  const cacheKey = `${CACHE_KEY}.state.${state}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const url = `${USDM_API}/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=${state}&startdate=${weekAgo()}&enddate=${today()}&statisticsType=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await res.json();
    cache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

export function parseDroughtCategory(stats) {
  if (!stats || !stats.length) return 'None';
  const latest = stats[stats.length - 1];
  if (latest.D4 > 0) return 'D4';
  if (latest.D3 > 0) return 'D3';
  if (latest.D2 > 0) return 'D2';
  if (latest.D1 > 0) return 'D1';
  if (latest.D0 > 0) return 'D0';
  return 'None';
}

export function droughtReduction(category) {
  const map = { None: 0, D0: 0.05, D1: 0.10, D2: 0.15, D3: 0.25, D4: 0.40 };
  return map[category] ?? 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}
