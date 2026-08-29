import { describe, it, expect } from 'vitest';
import { cpiForYear, deflate, realBenchmark, valuationVsBenchmark } from './realPrice.js';

const cpi = { series: 'CUUR0000SA0', finalThrough: 2024, annual: { 2020: 100, 2021: 110, 2022: 121, 2023: 133.1, 2024: 146.41 } };
const series = [
  { year: 2020, month: 8, pricePerCwt: 150 },
  { year: 2021, month: 8, pricePerCwt: 165 },
  { year: 2022, month: 8, pricePerCwt: 181.5 },
  { year: 2023, month: 8, pricePerCwt: 199.65 },
  { year: 2024, month: 8, pricePerCwt: 219.62 },
  { year: 2024, month: 2, pricePerCwt: 250 },
];

describe('cpiForYear', () => {
  it('reads a published year', () => expect(cpiForYear(cpi, 2022)).toEqual({ value: 121, basis: 'final' }));
  it('will not guess past the table', () => expect(cpiForYear(cpi, 2026)).toBeNull());
  it('will not guess a hole inside the table', () => expect(cpiForYear(cpi, 2019)).toBeNull());
  it('extends only on an explicit assumption, and says so', () => {
    const c = cpiForYear(cpi, 2026, { assumedAnnualInflationPct: 10 });
    expect(c.value).toBeCloseTo(146.41 * 1.21, 2);
    expect(c.basis).toBe('assumed');
    expect(c.assumedFrom).toBe(2024);
  });
});

describe('deflate', () => {
  it('restates old dollars in new ones', () => {
    expect(deflate(100, 2020, 2024, cpi)).toEqual({ real: 146.41, basis: 'final' });
  });
  it('marks a result that leans on an assumption', () => {
    expect(deflate(100, 2020, 2025, cpi, { assumedAnnualInflationPct: 10 }).basis).toBe('assumed');
  });
  it('returns null rather than a number it cannot support', () => {
    expect(deflate(100, 2020, 2025, cpi)).toBeNull();
  });
});

describe('realBenchmark', () => {
  it('averages in current dollars, not nominal ones', () => {
    // Every August price is exactly 1.5 real units of 2020 money, i.e. 219.62
    // in 2024 dollars — a nominal average would read far lower.
    const b = realBenchmark({ series, cpi, toYear: 2024, years: 10, month: 8 });
    expect(b.available).toBe(true);
    expect(b.realAvgPerCwt).toBeCloseTo(219.62, 1);
    expect(b.realSd).toBeLessThan(0.5);
  });

  it('reports the years the data actually covers, not the window asked for', () => {
    const b = realBenchmark({ series, cpi, toYear: 2024, years: 10, month: 8 });
    expect(b.yearsRequested).toBe(10);
    expect(b.yearsCovered).toBe(5);
    expect(b.observedYears).toEqual([2020, 2021, 2022, 2023, 2024]);
  });

  it('honours the month filter so seasonality is not averaged away', () => {
    const all = realBenchmark({ series, cpi, toYear: 2024, years: 10 });
    const aug = realBenchmark({ series, cpi, toYear: 2024, years: 10, month: 8 });
    expect(all.months).toBe(6);
    expect(aug.months).toBe(5);
    expect(all.realAvgPerCwt).toBeGreaterThan(aug.realAvgPerCwt);
  });

  it('says why it cannot answer instead of answering anyway', () => {
    const b = realBenchmark({ series, cpi, toYear: 2026, years: 10, month: 8 });
    expect(b.available).toBe(false);
    expect(b.reason).toMatch(/CPI table does not cover/);
    expect(b.missingCpiYears.length).toBeGreaterThan(0);
  });
});

describe('valuationVsBenchmark', () => {
  it('states how far over the real average a class is trading', () => {
    const v = valuationVsBenchmark({ currentPricePerCwt: 260, currentYear: 2024, series, cpi, years: 10, month: 8 });
    expect(v.pctVsRealAverage).toBeCloseTo(((260 - 219.62) / 219.62) * 100, 1);
    expect(v.standing).toBe('overvalued');
    expect(v.basis).toBe('final');
  });

  it('flags an undervalued class', () => {
    const v = valuationVsBenchmark({ currentPricePerCwt: 180, currentYear: 2024, series, cpi, years: 10, month: 8 });
    expect(v.standing).toBe('undervalued');
    expect(v.pctVsRealAverage).toBeLessThan(0);
  });

  it('carries the assumed basis through to the headline number', () => {
    const v = valuationVsBenchmark({ currentPricePerCwt: 260, currentYear: 2025, series, cpi, years: 10, month: 8, assumedAnnualInflationPct: 10 });
    expect(v.available).toBe(true);
    expect(v.basis).toBe('assumed');
  });
});
