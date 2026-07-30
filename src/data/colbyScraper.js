let historyCache = null;

async function loadHistory() {
  if (historyCache) return historyCache;
  try {
    const mod = await import('./colby/history.json');
    historyCache = mod.default;
    return historyCache;
  } catch { return null; }
}

export async function fetchColbyResults() {
  const data = await loadHistory();
  if (!data?.weeks?.length) return null;
  const latest = data.weeks[data.weeks.length - 1];
  return {
    lots: latest.prices.map((p) => ({
      lot_number: null,
      head_count: 1,
      species: categorizeSpecies(p.category),
      weight_class: p.weight || p.category,
      avg_weight: parseAvgWeight(p.weight),
      price_cwt: p.mid,
      price_head: null,
      buyer: null,
      sale_date: latest.weekEnding,
    })),
  };
}

function categorizeSpecies(category) {
  if (['STRS', 'HFRS', 'WT COWS', 'WT BULLS', 'BABY CALVES', 'BRED COWS'].includes(category)) return 'cattle';
  if (['LAMBS', 'EWES', 'RAMS', 'WETHERS', 'BABY LAMBS', 'BREEDING EWES', 'SHEEP FAMILIES'].includes(category)) return 'sheep';
  if (['BILLIES', 'NANNIES', 'KID GOATS', 'BABY KID GOATS', 'GOAT FAMILIES'].includes(category)) return 'goat';
  if (['SOWS', 'FEEDER PIGS', 'FAT HOGS'].includes(category)) return 'hog';
  return 'other';
}

function parseAvgWeight(weight) {
  if (!weight) return 0;
  const m = weight.match(/(\d+)-(\d+)/);
  return m ? Math.round((parseInt(m[1]) + parseInt(m[2])) / 2) : 0;
}

export async function fetchBarnSchedule() {
  return null;
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
