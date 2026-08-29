import { describe, it, expect } from 'vitest';
import { netSaleValue, deliveredBuyCost, sellBuy, rankReplacements, priceSlide } from './sellBuy.js';

describe('netSaleValue', () => {
  it('pays on shrunk weight and nets the selling costs off', () => {
    const s = netSaleValue({ weight: 800, pricePerCwt: 300, shrinkPct: 3, commissionPct: 2, freightPerHead: 15 });
    expect(s.payWeight).toBe(776);
    expect(s.gross).toBeCloseTo(2328, 2);
    expect(s.sellingCost).toBeCloseTo(2328 * 0.02 + 15, 2);
    expect(s.net).toBeCloseTo(2328 - (2328 * 0.02 + 15), 2);
  });
});

describe('deliveredBuyCost', () => {
  it('adds the buying costs to the bid', () => {
    const b = deliveredBuyCost({ weight: 500, pricePerCwt: 400, commissionPct: 1, freightPerHead: 12 });
    expect(b.gross).toBeCloseTo(2000, 2);
    expect(b.delivered).toBeCloseTo(2000 + 20 + 12, 2);
  });
});

describe('sellBuy', () => {
  const sell = { weight: 800, pricePerCwt: 300 };

  it('will not price a spread without a cost of gain', () => {
    expect(() => sellBuy({ sell, buy: { weight: 500, pricePerCwt: 400 } })).toThrow(/cogPerLb/);
  });

  it('takes the trade when the cash kept beats the cost of replacing the weight', () => {
    // Sell 800 lb for $2,400; buy 500 lb for $2,000; $400 in hand, 300 lb to
    // put back at $1.00 = $300. The spread paid $100.
    const t = sellBuy({ sell, buy: { weight: 500, pricePerCwt: 400 }, cogPerLb: 1.0, adgLbPerDay: 2 });
    expect(t.cashOut).toBeCloseTo(400, 2);
    expect(t.poundsToReplace).toBe(300);
    expect(t.costToReplace).toBeCloseTo(300, 2);
    expect(t.netAdvantagePerHeadSold).toBeCloseTo(100, 2);
    expect(t.daysToReplace).toBe(150);
    expect(t.verdict).toBe('trade');
  });

  it('stands pat when gain is cheaper than the spread implies', () => {
    const t = sellBuy({ sell, buy: { weight: 500, pricePerCwt: 400 }, cogPerLb: 1.6 });
    expect(t.netAdvantagePerHeadSold).toBeCloseTo(400 - 480, 2);
    expect(t.verdict).toBe('stand_pat');
  });

  it('reinvesting the whole check buys more head and fewer pounds when light cattle cost more per pound', () => {
    const t = sellBuy({ sell, buy: { weight: 500, pricePerCwt: 400 }, cogPerLb: 1.0, reinvest: 'all' });
    expect(t.headBought).toBeCloseTo(1.2, 2);
    expect(t.cashOut).toBeCloseTo(0, 6);
    expect(t.poundsBought).toBeCloseTo(600, 1);
    expect(t.poundsPerPoundSold).toBeCloseTo(0.75, 3);
    // 200 lb short of what was sold, at $1.00 — the trade costs $200 on equal pounds.
    expect(t.netAdvantagePerHeadSold).toBeCloseTo(-200, 2);
  });

  it('credits pounds bought cheaper than they cost to grow', () => {
    // Sell 800 lb for $2,400, buy 900 lb for $2,520: $120 out of pocket for
    // 100 lb that would have cost $150 to feed on. The trade is worth $30.
    const t = sellBuy({ sell, buy: { weight: 900, pricePerCwt: 280 }, cogPerLb: 1.5 });
    expect(t.cashOut).toBeCloseTo(-120, 2);
    expect(t.poundsSurplus).toBe(100);
    expect(t.poundsToReplace).toBe(0);
    expect(t.netAdvantagePerHeadSold).toBeCloseTo(30, 2);
    expect(t.verdict).toBe('trade');
  });

  it('rejects paying more for the extra pounds than feeding them would cost', () => {
    const t = sellBuy({ sell, buy: { weight: 900, pricePerCwt: 280 }, cogPerLb: 1.0 });
    expect(t.netAdvantagePerHeadSold).toBeCloseTo(-20, 2);
    expect(t.verdict).toBe('stand_pat');
  });

  it('scores an equal-price trade as buying the same pounds back', () => {
    const t = sellBuy({ sell, buy: { weight: 800, pricePerCwt: 300 }, cogPerLb: 1.0 });
    expect(t.spreadPerCwt).toBe(0);
    expect(t.poundsToReplace).toBe(0);
    expect(t.netAdvantagePerHeadSold).toBeCloseTo(0, 6);
  });
});

describe('rankReplacements', () => {
  it('puts the best spread first', () => {
    const ranked = rankReplacements({
      sell: { weight: 800, pricePerCwt: 300 },
      candidates: [
        { label: 'dear light calves', weight: 500, pricePerCwt: 430 },
        { label: 'cheap light calves', weight: 500, pricePerCwt: 380 },
      ],
      cogPerLb: 1.0,
    });
    expect(ranked[0].label).toBe('cheap light calves');
    expect(ranked[0].netAdvantagePerHeadSold).toBeGreaterThan(ranked[1].netAdvantagePerHeadSold);
  });
});

describe('priceSlide', () => {
  it('measures the slide and the value of gain it implies', () => {
    const p = priceSlide({ weight: 500, pricePerCwt: 400 }, { weight: 800, pricePerCwt: 300 });
    expect(p.slidePerCwtOfWeight).toBeCloseTo(100 / 3, 2);
    expect(p.valueOfGainPerLb).toBeCloseTo((2400 - 2000) / 300, 4);
  });

  it('refuses a backwards weight break', () => {
    expect(() => priceSlide({ weight: 800, pricePerCwt: 300 }, { weight: 500, pricePerCwt: 400 })).toThrow();
  });
});
