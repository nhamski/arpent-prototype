import { describe, it, expect } from 'vitest';
import { makeLot, archiveSale, historySummary } from './sale.js';

const lots = [
  makeLot({ lotNo: '1', head: 10, weight: 500, pricePerHead: 900, ceiling: 950 }, 1),
  makeLot({ lotNo: '2', head: 5, weight: 500, pricePerHead: 1000, ceiling: 950 }, 2),
  makeLot({ lotNo: '3', head: 2, weight: 500, pricePerHead: 800, ceiling: null }, 3),
];

describe('archiveSale', () => {
  it('snapshots totals', () => {
    const s = archiveSale(lots, 100, 'Colby');
    expect(s.head).toBe(17);
    expect(s.spent).toBe(9000 + 5000 + 1600);
    expect(s.judged).toBe(2);
    expect(s.overCeiling).toBe(1);
    expect(s.label).toBe('Colby');
  });
});

describe('historySummary', () => {
  it('rolls up discipline across sales', () => {
    const h = historySummary([archiveSale(lots, 100), archiveSale(lots.slice(0, 1), 200)]);
    expect(h.sales).toBe(2);
    expect(h.disciplinePct).toBeCloseTo((2 / 3) * 100);
  });
  it('null discipline with no judged lots', () => {
    expect(historySummary([]).disciplinePct).toBeNull();
  });
});
