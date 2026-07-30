export const lotPerCwt = (lot) => (lot.weight > 0 ? lot.pricePerHead / (lot.weight / 100) : 0);

export const lotMargin = (lot) => (lot.ceiling == null ? null : lot.ceiling - lot.pricePerHead);

export function underCeiling(lot) {
  if (lot.ceiling == null) return null;
  return lot.pricePerHead <= lot.ceiling;
}

export function saleTotals(lots) {
  const head = lots.reduce((a, l) => a + (l.head || 0), 0);
  const spent = lots.reduce((a, l) => a + (l.pricePerHead || 0) * (l.head || 0), 0);
  const judged = lots.filter((l) => l.ceiling != null);
  return {
    lots: lots.length,
    head,
    spent,
    avgPerHead: head > 0 ? spent / head : 0,
    overCeiling: judged.filter((l) => l.pricePerHead > l.ceiling).length,
    underBy: judged.reduce((a, l) => a + (l.ceiling - l.pricePerHead) * (l.head || 0), 0),
  };
}

export function totalsBySpecies(lots) {
  const out = {};
  for (const lot of lots) {
    const k = lot.species || 'cattle';
    (out[k] ??= []).push(lot);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, saleTotals(v)]));
}

export function budgetState(lots, budget) {
  if (!(budget > 0)) return null;
  const { spent } = saleTotals(lots);
  return { budget, spent, left: budget - spent, over: spent > budget, usedPct: (spent / budget) * 100 };
}

export function makeLot({ lotNo, head, className, species, weight, pricePerHead, ceiling, setupName }, now) {
  return {
    id: `${now}-${Math.round(pricePerHead)}-${head}`,
    ts: now,
    lotNo: lotNo || '',
    head: head || 0,
    className: className || '',
    species: species || 'cattle',
    weight: weight || 0,
    pricePerHead: pricePerHead || 0,
    ceiling: Number.isFinite(ceiling) ? ceiling : null,
    setupName: setupName || '',
  };
}
