const CACHE_KEY = 'arpent.rainfall';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MM_TO_IN = 0.03937;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function cached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* quota */ }
}

export async function fetchRainfallHistory(lat, lon) {
  const cacheKey = `${CACHE_KEY}.${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const now = new Date();
  const endYear = now.getFullYear();
  const startYear = endYear - 3;
  const endMonth = String(now.getMonth() + 1).padStart(2, '0');
  const endDay = String(Math.min(now.getDate(), 28)).padStart(2, '0');

  const url = `https://archive-api.open-meteo.com/v1/archive`
    + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + `&start_date=${startYear}-01-01&end_date=${endYear}-${endMonth}-${endDay}`
    + `&monthly=precipitation_sum&timezone=auto`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.monthly?.time || !json.monthly?.precipitation_sum) return null;

  const result = parseRainfallData(json.monthly.time, json.monthly.precipitation_sum);
  setCache(cacheKey, result);
  return result;
}

function parseRainfallData(times, precipMm) {
  const monthly = times.map((t, i) => {
    const [year, month] = t.split('-').map(Number);
    const mm = precipMm[i];
    return { date: t, year, month, inches: mm != null ? mm * MM_TO_IN : null };
  }).filter((m) => m.inches != null && Number.isFinite(m.inches));

  const byMonth = {};
  for (const m of monthly) {
    if (!byMonth[m.month]) byMonth[m.month] = [];
    byMonth[m.month].push(m.inches);
  }
  const normals = [];
  for (let i = 1; i <= 12; i++) {
    const vals = byMonth[i] || [];
    normals.push({
      month: i,
      label: MONTH_NAMES[i - 1],
      inches: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0,
    });
  }

  const byYear = {};
  const countByYear = {};
  for (const m of monthly) {
    byYear[m.year] = (byYear[m.year] || 0) + m.inches;
    countByYear[m.year] = (countByYear[m.year] || 0) + 1;
  }
  const completeYears = Object.keys(byYear).map(Number).filter((y) => countByYear[y] === 12);
  const avgAnnual = completeYears.length
    ? completeYears.reduce((s, y) => s + byYear[y], 0) / completeYears.length
    : null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const gsYear = currentMonth >= 10 ? currentYear : currentYear - 1;
  const gsMonths = monthly.filter((m) => m.year === gsYear && m.month >= 4 && m.month <= 9);
  const growingSeason = gsMonths.length === 6
    ? gsMonths.reduce((s, m) => s + m.inches, 0)
    : null;

  return {
    normals,
    avgAnnualInches: avgAnnual,
    growingSeasonInches: growingSeason,
    growingSeasonYear: gsYear,
    yearsUsed: completeYears.length,
    source: 'Open-Meteo / ERA5',
  };
}

export { MONTH_NAMES };
