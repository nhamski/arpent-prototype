// Cost of Gain (COG) and Value of Gain (VOG) for drylot / confinement wintering.
//
// Bud Williams sell-buy only works if you know what a pound of gain costs you
// TODAY, on the feed you can actually buy within hauling distance. Everything
// here is priced from local inputs — no national averages, no assumed ration.
//
// COG answers "what does it cost to put a pound on?"; VOG answers "what is the
// market paying for that pound?". You add weight only when VOG > COG.

const BUSHEL_LB = {
  corn: 56,
  milo: 56,
  grain_sorghum: 56,
  wheat: 60,
  soybean: 60,
  oats: 32,
  barley: 48,
};

// $/lb as-fed for a feed priced by the ton or by the bushel.
export function feedPricePerLb(feed) {
  if (feed.pricePerLb > 0) return feed.pricePerLb;
  if (feed.pricePerTon > 0) return feed.pricePerTon / 2000;
  if (feed.pricePerBushel > 0) {
    const lb = feed.bushelWeightLb ?? BUSHEL_LB[feed.grain] ?? null;
    if (!lb) throw new Error(`bushel weight unknown for "${feed.grain ?? feed.name}" — pass bushelWeightLb`);
    return feed.pricePerBushel / lb;
  }
  throw new Error(`feed "${feed.name ?? '?'}" has no price — set pricePerTon, pricePerBushel, or pricePerLb`);
}

// Daily as-fed cost of a ration. Each line is { name, asFedLbPerDay, price… }.
// Optional wastePct covers hay fed on the ground or in an open ring.
export function rationCostPerHeadDay(ration) {
  return ration.reduce((sum, feed) => {
    const lb = (feed.asFedLbPerDay ?? 0) * (1 + (feed.wastePct ?? 0) / 100);
    return sum + lb * feedPricePerLb(feed);
  }, 0);
}

// Dry-matter intake of the same ration, for sanity-checking against ~2.2–3.0%
// of bodyweight. A ration that pencils cheap but cannot be eaten is not a plan.
export function rationDryMatterPerHeadDay(ration) {
  return ration.reduce((sum, feed) => sum + (feed.asFedLbPerDay ?? 0) * ((feed.dryMatterPct ?? 100) / 100), 0);
}

// Full COG for one wintering group.
//
//   ration              [{ name, asFedLbPerDay, pricePerTon | pricePerBushel | pricePerLb, dryMatterPct?, wastePct? }]
//   days                days on feed
//   adgLbPerDay         expected average daily gain
//   inWeight            purchase weight (lb)
//   purchaseCostPerHead delivered cost of the animal (used for interest + death loss)
//   yardagePerHeadDay   pen rent / bedding / labor / manure, $/hd/day
//   vetPerHead          processing, implants, treatment budget
//   otherPerHead        freight in, brand inspection, anything else per head
//   deathLossPct        expected death loss over the feeding period
//   interestApr         cost of money on cattle + feed
//
// Death loss is charged to the survivors: total dollars in divided by the
// fraction that live. `cogPerLb` is the all-in figure — that is the number to
// compare against VOG.
export function costOfGain({
  ration = [],
  days,
  adgLbPerDay,
  inWeight = 0,
  purchaseCostPerHead = 0,
  yardagePerHeadDay = 0,
  vetPerHead = 0,
  otherPerHead = 0,
  deathLossPct = 0,
  interestApr = 0,
}) {
  if (!(days > 0)) throw new Error('days must be positive');
  if (!(adgLbPerDay > 0)) throw new Error('adgLbPerDay must be positive');
  if (deathLossPct < 0 || deathLossPct >= 100) throw new Error('deathLossPct must be in [0, 100)');

  const feedPerDay = rationCostPerHeadDay(ration);
  const feed = feedPerDay * days;
  const yardage = yardagePerHeadDay * days;
  const gain = adgLbPerDay * days;
  const outWeight = inWeight + gain;

  // Cattle money is borrowed for the whole feeding period; feed and yardage
  // accrue evenly, so on average half of it is outstanding.
  const interest = (interestApr / 100) * (days / 365) * (purchaseCostPerHead + (feed + yardage) / 2);

  const variableIn = feed + yardage + vetPerHead + otherPerHead + interest;
  const survivors = 1 - deathLossPct / 100;
  const perSurvivor = (purchaseCostPerHead + variableIn) / survivors;
  const deathLoss = perSurvivor - (purchaseCostPerHead + variableIn);

  return {
    days,
    gain: +gain.toFixed(1),
    inWeight,
    outWeight: +outWeight.toFixed(1),
    dryMatterLbPerDay: +rationDryMatterPerHeadDay(ration).toFixed(2),
    dryMatterPctOfBodyweight: inWeight > 0
      ? +((rationDryMatterPerHeadDay(ration) / ((inWeight + outWeight) / 2)) * 100).toFixed(2)
      : null,
    feedCostPerHeadDay: +feedPerDay.toFixed(4),
    feed: +feed.toFixed(2),
    yardage: +yardage.toFixed(2),
    vet: +vetPerHead,
    other: +otherPerHead,
    interest: +interest.toFixed(2),
    deathLoss: +deathLoss.toFixed(2),
    totalCostPerHead: +(perSurvivor - purchaseCostPerHead).toFixed(2),
    cogPerLbFeedOnly: +(feed / gain).toFixed(4),
    cogPerLb: +((perSurvivor - purchaseCostPerHead) / gain).toFixed(4),
    breakevenSalePricePerCwt: +((perSurvivor / outWeight) * 100).toFixed(2),
  };
}

// What the market pays for the pounds between two classes on the SAME day.
// Both prices must come from the same sale — comparing today's light calf to
// last spring's heavy feeder is not a value of gain, it is a guess.
export function valueOfGain({ inWeight, inPricePerCwt, outWeight, outPricePerCwt }) {
  const gain = outWeight - inWeight;
  if (!(gain > 0)) throw new Error('outWeight must exceed inWeight');
  const inValue = (inWeight / 100) * inPricePerCwt;
  const outValue = (outWeight / 100) * outPricePerCwt;
  return {
    gain: +gain.toFixed(1),
    inValue: +inValue.toFixed(2),
    outValue: +outValue.toFixed(2),
    vogPerLb: +((outValue - inValue) / gain).toFixed(4),
  };
}

// The decision. Margin is per pound of gain and per head; `verdict` is what
// goes in the matrix.
export function gainVerdict(vogPerLb, cogPerLb, gain) {
  const marginPerLb = vogPerLb - cogPerLb;
  return {
    vogPerLb: +vogPerLb.toFixed(4),
    cogPerLb: +cogPerLb.toFixed(4),
    marginPerLb: +marginPerLb.toFixed(4),
    marginPerHead: +(marginPerLb * gain).toFixed(2),
    verdict: marginPerLb > 0 ? 'add_weight' : 'sell_now',
  };
}
