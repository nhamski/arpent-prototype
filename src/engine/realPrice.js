// Inflation-adjusted valuation: is this class dear or cheap against its own
// long-run real average?
//
// A nominal ten-year average is worthless as a benchmark — it says feeders are
// expensive today mostly because 2016 dollars were bigger. Every historical
// price here is restated in the dollars of the comparison year before any
// average is taken.
//
// The code never invents a CPI value. If the deflator does not cover a year,
// the result says so; a caller who wants a number anyway must pass an explicit
// `assumedAnnualInflationPct`, and the result comes back marked 'assumed'.

// CPI for a year, extending past the end of the table only on an explicit
// assumption. Returns null when the year cannot be covered.
export function cpiForYear(cpi, year, { assumedAnnualInflationPct = null } = {}) {
  const table = cpi.annual ?? {};
  const direct = table[String(year)];
  if (direct != null) return { value: direct, basis: 'final' };

  const years = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;
  const last = years[years.length - 1];
  if (year <= last || assumedAnnualInflationPct == null) return null;

  const value = table[String(last)] * (1 + assumedAnnualInflationPct / 100) ** (year - last);
  return { value: +value.toFixed(3), basis: 'assumed', assumedFrom: last, assumedAnnualInflationPct };
}

// Restate `nominal` dollars of `fromYear` in `toYear` dollars.
export function deflate(nominal, fromYear, toYear, cpi, opts = {}) {
  const from = cpiForYear(cpi, fromYear, opts);
  const to = cpiForYear(cpi, toYear, opts);
  if (!from || !to) return null;
  return {
    real: +(nominal * (to.value / from.value)).toFixed(2),
    basis: from.basis === 'final' && to.basis === 'final' ? 'final' : 'assumed',
  };
}

// The benchmark itself.
//
//   series  [{ year, month, pricePerCwt }]  monthly averages for ONE class
//   toYear  the year whose dollars the average is expressed in
//   years   length of the look-back window (10 for the ten-year benchmark)
//   month   optional 1-12 — restrict to the same month, so a September price is
//           compared against Septembers and the seasonal shape is not averaged
//           away
//
// `yearsCovered` is what the data actually supports. Say that number out loud
// rather than the number you asked for: a ten-year benchmark built on six years
// of history is a six-year benchmark.
export function realBenchmark({ series, cpi, toYear, years = 10, month = null, assumedAnnualInflationPct = null }) {
  const opts = { assumedAnnualInflationPct };
  const firstYear = toYear - years + 1;
  const gaps = new Set();
  const points = [];

  for (const p of series) {
    if (p.year < firstYear || p.year > toYear) continue;
    if (month != null && p.month !== month) continue;
    const d = deflate(p.pricePerCwt, p.year, toYear, cpi, opts);
    if (!d) { gaps.add(p.year); continue; }
    points.push({ ...p, real: d.real, basis: d.basis });
  }

  if (!points.length) {
    const missing = [...gaps].sort();
    return {
      available: false,
      reason: missing.length
        ? `CPI table does not cover ${missing.join(', ')} — refresh with tools/pull-cpi.mjs, or pass assumedAnnualInflationPct and label the result`
        : 'no priced months inside the window',
      missingCpiYears: missing,
      window: [firstYear, toYear],
    };
  }

  const observedYears = [...new Set(points.map((p) => p.year))].sort();
  const mean = points.reduce((a, p) => a + p.real, 0) / points.length;
  const sd = Math.sqrt(points.reduce((a, p) => a + (p.real - mean) ** 2, 0) / points.length);

  return {
    available: true,
    window: [firstYear, toYear],
    month,
    yearsRequested: years,
    yearsCovered: observedYears.length,
    observedYears,
    months: points.length,
    realAvgPerCwt: +mean.toFixed(2),
    realSd: +sd.toFixed(2),
    dollarsOf: toYear,
    basis: points.every((p) => p.basis === 'final') ? 'final' : 'assumed',
    missingCpiYears: [...gaps].sort(),
  };
}

// How far today's price sits over or under that benchmark. This is the §3
// metric: "+18% over the 10-year inflation-adjusted average".
export function valuationVsBenchmark({ currentPricePerCwt, currentYear, series, cpi, years = 10, month = null, assumedAnnualInflationPct = null }) {
  const bench = realBenchmark({ series, cpi, toYear: currentYear, years, month, assumedAnnualInflationPct });
  if (!bench.available) return bench;
  const pct = ((currentPricePerCwt - bench.realAvgPerCwt) / bench.realAvgPerCwt) * 100;
  return {
    ...bench,
    currentPricePerCwt,
    pctVsRealAverage: +pct.toFixed(1),
    sdFromRealAverage: bench.realSd > 0 ? +((currentPricePerCwt - bench.realAvgPerCwt) / bench.realSd).toFixed(2) : null,
    standing: pct > 0 ? 'overvalued' : 'undervalued',
  };
}
