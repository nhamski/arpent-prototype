import { describe, it, expect } from 'vitest';
import { feedPricePerLb, rationCostPerHeadDay, rationDryMatterPerHeadDay, costOfGain, valueOfGain, gainVerdict } from './costOfGain.js';

const HAY = { name: 'grass hay', asFedLbPerDay: 12, pricePerTon: 150, dryMatterPct: 88 };
const CORN = { name: 'corn', grain: 'corn', asFedLbPerDay: 8, pricePerBushel: 4.48, dryMatterPct: 86 };

describe('feedPricePerLb', () => {
  it('converts a ton price', () => expect(feedPricePerLb({ pricePerTon: 150 })).toBeCloseTo(0.075, 6));
  it('converts a bushel price by grain', () => expect(feedPricePerLb(CORN)).toBeCloseTo(0.08, 6));
  it('prefers an explicit bushel weight', () => {
    expect(feedPricePerLb({ pricePerBushel: 6, bushelWeightLb: 60 })).toBeCloseTo(0.1, 6);
  });
  it('refuses an unknown grain rather than guessing', () => {
    expect(() => feedPricePerLb({ name: 'triticale', pricePerBushel: 5 })).toThrow(/bushel weight unknown/);
  });
  it('refuses an unpriced feed', () => expect(() => feedPricePerLb({ name: 'silage' })).toThrow(/no price/));
});

describe('ration', () => {
  it('costs as-fed pounds', () => {
    expect(rationCostPerHeadDay([HAY, CORN])).toBeCloseTo(12 * 0.075 + 8 * 0.08, 6);
  });
  it('charges waste on top of what is eaten', () => {
    expect(rationCostPerHeadDay([{ ...HAY, wastePct: 20 }])).toBeCloseTo(12 * 1.2 * 0.075, 6);
  });
  it('reports dry matter without the waste', () => {
    expect(rationDryMatterPerHeadDay([HAY, CORN])).toBeCloseTo(12 * 0.88 + 8 * 0.86, 6);
  });
});

describe('costOfGain', () => {
  const base = {
    ration: [HAY, CORN], days: 150, adgLbPerDay: 2, inWeight: 525,
    purchaseCostPerHead: 2145, yardagePerHeadDay: 0.45, vetPerHead: 38,
  };

  it('splits feed-only from all-in cost of gain', () => {
    const c = costOfGain(base);
    expect(c.gain).toBe(300);
    expect(c.outWeight).toBe(825);
    expect(c.cogPerLbFeedOnly).toBeCloseTo((12 * 0.075 + 8 * 0.08) * 150 / 300, 4);
    expect(c.cogPerLb).toBeGreaterThan(c.cogPerLbFeedOnly);
  });

  it('charges death loss to the survivors', () => {
    const none = costOfGain(base);
    const some = costOfGain({ ...base, deathLossPct: 2 });
    expect(some.deathLoss).toBeGreaterThan(0);
    expect(some.cogPerLb).toBeGreaterThan(none.cogPerLb);
    // 2% loss on ~$2,345 of committed dollars is roughly $48/head over the survivors.
    expect(some.deathLoss).toBeCloseTo((none.totalCostPerHead + base.purchaseCostPerHead) * (1 / 0.98 - 1), 1);
  });

  it('charges interest on the cattle plus half the feed bill', () => {
    const c = costOfGain({ ...base, interestApr: 10 });
    const feedAndYardage = c.feed + c.yardage;
    expect(c.interest).toBeCloseTo(0.1 * (150 / 365) * (2145 + feedAndYardage / 2), 1);
  });

  it('breakeven covers the purchase and every carrying cost', () => {
    const c = costOfGain({ ...base, deathLossPct: 1.5, interestApr: 8 });
    const revenue = (c.breakevenSalePricePerCwt / 100) * c.outWeight;
    expect(revenue).toBeCloseTo(2145 + c.totalCostPerHead, 1);
  });

  it('reports intake as a share of bodyweight so an impossible ration is visible', () => {
    const c = costOfGain(base);
    expect(c.dryMatterPctOfBodyweight).toBeGreaterThan(2);
    expect(c.dryMatterPctOfBodyweight).toBeLessThan(4);
  });

  it('rejects nonsense inputs', () => {
    expect(() => costOfGain({ ...base, days: 0 })).toThrow(/days/);
    expect(() => costOfGain({ ...base, adgLbPerDay: 0 })).toThrow(/adg/);
    expect(() => costOfGain({ ...base, deathLossPct: 100 })).toThrow(/deathLossPct/);
  });
});

describe('valueOfGain', () => {
  it('prices the pounds between two classes on one sale day', () => {
    const v = valueOfGain({ inWeight: 500, inPricePerCwt: 400, outWeight: 800, outPricePerCwt: 330 });
    expect(v.inValue).toBeCloseTo(2000, 2);
    expect(v.outValue).toBeCloseTo(2640, 2);
    expect(v.vogPerLb).toBeCloseTo(640 / 300, 4);
  });

  it('refuses a backwards weight break', () => {
    expect(() => valueOfGain({ inWeight: 800, inPricePerCwt: 330, outWeight: 500, outPricePerCwt: 400 })).toThrow();
  });
});

describe('gainVerdict', () => {
  it('adds weight only when the market pays more than the feed costs', () => {
    expect(gainVerdict(2.0, 1.5, 300).verdict).toBe('add_weight');
    expect(gainVerdict(2.0, 1.5, 300).marginPerHead).toBeCloseTo(150, 2);
    expect(gainVerdict(1.1, 1.5, 300).verdict).toBe('sell_now');
  });
});
