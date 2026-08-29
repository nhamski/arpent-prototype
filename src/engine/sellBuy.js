// Bud Williams sell-buy arithmetic.
//
// The trade is not "sell high and wait". It is: sell the overpriced class and
// buy the underpriced class on the SAME day, at the SAME market, then measure
// whether the money you kept is worth more than the weight you gave up. If the
// pounds cost less to put back on than the cash you retained, the spread paid
// you. If not, you sold yourself out of a position for nothing.
//
// Every function here takes prices from one sale date. Comparing today's sale
// price to a remembered price from last spring is not a spread — it is nostalgia.

// Delivered / netted values for one head on each side of the trade.
//
//   sell { weight, pricePerCwt, shrinkPct?, commissionPct?, commissionPerHead?, freightPerHead?, yardagePerHead? }
//   buy  { weight, pricePerCwt, commissionPct?, commissionPerHead?, freightPerHead?, yardagePerHead? }
export function netSaleValue(sell) {
  const { weight, pricePerCwt, shrinkPct = 0, commissionPct = 0, commissionPerHead = 0, freightPerHead = 0, yardagePerHead = 0 } = sell;
  const payWeight = weight * (1 - shrinkPct / 100);
  const gross = (payWeight / 100) * pricePerCwt;
  const cost = gross * (commissionPct / 100) + commissionPerHead + freightPerHead + yardagePerHead;
  return { payWeight: +payWeight.toFixed(1), gross: +gross.toFixed(2), sellingCost: +cost.toFixed(2), net: +(gross - cost).toFixed(2) };
}

export function deliveredBuyCost(buy) {
  const { weight, pricePerCwt, commissionPct = 0, commissionPerHead = 0, freightPerHead = 0, yardagePerHead = 0 } = buy;
  const gross = (weight / 100) * pricePerCwt;
  const cost = gross * (commissionPct / 100) + commissionPerHead + freightPerHead + yardagePerHead;
  return { gross: +gross.toFixed(2), buyingCost: +cost.toFixed(2), delivered: +(gross + cost).toFixed(2) };
}

// The trade itself. `cogPerLb` is what a pound of gain costs YOU this winter
// (from costOfGain), and `adgLbPerDay` how fast you can put it on — together
// they price the weight you just sold off.
//
// Head-for-head by default. `reinvest: 'all'` spends the entire sale check on
// the buy class instead, which is how a sell-buy actually clears the yard: you
// come home with more head, not with a cheque (headBought is a ratio there —
// round it to real head against the pen you can actually fill).
//
// Both modes are scored the same way, on an equal-pound basis: put the bought
// inventory back on level terms with the pounds you sold, and ask what that
// cost against the cash you kept. Short of the pounds you sold, the shortfall
// is charged at your cost of gain — that is what it will take to feed it back.
// Over them, the surplus is credited at the same rate: pounds bought for less
// than they cost to grow are the whole point of the trade.
// `netAdvantagePerHeadSold` > 0 means the spread paid for the weight you gave
// up. It deliberately stops at equal pounds — the further margin on the extra
// head you now own is a separate question, answered by running costOfGain and
// valueOfGain on the new class.
export function sellBuy({ sell, buy, cogPerLb, adgLbPerDay = null, reinvest = 'head-for-head' }) {
  if (!(cogPerLb >= 0)) throw new Error('cogPerLb is required — you cannot price a spread without knowing what gain costs');
  const s = netSaleValue(sell);
  const b = deliveredBuyCost(buy);
  if (!(b.delivered > 0)) throw new Error('delivered buy cost must be positive');

  const headBought = reinvest === 'all' ? s.net / b.delivered : 1;
  const cashOut = s.net - headBought * b.delivered;
  const poundsBought = headBought * buy.weight;
  const poundsDelta = poundsBought - sell.weight;
  const poundsToReplace = Math.max(-poundsDelta, 0);
  const poundsSurplus = Math.max(poundsDelta, 0);
  const costToReplace = poundsToReplace * cogPerLb;
  const weightValueAdjustment = poundsDelta * cogPerLb;
  const netAdvantage = cashOut + weightValueAdjustment;

  return {
    sell: { ...s, weight: sell.weight, pricePerCwt: sell.pricePerCwt },
    buy: { ...b, weight: buy.weight, pricePerCwt: buy.pricePerCwt },
    spreadPerCwt: +(sell.pricePerCwt - buy.pricePerCwt).toFixed(2),
    headBought: +headBought.toFixed(2),
    poundsSold: sell.weight,
    poundsBought: +poundsBought.toFixed(1),
    poundsPerPoundSold: +(poundsBought / sell.weight).toFixed(3),
    cashOut: +cashOut.toFixed(2),
    poundsToReplace: +poundsToReplace.toFixed(1),
    poundsSurplus: +poundsSurplus.toFixed(1),
    daysToReplace: adgLbPerDay > 0 ? Math.ceil(poundsToReplace / adgLbPerDay) : null,
    costToReplace: +costToReplace.toFixed(2),
    weightValueAdjustment: +weightValueAdjustment.toFixed(2),
    netAdvantagePerHeadSold: +netAdvantage.toFixed(2),
    verdict: netAdvantage > 0 ? 'trade' : 'stand_pat',
  };
}

// Rank candidate buy classes against one class you are prepared to sell.
// Best spread first — the answer to "if I sell these, what do I buy back?".
export function rankReplacements({ sell, candidates, cogPerLb, adgLbPerDay = null, reinvest = 'head-for-head' }) {
  return candidates
    .map((c) => ({ label: c.label, ...sellBuy({ sell, buy: c, cogPerLb, adgLbPerDay, reinvest }) }))
    .sort((a, b) => b.netAdvantagePerHeadSold - a.netAdvantagePerHeadSold);
}

// Price slide across a weight break: $/cwt lost per 100 lb of added weight.
// A steep slide is the market paying you to sell weight and buy back light;
// a flat slide is the market paying you to put weight on.
export function priceSlide(light, heavy) {
  const cwtSpread = heavy.weight / 100 - light.weight / 100;
  if (!(cwtSpread > 0)) throw new Error('heavy.weight must exceed light.weight');
  return {
    slidePerCwtOfWeight: +((light.pricePerCwt - heavy.pricePerCwt) / cwtSpread).toFixed(2),
    valueOfGainPerLb: +(((heavy.weight / 100) * heavy.pricePerCwt - (light.weight / 100) * light.pricePerCwt)
      / (heavy.weight - light.weight)).toFixed(4),
  };
}
