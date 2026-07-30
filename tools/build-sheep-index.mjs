// Build ENCAN's regional sheep seasonal index from USDA MARS sheep/goat auction
// reports, for the markets nearest Logan, KS that actually report lambs:
//   1899 Fort Collins, CO   1833 Missouri Weekly Summary   2014 San Angelo, TX
// (The four local barns Nathaniel named, incl. Colby, are not USDA-reported —
//  same as their cattle side. Salina KS reports cattle only.)
//
// SERIES = slaughter lambs, Per Cwt. Slaughter-lamb timing is the sell signal
// for a lamb crop, and it's the only sheep category with the depth to index
// (feeder lambs are too thin — ~1500 rows / 3-4 covered years). Lamb classes
// are "Hair Breeds" and "Wooled & Shorn" (median ~75-85 lb); Ewes, Bucks,
// Nannies, Kids are cull/goat stock and excluded.
//
// METHOD: ratio-to-12-month-moving-average, same as the Kansas cattle index —
// removes the 2020-2025 price trend so the seasonal component is isolated.
//
// Usage: node tools/build-sheep-index.mjs <1899.json> <1833.json> <2014.json>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const files = process.argv.slice(2);
if (files.length !== 3 || !files.every((f) => fs.existsSync(f))) {
  console.error('usage: node tools/build-sheep-index.mjs <fortcollins-1899.json> <missouri-1833.json> <sanangelo-2014.json>');
  process.exit(1);
}
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = [
  { file: files[0], region: 'Fort Collins, CO', slug: 1899 },
  { file: files[1], region: 'Missouri', slug: 1833 },
  { file: files[2], region: 'San Angelo, TX', slug: 2014 },
];

const LAMB_CLASSES = new Set(['Hair Breeds', 'Wooled & Shorn']);
const ym = (mdy) => { const [m, , y] = mdy.split('/'); return { y: +y, m: +m }; };

function monthlySeries(arr) {
  const rows = arr.filter((r) => r.commodity === 'Slaughter Sheep/Lambs'
    && LAMB_CLASSES.has(r.class) && r.price_unit === 'Per Cwt'
    && r.avg_price > 0 && r.head_count > 0 && r.avg_weight > 0 && r.avg_weight < 150);
  const sums = {};
  for (const r of rows) {
    const { y, m } = ym(r.report_end_date);
    const k = `${y}-${String(m).padStart(2, '0')}`;
    (sums[k] ??= { p: 0, h: 0 });
    sums[k].p += r.avg_price * r.head_count;
    sums[k].h += r.head_count;
  }
  const keys = Object.keys(sums).sort();
  if (!keys.length) return { series: [], startMonth: 1 };
  const [sy, sm] = keys[0].split('-').map(Number);
  const [ey, em] = keys.at(-1).split('-').map(Number);
  const series = [];
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em);) {
    const cell = sums[`${y}-${String(m).padStart(2, '0')}`];
    series.push(cell ? cell.p / cell.h : null);
    m++; if (m > 12) { m = 1; y++; }
  }
  return { series, startMonth: sm };
}

const centeredMA = (s, i) => {
  if (i < 6 || i + 6 >= s.length) return null;
  let sum = 0;
  for (let k = -6; k <= 6; k++) { const p = s[i + k]; if (p == null) return null; sum += (k === -6 || k === 6) ? p / 2 : p; }
  return sum / 12;
};

const out = [];
for (const src of SOURCES) {
  const arr = JSON.parse(fs.readFileSync(src.file, 'utf8')).results;
  const { series, startMonth } = monthlySeries(arr);
  const byMonth = Array.from({ length: 12 }, () => []);
  for (let i = 0; i < series.length; i++) {
    const ma = centeredMA(series, i);
    if (ma == null || series[i] == null) continue;
    byMonth[(startMonth - 1 + i) % 12].push(series[i] / ma);
  }
  if (byMonth.some((a) => a.length < 2)) { console.warn(`skip ${src.region}: thin coverage [${byMonth.map((a) => a.length)}]`); continue; }
  const raw = byMonth.map((a) => a.reduce((x, y) => x + y, 0) / a.length);
  const norm = raw.reduce((a, b) => a + b, 0) / 12;
  const index = raw.map((v) => +(v / norm * 100).toFixed(1));
  const sd = byMonth.map((a, m) => +(Math.sqrt(a.reduce((x, v) => x + (v - raw[m]) ** 2, 0) / a.length) / norm * 100).toFixed(1));
  const mean = index.reduce((a, b) => a + b, 0) / 12;
  if (Math.abs(mean - 100) > 0.5) { console.warn(`skip ${src.region}: mean ${mean.toFixed(2)}`); continue; }
  out.push({ id: `sheep-${src.slug}`, region: src.region, slug: src.slug, index, sd, obsPerMonth: byMonth.map((a) => a.length) });
}

const dir = path.join(ROOT, 'src', 'data', 'derived');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'sheep-index.json'), `${JSON.stringify({
  generatedBy: 'tools/build-sheep-index.mjs (ratio-to-12-month-moving-average, slaughter lambs Per Cwt)',
  reports: '1899 Fort Collins CO · 1833 Missouri · 2014 San Angelo TX',
  category: 'Slaughter lambs (Hair Breeds + Wooled & Shorn, <150 lb)',
  series: out,
}, null, 2)}\n`, 'utf8');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
for (const s of out) console.log(`${s.region.padEnd(16)} peak ${MON[s.index.indexOf(Math.max(...s.index))]} low ${MON[s.index.indexOf(Math.min(...s.index))]}  [${s.index.join(', ')}]`);
console.log(`wrote ${out.length} sheep series`);
