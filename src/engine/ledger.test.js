import { describe, it, expect } from 'vitest';
import { validatePrediction, openPredictions, duePredictions, grade, recordOutcome, accuracy, realizedFromColby } from './ledger.js';

const entry = {
  id: '2026-08-cattle-strs-400-599',
  logged: '2026-08-29',
  species: 'cattle',
  class: 'steer calves 400-599 lb',
  action: 'buy',
  thesis: 'Calves are cheap against feeders; buy the spread and feed it.',
  targetWindow: { from: '2027-03-01', to: '2027-05-31' },
  expected: { metric: 'pricePerCwt', direction: 'up', band: [420, 470] },
  basis: { source: 'Colby weekly report', asOf: '2026-08-20', value: 400 },
  market: { source: 'colby', category: 'STRS', weight: '400-599#' },
  outcome: null,
  assessment: null,
};

describe('validatePrediction', () => {
  it('accepts a complete entry', () => expect(validatePrediction(entry)).toEqual([]));

  it('demands the price the call was made against', () => {
    const { value, ...basis } = entry.basis;
    expect(validatePrediction({ ...entry, basis }).join()).toMatch(/basis.value/);
  });

  it('rejects a backwards window and a bad action', () => {
    expect(validatePrediction({ ...entry, targetWindow: { from: '2027-05-31', to: '2027-03-01' } }).join()).toMatch(/targetWindow/);
    expect(validatePrediction({ ...entry, action: 'maybe' }).join()).toMatch(/action/);
  });

  it('rejects an inverted band', () => {
    expect(validatePrediction({ ...entry, expected: { ...entry.expected, band: [470, 420] } }).join()).toMatch(/band/);
  });
});

describe('due and open', () => {
  const ledger = { entries: [entry, { ...entry, id: 'closed', targetWindow: { from: '2026-01-01', to: '2026-06-30' } }] };
  it('separates what is answerable from what is still running', () => {
    expect(duePredictions(ledger, '2026-08-29').map((e) => e.id)).toEqual(['closed']);
    expect(openPredictions(ledger, '2026-08-29').map((e) => e.id)).toEqual([entry.id]);
  });
  it('does not re-audit a graded call', () => {
    const graded = { entries: [{ ...entry, targetWindow: { from: '2026-01-01', to: '2026-06-30' }, assessment: { verdict: 'accurate', rootCause: 'x' } }] };
    expect(duePredictions(graded, '2026-08-29')).toEqual([]);
  });
});

describe('grade', () => {
  it('calls it accurate inside the band', () => expect(grade(entry, 450).verdict).toBe('accurate'));
  it('calls it partial when the direction was right but the band was missed', () => {
    const g = grade(entry, 520);
    expect(g.verdict).toBe('partial');
    expect(g.inBand).toBe(false);
    expect(g.movePct).toBeCloseTo(30, 1);
  });
  it('calls it inaccurate when the market went the other way', () => expect(grade(entry, 340).verdict).toBe('inaccurate'));
  it('grades a bandless call on direction alone', () => {
    const bandless = { ...entry, expected: { metric: 'pricePerCwt', direction: 'down' } };
    expect(grade(bandless, 340).verdict).toBe('accurate');
    expect(grade(bandless, 460).verdict).toBe('inaccurate');
  });
  it('treats a small move as flat', () => {
    const flat = { ...entry, expected: { metric: 'pricePerCwt', direction: 'flat' } };
    expect(grade(flat, 408).verdict).toBe('accurate');
    expect(grade(flat, 440).verdict).toBe('inaccurate');
  });
});

describe('recordOutcome', () => {
  const ledger = { entries: [entry] };
  it('returns a new ledger and leaves the old one alone', () => {
    const next = recordOutcome(ledger, entry.id, { outcome: { realizedAvgMid: 450 }, assessment: { verdict: 'accurate', rootCause: 'Spring run came as expected.' } });
    expect(next.entries[0].assessment.verdict).toBe('accurate');
    expect(ledger.entries[0].assessment).toBeNull();
  });
  it('refuses a grade with no reason attached', () => {
    expect(() => recordOutcome(ledger, entry.id, { outcome: {}, assessment: { verdict: 'accurate' } })).toThrow(/rootCause/);
  });
  it('refuses an unknown id or verdict', () => {
    expect(() => recordOutcome(ledger, 'nope', { outcome: {}, assessment: { verdict: 'accurate', rootCause: 'x' } })).toThrow(/no prediction/);
    expect(() => recordOutcome(ledger, entry.id, { outcome: {}, assessment: { verdict: 'right-ish', rootCause: 'x' } })).toThrow(/verdict/);
  });
});

describe('accuracy', () => {
  it('scores partials at half and splits by species', () => {
    const led = { entries: [
      { ...entry, id: 'a', assessment: { verdict: 'accurate', rootCause: 'x' } },
      { ...entry, id: 'b', assessment: { verdict: 'partial', rootCause: 'x' } },
      { ...entry, id: 'c', species: 'sheep', assessment: { verdict: 'inaccurate', rootCause: 'x' } },
      { ...entry, id: 'd' },
    ] };
    const a = accuracy(led);
    expect(a.audited).toBe(3);
    expect(a.open).toBe(1);
    expect(a.accuracyPct).toBeCloseTo(50, 1);
    expect(a.bySpecies.sheep.audited).toBe(1);
    expect(a.bySpecies.cattle.accuracyPct).toBeCloseTo(75, 1);
  });
});

describe('realizedFromColby', () => {
  const weeks = [
    { weekEnding: '2027-02-20', prices: [{ category: 'STRS', weight: '400-599#', low: 380, high: 420, mid: 400 }] },
    { weekEnding: '2027-03-06', prices: [{ category: 'STRS', weight: '400-599#', low: 420, high: 460, mid: 440 }] },
    { weekEnding: '2027-04-10', prices: [{ category: 'STRS', weight: '400-599#', low: 440, high: 480, mid: 460 }] },
    { weekEnding: '2027-06-12', prices: [{ category: 'STRS', weight: '400-599#', low: 500, high: 540, mid: 520 }] },
  ];

  it('averages only the weeks inside the window', () => {
    const r = realizedFromColby(weeks, { category: 'STRS', weight: '400-599#', from: '2027-03-01', to: '2027-05-31' });
    expect(r.weeks).toBe(2);
    expect(r.realizedAvgMid).toBeCloseTo(450, 2);
    expect(r.low).toBe(420);
    expect(r.high).toBe(480);
  });

  it('says nothing traded rather than inventing a price', () => {
    const r = realizedFromColby(weeks, { category: 'LAMBS', weight: '100+#', from: '2027-03-01', to: '2027-05-31' });
    expect(r.available).toBe(false);
    expect(r.reason).toMatch(/no LAMBS/);
  });
});
