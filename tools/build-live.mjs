// Build the live current-price snapshot for ENCAN's Sell Timing overlay from a
// USDA MARS report-1895 pull (Kansas — Dodge City, Pratt, Salina).
//
// For each class it records the LATEST week's weighted-average price and a
// trailing-12-month weighted average. The app compares the current price to
// what the season predicts (trailing avg × this month's seasonal index) to say
// whether prices are running above or below their seasonal-expected level.
//
// Usage: node tools/build-live.mjs <path-to-mars-1895.json>
// (In CI, tools/pull-live.mjs fetches the pull first, then runs this.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = process.argv[2];
if (!RAW || !fs.existsSync(RAW)) {
  console.error('usage: node tools/build-live.mjs <path-to-mars-1895.json>');
  process.exit(1);
}
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arr = JSON.parse(fs.readFileSync(RAW, 'utf8')).results;

const ymd = (mdy) => { const [m, d, y] = mdy.split('/'); return { y: +y, m: +m, d: +d, key: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }; };
const CLASSES = [
  { label: '400-500 lb', lo: 400, hi: 500 },
  { label: '500-600 lb', lo: 500, hi: 600 },
  { label: '600-700 lb', lo: 600, hi: 700 },
  { label: '700-800 lb', lo: 700, hi: 800 },
  { label: '800-900 lb', lo: 800, hi: 900 },
];

const feeder = (sex) => arr.filter((r) => r.commodity === 'Feeder Cattle' && r.class === sex
  && r.frame === 'Medium and Large' && String(r.muscle_grade) === '1' && r.price_unit === 'Per Cwt'
  && r.avg_price > 0 && r.head_count > 0 && r.avg_weight > 0);

// latest report end-date across the whole pull
const allDates = arr.map((r) => ymd(r.report_end_date)).sort((a, b) => a.key.localeCompare(b.key));
const latest = allDates.at(-1);
const cutoff = new Date(Date.UTC(latest.y, latest.m - 1, latest.d));
cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1); // 12 months back

const prices = [];
for (const [sex, tag] of [['Steers', 'steer'], ['Heifers', 'heifer']]) {
  const rows = feeder(sex);
  for (const cls of CLASSES) {
    const inCls = rows.filter((r) => r.avg_weight >= cls.lo && r.avg_weight < cls.hi);
    // latest week's weighted average
    const latestRows = inCls.filter((r) => ymd(r.report_end_date).key === latest.key);
    // trailing 12 months weighted average
    const trailRows = inCls.filter((r) => {
      const d = ymd(r.report_end_date);
      return new Date(Date.UTC(d.y, d.m - 1, d.d)) >= cutoff;
    });
    const wavg = (rr) => {
      const h = rr.reduce((a, r) => a + r.head_count, 0);
      return h ? rr.reduce((a, r) => a + r.avg_price * r.head_count, 0) / h : null;
    };
    const current = wavg(latestRows);
    if (current == null) continue; // no trade in this class this week
    prices.push({
      sex: tag,
      weightClass: cls.label,
      pricePerCwt: +current.toFixed(2),
      headCount: latestRows.reduce((a, r) => a + r.head_count, 0),
      trailing12moAvg: +(wavg(trailRows) ?? current).toFixed(2),
    });
  }
}

const out = {
  source: 'USDA AMS report 1895 — Kansas Weekly Cattle Auction Summary (Dodge City, Pratt, Salina)',
  region: 'Kansas',
  weekEnding: latest.key,
  note: 'Latest weekly weighted-average auction prices, with a trailing-12-month average for the seasonal comparison. Public domain (USDA). Refreshed daily by the live-price GitHub Action.',
  prices,
};
const dir = path.join(ROOT, 'src', 'data', 'live');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'kansas-latest.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(`wrote ${prices.length} live prices, week ending ${latest.key}`);
