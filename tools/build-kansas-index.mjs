// Build ENCAN's Kansas seasonal index from USDA MARS report 1895
// (Kansas Weekly Cattle Auction Summary — Dodge City, Pratt, Salina), the
// nearest USDA-reported markets to Logan, KS.
//
// Two-step, and NEITHER the raw pull nor the API key is ever committed:
//   1. tools/pull-mars.mjs 1895   → writes a big raw JSON to a gitignored path
//   2. node tools/build-kansas-index.mjs <rawpath>  → writes the small computed
//      index to data/derived/kansas-mars-index.json (committed)
//
// METHOD: ratio-to-12-month-moving-average. A plain per-year seasonal index
// over 2019-2026 is dominated by the 2020-2025 bull market — the within-year
// price climb survives per-year detrending and fakes a December peak that
// contradicts the March calf peak every other region shows. The centered
// 12-month MA tracks the price level, so price/MA isolates the seasonal
// component. Averaging those ratios by calendar month gives a real index.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = process.argv[2];
if (!RAW || !fs.existsSync(RAW)) {
  console.error('usage: node tools/build-kansas-index.mjs <path-to-mars-1895.json>');
  console.error('(get the raw pull with: AMS_API_KEY=... node tools/pull-mars.mjs 1895 <out>)');
  process.exit(1);
}
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arr = JSON.parse(fs.readFileSync(RAW, 'utf8')).results;

const ym = (mdy) => { const [m, , y] = mdy.split('/'); return { y: +y, m: +m }; };
const CLASSES = [
  { label: '400-500 lb', lo: 400, hi: 500 },
  { label: '500-600 lb', lo: 500, hi: 600 },
  { label: '600-700 lb', lo: 600, hi: 700 },
  { label: '700-800 lb', lo: 700, hi: 800 },
  { label: '800-900 lb', lo: 800, hi: 900 },
];

function monthlySeries(rows, cls) {
  const sums = {};
  for (const r of rows) {
    if (r.avg_weight < cls.lo || r.avg_weight >= cls.hi) continue;
    const { y, m } = ym(r.report_end_date);
    const k = `${y}-${String(m).padStart(2, '0')}`;
    (sums[k] ??= { p: 0, h: 0 });
    sums[k].p += r.avg_price * r.head_count;
    sums[k].h += r.head_count;
  }
  const keys = Object.keys(sums).sort();
  if (!keys.length) return [];
  const [sy, sm] = keys[0].split('-').map(Number);
  const [ey, em] = keys.at(-1).split('-').map(Number);
  const series = [];
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em);) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    series.push(sums[k] ? sums[k].p / sums[k].h : null);
    m++; if (m > 12) { m = 1; y++; }
  }
  // return series aligned to a start month so we can map index→calendar month
  return { series, startMonth: sm };
}

const centeredMA = (s, i) => {
  if (i < 6 || i + 6 >= s.length) return null;
  let sum = 0;
  for (let k = -6; k <= 6; k++) {
    const p = s[i + k]; if (p == null) return null;
    sum += (k === -6 || k === 6) ? p / 2 : p;
  }
  return sum / 12;
};

function indexFor(rows, cls) {
  const { series, startMonth } = monthlySeries(rows, cls);
  const byMonth = Array.from({ length: 12 }, () => []);
  for (let i = 0; i < series.length; i++) {
    const ma = centeredMA(series, i);
    if (ma == null || series[i] == null) continue;
    const cal = ((startMonth - 1 + i) % 12); // 0-based calendar month
    byMonth[cal].push(series[i] / ma);
  }
  if (byMonth.some((a) => a.length < 2)) return null;
  const raw = byMonth.map((a) => a.reduce((x, y) => x + y, 0) / a.length);
  const norm = raw.reduce((a, b) => a + b, 0) / 12;
  const index = raw.map((v) => +(v / norm * 100).toFixed(1));
  const sd = byMonth.map((a, m) => +(Math.sqrt(a.reduce((x, v) => x + (v - raw[m]) ** 2, 0) / a.length) / norm * 100).toFixed(1));
  return { index, sd, obsPerMonth: byMonth.map((a) => a.length) };
}

const filt = (sex) => arr.filter((r) => r.commodity === 'Feeder Cattle' && r.class === sex
  && r.frame === 'Medium and Large' && String(r.muscle_grade) === '1' && r.price_unit === 'Per Cwt'
  && r.avg_price > 0 && r.head_count > 0 && r.avg_weight > 0);

const series = [];
for (const [sex, tag] of [['Steers', 'steer'], ['Heifers', 'heifer']]) {
  const rows = filt(sex);
  for (const cls of CLASSES) {
    const built = indexFor(rows, cls);
    if (!built) { console.warn(`skip ${tag} ${cls.label}: thin coverage`); continue; }
    const mean = built.index.reduce((a, b) => a + b, 0) / 12;
    if (Math.abs(mean - 100) > 0.5) { console.warn(`skip ${tag} ${cls.label}: mean ${mean.toFixed(2)} != 100`); continue; }
    series.push({ id: `ks-${tag}-${cls.lo}-${cls.hi}`, sex: tag, weightClass: cls.label, index: built.index, sd: built.sd, obsPerMonth: built.obsPerMonth });
  }
}

const dates = arr.map((r) => ym(r.report_end_date)).sort((a, b) => (a.y - b.y) || (a.m - b.m));
const out = {
  generatedBy: 'tools/build-kansas-index.mjs (ratio-to-12-month-moving-average)',
  report: 'USDA AMS 1895 — Kansas Weekly Cattle Auction Summary (Dodge City, Pratt, Salina)',
  span: `${dates[0].y}-${String(dates[0].m).padStart(2, '0')} to ${dates.at(-1).y}-${String(dates.at(-1).m).padStart(2, '0')}`,
  series,
};
const dir = path.join(ROOT, 'src', 'data', 'derived');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'kansas-mars-index.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(`wrote ${series.length} Kansas series, span ${out.span}`);
