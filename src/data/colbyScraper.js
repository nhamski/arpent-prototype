const CACHE_KEY = 'arpent.colby';
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

export async function fetchColbyResults() {
  const proxyBase = import.meta.env.VITE_PROXY_BASE;
  if (!proxyBase) return null;

  const cacheKey = `${CACHE_KEY}.results`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  try {
    const res = await fetch(`${proxyBase}/api/colby-results`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchBarnSchedule(barnId) {
  const proxyBase = import.meta.env.VITE_PROXY_BASE;
  if (!proxyBase) return null;

  const cacheKey = `${CACHE_KEY}.schedule.${barnId}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  try {
    const res = await fetch(`${proxyBase}/api/barn-schedule/${barnId}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

export function parseColbyResults(raw) {
  if (!raw?.lots) return [];
  return raw.lots.map((lot) => ({
    lotNumber: lot.lot_number,
    head: lot.head_count,
    species: lot.species,
    weightClass: lot.weight_class,
    avgWeight: lot.avg_weight,
    pricePerCwt: lot.price_cwt,
    pricePerHead: lot.price_head,
    buyer: lot.buyer,
    date: lot.sale_date,
  }));
}

export function avgPriceByClass(lots) {
  const grouped = {};
  for (const lot of lots) {
    const key = `${lot.species}-${lot.weightClass}`;
    if (!grouped[key]) grouped[key] = { total: 0, head: 0, species: lot.species, weightClass: lot.weightClass };
    grouped[key].total += lot.pricePerCwt * lot.head;
    grouped[key].head += lot.head;
  }
  return Object.values(grouped).map((g) => ({
    species: g.species,
    weightClass: g.weightClass,
    avgCwt: Math.round((g.total / g.head) * 100) / 100,
    totalHead: g.head,
  }));
}
