const NOAA_BASE = 'https://api.weather.gov';
const CACHE_KEY = 'arpent.noaa';
const CACHE_TTL = 3 * 60 * 60 * 1000;

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

async function noaaGet(path) {
  const cacheKey = `${CACHE_KEY}.${path}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const res = await fetch(`${NOAA_BASE}${path}`, {
    headers: { Accept: 'application/geo+json', 'User-Agent': 'Arpent/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  cache(cacheKey, data);
  return data;
}

export async function pointLookup(lat, lon) {
  return noaaGet(`/points/${lat},${lon}`);
}

export async function getForecast(lat, lon) {
  const point = await pointLookup(lat, lon);
  if (!point?.properties?.forecast) return null;
  const forecastUrl = point.properties.forecast.replace(NOAA_BASE, '');
  return noaaGet(forecastUrl);
}

export async function getAlerts(state) {
  return noaaGet(`/alerts/active?area=${state}`);
}

export async function getObservations(stationId) {
  return noaaGet(`/stations/${stationId}/observations/latest`);
}

export async function getStations(lat, lon) {
  const point = await pointLookup(lat, lon);
  if (!point?.properties?.observationStations) return null;
  const stationsUrl = point.properties.observationStations.replace(NOAA_BASE, '');
  return noaaGet(stationsUrl);
}

export function parseRainfall(observations) {
  if (!observations?.features) return null;
  const precip = observations.features
    .filter((f) => f.properties?.precipitationLastHour?.value != null)
    .map((f) => ({
      time: f.properties.timestamp,
      mm: f.properties.precipitationLastHour.value,
      inches: f.properties.precipitationLastHour.value * 0.03937,
    }));
  return precip;
}

export function parseForecastPeriods(forecast) {
  if (!forecast?.properties?.periods) return [];
  return forecast.properties.periods.map((p) => ({
    name: p.name,
    temp: p.temperature,
    tempUnit: p.temperatureUnit,
    wind: p.windSpeed,
    windDir: p.windDirection,
    shortForecast: p.shortForecast,
    detailedForecast: p.detailedForecast,
    precipChance: p.probabilityOfPrecipitation?.value || 0,
    isDaytime: p.isDaytime,
  }));
}
