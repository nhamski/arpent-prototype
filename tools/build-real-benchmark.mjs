// Build the inflation-adjusted valuation benchmark for Kansas feeder classes
// from a USDA MARS report-1895 pull — the §3 metric: how far over or under its
// own long-run real average each class is trading today.
//
//   AMS_API_KEY=xxxx node tools/pull-mars.mjs 1895 .cache/mars-1895.json
//   node tools/build-real-benchmark.mjs .cache/mars-1895.json [--assume-inflation 2.9]
//
// Writes src/data/derived/ks-real-benchmark.json. Every historical month is
// restated in current dollars before averaging. Report 1895 reaches back about
// seven years, not ten — the output records `yearsCovered` and the caller must
// quote that, not the window it asked for.
//
// CPI is final only through the last completed year in src/data/cpi-u.json. To
// reach the current year, either refresh it (tools/pull-cpi.mjs) or pass
// --assume-inflation; the output is then labelled basis "assumed" and every
// figure derived from it must be presented as an assumption.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { valuationVsBenchmark } from '../src/engine/realPrice.js';

const RAW = process.argv[2];
if (!RAW || !fs.existsSync(RAW)) {
  console.error('usage: node tools/build-real-benchmark.mjs <path-to-mars-1895.json> [--assume-inflation <pct>]');
  process.exit(1);
}
const argv = process.argv.slice(3);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? Number(argv[i + 1]) : null; };
const assumedAnnualInflationPct = opt('assume-inflation');
const years = opt('years') ?? 10;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cpi = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'cpi-u.json'), 'utf8'));
const arr = JSON.parse(fs.readFileSync(RAW, 'utf8')).results;

const CLASSES = [
  { label: '400-500 lb', lo: 400, hi: 500 },
  { label: '500-600 lb', lo: 500, hi: 600 },
  { label: '600-700 lb', lo: 600, hi: 700 },
  { label: '700-800 lb', lo: 700, hi: 800 },
  { label: '800-900 lb', lo: 800, hi: 900 },
];

const ymd = (mdy) => { const [m, d, y] = mdy.split('/'); return { y: +y, m: +m, key: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }; };
const feeder = (sex) => arr.filter((r) => r.commodity === 'Feeder Cattle' && r.class === sex
  && r.frame === 'Medium and Large' && String(r.muscle_grade) === '1' && r.price_unit === 'Per Cwt'
  && r.avg_price > 0 && r.head_count > 0 && r.avg_weight > 0);

const latestKey = arr.map((r) => ymd(r.report_end_date).key).sort().at(-1);
const currentYear = Number(latestKey.slice(0, 4));
const currentMonth = Number(latestKey.slice(5, 7));

const classes = [];
for (const [sex, tag] of [['Steers', 'steer'], ['Heifers', 'heifer']]) {
  const rows = feeder(sex);
  for (const cls of CLASSES) {
    const inCls = rows.filter((r) => r.avg_weight >= cls.lo && r.avg_weight < cls.hi);
    if (!inCls.length) continue;

    // Head-weighted monthly average — a month with 40 head must not swing the
    // benchmark as hard as a month with 900.
    const buckets = new Map();
    for (const r of inCls) {
      const { y, m } = ymd(r.report_end_date);
      const k = `${y}-${m}`;
      const b = buckets.get(k) ?? { year: y, month: m, head: 0, sum: 0 };
      b.head += r.head_count;
      b.sum += r.avg_price * r.head_count;
      buckets.set(k, b);
    }
    const series = [...buckets.values()]
      .map((b) => ({ year: b.year, month: b.month, pricePerCwt: +(b.sum / b.head).toFixed(2), headCount: b.head }))
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const current = series.find((p) => p.year === currentYear && p.month === currentMonth) ?? series.at(-1);
    const common = { series, cpi, currentPricePerCwt: current.pricePerCwt, currentYear, years, assumedAnnualInflationPct };
    classes.push({
      sex: tag,
      weightClass: cls.label,
      current: { ...current, asOfWeek: latestKey },
      allMonths: valuationVsBenchmark(common),
      sameMonth: valuationVsBenchmark({ ...common, month: currentMonth }),
      series,
    });
  }
}

const out = {
  generatedBy: 'tools/build-real-benchmark.mjs',
  report: 'USDA AMS 1895 — Kansas Weekly Cattle Auction Summary (Dodge City, Pratt, Salina)',
  deflator: `${cpi.series} — ${cpi.title}`,
  cpiFinalThrough: cpi.finalThrough ?? null,
  assumedAnnualInflationPct,
  asOfWeek: latestKey,
  dollarsOf: currentYear,
  windowRequestedYears: years,
  note: 'Historical monthly averages are head-weighted and restated in current dollars before averaging. `yearsCovered` is what the data supports — quote that, not windowRequestedYears. `sameMonth` compares this month against the same month in prior years, so the seasonal shape is not averaged away.',
  classes,
};

const dir = path.join(ROOT, 'src', 'data', 'derived');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'ks-real-benchmark.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
const first = classes[0]?.allMonths;
if (!first?.available) {
  console.warn(`WARNING: benchmark unavailable — ${first?.reason ?? 'no data'}`);
  console.warn('The valuation metric must be reported as unavailable until this is fixed.');
} else if (first.basis === 'assumed') {
  console.warn(`NOTE: CPI is final only through ${cpi.finalThrough}; years past it use the ${assumedAnnualInflationPct}% assumption. Label every figure accordingly.`);
}
console.log(`wrote ${classes.length} classes, week ending ${latestKey}, ${first?.yearsCovered ?? 0} of ${years} years covered`);
