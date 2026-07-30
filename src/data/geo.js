const GEOCODE_CACHE = 'arpent.geo';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

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

export async function zipToCoords(zip) {
  const cacheKey = `${GEOCODE_CACHE}.${zip}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  try {
    const res = await fetch(
      `https://api.zippopotam.us/us/${zip}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    const result = {
      lat: parseFloat(place.latitude),
      lon: parseFloat(place.longitude),
      city: place['place name'],
      state: place['state abbreviation'],
      stateFullName: place.state,
    };
    cache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function zipToFips(zip) {
  const coords = await zipToCoords(zip);
  if (!coords) return null;

  const cacheKey = `${GEOCODE_CACHE}.fips.${zip}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  try {
    const res = await fetch(
      `https://geo.fcc.gov/api/census/area?lat=${coords.lat}&lon=${coords.lon}&format=json`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const fips = data.results?.[0]?.county_fips;
    if (!fips) return null;

    const result = { fips, county: data.results[0].county_name, ...coords };
    cache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
