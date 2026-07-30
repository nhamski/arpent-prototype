const MARS_BASE = 'https://marsapi.usda.gov/services/v1.2';
const CACHE_KEY = 'arpent.mars';
const CACHE_TTL = 6 * 60 * 60 * 1000;

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

async function marsGet(endpoint, params = {}) {
  const apiKey = import.meta.env.VITE_MARS_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`${MARS_BASE}/${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const cacheKey = `${CACHE_KEY}.${endpoint}.${url.searchParams.toString()}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  const data = await res.json();
  cache(cacheKey, data);
  return data;
}

export async function fetchSlaughterCattlePrices(market = 'national') {
  return marsGet('reports', {
    report: 'LM_CT150',
    market,
    format: 'json',
  });
}

export async function fetchFeederCattlePrices(market = 'national') {
  return marsGet('reports', {
    report: 'LM_CT100',
    market,
    format: 'json',
  });
}

export async function fetchAuctionSummary(market = 'national') {
  return marsGet('reports', {
    report: 'LM_CT106',
    market,
    format: 'json',
  });
}

export async function fetchSheepPrices() {
  return marsGet('reports', {
    report: 'LM_LK600',
    format: 'json',
  });
}

export async function fetchWeeklyFeederReport(state = 'KS') {
  return marsGet('reports', {
    report: 'LM_CT102',
    state,
    format: 'json',
  });
}

export function parseFeederPrices(report) {
  if (!report?.results) return [];
  return report.results.map((r) => ({
    class: r.class_description || r.commodity,
    weight: r.avg_weight,
    priceHigh: r.price_high,
    priceLow: r.price_low,
    priceAvg: r.weighted_average,
    head: r.head_count,
    date: r.report_date,
  })).filter((r) => r.priceAvg);
}
