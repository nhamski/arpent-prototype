import { zipToCoords, zipToFips } from './geo.js';
import { fetchFeederCattlePrices, fetchSheepPrices, parseFeederPrices } from './marsApi.js';
import { getForecast, getAlerts, parseForecastPeriods } from './noaaApi.js';
import { fetchCountyDrought, parseDroughtCategory, droughtReduction, DROUGHT_LABELS, DROUGHT_COLORS } from './usdmApi.js';
import { fetchColbyResults, parseColbyResults, avgPriceByClass } from './colbyScraper.js';

export async function fetchMarketData() {
  const [cattle, sheep] = await Promise.allSettled([
    fetchFeederCattlePrices(),
    fetchSheepPrices(),
  ]);

  return {
    cattlePrices: cattle.status === 'fulfilled' ? parseFeederPrices(cattle.value) : [],
    sheepPrices: sheep.status === 'fulfilled' ? parseFeederPrices(sheep.value) : [],
  };
}

export async function fetchLocalConditions(zip) {
  const location = await zipToFips(zip);
  if (!location) return null;

  const [drought, forecast, alerts] = await Promise.allSettled([
    fetchCountyDrought(location.fips),
    getForecast(location.lat, location.lon),
    getAlerts(location.state),
  ]);

  const droughtStats = drought.status === 'fulfilled' ? drought.value : null;
  const category = parseDroughtCategory(droughtStats);

  return {
    location,
    drought: {
      category,
      label: DROUGHT_LABELS[category],
      color: DROUGHT_COLORS[category],
      reduction: droughtReduction(category),
    },
    forecast: forecast.status === 'fulfilled'
      ? parseForecastPeriods(forecast.value)
      : [],
    alerts: alerts.status === 'fulfilled'
      ? (alerts.value?.features || []).map((a) => ({
          event: a.properties.event,
          headline: a.properties.headline,
          severity: a.properties.severity,
          expires: a.properties.expires,
        }))
      : [],
  };
}

export async function fetchBarnPrices() {
  const raw = await fetchColbyResults();
  if (!raw) return { lots: [], averages: [] };
  const lots = parseColbyResults(raw);
  return { lots, averages: avgPriceByClass(lots) };
}

export async function fetchAllForZip(zip) {
  const [market, conditions, barns] = await Promise.allSettled([
    fetchMarketData(),
    fetchLocalConditions(zip),
    fetchBarnPrices(),
  ]);

  return {
    market: market.status === 'fulfilled' ? market.value : { cattlePrices: [], sheepPrices: [] },
    conditions: conditions.status === 'fulfilled' ? conditions.value : null,
    barns: barns.status === 'fulfilled' ? barns.value : { lots: [], averages: [] },
  };
}
