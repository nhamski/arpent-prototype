export function tractCapacity(tract) {
  const { acres = 0, stockingRate = 0, rateUnit = 'head/acre' } = tract;
  if (acres <= 0 || stockingRate <= 0) return 0;
  return rateUnit === 'acres/head' ? acres / stockingRate : acres * stockingRate;
}

export function tractOverhead(tract, days) {
  const { labor = 0, equipment = 0, rentLoan = 0, seedPerAcre = 0, acres = 0 } = tract;
  const capacity = tractCapacity(tract);
  const fixedAnnual = labor + equipment + rentLoan + seedPerAcre * acres;
  const overheadYr = capacity > 0 ? fixedAnnual / capacity : 0;
  return overheadYr * (days / 365);
}

export function tractIsComplete(tract) {
  return tractCapacity(tract) > 0;
}

export function missingForCeiling(inputs) {
  const gaps = [];
  if (!(inputs.tract.acres > 0)) gaps.push('acres');
  if (!(inputs.tract.stockingRate > 0)) gaps.push('stocking rate');
  if (!(inputs.growOut.days > 0)) gaps.push('days held');
  if (!(inputs.group.SW > 0)) gaps.push('sale weight');
  if (!(inputs.sale.SP > 0)) gaps.push('sale price');
  return gaps.length ? gaps : null;
}

export function model({ group, tract, growOut, sale, costs }) {
  const { BW, SW } = group;
  const { CoG, days, deathLoss, shrink, apr, gainSource = 'feed' } = growOut;
  const { SP } = sale;

  const s = 1 - deathLoss / 100;
  const gain = Math.max(SW - BW, 0);
  const overhead = tractOverhead(tract, days);
  const gainCost = gainSource === 'grass' ? 0 : gain * CoG;
  const buyCost = costs.buy.commission + costs.buy.freight + costs.buy.yardage + costs.buy.vet;
  const sellCost = costs.sell.commission + costs.sell.freight + costs.sell.yardage + costs.sell.vet;
  const esw = SW * (1 - shrink / 100);

  return {
    N: group.N,
    BW,
    s,
    gain,
    gainSource,
    gainCost,
    overhead,
    costOfGainPerLb: gain > 0 ? (gainCost + overhead) / gain : 0,
    revHead: s * (esw / 100) * SP,
    fixed: gainCost + buyCost + s * sellCost + overhead,
    carry: (apr / 100) * (days / 365),
  };
}

export function maxBid(m, target) {
  if (target.type === 'flat') return (m.revHead - m.fixed - target.value) / (1 + m.carry);
  return (m.revHead / (1 + target.value / 100) - m.fixed) / (1 + m.carry);
}

export function breakeven(m) {
  return (m.revHead - m.fixed) / (1 + m.carry);
}

export function profitAtBid(m, price) {
  return m.revHead - price * (1 + m.carry) - m.fixed;
}

export function perCwt(pricePerHead, weight) {
  return weight > 0 ? pricePerHead / (weight / 100) : 0;
}

export function verdict(currentBid, ceiling) {
  return currentBid <= ceiling ? 'BID' : 'PASS';
}

export function evaluate(inputs, target, currentBid) {
  const m = model(inputs);
  const ceiling = maxBid(m, target);
  return {
    missing: missingForCeiling(inputs),
    model: m,
    maxBidPerHead: ceiling,
    maxBidPerCwt: perCwt(ceiling, m.BW),
    breakevenPerHead: breakeven(m),
    breakevenPerCwt: perCwt(breakeven(m), m.BW),
    overheadPerHead: m.overhead,
    gainCostTotal: m.gainCost * m.N,
    costOfGainPerLb: m.gain > 0 && tractIsComplete(inputs.tract) ? m.costOfGainPerLb : null,
    gainSource: m.gainSource,
    projectedProfitTotal: profitAtBid(m, ceiling) * m.N,
    bid: {
      price: currentBid,
      verdict: verdict(currentBid, ceiling),
      profitPerHead: profitAtBid(m, currentBid),
      profitTotal: profitAtBid(m, currentBid) * m.N,
      perCwt: perCwt(currentBid, m.BW),
    },
  };
}
